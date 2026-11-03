# CineForge Studio — CPU-first video workspace

CineForge is a mobile-friendly, Arabic-first storyboard studio with a small, reproducible video renderer. It is deliberately split into two parts:

- **Studio (browser):** edits projects locally in the browser, builds editable scene outlines, previews title cards, and exports a small JSON job file. No account, API key, or model download is required.
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

## What it does not claim to do

This CPU-first release does **not** generate realistic video clips from text, clone voices, or create music. It renders designed motion graphics from the scene content. A real generative video engine (for example a GPU-backed ComfyUI provider) is a future optional adapter. No model weights are downloaded by this project.

## Use the studio

Open `index.html` in a browser, or deploy this folder as a Render Static Site:

- Repository: `mdznap35/PlayGround`
- Branch: `feat/cineforge-studio-core` (use `main` after merging the project)
- Root Directory: `apps/cineforge-studio`
- Build Command: leave empty
- Publish Directory: `.`

The studio is static. It does not need a Render backend, persistent disk, database, or always-on server. Render's free static hosting is suitable for the interface; video rendering happens separately in GitHub Actions.

**Simplest deployment:** in Render, choose **New → Blueprint**, connect this repository, and select branch `feat/cineforge-studio-core`. The root `render.yaml` defines the free static site, app root, and publish path. Render will show the service details before creation.

## Render a video

1. In the studio, create/edit a project and select **Download job JSON**.
2. Upload permitted still images into `apps/cineforge-studio/jobs/assets/` and audio into `apps/cineforge-studio/jobs/audio/`.
3. Add the JSON file to `apps/cineforge-studio/jobs/`. Use paths relative to that directory, for example `assets/scene-01.webp`, `audio/voiceover.mp3` and `audio/music-bed.mp3`.
4. Set each scene's `image_file` and `camera_move`; set top-level `voiceover_file`, `music_file` and `music_volume` as needed. Older projects using a single `audio_file` at the root of `jobs/` remain supported.
5. A push changing a job JSON or its image/audio assets starts the workflow. You can also run **Actions → CineForge CPU Renderer → Run workflow** and choose the job file.
6. Download the artifact. It contains the MP4 and technical QA reports.

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
2. Narration/audio timing and subtitle controls.
3. Optional image/video assets per scene.
4. Pluggable GPU generation providers, enabled only when a suitable free or paid GPU is explicitly available.
5. Batch jobs, reusable visual themes, and advanced transitions.

**Principle:** never label a motion-graphics render as generative AI footage. Show exactly which engine made the output.
