/* Hatchling: pure pod → Nova state machine (no DOM, fully tested).
   The heart of the Creative Reset slice "نوفا تفقس".
   - Pod accumulates warmth (rub), shelter (hold), song (rhythm echo).
   - Over-care states teach "just enough" (too hot / too loud).
   - Hatch memory derives Nova's appearance — ownership via history. */

export type PodTemperament = 'sleepy' | 'hungry' | 'singy';
export type PodPhase = 'cold' | 'warming' | 'cozy' | 'ready' | 'blooming' | 'hatched';
export type OverState = 'none' | 'tooHot' | 'tooLoud';

export interface HatchMemory {
  /** total rub energy applied (px-travel normalized) */
  warmth: number;
  /** total seconds cupped/held */
  gentleness: number;
  /** successful rhythm echoes */
  song: number;
  /** over-care events (self-regulation evidence) */
  overEvents: number;
}

export interface PodState {
  temperament: PodTemperament;
  warmth: number; // 0..100 — THE progress (visible as blue→gold)
  shelter: number; // 0..100 — retention multiplier charge
  song: number; // 0..100 — responsiveness
  phase: PodPhase;
  over: OverState;
  overUntil: number; // timestamp ms
  memory: HatchMemory;
  bornAt: number;
}

export interface NovaIdentity {
  /** body glow tint derived from care mix */
  tint: 'sunny' | 'teal' | 'violet';
  /** pattern derived from dominant care */
  pattern: 'freckles' | 'stripes' | 'starchirp';
  /** chirp base frequency */
  chirpBase: number;
}

const THRESHOLDS: Record<PodTemperament, { cozy: number; ready: number; rubRate: number; holdRate: number; songRate: number }> = {
  sleepy: { cozy: 45, ready: 85, rubRate: 1.0, holdRate: 1.3, songRate: 0.8 },
  hungry: { cozy: 40, ready: 80, rubRate: 1.25, holdRate: 0.9, songRate: 1.0 },
  singy: { cozy: 38, ready: 78, rubRate: 0.85, holdRate: 0.9, songRate: 1.4 },
};

export function createPod(temperament: PodTemperament, now = Date.now()): PodState {
  return {
    temperament,
    warmth: 8, // a faint ember — alive but cold
    shelter: 20,
    song: 0,
    phase: 'cold',
    over: 'none',
    overUntil: 0,
    memory: { warmth: 0, gentleness: 0, song: 0, overEvents: 0 },
    bornAt: now,
  };
}

/** Rub adds heat. intensity 0..1 (pointer speed normalized, caller-throttled
 * to ~1 call per 100ms of active rubbing). Returns actual gain. */
export function rubPod(p: PodState, intensity: number, now = Date.now()): number {
  if (p.phase === 'blooming' || p.phase === 'hatched') return 0;
  if (now < p.overUntil) return 0;
  const t = THRESHOLDS[p.temperament];
  // shelter retains: holding charge multiplies rub effectiveness
  const retention = 1 + (p.shelter / 100) * 0.8;
  // tuned: ~3 warmth/sec of steady rubbing → minutes of keeping, not seconds
  const gain = Math.min(1, Math.max(0, intensity)) * 0.55 * t.rubRate * retention;
  p.warmth = Math.min(100, p.warmth + gain);
  p.memory.warmth += gain;
  // frantic rubbing overheats: too much rate in a single stroke
  if (intensity > 0.92 && p.warmth > 55) {
    return triggerOver(p, 'tooHot', now, gain);
  }
  updatePhase(p, now);
  return gain;
}

/** Holding (cupping) charges shelter + slowly holds warmth. dtSec seconds. */
export function holdPod(p: PodState, dtSec: number, now = Date.now()): void {
  if (p.phase === 'blooming' || p.phase === 'hatched') return;
  if (now < p.overUntil) return;
  const t = THRESHOLDS[p.temperament];
  p.shelter = Math.min(100, p.shelter + dtSec * 9 * t.holdRate);
  p.warmth = Math.min(100, p.warmth + dtSec * 2.2); // held warmth doesn't escape
  p.memory.gentleness += dtSec;
  updatePhase(p, now);
}

/** Rhythm echo: child taps back the pod's pulse. quality 0..1 (timing). */
export function singPod(p: PodState, quality: number, now = Date.now()): number {
  if (p.phase === 'blooming' || p.phase === 'hatched') return 0;
  if (now < p.overUntil) return 0;
  const t = THRESHOLDS[p.temperament];
  if (quality < 0.25) {
    // banging, not singing — pod hides
    return triggerOver(p, 'tooLoud', now, 0);
  }
  const gain = quality * 11 * t.songRate;
  p.song = Math.min(100, p.song + gain);
  p.warmth = Math.min(100, p.warmth + gain * 0.35);
  p.memory.song += 1;
  updatePhase(p, now);
  return gain;
}

/** Passive cooling each tick. dtSec seconds. Sheltered pods cool slower. */
export function coolPod(p: PodState, dtSec: number, now = Date.now()): void {
  if (p.phase === 'blooming' || p.phase === 'hatched') return;
  if (now < p.overUntil) return;
  const insulation = p.shelter / 100; // 0..1
  const rate = 1.6 * (1 - insulation * 0.75);
  p.warmth = Math.max(0, p.warmth - rate * dtSec);
  p.shelter = Math.max(0, p.shelter - dtSec * 1.1);
  p.song = Math.max(0, p.song - dtSec * 0.8);
  updatePhase(p, now);
}

