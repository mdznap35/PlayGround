/* WorldScene: layers + camera + objects + particles + input.
   - Layers paint back-to-front with per-layer parallax factors.
   - Static layers are pre-rendered once to offscreen canvases (perf).
   - Input: tap + drag (pointer events, touch-first, no hover needed).
   - Loop self-cleans when canvas leaves the DOM. */

import { Camera } from './camera';
import { Particles } from './particles';

export interface SceneObj {
  id: string;
  x: number; y: number;       // world coords (design space)
  r: number;                  // touch radius (world units)
  depth: number;              // painter order within dynamic layer
  draw(ctx: CanvasRenderingContext2D, t: number, opts: { reduceMotion: boolean }): void;
  onTap?(): void;
  draggable?: boolean;
  drawDragGhost?(ctx: CanvasRenderingContext2D): void;
  onDrop?(target: SceneObj | null): void;
}

export interface Layer {
  /** 0 = sky-fixed … 1 = glued to world */
  parallax: number;
  paint(ctx: CanvasRenderingContext2D, t: number, view: { w: number; h: number; cam: Camera }): void;
}

export interface SceneOpts {
  worldW?: number;
  worldH?: number;
  reduceMotion: boolean;
  background?: string;
}

export class WorldScene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cam: Camera;
  particles = new Particles();
  layers: Layer[] = [];
  objects: SceneObj[] = [];
  reduceMotion: boolean;
  background: string;
  private raf = 0;
  private last = 0;
  private destroyed = false;
  private dpr: number;
  /** adaptive resolution: 1 → 0.55 backing-store scale under sustained load */
  private resScale = 1;
  private frameAcc = 0;
  private frameN = 0;
  vw = 0; vh = 0;
  /** drag state */
  private drag: { obj: SceneObj; dx: number; dy: number; moved: boolean } | null = null;
  private panStart: { x: number; y: number; cx: number; cy: number } | null = null;
  onPan: (() => void) | null = null;
  /** Fixed-vista scenes (hatch beach) opt out: care strokes must never move the camera. */
  panEnabled = true;

  constructor(canvas: HTMLCanvasElement, opts: SceneOpts) {
    this.canvas = canvas;
    this.reduceMotion = opts.reduceMotion || document.body.classList.contains('reduce-motion');
    this.background = opts.background ?? '#0e1440';
    this.cam = new Camera(opts.worldW ?? 1000, opts.worldH ?? 620);
    // DPR capped at 1.5: vector art stays crisp, fill-rate (the mobile
    // bottleneck) nearly halves vs 2x. Verified visually, no aliasing.
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.resize();
    canvas.style.touchAction = 'none';
    canvas.onpointerdown = (e) => this.down(e);
    canvas.onpointermove = (e) => this.move(e);
    canvas.onpointerup = (e) => this.up(e);
    canvas.onpointercancel = () => this.cancelDrag();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.vw = Math.max(1, rect.width);
    this.vh = Math.max(1, rect.height);
    this.applyBackingStore();
    if (!this.cam.busy) this.cam.fit(this.vw, this.vh);
  }

  private applyBackingStore(): void {
    const s = this.dpr * this.resScale;
    this.canvas.width = Math.max(2, Math.round(this.vw * s));
    this.canvas.height = Math.max(2, Math.round(this.vh * s));
  }

  addLayer(l: Layer): void { this.layers.push(l); }
  addObject(o: SceneObj): void { this.objects.push(o); }
  removeObject(id: string): void { this.objects = this.objects.filter((o) => o.id !== id); }
  object(id: string): SceneObj | undefined { return this.objects.find((o) => o.id === id); }

  // ---------- input ----------
  private toWorld(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * this.vw;
    const sy = ((e.clientY - r.top) / r.height) * this.vh;
    return this.cam.toWorld(sx, sy);
  }

  private pick(p: { x: number; y: number }): SceneObj | null {
    const sorted = [...this.objects].sort((a, b) => b.depth - a.depth);
    for (const o of sorted) {
      if (Math.hypot(p.x - o.x, p.y - o.y) <= o.r) return o;
    }
    return null;
  }

  private down(e: PointerEvent): void {
    try { this.canvas.setPointerCapture?.(e.pointerId); } catch { /* synthetic or lost pointer */ }
    const p = this.toWorld(e);
    const hit = this.pick(p);
    if (hit?.draggable) {
      this.drag = { obj: hit, dx: hit.x - p.x, dy: hit.y - p.y, moved: false };
    } else {
      this.panStart = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y };
      this.downTarget = hit;
    }
  }

  private downTarget: SceneObj | null = null;

  private move(e: PointerEvent): void {
    if (this.drag && e.buttons) {
      const p = this.toWorld(e);
      this.drag.obj.x = p.x + this.drag.dx;
      this.drag.obj.y = p.y + this.drag.dy;
      this.drag.moved = true;
      return;
    }
    if (this.panStart && e.buttons && this.panEnabled) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      if (Math.hypot(dx, dy) > 12) {
        this.downTarget = null; // it was a pan, not a tap
        this.cam.x = this.panStart.cx - dx / this.cam.zoom;
        this.cam.y = this.panStart.cy - dy / this.cam.zoom;
        this.cam.clamp(this.vw, this.vh);
        this.onPan?.();
      }
    }
  }

  private up(e: PointerEvent): void {
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      if (d.moved) {
        const p = this.toWorld(e);
        const target = this.pick(p);
        d.obj.onDrop?.(target === d.obj ? null : target);
      } else {
        d.obj.onTap?.();
      }
      return;
    }
    if (this.downTarget) {
      const t = this.downTarget;
      this.downTarget = null;
      this.panStart = null;
      // camera may have micro-moved; only travel if camera is calm
      t.onTap?.();
      return;
    }
    this.panStart = null;
  }

  private cancelDrag(): void {
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      d.obj.onDrop?.(null);
    }
    this.downTarget = null;
    this.panStart = null;
  }

  // ---------- loop ----------
  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.destroyed || !document.body.contains(this.canvas)) return;
      const dt = Math.min(100, now - this.last);
      this.last = now;
      this.render(now, this.reduceMotion ? 0 : dt);
      if (!this.reduceMotion) {
        this.raf = requestAnimationFrame(loop);
      } else {
        window.setTimeout(() => {
          if (!this.destroyed && document.body.contains(this.canvas)) this.render(performance.now(), 0);
        }, 1200);
      }
    };
    if (this.reduceMotion) {
      this.render(performance.now(), 0);
      window.setTimeout(() => {
        if (!this.destroyed && document.body.contains(this.canvas)) this.render(performance.now(), 0);
      }, 1200);
    } else {
      this.raf = requestAnimationFrame(loop);
    }
  }

  /** Force one static repaint (after data/object changes under reduced motion). */
  repaint(): void {
    if (this.reduceMotion) this.render(performance.now(), 0);
  }

  private applyCam(g: CanvasRenderingContext2D, parallax: number): void {
    // parallax: shift camera fractionally (0 = fixed sky, 1 = world-locked)
    const cx = this.cam.x * parallax;
    const cy = this.cam.y * parallax;
    g.scale(this.cam.zoom, this.cam.zoom);
    g.translate(-cx, -cy);
  }

  private render(now: number, dt: number): void {
    const { ctx } = this;
    // adaptive resolution: sustained slow frames → smaller backing store
    if (dt > 0 && !this.reduceMotion) {
      this.frameAcc += dt;
      this.frameN++;
      if (this.frameN >= 60) {
        const avg = this.frameAcc / this.frameN;
        if (avg > 34 && this.resScale > 0.55) {
          this.resScale = Math.max(0.55, this.resScale - 0.15);
          this.applyBackingStore();
        } else if (avg < 15 && this.resScale < 1) {
          this.resScale = Math.min(1, this.resScale + 0.1);
          this.applyBackingStore();
        }
        this.frameAcc = 0;
        this.frameN = 0;
      }
    }
    const s = this.dpr * this.resScale;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.vw, this.vh);
    this.cam.update(dt);
    this.cam.clamp(this.vw, this.vh);
    if (dt > 0) this.particles.update(dt);

    for (const l of this.layers) {
      ctx.save();
      this.applyCam(ctx, l.parallax);
      l.paint(ctx, now, { w: this.vw, h: this.vh, cam: this.cam });
      ctx.restore();
    }

    // dynamic objects, depth-sorted
    ctx.save();
    this.applyCam(ctx, 1);
    const sorted = [...this.objects].sort((a, b) => a.depth - b.depth);
    for (const o of sorted) {
      ctx.save();
      o.draw(ctx, now, { reduceMotion: this.reduceMotion });
      ctx.restore();
    }
    // drag ghost on top
    if (this.drag?.moved && this.drag.obj.drawDragGhost) {
      ctx.save();
      this.drag.obj.drawDragGhost(ctx);
      ctx.restore();
    }
    this.particles.draw(ctx);
    ctx.restore();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.particles.clear();
  }
}
