/* Grove: pure water-network + growth state machine for
   "The Forest That Forgot How to Grow" (no DOM, fully tested).
   - Water flows from the spring through consecutive UNBLOCKED segments.
   - Dams hold stones; dragging a stone out unblocks its segment.
   - Beds need water AND light; clouds regrow cover unless tapped aside.
   - Growth is staged; weak combos (water without light) stay pale.
   - All blooms at once = the chain reaction (WOW). */

export type Difficulty = 0 | 1 | 2;

export interface GroveBed {
  id: string;
  seg: string;      // feeding segment
  x: number; y: number; // design-space coords (720x1080 portrait)
  shade: number;    // 0..1 fixed canopy shade (higher = needs clearer sky)
  growth: number;   // 0..3 continuous progress
  stage: 0 | 1 | 2 | 3;
  pale: number;     // seconds spent watered-but-dark (weak-result evidence)
}

export interface GroveDam {
  id: string;
  seg: string;      // blocked segment while stones remain
  x: number; y: number;
  stones: number;   // stones still sitting in the dam
  slots: { x: number; y: number }[]; // stone home positions
}

export interface GroveCloud {
  id: string;
  x: number;        // center of shadow band
  halfWidth: number;
  clearedUntil: number; // timestamp ms — tapped aside until then
}

export interface GroveLayout {
  /** segments in flow order from the spring; downstream map for the branch */
  order: string[];
  downstream: Record<string, string[]>;
  beds: GroveBed[];
  dams: GroveDam[];
  clouds: GroveCloud[];
  /** seconds a tapped cloud stays aside */
  clearSecs: number;
  /** seconds for full cloud cover to return */
  regenSecs: number;
}

// Fixed topology: s0 spring → s1 → s2 → { s3 → bed1, s4 → bed2 }; bed0 sits on s2.
const ORDER = ['s0', 's1', 's2', 's3', 's4'];
const DOWNSTREAM: Record<string, string[]> = {
  s0: ['s1'], s1: ['s2'], s2: ['s3', 's4'], s3: [], s4: [],
};

// Bed slots (x, y, shade). Chosen so every layout is a prefix + branch.
const BED_SLOTS: { seg: string; x: number; y: number; shade: number }[] = [
  { seg: 's2', x: 250, y: 640, shade: 0.15 },
  { seg: 's3', x: 470, y: 700, shade: 0.35 },
  { seg: 's4', x: 250, y: 830, shade: 0.30 },
  { seg: 's4', x: 500, y: 860, shade: 0.55 },
];

// Dam slots (x, y). Dam count/stones vary by difficulty.
const DAM_SLOTS: { seg: string; x: number; y: number }[] = [
  { seg: 's1', x: 360, y: 430 },
  { seg: 's3', x: 470, y: 560 },
  { seg: 's2', x: 360, y: 505 },
  { seg: 's4', x: 360, y: 660 },
];

