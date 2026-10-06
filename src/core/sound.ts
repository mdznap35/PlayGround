/* SoundBank: file-based SFX + ambience via Howler, offline-safe by design.
   - Howler is lazy-imported ONLY on first use, so the core bundle never pays
     for it up front (separate chunk, loaded on demand).
   - SFX files: curated Kenney Interface Sounds v1.0 (CC0) in
     public/audio/sfx/*.ogg, precached by the SW. `splash` intentionally has NO
     file — the synth sweep is the right sound, exercising the fallback path.
   - Every play() falls back to the synth AudioManager when a file is missing,
     Howler is unavailable (SSR/tests), SFX are disabled in settings, or muted.
   - Volumes + muted persist in localStorage `nova.audio.v1` (NOT in the game
     save — no save-schema change, no migration needed).
   - Ambience fades in (2s) / out (1.2s); SFX Howls are constructed lazily on
     first play of each sound and reused (no preload cost).
   WHY howler: sprite support, HTML5-audio fallback on weak devices, global
   mute + per-bank volume/fade without hand-rolled WebAudio graphs.
   WHAT IT REPLACES: nothing — AudioManager stays the default voice of NOVA;
   the bank upgrades sounds file-by-file where curated files exist. */

import type { AudioManager } from './audio';

export type BankSfx = 'tap' | 'good' | 'bad' | 'coin' | 'build' | 'splash' | 'pop' | 'win' | 'step';
export type Ambience = 'garden' | 'sea';

/** null = synth fallback by design (see header). */
const SFX_FILES: Record<BankSfx, string | null> = {
  tap: './audio/sfx/tap.ogg',
  pop: './audio/sfx/pop.ogg',
  good: './audio/sfx/good.ogg',
  win: './audio/sfx/win.ogg',
  bad: './audio/sfx/bad.ogg',
  coin: './audio/sfx/coin.ogg',
  build: './audio/sfx/build.ogg',
  step: './audio/sfx/step.ogg',
  splash: null,
};

const AMBIENCE_FILES: Record<Ambience, string> = {
  garden: './audio/ambience/dawn-chorus.ogg',
  sea: './audio/ambience/pebble-beach.ogg',
};

const VOL_KEY = 'nova.audio.v1';
const FADE_IN_MS = 2000;
const FADE_OUT_MS = 1200;

interface HowlLike {
  play(): number;
  stop(): void;
  unload(): void;
  volume(v?: number): number | this;
  fade(from: number, to: number, ms: number): void;
}

interface HowlerGlobal { mute(m: boolean): void; volume(v?: number): number | void }

interface Volumes { sfx: number; ambience: number; muted: boolean }
const DEFAULT_VOLS: Volumes = { sfx: 0.9, ambience: 0.35, muted: false };

function loadVols(): Volumes {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_VOLS };
    const raw = localStorage.getItem(VOL_KEY);
    if (!raw) return { ...DEFAULT_VOLS };
    const p = JSON.parse(raw) as Partial<Volumes>;
    const clamp = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
    return { sfx: clamp(p.sfx, 0.9), ambience: clamp(p.ambience, 0.35), muted: p.muted === true };
  } catch {
    return { ...DEFAULT_VOLS };
  }
}

export class SoundBank {
  private howls = new Map<string, HowlLike>();
  private HowlCtor: (new (opts: unknown) => HowlLike) | null = null;
  private HowlerApi: HowlerGlobal | null = null;
  private loadFailed = false;
  private vols: Volumes = loadVols();
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  /** Currently sounding bed (null when silent). */
  private currentAmbience: Ambience | null = null;

  constructor(private synth: AudioManager) {}

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private async howl(): Promise<((new (opts: unknown) => HowlLike) | null)> {
    if (this.HowlCtor || this.loadFailed || !this.isBrowser()) return this.HowlCtor;
    try {
      const mod = await import('howler') as unknown as {
        Howl?: new (opts: unknown) => HowlLike;
        Howler?: HowlerGlobal;
        default?: { Howl?: new (opts: unknown) => HowlLike; Howler?: HowlerGlobal };
      };
      this.HowlCtor = mod.Howl ?? mod.default?.Howl ?? null;
      this.HowlerApi = (mod.Howler ?? mod.default?.Howler ?? null) as HowlerGlobal | null;
      if (this.HowlerApi && this.vols.muted) {
        try { this.HowlerApi.mute(true); } catch { /* noop */ }
      }
    } catch {
      this.loadFailed = true;
    }
    return this.HowlCtor;
  }

  private sfxEnabled(): boolean {
    try { return this.synth.settings?.sfx !== false && !this.vols.muted; } catch { return !this.vols.muted; }
  }
  private musicEnabled(): boolean {
    try { return this.synth.settings?.music !== false && !this.vols.muted; } catch { return !this.vols.muted; }
  }

