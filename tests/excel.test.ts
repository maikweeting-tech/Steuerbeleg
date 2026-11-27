// Excel-Export: Formeln vorhanden, und – wenn LibreOffice installiert ist – Neuberechnung gegen die App-Rechnung.
import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erstelleExcel } from '../src/export/excel'
import { gesamt, nebenkosten, objekte, paragraph35a, summenJeKategorie } from '../src/export/auswertung'
import { testDaten } from './hilfen/exportDaten'

const soffice = ['/usr/bin/soffice', '/usr/bin/libreoffice'].find((p) => existsSync(p))

async function lade(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  return wb
}
// LibreOffice speichert bei Formeln mit Ergebnis 0 kein result → 0
const wert = (v: ExcelJS.CellValue): unknown => (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v || 'result' in v) ? ((v as { result?: unknown }).result ?? 0) : v)

describe('Excel-Export', () => {
  it('enthält alle Blätter und Formeln statt fester Summen', async () => {
    const d = testDaten()
    const { buffer, blaetter } = await erstelleExcel(d, ExcelJS)
    expect(blaetter).toEqual(['Übersicht', 'Anlage V', '35a', 'NK-Vorlage', 'Anlage N', 'Fragen', 'Jahresvergleich', 'Bescheid', 'Prüfung', 'Annahmen', 'Belege', 'Aufteilung', 'Objekte', 'Einheiten', 'Einnahmen', 'Fahrten'])
    const wb = await lade(buffer)
    const ue = wb.getWorksheet('Übersicht')!
    const formeln: string[] = []
    ue.eachRow((r) => r.eachCell((c) => { if (c.formula) formeln.push(c.formula) }))
    expect(formeln.some((x) => x.startsWith('SUMIFS(Belege!$D:$D'))).toBe(true)
    expect(formeln.some((x) => x.startsWith('COUNTIFS('))).toBe(true)
    // Belegbeträge sind Eingaben (Zahlen), keine Formeln
    expect(wb.getWorksheet('Belege')!.getCell('D2').value).toBe(85.1)
    expect(wb.getWorksheet('Annahmen')!.getCell('B5').value).toContain('Brutto')
  })

  it.skipIf(!soffice)('LibreOffice rechnet die Formeln nach: Ergebnisse = unabhängige App-Rechnung', async () => {
    const d = testDaten()
    const { buffer } = await erstelleExcel(d, ExcelJS)
    const dir = mkdtempSync(join(tmpdir(), 'xl-'))
    writeFileSync(join(dir, 'ein.xlsx'), Buffer.from(buffer))
    mkdtempSync(join(dir, 'x'))
    execFileSync(soffice!, ['--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'aus'), join(dir, 'ein.xlsx')], { stdio: 'pipe', timeout: 90000, env: { ...process.env, HOME: dir } })
    const wb = await lade(readFileSync(join(dir, 'aus', 'ein.xlsx')).buffer as ArrayBuffer)
    const zahl = (blatt: string, adr: string) => Number(wert(wb.getWorksheet(blatt)!.getCell(adr).value))
    const ct = (blatt: string, adr: string) => Math.round(zahl(blatt, adr) * 100)
    const ue = wb.getWorksheet('Übersicht')!

    // Übersicht: jede Kategoriezeile gegen summenJeKategorie
    const erwartet = summenJeKategorie(d)
    let geprueft = 0
    ue.eachRow((r, i) => {
      if (i < 5) return
      const m = String(r.getCell(1).value ?? ''), kat = String(r.getCell(3).value ?? '')
      const e = erwartet.find((x) => x.modul === m && x.kategorie === kat)
      if (!e) return
      expect(Number(wert(r.getCell(6).value))).toBe(e.anzahl)
      expect(Math.round(Number(wert(r.getCell(7).value)) * 100)).toBe(e.summe_ct)
      geprueft++
    })
    expect(geprueft).toBe(erwartet.length)

    // Prüfblatt: alles OK
    const pr = wb.getWorksheet('Prüfung')!
    const ergebnisse: string[] = []
    pr.eachRow((r, i) => { if (i >= 5) ergebnisse.push(`${r.getCell(1).value}: ${wert(r.getCell(4).value)}`) })
    // Testbeleg „Bar GmbH“: 500 € ≠ 200 € + 200 € → Prüfung muss anschlagen
    expect(ergebnisse.filter((x) => !x.endsWith(': OK'))).toEqual(['§ 35a: Belege mit Arbeitskosten + Material ≠ Betrag: PRÜFEN'])
    expect(ct('Prüfung', 'B5')).toBe(gesamt(d.belege))

    // Anlage V je Objekt (± 1 Cent wegen Rundung der Aufteilung in der App)
    objekte(d).forEach((o, i) => {
      const z = 5 + i
      expect(Math.abs(ct('Anlage V', `C${z}`) + ct('Anlage V', `D${z}`) - o.einnahmen_ct)).toBeLessThanOrEqual(1)
      expect(Math.abs(ct('Anlage V', `E${z}`) - o.werbungskosten_ct)).toBeLessThanOrEqual(1)
    })

    // § 35a
    const p = paragraph35a(d)
    expect(ct('35a', 'D5')).toBe(p.kategorien[0].summe_ct)
    expect(ct('35a', 'E5')).toBe(p.kategorien[0].arbeit_ct)
    expect(zahl('35a', 'C8')).toBe(p.bar)

    // NK-Vorlage gegen umlage() je Einheit
    const nk = nebenkosten(d)
    const blatt = wb.getWorksheet('NK-Vorlage')!
    for (const o of nk) {
      for (const z of o.zeilen) {
        let gefunden = false
        blatt.eachRow((r) => {
          if (r.getCell(1).value !== z.kategorie) return
          const titelZeile = Number(r.number)
          let t = titelZeile
          // nächste Objekt-Überschrift oberhalb muss zu diesem Objekt gehören
          while (t > 1 && !String(blatt.getCell(t, 1).value ?? '').includes(' – Schlüssel: ')) t--
          if (t <= 1 || !String(blatt.getCell(t, 1).value).startsWith(`${o.objekt.bezeichnung} – `)) return
          gefunden = true
          z.je_einheit_ct.forEach((c, i) => expect(Math.abs(Math.round(Number(wert(r.getCell(4 + i).value)) * 100) - c)).toBeLessThanOrEqual(1))
        })
        expect(gefunden).toBe(true)
      }
    }

    // Anlage N: 180 × 23,5 = 4230 km; Fahrtenbuch Fortbildung 180,5 km
    expect(zahl('Anlage N', 'F5')).toBeCloseTo(4230, 6)
    expect(zahl('Anlage N', 'I5')).toBeCloseTo(180.5, 6)
    // Jahresvergleich AGB: 50,00 → 85,00
    expect(zahl('Jahresvergleich', 'G5')).toBeCloseTo(35, 6)
    // Bescheid: Abweichung = Bescheid − Erklärung, leer wenn ein Wert fehlt
    expect(zahl('Bescheid', 'E5')).toBeCloseTo(-100, 6)
    expect((wb.getWorksheet('Bescheid')!.getCell('E6').value as { result?: unknown }).result ?? '').toBe('') // LibreOffice speichert "" ohne Ergebnis
    expect(zahl('Bescheid', 'E7')).toBeCloseTo(-100, 6)
    // Fragen verweisen auf Belege
    expect(String(wert(wb.getWorksheet('Fragen')!.getCell('G5').value))).toBe('Bar bezahlt – trotzdem absetzbar?')
  }, 120000)
})
