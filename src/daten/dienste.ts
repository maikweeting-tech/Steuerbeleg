// Verdrahtung der Synchronisierung mit Google und IndexedDB sowie automatischer Start.
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { istAngemeldet } from '../google/auth'
import { datei, findeBelegDatei, findeInOrdner, holeOderErstellePfad, ladeHoch, ladeHochGross, ORDNER_MIME, SHEET_MIME, verschiebeDatei } from '../google/drive'
import { ergaenzeBlaetter, ersetzeZeile, haengeAn, leereZeilen, leseBlatt } from '../google/sheets'
import { gespeicherteWurzel, richteEin } from './einrichtung'
import { belegCache, melde, warteschlange } from './speicher'
import { findeIndex, ladeBelege, synchronisiere, SyncFehler, type SyncDienste, type SyncErgebnis } from './sync'
import {
  LEER, stammAus, zeileAusArbeitstage, zeileAusEinheit, zeileAusEinnahme, zeileAusFahrt, zeileAusKind, zeileAusObjekt, zeileAusVorlage, zeileAusBuchung, zeileAusBescheid, zeileAusKopf, zeileAusAntwort, type Stamm,
} from './stamm'
import type { Vorlage } from '../fachlich/vorlagen'
import { KOPF_ID, type BescheidKopf, type BescheidPosten } from '../fachlich/bescheid'
import type { Buchung, Markierung } from '../fachlich/kontoauszug'
import { aendereBeleg, erledigeAuftraege } from './bearbeiten'
import type { Beleg, BelegEntwurf } from '../fachlich/beleg'
import type { Arbeitstage, Fahrt, Kind } from '../fachlich/personen'
import { ordnerName } from '../fachlich/konfiguration'
import type { Einheit, Einnahme, Objekt } from '../fachlich/objekte'

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
    // Lokale Kopie von Belegindex und Objekten auffrischen (für Offline-Erfassung und Duplikate)
    if (gespeicherteWurzel()) {
      // PDFs verschieben, die eine andere Person geändert hat, aber nur der Eigentümer verschieben darf
      await erledigeAuftraegeOnline(AKTUELLES_JAHR).catch(() => undefined)
      await aktualisiereBelege(AKTUELLES_JAHR).catch(() => undefined)
    }
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
  await ladeStamm(jahr)
  return b
}

export function automatischerSync() {
  window.addEventListener('online', () => void starteSync())
  void starteSync()
}

// ---------------------------------------------------------------- Stammdaten Anlage V (online)


const STAMM_BLAETTER = ['Objekte', 'Einheiten', 'Einnahmen', 'Aufteilung', 'Kinder', 'Fahrten', 'Arbeitstage', 'Auftraege', 'Vorlagen', 'Buchungen', 'Bescheid', 'Erklaerung']

export async function ladeStamm(jahr: number): Promise<Stamm> {
  const { indexId } = await findeIndex(jahr, dienste)
  const lesen = () => Promise.all(STAMM_BLAETTER.map((b) => leseBlatt(indexId, b)))
  // Belegindex aus M1/M2: fehlendes Blatt „Einnahmen“ bzw. neue Spalten einmalig ergänzen
  const zeilen = await lesen().catch(async () => { await ergaenzeBlaetter(indexId); return lesen() })
  const s = stammAus(Object.fromEntries(STAMM_BLAETTER.map((b, i) => [b, zeilen[i]])))
  await stammCache.schreibe(jahr, s)
  return s
}

async function protokoll(indexId: string, aktion: string, id: string, neu: string) {
  await haengeAn(indexId, 'Protokoll', [[new Date().toISOString(), nutzerEmail(), aktion, id, '', '', neu]])
}

