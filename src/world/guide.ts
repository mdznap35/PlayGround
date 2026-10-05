/* First-steps guide (PURE logic): the first 5 minutes.
   Nova points at one place at a time; the world pulses it; completing a step
   is always a real play moment, never a form. State lives in save.onboard. */

import type { SaveData, ZoneId } from '../core/types';

export interface GuideStep {
  id: string;
  target: ZoneId;
  line: string;
}

/** Ordered onboarding. Ids are stable; never reorder. */
export const ONBOARD_STEPS: GuideStep[] = [
  { id: 'meet-lab', target: 'lab', line: 'تعال معي! المس المختبر ولنجرّب أول تجربة!' },
  { id: 'make', target: 'make', line: 'مذهل! الآن اصنع شيئاً بيدك في الورشة!' },
  { id: 'city', target: 'city', line: 'انظر! كل ما تصنعه يكبر مدينتك! المسها!' },
];

/** Activities whose success completes the 'meet-lab' step. */
const LAB_ACTIVITIES = ['float-sink', 'magnet', 'light-shadow'];
/** Activities whose success completes the 'make' step. */
const MAKE_ACTIVITIES = ['bridge-count', 'shapes-tower', 'melody', 'p-bridge', 'p-city', 'p-robot', 'p-film', 'p-space', 'p-garden'];

/** Current guide step, or null when onboarding is finished. */
export function guideStep(d: SaveData): GuideStep | null {
  if (d.onboard.includes('done')) return null;
  return ONBOARD_STEPS.find((s) => !d.onboard.includes(s.id)) ?? null;
}

/**
 * Advance onboarding from a successful activity. Returns newly completed
 * step ids (caller rewards + persists). Pure: mutates the passed SaveData.
 */
export function guideNotifyActivity(d: SaveData, activityId: string): string[] {
  const done: string[] = [];
  if (LAB_ACTIVITIES.includes(activityId) && completeGuide(d, 'meet-lab')) done.push('meet-lab');
  if ((MAKE_ACTIVITIES.includes(activityId) || activityId.startsWith('p-')) && completeGuide(d, 'make')) done.push('make');
  return done;
}

/** Complete one guide step explicitly (drawing, visits). Returns true if new. */
export function completeGuide(d: SaveData, id: string): boolean {
  if (d.onboard.includes('done')) return false;
  if (!d.onboard.includes(id)) { d.onboard.push(id); return true; }
  return false;
}

/** Mark a zone visit (used for the 'city' step). Returns true if newly done. */
export function guideNotifyVisit(d: SaveData, zone: ZoneId): boolean {
  if (zone === 'city' && d.onboard.includes('meet-lab') && d.onboard.includes('make') && !d.onboard.includes('done')) {
    if (!d.onboard.includes('city')) d.onboard.push('city');
    d.onboard.push('done');
    d.world.coins += 10;
    return true;
  }
  return false;
}
