/* Hidden SkillGraph: EMA strength per skill, needs-help detection,
   theme-affinity (personalization) — never shown to the child. */

import type { AttemptEvidence, SaveData, SkillId, SkillState } from './types';

const ALPHA = 0.25;

export function blankSkill(): SkillState {
  return { strength: 0.5, plays: 0, successes: 0, lastPlayedAt: 0, needsHelp: false, contexts: [] };
}

export class SkillGraph {
  constructor(private save: () => SaveData, private persist: () => void) {}

  record(ev: AttemptEvidence): void {
    const d = this.save();
    d.attempts.push({ ...ev, at: Date.now() });
    if (d.attempts.length > 500) d.attempts.splice(0, d.attempts.length - 500);
    for (const id of ev.skillIds) {
      const s: SkillState = d.skills[id] ?? blankSkill();
      const score = ev.success ? 1 : 0;
      const hintPenalty = Math.min(0.4, ev.hintsUsed * 0.1);
      const sample = Math.max(0, Math.min(1, score - (ev.success ? hintPenalty : 0)));
      s.strength = s.plays === 0 ? sample : s.strength + ALPHA * (sample - s.strength);
      s.plays++;
      if (ev.success) s.successes++;
      s.lastPlayedAt = Date.now();
      // cross-context transfer: which activities practiced this skill
      if (!Array.isArray(s.contexts)) s.contexts = [];
      if (!s.contexts.includes(ev.activityId)) {
        s.contexts.push(ev.activityId);
        if (s.contexts.length > 8) s.contexts.splice(0, s.contexts.length - 8);
      }
      // needs help if weak OR repeatedly needing hints
      s.needsHelp = s.strength < 0.45 || (s.plays >= 3 && ev.hintsUsed >= 2 && s.strength < 0.65);
      d.skills[id] = s;
    }
    this.persist();
  }

  strength(id: SkillId): number {
    return this.save().skills[id]?.strength ?? 0.5;
  }

  weakest(ids: SkillId[]): SkillId | null {
    let worst: SkillId | null = null;
    let v = Infinity;
    for (const id of ids) {
      const s = this.strength(id);
      if (s < v) { v = s; worst = id; }
    }
    return worst;
  }

  /** Skills that need repetition (for parent dashboard). */
  needsPractice(): { id: SkillId; strength: number }[] {
    const d = this.save();
    return Object.entries(d.skills)
      .filter(([, s]) => (s as SkillState).needsHelp)
      .map(([id, s]) => ({ id: id as SkillId, strength: (s as SkillState).strength }))
      .sort((a, b) => a.strength - b.strength);
  }

  /** Skills practiced in ≥2 different activities: transfer is happening. */
  transferred(): { id: SkillId; contexts: string[] }[] {
    const d = this.save();
    return Object.entries(d.skills)
      .filter(([, s]) => Array.isArray((s as SkillState).contexts) && (s as SkillState).contexts.length >= 2)
      .map(([id, s]) => ({ id: id as SkillId, contexts: (s as SkillState).contexts }))
      .sort((a, b) => b.contexts.length - a.contexts.length);
  }

  /** Top affinity themes (personalization entry points). */
  topThemes(n = 2): string[] {
    const entries = Object.entries(this.save().spotlight);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, n).map(([k]) => k);
  }
}