function triggerOver(p: PodState, over: OverState, now: number, gain: number): number {
  p.over = over;
  p.overUntil = now + 2600;
  p.memory.overEvents += 1;
  // over-care costs a little warmth (the pod pants / hides and cools)
  p.warmth = Math.max(0, p.warmth - 6);
  return gain;
}

/** Recompute phase from meters. Blooming is triggered explicitly via tryBloom. */
export function updatePhase(p: PodState, now = Date.now()): void {
  if (p.phase === 'blooming' || p.phase === 'hatched') return;
  if (now < p.overUntil) return; // over-state freezes phase display
  else if (p.over !== 'none') p.over = 'none';
  const t = THRESHOLDS[p.temperament];
  // readiness needs warmth AND (shelter OR song) — all-rub is not enough
  const care = Math.max(p.shelter, p.song);
  if (p.warmth >= t.ready && care >= 45) p.phase = 'ready';
  else if (p.warmth >= t.cozy) p.phase = 'cozy';
  else if (p.warmth >= 22) p.phase = 'warming';
  else p.phase = 'cold';
}

/** True when the pod may bloom (child has earned the WOW). */
export function canBloom(p: PodState): boolean {
  return p.phase === 'ready' && p.over === 'none';
}

export function startBloom(p: PodState): boolean {
  if (!canBloom(p)) return false;
  p.phase = 'blooming';
  return true;
}

export function finishHatch(p: PodState): NovaIdentity {
  p.phase = 'hatched';
  return deriveNova(p.memory);
}

/** Ownership via history: HOW the child kept the pod decides Nova's look. */
export function deriveNova(m: HatchMemory): NovaIdentity {
  const total = Math.max(1, m.warmth + m.gentleness * 8 + m.song * 8);
  const warmShare = m.warmth / total;
  const gentleShare = (m.gentleness * 8) / total;
  if (gentleShare >= warmShare && gentleShare >= 0.34) {
    return { tint: 'teal', pattern: 'stripes', chirpBase: 620 };
  }
  if (m.song >= 3 && m.song * 8 / total >= 0.3) {
    return { tint: 'violet', pattern: 'starchirp', chirpBase: 780 };
  }
  void warmShare;
  return { tint: 'sunny', pattern: 'freckles', chirpBase: 700 };
}

/** Next pod temperament for replay (cycles, never repeats immediately). */
export function nextTemperament(current: PodTemperament): PodTemperament {
  const order: PodTemperament[] = ['sleepy', 'hungry', 'singy'];
  return order[(order.indexOf(current) + 1) % order.length];
}

/* ---- mid-play snapshot (jury: interruptions are the norm for kids) ----
   A plain-data snapshot of the live pod, written to the save on phase
   transitions and restored on revisit. No timers, no DOM, fully tested. */

/* ---- stall rescue (rub-only players soft-lock) ----
   Pure decision: has the child been actively rubbing long enough with no
   shelter discovered? Time-based (not warmth-based) so slow gentle rubbers —
   who never reach warmth 30 — are rescued too. Caller enforces max shows +
   cooldowns + born/phase guards. */

export interface StallState {
  /** ms of active rubbing accumulated */
  rubActiveMs: number;
  /** current shelter meter 0..100 */
  shelter: number;
  /** seconds ever held (discovery proxy) */
  gentleness: number;
}

export const STALL_RUB_MS = 40000; // ~40s of rubbing with no hold discovered

export function shouldShowCupHint(s: StallState): boolean {
  if (!s || typeof s !== 'object') return false;
  const rub = typeof s.rubActiveMs === 'number' ? s.rubActiveMs : 0;
  const shelter = typeof s.shelter === 'number' ? s.shelter : 100;
  const gentle = typeof s.gentleness === 'number' ? s.gentleness : 1;
  return rub >= STALL_RUB_MS && shelter < 15 && gentle < 1;
}

export interface PodSnapshot {
  temperament: PodTemperament;
  warmth: number;
  shelter: number;
  song: number;
  memory: HatchMemory;
  at: number;
}

export const SNAPSHOT_TTL_MS = 7 * 24 * 3600 * 1000; // a week; older = start fresh

export function snapshotPod(p: PodState, now = Date.now()): PodSnapshot {
  return {
    temperament: p.temperament,
    warmth: p.warmth,
    shelter: p.shelter,
    song: p.song,
    memory: { ...p.memory },
    at: now,
  };
}

/** Rebuild a live pod from a snapshot. Returns null when stale/invalid. */
export function restorePod(snap: PodSnapshot | null | undefined, now = Date.now()): PodState | null {
  if (!snap || typeof snap !== 'object') return null;
  if (!['sleepy', 'hungry', 'singy'].includes(snap.temperament)) return null;
  if (typeof snap.at !== 'number' || now - snap.at > SNAPSHOT_TTL_MS) return null;
  const p = createPod(snap.temperament, now);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  p.warmth = Math.max(0, Math.min(100, num(snap.warmth)));
  p.shelter = Math.max(0, Math.min(100, num(snap.shelter)));
  p.song = Math.max(0, Math.min(100, num(snap.song)));
  const m = snap.memory ?? { warmth: 0, gentleness: 0, song: 0, overEvents: 0 };
  p.memory = {
    warmth: Math.max(0, num(m.warmth)),
    gentleness: Math.max(0, num(m.gentleness)),
    song: Math.max(0, Math.floor(num(m.song))),
    overEvents: Math.max(0, Math.floor(num(m.overEvents))),
  };
  p.over = 'none';
  p.overUntil = 0;
  updatePhase(p, now);
  return p;
}
