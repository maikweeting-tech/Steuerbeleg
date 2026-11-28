// Fügt Fotos (JPEG) und vorhandene PDFs zu einer PDF-Datei zusammen (pdf-lib, lokal im Browser).
import { PDFDocument } from 'pdf-lib'

export type Teil = { art: 'jpeg'; daten: ArrayBuffer } | { art: 'pdf'; daten: ArrayBuffer }

/** A4-Breite in Punkt; Fotoseiten werden auf diese Breite gesetzt, Höhe nach Seitenverhältnis. */
const A4_BREITE = 595.28

/** Seitenzahl einer PDF. Fehlerhafte Dateien (z. B. defekte Objektverweise) werfen nicht, sondern werden grob gezählt. */
export async function seitenZahl(daten: ArrayBuffer): Promise<number> {
  try {
    return (await PDFDocument.load(daten, { ignoreEncryption: true, throwOnInvalidObject: false })).getPageCount()
  } catch {
    const text = new TextDecoder('latin1').decode(daten)
    return Math.max(1, (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length)
  }
}

export async function erstellePdf(teile: Teil[]): Promise<{ pdf: Blob; seiten: number }> {
  if (!teile.length) throw new Error('Keine Seiten vorhanden')
  // Eine einzelne PDF wird unverändert übernommen: kein Neuaufbau, daher auch keine Fehler durch defekte PDF-Interna
  if (teile.length === 1 && teile[0].art === 'pdf')
    return { pdf: new Blob([teile[0].daten], { type: 'application/pdf' }), seiten: await seitenZahl(teile[0].daten) }
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
      try {
        const quelle = await PDFDocument.load(t.daten, { ignoreEncryption: true, throwOnInvalidObject: false })
        const kopien = await doc.copyPages(quelle, quelle.getPageIndices())
        kopien.forEach((p) => doc.addPage(p))
      } catch (x) {
        throw new Error(`Eine PDF ist intern fehlerhaft und lässt sich nicht mit anderen Seiten zusammenfügen. Bitte diese PDF allein als eigenen Beleg speichern. (${x instanceof Error ? x.message : String(x)})`)
      }
    }
  }
  const bytes = await doc.save()
  return { pdf: new Blob([bytes as BlobPart], { type: 'application/pdf' }), seiten: doc.getPageCount() }
}
