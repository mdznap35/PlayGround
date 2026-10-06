# NOVA 2.0 — World Engine (reusable primitives + what exists)

## Conceptual model (IMPLEMENTED in code today)
World → Zones (14 fixed `ZONE_PLOTS`, stable ids/coords) → Objects
(`PlacedObject`: zone | artifact | deco | ambient; travel target, badge,
dimmed) → Characters/companions (save-driven) → Interactions (tap/drag/pan
via `SceneObj`) → State changes (save writes re-rendered from the single
mapper — persistence IS reactivity here).

## What already works (verified)
- Single source of truth: `worldObjects(save)` — if it's in the save, it's on
  the island. Bridge/robot-companion/garden/films/city-cluster/flags all flow
  through it (browser-verified: island renders, zones navigate).
- Unlocks: `unlockedZones` + museum unlock on first project finish.
- Guide: `onboard[]` state machine advanced ONLY by real successful play.
- Quests: any successful play counts toward matching steps (no dead quests).
- Environment reactions: garden count, cinema marquee, city count badge,
  companion presence — all save-driven, no extra simulation.

## Gaps for 2.0 (PROPOSED, not built)
- Time/state transitions (day/night, growth over visits): no clock in world
  state. Proposal: `world.clock { visits, lastVisit }` + pure
  `worldDerived()` — additive, migration-safe.
- NPC reactions/dialogue trees: `nova:mood` event pattern is the template;
  generalize to `world:react { objectId, kind }` when first NPC ships.
- Narrative state: quests cover linear chains; branching narrative needs a
  story-flag store (quests-like array, new key — migration-trivial).
- Unlock conditions beyond ownership: `requires` on buildings (e.g. needs
  quest X) — data-only addition to `BUILDINGS` + one check in city screen.

## Deliberately NOT built
Simulations (economy/ecology/NPC schedules). The mapper + events carry all
current reactivity with zero tick cost on low-end devices.
