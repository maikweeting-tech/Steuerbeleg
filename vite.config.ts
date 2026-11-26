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
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // Google-Anfragen nie zwischenspeichern (Steuerdaten, Tokens)
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
}))
