/* Zone ambience routing: which bed (if any) belongs to a screen.
   Pure map — unit-tested, no side effects. Rules:
   - 'world' island and the garden tab get the dawn-chorus bed (birds/island).
   - The sea bed is bundled + precached but UNWIRED: no beach zone exists yet.
     Wiring it to a wrong zone would be decoration, not design (NOVA 2.0: beach).
   - Everything else → null (silence; previous bed fades out).
   SoundBank.ambience(null-handling) lives in main.ts go(). */

import type { ScreenName } from './app';
import type { Ambience } from './sound';

export function ambienceFor(name: ScreenName, param?: string): Ambience | null {
  if (name === 'world') return 'garden';
  if (name === 'explorer' && param === 'garden') return 'garden';
  return null;
}
