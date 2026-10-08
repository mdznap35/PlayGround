/* Lampnet: pure mirror-and-beam geometry for "City of Light" (no DOM, tested).
   Tap a mirror → it rotates 45°. The beam is raycast live: source → mirrors →
   lamps. A lamp lights when the beam passes within its halo. Layouts are
   hand-authored AND machine-verified solvable (see tests). */

export type Difficulty = 0 | 1 | 2;

export interface Vec { x: number; y: number }
export interface Mirror { id: string; x: number; y: number; ang: number } // ang idx 0..7 → face angle ang*45°
export interface Lamp { id: string; x: number; y: number }
export interface BeamSeg { x1: number; y1: number; x2: number; y2: number }
export interface LampLayout {
  src: Vec; dir: Vec;
  mirrors: (Mirror & { solAng: number; startAng: number })[];
  lamps: Lamp[];
  decoy?: string; // mirror id a child must learn to leave alone (L2)
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

export const FACE_HALF = 26; // mirror face half-length (world units)
export const LAMP_R = 30;    // lamp halo catch radius
const BOUNDS = { x0: 40, y0: 90, x1: 680, y1: 1010 };

function faceDir(ang: number): Vec {
  const a = ((ang % 8) + 8) % 8 * Math.PI / 4;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Reflect v across the line with direction u. */
export function reflect(v: Vec, u: Vec): Vec {
  const dot = v.x * u.x + v.y * u.y;
  return { x: 2 * dot * u.x - v.x, y: 2 * dot * u.y - v.y };
}

/** Ray (p+t·d, t>minT) vs segment (a→b). Returns t or null. */
function raySeg(p: Vec, d: Vec, a: Vec, b: Vec, minT: number): number | null {
  const ex = b.x - a.x, ey = b.y - a.y;
  const denom = d.x * ey - d.y * ex;
  if (Math.abs(denom) < 1e-9) return null;
  const dx = a.x - p.x, dy = a.y - p.y;
  const t = (dx * ey - dy * ex) / denom;
  const s = (dx * d.y - dy * d.x) / denom;
  if (t > minT && s >= 0 && s <= 1) return t;
  return null;
}

/** Ray vs circle. Returns nearest t>minT with dist<r, else null. */
function rayCircle(p: Vec, d: Vec, c: Vec, r: number, minT: number): number | null {
  const ox = c.x - p.x, oy = c.y - p.y;
  const tca = ox * d.x + oy * d.y;
  const d2 = ox * ox + oy * oy - tca * tca;
  if (d2 > r * r) return null;
  const thc = Math.sqrt(Math.max(0, r * r - d2));
  const t = tca - thc;
  if (t > minT) return t;
  const t2 = tca + thc;
  return t2 > minT ? t2 : null;
}

export interface Trace { segs: BeamSeg[]; lit: string[]; end: Vec }

export function traceBeam(src: Vec, dir: Vec, mirrors: Mirror[], lamps: Lamp[]): Trace {
  const segs: BeamSeg[] = [];
  const lit: string[] = [];
  let p = { ...src };
  let d = { ...dir };
  const n = Math.hypot(d.x, d.y) || 1;
  d = { x: d.x / n, y: d.y / n };
  let skipId: string | null = null; // never re-hit the face we just left
  for (let bounce = 0; bounce < 10; bounce++) {
    let bestT = Infinity;
    let bestMirror: Mirror | null = null;
    let bestLamp: Lamp | null = null;
    for (const m of mirrors) {
      if (m.id === skipId) continue;
      const u = faceDir(m.ang);
      const a = { x: m.x - u.x * FACE_HALF, y: m.y - u.y * FACE_HALF };
      const b = { x: m.x + u.x * FACE_HALF, y: m.y + u.y * FACE_HALF };
      // edge-on mirrors let the beam pass: skip when nearly parallel
      const nx = -u.y, ny = u.x;
      if (Math.abs(d.x * nx + d.y * ny) < 0.2) continue;
      const t = raySeg(p, d, a, b, 2);
      if (t !== null && t < bestT) { bestT = t; bestMirror = m; bestLamp = null; }
    }
    for (const l of lamps) {
      if (lit.includes(l.id)) continue;
      const t = rayCircle(p, d, l, LAMP_R, 2);
      if (t !== null && t < bestT) { bestT = t; bestMirror = null; bestLamp = l; }
    }
    // bounds exit
    let tEdge = Infinity;
    if (d.x > 1e-9) tEdge = Math.min(tEdge, (BOUNDS.x1 - p.x) / d.x);
    if (d.x < -1e-9) tEdge = Math.min(tEdge, (BOUNDS.x0 - p.x) / d.x);
    if (d.y > 1e-9) tEdge = Math.min(tEdge, (BOUNDS.y1 - p.y) / d.y);
    if (d.y < -1e-9) tEdge = Math.min(tEdge, (BOUNDS.y0 - p.y) / d.y);
    if (bestMirror) {
      const end = { x: p.x + d.x * bestT, y: p.y + d.y * bestT };
      segs.push({ x1: p.x, y1: p.y, x2: end.x, y2: end.y });
      d = reflect(d, faceDir(bestMirror.ang));
      const nn = Math.hypot(d.x, d.y) || 1;
      p = { x: end.x + (d.x / nn) * 3, y: end.y + (d.y / nn) * 3 };
      d = { x: d.x / nn, y: d.y / nn };
      skipId = bestMirror.id;
      continue;
    }
    if (bestLamp && bestT <= tEdge) {
      const end = { x: p.x + d.x * bestT, y: p.y + d.y * bestT };
      segs.push({ x1: p.x, y1: p.y, x2: end.x, y2: end.y });
      if (!lit.includes(bestLamp.id)) lit.push(bestLamp.id);
      // lamp posts sip the light — the beam continues (mid-path wins stay possible)
      p = { x: end.x + d.x * (LAMP_R + 3), y: end.y + d.y * (LAMP_R + 3) };
      continue;
    }
    const end = { x: p.x + d.x * Math.max(0, tEdge), y: p.y + d.y * Math.max(0, tEdge) };
    segs.push({ x1: p.x, y1: p.y, x2: end.x, y2: end.y });
    p = end;
    break;
  }
  return { segs, lit, end: p };
}

/** Solve check: with solution angles, every lamp lights. */
export function layoutSolves(l: LampLayout): boolean {
  const mirrors = l.mirrors.map((m) => ({ ...m, ang: m.solAng }));
  const { lit } = traceBeam(l.src, l.dir, mirrors, l.lamps);
  return l.lamps.every((lamp) => lit.includes(lamp.id));
}

/**
 * Environmental hint: a mirror whose rotation ALONE (keeping others fixed)
 * would light a currently-dark lamp. Returns null when no single fix exists
 * (the child must discover a longer chain — no free solutions).
 */
export function hintMirror(l: LampLayout, litNow: string[]): string | null {
  const dark = l.lamps.filter((lp) => !litNow.includes(lp.id));
  if (!dark.length) return null;
  for (const m of l.mirrors) {
    if (m.id === l.decoy) continue; // never point at the decoy
    for (let a = 0; a < 8; a++) {
      if (a === m.ang) continue;
      const trial = l.mirrors.map((x) => (x.id === m.id ? { ...x, ang: a } : { ...x }));
      const { lit } = traceBeam(l.src, l.dir, trial, l.lamps);
      if (dark.some((dl) => lit.includes(dl.id))) return m.id;
    }
  }
  return null;
}

/** Hand-authored layouts. Verified solvable in tests — never ship blind. */
export function lampLayout(difficulty: Difficulty): LampLayout {
  const src = { x: 360, y: 920 };
  const dir = { x: 0, y: -1 };
  if (difficulty === 0) {
    // one serial path, one mid-path freebie: S → M1(\) → M2(\) → L2; L1 rides the middle.
    return {
      src, dir, bounds: { ...BOUNDS },
      mirrors: [
        { id: 'm1', x: 360, y: 700, ang: 3, solAng: 1, startAng: 3 },
        { id: 'm2', x: 190, y: 700, ang: 5, solAng: 1, startAng: 5 },
      ],
      lamps: [
        { id: 'l1', x: 275, y: 700 },
        { id: 'l2', x: 190, y: 470 },
      ],
    };
  }
  if (difficulty === 1) {
    // three-mirror chain with two mid-path wins.
    return {
      src, dir, bounds: { ...BOUNDS },
      mirrors: [
        { id: 'm1', x: 360, y: 770, ang: 3, solAng: 1, startAng: 3 },
        { id: 'm2', x: 200, y: 770, ang: 6, solAng: 1, startAng: 6 },
        { id: 'm3', x: 200, y: 510, ang: 0, solAng: 3, startAng: 0 },
      ],
      lamps: [
        { id: 'l1', x: 280, y: 770 },
        { id: 'l2', x: 200, y: 640 },
        { id: 'l3', x: 430, y: 510 },
      ],
    };
  }
  // three-mirror chain + a decoy that must be left alone.
  const base = lampLayout(1);
  return {
    ...base,
    decoy: 'm4',
    mirrors: [
      ...base.mirrors.map((m) => ({ ...m })),
      { id: 'm4', x: 530, y: 770, ang: 0, solAng: 0, startAng: 0 },
    ],
  };
}
