import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/datavital-ai-demo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DataVital AI Healthcare Intelligence Demo',
        short_name: 'DataVital AI',
        theme_color: '#0B6E6E',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/datavital-ai-demo/',
        lang: 'en',
        dir: 'auto' as 'ltr',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Prefer freshness for app shell; never cache /api
        mode: 'development',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/datavital-ai-demo/index.html',
        navigateFallbackDenylist: [/^\/api\//, /refresh\.html$/],

        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],
        runtimeCaching: [
          {
            // Never cache API — stale beds/summary shells look like a broken dashboard
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // HTML navigations: network only so public demos never stick on an old shell
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'font' ||
              /\.(?:js|css|woff2?|ttf|eot)$/i.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-assets-v23',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 6,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Local design proof can target staging when DESIGN_API_TARGET is set.
        target: process.env.DESIGN_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
