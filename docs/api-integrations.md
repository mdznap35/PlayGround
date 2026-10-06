# API integrations (safe abstraction layer)

## Iron rule
The browser NEVER holds secrets. `src/config.ts` exposes PUBLIC config only
(endpoints, flags). All keys live on a future gateway/server (see `.env.example`).

## Status table
| Service | Account? | Key? | Public/Secret | User action? | Config by OpenCode? | Test w/o key? | License/free-tier | Status |
|---|---|---|---|---|---|---|---|---|
| Open-Meteo | No | No | Public (endpoint only) | None | Yes | Yes (bundled fixture) | Free tier, non-commercial; CC-BY data — re-verify for commercial | READY (fixture), PARTIALLY READY (live) |
| NASA APIs | Free signup | Yes (DEMO_KEY rate-limited) | Secret (server) | Create key later IF used | No | Fixture only | DEMO_KEY failed with 500 during capture — unreliable; use server key + cache | BLOCKED (no key; live untested) |
| Gemini | Google account | Yes | Secret (gateway) | Create key + gateway IF adopted | Scaffold only | Yes (NoopAI fallback) | Pay-as-you-go | DEFERRED |
| OpenRouter | Account | Yes | Secret (gateway) | Create key + gateway IF adopted | Scaffold only (`GatewayAI` speaks its `/chat/completions`) | Yes (mock-fetch tests) | Varies per model | DEFERRED |
| ElevenLabs | Paid seat | Yes | Secret (production machine only) | Buy IF studio voices wanted | No | N/A (files, not API, ship) | Character/usage pricing — production-only | DEFERRED |
| Mapbox | Account | Token (public) | Public token, usage-billed | Create token IF globe needs tiles | Yes | No (needs token) | Free tier then usage billing; offline-hostile | NOT NEEDED (procedural globe preferred) |
| Supabase | Account | Service key = secret | Secret | Create project IF backend needed | No | N/A | Free tier exists | NOT NEEDED (no backend requirement) |
| Cloudflare | Account | Token = secret | Secret | Only with backend/CDN need | No | N/A | Free tier exists | NOT NEEDED |
| Sentry | Account | DSN (public-ish but identifying) | Treat as secret | Only after privacy review | No | N/A | Free tier exists | DEFERRED (child-privacy review first) |

## AI constraints (non-negotiable)
- `NoopAI` is the default service. Child flows never await network.
- `GatewayAI` sends NO Authorization header (keys stay server-side by design).
- Typed ops only (`explain`/`parentSummary`/`storyIdea`), 600-char cap,
  temperature 0.6, always with local fallback text.
- No free-form child chat. Ever. (Would need separate safety design + review.)

## Voice production path (no runtime TTS dependency)
1. Curate line list per zone (Arabic + English).
2. Render with ElevenLabs (or any studio) on a production machine.
3. Commit ogg files + `manifest.json` under `assets/audio/voices/<pack>/`.
4. Ship via `RecordedFileBackend`; missing lines fall back to system speech.

## World/science data path
- `fetchWeather()` (6s timeout) → strict `parseCurrentWeather()` → fixture.
  Any shape drift = fixture, never a crash. Weather codes bucketed for kids.
- NASA content: server-cached APOD/EPIC only (client never calls api.nasa.gov
  directly — DEMO_KEY is rate-limited and unreliable from devices).