/** Seeded PRNG (mulberry32) — replay layouts differ, tests stay deterministic. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function groveLayout(difficulty: Difficulty, seed: number): GroveLayout {
  const rand = rng(seed);
  const bedCount = difficulty === 0 ? 2 : difficulty === 1 ? 3 : 4;
  const damPlan = difficulty === 0
    ? [{ slot: 0, stones: 1 }, { slot: 1, stones: 1 }]
    : difficulty === 1
      ? [{ slot: 0, stones: 1 }, { slot: 1, stones: 2 }, { slot: 3, stones: 1 }]
      : [{ slot: 0, stones: 1 }, { slot: 2, stones: 1 }, { slot: 1, stones: 2 }, { slot: 3, stones: 1 }];
  const beds: GroveBed[] = BED_SLOTS.slice(0, bedCount).map((b, i) => ({
    id: `bed${i}`, seg: b.seg, x: b.x, y: b.y, shade: b.shade, growth: 0, stage: 0, pale: 0,
  }));
  const dams: GroveDam[] = damPlan.map((dplan, i) => {
    const slot = DAM_SLOTS[dplan.slot];
    const slots = Array.from({ length: dplan.stones }, (_, k) => ({
      // slight seeded jitter so replays feel hand-placed, never identical
      x: slot.x + (rand() - 0.5) * 14 + (k - (dplan.stones - 1) / 2) * 44,
      y: slot.y + (rand() - 0.5) * 10,
    }));
    return { id: `dam${i}`, seg: slot.seg, x: slot.x, y: slot.y, stones: dplan.stones, slots };
  });
  const clouds: GroveCloud[] = [
    { id: 'cloud0', x: 250, halfWidth: 170, clearedUntil: 0 },
    { id: 'cloud1', x: 520, halfWidth: 150, clearedUntil: 0 },
  ];
  return {
    order: [...ORDER],
    downstream: Object.fromEntries(Object.entries(DOWNSTREAM).map(([k, v]) => [k, [...v]])),
    beds, dams, clouds,
    clearSecs: difficulty === 2 ? 12 : difficulty === 1 ? 16 : 22,
    regenSecs: difficulty === 2 ? 26 : 34,
  };
}

/** Segments currently blocked (a dam with stones left on it). */
export function blockedSegs(dams: GroveDam[]): Set<string> {
  return new Set(dams.filter((d) => d.stones > 0).map((d) => d.seg));
}

/** Wet segments reachable from the spring. Pure BFS over the layout graph. */
export function wetSegs(layout: GroveLayout, blocked: Set<string>): Set<string> {
  const wet = new Set<string>();
  const queue = ['s0'];
  while (queue.length) {
    const s = queue.pop()!;
    if (wet.has(s) || blocked.has(s)) continue;
    wet.add(s);
    for (const nx of layout.downstream[s] ?? []) queue.push(nx);
  }
  return wet;
}

/** Bed ids currently receiving water. */
export function wateredBeds(layout: GroveLayout, blocked: Set<string>): Set<string> {
  const wet = wetSegs(layout, blocked);
  return new Set(layout.beds.filter((b) => wet.has(b.seg)).map((b) => b.id));
}

/** Is a bed lit right now? Clouds cast moving shadow; canopy adds fixed shade. */
export function bedLit(bed: GroveBed, clouds: GroveCloud[], now: number): boolean {
  let cover = bed.shade;
  for (const c of clouds) {
    if (now < c.clearedUntil) continue; // tapped aside — sun pours through
    if (Math.abs(bed.x - c.x) < c.halfWidth) cover += 0.45;
  }
  return cover < 0.5;
}

/** Advance one bed. Returns 'bloom' exactly on stage transitions. */
export function growthTick(bed: GroveBed, watered: boolean, lit: boolean, dtSec: number): 'bloom' | 'pale' | null {
  if (bed.stage >= 3) return null;
  if (watered && lit) {
    const before = Math.floor(bed.growth);
    bed.growth = Math.min(3, bed.growth + dtSec / 4); // ~4s per stage
    if (Math.floor(bed.growth) > before) {
      bed.stage = Math.floor(bed.growth) as 0 | 1 | 2 | 3;
      return 'bloom';
    }
    return null;
  }
  if (watered && !lit) {
    bed.pale += dtSec; // weak result accumulates — evidence, not failure
    if (bed.pale > 0 && Math.floor(bed.pale) !== Math.floor(bed.pale - dtSec)) return 'pale';
  }
  return null;
}

/** The WOW condition: every bed fully bloomed at the same time. */
export function chainComplete(beds: GroveBed[]): boolean {
  return beds.length > 0 && beds.every((b) => b.stage >= 3);
}

/** Stall signal for the Nova hint: seconds since last stage-up with stones left to move. */
export function groveStalled(lastProgressAt: number, now: number, damsLeft: boolean): boolean {
  return damsLeft && now - lastProgressAt > 45000;
}
