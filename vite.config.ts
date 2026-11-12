import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// A real PNG at public/art/<name>.png replaces the coded pixel scene of that name.
const artDir = fileURLToPath(new URL('./public/art', import.meta.url));
const artOverrides = existsSync(artDir)
  ? readdirSync(artDir)
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.slice(0, -4))
  : [];

export default defineConfig({
  // Relative base so the build works at any path on any static host.
  base: './',
  define: {
    __ART_OVERRIDES__: JSON.stringify(artOverrides),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg', 'art/*.png'],
      manifest: {
        name: 'Quest Journal',
        short_name: 'Quest Journal',
        description: 'Play branching stories, choose your path, keep notes.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#15131C',
        theme_color: '#15131C',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 30000,
  },
});
