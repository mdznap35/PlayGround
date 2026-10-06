/* Voice packs: pre-generated, curated, deterministic audio for core lines.
   Remote TTS (ElevenLabs etc.) may be used during CONTENT PRODUCTION to render
   these files, but the shipped product plays LOCAL files through this backend —
   no runtime TTS dependency for the core experience.
   Manifest: assets/audio/voices/<pack>/manifest.json (see docs/voice-packs.md).
   Missing line → falls back to the injected fallback backend (system speech). */

import type { VoiceBackend, VoiceLang } from '../core/voice';

export interface VoicePackManifest {
  pack: string;
  lang: VoiceLang;
  voice: string;
  license: string;
  lines: Record<string, string>; // lineId → file path relative to pack dir
}

export class RecordedFileBackend implements VoiceBackend {
  readonly id: string;
  private audio: HTMLAudioElement | null = null;

  constructor(
    private manifest: VoicePackManifest,
    private baseUrl: string,
    private fallback: VoiceBackend,
  ) {
    this.id = `recorded:${manifest.pack}`;
  }

  available(): boolean { return true; }

  /** Speak a pack line by id; unknown ids delegate to the fallback voice. */
  speakLine(lineId: string, text: string, lang: VoiceLang, rate: number): void {
    const file = this.manifest.lines[lineId];
    if (!file) {
      this.fallback.speak(text, lang, rate);
      return;
    }
    try {
      this.stop();
      this.audio = new Audio(`${this.baseUrl.replace(/\/$/, '')}/${file}`);
      this.audio.playbackRate = rate;
      void this.audio.play().catch(() => this.fallback.speak(text, lang, rate));
    } catch {
      this.fallback.speak(text, lang, rate);
    }
  }

  /** VoiceBackend surface: full-text speak always uses the fallback (packs are line-addressed). */
  speak(text: string, lang: VoiceLang, rate: number): void {
    this.fallback.speak(text, lang, rate);
  }

  stop(): void {
    try { this.audio?.pause(); } catch { /* noop */ }
    this.audio = null;
    try { this.fallback.stop(); } catch { /* noop */ }
  }

  has(lineId: string): boolean { return lineId in this.manifest.lines; }
  get lineCount(): number { return Object.keys(this.manifest.lines).length; }
}