/** Legt ein Objekt an (inkl. Ordner V_Vermietung/<Objekt>/<Kategorien>) oder ändert es. */
export async function speichereObjekt(jahr: number, o: Objekt) {
  const { indexId, ordnerId } = await findeIndex(jahr, dienste)
  const vorhanden = await ersetzeZeile(indexId, 'Objekte', o.id, zeileAusObjekt(o))
  if (!vorhanden) {
    await haengeAn(indexId, 'Objekte', [zeileAusObjekt(o)])
    const m = KONFIGURATIONEN[jahr].module.find((x) => x.ebene === 'objekt')
    if (m) {
      const basis = [...m.ordner.split('/').map(ordnerName), ordnerName(o.bezeichnung)]
      const objOrdner = await holeOderErstellePfad(basis, ordnerId)
      for (const k of m.kategorien) await holeOderErstellePfad([ordnerName(k.name)], objOrdner.id)
    }
  }
  await protokoll(indexId, vorhanden ? 'objekt geändert' : 'objekt angelegt', o.id, o.bezeichnung)
  return ladeStamm(jahr)
}

export async function speichereEinheit(jahr: number, e: Einheit, loeschen = false) {
  const { indexId } = await findeIndex(jahr, dienste)
  if (loeschen) await ersetzeZeile(indexId, 'Einheiten', e.id, null)
  else if (!(await ersetzeZeile(indexId, 'Einheiten', e.id, zeileAusEinheit(e)))) await haengeAn(indexId, 'Einheiten', [zeileAusEinheit(e)])
  await protokoll(indexId, loeschen ? 'einheit gelöscht' : 'einheit gespeichert', e.id, e.bezeichnung)
  return ladeStamm(jahr)
}

export async function speichereEinnahmen(jahr: number, liste: Einnahme[]) {
  const { indexId } = await findeIndex(jahr, dienste)
  await haengeAn(indexId, 'Einnahmen', liste.map(zeileAusEinnahme))
  await protokoll(indexId, 'einnahmen erfasst', liste[0]?.objekt_id ?? '', `${liste.length} Zeile(n)`)
  return ladeStamm(jahr)
}

export async function loescheEinnahme(jahr: number, id: string) {
  const { indexId } = await findeIndex(jahr, dienste)
  await ersetzeZeile(indexId, 'Einnahmen', id, null)
  await protokoll(indexId, 'einnahme gelöscht', id, '')
  return ladeStamm(jahr)
}

export const stammCache = {
  lies: async (jahr: number): Promise<Stamm> => ({ ...LEER, ...(await belegCache.liesRoh<Stamm>(`stamm_${jahr}`)) }),
  schreibe: (jahr: number, s: Stamm) => belegCache.schreibeRoh(`stamm_${jahr}`, s),
}

// ---------------------------------------------------------------- ab M4

/** E14: Beleg ändern (online). Danach Belegindex und Stammdaten neu laden. */
export async function aendereBelegOnline(jahr: number, alt: Beleg, neu: BelegEntwurf): Promise<Beleg & { pdfOffen?: boolean }> {
  const { indexId, ordnerId } = await findeIndex(jahr, dienste)
  const stamm = await ladeStamm(jahr)
  const b = await aendereBeleg(alt, neu, {
    konfig: KONFIGURATIONEN[jahr], indexId, ordnerId, stamm, nutzer: nutzerEmail, jetzt: () => new Date().toISOString(),
    leseBlatt, ersetzeZeile, leereZeilen, haengeAn, holeOderErstellePfad, verschiebeDatei,
  })
  await aktualisiereBelege(jahr)
  return b
}

export async function speichereKind(jahr: number, k: Kind, loeschen = false) {
  const { indexId } = await findeIndex(jahr, dienste)
  if (loeschen) await ersetzeZeile(indexId, 'Kinder', k.id, null)
  else if (!(await ersetzeZeile(indexId, 'Kinder', k.id, zeileAusKind(k)))) await haengeAn(indexId, 'Kinder', [zeileAusKind(k)])
  await protokoll(indexId, loeschen ? 'kind gelöscht' : 'kind gespeichert', k.id, k.name)
  return ladeStamm(jahr)
}

export async function speichereFahrten(jahr: number, liste: Fahrt[]) {
  const { indexId } = await findeIndex(jahr, dienste)
  await haengeAn(indexId, 'Fahrten', liste.map(zeileAusFahrt))
  await protokoll(indexId, 'fahrt erfasst', liste[0]?.id ?? '', `${liste.length} Fahrt(en)`)
  return ladeStamm(jahr)
}

