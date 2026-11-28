import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { afaImJahr, afaSatz, leereAfa, rechneAfa, type AfaEingabe } from '../src/fachlich/afa'
import { erstelleAfaExcel, Z } from '../src/export/afaExcel'
import { afaAusZeile, zeileAusAfa } from '../src/daten/stamm'

// Beispiel mit erfundenen Zahlen (keine echten Daten)
const beispiel = (x: Partial<AfaEingabe> = {}): AfaEingabe => ({
  ...leereAfa('o1'), kaufpreis_ct: 25_000_000, grunderwerbsteuer_ct: 1_625_000, notar_ct: 300_000, grundbuch_ct: 120_000, makler_ct: 892_500,
  grundanteil_prozent: 20, fertigstellungsjahr: 1975, uebergang: '2024-07-15', ...x,
})

describe('AfA-Satz (§ 7 Abs. 4 EStG, prüfen)', () => {
  it('Grenzen 1925 und 2023', () => {
    expect(afaSatz(1924).prozent).toBe(2.5)
    expect(afaSatz(1925).prozent).toBe(2)
    expect(afaSatz(2022).prozent).toBe(2)
    expect(afaSatz(2023).prozent).toBe(3)
  })
})

describe('AfA-Hilfsrechnung', () => {
  it('rechnet das Beispiel wie von Hand', () => {
    // Handrechnung: NK 16.250 + 3.000 + 1.200 + 8.925 = 29.375; AK 279.375; Boden 20 % = 55.875; Gebäude 223.500
    // 2 % = 4.470 je Jahr; 2024 ab Juli 6 Monate = 2.235
    const r = rechneAfa(beispiel())
    expect(r.fehlt).toEqual([])
    expect(r.kaufnebenkosten_ct).toBe(2_937_500)
    expect(r.anschaffungskosten_ct).toBe(27_937_500)
    expect(r.boden_ct).toBe(5_587_500)
    expect(r.bemessung_ct).toBe(22_350_000)
    expect(r.jahresbetrag_ct).toBe(447_000)
    expect(r.tabelle[0]).toEqual({ jahr: 2024, monate: 6, betrag_ct: 223_500, restwert_ct: 22_126_500 })
    expect(afaImJahr(r, 2025)).toBe(447_000)
    // 50 Jahre + halbes Startjahr → letzte Rate 2074 mit dem Rest
    expect(r.tabelle.length).toBe(51)
    expect(r.tabelle[50]).toEqual({ jahr: 2074, monate: 12, betrag_ct: 223_500, restwert_ct: 0 })
    expect(r.tabelle.reduce((s, t) => s + t.betrag_ct, 0)).toBe(r.bemessung_ct)
  })

  it('Eigennutzung kürzt die Bemessungsgrundlage', () => {
    expect(rechneAfa(beispiel({ eigennutzung_prozent: 25 })).bemessung_ct).toBe(16_762_500)
  })

  it('anschaffungsnahe Herstellungskosten nur über 15 %', () => {
    // 15 % von 223.500 = 33.525
    expect(rechneAfa(beispiel({ renovierung_ct: 3_000_000 })).anschaffungsnah_ct).toBe(0)
    const r = rechneAfa(beispiel({ renovierung_ct: 4_000_000 }))
    expect(r.anschaffungsnah_ct).toBe(4_000_000)
    expect(r.bemessung_ct).toBe(26_350_000)
    expect(r.hinweise[0]).toContain('§ 6 Abs. 1 Nr. 1a')
  })

  it('Bodenrichtwert statt Prozent', () => {
    const r = rechneAfa(beispiel({ grundanteil_prozent: null, bodenrichtwert_ct: 18_000, grundstueck_m2: 400 }))
    expect(r.bodenWeg).toBe('bodenrichtwert')
    expect(r.boden_ct).toBe(7_200_000)
  })

  it('fehlende Angaben werden genannt, keine Tabelle', () => {
    const r = rechneAfa(leereAfa('o1'))
    expect(r.fehlt).toEqual(['Kaufpreis', 'Fertigstellungsjahr', 'Übergang Nutzen und Lasten', 'Grundstücksanteil (% oder Bodenrichtwert und Fläche)'])
    expect(r.tabelle).toEqual([])
  })

  it('Neubau ab 2023: 3 % und Hinweis auf degressive AfA', () => {
    const r = rechneAfa(beispiel({ fertigstellungsjahr: 2024 }))
    expect(r.satz?.prozent).toBe(3)
    expect(r.hinweise.some((h) => h.includes('§ 7 Abs. 5a'))).toBe(true)
  })

  it('Zeile im Belegindex hin und zurück', () => {
    const e = beispiel({ bisher: '2 %' })
    expect(afaAusZeile(zeileAusAfa(e, 'x@y.de', '2026-11-28'))).toEqual(e)
  })
})

