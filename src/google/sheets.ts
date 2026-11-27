// Belegindex als Google Sheet mit festen Tabellenblättern und Kopfzeilen.
import { googleFetch } from './api'
import { erstelle, findeInOrdner, SHEET_MIME, type DriveDatei } from './drive'
import { BLAETTER, belegindexName } from '../daten/schema'

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'

export async function holeOderErstelleBelegindex(jahr: number, jahresOrdnerId: string): Promise<DriveDatei> {
  const name = belegindexName(jahr)
  const vorhanden = await findeInOrdner(name, jahresOrdnerId, SHEET_MIME)
  if (vorhanden) {
    await ergaenzeBlaetter(vorhanden.id)
    return vorhanden
  }
  const neu = await erstelle(name, SHEET_MIME, jahresOrdnerId)
  await ergaenzeBlaetter(neu.id)
  return neu
}

/** Legt fehlende Blätter an und schreibt Kopfzeilen. Bestehende Daten bleiben unberührt. */
export async function ergaenzeBlaetter(sheetId: string) {
  const info = await googleFetch(`${SHEETS}/${sheetId}?fields=sheets.properties`)
  const vorhanden: { title: string; sheetId: number }[] = info.sheets.map((s: { properties: { title: string; sheetId: number } }) => s.properties)
  const namen = new Set(vorhanden.map((s) => s.title))
  const fehlend = Object.keys(BLAETTER).filter((n) => !namen.has(n))
  const requests: object[] = fehlend.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }))
  // Das Standardblatt "Tabelle1"/"Sheet1" eines neuen Sheets entfernen
  const standard = vorhanden.find((s) => /^(Tabelle1|Sheet1|Blatt 1)$/.test(s.title))
  if (requests.length && standard && vorhanden.length === 1) requests.push({ deleteSheet: { sheetId: standard.sheetId } })
  if (requests.length) await googleFetch(`${SHEETS}/${sheetId}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests }) })
  // Kopfzeilen schreiben: neue Blätter vollständig, bestehende nur, wenn Spalten am Ende fehlen
  const bestehend = Object.keys(BLAETTER).filter((n) => namen.has(n))
  const koepfe: Record<string, string[]> = {}
  if (bestehend.length) {
    const p = new URLSearchParams()
    bestehend.forEach((n) => p.append('ranges', `'${n}'!1:1`))
    const d = await googleFetch(`${SHEETS}/${sheetId}/values:batchGet?${p}`)
    bestehend.forEach((n, i) => { koepfe[n] = (d.valueRanges?.[i]?.values?.[0] ?? []) as string[] })
  }
  const zuSchreiben = Object.keys(BLAETTER).filter((n) => fehlend.includes(n) || (koepfe[n] ?? []).length < BLAETTER[n].length)
  if (zuSchreiben.length) {
    await googleFetch(`${SHEETS}/${sheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: zuSchreiben.map((n) => ({ range: `'${n}'!A1`, values: [BLAETTER[n]] })),
      }),
    })
  }
}

type Zelle = string | number

/** Liest alle Zeilen eines Blatts ohne Kopfzeile (Zahlen als Zahlen). */
export async function leseBlatt(sheetId: string, blatt: string): Promise<Zelle[][]> {
  const p = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' })
  const d = await googleFetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(`'${blatt}'!A2:ZZ`)}?${p}`)
  return d.values ?? []
}

/** Hängt Zeilen unten an (RAW: Texte bleiben Texte, z. B. Datum JJJJ-MM-TT). */
export async function haengeAn(sheetId: string, blatt: string, zeilen: Zelle[][]) {
  const p = new URLSearchParams({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })
  await googleFetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(`'${blatt}'!A1`)}:append?${p}`, {
    method: 'POST',
    body: JSON.stringify({ values: zeilen }),
  })
}

/** Spaltenbuchstabe für Spalte n (1 = A). */
export function spalte(n: number): string {
  let s = ''
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** Überschreibt die Zeile mit der Id in Spalte A (Zeilennummer wird gesucht). Gibt false zurück, wenn nicht gefunden. */
export async function ersetzeZeile(sheetId: string, blatt: string, id: string, zeile: Zelle[] | null): Promise<boolean> {
  const ids = await googleFetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(`'${blatt}'!A:A`)}`)
  const idx = ((ids.values ?? []) as string[][]).findIndex((z) => z[0] === id)
  if (idx < 1) return false
  const nr = idx + 1
  if (zeile === null) {
    // Leeren statt Löschen: Zeilennummern anderer Einträge bleiben stabil; leere Zeilen werden beim Lesen übersprungen
    await googleFetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(`'${blatt}'!A${nr}:${spalte(BLAETTER[blatt].length)}${nr}`)}:clear`, { method: 'POST', body: '{}' })
  } else {
    const p = new URLSearchParams({ valueInputOption: 'RAW' })
    await googleFetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(`'${blatt}'!A${nr}`)}?${p}`, { method: 'PUT', body: JSON.stringify({ values: [zeile] }) })
  }
  return true
}

/** Leert alle Zeilen mit dieser Id in Spalte A (z. B. alle Anteile eines Belegs im Blatt Aufteilung). */
export async function leereZeilen(sheetId: string, blatt: string, id: string): Promise<number> {
  const ids = await googleFetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(`'${blatt}'!A:A`)}`)
  const nummern = ((ids.values ?? []) as string[][]).flatMap((z, i) => (i > 0 && z[0] === id ? [i + 1] : []))
  if (!nummern.length) return 0
  const ende = spalte(BLAETTER[blatt].length)
  await googleFetch(`${SHEETS}/${sheetId}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({ ranges: nummern.map((n) => `'${blatt}'!A${n}:${ende}${n}`) }),
  })
  return nummern.length
}
