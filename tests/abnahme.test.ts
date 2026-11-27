// @vitest-environment node
// M8 Abnahmetest (automatisch): Handyfoto → PDF → Drive → Belegindex → Excel-Summe.
// Drive und Sheets sind im Speicher nachgebildet; Excel wird mit LibreOffice neu berechnet.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { erstellePdf } from '../src/erfassung/pdf'
import { ladeBelege, synchronisiere, type Ablage, type SyncDienste } from '../src/daten/sync'
import type { Wartend } from '../src/daten/speicher'
import { leererEntwurf, type Beleg } from '../src/fachlich/beleg'
import { LEER } from '../src/daten/stamm'
import { KONFIGURATIONEN } from '../src/konfig'
import { erstelleExcel } from '../src/export/excel'
import { summenJeKategorie } from '../src/export/auswertung'

const soffice = ['/usr/bin/soffice', '/usr/bin/libreoffice'].find((p) => existsSync(p))
const FOTO = readFileSync(join(__dirname, 'hilfen', 'beleg.jpg'))

function drive() {
  const blaetter: Record<string, (string | number)[][]> = { Belege: [], Protokoll: [], Objekte: [], Aufteilung: [], Kinder: [] }
  const dateien: { id: string; name: string; pfad: string; inhalt: Blob; app: Record<string, string> }[] = []
  const d: SyncDienste = {
    konfigs: KONFIGURATIONEN, wurzelId: () => 'W', nutzer: () => 'maik@x.de', jetzt: () => '2026-11-27T19:00:00Z',
    findeOrdner: async (n) => (n === '2026' ? { id: 'J2026' } : null),
    findeSheet: async () => ({ id: 'S' }),
    holeOderErstellePfad: async (p) => ({ id: p.join('/') }),
    findeBelegDatei: async (id) => dateien.find((f) => f.app.steuerbeleg_beleg === id) ?? null,
    ladeHoch: async (name, _m, inhalt, pfad, app) => { const f = { id: 'F' + dateien.length, name, pfad, inhalt, app: app ?? {} }; dateien.push(f); return f },
    leseBlatt: async (_s, b) => blaetter[b] ?? [],
    haengeAn: async (_s, b, z) => { (blaetter[b] ??= []).push(...z) },
  }
  let liste: Wartend[] = []
  const a: Ablage = {
    alle: async () => [...liste], speichere: async (w) => { liste = [...liste.filter((x) => x.id !== w.id), w] },
    entferne: async (id) => { liste = liste.filter((x) => x.id !== id) }, cacheSchreiben: async () => undefined,
  }
  return { d, a, dateien, blaetter, setze: (l: Wartend[]) => { liste = l } }
}

describe('Abnahme M8', () => {
  it.skipIf(!soffice)('Foto → Drive → Index → Excel-Summe stimmt', async () => {
    // 1. „Handyfoto“ zu PDF
    const { pdf, seiten } = await erstellePdf([{ art: 'jpeg', daten: FOTO.buffer.slice(FOTO.byteOffset, FOTO.byteOffset + FOTO.byteLength) as ArrayBuffer }])
    expect(seiten).toBe(1)
    const e = (id: string, x: Partial<Beleg>): Wartend => ({
      id, pdf, seiten: 1, erfasst_von: 'maik@x.de', erfasst_am: `2026-11-27T18:0${id.length}:00Z`, versuche: 0,
      entwurf: { ...leererEntwurf(id), belegdatum: '2026-03-14', zahlungsdatum: '2026-03-14', person: 'maik', ...x },
    })
    const g = drive()
    g.setze([
      e('a', { betrag_ct: 4999, aussteller: 'Bürobedarf Kalkar', modul: 'N', kategorie: 'arbeitsmittel' }),
      e('bb', { betrag_ct: 12345, aussteller: 'Physio Weber', modul: 'AGB', kategorie: 'krankheitskosten', person: 'anna' }),
      e('ccc', { betrag_ct: 100001, aussteller: 'Hendriks', modul: '35A', kategorie: 'handwerker', person: 'gemeinsam', arbeitskosten_ct: 60001, material_ct: 40000, zahlungsart: 'unbar' }),
    ])
    // 2. Übertragen: Drive-Ablage + Zeile im Belegindex
    expect(await synchronisiere(g.d, g.a)).toEqual({ uebertragen: 3, fehler: 0 })
    expect(g.dateien).toHaveLength(3)
    expect(g.dateien[0].name).toBe('2026-03-14_B0001_Bürobedarf-Kalkar_49,99EUR.pdf')
    expect((await PDFDocument.load(await g.dateien[0].inhalt.arrayBuffer())).getPageCount()).toBe(1)
    expect(g.blaetter.Belege).toHaveLength(3)

    // 3. Index wieder lesen (wie die App beim Export)
    const belege = await ladeBelege(2026, g.d)
    expect(belege.map((b) => b.belegnr)).toEqual([1, 2, 3])
    expect(belege.every((b) => b.datei_ids.startsWith('F'))).toBe(true)

    // 4. Excel erstellen, mit LibreOffice neu berechnen, Summe vergleichen
    const daten = { jahr: 2026, konfig: KONFIGURATIONEN[2026], belege, stamm: LEER, vorjahr: null, erstellt: '2026-11-27T19:00:00Z' }
    const { buffer } = await erstelleExcel(daten, ExcelJS)
    const dir = mkdtempSync(join(tmpdir(), 'abn-'))
    writeFileSync(join(dir, 'ein.xlsx'), Buffer.from(buffer))
    execFileSync(soffice!, ['--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'aus'), join(dir, 'ein.xlsx')], { stdio: 'pipe', timeout: 90000, env: { ...process.env, HOME: dir } })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(readFileSync(join(dir, 'aus', 'ein.xlsx')).buffer as ArrayBuffer)
    const ue = wb.getWorksheet('Übersicht')!
    let gesamt: number | null = null
    const jeKat: Record<string, number> = {}
    ue.eachRow((r) => {
      const v = r.getCell(7).value as { result?: number } | number
      const zahl = typeof v === 'object' && v !== null ? (v.result ?? 0) : Number(v)
      if (r.getCell(2).value === 'Gesamt') gesamt = Math.round(zahl * 100)
      const kat = r.getCell(3).value
      if (typeof kat === 'string' && kat && kat !== '(Modul gesamt)' && r.number > 4) jeKat[`${r.getCell(1).value}|${kat}`] = Math.round(zahl * 100)
    })
    expect(gesamt).toBe(4999 + 12345 + 100001)
    for (const s of summenJeKategorie(daten)) expect(jeKat[`${s.modul}|${s.kategorie}`]).toBe(s.summe_ct)
    // Prüfblatt: alles OK
    const pr = wb.getWorksheet('Prüfung')!
    const nichtOk: string[] = []
    pr.eachRow((r, i) => { const v = r.getCell(4).value as { result?: string } | string; const t = typeof v === 'object' && v ? v.result : v; if (i >= 5 && t !== 'OK') nichtOk.push(String(r.getCell(1).value)) })
    expect(nichtOk).toEqual([])
  }, 120000)
})
