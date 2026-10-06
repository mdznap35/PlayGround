# Offline architecture

## Model
- **OFFLINE = complete NOVA.** First load precaches the shell; every later
  launch works with zero network. Network adds: live weather, gateway AI —
  both with local fallbacks, both invisible when absent.
- **ONLINE = enhanced only.** No feature gates on connectivity.

## Service worker (`vite-plugin-pwa`, generateSW, `cacheId: nova-v1`)
- Precaches: all `dist/` output (JS/CSS/index.html), `public/fonts/*`,
  `public/icons/*`, `public/audio/**`.
- Runtime: same-origin `StaleWhileRevalidate` (`nova-same-origin-v1`, 120 entries,
  30 days). No cross-origin caching, no cross-origin requests by design.
- `skipWaiting` + `clientsClaim` + `autoUpdate`: kids never see update prompts;
  new SW activates on next launch. `cleanupOutdatedCaches` purges old `nova-*`.
- `navigateFallback: index.html` so offline deep-links still boot.

## Cache versioning / updates
- Bump rule: any precache-content change ships a new SW automatically (Workbox
  hashes precache entries). If the *runtime cache schema* changes, bump
  `cacheId` (`nova-v2`) AND the `nova-same-origin-v*` name together.
- Rollback: old SW stays until new one activates; failed update = old app keeps
  running (safe by Workbox design).

## Data persistence (separate from HTTP cache)
| Data | Store | Backup | Migration |
|---|---|---|---|
| Hot save (progress, skills, world) | localStorage `nova.save.v1` | `nova.save.v1.backup` (previous good write) | `migrateSave()` chain, `SAVE_VERSION` |
| Large blobs (drawings, voice packs) | IndexedDB `nova-blobs/blobs` (Dexie v1) | none (recreatable) → memory fallback | add stores only, never rename `blobs` |
| Flags (`nova.seen`) | localStorage | none | n/a |

## Offline failure modes (all handled)
- No network on boot → SW serves precached shell. ✓ (tested: see below)
- Weather API down/slow → 6s timeout → fixture. ✓ (unit-tested)
- AI endpoint empty/unreachable → NoopAI text. ✓ (unit-tested)
- IndexedDB blocked (private mode) → MemoryBlobStore. ✓ (unit-tested)
- Corrupt save JSON → backup slot → defaults. ✓ (existing tests)

## No-internet test procedure (run before every release)
1. `npm run build && npx vite preview --port 3002`
2. Load once online (SW installs). 3. Kill network (DevTools offline / `iptables`).
4. Hard-reload → app boots, island renders, save loads, activity completes.
5. Check DevTools → Application → Cache Storage shows `workbox-precache-v2-nova-v1`.
