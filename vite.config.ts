import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 3002,
  },
  plugins: [
    VitePWA({
      // App-shell is fully static: precache everything emitted to dist/.
      // Runtime caches are version-pinned (cache names include NOVA v1) and
      // same-origin-av only — no third-party requests are ever cached or made.
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'icons/*.png', 'audio/**/*.ogg'],
      manifest: false, // we ship our own public/manifest.webmanifest
      workbox: {
        cacheId: 'nova-v1',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Single-page app: offline navigations fall back to precached shell.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nova-same-origin-v1',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
