/* Zone ambience routing: which bed (if any) belongs to a screen.
   Pure map — unit-tested, no side effects. Rules:
   - 'world' island, the garden tab, and the forest glade get the dawn-chorus
     bed (birds/island/grove are one living green).
   - The sea bed is bundled + precached but UNWIRED: no beach zone exists yet.
     Wiring it to a wrong zone would be decoration, not design (NOVA 2.0: beach).
   - Night city + star meadow stay silent BY DESIGN: hush, pad, and twinkles
     are composed live in-screen; a birdsong bed would lie about the place.
   - Everything else → null (silence; previous bed fades out).
   SoundBank.ambience(null-handling) lives in main.ts go(). */

import type { ScreenName } from './app';
import type { Ambience } from './sound';

export function ambienceFor(name: ScreenName, param?: string): Ambience | null {
  if (name === 'world') return 'garden';
  if (name === 'explorer' && param === 'garden') return 'garden';
  if (name === 'grove') return 'garden';
  return null;
}
