import { describe, expect, it } from 'vitest';
import { ambienceFor } from '../src/core/ambience';
import { defaultSave, migrateSave } from '../src/core/save';
import { worldObjects } from '../src/world/objects';
import {
  bedLit, chainComplete, groveLayout, groveStalled, growthTick,
  rng, wateredBeds, wetSegs, blockedSegs,
} from '../src/world/grove';
import { hintMirror, lampLayout, layoutSolves, reflect, traceBeam } from '../src/world/lampnet';
import {
  duetAnswer, genMotif, MOTIF_FREQS, nextMotif,
  roundLength, roundTolerance, scoreEcho,
} from '../src/world/starmotif';

describe('grove water network', () => {
  it('builds the right shape per difficulty', () => {
    expect(groveLayout(0, 7).beds).toHaveLength(2);
    expect(groveLayout(1, 7).beds).toHaveLength(3);
    expect(groveLayout(2, 7).beds).toHaveLength(4);
    expect(groveLayout(0, 7).dams.reduce((a, d) => a + d.stones, 0)).toBe(2);
    expect(groveLayout(2, 7).dams.reduce((a, d) => a + d.stones, 0)).toBe(5);
  });
  it('same seed, same layout (replay differs only across seeds)', () => {
    const a = groveLayout(1, 42);
    const b = groveLayout(1, 42);
    expect(a).toEqual(b);
    const c = groveLayout(1, 43);
    expect(c.dams[0].slots).not.toEqual(a.dams[0].slots);
  });
  it('water cannot pass a dammed segment; clearing opens the chain', () => {
    const l = groveLayout(1, 1);
    const blocked = blockedSegs(l.dams);
    expect(blocked.size).toBeGreaterThan(0);
    expect(wateredBeds(l, blocked).size).toBe(0);
    // clear everything → every bed drinks
    const open = new Set<string>();
    expect(wateredBeds(l, open).size).toBe(l.beds.length);
  });
  it('a mid-chain dam starves only its downstream beds (branching matters)', () => {
    const l = groveLayout(1, 1);
    // block ONLY s3 (bed1's feeder): bed0 (s2) and bed2 (s4) still drink
    const wet = wateredBeds(l, new Set(['s3']));
    const ids = [...wet].sort();
    expect(ids).toEqual(['bed0', 'bed2']);
    expect(wetSegs(l, new Set(['s2'])).has('s3')).toBe(false);
  });
  it('growth needs water AND light; weak combos stay pale, never "wrong"', () => {
    const l = groveLayout(0, 1);
    const bed = { ...l.beds[0], growth: 0, stage: 0 as const, pale: 0 };
    expect(growthTick(bed, false, true, 10)).toBeNull();
    expect(bed.growth).toBe(0);
    const b2 = { ...l.beds[0], growth: 0, stage: 0 as const, pale: 0 };
    const r1 = growthTick(b2, true, false, 1);
    expect(b2.pale).toBeGreaterThan(0); // weak result accumulates silently…
    expect(r1).toBe('pale'); // …and only whispers on whole-second marks, never "wrong"
    const b3 = { ...l.beds[0], growth: 0, stage: 0 as const, pale: 0 };
    let bloomed = 0;
    for (let i = 0; i < 40; i++) if (growthTick(b3, true, true, 0.5) === 'bloom') bloomed++;
    expect(bloomed).toBe(3); // three stage-ups to full bloom
    expect(b3.stage).toBe(3);
  });
  it('lit respects canopy shade + tapped-aside clouds', () => {
    const l = groveLayout(0, 1);
    const shady = { ...l.beds[1] }; // shade 0.35
    const now = 100000;
    // cloud0 covers x=250±170; bed1 at x=470: covered by cloud1 (520±150)
    expect(bedLit(shady, l.clouds, now)).toBe(false);
    const cleared = l.clouds.map((c) => (c.id === 'cloud1' ? { ...c, clearedUntil: now + 5000 } : c));
    expect(bedLit(shady, cleared, now)).toBe(true);
  });
  it('chain completes only when every bed blooms', () => {
    const l = groveLayout(0, 1);
    expect(chainComplete(l.beds)).toBe(false);
    for (const b of l.beds) { b.growth = 3; b.stage = 3; }
    expect(chainComplete(l.beds)).toBe(true);
  });
  it('stall signal fires after 45s of no progress with work left', () => {
    expect(groveStalled(0, 46000, true)).toBe(true);
    expect(groveStalled(0, 30000, true)).toBe(false);
    expect(groveStalled(0, 99999, false)).toBe(false);
  });
  it('rng is deterministic', () => {
    expect(rng(5)()).toBe(rng(5)());
  });
});

