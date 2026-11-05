# CineForge Studio — CPU-first video workspace

CineForge is a mobile-friendly, Arabic-first storyboard studio with a small, reproducible video renderer. It is deliberately split into two parts:

- **Studio (browser):** edits projects locally in the browser, builds editable scene outlines, previews title cards, and exports a small JSON job file. No account, API key, or model download is required.
- **Story planner:** a separate Arabic-first planning workspace for narrative beats, continuity bible, research ledger, and narration pacing audit. It exports a versioned story-plan JSON.
- **Renderer (GitHub Actions):** converts a committed job JSON into an MP4 using Pillow + FFmpeg on a standard CPU runner. It produces animated motion-graphics scenes (slow camera movement, cinematic cards, fades), not photorealistic AI-generated footage.

## What this first release can do

- Arabic / English project metadata and scene text.
- 16:9, 9:16 and 1:1 layouts.
- Short and longer motion-graphics sequences (renderer cap: 15 minutes per job).
- Editable scene title, narration text, visual direction and duration.
- Browser-local autosave and JSON export.
- MP4 export on GitHub Actions, with a downloadable artifact retained for 7 days.
- Image-backed scenes from assets committed under jobs/assets/.
- Scene camera moves: static, push-in, pull-out, pan left/right/up/down.
- Separate voiceover and music tracks from jobs/audio/, with independent volume controls.
- Machine-readable FFprobe report in every rendered artifact.

## Active engine inventory

- **Pillow:** creates scene artwork, gradients, typography and image composition.
- **FFmpeg:** assembles animated scenes, camera moves, fades and audio into MP4.
- **FFprobe:** inspects the exported file and supports the technical QA gate.
- **GitHub Actions CPU runner:** executes the reproducible render job. Render hosts the static interface only.
- **No generative AI video, image, speech or music provider is currently connected.** Optional provider adapters remain a later phase, not an installed engine.

## What it does not claim to do

This CPU-first release does **not** generate realistic video clips from text, clone voices, or create music. It renders designed motion graphics from the scene content. A real generative video engine (for example a GPU-backed ComfyUI provider) is a future optional adapter. No model weights are downloaded by this project.

## Use the studio

Open `index.html` in a browser, or deploy this folder as a Render Static Site:

- Repository: `mdznap35/PlayGround`
- Branch: `feat/cineforge-cinematic-media-v2` (use `main` after merging the project)
- Root Directory: `apps/cineforge-studio`
- Build Command: leave empty
- Publish Directory: `.`

The studio is static. It does not need a Render backend, persistent disk, database, or always-on server. Render's free static hosting is suitable for the interface; video rendering happens separately in GitHub Actions.

**Simplest deployment:** in Render, choose **New → Blueprint**, connect this repository, and select branch `feat/cineforge-cinematic-media-v2`. The root `render.yaml` defines the free static site, app root, and publish path. Render will show the service details before creation.

## Plan a story

Open `story-planner.html` from the studio navigation. Define the audience, goal, premise, format and tone; write the seven narrative beats; record characters, locations and props in the continuity bible; and track research sources with verification status. Paste narration to estimate word count and duration against the target runtime. Export a `cineforge.story-plan` JSON file. Return to the main editor and choose **استيراد خطة القصة JSON** to convert the beats into editable renderer scenes. The importer preserves a bounded planning snapshot in the exported render job. Current render constraints still apply: 3–90 seconds per scene and 15 minutes total. The planner autosaves only in the current browser's local storage; export the JSON to keep a portable copy.

## Narration pacing guidance

The scene editor shows a per-scene estimate based on word count, scene duration and a rough reference speaking rate (Arabic 130, English 150, mixed 140 words/minute). It flags empty text, visual breathing room, a tight fit and likely overrun. These are editorial estimates only: real delivery varies by speaker, pauses and performance, so they never block export.

## Roadmap and project status

