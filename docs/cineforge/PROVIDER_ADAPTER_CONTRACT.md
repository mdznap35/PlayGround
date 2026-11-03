# Provider Adapter Contract

This document specifies a future integration boundary. It does not mean a provider is connected.

## Capabilities
Every adapter must declare provider/model/version, supported tasks (text-to-video, image-to-video, image generation, TTS), accepted MIME types, max duration/resolution/fps/aspect, sync/async behavior, status/poll/cancel/download support, quota/rate limits, pricing, license, geographic/account eligibility and official evidence URLs.

## Lifecycle
draft → validated → submitted → queued → running → completed, failed or cancelled.

Store an idempotency key derived from project ID, scene ID, provider, model, normalized prompt, input hashes and settings. Retries must not duplicate a billable request when provider idempotency exists.

## Input
Project and scene IDs; prompt containing subject, action, environment, camera, lighting, look and continuity; optional reference asset with SHA-256, MIME type, dimensions and rights state; requested duration and output profile.

## Output
Downloadable file; SHA-256; size, MIME, dimensions, fps and duration; provider/model/version; prompt; provider job ID; timestamps; usage estimate; license snapshot URL; error code and retryability.

## Security
- Store credentials only in GitHub Actions secrets or a server-side provider.
- Never put secrets in browser code, job JSON, public issues, logs or commits.
- Restrict downloads to provider-documented hosts and validate MIME, size and file content.
- Enforce duration, file-size and quota budgets before submission.
- Paid use is disabled until the user approves an explicit budget.

## Definition of free
A provider is free only if official current terms establish a recurring included quota for the exact endpoint with no required paid plan for this account and region. One-time trials and shared demos are not free production capacity.

Research snapshot (2026-11-03):
- Hugging Face Spaces ZeroGPU documentation: 5 GPU minutes/day for a free account, with queue priority based on account tier. Experimental only, not a 24/7 inference guarantee.
- LTX Studio: a possible one-time 800-credit free allocation; official help says credits do not renew and free outputs are personal-use only.
- LTX API: generation billed per second; classify as paid.
- Cloudflare Workers AI has a daily free Neuron allocation, but that alone does not demonstrate that a usable video-generation model is included. Do not assume video inference is free there.

Recheck all plan terms before activation.
