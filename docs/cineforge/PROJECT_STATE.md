# CineForge — Project State

Updated: 2026-11-03
Current implementation branch: `feat/cineforge-cinematic-media-v2`
Foundation branch: `feat/cineforge-studio-core`
Foundation PR: [#11 — Draft](https://github.com/mdznap35/PlayGround/pull/11)
Phase 1 PR: [#12 — Draft](https://github.com/mdznap35/PlayGround/pull/12)

## Goal
Phone-first studio for professional short, long and cinematic videos, free-first, with truthful engine labels and no unapproved downloads or spending.

## Phase 0 — verified foundation
- Foundation head: `7a0c0cf2be7c5d00761facf2894a83de6eb4fafd`.
- Workflow run #3: `41658956511` — success.
- Six foundation tests passed.
- Inspected sample: 40 seconds, 1920×1080, 24 fps H.264; Arabic RTL visually reviewed with Pillow RAQM.
- Original artifact: `13241725525` (temporary 7-day retention).

## Phase 1 — cinematic media renderer
- Implementation head: `bdcf485491c087f0556b277e7fa5cd706e09f754`.
- Exact-head workflow: [run #8](https://github.com/mdznap35/PlayGround/actions/runs/41663752833) — success.
- Browser JavaScript syntax check passed.
- Python tests: **19/19 passed**.
- End-to-end test generated a temporary still, voice track and music track, rendered an MP4, then used FFprobe to verify H.264, 1920×1080, 24 fps, AAC audio and approximately 3 seconds.
- Sample output: 40.0 seconds, 1920×1080, 24 fps, H.264. The sample JSON intentionally requests no audio and is therefore silent.
- Artifact: `cineforge-mp4-8`, ID `13242399847`, includes MP4, `render-report.json` and `ffprobe.json`; temporary 7-day retention.
- Phase 1 Draft PR #12 targets the foundation branch and is not merged.

### Delivered capabilities
- Image-backed scenes using PNG/JPG/JPEG/WEBP assets.
- Seven camera movements: static, push-in, pull-out, pan left/right/up/down.
- Scene shot description, title and narration overlays.
- Separate voiceover/music tracks, independent volume and mixing.
- Backward compatibility with the previous single `audio_file` format.
- Path checks block absolute paths, traversal, unsupported extensions and symlink escapes.
- FFprobe gate checks codec, dimensions, fps, duration and requested audio presence.

### Limits and not yet done
- No real text-to-video provider is connected. This renderer composes supplied stills/audio; it does not create photorealistic moving footage.
- Integration test uses generated temporary assets, not user-provided media. No private personal files are committed.
- Render deployment has not been performed.
- Canva folder exists, but no Canva designs have been created.

## Decisions and safety boundaries
- Render is static interface hosting only; GitHub Actions performs CPU rendering.
- Do not download model weights or large media packs without an estimate and explicit approval.
- Free GPU options are experimental until model, quota, queue, license and account eligibility are verified.
- Paid APIs remain disabled without an explicit budget approval.
- The PlayGround repository is public: do not commit private media, personal voice recordings, secrets or material without redistribution rights.

## Next workstream — Phase 2: story and shot planner
1. Structured narrative: hook, setup, development, turning point and resolution.
2. Shot specification: purpose, subject/action, location, framing, camera, lighting, color, narration, on-screen text, sound cues and transitions.
3. Continuity bible: recurring characters, props, environments, color and camera language.
4. Dialogue timing estimator with overfull/underfull scene warnings.
5. Fact-check fields and source notes for documentary/educational projects.
6. Versioned JSON round-trip with no loss of authored content.
7. Preserve the current renderer contract.

## Phase 2 acceptance
- Round-trip tests preserve all scene/story/continuity fields.
- Script duration estimates reconcile with scene time budgets.
- Continuity notes survive save/reload/export.
- Phase 1 19-test suite remains green.
- New PR remains separate and Draft until reviewed; no merge or deployment without authorization.