describe('lampnet beam geometry', () => {
  it('reflects correctly off 45° faces', () => {
    const up = { x: 0, y: -1 };
    const slashBack = reflect(up, { x: Math.SQRT1_2, y: Math.SQRT1_2 }); // '\'
    expect(slashBack.x).toBeCloseTo(-1);
    expect(slashBack.y).toBeCloseTo(0);
    const slash = reflect(up, { x: -Math.SQRT1_2, y: Math.SQRT1_2 }); // '/'
    expect(slash.x).toBeCloseTo(1);
    expect(slash.y).toBeCloseTo(0);
  });
  it('all authored layouts solve with solution angles (never ship blind)', () => {
    for (const d of [0, 1, 2] as const) {
      expect(layoutSolves(lampLayout(d))).toBe(true);
    }
  });
  it('scrambled starts are NOT pre-solved (the child has real work)', () => {
    for (const d of [0, 1, 2] as const) {
      const l = lampLayout(d);
      const mirrors = l.mirrors.map((m) => ({ ...m, ang: m.startAng }));
      const { lit } = traceBeam(l.src, l.dir, mirrors, l.lamps);
      expect(lit.length).toBeLessThan(l.lamps.length);
    }
  });
  it('mid-path lamps catch a passing beam (partial wins exist)', () => {
    const l = lampLayout(0);
    // only M1 correct, M2 parked edge-on: beam goes right along y=700 through L1, then out
    const mirrors = l.mirrors.map((m) => (m.id === 'm1' ? { ...m, ang: 1 } : { ...m, ang: 0 }));
    const { lit } = traceBeam(l.src, l.dir, mirrors, l.lamps);
    expect(lit).toContain('l1');
    expect(lit).not.toContain('l2');
  });
  it('hint points at a mirror that alone lights something new (never the decoy)', () => {
    const l = lampLayout(0);
    const mirrors = l.mirrors.map((m) => (m.id === 'm1' ? { ...m, ang: 1 } : { ...m, ang: 0 }));
    const { lit } = traceBeam(l.src, l.dir, mirrors, l.lamps);
    expect(lit).toEqual(['l1']);
    const h = hintMirror({ ...l, mirrors }, lit);
    expect(h).toBe('m2');
    const l2 = lampLayout(2);
    const m2 = l2.mirrors.map((m) => ({ ...m }));
    const t2 = traceBeam(l2.src, l2.dir, m2, l2.lamps);
    expect(hintMirror({ ...l2, mirrors: m2 }, t2.lit) ?? 'm4').not.toBe('m4');
  });
  it('decoy left alone never steals a solved beam', () => {
    const l = lampLayout(2);
    expect(layoutSolves(l)).toBe(true);
  });
});

describe('starmotif patterns', () => {
  it('motifs are singable: no immediate repeats, at least two stars', () => {
    for (let s = 0; s < 20; s++) {
      const m = genMotif(rng(s * 977 + 13), 5, 5);
      expect(m).toHaveLength(5);
      for (let i = 1; i < m.length; i++) expect(m[i]).not.toBe(m[i - 1]);
      expect(new Set(m).size).toBeGreaterThanOrEqual(2);
    }
  });
  it('round length + tolerance scale with difficulty', () => {
    expect(roundLength(0, 1)).toBe(3);
    expect(roundLength(1, 1)).toBe(4);
    expect(roundLength(2, 1)).toBe(5);
    expect(roundLength(0, 9)).toBeLessThanOrEqual(6);
    expect(roundTolerance(0)).toBeGreaterThan(roundTolerance(2));
  });
  it('perfect echo scores clean timing; first mistake is located', () => {
    const s = scoreEcho([2, 0, 4], [2, 0, 4], [120, -80, 200], 900);
    expect(s.correct).toBe(true);
    expect(s.mistakeAt).toBe(-1);
    expect(s.onBeatShare).toBe(1);
    const bad = scoreEcho([2, 0, 4], [2, 1, 4], [100, 100, 100], 900);
    expect(bad.correct).toBe(false);
    expect(bad.mistakeAt).toBe(1);
  });
  it('success grows the motif keeping its head; mistakes morph shape', () => {
    const cur = [1, 3, 2, 4];
    const grown = nextMotif(true, cur, rng(3), 1, 3);
    expect(grown.length).toBe(cur.length + 1);
    expect(grown.slice(0, 4)).toEqual(cur);
    const morphed = nextMotif(false, cur, rng(9), 1, 3);
    expect(morphed.length).toBe(cur.length);
    expect(morphed).not.toEqual(cur);
  });
  it('duet answers a third higher within the pentatonic voice', () => {
    expect(MOTIF_FREQS).toHaveLength(5);
    expect(duetAnswer([0, 2, 4])).toEqual([2, 4, 1]);
  });
});

describe('expedition wiring (world contract, no migration needed)', () => {
  it('routes ambience honestly: grove gets birdsong, night scenes stay silent', () => {
    expect(ambienceFor('grove')).toBe('garden');
    expect(ambienceFor('lamplight')).toBeNull();
    expect(ambienceFor('starmail')).toBeNull();
  });
  it('expedition save fields survive migration untouched', () => {
    const d = defaultSave();
    d.grove = { blooms: 5, bestChain: 3, completedAt: 123, firefly: true };
    d.lamplight = { lit: 3, completedAt: 124, towers: 1 };
    d.starmail = { rounds: 4, completedAt: 125, motif: [1, 2, 3], starTint: 'gold' };
    const m = migrateSave({ ...d, version: 2 });
    expect(m.grove?.blooms).toBe(5);
    expect(m.lamplight?.towers).toBe(1);
    expect(m.starmail?.starTint).toBe('gold');
    expect(m.version).toBe(3);
  });
  it('earned expeditions appear on the island, unearned stay invisible', () => {
    const fresh = worldObjects(defaultSave());
    for (const id of ['grove-bloom', 'grove-firefly', 'lamp-tower', 'star-monument']) {
      expect(fresh.some((o) => o.id === id)).toBe(false);
    }
    const d = defaultSave();
    d.grove = { blooms: 3, bestChain: 3, completedAt: 1, firefly: true };
    d.lamplight = { lit: 2, completedAt: 1, towers: 1 };
    d.starmail = { rounds: 3, completedAt: 1, motif: [0, 1, 2], starTint: 'gold' };
    const objs = worldObjects(d);
    for (const id of ['grove-bloom', 'grove-firefly', 'lamp-tower', 'star-monument']) {
      expect(objs.some((o) => o.id === id)).toBe(true);
    }
  });
});
