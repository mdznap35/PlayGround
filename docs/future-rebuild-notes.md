# Future rebuild notes (NOVA 2.0 candidates — evaluate, don't assume)

## Renderer
- Current custom canvas engine is adequate and measured. Migrate to **PixiJS
  8.22.0** (MIT, hash + version in `third-party-resources.md`) ONLY when a scene
  genuinely needs WebGL (large sprite counts, filters, globe). Migration shape:
  keep `SceneObj`/camera/feedback interfaces, re-implement painters as Pixi
  containers behind the same API. Never rewrite screens for the migration.
- GSAP is for DOM/UI tweens only. Keep it out of the canvas hot loop.

## Audio/voice
- `SoundBank` accepts curated SFX packs (Kenney CC0 manual step in
  `asset-pipeline.md`). Next: sprite-map + ducking policy.
- Voice packs: curate line lists → render via ElevenLabs (production machine,
  paid) → commit ogg + manifest → `RecordedFileBackend`. Arabic first, then
  English. Missing lines always fall back to system speech.

## Data/backend (only with demonstrated need)
- Supabase/Cloudflare: no current need. If parent sync ever ships: gateway
  holds ALL secrets; client keeps using `config.ts` public values; COPPA-style
  minimization (no child identity, no behavioral ads, aggregated analytics).
- Sentry: only after a written child-privacy review. Never ship raw telemetry.

## Mobile packaging
- Capacitor 8.5.2 evaluated (version recorded). Native shell gives installable
  app + better audio focus handling, but adds store/permission overhead.
  Decision point: after PWA installability is measured with real parents.

## Learning systems
- SkillGraph already records attempts/errors/hints/latency/contexts (see
  `core/skills.ts` + `core/types.ts`). Next: strategy-change + confidence
  signals, transfer detection across zones, parent-safe summaries via
  `parentSummary` op (NoopAI text until a gateway exists).

## What NOT to do
- No framework migration (React/etc.) without a measured bottleneck.
- No Mapbox/tiles: procedural globe stays the default (license + offline).
- No free-form AI chat for children (safety design required first).
- No asset dumps: every pack needs curation + license row + size budget.
