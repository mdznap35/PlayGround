/* AdaptiveEngine: NOT correct=+1/wrong=-1. Looks at time, tries,
   error kinds, hint dependence, and retry-after-hint success to pick
   difficulty + scaffolding for the next round. */

import type { AttemptEvidence } from './types';

export type Difficulty = 0 | 1 | 2; // gentle → brave → hero

export interface AdaptiveDecision {
  difficulty: Difficulty;
  offerExample: boolean;
  startHintLevel: number;
  note: string;
}

const RECENT = 6;

export function decide(history: AttemptEvidence[], activityId: string): AdaptiveDecision {
  const h = history.filter((a) => a.activityId === activityId).slice(-RECENT);
  if (h.length === 0) return { difficulty: 0, offerExample: true, startHintLevel: 0, note: 'first-contact' };

  const wins = h.filter((a) => a.success);
  const winRate = wins.length / h.length;
  const avgTries = h.reduce((s, a) => s + a.tries, 0) / h.length;
  const avgHints = h.reduce((s, a) => s + a.hintsUsed, 0) / h.length;
  const avgTime = h.reduce((s, a) => s + a.durationMs, 0) / h.length;
  const last = h[h.length - 1];
  const sameErrorRepeat = h.length >= 3 && h.slice(-3).every((a) => !a.success && a.errorKind && a.errorKind === last.errorKind);

  // struggling: slow, many tries, hint-dependent, repeating same error
  if (sameErrorRepeat || (winRate < 0.4 && avgTries > 2.5) || avgHints >= 2) {
    return { difficulty: 0, offerExample: true, startHintLevel: 1, note: 'support' };
  }
  // cruising: fast clean wins — raise the ceiling, but keep it playful
  if (winRate >= 0.85 && avgTries <= 1.4 && avgHints < 0.5 && avgTime < 45000) {
    const d: Difficulty = last.success ? 2 : 1;
    return { difficulty: d, offerExample: false, startHintLevel: 0, note: 'stretch' };
  }
  // hint-dependent success: same level, pre-arm a visual cue
  if (winRate >= 0.6 && avgHints >= 1) {
    return { difficulty: 1, offerExample: false, startHintLevel: 1, note: 'fade-hints' };
  }
  return { difficulty: 1, offerExample: false, startHintLevel: 0, note: 'steady' };
}
