// Erinnerungen prüfen und anzeigen – läuft im Service Worker (Hintergrund-Prüfung) und beim Öffnen der App.
// Liest nur die lokale Kopie (IndexedDB), braucht also weder Netz noch Anmeldung.
import { JAHRE } from '../konfig'
import type { Beleg } from '../fachlich/beleg'
import { erinnerungen, neue, type Erinnerung } from '../fachlich/erinnerungen'
import { belegCache, warteschlange } from './speicher'
import type { Stamm } from './stamm'

export const GEZEIGT = 'erinnert'
export const SYNC_TAG = 'steuerbeleg-erinnerungen'

const heute = () => new Date().toISOString().slice(0, 10)

/** Alle aktuellen Erinnerungen aller Jahre mit lokaler Kopie. */
export async function aktuelleErinnerungen(): Promise<Erinnerung[]> {
  const wartend = (await warteschlange.alle()).map((w) => w.entwurf as unknown as Beleg)
  const l: Erinnerung[] = []
  for (const j of JAHRE) {
    const stamm = await belegCache.liesRoh<Stamm>(`stamm_${j}`)
    if (!stamm) continue // Jahr auf diesem Gerät nie geöffnet
    const belege = [...(await belegCache.lies(j)), ...wartend.filter((w) => (w.zahlungsdatum || w.belegdatum).startsWith(String(j)))]
    l.push(...erinnerungen(j, { vorlagen: stamm.vorlagen ?? [], bescheidKopf: stamm.bescheidKopf, belege }, heute()))
  }
  return l
}

/** Zeigt alle noch nicht gezeigten Erinnerungen an und merkt sie sich. Gibt die Anzahl zurück. */
export async function erinnere(zeige: (e: Erinnerung) => Promise<void>): Promise<number> {
  const gezeigt = (await belegCache.liesRoh<Record<string, string>>(GEZEIGT)) ?? {}
  const n = neue(await aktuelleErinnerungen(), gezeigt)
  for (const e of n) { await zeige(e); gezeigt[e.id] = heute() }
  if (n.length) await belegCache.schreibeRoh(GEZEIGT, gezeigt)
  return n.length
}

/** Benachrichtigung über den Service Worker (funktioniert auf Android auch, wenn die App im Hintergrund ist). */
export const zeigeMit = (reg: ServiceWorkerRegistration) => (e: Erinnerung) =>
  reg.showNotification(e.titel, { body: e.text, tag: e.id, icon: 'icon-192.png', badge: 'icon-192.png', data: { ziel: e.ziel } })

export const kannBenachrichtigen = () => typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

/** Beim Start der App: neue Erinnerungen zeigen, wenn erlaubt. */
export async function erinnereBeimStart() {
  if (!kannBenachrichtigen() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  await erinnere(zeigeMit(reg)).catch(() => 0)
}
