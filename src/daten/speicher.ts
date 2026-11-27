// Lokaler Speicher im Browser (IndexedDB): Warteschlange für noch nicht hochgeladene Belege
// und eine Kopie des Belegindex für Offline-Anzeige und Duplikat-Prüfung.
import type { Beleg, BelegEntwurf } from '../fachlich/beleg'

export interface Wartend {
  id: string
  entwurf: BelegEntwurf
  pdf: Blob
  seiten: number
  erfasst_von: string
  erfasst_am: string
  versuche: number
  fehler?: string
}

const DB = 'steuerbeleg'
const VERSION = 1
const WS = 'warteschlange'
const CACHE = 'cache'

let offen: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (offen) return offen
  offen = new Promise((ok, fehler) => {
    const r = indexedDB.open(DB, VERSION)
    r.onupgradeneeded = () => {
      const d = r.result
      if (!d.objectStoreNames.contains(WS)) d.createObjectStore(WS, { keyPath: 'id' })
      if (!d.objectStoreNames.contains(CACHE)) d.createObjectStore(CACHE)
    }
    r.onsuccess = () => ok(r.result)
    r.onerror = () => { offen = null; fehler(r.error) }
  })
  return offen
}

function anfrage<T>(store: string, modus: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then((d) => new Promise<T>((ok, fehler) => {
    const tx = d.transaction(store, modus)
    const r = f(tx.objectStore(store))
    tx.oncomplete = () => ok(r.result as T)
    tx.onerror = () => fehler(tx.error)
    tx.onabort = () => fehler(tx.error)
  }))
}

export const warteschlange = {
  alle: () => anfrage<Wartend[]>(WS, 'readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => a.erfasst_am.localeCompare(b.erfasst_am))),
  speichere: (w: Wartend) => anfrage<IDBValidKey>(WS, 'readwrite', (s) => s.put(w)).then(() => melde()),
  entferne: (id: string) => anfrage<undefined>(WS, 'readwrite', (s) => s.delete(id)).then(() => melde()),
}

export const belegCache = {
  lies: (jahr: number) => anfrage<Beleg[] | undefined>(CACHE, 'readonly', (s) => s.get(`belege_${jahr}`)).then((x) => x ?? []),
  schreibe: (jahr: number, b: Beleg[]) => anfrage<IDBValidKey>(CACHE, 'readwrite', (s) => s.put(b, `belege_${jahr}`)).then(() => melde()),
}

// Einfache Benachrichtigung der Oberfläche bei Änderungen
const hoerer = new Set<() => void>()
export function beiAenderung(f: () => void): () => void {
  hoerer.add(f)
  return () => hoerer.delete(f)
}
export function melde() {
  hoerer.forEach((f) => f())
}