const soffice = ['/usr/bin/soffice', '/usr/bin/libreoffice'].find((p) => existsSync(p))
const wert = (v: ExcelJS.CellValue): unknown => (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v || 'result' in v) ? ((v as { result?: unknown }).result ?? 0) : v)

describe('AfA-Excel', () => {
  it('Ergebnisse sind Formeln, Eingaben Werte', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await erstelleAfaExcel('Testobjekt', beispiel(), ExcelJS))
    const ws = wb.getWorksheet('AfA')!
    expect(ws.getCell(`B${Z.kaufpreis}`).value).toBe(250000)
    for (const z of [Z.nk, Z.ak, Z.boden, Z.bmg, Z.satz, Z.jahr]) expect(ws.getCell(`B${z}`).formula, `B${z}`).toBeTruthy()
    expect(ws.getCell(`C${Z.tabelle}`).formula).toBeTruthy()
    expect(wb.getWorksheet('Annahmen')!.getCell('B3').value).toContain('§ 7 Abs. 4')
  })

  it.skipIf(!soffice)('LibreOffice rechnet nach: jede Zeile = App-Rechnung', async () => {
    const e = beispiel({ eigennutzung_prozent: 10, renovierung_ct: 4_000_000 })
    const r = rechneAfa(e)
    const dir = mkdtempSync(join(tmpdir(), 'afa-'))
    writeFileSync(join(dir, 'ein.xlsx'), Buffer.from(await erstelleAfaExcel('Testobjekt', e, ExcelJS)))
    execFileSync(soffice!, ['--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'aus'), join(dir, 'ein.xlsx')], { stdio: 'pipe', timeout: 90000, env: { ...process.env, HOME: dir } })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(readFileSync(join(dir, 'aus', 'ein.xlsx')).buffer as ArrayBuffer)
    const ws = wb.getWorksheet('AfA')!
    const ct = (adr: string) => Math.round(Number(wert(ws.getCell(adr).value)) * 100)
    expect(ct(`B${Z.ak}`)).toBe(r.anschaffungskosten_ct)
    expect(ct(`B${Z.boden}`)).toBe(r.boden_ct)
    expect(ct(`B${Z.nah}`)).toBe(r.anschaffungsnah_ct)
    expect(ct(`B${Z.bmg}`)).toBe(r.bemessung_ct)
    expect(Number(wert(ws.getCell(`B${Z.satz}`).value))).toBe(2)
    expect(ct(`B${Z.jahr}`)).toBe(r.jahresbetrag_ct)
    r.tabelle.forEach((t, i) => {
      const z = Z.tabelle + i
      expect(Number(wert(ws.getCell(`A${z}`).value)), `Jahr Zeile ${z}`).toBe(t.jahr)
      expect(ct(`C${z}`), `AfA ${t.jahr}`).toBe(t.betrag_ct)
      expect(ct(`D${z}`), `Rest ${t.jahr}`).toBe(t.restwert_ct)
    })
  }, 120000)
})
