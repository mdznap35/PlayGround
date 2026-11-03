# CineForge — Project State

**Updated:** 2026-11-03  
**Active implementation branch:** `feat/cineforge-cinematic-media-v2`  
**Latest repository head at this snapshot:** `c1b1bc0a6469c45a6d0cc77b712e36c4d90bd3f6`  
**Latest code/test head:** `26f95b2cd12e225f1f5cb08f307d245b310d37ef`  
**Render service:** `srv-dbl0am942hec73dgt93g` — [live site](https://cineforge-studio-b92r.onrender.com/)  
**Latest Render deploy:** `dep-dbl2ro99dmos739uimqg` — live on `2afe08b`  
**Phase PR:** [#12](https://github.com/mdznap35/PlayGround/pull/12), open Draft, base `feat/cineforge-studio-core`; not merged.

## Product goal
Phone-first, Arabic-first, free-first production studio for short and longer cinematic videos. It must preserve source/rights provenance and clearly distinguish generated footage from supplied images, supplied video and conventional motion graphics.

## Verified baseline

### Phase 0 — foundation
- Browser editor, local draft storage, storyboard preview and JSON job export.
- Pillow + FFmpeg CPU renderer.
- Foundation workflow #3 `41658956511`: success; six tests passed.
- Sample MP4 inspected: 40 seconds, 1920×1080, 24 fps, H.264.
- Arabic RTL shaping checked with Pillow RAQM.

### Phase 1 — cinematic media renderer
- Image-backed scenes using PNG/JPG/JPEG/WEBP.
- Seven camera movements: static, push-in, pull-out, pan left/right/up/down.
- Separate voiceover/music paths and volume controls; legacy `audio_file` compatibility.
- Media path and symlink escape validation.
- FFprobe gate checks codec, dimensions, fps, duration and requested audio.
- Phase 1 workflow #8 `41663752833`: success; 19/19 Python tests passed; integration render checked H.264, 1920×1080, 24 fps and AAC.
- PR #12 remains Draft and has not been merged.

### Story planner workspace
- `story-planner.html`, `story-planner.css`, `story-planner.js`: standalone Arabic-first planning workspace.
- Export contract: `cineforge.story-plan`, schema version 2.
- Fields: audience, goal, premise, seven narrative beats, continuity entries, source verification status and narration pacing.
- Browser autosave is local only; exported JSON is the portable copy.

## Delivered increment — plan import into renderer editor

Files changed on the active branch:
- `apps/cineforge-studio/story-plan-import.js`: validates story-plan v2 and maps beats to renderer-safe scenes.
- `apps/cineforge-studio/tests/story-plan-import.test.cjs`: seven unit tests for schema, duration allocation, malformed input, limits and metadata.
- `apps/cineforge-studio/index.html`: import button and importer script.
- `apps/cineforge-studio/app.js`: imports beats into editable scenes and persists the planning snapshot in local storage and job JSON.
- `apps/cineforge-studio/styles.css`: responsive import control.
- `apps/cineforge-studio/story-planner.html`: aligns the seven-beat planner target with the current one-scene-per-beat import ceiling.
- `apps/cineforge-studio/tests/test_render.py`: verifies planning metadata survives Python renderer validation without changing schema v1.
- `.github/workflows/cineforge-render.yml`: JavaScript syntax checks, Node importer tests, Python renderer tests, MP4 render and FFprobe QA.
- `docs/cineforge/MASTER_ROADMAP_AR.md`: detailed Arabic roadmap, phases, acceptance criteria and free-first rules.
- GitHub Issues #13–#19 track CF-02 through CF-08.

### Import contract and boundaries
- Accepts only `cineforge.story-plan` schema v2 JSON.
- A maximum of 40 beats; each generated renderer scene must be 3–90 seconds.
- The renderer accepts at most 900 seconds total.
- The standalone planner currently has seven default beats; direct one-scene-per-beat import therefore caps at 10.5 minutes. Add more shots in the main editor to build toward the renderer's 15-minute limit.
- Weighted durations are allocated to sum exactly to the imported plan duration, with all-zero weights falling back to equal allocation.
- Continuity entries and source records are kept in a bounded `story_context` metadata object in the job JSON.
- The Python renderer preserves that metadata while keeping `schema_version: 1`.
- No user media or private recordings were added to the public repository.

### Exact-head verification
- Workflow run #18: [success](https://github.com/mdznap35/PlayGround/actions/runs/41693254663), code/test head `26f95b2cd12e225f1f5cb08f307d245b310d37ef`.
- Node importer tests: **7/7 passed**.
- Python renderer tests: **20/20 passed**.
- Main sample job validated and rendered: 40 seconds.
- FFprobe quality gate and artifact upload passed.
- Artifact `cineforge-mp4-18`, ID `13256979984`, about 5.1 MB; expires 2026-11-10.
- The initial CI attempts #13 and #14 failed because a one-scene test fixture requested a duration above the renderer's 90-second per-scene cap. The fixture was corrected, then runs #15–#18 passed.

## Deployment facts
- Render hosts the static UI only; video rendering happens in GitHub Actions.
- Auto-deploy branch: `feat/cineforge-cinematic-media-v2`.
- Latest Render deploy `dep-dbl2daatnucc73frqi80`: `live` on commit `c1b1bc0`.
- Main studio: https://cineforge-studio-b92r.onrender.com/
- Story planner: https://cineforge-studio-b92r.onrender.com/story-planner.html
- A separate browser-based visual/interaction smoke test has not yet been completed in this verification session; Render reports the latest static deployment as live, and CI verifies code syntax and importer logic.

## Remaining work
1. Complete a visual and interaction smoke test on Android: export planner JSON, import it, edit a scene, reload, and verify the exported job retains the story snapshot.
2. Show narrative roles, scene purpose and continuity details directly in scene cards; consider splitting a long narrative beat into multiple shots automatically.
3. Complete browser-level round-trip tests (planner export → editor import → edit → autosave/reload → job export) and a real Android browser smoke test with screenshots. These remain unverified.
3. Build the media bin and source/rights manifest (Issue #14).
4. Add Arabic SRT/VTT editing, audio timing and sound QA (Issue #15).
5. Add multi-track timeline, transitions and overlays (Issue #16).
6. Expand preflight, QA reports and delivery profiles (Issue #17).
7. Evaluate optional free video-generation adapters only after current quota, license, region and account eligibility are verified (Issue #18).
8. Complete phone backup/restore and release checks (Issue #19).

## Free-first constraints
- No paid APIs, paid GPU, paid GitHub runner or paid storage without explicit approval.
- No model weights or bulk media downloads without reporting the expected size and obtaining approval.
- No private footage, personal voice recordings or secrets in this public repository.
- Render static hosting and GitHub Actions have free-tier limits; no unlimited free generation or processing is promised.
- The current renderer composes supplied stills/audio and designed motion graphics; it does not claim to generate photorealistic video from text.
- Active engine inventory: Pillow for image composition; FFmpeg for motion/video/audio assembly; FFprobe for export inspection; GitHub Actions hosted CPU runner for render execution. No third-party generative video/image, TTS or ASR provider is integrated yet.
- The new narration-fit analyzer is a non-blocking heuristic using reference rates of 130 Arabic, 150 English and 140 mixed words/minute. It does not measure an actual recording, and its warnings do not block export.

Authoritative roadmap: [MASTER_ROADMAP_AR.md](./MASTER_ROADMAP_AR.md).

## Latest follow-up change
- Commit `0d6bf2cea659965dd80c5ffb0e2ec077799cf166`: fixed story-plan import so the editor preserves the exact imported runtime instead of silently rounding it to the nearest preset (30/60/90/180/300 seconds). A custom imported duration is now represented as a selectable imported option.
- This change requires the newly triggered exact-head CI run to pass before it is considered verified.
- Workflow #19 [passed](https://github.com/mdznap35/PlayGround/actions/runs/41694033138) for the exact-runtime import fix: JS syntax, importer tests, Python renderer tests, MP4 render, FFprobe inspection and artifact upload all succeeded.
- Per-scene narration-fit analyzer and editor integration were added in commits `2842e14`, `68547f1`, `e94b0b7`, and `8be0553`, with seven Node tests. Workflow #23 is running against the implementation batch: [run #23](https://github.com/mdznap35/PlayGround/actions/runs/41698307092). Do not count this batch as verified until this run passes.
