// Verdrahtung der Synchronisierung mit Google und IndexedDB sowie automatischer Start.
import { KONFIGURATIONEN } from '../konfig'
import { istAngemeldet } from '../google/auth'
import { findeBelegDatei, findeInOrdner, holeOderErstellePfad, ladeHoch, ORDNER_MIME, SHEET_MIME } from '../google/drive'
import { haengeAn, leseBlatt } from '../google/sheets'
import { gespeicherteWurzel } from './einrichtung'
import { belegCache, melde, warteschlange } from './speicher'
import { ladeBelege, synchronisiere, type SyncDienste, type SyncErgebnis } from './sync'

export function nutzerEmail(): string {
  try { return localStorage.getItem('steuerbeleg.email') ?? '' } catch { return '' }
}

export const dienste: SyncDienste = {
  konfigs: KONFIGURATIONEN,
  wurzelId: gespeicherteWurzel,
  nutzer: nutzerEmail,
  jetzt: () => new Date().toISOString(),
  findeOrdner: (n, e) => findeInOrdner(n, e, ORDNER_MIME),
  findeSheet: (n, e) => findeInOrdner(n, e, SHEET_MIME),
  holeOderErstellePfad,
  findeBelegDatei,
  ladeHoch,
  leseBlatt,
  haengeAn,
}

export const syncStatus = { laeuft: false, letztes: null as SyncErgebnis | null }

/** Startet die Übertragung, wenn angemeldet und online. Läuft nie doppelt. */
export async function starteSync(): Promise<SyncErgebnis | null> {
  if (syncStatus.laeuft || !istAngemeldet() || !navigator.onLine) return null
  syncStatus.laeuft = true
  melde()
  try {
    syncStatus.letztes = await synchronisiere(dienste, {
      alle: warteschlange.alle,
      speichere: warteschlange.speichere,
      entferne: warteschlange.entferne,
      cacheSchreiben: belegCache.schreibe,
    })
    return syncStatus.letztes
  } finally {
    syncStatus.laeuft = false
    melde()
  }
}

/** Belegindex neu lesen und lokal zwischenspeichern. */
export async function aktualisiereBelege(jahr: number) {
  const b = await ladeBelege(jahr, dienste)
  await belegCache.schreibe(jahr, b)
  return b
}

export function automatischerSync() {
  window.addEventListener('online', () => void starteSync())
  void starteSync()
}
