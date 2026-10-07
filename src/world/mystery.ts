/* The Mystery Crate — vertical slice mission state (PURE logic, no DOM).
   The water room hides a dripping crate. Open it → a sleepy seed appears.
   Every correct prediction waters the seed. When the tank work is done, the
   child picks one gift (sun / leaf / star) and the seed blooms — into a real
   island garden plant + museum artifact. Mission state is DERIVED from the
   museum (no save-schema change): seed present = growing, bloom present = done.
   Replay: new objects each visit via adaptive count; the bloom is one of 3. */

import type { MuseumItem, SaveData } from '../core/types';

export type MysteryPhase = 'find' | 'grow' | 'done';
export type BloomGift = 'sun' | 'leaf' | 'star';

export const SEED_KIND = 'mystery-seed';
export const BLOOM_KIND = 'mystery-bloom';

export const BLOOM_ART: Record<BloomGift, { emoji: string; title: string; petal: string }> = {
  sun: { emoji: '🌻', title: 'زهرة الشمس', petal: '#ffc94d' },
  leaf: { emoji: '🌷', title: 'زهرة الورقة', petal: '#ff8fb0' },
  star: { emoji: '🌟', title: 'زهرة النجمة', petal: '#b3a8ff' },
};

function hasKind(museum: Pick<MuseumItem, 'kind'>[], kind: string): boolean {
  return museum.some((m) => m.kind === kind);
}

/** Where is the mission? Pure: derived from museum contents only.
 * (The gift-choice moment itself is live session state, not saved.) */
export function mysteryPhase(museum: Pick<MuseumItem, 'kind'>[]): MysteryPhase {
  if (hasKind(museum, BLOOM_KIND)) return 'done';
  if (hasKind(museum, SEED_KIND)) return 'grow';
  return 'find';
}

/**
 * Apply the bloom reward: island garden grows + museum keeps the flower.
 * Idempotent: a second call with a bloom already present does nothing.
 * Returns true when the reward was actually granted.
 */
export function applyBloom(d: SaveData, gift: BloomGift): boolean {
  if (hasKind(d.museum, BLOOM_KIND)) return false;
  const art = BLOOM_ART[gift] ?? BLOOM_ART.sun;
  d.world.garden.plants += 1;
  d.museum.push({
    id: `m-${Date.now()}`,
    kind: BLOOM_KIND,
    title: art.title,
    emoji: art.emoji,
    description: 'كبرت بسبب تجاربي في الماء!',
    createdAt: Date.now(),
  });
  return true;
}

/** Opening the crate plants the sleepy seed. Idempotent. */
export function plantSeed(d: SaveData): boolean {
  if (hasKind(d.museum, SEED_KIND)) return false;
  d.museum.push({
    id: `m-${Date.now()}`,
    kind: SEED_KIND,
    title: 'بذرة نائمة',
    emoji: '🌰',
    description: 'من الصندوق العجيب — تحتاج تجارب!',
    createdAt: Date.now(),
  });
  return true;
}
