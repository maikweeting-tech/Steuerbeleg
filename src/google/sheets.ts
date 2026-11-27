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
  if (fehlend.length) {
    await googleFetch(`${SHEETS}/${sheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: fehlend.map((n) => ({ range: `'${n}'!A1`, values: [BLAETTER[n]] })),
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
