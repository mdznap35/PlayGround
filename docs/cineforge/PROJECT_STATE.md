# CineForge — Project State

Updated: 2026-11-03
Current branch: feat/cineforge-cinematic-media-v2
Foundation branch: feat/cineforge-studio-core
Foundation PR: #11 (Draft, not merged)

## Goal
Phone-first studio for professional short, long and cinematic videos, free-first, with transparent engine labels and no unapproved downloads or spending.

## Verified foundation
- Foundation head before Phase 1: 7a0c0cf2be7c5d00761facf2894a83de6eb4fafd.
- Workflow run #3: 41658956511 — success.
- Six foundation unit tests passed.
- Inspected sample: 40 seconds, 1920×1080, 24 fps H.264; Arabic RTL visually reviewed with Pillow RAQM.
- Artifact ID: 13241725525; temporary 7-day retention.
- Render deployment not yet performed; Canva folder exists, no designs created.

## Active work: Phase 1
Image-backed shots, camera movement, voiceover/music mixing, asset path security and output QA.
Preserve compatibility with existing schema-v1 jobs.
All media paths are relative to jobs/ and must be checked against traversal and symlink escape.

## Decisions
- Render is static UI hosting only.
- GitHub Actions performs CPU compositing and packaging.
- No model weights or large media assets downloaded.
- Free GPU providers are experimental until their quota and license are verified.
- Public repository must not contain private assets, personal recordings or secrets.

## Acceptance evidence required
- Exact-head Actions run green.
- Tests cover legacy schema, media manifests, traversal, absolute paths, symlink escape, audio combinations and camera moves.
- MP4 render succeeds and FFprobe verifies codec, dimensions, fps, duration and audio streams.
- An output frame and audio are checked.
- Exact changed-file list and remaining limitations are recorded.

## Next
1. Complete Phase 1 and independent review.
2. Open a Draft PR against feat/cineforge-studio-core.
3. Begin Phase 2 story/shot planner after Phase 1 is stable.
