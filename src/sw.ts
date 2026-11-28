/// <reference lib="webworker" />
// Service Worker: Offline-Start der App (Precache) und Empfang geteilter Dateien (Android).
// Google-Anfragen werden NICHT zwischengespeichert (Steuerdaten, Tokens).
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'
import { erinnere, SYNC_TAG, zeigeMit } from './daten/erinnern'

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

// Erinnerungen im Hintergrund (Periodic Background Sync: nur Chrome/Android, installierte App, Takt bestimmt der Browser)
interface PeriodicSyncEvent extends ExtendableEvent { tag: string }
self.addEventListener('periodicsync' as keyof ServiceWorkerGlobalScopeEventMap, ((event: PeriodicSyncEvent) => {
  if (event.tag !== SYNC_TAG) return
  event.waitUntil(erinnere(zeigeMit(self.registration)).catch(() => 0))
}) as EventListener)

// Tippen auf die Benachrichtigung öffnet die passende Seite der App
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const ziel = (event.notification.data as { ziel?: string } | undefined)?.ziel ?? '/'
  const url = `${self.registration.scope}#${ziel}`
  event.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const offen = fenster[0] as WindowClient | undefined
    if (offen) { await offen.navigate(url).catch(() => undefined); return offen.focus() }
    return self.clients.openWindow(url)
  })())
})
