// Fügt Fotos (JPEG) und vorhandene PDFs zu einer PDF-Datei zusammen (pdf-lib, lokal im Browser).
import { PDFDocument } from 'pdf-lib'

export type Teil = { art: 'jpeg'; daten: ArrayBuffer } | { art: 'pdf'; daten: ArrayBuffer }

/** A4-Breite in Punkt; Fotoseiten werden auf diese Breite gesetzt, Höhe nach Seitenverhältnis. */
const A4_BREITE = 595.28

export async function erstellePdf(teile: Teil[]): Promise<{ pdf: Blob; seiten: number }> {
  if (!teile.length) throw new Error('Keine Seiten vorhanden')
  const doc = await PDFDocument.create()
  doc.setProducer('Steuerbeleg')
  doc.setCreator('Steuerbeleg')
  for (const t of teile) {
    if (t.art === 'jpeg') {
      const bild = await doc.embedJpg(t.daten)
      const h = (A4_BREITE * bild.height) / bild.width
      const seite = doc.addPage([A4_BREITE, h])
      seite.drawImage(bild, { x: 0, y: 0, width: A4_BREITE, height: h })
    } else {
      const quelle = await PDFDocument.load(t.daten, { ignoreEncryption: true })
      const kopien = await doc.copyPages(quelle, quelle.getPageIndices())
      kopien.forEach((p) => doc.addPage(p))
    }
  }
  const bytes = await doc.save()
  return { pdf: new Blob([bytes as BlobPart], { type: 'application/pdf' }), seiten: doc.getPageCount() }
}
