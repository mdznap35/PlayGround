# Development setup (reproducible offline-capable env)

## Prerequisites
Node 22+ (repo built with v22.23.3). No Flutter/Godot/native toolchains needed.

## Fresh install
```bash
npm ci            # exact pinned graph from package-lock.json
npm test          # 50 tests, must be green
npm run build     # tsc + vite + SW generation into dist/
npx vite preview --port 3002   # serve the production build
```

## Everyday commands
| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (:3002) |
| `npm run build` | Type-check + production build + SW |
| `npm test` / `npm run test:watch` | Vitest suite / watch |
| `node scripts/make-icons.mjs` | Regenerate PWA icons |
| `node scripts/optimize-assets.mjs` | Optimize `assets/source/` → `assets/ready/` (+manifest) |

## Environment
- Copy `.env.example` → `.env` for local dev. Only `VITE_*` keys reach the
  client. AI/weather endpoints default to safe values (AI disabled).
- Sharp downloads a platform binary on install (linux-x64 is in the lockfile).
  On macOS/Windows run `npm ci` once with internet so sharp fetches its binary.

## Offline development (after this session's window)
- `npm ci --offline` works if the npm cache is warm (it is, on this machine,
  including the pixi.js 8.22.0 tarball recorded in `third-party-resources.md`).
- Verify cache: `npm cache ls pixi.js` (npm ≥10).
- If the cache is cold elsewhere: every dependency is in `package-lock.json`;
  one online `npm ci` re-warms everything.

## Conventions
- TypeScript strict, no unused locals/params (`tsc --noEmit` gates the build).
- New content = data entries + `validateContent()` coverage, never engine edits
  for content alone.
- New infra must ship with: interface, offline fallback, tests, and a docs row.
