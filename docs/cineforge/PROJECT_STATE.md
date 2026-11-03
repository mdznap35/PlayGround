# CineForge — Project State

**Updated:** 2026-11-03  
**Active implementation branch:** `feat/cineforge-cinematic-media-v2`  
**Latest branch head at last verification:** `90d828d366039f051f53d2c72b8223ed9203e6e1`  
**Render service:** `srv-dbl0am942hec73dgt93g` — live at https://cineforge-studio-b92r.onrender.com/  
**Render deployment:** `dep-dbl0c27l4o3s73c1rj10` — live on commit `90d828d`  
**Phase 1 Draft PR:** [#12](https://github.com/mdznap35/PlayGround/pull/12), base `feat/cineforge-studio-core`; not merged.  
**Foundation Draft PR:** [#11](https://github.com/mdznap35/PlayGround/pull/11); not merged.

## Product goal
Phone-first, Arabic-first, free-first production studio for short and longer cinematic videos. It must preserve source/rights provenance and distinguish generated footage from supplied images, supplied video and conventional motion graphics.

## Current verified baseline

### Phase 0 — foundation
- Browser editor, local draft storage, storyboard preview, JSON job export.
- Pillow + FFmpeg CPU renderer.
- Foundation workflow #3: `41658956511` — success; six tests passed.
- Sample MP4 inspected: 40 seconds, 1920×1080, 24 fps, H.264.
- Arabic RTL shaping was checked with Pillow RAQM.

### Phase 1 — cinematic media renderer
- Image-backed scenes with PNG/JPG/JPEG/WEBP.
- Seven camera moves: static, push-in, pull-out, pan left/right/up/down.
- Separate voiceover/music paths and volume controls, with legacy `audio_file` compatibility.
- Media path and symlink escape validation.
- FFprobe checks codec, aspect dimensions, frame rate, duration and requested audio presence.
- Exact phase-1 workflow run #8 `41663752833`: success; 19/19 Python tests passed; image + synthetic voice + synthetic music end-to-end test passed.
- PR #12 remains Draft and is not merged.

### Story planner workspace
- `story-planner.html`, `story-planner.css`, `story-planner.js` provide a standalone Arabic-first planner.
- Exports `cineforge.story-plan` schema version 2.
- Fields include narrative beats, continuity entries, research-source status and narration timing.
- It saves to current browser local storage; export JSON is the portable copy.
- The prior branch `feat/cineforge-story-planner-v3` contains alternate work and docs but is divergent/behind; it is not the live deployment branch and must not be merged blindly.

## Current implementation increment — story plan import

Files added/changed on the active branch:
- `apps/cineforge-studio/story-plan-import.js` — validates exported story-plan v2 JSON and maps beats to renderer-safe scenes.
- `apps/cineforge-studio/tests/story-plan-import.test.cjs` — Node tests for schema, scene limits, weighted timing, Arabic text, and provenance.
- `apps/cineforge-studio/index.html` — import button and importer script.
- `apps/cineforge-studio/app.js` — imports beats into editable storyboard scenes and persists the planning snapshot.
- `apps/cineforge-studio/styles.css` — responsive import control.
- `.github/workflows/cineforge-render.yml` — adds importer syntax checks and Node unit tests.

**Timing contract:** each imported scene must be 3–90 seconds; total render duration <= 900 seconds; invalid or unallocatable plans are rejected before changing the storyboard. The renderer's original `schema_version: 1` remains unchanged.

**CI run for import increment:** awaiting the workflow triggered by the latest commits; do not mark this increment complete until its exact-head run succeeds and its logs are inspected.

## Deployment facts
- Render hosts the static UI only. It does not render MP4.
- Service auto-deploys from `feat/cineforge-cinematic-media-v2`.
- Latest verified Render deploy `dep-dbl0c27l4o3s73c1rj10`: `live`.
- GitHub Actions run #11 `41670364586` passed on commit `d153c8c` before the story-plan import files were added. It verifies the earlier planner page and renderer baseline, **not** the new importer.
- New code will trigger another workflow due the updated path filters.

## Free-first constraints
- No paid APIs, paid GPU, paid GitHub runner or paid storage without explicit approval.
- No model weights or bulk media downloads without a size estimate and approval.
- Do not store private footage, personal voice recordings or secret keys in this public repository.
- Render Static Site is only the website host; Actions has usage quotas and temporary artifact retention.
- A "free AI video provider" must be checked against official, current quota, license, region and account eligibility before activation.

## Next actions
1. Verify exact-head CI for story-plan import and fix every failure.
2. Run independent review of the import contract, especially duration edge cases and preservation of the old renderer schema.
3. Add the asset library and rights/provenance manifest.
4. Add Arabic SRT/VTT authoring, audio timing and sound QA.
5. Add a multi-track composition model and transitions without breaking old job JSON.
6. Add export QA profiles, reproducible render metadata and phone-first backup/restore.
7. Evaluate an optional free AI provider only after quota and license evidence; otherwise keep it disabled.

Authoritative roadmap: [MASTER_ROADMAP_AR.md](./MASTER_ROADMAP_AR.md).
