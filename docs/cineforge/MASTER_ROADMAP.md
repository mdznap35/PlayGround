# CineForge Studio — Master Roadmap

Project state: Phase 0 verified; Phase 1 compositor CI verified on Draft PR #12; Phase 2 story/shot planner is in progress on feat/cineforge-story-planner-v3.
Operating constraints: phone-first, free-first, no computer, no paid APIs, no model-weight downloads or bulk media downloads without an estimate and explicit approval. The existing Render host is optional; GitHub is the source of truth and Canva is for design handoff.

## Final product
A mobile-friendly studio that converts a brief into a coherent script, shot list, visual assets, narration, music, edited video and platform-ready exports. It must always distinguish AI-generated footage from image animation, user footage and conventional motion graphics.

A final project must include:
1. Structured brief: audience, intent, platform, language, length, aspect, tone, visual references.
2. Script: hook, progression, turning point, resolution and deliberate ending.
3. Storyboard: shot purpose, framing, camera, lighting, action, narration, captions, sound cues and transition.
4. Continuity bible: characters, props, locations, color, lighting and camera language.
5. Media manifest: source, license/permission, generation method, provider/model, version, hash and dimensions.
6. Render pipeline with resumable states, validated output and an error report.
7. Exports for 16:9, 9:16 and 1:1, with captions, audio, thumbnail and platform metadata.
8. A truthful engine label and human review gate.

## Constraints
- There is no confirmed unlimited professional text-to-video service that is free forever.
- GitHub Actions is used for CPU compositing, tests and packaging, not as a GPU farm.
- Render is a static/control interface host, not the video renderer.
- Browser storage is a draft cache, not durable backup.
- No unapproved large downloads, paid APIs, GPU services or secret storage changes.
- Never commit private voice recordings, personal photos, secret keys or media without distribution rights to the public repository.

## Phase 0 — verified foundation
Completed baseline:
- Arabic-first responsive editor and scene list.
- 16:9, 9:16 and square project profiles.
- JSON project export and browser-local saving.
- Pillow + FFmpeg CPU pipeline with H.264 export.
- Arabic shaping checked with Pillow RAQM.
- Foundation workflow #3 passed; 6 unit tests passed; 40-second 1920×1080 at 24 fps sample MP4 inspected.
- Current foundation lives in apps/cineforge-studio on feat/cineforge-studio-core; PR #11 is Draft and not merged.

## Phase 1 — cinematic media renderer (implemented; Draft PR #12)
Goal: move beyond text-only cards into user-supplied visual shots with camera movement, voice, music and technical output checks. The implementation passed the exact-head workflow run 41663752833.
Deliverables:
- Per-scene image path under jobs/assets (PNG/JPG/JPEG/WEBP).
- Static, push-in, pull-out, pan-left/right/up/down camera moves.
- Image fit, color/contrast adjustment, cinematic dark overlay, typography and fades.
- Independent voiceover and music tracks from jobs/audio, separate volume controls and mixing.
- Backward compatibility with the existing single audio_file field.
- UI controls for image path, camera move, voiceover, music and music volume.
- Path validation blocks absolute paths, traversal, unsafe file extensions and symlink escapes.
- Tests, FFprobe output report and render workflow on the exact head.
Acceptance:
- Old jobs still validate and render.
- Missing media fails early with a clear diagnostic.
- Silent, legacy audio, voice-only, music-only, and voice+music modes work.
- Portrait/square/landscape exports use valid dimensions and H.264.
- Arabic on-screen text remains connected and RTL.
- End-to-end output is inspected, not just the exit code.

## Phase 2 — script and shot planner
Goal: make CineForge a production planner, not only a renderer.
Deliverables:
- Brief-to-outline structure: hook, setup, development, turning point, resolution.
- Script editor with scene purpose, narration, on-screen text, B-roll need and estimated reading duration.
- Shot list: subject, action, environment, lens feel, framing, movement, light, palette and continuity constraints.
- Duration allocator that flags overfull or underfilled narration.
- Character, prop and location continuity bible.
- Reusable project visual profiles and production templates.
- Fact-check markers and source notes for documentary/educational content.
Acceptance:
- JSON round-trip does not lose the authored story.
- Scene durations, narration and total duration reconcile.
- Claims needing evidence are marked; the system must not invent sources.

