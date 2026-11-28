// @vitest-environment node
// M7: PDF-Exporte (Checkliste, Fragenliste, Belegmappe). Textprüfung mit pdftotext, falls vorhanden.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { belegmappePdf, checklistePdf, erklaerungPdf, fragenPdf, mappenReihenfolge, saeubere } from '../src/export/pdf'
import { testDaten } from './hilfen/exportDaten'

const pdftotext = existsSync('/usr/bin/pdftotext')
const text = async (b: Blob) => {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'))
  const f = join(dir, 'a.pdf')
  writeFileSync(f, new Uint8Array(await b.arrayBuffer()))
  return execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' })
}
const seitenText = async (b: Blob, seite: number) => {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'))
  const f = join(dir, 'a.pdf')
  writeFileSync(f, new Uint8Array(await b.arrayBuffer()))
  return execFileSync('pdftotext', ['-f', String(seite), '-l', String(seite), f, '-'], { encoding: 'utf8' })
}
const seitenzahl = async (b: Blob) => (await PDFDocument.load(await b.arrayBuffer())).getPageCount()

// 1×1-PNG
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'), (c) => c.charCodeAt(0))
async function pdfMitSeiten(n: number, titel: string) {
  const d = await PDFDocument.create()
  const f = await d.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < n; i++) d.addPage([400, 600]).drawText(`${titel} Seite ${i + 1}`, { x: 50, y: 300, size: 12, font: f })
  return (await d.save()).buffer as ArrayBuffer
}

