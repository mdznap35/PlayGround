/* World mapper (PURE): SaveData → placed island objects.
   Single source of truth: if it is in the save, it is visible in the world.
   Coordinates are normalized 0..100 (x) × 0..62 (y); renderer scales to canvas. */

import type { SaveData, ZoneId } from '../core/types';

export interface PlacedObject {
  id: string;
  kind: 'zone' | 'artifact' | 'deco' | 'ambient';
  zone: ZoneId | null;      // travel target for kind 'zone'
  emoji: string;
  x: number; y: number;     // island coords
  size: number;             // px at 640px canvas width (renderer scales)
  label: string;            // spoken/shown name (Arabic, short)
  badge?: string;           // small overlay, e.g. count or '!'
  dimmed?: boolean;         // not yet earned
}

/** Fixed island slots: every zone is a real place. Never reorder existing ids. */
export const ZONE_PLOTS: { zone: ZoneId; emoji: string; label: string; x: number; y: number }[] = [
  { zone: 'home', emoji: '🏠', label: 'بيتي', x: 50, y: 44 },
  { zone: 'lab', emoji: '🔬', label: 'المختبر', x: 22, y: 30 },
  { zone: 'make', emoji: '🎨', label: 'الورشة', x: 78, y: 30 },
  { zone: 'robot', emoji: '🤖', label: 'الروبوت', x: 86, y: 44 },
  { zone: 'body', emoji: '🏥', label: 'جسمي', x: 36, y: 22 },
  { zone: 'mind', emoji: '📚', label: 'العقل', x: 64, y: 22 },
  { zone: 'explorer', emoji: '✈️', label: 'بوابة العالم', x: 12, y: 44 },
  { zone: 'space', emoji: '🚀', label: 'الفضاء', x: 90, y: 14 },
  { zone: 'city', emoji: '🏙️', label: 'مدينتي', x: 50, y: 14 },
  { zone: 'stories', emoji: '🌳', label: 'القصص', x: 30, y: 47 },
  { zone: 'music', emoji: '🎵', label: 'الموسيقى', x: 70, y: 47 },
  { zone: 'impossible', emoji: '🌀', label: 'المستحيل', x: 8, y: 22 },
  { zone: 'values', emoji: '🕌', label: 'نور', x: 50, y: 53 },
  { zone: 'museum', emoji: '🏛️', label: 'متحفي', x: 88, y: 52 },
];

export function worldObjects(d: SaveData): PlacedObject[] {
  const objs: PlacedObject[] = [];
  const has = (b: string) => d.world.buildings.includes(b);

  // zone places (always visible; city content grows with ownership)
  for (const p of ZONE_PLOTS) {
    const extra = p.zone === 'city' && d.world.buildings.length > 1
      ? ` ${d.world.buildings.length}` : '';
    const badge = p.zone === 'museum' && d.museum.length ? `${d.museum.length}` : undefined;
    objs.push({
      id: `zone-${p.zone}`, kind: 'zone', zone: p.zone,
      emoji: p.emoji, x: p.x, y: p.y, size: p.zone === 'home' ? 52 : 46,
      label: p.label + extra, badge,
    });
  }

  // bridge artifact over the river (earned via p-bridge or city purchase).
  // No river deco: the painted river is part of the island itself.
  if (has('bridge')) {
    objs.push({ id: 'bridge', kind: 'artifact', zone: null, emoji: '🌉', x: 50, y: 36, size: 54, label: 'جسري!' });
  }

  // robot companion wanders by the workshop (earned via p-robot)
  if (d.world.companions.includes('🤖')) {
    objs.push({ id: 'comp-robot', kind: 'artifact', zone: 'robot', emoji: '🤖', x: 70, y: 38, size: 34, label: 'روبوتي!' });
  }

  // garden grows with plants (earned via garden activity / p-garden)
  const plants = Math.min(6, d.world.garden.plants);
  for (let i = 0; i < plants; i++) {
    objs.push({
      id: `plant-${i}`, kind: 'artifact', zone: 'explorer',
      emoji: i % 2 ? '🌻' : '🌿', x: 16 + (i % 3) * 6, y: 51 + Math.floor(i / 3) * 5,
      size: 26, label: '',
    });
  }
  for (const a of d.world.garden.animals.slice(0, 3)) {
    objs.push({ id: `pet-${a}`, kind: 'artifact', zone: 'explorer', emoji: a, x: 24, y: 53, size: 26, label: '' });
  }

  // cinema marquee lights up when the child has a film (kept clear of museum)
  if (d.world.films.length > 0) {
    objs.push({ id: 'cinema', kind: 'artifact', zone: 'museum', emoji: '🎬', x: 70, y: 55, size: 30, label: d.world.films[d.world.films.length - 1].title });
  }

  // city skyline mini-cluster: owned buildings beyond home appear as tiny houses
  const extra = d.world.buildings.filter((b) => b !== 'home').slice(0, 8);
  const mini: Record<string, string> = {
    school: '🏫', lab: '🔬', workshop: '🔨', shop: '🏪', hospital: '🏥', park: '🌳',
    station: '🚉', bridge: '🌉', cinema: '🎭', spacestation: '🛰️', mosque: '🕌',
  };
  extra.forEach((b, i) => {
    objs.push({
      id: `city-${b}`, kind: 'artifact', zone: 'city',
      emoji: mini[b] ?? '🏠', x: 40 + (i % 4) * 6.5, y: 8.5 + Math.floor(i / 4) * 5,
      size: 22, label: '',
    });
  });

  // passport flags at the gate
  d.passport.slice(0, 6).forEach((_, i) => {
    objs.push({ id: `flag-${i}`, kind: 'deco', zone: null, emoji: '🚩', x: 6 + i * 3, y: 49, size: 18, label: '' });
  });

  return objs;
}

/** Objects sorted back-to-front for depth (painter's algorithm). */
export function depthSorted(objs: PlacedObject[]): PlacedObject[] {
  return [...objs].sort((a, b) => a.y - b.y);
}