## Phase 3 — asset production and provenance
Goal: build a reusable asset board and keep track of how each shot was made.
Deliverables:
- One or more image/video takes per shot and aspect/crop checks.
- Optional image-generation adapter with model/version/prompt/seed/license/hash metadata.
- User-uploaded images and clips with ownership/permission fields.
- Asset continuity grouping and missing-asset report.
- Optional Canva handoff for title cards, thumbnails and branded layouts.
Acceptance:
- Every used image/clip has source and rights status.
- Project can be rebuilt from manifest plus stored assets.
- Replacing a take does not silently alter other shots.

## Phase 4 — voice, dialogue, subtitles and sound
Goal: Arabic-first audio and caption workflow.
Deliverables:
- Licensed TTS option or user-provided narration track.
- Arabic pronunciation notes and text normalization.
- SRT/VTT subtitles with timing, safe areas and RTL shaping.
- Music, ambience and sound-effect tracks, fades and optional ducking.
- Audio peak/loudness and clipping checks.
Acceptance:
- All requested audio/caption tracks are present and timing fits the film.
- No accidental silence, clipping or missing narration.
- Voice consent and voice/model license are recorded. No voice cloning by default.

## Phase 5 — generative video provider adapters (experimental)
Goal: real text-to-video/image-to-video clips through interchangeable backends.
Policy:
- No vendor lock-in. Each provider exposes capabilities, input/output specs, async states, quota, retries, download rules and license.
- "Free" means official recurring quota for the exact endpoint and region, with no unexpected payment requirement. Trial credits are not a free recurring tier.
- Paid APIs remain disabled until the user explicitly approves a cost budget.
- First experimental candidate: Hugging Face ZeroGPU Spaces; its official documentation currently states 5 GPU minutes/day for free accounts and tier-based queue priority. This is not a production reliability guarantee.
- LTX Studio free tier may provide one-time credits, but official help says the allowance does not renew and free outputs are personal-use only. Not a sustainable production path.
- LTX API pricing is per generated second and therefore treated as paid.
- ComfyUI self-hosting requires suitable GPU hardware; no models will be downloaded without reporting their size and getting approval.
Acceptance:
- One real adapter completes a short clip end-to-end with documented quota, latency, license and output specs.
- Jobs can be queued/failed/retried without duplicate billable requests.
- Browser never receives provider secrets.
- UI says queued, generating, complete, failed or unavailable accurately.

## Phase 6 — finishing and quality assurance
Deliverables:
- Transitions, color/look presets, safe areas and continuity checks.
- Subtitle density/readability checks.
- FFprobe report: codec, dimensions, frame rate, duration, audio, bitrate and size.
- Black-frame, frozen-frame and silent-audio checks where feasible.
- Thumbnail/opening frame and platform delivery metadata.
- Versioned reproducible renders.
Acceptance:
- Every final render includes a quality report.
- No render is labeled complete when required streams or specs are absent.
- Human review of visual/audio quality remains mandatory.

## Phase 7 — phone-first operations and deployment
Deliverables:
- Render static site deployment via checked-in Blueprint.
- GitHub Actions workflow_dispatch, progress/failure logs and download artifact.
- Project templates, scene library and versioned exports.
- Optional storage provider only after free quota, privacy and access controls are verified.
- Canva folder for thumbnails and brand layouts.
- Backup/restore rehearsal.
Acceptance:
- New project → storyboard → media upload → render → QA → download works from a mobile browser.
- Long renders never run inside Render's free web process.
- Private material is never committed to the public repository.

## Current execution order
1. Finish and independently verify Phase 1.
2. Implement Phase 2 story/shot planning.
3. Add asset provenance and an image-generation adapter only after quota/license checks.
4. Add Arabic TTS and timed captions.
5. Run a short free GPU video inference experiment if eligible.
6. Build final QA and export profiles.
7. Demonstrate the complete phone-only workflow.

## Cost boundaries
- GitHub: source, CI and temporary artifacts; quotas and retention apply.
- Render: free static UI hosting, not GPU rendering.
- Canva: branded layouts/thumbnails; AI features may have limited credits.
- Hugging Face ZeroGPU: experimental short inference with a limited daily quota and queue.
- Hosted video APIs: paid per-second/credit service; opt-in only.
- ComfyUI: no hosting cost if appropriate GPU is already available, but hardware/storage/model costs remain.

## Governance
- Use phase-specific feature branches; keep each reviewable.
- Do not merge, deploy, spend or publish private media without authorization.
- Persist exact commits, workflow IDs, test totals, artifact IDs and blockers in PROJECT_STATE.md.
- A plan is not an implementation. A green CI run is not a complete visual quality review.
