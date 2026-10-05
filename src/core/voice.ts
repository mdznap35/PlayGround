/* Voice layer: same API everywhere, swappable backend.
   SystemSpeechBackend ships now (offline, OS voices).
   RecordedVoiceBackend (studio Arabic/English/character voices) can replace it
   later with zero screen changes: Voice.setBackend(). */

import type { Settings } from './types';

export type VoiceLang = 'ar' | 'en';

export interface VoiceBackend {
  readonly id: string;
  available(): boolean;
  speak(text: string, lang: VoiceLang, rate: number): void;
  stop(): void;
}

export class SystemSpeechBackend implements VoiceBackend {
  readonly id = 'system-speech';
  available(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
  speak(text: string, lang: VoiceLang, rate: number): void {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      u.rate = rate;
      u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    } catch { /* visuals carry the meaning */ }
  }
  stop(): void {
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  }
}

export class Voice {
  settings: Settings | null = null;
  private backend: VoiceBackend;
  private lastText = '';

  constructor(backend?: VoiceBackend) {
    this.backend = backend ?? new SystemSpeechBackend();
  }

  /** Swap the voice implementation at runtime (recorded packs, characters). */
  setBackend(b: VoiceBackend): void {
    this.stop();
    this.backend = b;
  }

  enabled(): boolean {
    return !!this.settings?.voice && this.backend.available();
  }

  speak(text: string, lang: VoiceLang = 'ar', priority = false): void {
    this.lastText = text;
    if (!this.enabled()) return;
    try {
      if (priority) this.backend.stop();
      this.backend.speak(text, lang, this.settings?.voiceRate ?? 0.95);
    } catch { /* voice unavailable — visuals carry the meaning */ }
  }

  replay(): void {
    if (this.lastText) this.speak(this.lastText, 'ar', true);
  }

  stop(): void {
    try { this.backend.stop(); } catch { /* noop */ }
  }
}
