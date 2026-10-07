import { describe, expect, it } from 'vitest';
import {
  canBloom, coolPod, createPod, deriveNova, finishHatch, holdPod,
  nextTemperament, rubPod, singPod, startBloom,
} from '../src/world/hatchling';

describe('hatchling pod state machine', () => {
  it('starts cold with a faint ember', () => {
    const p = createPod('sleepy', 1000);
    expect(p.phase).toBe('cold');
    expect(p.warmth).toBe(8);
    expect(p.over).toBe('none');
  });

  it('rub warms the pod and advances phases', () => {
    const p = createPod('hungry', 0);
    for (let i = 0; i < 250; i++) rubPod(p, 0.5, i);
    expect(p.warmth).toBeGreaterThan(22);
    expect(['warming', 'cozy', 'ready']).toContain(p.phase);
    expect(p.memory.warmth).toBeGreaterThan(0);
  });

  it('all-rub alone cannot reach ready (needs shelter OR song)', () => {
    const p = createPod('sleepy', 0);
    // shelter decays while rubbing without holding
    for (let i = 0; i < 400; i++) { rubPod(p, 0.4, i); coolPod(p, 0.05, i); }
    expect(p.phase).not.toBe('ready');
    expect(canBloom(p)).toBe(false);
  });

  it('hold charges shelter and retains warmth', () => {
    const p = createPod('sleepy', 0);
    for (let i = 0; i < 120; i++) rubPod(p, 0.5, i);
    const before = p.shelter;
    holdPod(p, 2, 100);
    expect(p.shelter).toBeGreaterThan(before);
    // sheltered pods cool slower than exposed ones
    const a = createPod('sleepy', 0); a.warmth = 60; a.shelter = 90;
    const b = createPod('sleepy', 0); b.warmth = 60; b.shelter = 0;
    coolPod(a, 5, 1); coolPod(b, 5, 1);
    expect(a.warmth).toBeGreaterThan(b.warmth);
  });

  it('good rhythm echoes raise song; banging scares the pod', () => {
    const p = createPod('singy', 0);
    const g = singPod(p, 0.9, 1);
    expect(g).toBeGreaterThan(0);
    expect(p.memory.song).toBe(1);
    const p2 = createPod('singy', 0);
    singPod(p2, 0.1, 1);
    expect(p2.over).toBe('tooLoud');
    expect(p2.memory.overEvents).toBe(1);
  });

  it('frantic rubbing overheats (tooHot with recovery window)', () => {
    const p = createPod('hungry', 0);
    for (let i = 0; i < 200; i++) rubPod(p, 0.5, i);
    rubPod(p, 0.99, 100);
    expect(p.over).toBe('tooHot');
    // frozen during over window
    const w = p.warmth;
    rubPod(p, 0.5, 101);
    expect(p.warmth).toBe(w);
  });

  it('bloom requires ready + calm; hatch derives identity from history', () => {
    const p = createPod('singy', 0);
    expect(startBloom(p)).toBe(false);
    for (let i = 0; i < 250; i++) rubPod(p, 0.5, i);
    holdPod(p, 6, 100);
    for (let i = 0; i < 4; i++) singPod(p, 0.9, 200 + i);
    expect(p.phase).toBe('ready');
    expect(canBloom(p)).toBe(true);
    expect(startBloom(p)).toBe(true);
    const id = finishHatch(p);
    expect(p.phase).toBe('hatched');
    expect(['sunny', 'teal', 'violet']).toContain(id.tint);
  });

  it('gentle keeping → teal stripes; songful keeping → violet starchirp', () => {
    expect(deriveNova({ warmth: 5, gentleness: 30, song: 0, overEvents: 0 }).tint).toBe('teal');
    expect(deriveNova({ warmth: 5, gentleness: 30, song: 0, overEvents: 0 }).pattern).toBe('stripes');
    expect(deriveNova({ warmth: 10, gentleness: 1, song: 6, overEvents: 0 }).pattern).toBe('starchirp');
    expect(deriveNova({ warmth: 200, gentleness: 1, song: 0, overEvents: 0 }).pattern).toBe('freckles');
  });

  it('replay cycles temperaments without immediate repeat', () => {
    expect(nextTemperament('sleepy')).toBe('hungry');
    expect(nextTemperament('hungry')).toBe('singy');
    expect(nextTemperament('singy')).toBe('sleepy');
  });

  it('bloomed/hatched pods ignore further care (no farming)', () => {
    const p = createPod('singy', 0);
    for (let i = 0; i < 250; i++) rubPod(p, 0.5, i);
    holdPod(p, 6, 100);
    for (let i = 0; i < 4; i++) singPod(p, 0.9, 200 + i);
    startBloom(p);
    const w = p.warmth;
    rubPod(p, 1, 999); holdPod(p, 5, 999); singPod(p, 1, 999);
    expect(p.warmth).toBe(w);
  });
});
