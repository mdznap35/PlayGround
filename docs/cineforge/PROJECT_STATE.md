# CineForge — Project State

**Updated:** 2026-11-05  
**Active implementation branch:** `feat/cineforge-cinematic-media-v2`  
**Latest verified implementation/test head:** `8ff93b6d6b6799e34b035a260390dff24d785807` — exact-head CI passed (67 Node tests, 36 Python tests, subtitle pixel-diff, SHA-256 MP4 QA and advisory black/freeze/silence analysis).  
**Render service:** `srv-dbl0am942hec73dgt93g` — [live site](https://cineforge-studio-b92r.onrender.com/)  
**Verified Render deploy at this implementation head:** `dep-dbm8n5m7bikc73enn4r0` — Live on `8ff93b6`.  
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
- Render hosts the static UI only; actual video rendering and FFprobe QA run in GitHub Actions.
- Auto-deploy branch: `feat/cineforge-cinematic-media-v2`.
- Verified Render deploy at implementation head `8ff93b6`: `dep-dbm8n5m7bikc73enn4r0`, status `live`.
- Main studio: https://cineforge-studio-b92r.onrender.com/
- Story planner: https://cineforge-studio-b92r.onrender.com/story-planner.html
- The current page now includes the timed-caption panel and loads `captions.js` before `app.js`. A Node contract test checks all literal `$("…")` IDs used by `app.js` against the HTML.
- The Node contract is not a substitute for a real browser interaction test. Android touch, file picker, IndexedDB persistence/reload and visual RTL inspection still require direct smoke testing.

## Remaining work
1. Complete real browser-level round-trip verification (planner export → editor import → edit → autosave/reload → job export) and Android visual/touch smoke tests. The HTML/DOM contract is now tested automatically, but this does not prove interactive browser behavior.
2. Finish CF-03 acceptance: validate dimensions/duration and rights completeness, support reusable asset links as needed, show missing/unknown-rights preflight warnings, and test file picking/IndexedDB on Android. Media Bin, SHA-256 and ZIP provenance baseline already exist.
3. Finish CF-04 audio and subtitle quality: subtitle editing/import/export and FFmpeg burn-in are implemented and tested; remaining work includes dedicated 1:1 safe-area tuning, visual checks for Arabic shaping/punctuation/numerals/wrapping, timed voice alignment, ambience/SFX tracks, fades/ducking and peak/clipping QA.
4. Extend CF-05 from the current project/timeline model to renderable transitions, overlays, video clips and true multi-clip audio mixing. Renderer compatibility must continue rejecting edits it cannot faithfully render.
5. Expand CF-06 QA with human review of black/frozen/silence warnings, clipping/loudness checks, bitrate thresholds per profile, render IDs/reproducibility manifest, export profiles, thumbnails and clearer delivery states. The post-render SHA-256/size/codec/profile report and advisory black/frozen/silence analysis now exist and are tested.
6. Run the CF-09 CogVideoX-2B proof only after a real free GPU session is verified and an exact model/dependency download manifest is explicitly approved. No model weights are currently downloaded.
7. Complete phone backup/restore and release checks, including recovery after browser restart.

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


## Subtitle continuity and recovery hardening — 2026-11-05
- Centralized scene-relative caption rebasing in the captions engine so the behavior can be tested independently of the page.
- Scene reordering, deletion and duration changes now preserve remaining cue positions relative to their scenes; cues belonging to removed scenes or outside a shortened scene are removed.
- Snapshot restoration now carries the saved caption list into the restored project, and loading/replacing a project refreshes the subtitle editor form and selected scene.
- Added regression tests for reorder/delete/duration rebasing and a full static DOM-ID contract test for the editor page.
- Verified on code/test SHA `4346bd1bed463e0a7a88fd4ee6d407e13d0d35b4` by GitHub Actions run [42035800872](https://github.com/mdznap35/PlayGround/actions/runs/42035800872): 67/67 Node tests and 28/28 Python tests passed; the FFmpeg integration fixture burned an Arabic subtitle into the rendered video. The demo MP4 quality gate also passed at 1920×1080, 24fps, H.264 and 40.0 seconds. Real Android-device acceptance remains outstanding.


## Arabic subtitle workflow and page-contract repair — 2026-11-05

- The existing editor code already supported subtitle editing, SRT/WebVTT import/export, scene-linked timed cues, project-v2 persistence and a subtitle timeline lane. Its renderer adapter already projected stable scene IDs and the renderer already accepted `subtitles` under job `schema_version: 1`.
- A deployment audit found a critical UI integration gap: `app.js` expected `window.CineForgeCaptions` and twelve caption controls, but `index.html` did not load `captions.js` or contain the caption panel. This would stop editor initialization before the rest of the workspace became usable.
- Fixed the page contract in commit `2c5fe051eb778c22391a0991efb5b9c0dc7416a2`: added the caption panel, import/export controls, scene/time/text editor, navigation link, script ordering and responsive styles. Media Bin and Export section indices were moved to 05 and 06.
- Added `tests/ui-contract.test.cjs`; it checks that `captions.js` loads before `app.js`, every literal DOM ID referenced by the editor exists in HTML, and renderer-job export includes validated subtitles.
- The renderer validates scene identity, cue timing, scene bounds, text length and overlaps; it writes an SRT sidecar in the job's temporary workspace and burns it into the video through FFmpeg's subtitle filter before audio muxing. Renderer job schema remains version 1.
- Added a real SRT line-structure test and extended the image + voice + music integration render fixture with an Arabic subtitle cue in commit `4346bd1bed463e0a7a88fd4ee6d407e13d0d35b4`. This exercises the subtitle FFmpeg path in the end-to-end Python render test.
- Exact-head workflow [#42037321618](https://github.com/mdznap35/PlayGround/actions/runs/42037321618) passed on `399e22dfbfc99d74bd9745002b28e089d8418fef`: Node **67/67**, Python **28/28**, sample render 40 seconds, H.264, 1920×1080, 24 fps, FFprobe checks and artifact upload.
- The subtitle integration now renders the same synthetic project once with an Arabic cue and once without it, extracts the same 1.5-second frame, and compares the pixels. CI logged **18,946** pixels with luminance difference above 60 and difference bounds `(612, 643, 1316, 796)`; this confirms visible frame changes from the subtitle-enabled render. It is a pixel-presence regression test, not a human legibility/RTL review.
- Artifact `cineforge-mp4-98`, ID `13418144697`, 5,135,987 bytes.
- The integration fixture also renders an Arabic subtitle cue with voice and music and checks the resulting H.264/AAC file and duration. No real Android browser screenshot or human visual typography review has been completed; the sample 40-second demo artifact itself is not a subtitle visual proof.
- PR #12 remains open/Draft and unmerged. No changes were made to `main`; no model weights or paid resources were used.


## Hash-backed delivery QA — 2026-11-05

- Added `apps/cineforge-studio/qa_report.py`, a standalone, dependency-free report builder that consumes the renderer job, FFprobe JSON and final MP4.
- The report schema `cineforge.render-qa@1` records H.264 codec, expected dimensions, frame and average frame rates, video bitrate, actual/expected duration and delta, audio expectation/presence, each audio stream's codec/sample rate/channel layout/bitrate, container size, MP4 byte size and SHA-256.
- Required gates fail on missing/empty MP4, invalid aspect, missing H.264 stream, wrong dimensions, unsupported frame rate, timeline duration mismatch, missing requested audio or non-finite timing data.
- Added five Python tests for exact hash/size reporting, silent jobs, missing requested audio, wrong dimensions/frame rate/duration, missing/empty output and invalid aspect.
- Replaced the workflow's inline QA block with the standalone module; the artifact continues to include `cineforge.mp4`, `render-report.json` and `ffprobe.json`.
- Added `qa_report.py` to both push and pull-request path filters, so changes to the QA implementation trigger the workflow.
- Exact-head workflow [#42038440550](https://github.com/mdznap35/PlayGround/actions/runs/42038440550) passed at `677f82a6f644ba345ca92cddcf8bae9c7f53515a`: Node **67/67**, Python **33/33**, demo MP4 40 seconds, H.264 1920×1080 at 24 fps, FFprobe and artifact upload.
- Independently downloaded artifact `cineforge-mp4-103` (ID `13418744193`) and verified its report values against the actual MP4 bytes: size **5,195,656** bytes and SHA-256 `781be50024ed984628f5400233ae0fb766603416759eacbb56c4f65ea0b991c5` matched exactly.
- The subsequent path-filter commit `a4e41336f00db7ec436c5c59f38875ee17aa5493` also passed exact-head CI [#42038776423](https://github.com/mdznap35/PlayGround/actions/runs/42038776423): Node **67/67**, Python **33/33**, render and artifact upload succeeded. Render deployment `dep-dbm8hf97lnhs738r3lf0` is Live on this commit.
- Remaining: pre-render missing-asset/rights preflight is not consolidated here; black/frozen-frame and silence analysis, per-profile bitrate thresholds, render IDs/reproducibility manifest, thumbnails, multi-aspect packaging, mobile-ready delivery states and user-facing download/recovery are not yet implemented.


## Content-aware delivery QA — 2026-11-05

- Extended `apps/cineforge-studio/qa_report.py` with a single FFmpeg decode pass using `blackdetect=d=2:pix_th=0.10`, `freezedetect=n=-50dB:d=2`, and `silencedetect=noise=-50dB:d=2` when an audio stream exists.
- The analyzer records thresholds, segment durations and warning count in `render-report.json`. It is explicitly advisory: intentional black, static or silent passages must be reviewed by a person, not automatically rejected.
- Added tests for black/freeze/silence log parsing, the silent-job branch (no audio filter), and graceful FFmpeg-unavailable behavior.
- Extended the real image + voice + music + Arabic-subtitle integration render test to invoke content analysis with `include_audio=True`, thereby executing the silence filter on an actual audio-bearing MP4.
- Fixed the FFmpeg log marker regex and newline parsing before accepting the latest CI run.
- Exact-head workflow [#42040590337](https://github.com/mdznap35/PlayGround/actions/runs/42040590337) passed on `8ff93b6d6b6799e34b035a260390dff24d785807`: Node **67/67**, Python **36/36**, 40-second MP4 render, FFprobe and artifact upload.
- Latest demo content-analysis result: no black segments >=2 seconds; two frozen intervals of **7.125 seconds** each; silence analysis correctly skipped because this sample has no audio. The separate image + voice + music integration fixture does run the silence detector.
- Artifact `cineforge-mp4-111`, ID `13421930537`: independently downloaded and unpacked. Its MP4 is **5,195,656 bytes** and SHA-256 `781be50024ed984628f5400233ae0fb766603416759eacbb56c4f65ea0b991c5`; both values exactly matched `render-report.json`.
- Render deployment `dep-dbm8n5m7bikc73enn4r0` is Live on `8ff93b6`.
- Remaining: warning classification/threshold tuning, actual black/frozen visual confirmation, audio loudness/clipping and silence policy, final frame/audio-tail checks, per-profile size/bitrate gates, reproducibility manifest/render ID, thumbnails, and mobile delivery UX. The demo's two freeze warnings are not yet adjudicated as a defect.
