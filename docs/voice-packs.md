# Voice packs (PREPARED — no packs shipped yet)

`RecordedFileBackend` (`src/services/voice-pack.ts`) plays pre-generated,
curated line audio with per-line fallback to system speech. This file defines
the pack contract so content production can proceed without code changes.

## Manifest format
`assets/audio/voices/<pack>/manifest.json`:
```json
{
  "pack": "core-ar-noura",
  "lang": "ar",
  "voice": "noura",
  "license": "produced-for-nova-2026 (all rights held by project)",
  "lines": { "hello": "hello.ogg", "good-job": "good-job.ogg" }
}
```

## Production path (requires human/paid step — DEFERRED)
1. Curate the line list per zone (Arabic first, then English). Start with the
   20 activity `voice` strings in `src/core/content.ts` (stable ids).
2. Render with ElevenLabs or studio recording on a production machine.
3. Commit ogg/mp3 + manifest under `assets/audio/voices/<pack>/`, copy runtime
   files to `public/audio/voices/<pack>/`, add precache glob + license row.
4. Wire: `voice.setBackend(new RecordedFileBackend(manifest, base, fallback))`.
5. Missing lines automatically fall back to system speech — packs can ship
   partial and grow.

## Budgets & rules
- Mono 32 kbps, ≤15 KB/line, normalized loudness across the pack.
- NEVER generate religious/values lines by AI TTS without human review; every
  `VALUES` line needs source verification first (see content architecture doc).
- License must be recorded in `docs/third-party-resources.md` before bundling.
