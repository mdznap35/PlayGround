import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';
import { Particles } from '../src/engine/particles';

describe('camera (cinematic, smooth, bounded)', () => {
  it('fits the whole world in any viewport', () => {
    const c = new Camera(1000, 620);
    c.fit(800, 600);
    expect(c.zoom).toBeCloseTo(0.8);
    expect(c.x).toBeCloseTo(0);
  });
  it('clamp centers (never offsets) a world smaller than the view', () => {
    const c = new Camera(1000, 620);
    c.fit(1320, 465); // wide view: world narrower than screen
    const fx = c.x;
    c.update(16);
    c.clamp(1320, 465);
    expect(c.x).toBeCloseTo(fx, 5); // regression: clamp once yanked x to -40
    // world centered: left margin equals right margin
    expect(c.x + (1320 / c.zoom - 1000) / 2).toBeCloseTo(0, 0);
  });
  it('focus glides and calls done (no snapping)', () => {
    const c = new Camera(1000, 620);
    c.fit(1000, 620);
    let done = 0;
    c.focus(400, 300, 2, 100, () => { done++; });
    c.update(50);
    expect(c.busy).toBe(true);
    expect(c.zoom).toBeGreaterThan(1);
    c.update(60);
    expect(c.busy).toBe(false);
    expect(done).toBe(1);
    expect(c.zoom).toBeCloseTo(2);
  });
  it('round-trips world↔screen coordinates', () => {
    const c = new Camera(1000, 620);
    c.fit(1000, 620);
    const s = c.toScreen(400, 300);
    const w = c.toWorld(s.x, s.y);
    expect(w.x).toBeCloseTo(400);
    expect(w.y).toBeCloseTo(300);
  });
  it('panning cancels cinematic (child stays in control)', () => {
    const c = new Camera(1000, 620);
    c.fit(1000, 620);
    c.focus(400, 300, 2, 1000);
    c.pan(50, 0);
    expect(c.busy).toBe(false);
  });
});

describe('particles (capped pool, zero alloc)', () => {
  it('never exceeds the pool even under spam', () => {
    const p = new Particles();
    for (let i = 0; i < 20; i++) p.spawn('spark', 0, 0, 50);
    expect(p.aliveCount()).toBeLessThanOrEqual(160);
    expect(p.aliveCount()).toBeGreaterThan(0);
  });
  it('particles age and die, freeing the pool', () => {
    const p = new Particles();
    p.spawn('puff', 10, 10, 50);
    expect(p.aliveCount()).toBe(50);
    p.update(5000);
    expect(p.aliveCount()).toBe(0);
  });
});
