/// <reference lib="webworker" />
// Service Worker: Offline-Start der App (Precache) und Empfang geteilter Dateien (Android).
// Google-Anfragen werden NICHT zwischengespeichert (Steuerdaten, Tokens).
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

const GETEILT_CACHE = 'steuerbeleg-geteilt'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Ziel des Teilen-Menüs (manifest.share_target, POST multipart)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || !url.pathname.endsWith('/teilen')) return
  event.respondWith((async () => {
    const form = await event.request.formData()
    const c = await caches.open(GETEILT_CACHE)
    let i = 0
    for (const d of form.getAll('dateien')) {
      if (!(d instanceof File)) continue
      await c.put(`geteilt/${Date.now()}-${i++}`, new Response(d, {
        headers: { 'Content-Type': d.type || 'application/octet-stream', 'X-Dateiname': encodeURIComponent(d.name) },
      }))
    }
    const basis = new URL(self.registration.scope)
    return Response.redirect(`${basis.href}#/erfassen?geteilt=1`, 303)
  })())
})

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
