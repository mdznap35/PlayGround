# NOVA 2.0 — Content Architecture (data-driven, validated)

## Registries (`src/core/content.ts` — IMPLEMENTED)
Activities (20) · quests (10) · projects (6) · stories (2, graph-checked) ·
destinations (6) · values (6, sourced) · buildings (12) · EN words (8) ·
zones (14). Stable string ids; "new content = new entries, never engine
changes" holds in practice (screens render generically from registries).

## Validation (`validateRegistries`, IMPLEMENTED + tested)
Duplicates (activities/quests/projects/stories/values/destinations, buildings
separately), voice presence (activities + project steps), quest activity links
+ step zones, project rewardBuilding ∈ buildings, step id uniqueness, empty
companion gifts, story start/next/label integrity + node key/id match, value
sources. One real collision found and resolved by scoping (shop activity vs
building documented as separate namespaces).

## Rules for authors (enforced by tests + gates)
- Every activity needs: unique id, zone, emoji, voice line, ≥1 skill.
- Every quest step needs: valid zone + (if linked) valid activity id.
- Every project needs: ≥1 step, unique step ids, voice per step, valid
  rewardBuilding; gifts must be non-empty.
- Religious lines need `source`; AI must never invent these (hard rule, tested).

## PROPOSED (not built)
- `ProjectDef.reflection?: { prompt: string; skills: SkillId[] }` — a
  tell-about-your-creation step feeding language skills + museum captions.
  Engine: one optional renderer branch + `report()` call. Awaiting product
  decision on where reflection lives in the child flow.
- What-if simulations as data (`inputs → rules → observation` descriptors)
  once two activities share mechanics (no duplication yet — premature now).

## DEFERRED
External CMS/studio, versioned content packs, over-the-air content updates
(SW precache model must be extended first).
