/* NOVA World Engine — reusable visual core.
   World → Zone/Scene → Layer → Object → Character → Interaction → Camera.
   Zero dependencies, zero assets, portrait-first, low-end safe. */

export interface EngineOpts {
  reduceMotion: boolean;
}

export type EaseFn = (t: number) => number;
export const easeInOut: EaseFn = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut: EaseFn = (t) => 1 - Math.pow(1 - t, 3);

/** Camera: smooth follow / pan / zoom / focus / cinematic transitions. */
export class Camera {
  x = 0; y = 0; zoom = 1;
  private anim: { fx: number; fy: number; fz: number; tx: number; ty: number; tz: number; t: number; dur: number; ease: EaseFn; done?: () => void } | null = null;
  /** World rect this camera frames (design space). */
  constructor(public worldW = 1000, public worldH = 620) {}

  /** Instantly frame the whole world in a view of size vw×vh. */
  fit(vw: number, vh: number): void {
    this.zoom = Math.min(vw / this.worldW, vh / this.worldH);
    this.x = (this.worldW - vw / this.zoom) / 2;
    this.y = (this.worldH - vh / this.zoom) / 2;
    this.anim = null;
  }

  /** Cinematic move: glide + zoom to a focus point, then call done. */
  focus(px: number, py: number, zoom: number, dur = 900, done?: () => void): void {
    this.anim = {
      fx: this.x, fy: this.y, fz: this.zoom,
      tx: px, ty: py, tz: zoom, t: 0, dur, ease: easeInOut, done,
    };
  }

  /** Gentle pan by delta (drag). */
  pan(dx: number, dy: number): void {
    this.anim = null;
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  clamp(vw: number, vh: number): void {
    const mw = this.worldW - vw / this.zoom;
    const mh = this.worldH - vh / this.zoom;
    // world smaller than the view → center it (never push it aside)
    this.x = mw <= 0 ? mw / 2 : Math.max(Math.min(this.x, mw + 40), -40);
    this.y = mh <= 0 ? mh / 2 : Math.max(Math.min(this.y, mh + 40), -60);
  }

  update(dt: number): void {
    const a = this.anim;
    if (!a) return;
    a.t += dt;
    const k = a.ease(Math.min(1, a.t / a.dur));
    // zoom first (out→in feels cinematic), keep anchor stable-ish
    this.zoom = a.fz + (a.tz - a.fz) * k;
    this.x = a.fx + (a.tx - a.fx) * k;
    this.y = a.fy + (a.ty - a.fy) * k;
    if (a.t >= a.dur) {
      this.anim = null;
      a.done?.();
    }
  }

  get busy(): boolean { return this.anim !== null; }

  toScreen(px: number, py: number): { x: number; y: number } {
    return { x: (px - this.x) * this.zoom, y: (py - this.y) * this.zoom };
  }
  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  }
}