The detailed Arabic execution roadmap is in [docs/cineforge/MASTER_ROADMAP_AR.md](../../docs/cineforge/MASTER_ROADMAP_AR.md). The latest cloud-first open-model and GPU architecture is documented in [CLOUD_PRODUCTION_MASTERPLAN_AR.md](../../docs/cineforge/CLOUD_PRODUCTION_MASTERPLAN_AR.md). The expanded free-stack architecture, open-source engine catalogue, cloud GPU plan and staged delivery gates are in [FREE_STACK_BLUEPRINT_AR.md](../../docs/cineforge/FREE_STACK_BLUEPRINT_AR.md). The current engine inventory and open-source integration decisions are in [ENGINE_EVALUATION_AR.md](../../docs/cineforge/ENGINE_EVALUATION_AR.md). Current evidence and blockers are tracked in [PROJECT_STATE.md](../../docs/cineforge/PROJECT_STATE.md), with implementation tasks in GitHub Issues #13–#19.

## Render a video

1. In the studio, create/edit a project and select **Download job JSON**.
2. Upload permitted still images into `apps/cineforge-studio/jobs/assets/` and audio into `apps/cineforge-studio/jobs/audio/`.
3. Add the JSON file to `apps/cineforge-studio/jobs/`. Use paths relative to that directory, for example `assets/scene-01.webp`, `audio/voiceover.mp3` and `audio/music-bed.mp3`.
4. Set each scene's `image_file` and `camera_move`; set top-level `voiceover_file`, `music_file` and `music_volume` as needed. Older projects using a single `audio_file` at the root of `jobs/` remain supported.
5. Commit the job JSON and media together. A push that changes a job JSON starts the render workflow automatically.
6. When adding media in a separate later commit without changing a job JSON, open **Actions → CineForge CPU Renderer → Run workflow**, then choose the exact job file. This avoids accidentally rendering the sample project.
7. Download the artifact. It contains the MP4 and technical QA reports.

The sample job is `jobs/demo.json`. The renderer validates paths, duration, scene count, text lengths, camera movement and media extensions before processing. Image/audio files must already be committed: the workflow does not download media.

## Renderer limits

- Max 40 scenes per job.
- Each scene: 3–90 seconds.
- Total timeline: at most 900 seconds (15 minutes).
- 1080p, 24 fps, H.264 MP4.
- Images must be PNG/JPG/JPEG/WEBP under `jobs/assets/`; audio must be MP3/WAV/M4A/OGG/AAC/FLAC under `jobs/audio/`.
- All media paths are validated and cannot escape the job folder.
- Audio volume: music 0–1; voiceover 0–2.
- Artifacts are temporary (7-day retention). Download important exports to your phone.

## Local checks

