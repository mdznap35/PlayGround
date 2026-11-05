# CineForge — Project State

**Updated:** 2026-11-03  
**Active implementation branch:** `feat/cineforge-cinematic-media-v2`  
**Latest repository head at this snapshot:** `6152f2831a819edb7c940f56e115aba08a52188a`  
**Latest code/test head:** `8be0553d3d7d6a853e7e3893dfd2830002f5c1a5`  
**Render service:** `srv-dbl0am942hec73dgt93g` — [live site](https://cineforge-studio-b92r.onrender.com/)  
**Latest Render deploy before this documentation refresh:** `dep-dbl2ugl9el5s73f93bgg` — live on `0b625c4`; newer documentation commits are triggering automatic static redeploys  
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
- Node tests: **14/14 passed** (7 story-plan importer + 7 narration-fit).
- Python renderer tests: **20/20 passed**.
- Main sample job validated and rendered: 40 seconds.
- FFprobe quality gate and artifact upload passed.
- Artifact `cineforge-mp4-18`, ID `13256979984`, about 5.1 MB; expires 2026-11-10.
- Latest artifact `cineforge-mp4-23`, ID `13262327771`, 5,135,987 bytes; SHA-256 `384af399b623e137c13c90a587f637ed58361b4fbeda202fce1868a97680f546`; expires 2026-11-10.
- The initial CI attempts #13 and #14 failed because a one-scene test fixture requested a duration above the renderer's 90-second per-scene cap. The fixture was corrected, then runs #15–#18 passed.

## Deployment facts
- Render hosts the static UI only; video rendering happens in GitHub Actions.
- Auto-deploy branch: `feat/cineforge-cinematic-media-v2`.
- Latest Render deploy `dep-dbl2se4s728c739dnsb0`: `live` on commit `6304b8091fa1b1d4d73ea86cacea5ff9c6507257`.
- Main studio: https://cineforge-studio-b92r.onrender.com/
- Story planner: https://cineforge-studio-b92r.onrender.com/story-planner.html
- A separate browser-based visual/interaction smoke test has not yet been completed in this verification session; Render deployment state confirms static hosting only, and CI verifies code syntax, unit tests and renderer output.

## Remaining work
1. Complete browser-level round-trip verification (planner export → editor import → edit → autosave/reload → job export) and a visual Android browser smoke test with screenshots. These remain unverified.
2. Show narrative roles, scene purpose and continuity details directly in scene cards; consider splitting a long narrative beat into multiple shots.
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
- Open-source integration evaluation is documented in `docs/cineforge/ENGINE_EVALUATION_AR.md`: Whisper.cpp is the first ASR candidate (tiny 75 MiB / base 142 MiB); Piper is a possible Arabic TTS candidate requiring GPL and voice-license review; ComfyUI is deferred until a genuine GPU/resource and licensing path exists. None is installed or downloaded.

Authoritative roadmap: [MASTER_ROADMAP_AR.md](./MASTER_ROADMAP_AR.md).

## Latest follow-up change
- Commit `0d6bf2cea659965dd80c5ffb0e2ec077799cf166`: fixed story-plan import so the editor preserves the exact imported runtime instead of silently rounding it to the nearest preset (30/60/90/180/300 seconds). A custom imported duration is now represented as a selectable imported option.
- This exact-runtime change is verified by workflow #19 success; it no longer has a pending verification gate.
- Workflow #19 [passed](https://github.com/mdznap35/PlayGround/actions/runs/41694033138) for the exact-runtime import fix: JS syntax, importer tests, Python renderer tests, MP4 render, FFprobe inspection and artifact upload all succeeded.
- Per-scene narration-fit analyzer and editor integration were added in commits `2842e14`, `68547f1`, `e94b0b7`, and `8be0553`, with seven dedicated Node tests.
- Workflow #23 [passed](https://github.com/mdznap35/PlayGround/actions/runs/41698307092): JavaScript syntax, all 14 Node tests, all 20 Python tests, sample MP4 render, FFprobe inspection and artifact upload succeeded.
- The engine evaluation document was added in commit `0b625c4` and linked from the README and master roadmap. The README/roadmap updates are documentation-only. Render auto-deploys on every commit; current deploy status must be checked independently. A live static deploy never substitutes for the Android interaction smoke test.
- The next increment is browser round-trip coverage and direct scene display of narrative role/purpose/continuity. The Android smoke test still requires a real device/browser interaction.


## Free-stack architecture research — 2026-11-04
- Added [FREE_STACK_BLUEPRINT_AR.md](./FREE_STACK_BLUEPRINT_AR.md), a detailed Arabic architecture and staged implementation plan covering video/image/audio engines, free GPU session options, storage, adapter contracts, licensing, cost controls and acceptance criteria.
- First real video-generation proof-of-concept is tracked in [Issue #20](https://github.com/mdznap35/PlayGround/issues/20): CogVideoX-2B on a user-launched free cloud GPU session, subject to runtime hardware/quota checks.
- **No model weights have been downloaded. No AI video/image/TTS/ASR provider has been installed or connected.** The project still runs its existing Pillow + FFmpeg + FFprobe CPU pipeline.
- GPU services are temporary and quota-bound; no unlimited or always-on free generation is promised. Render remains the static UI host. Proposed Cloudflare D1/R2/Workers storage is research only and is not configured.
- Next engineering priorities: finish story-planner/editor round-trip and visible scene continuity; build Media Bin with source/license provenance; then execute the isolated GPU proof-of-concept only after presenting exact download sizes and receiving approval.

- The expanded blueprint now also records Pyramid Flow miniFLUX (Apache-2.0 checkpoint; BF16 compatibility caveat), Mochi 1 (Apache-2.0 but high VRAM demand), Stable Video Diffusion (self-hosted path only after hosted API deprecation), FLUX.1-schnell, rembg, Real-ESRGAN, Stable Audio Open Small, and the non-commercial restriction on MusicGen weights. See the blueprint for links and qualification notes.


## Cloud-first open-model research — 2026-11-04
- Added [CLOUD_PRODUCTION_MASTERPLAN_AR.md](./CLOUD_PRODUCTION_MASTERPLAN_AR.md), a dedicated expanded plan for open video/image/audio engines, free cloud GPU sessions, ComfyUI workflows, Cloudflare D1/R2/Workers, mobile-first orchestration, and staged acceptance gates.
- Fresh official-source checks: Kaggle documents free P100 GPU access and a weekly quota around 30 hours subject to availability; Colab Free offers variable, non-guaranteed compute (sessions may reach 12 hours); Hugging Face ZeroGPU free-account quota is 5 GPU minutes/day. None is a permanent GPU server.
- CogVideoX-2B remains the first POC candidate, but official memory figures vary by Diffusers version, precision, resolution and optimization. A newer Diffusers table lists 12.5GB FP16 / 7.8GB INT8; low-memory figures are not guarantees on every GPU. P100 architecture compatibility must be preflighted before any weight download.
- Wan 2.2 TI2V-5B is a higher-quality candidate with an official ~24GB VRAM path; LTX-2.5 officially requires 32GB+ VRAM, 32GB RAM and 100GB storage. LongCat-Video is retained as a high-resource candidate; HunyuanVideo 1.5 is not selected due to the geographic restrictions in its published license.
- Added ACE-Step 1.5 and Stable Audio 3 Small as music/SFX candidates, plus refreshed Whisper.cpp/Piper notes. All remain research candidates until installed and tested.
- No new model weights were downloaded; no GPU notebook, ComfyUI provider, Cloudflare Worker, D1 or R2 bucket was deployed. Existing runtime remains Pillow + FFmpeg + FFprobe on GitHub Actions CPU, with Render serving the static UI.
- Next: update Issue #20 with GPU compatibility caveats; finish the story/editor round-trip and Media Bin; then run a cloud GPU preflight before approving a specific model download.


## GPU Fleet Strategy — 2026-11-04

- Added `docs/cineforge/GPU_FLEET_STRATEGY_AR.md`: revised provider strategy, policy boundaries, model/hardware compatibility gates, quota accounting, benchmark protocol, checkpointing architecture and staged implementation plan.
- Added `apps/cineforge-studio/gpu_preflight.py`: read-only hardware preflight. It records OS/Python, RAM, free disk, NVIDIA GPU/VRAM/driver, optional PyTorch/CUDA/compute capability/BF16 and safety flags. It does not install packages, use the network, read environment secrets, start workers or download weights.
- Added `apps/cineforge-studio/tests/test_gpu_preflight.py`: four unit tests covering report structure, missing NVIDIA tooling, separate multi-GPU reporting and JSON output.
- Commits: strategy doc `(see branch history)`; preflight `88d2af0d8ea105290c1864a277382dd33dc39ba1`; tests `2416ac35eabea5d0b77b9aaacc7be1f2fa8bf76c`.
- Local verification reported four unit tests passing. GitHub Actions status for the latest test commit has not yet returned a workflow run through the available PR-run endpoint; do not claim CI passed.
- No GPU provider has been connected or run. No model weights downloaded. No paid resources activated. No PR merge.


## Media Bin + portable project package increment — 2026-11-04

- Added apps/cineforge-studio/media-bin.js: IndexedDB-backed local asset library with image/audio/video type detection, SHA-256 fingerprints when Web Crypto is available, source/license/notes metadata, per-file/library/count limits, safe renderer-relative asset paths, and a dependency-free ZIP32 writer.
- Integrated the Media Bin into the Arabic browser editor: local file ingestion, item listing, bounded image previews, image assignment to the selected scene, audio assignment to voiceover/music, and protection against deleting assets currently referenced by the project.
- Added full project ZIP export: renderer job JSON, media files, a provenance manifest, and extraction instructions. Package output preserves apps/cineforge-studio/jobs/ structure and uses renderer-relative assets/, audio/, and video/ paths. The sidecar provenance manifest is written under apps/cineforge-studio/media-manifests/ so the render workflow cannot select it as a job.
- The ZIP exporter refuses to produce an incomplete package when a job references files not present in the local Media Bin. Current video files are catalogued and packaged but are not yet consumed by the CPU renderer.
- Limits currently enforced: 128 MiB per file; 512 MiB total browser library; 500 assets; 160 MiB per exported ZIP. IndexedDB quota varies by browser/device.
- Added Node tests for file classification, safe paths, path traversal rejection, CRC32, ZIP32 structure, duplicate names and archive size limits. CI now syntax-checks media-bin.js.
- The Media Bin is local browser storage, not cloud synchronization. No R2/D1/Worker deployed, no AI model weights downloaded, no GPU provider connected, no paid resources activated.
- Verification status for this increment must be taken from the exact-head GitHub Actions run; a successful ZIP unit test does not replace browser/Android persistence testing.



- Follow-up hardening: the ZIP sidecar manifest is outside the jobs folder, and the render workflow now selects only JSON documents with renderer schema_version 1 and a scenes array. Manual workflow dispatch also validates the selected job structure. Added a renderer test proving project/media provenance metadata survives validation without changing renderer schema version 1.


## Project engine v2 + multi-track editor — 2026-11-04

- Added apps/cineforge-studio/project-engine.js: canonical cineforge.project@2 document, stable project identity/revisions, legacy-editor-state migration, scene normalization, and a multi-track model (picture, voiceover, music) while leaving renderer job schema v1 unchanged.
- Added timeline editing primitives: frame snapping, clip move, start/end trim with source-offset preservation, split with source-range preservation, clip removal, structural validation and a renderer-v1 compatibility gate for contiguous image clips and single aligned audio sources.
- Added apps/cineforge-studio/project-storage.js: IndexedDB project storage with localStorage fallback, autosaved revision checkpoints, and a bounded 12-snapshot recovery history per project.
- Integrated autosave/load/migration into the editor. Added complete .cineforge.json export, one-click recovery of the latest previous snapshot, and inclusion of the full editable project document in ZIP packages.
- Added a visible picture/voiceover/music timeline. Picture clips can be selected and reordered by drag-and-drop; scene card controls remain available as a touch-friendly fallback. Audio lanes visualize linked files and clearly disclose the current renderer's one-file-per-lane limitation.
- Added dedicated Node tests for project migration, revisions, timeline timing, collision rejection, snapping, trim/split/remove behavior, renderer compatibility and storage fallback/recovery. CI syntax-checks both new modules.
- Compatibility boundary: timeline project documents now describe richer editing structure, but the deployed CPU renderer still renders the sequential scene array and the current single voiceover/music source fields. Arbitrary clip mixing, transitions, subtitles and true video-clip rendering are not claimed.
- Browser IndexedDB, mobile drag gestures, project reload after browser restart, Render's exact deployed revision, and Android device behavior still require direct smoke testing.


## Project engine compatibility correction — 2026-11-04

- The first exact-head CI attempt on `d89b6254a7a45694f1645d5d075e329516960e29` exposed one migration regression: old local editor drafts did not forward `selectedScene` and `storyPlan` into project v2. This is being corrected and guarded by the migration test; that failed run is not counted as a successful verification.
- Project import from `.cineforge.json` now validates renderer compatibility before opening, so mismatched clip order/duration and unsupported timing arrangements are rejected instead of silently discarded.
- Renderer compatibility checks confirm that each image clip maps to the corresponding scene in the same order and duration. Project validation also checks stored timeline duration against the latest clip endpoint.
- The first-round CI test failure is retained in the evidence history; only the next exact-head run can establish a passing state for this correction.



## Recovery and renderer-gate hardening — 2026-11-04

- Snapshot restoration now creates a new monotonically increasing project revision above the current saved head; it does not move the revision counter backwards. Re-importing a project with the same project ID follows the same rule.
- Renderer compatibility now rejects non-empty subtitle/overlay lanes, duplicate audio lanes, mismatched audio sources or timing, and mismatched music volume. This prevents the v1 renderer adapter from silently discarding unsupported track edits.


## Timeline transport and review surface — 2026-11-05

- Added a frame-addressable playhead and sequenced storyboard preview transport (play/pause, start/end, single-frame and one-second stepping).
- Added direct seeking from the ruler and empty video-lane areas, synchronized active-scene highlighting, a time scrubber, and horizontal zoom for narrow/mobile screens. The playhead auto-follows within the scrolled viewport, and playback pauses when the document is hidden.
- Added keyboard controls and focus-aware shortcut handling; text-entry controls are excluded so normal editing keystrokes are not intercepted.
- Added a dependency-free timeline math module with boundary, clamp, progress, frame conversion and ruler interval tests.
- This is a storyboard/timeline navigation preview, not a rendered video player. It does not enable unsupported trim/split/multi-clip output in renderer v1.


## Narrative intent and continuity handoff — 2026-11-05

- Extended story-planner beats with explicit narrative role, purpose and continuity note fields. Defaults are supplied for the seven standard narrative stages, while every field remains editable.
- The story-plan importer validates and bounds these fields, maps them onto individual renderer-workspace scenes, and retains the complete planning snapshot.
- Project engine v2 now normalizes and preserves per-scene narrative metadata. The scene editor exposes role selection, purpose and continuity note fields; renderer job JSON includes the metadata without changing `schema_version: 1`.
- Added importer bounds/default tests, project save/reload metadata tests, and an end-to-end fixture covering planner export → importer → project v2 save/reload → scene metadata projection, while verifying continuity-bible and source records remain intact.
- This metadata does not itself guarantee visual continuity or alter rendered pixels; it is structured production guidance. Browser/Android smoke testing remains a separate acceptance gate.