export async function loescheFahrt(jahr: number, id: string) {
  const { indexId } = await findeIndex(jahr, dienste)
  await ersetzeZeile(indexId, 'Fahrten', id, null)
  await protokoll(indexId, 'fahrt gelöscht', id, '')
  return ladeStamm(jahr)
}

/** Arbeitstage: eine Zeile je Person (Spalte A) im Belegindex des Jahres. */
export async function speichereArbeitstage(jahr: number, a: Arbeitstage) {
  const { indexId } = await findeIndex(jahr, dienste)
  if (!(await ersetzeZeile(indexId, 'Arbeitstage', a.person, zeileAusArbeitstage(a)))) await haengeAn(indexId, 'Arbeitstage', [zeileAusArbeitstage(a)])
  await protokoll(indexId, 'arbeitstage gespeichert', a.person, `${a.arbeitstage} AT, ${a.homeoffice_tage} HO, ${a.entfernung_km ?? '–'} km`)
  return ladeStamm(jahr)
}

/** Offene Verschiebe-Aufträge erledigen, soweit dieses Konto die PDFs verschieben darf. */
export async function erledigeAuftraegeOnline(jahr: number): Promise<number> {
  const { indexId, ordnerId } = await findeIndex(jahr, dienste)
  const zeilen = await leseBlatt(indexId, 'Auftraege').catch(() => [])
  if (!zeilen.some((z) => z[0] && !z[8])) return 0
  return erledigeAuftraege({ indexId, ordnerId, jetzt: () => new Date().toISOString(), leseBlatt: async () => zeilen, ersetzeZeile, holeOderErstellePfad, verschiebeDatei })
}

// ---------------------------------------------------------------- ab M6

export async function speichereVorlage(jahr: number, v: Vorlage, loeschen = false) {
  const { indexId } = await findeIndex(jahr, dienste)
  if (loeschen) await ersetzeZeile(indexId, 'Vorlagen', v.id, null)
  else if (!(await ersetzeZeile(indexId, 'Vorlagen', v.id, zeileAusVorlage(v)))) await haengeAn(indexId, 'Vorlagen', [zeileAusVorlage(v)])
  await protokoll(indexId, loeschen ? 'vorlage gelöscht' : 'vorlage gespeichert', v.id, v.bezeichnung)
  return ladeStamm(jahr)
}

/** E7: Buchung markieren (gespeichert wird nur diese eine Buchung, nicht der ganze Kontoauszug). */
export async function markiereBuchung(jahr: number, b: Buchung, m: Markierung | null, beleg_id = '', notiz = '') {
  const { indexId } = await findeIndex(jahr, dienste)
  if (m === null) await ersetzeZeile(indexId, 'Buchungen', b.id, null)
  else {
    const z = zeileAusBuchung(b, m, beleg_id, notiz, nutzerEmail(), new Date().toISOString())
    if (!(await ersetzeZeile(indexId, 'Buchungen', b.id, z))) await haengeAn(indexId, 'Buchungen', [z])
  }
  return ladeStamm(jahr)
}

/** Belegindex des Vorjahres für den Jahresvergleich (E11); null, wenn es keinen gibt. */
export async function ladeVorjahr(jahr: number): Promise<Beleg[] | null> {
  if (!gespeicherteWurzel()) return null
  try { return await ladeBelege(jahr - 1, dienste) } catch { return null }
}

/** Speichert eine Exportdatei in Steuer/<Jahr>/Export (großer Upload, resumable). */
export async function speichereExport(jahr: number, name: string, mimeType: string, inhalt: Blob) {
  const wurzel = gespeicherteWurzel()
  if (!wurzel) throw new Error('Kein Ordner „Steuer“ verbunden.')
  const ordner = await holeOderErstellePfad([String(jahr), 'Export'], wurzel)
  return ladeHochGross(name, mimeType, inhalt, ordner.id)
}

// ---------------------------------------------------------------- ab M8: Bescheid-Abgleich (E12)

