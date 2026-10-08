/* Starmotif: pure pattern logic for "A Message That Never Arrived" (no DOM).
   The sky calls (light + tone per star), the child answers by tapping stars
   in order. Mistakes morph the signal (branch, never fail). Emotion round is
   screen-level; this module owns motifs, echo scoring, and growth. */

/** Pentatonic voice of the Listener — warm, no wrong notes possible. */
export const MOTIF_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0];

export type Difficulty = 0 | 1 | 2;

export interface MotifRound {
  motif: number[];   // star indices in call order
  round: number;     // 1-based
  toleranceMs: number;
}

export function roundLength(difficulty: Difficulty, round: number): number {
  const base = difficulty === 0 ? 3 : difficulty === 1 ? 4 : 5;
  return Math.min(6, base + Math.floor((round - 1) / 2));
}

export function roundTolerance(difficulty: Difficulty): number {
  return difficulty === 0 ? 1200 : difficulty === 1 ? 900 : 700;
}

/** Build a motif: no immediate repeats (singable), no all-same (boring). */
export function genMotif(rand01: () => number, length: number, pool: number): number[] {
  const out: number[] = [];
  while (out.length < length) {
    const s = Math.floor(rand01() * pool) % pool;
    if (out.length && out[out.length - 1] === s) continue;
    out.push(s);
  }
  // guarantee at least two distinct stars so there is something to remember
  if (pool > 1 && new Set(out).size < 2) out[out.length - 1] = (out[0] + 1) % pool;
  return out;
}

export interface EchoScore {
  /** every tap matched, in order */
  correct: boolean;
  /** index of first mistake (-1 when perfect) — drives the morph branch */
  mistakeAt: number;
  /** mean absolute timing error of correct taps (ms) — rhythm evidence */
  timingAvgMs: number;
  /** share of taps inside the tolerance window — timing mastery signal */
  onBeatShare: number;
}

export function scoreEcho(
  expected: number[], tapped: number[], timingErrMs: number[], toleranceMs: number,
): EchoScore {
  let mistakeAt = -1;
  for (let i = 0; i < tapped.length; i++) {
    if (tapped[i] !== expected[i]) { mistakeAt = i; break; }
  }
  const correct = mistakeAt === -1 && tapped.length >= expected.length;
  const errs = timingErrMs.slice(0, tapped.length);
  const timingAvgMs = errs.length ? errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length : 0;
  const onBeatShare = errs.length ? errs.filter((e) => Math.abs(e) <= toleranceMs).length / errs.length : 0;
  return { correct, mistakeAt, timingAvgMs, onBeatShare };
}

/**
 * Branch after a round: perfect/late success grows the motif; a mistake
 * morphs (same length, fresh motif — the signal "changes shape", never FAIL).
 */
export function nextMotif(
  ok: boolean, cur: number[], rand01: () => number, difficulty: Difficulty, round: number,
): number[] {
  const pool = 5;
  if (ok) {
    const grow = roundLength(difficulty, round + 1) > cur.length;
    const base = genMotif(rand01, grow ? cur.length + 1 : cur.length, pool);
    // keep the learned head so mastery compounds instead of resetting
    for (let i = 0; i < Math.min(cur.length, base.length); i++) base[i] = cur[i];
    return base;
  }
  return genMotif(rand01, cur.length, pool); // morph: same length, new shape
}

/** Duet transposition for the finale: the answer, a third higher. */
export function duetAnswer(motif: number[]): number[] {
  return motif.map((s) => (s + 2) % MOTIF_FREQS.length);
}

/** Emotion glyphs for the feeling round — faces, not words. */
export const EMOTIONS = [
  { id: 'joy', emoji: '😄' },
  { id: 'calm', emoji: '😌' },
  { id: 'wow', emoji: '😮' },
] as const;
export type EmotionId = (typeof EMOTIONS)[number]['id'];
