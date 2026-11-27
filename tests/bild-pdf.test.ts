import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { begrenze, kontrastTabelle, skaliere } from '../src/erfassung/bild'
import { erstellePdf } from '../src/erfassung/pdf'

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
})
