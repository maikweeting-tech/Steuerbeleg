// Dokumentenablage in Drive: Ordner „Steuer/Dokumente“ mit Unterordnern und Liste „00_Dokumente“ (ein Blatt).
// Unabhängig vom Steuerjahr. Nur online.
import { googleFetch } from '../google/api'
import { erstelle, findeInOrdner, holeOderErstelleOrdner, holeOderErstellePfad, inPapierkorb, ladeHochGross, SHEET_MIME } from '../google/drive'
import { gespeicherteWurzel } from './einrichtung'
import { nutzerEmail } from './dienste'
import {
  DOKUMENT_SPALTEN, dokumentAusZeile, dokumentDateiname, dokumentPfad, zeileAusDokument, type Dokument,
} from '../fachlich/dokumente'

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'
export const ABLAGE_ORDNER = 'Dokumente'
export const LISTE = '00_Dokumente'
const letzte = String.fromCharCode(64 + DOKUMENT_SPALTEN.length) // K

let ablage: { ordnerId: string; listeId: string } | null = null

/** Ordner und Liste finden bzw. anlegen (Kopfzeile in das erste Blatt). */
export async function holeAblage(): Promise<{ ordnerId: string; listeId: string }> {
  if (ablage) return ablage
  const wurzel = gespeicherteWurzel()
  if (!wurzel) throw new Error('Kein Ordner „Steuer“ verbunden (Start → Ordner verbinden).')
  const ordner = await holeOderErstelleOrdner(ABLAGE_ORDNER, wurzel)
  let liste = await findeInOrdner(LISTE, ordner.id, SHEET_MIME)
  if (!liste) {
    liste = await erstelle(LISTE, SHEET_MIME, ordner.id)
    await googleFetch(`${SHEETS}/${liste.id}/values/A1?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [[...DOKUMENT_SPALTEN]] }) })
  }
  ablage = { ordnerId: ordner.id, listeId: liste.id }
  return ablage
}

export async function ladeDokumente(): Promise<Dokument[]> {
  const { listeId } = await holeAblage()
  const d = await googleFetch(`${SHEETS}/${listeId}/values/${encodeURIComponent(`A2:${letzte}`)}?valueRenderOption=FORMATTED_VALUE`)
  return ((d.values ?? []) as string[][]).filter((z) => z[0]).map(dokumentAusZeile)
}

/** Lädt die Datei in den passenden Unterordner und trägt das Dokument in die Liste ein. */
export async function speichereDokument(
  e: Omit<Dokument, 'id' | 'datei_id' | 'dateiname' | 'erfasst_von' | 'erfasst_am'>, datei: File,
  objekte: { id: string; bezeichnung: string }[], personen: { id: string; name: string }[],
): Promise<Dokument> {
  const { ordnerId, listeId } = await holeAblage()
  const ziel = await holeOderErstellePfad(dokumentPfad(e, objekte, personen), ordnerId)
  const name = dokumentDateiname(e.art, e.titel, datei.name)
  const hoch = await ladeHochGross(name, datei.type || 'application/pdf', datei, ziel.id)
  const d: Dokument = { ...e, id: crypto.randomUUID(), datei_id: hoch.id, dateiname: hoch.name, erfasst_von: nutzerEmail(), erfasst_am: new Date().toISOString() }
  await googleFetch(`${SHEETS}/${listeId}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ values: [zeileAusDokument(d)] }) })
  return d
}

/** Eintrag aus der Liste entfernen und Datei in den Papierkorb legen. */
export async function loescheDokument(d: Dokument): Promise<void> {
  const { listeId } = await holeAblage()
  const ids = await googleFetch(`${SHEETS}/${listeId}/values/A:A`)
  const idx = ((ids.values ?? []) as string[][]).findIndex((z) => z[0] === d.id)
  if (idx < 1) throw new Error('Eintrag nicht gefunden – bitte neu laden.')
  await googleFetch(`${SHEETS}/${listeId}/values/${encodeURIComponent(`A${idx + 1}:${letzte}${idx + 1}`)}:clear`, { method: 'POST', body: '{}' })
  if (d.datei_id) await inPapierkorb(d.datei_id).catch(() => undefined)
}