export async function speichereBescheidPosten(jahr: number, p: BescheidPosten, loeschen = false) {
  const { indexId } = await findeIndex(jahr, dienste)
  const z = zeileAusBescheid(p, nutzerEmail(), new Date().toISOString())
  if (loeschen) await ersetzeZeile(indexId, 'Bescheid', p.id, null)
  else if (!(await ersetzeZeile(indexId, 'Bescheid', p.id, z))) await haengeAn(indexId, 'Bescheid', [z])
  await protokoll(indexId, loeschen ? 'bescheidposten gelöscht' : 'bescheidposten gespeichert', p.id, p.bezeichnung)
  return ladeStamm(jahr)
}

export async function speichereBescheidPostenListe(jahr: number, l: BescheidPosten[]) {
  const { indexId } = await findeIndex(jahr, dienste)
  const am = new Date().toISOString()
  if (l.length) await haengeAn(indexId, 'Bescheid', l.map((p) => zeileAusBescheid(p, nutzerEmail(), am)))
  return ladeStamm(jahr)
}

export async function speichereBescheidKopf(jahr: number, k: BescheidKopf) {
  const { indexId } = await findeIndex(jahr, dienste)
  const z = zeileAusKopf(k, nutzerEmail(), new Date().toISOString())
  if (!(await ersetzeZeile(indexId, 'Bescheid', KOPF_ID, z))) await haengeAn(indexId, 'Bescheid', [z])
  return ladeStamm(jahr)
}

/**
 * Objekte, Einheiten und Kinder aus einem anderen Steuerjahr übernehmen (z. B. 2026 → 2024).
 * Übernimmt nur, was im Zieljahr noch fehlt (gleiche Id). Ordner für Objekte werden angelegt.
 */
export async function uebernehmeStamm(von: number, nach: number): Promise<{ objekte: number; einheiten: number; kinder: number }> {
  const [q, z] = [await ladeStamm(von), await ladeStamm(nach)]
  const neu = <T extends { id: string }>(l: T[], da: T[]) => l.filter((x) => !da.some((y) => y.id === x.id))
  const o = neu(q.objekte, z.objekte), e = neu(q.einheiten, z.einheiten), k = neu(q.kinder, z.kinder)
  for (const x of o) await speichereObjekt(nach, x)
  for (const x of e) await speichereEinheit(nach, x)
  for (const x of k) await speichereKind(nach, x)
  await ladeStamm(nach)
  return { objekte: o.length, einheiten: e.length, kinder: k.length }
}

// ---------------------------------------------------------------- ab S1: Erklärungs-Assistent

/** Speichert eine Antwort (leerer Wert und leere Notiz = Antwort löschen). */
export async function speichereAntwort(jahr: number, id: string, wert: string, notiz: string) {
  const { indexId } = await findeIndex(jahr, dienste)
  if (!wert && !notiz) await ersetzeZeile(indexId, 'Erklaerung', id, null)
  else {
    const z = zeileAusAntwort(id, wert, notiz, nutzerEmail(), new Date().toISOString())
    if (!(await ersetzeZeile(indexId, 'Erklaerung', id, z))) await haengeAn(indexId, 'Erklaerung', [z])
  }
  return ladeStamm(jahr)
}

/** Gibt es Ordner und Belegindex des Jahres? null = unbekannt (offline, nicht angemeldet, kein Ordner verbunden). */
export async function jahrAngelegt(jahr: number): Promise<boolean | null> {
  if (!istAngemeldet() || !navigator.onLine || !gespeicherteWurzel()) return null
  try { await findeIndex(jahr, dienste); return true } catch (e) { return e instanceof SyncFehler ? false : null }
}

/** Legt Ordnerstruktur und Belegindex eines Jahres im verbundenen Ordner „Steuer“ an. */
export async function legeJahrAn(jahr: number, fortschritt: (t: string) => void) {
  const wurzel = gespeicherteWurzel()
  if (!wurzel) throw new Error('Kein Ordner „Steuer“ verbunden.')
  const e = await richteEin(KONFIGURATIONEN[jahr], fortschritt, await datei(wurzel))
  await aktualisiereBelege(jahr).catch(() => undefined)
  return e
}
