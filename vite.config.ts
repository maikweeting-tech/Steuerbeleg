/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Adresse auf GitHub Pages: https://maikweeting-tech.github.io/Steuerbeleg/
// "base" muss genau dem Repository-Namen entsprechen (Groß-/Kleinschreibung beachten).
const BASE = '/Steuerbeleg/'

export default defineConfig(() => ({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version + (process.env.GITHUB_SHA ? '+' + process.env.GITHUB_SHA.slice(0, 7) : '')) },
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Eigener Service Worker (src/sw.ts) wegen Teilen-Ziel für Android
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,ico,wasm}'] },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Steuerbeleg',
        short_name: 'Steuerbeleg',
        description: 'Belege für die Einkommensteuererklärung sammeln und ordnen',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f5f8b',
        shortcuts: [
          { name: 'Beleg fotografieren', short_name: 'Beleg', url: './#/erfassen', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Belege ansehen', short_name: 'Belege', url: './#/belege', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
        share_target: {
          action: 'teilen',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { files: [{ name: 'dateien', accept: ['image/*', 'application/pdf', '.pdf', '.jpg', '.jpeg', '.png'] }] },
        },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
}))