  // ---------- volume / mute (persisted, no save-schema change) ----------
  get sfxVolume(): number { return this.vols.sfx; }
  get ambienceVolume(): number { return this.vols.ambience; }
  get muted(): boolean { return this.vols.muted; }

  private persist(): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(VOL_KEY, JSON.stringify(this.vols));
    } catch { /* private mode — session-scoped volumes */ }
  }

  setSfxVolume(v: number): void {
    this.vols.sfx = Math.min(1, Math.max(0, v));
    this.persist();
  }
  setAmbienceVolume(v: number): void {
    this.vols.ambience = Math.min(1, Math.max(0, v));
    try {
      const h = this.currentAmbience ? this.howls.get(`amb/${this.currentAmbience}`) : undefined;
      h?.volume(this.vols.ambience);
    } catch { /* noop */ }
    this.persist();
  }
  async setMuted(m: boolean): Promise<void> {
    this.vols.muted = m;
    this.persist();
    try {
      if (!this.HowlerApi) await this.howl();
      this.HowlerApi?.mute(m);
    } catch { /* noop */ }
    if (m) this.stopAmbience(true);
  }

  // ---------- SFX (lazy per-sound, synth fallback) ----------
  /**
   * Warm the Howler import (call on first user gesture). Safe anywhere.
   * First audible tap may still be synth if the import hasn't resolved —
   * documented, accepted: correctness (a sound always plays) beats purity.
   */
  prime(): void {
    try { void this.howl(); } catch { /* noop */ }
  }

  /**
   * Synchronous file attempt for AudioManager. Returns true when the sound
   * was handled (file play attempted, or suppressed by mute) so the caller
   * must NOT also play synth (no double-play). Returns false when the caller
   * should fall back to synth (no file mapped, Howler not loaded yet/failed).
   * Never throws, never touches the network beyond precached same-origin files.
   */
  tryPlay(name: BankSfx): boolean {
    try {
      if (this.vols.muted) return true; // suppress: mute means silence
      const Ctor = this.HowlCtor;
      const file = SFX_FILES[name];
      if (!Ctor || !file) return false;
      let h = this.howls.get(`sfx/${name}`);
      if (!h) {
        h = new Ctor({ src: [file], volume: this.vols.sfx, html5: false, preload: true });
        this.howls.set(`sfx/${name}`, h);
      }
      h.play();
      return true;
    } catch {
      return false;
    }
  }

  /** Play a UI sound. Always safe: synth fallback, never throws. */
  async play(name: BankSfx): Promise<'bank' | 'synth' | 'muted'> {
    if (!this.sfxEnabled()) return 'muted';
    if (this.tryPlay(name)) return 'bank';
    // tryPlay declined: warm Howler for next time, synth now.
    this.prime();
    try { this.synth.sfx(name); } catch { /* audio unavailable */ }
    return 'synth';
  }

  // ---------- ambience (faded beds) ----------
  /** Start (or keep) a looped bed, fading in. Safe no-op when unavailable. */
  async ambience(name: Ambience): Promise<boolean> {
    if (!this.musicEnabled()) {
      if (this.currentAmbience) this.stopAmbience(true);
      return false;
    }
    if (this.currentAmbience === name) return true;
    try {
      const Ctor = await this.howl();
      if (!Ctor) return false;
      this.stopAmbience(true);
      if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
      const h = new Ctor({ src: [AMBIENCE_FILES[name]], loop: true, volume: 0, html5: true });
      this.howls.set(`amb/${name}`, h);
      this.currentAmbience = name;
      h.play();
      try { h.fade(0, this.vols.ambience, FADE_IN_MS); } catch { try { h.volume(this.vols.ambience); } catch { /* noop */ } }
      return true;
    } catch {
      return false;
    }
  }

  /** Fade out (default) then unload. Immediate when asked (zone jumps). */
  stopAmbience(immediate = false): void {
    const cur = this.currentAmbience;
    this.currentAmbience = null;
    if (!cur) return;
    const h = this.howls.get(`amb/${cur}`);
    this.howls.delete(`amb/${cur}`);
    if (!h) return;
    try {
      if (immediate) {
        h.stop();
        h.unload();
      } else {
        h.fade(h.volume() as number, 0, FADE_OUT_MS);
        this.stopTimer = setTimeout(() => {
          try { h.stop(); h.unload(); } catch { /* noop */ }
        }, FADE_OUT_MS + 100);
      }
    } catch {
      try { h.stop(); } catch { /* noop */ }
    }
  }

  /** For tests/diagnostics. */
  get activeAmbience(): Ambience | null { return this.currentAmbience; }
  get bankAvailable(): boolean { return this.HowlCtor !== null && !this.loadFailed; }
}
