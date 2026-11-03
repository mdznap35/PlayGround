# CineForge — Project State

Updated: 2026-11-03
Current phase 1 branch: `feat/cineforge-cinematic-media-v2`
Current phase 2 branch: `feat/cineforge-story-planner-v3`
Foundation PR: #11 (Draft); Phase 1 PR: #12 (Draft).

## Final goal
A phone-first studio that converts a production brief into a coherent script, storyboard, continuous visuals, narration, music, generated or supplied media, editing, QA and platform-ready exports. It must distinguish AI-generated footage from still animation and ordinary editing.

## Verified baseline
- Phase 0 foundation workflow run #3: `41658956511` — success.
- Phase 1 implementation commit: `bdcf485491c087f0556b277e7fa5cd706e09f754`.
- Phase 1 workflow run #8: `41663752833` — success on that exact commit.
- Browser JS syntax passed; Python tests: 19/19 passed.
- Integration test rendered still image + synthetic voice + synthetic music and verified H.264 1920×1080, 24 fps and AAC audio with FFprobe.
- Phase 1 artifact `cineforge-mp4-8` ID `13242399847`; sample is 40 seconds, silent by design, H.264 1080p/24.
- Phase 1 Draft PR #12 exists; no merge or deployment.

## Phase 1 — media compositor (verified on its PR head)
- Image assets, seven camera moves, Arabic overlays, independent voice/music tracks and mixing.
- Legacy single `audio_file` retained.
- Path and symlink checks prevent file escape.
- FFprobe validates codec, dimensions, fps, duration and requested audio.
- No real text-to-video provider is connected.

## Phase 2 — story and shot planner (in progress)
Branch: `feat/cineforge-story-planner-v3`
Implement:
- Five-beat story arc (hook, setup, development, turning point, resolution).
- Brief fields: audience, platform, tone.
- Per-shot: narrative role, purpose, subject/action, framing, lighting, screen text, sound cue, transition and continuity note.
- Project continuity bible for subject, place, props and visual language.
- Speech duration estimator at a configurable default of 130 words/minute. It is a planning estimate, not speech recognition.
- Round-trip project metadata that leaves media renderer schema_version 1 untouched.

Phase 2 acceptance:
- Story planner unit tests pass.
- Browser JS syntax and event/state checks pass.
- Existing Python tests and phase 1 render workflow remain green.
- Saved/reloaded JSON preserves story, shot and continuity fields.
- Draft PR #13 remains isolated until reviewed and explicitly approved.

## Free-first constraints
- Render only hosts the static UI; Actions performs CPU render.
- No model weights or large media downloads without estimating size and obtaining approval.
- No paid API, GPU runner or credit purchase without explicit approval.
- The public repository must not contain private user footage, personal voice recordings or secrets.
- A free GPU quota is experimental, not unlimited generation capacity.

## Next
1. Complete Phase 2 and exact-head validation.
2. Independently review the Phase 2 diff and open a Draft PR targeting the Phase 1 branch.
3. Phase 3 asset board/provenance, then Phase 4 voice/subtitles.
4. Research and test a legitimate free generator only after quota, licensing, and account eligibility checks.
