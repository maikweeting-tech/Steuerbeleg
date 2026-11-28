import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { begrenze, kontrastTabelle, skaliere } from '../src/erfassung/bild'
import { erstellePdf, seitenZahl } from '../src/erfassung/pdf'

describe('Bild', () => {
  it('skaliert lange Kante auf 2000 px, kleine Bilder bleiben', () => {
    expect(skaliere(4000, 3000)).toEqual({ b: 2000, h: 1500 })
    expect(skaliere(800, 600)).toEqual({ b: 800, h: 600 })
  })
  it('Zuschnitt bleibt im Bild', () => {
    expect(begrenze({ x: 0.9, y: -0.1, b: 0.5, h: 2 })).toEqual({ x: 0.5, y: 0, b: 0.5, h: 1 })
  })
  it('Kontrast streckt Graubereich 50…200 auf 0…255', () => {
    const hist = new Array(256).fill(0)
    for (let i = 50; i <= 200; i++) hist[i] = 10
    const t = kontrastTabelle(hist, 0)
    expect(t[50]).toBe(0)
    expect(t[200]).toBe(255)
    expect(t[125]).toBe(128)
  })
})

describe('PDF', () => {
  it('fügt PDFs zusammen und zählt Seiten', async () => {
    const mache = async (n: number) => {
      const d = await PDFDocument.create()
      for (let i = 0; i < n; i++) d.addPage()
      return (await d.save()).buffer as ArrayBuffer
    }
    const { pdf, seiten } = await erstellePdf([{ art: 'pdf', daten: await mache(2) }, { art: 'pdf', daten: await mache(1) }])
    expect(seiten).toBe(3)
    expect(pdf.type).toBe('application/pdf')
  })
  it('ohne Seiten Fehler', async () => {
    await expect(erstellePdf([])).rejects.toThrow()
  })
  it('einzelne PDF wird unverändert übernommen, auch wenn sie intern fehlerhaft ist', async () => {
    const kaputt = new TextEncoder().encode(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Annots [4 0 R] >> endobj
4 0 obj << /Type /Annot /Subtype /Link /Rect [0 0 1 1] /Parent -1 0 R >> endobj
5 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj
trailer << /Root 1 0 R >>
%%EOF`)
    const daten = kaputt.buffer as ArrayBuffer
    const { pdf, seiten } = await erstellePdf([{ art: 'pdf', daten }])
    expect(seiten).toBe(2)
    expect(pdf.size).toBe(kaputt.byteLength)
  })
  it('Seitenzahl: Notzählung, wenn die PDF gar nicht lesbar ist', async () => {
    const t = new TextEncoder().encode('kein pdf /Type /Page /Type /Pages /Type/Page')
    expect(await seitenZahl(t.buffer as ArrayBuffer)).toBe(2)
  })
})
