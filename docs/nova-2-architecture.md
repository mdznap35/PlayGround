# NOVA 2.0 — Architecture (target + current deltas)

## Layer map (all IMPLEMENTED unless noted)
- **Shell** (`main.ts`): route table, `app.go()` error boundary, gesture unlock
  + bank prime, ambience routing hook, purse live-update. No framework.
- **Core** (`core/`): save (v2, backup slot), skills (EMA+contexts), adaptive
  (`decide()` + hesitation/self-correction), projects (steps/gifts/reflection
  hook PROPOSED), content (registries + pure validator), audio (synth + bank
  hook), voice (backend interface), ambience (pure router), blobstore (dexie,
  UNWIRED to screens), analytics (memory-only), events (typed bus).
- **Engine** (`engine/`): WorldScene (layers/parallax/input/loop), Camera,
  Particles (capped), art (vector), feedback (spotlight/breathe). Renderer
  boundary = `SceneObj` + `Layer` interfaces: a future renderer re-implements
  these painters without touching screens (PROPOSED, not built).
- **World** (`world/`): `worldObjects()` pure save→island mapper, guide
  onboarding state machine, ZONE_PLOTS (fixed ids).
- **Services** (`services/`): NoopAI default + gateway scaffold (no auth
  header by design), world-data (timeout→fixture), voice-pack (line-addressed
  + fallback). All optional, all offline-safe.
- **UI** (`ui/`): helpers, NovaGuide (mood controller + `nova:mood` events),
  toasts.

## Dependency boundaries (enforced by gates + convention)
- Screens may import core/engine/ui/world/services. Core may import ONLY
  types/events (no screen imports; dynamic `import()` for guide/content kept
  lazy to avoid cycles — verified, no cycle).
- `howler`/`dexie` load lazily or not at all; neither is in the boot path.
- Adding a dependency requires: docs row, lazy-or-tree-shaken proof, test.

## What changed in the autonomous run (all reversible, all tested)
1. `AudioManager.bank` hook + `SoundBank.tryPlay/prime` — files play, synth
   fallback preserved, no double-play (verified in browser).
2. `AttemptEvidence.strategyChanged/difficulty` (optional) + hesitation and
   self-correction signals in `decide()` (transparent rules, precedence noted).
3. `validateRegistries()` pure extraction + zone/building/step/label/collision
   checks (found + resolved 1 real collision: shop activity vs building).
4. `MoodController` + `nova:mood` events on quest/project finish + 2 CSS hooks.
5. `scripts/quality-gates.mjs` + `npm run gates` (5 gate groups, all green).
6. `docs/voice-packs.md` (was referenced, missing).

## Explicitly NOT changed
Renderer, save schema (v2 untouched), skill formulas, project flow, screens'
 visuals, content volume, backend/AI providers.