describe('PDF-Exporte', () => {
  it('ersetzt Zeichen, die Helvetica nicht kennt', async () => {
    const f = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica)
    expect(saeubere('Größe ≠ 5 € – „ok“ ✓ 😀', f)).toBe('Größe <> 5 € – „ok“ OK ?')
  })

  it.skipIf(!pdftotext)('Checkliste enthält Summen, offene Punkte, § 35a-Hinweis und Fragen', async () => {
    const d = testDaten()
    d.stamm.buchungen = [{ id: 'b1', konto: '', datum: '2026-02-03', betrag_ct: -4999, gegenseite: 'Stadtwerke', zweck: '', markierung: 'beleg_fehlt', notiz: '' } as never]
    const t = await text(await checklistePdf(d))
    expect(t).toContain('Checkliste Steuerjahr 2026')
    expect(t).toContain('Die App ersetzt keine Steuerberatung')
    expect(t).toContain('Zahlung ohne Beleg: 03.02.2026')
    expect(t).toContain('Stadtwerke')
    expect(t).toMatch(/1\.500,00\s*€/) // § 35a Summe 1.000 + 500
    expect(t).toContain('1 Beleg(e) bar bezahlt')
    expect(t).toContain('Arbeitsmittel oder privat?')
    expect(t).toContain('Kalkar Wissel')
  })

  it.skipIf(!pdftotext)('Fragenliste listet nur Belege mit Frage, sortiert nach Nr.', async () => {
    const t = await text(await fragenPdf(testDaten()))
    const a = t.indexOf('Bar bezahlt'), b = t.indexOf('Arbeitsmittel oder privat')
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(t).not.toContain('Physio')
  })

  it.skipIf(!pdftotext)('Belegmappe: Deckblatt, Verzeichnis mit richtigen Seiten, Stempel, Dauerbeleg nur einmal', async () => {
    const d = testDaten()
    d.belege[2].datei_ids = 'DAUER'
    d.belege[3].datei_ids = 'DAUER'
    d.belege[4].datei_ids = '' // ohne Datei
    const geladen: string[] = []
    const lade = async (id: string) => {
      geladen.push(id)
      if (id === 'F8') return { daten: PNG.buffer as ArrayBuffer, mimeType: 'image/png' }
      if (id === 'F9') throw new Error('404')
      return { daten: await pdfMitSeiten(id === 'DAUER' ? 2 : 1, id), mimeType: 'application/pdf' }
    }
    const { pdf, eintraege } = await belegmappePdf(d, lade)
    expect(geladen.filter((x) => x === 'DAUER')).toHaveLength(1)
    // 10 Belege: 1 ohne Datei, 1 nicht ladbar, DAUER 2 Seiten für 2 Belege, sonst 1 Seite → 2 + 5 + 1 (PNG) = 8 Inhaltsseiten
    const inhalt = 8
    const gesamt = await seitenzahl(pdf)
    const vorne = gesamt - inhalt
    expect(vorne).toBe(2) // Deckblatt + 1 Seite Verzeichnis
    const e3 = eintraege.find((e) => e.beleg.belegnr === 3)!, e4 = eintraege.find((e) => e.beleg.belegnr === 4)!
    expect(e3.seite).toBe(e4.seite)
    expect([e3.hinweis, e4.hinweis].filter((h) => h.includes('Dauerbeleg'))).toHaveLength(1)
    expect(eintraege.find((e) => e.beleg.belegnr === 5)!.seite).toBeNull()
    expect(eintraege.find((e) => e.beleg.belegnr === 9)!.hinweis).toContain('nicht ladbar')

    // Verzeichnis-Seitenzahl zeigt auf die Seite mit dem Stempel und dem Inhalt
    const reihenfolge = mappenReihenfolge(d)
    const erster = eintraege.find((e) => e.beleg.belegnr === reihenfolge[0].belegnr)!
    const s = await seitenText(pdf, erster.seite! + vorne)
    expect(s).toContain(`Nr. ${erster.beleg.belegnr}`)
    expect(s).toContain(`${erster.beleg.datei_ids} Seite 1`)
    const toc = await seitenText(pdf, 2)
    expect(toc).toContain('Inhaltsverzeichnis')
    // Dauerbeleg-Seite trägt beide Stempel
    const sd = await seitenText(pdf, e3.seite! + vorne)
    expect(sd).toContain('Nr. 3')
    expect(sd).toContain('Nr. 4')
    // Folgeseite des Dauerbelegs trägt ebenfalls den Stempel
    expect(await seitenText(pdf, e3.seite! + vorne + 1)).toContain('DAUER Seite 2')
  })

  it.skipIf(!pdftotext)('Ausfüllhilfe: Klärungspunkte, Unterlagen, Antworten je Bereich (Testdaten)', async () => {
    const d = testDaten()
    d.stamm.antworten = {
      allg_frist: { wert: 'vermutet', notiz: '' },
      allg_bescheid_vorjahr: { wert: 'ja', notiz: 'liegt im Ordner' },
      kinder_anzahl: { wert: '1', notiz: '' },
      kind1_name: { wert: 'Testkind', notiz: '' },
    }
    d.dokumente = [
      { id: 'x', titel: 'Testvertrag', art: 'Mietvertrag', zuordnung: 'allgemein', gueltig_von: '2026-03-01', gueltig_bis: '', datei_id: 'F', dateiname: '', notiz: '', erfasst_von: '', erfasst_am: '' },
      { id: 'y', titel: 'Alt', art: 'Versicherung', zuordnung: 'allgemein', gueltig_von: '', gueltig_bis: '2020-01-01', datei_id: 'G', dateiname: '', notiz: '', erfasst_von: '', erfasst_am: '' },
    ]
    const t = (await text(await erklaerungPdf(d))).replace(/\s+/g, ' ')
    expect(t).toContain('Verträge und Dokumente 2026 (1')
    expect(t).toContain('Mietvertrag: Testvertrag')
    expect(t).toContain('NEU 2026')
    expect(t).not.toContain('Versicherung: Alt')
    expect(t).toContain('Ausfüllhilfe Steuererklärung 2026')
    expect(t).toContain('Mit der Steuerberatung klären (2)') // Frist + Barzahlung § 35a aus den Testbelegen
    expect(t).toContain('bar bezahlt')
    expect(t).toContain('Fristverlängerung')
    expect(t).toContain('[ ] Steuerbescheid 2025')
    expect(t).toContain('liegt im Ordner')
    expect(t).toContain('Kind 1 (Testkind)')
    expect(t).toContain('offen')
    expect(t).toContain('keine Steuer berechnet')
  })
})