Python 3.11+ is recommended. Install dependencies and run:

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python render.py jobs/demo.json --validate-only
```

For a local MP4 render, install FFmpeg and run:

```bash
python render.py jobs/demo.json --output dist/demo.mp4
```

## Cost and privacy

The browser autosaves to that browser's local storage. Exported project JSON contains only the text and settings you entered. GitHub Actions uses standard hosted CPU runners; there are no GPU/model downloads and no Render video-processing workload. GitHub usage and artifact limits still apply, so this is a free-tier-friendly starter rather than an unlimited rendering service.

## Roadmap

1. Verified CPU renderer and project manifest.
2. Structured story planner, continuity bible, research ledger, and narration pacing audit.
3. Deeper integration: convert approved story-plan beats into scene drafts and timeline timings.
4. Subtitle authoring, word-level timing, and caption QA.
5. Optional GPU generation adapters only after verified availability, licensing, and cost review.
6. Batch jobs, reusable visual themes, and advanced transitions.

**Principle:** never label a motion-graphics render as generative AI footage. Show exactly which engine made the output.


## Media Bin and portable project packages

The browser editor includes a local Media Bin backed by IndexedDB. It stores selected image/audio/video files in the current browser and records a SHA-256 hash when Web Crypto is available, along with source type, source reference, license text, notes, size, and media type.

- Supported image files for the current renderer: PNG, JPG, JPEG, WEBP.
- Supported audio files: MP3, WAV, M4A, OGG, AAC, FLAC.
- Video files can be catalogued locally, but the current CPU renderer does not place video assets on the timeline yet.
- Limits: 128 MiB per file, 512 MiB in the local library, 500 items, and 160 MiB per ZIP package. Browser storage quotas still apply.
- The library is local to the browser. It is not automatically uploaded or synchronized to Render, GitHub, or a cloud bucket.
- Assign an image to the selected scene or audio to the voiceover/music fields. Then use the ZIP project package action to export the render job, media files, and provenance manifest together.
- Extract the ZIP at the repository root and preserve its paths. The render job and media bytes are placed under apps/cineforge-studio/jobs/. The separate manifest is placed under apps/cineforge-studio/media-manifests/ so it cannot be mistaken for a render job. Commit the job and its media files together before running the render workflow.
- A standalone JSON export does not contain the actual media bytes. Use the ZIP package when the render must be self-contained.

The package uses cineforge.project manifest version 2 while retaining renderer schema_version 1 for compatibility with the current Python renderer. Media provenance is descriptive metadata; it does not independently prove that a license is valid. Verify rights before publishing.



## Project engine v2 and multi-track editor

The browser project document uses the versioned contract cineforge.project@2. It stores project identity and revision, editable scene records, selected-scene state, story-planning context, and a normalized timeline with picture, voiceover and music tracks. The renderer job remains schema version 1: this preserves backward compatibility while the editor's project model evolves.

- Project autosave prefers IndexedDB and falls back to localStorage when IndexedDB is unavailable or cannot be opened.
- Revisions are checkpointed automatically; the latest 12 snapshots are retained per project for in-browser recovery.
- Export the complete .cineforge.json project separately from the renderer job. ZIP project packages now include that full project document as well as the renderer job, media files and rights manifest.
- The timeline renders independently timed picture, voiceover and music lanes. Drag picture clips to reorder scenes; select a picture clip to focus its scene. The current CPU renderer still accepts a sequential picture track and one full-length voiceover/music file, not arbitrary overlapping edits or multi-clip audio mixing.
- project-engine.js exposes frame-snapped move, trim, split and remove operations with validation. Unsupported timeline arrangements are detected by the renderer-compatibility gate rather than silently flattened.

The project engine and storage modules are dependency-free browser scripts with Node test coverage. Browser IndexedDB behavior and Android interaction still require a real-browser smoke test.


Project files can be reopened with **فتح ملف مشروع محفوظ**. Import accepts the versioned project JSON, validates its timeline, and rejects layouts that the current renderer/editor cannot preserve without flattening. The renderer job JSON and the editable project JSON are separate formats.


Project restore is revision-monotonic: restoring an older snapshot creates a new revision above the current head instead of reverting the revision counter. Reopening a project with the same project ID also creates a new checkpoint above the currently stored revision. Import rejects non-empty subtitle/overlay lanes and mismatched audio source/timing metadata because the current renderer does not yet implement those lanes.


## Timeline transport and review controls

The timeline includes a frame-addressable playhead, sequenced storyboard preview transport, direct ruler/empty-lane seeking, zoom from 100% to 250%, and keyboard controls (Space to play/pause, Left/Right to step one frame, Shift+Left/Right to step one second, Home/End to jump). The preview advances through the selected storyboard's scene artwork; it is not a final encoded video preview. This navigation layer does not enable unsupported trim/split/multi-clip output in renderer v1. The renderer-compatibility gate remains authoritative.


### Narrative intent and continuity handoff

Each story-planner beat now carries an explicit narrative role, an editable audience-facing purpose, and a continuity note. The importer maps these fields into the corresponding editor scene; project v2 preserves them through save/reload and the renderer-job scene metadata projection. The scene editor exposes all three fields for revision, while the full planning snapshot continues to retain the story bible and research sources. The CPU renderer validates the role and text limits and carries the fields through normalized job data for QA/provenance; they do not alter rendered pixels. These fields are editorial metadata: they guide production and review but do not claim to generate or enforce visual continuity automatically. Dedicated tests cover field bounds, defaults and the planner → importer → project save/reload round trip.
