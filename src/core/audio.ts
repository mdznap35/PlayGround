/* AudioManager: synthesized SFX + gentle music (WebAudio, no assets, offline).
   Spoken voice lives in ./voice.ts (swappable backends). */

import type { Settings } from './types';

export type SfxName = 'tap' | 'good' | 'bad' | 'coin' | 'build' | 'splash' | 'pop' | 'win' | 'step';

const SFX_FREQ: Record<SfxName, number[]> = {
  tap: [520],
  pop: [700, 900],
  good: [523, 659, 784],
  bad: [300, 220],
  coin: [988, 1319],
  build: [180, 240, 320],
  splash: [400, 300, 200],
  win: [523, 659, 784, 1047],
  step: [440],
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicNodes: OscillatorNode[] = [];
  private musicTimer: number | null = null;
  settings: Settings | null = null;
  /**
   * Optional file bank (SoundBank). When present and handling a sound, the
   * synth is skipped — no double-play. The bank never calls back into sfx()
   * for its own fallback... (it calls synth only via bank.play, which
   * re-enters here and terminates because tryPlay is side-effect-free).
   */
  bank: { tryPlay(name: SfxName): boolean } | null = null;

  private ensure(): AudioContext | null {
    if (!this.settings?.sfx && !this.settings?.music) return null;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch { return null; }
  }

  unlock(): void { this.ensure(); }

  sfx(name: SfxName): void {
    if (!this.settings?.sfx) return;
    try {
      if (this.bank?.tryPlay(name)) return; // file played (or muted) — no double-play
    } catch { /* bank must never break synth */ }
    const ctx = this.ensure();
    if (!ctx) return;
    const freqs = SFX_FREQ[name];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name === 'bad' ? 'sawtooth' : 'sine';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  startMusic(): void {
    if (!this.settings?.music || this.musicTimer !== null) return;
    const ctx = this.ensure();
    if (!ctx) return;
    // gentle pentatonic loop, very quiet
    const notes = [262, 294, 330, 392, 440, 392, 330, 294];
    let i = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.settings?.music || document.hidden) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[i % notes.length];
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 1.2);
        i++;
      } catch { /* ignore */ }
    }, 1200);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) { window.clearInterval(this.musicTimer); this.musicTimer = null; }
    for (const n of this.musicNodes) { try { n.stop(); } catch { /* noop */ } }
    this.musicNodes = [];
  }
}
