// Texterkennung im Browser: Tesseract.js (Deutsch) für Fotos, pdf.js für Text aus PDFs.
// Das Bild bzw. die PDF wird nur lokal ausgewertet. Beim ersten Mal lädt der Browser
// das Erkennungsprogramm und die deutschen Sprachdaten (ca. 5–15 MB) von cdn.jsdelivr.net, danach aus dem Cache.
import type { Worker } from 'tesseract.js'
import type { Vorschlag } from '../fachlich/texterkennung'

export interface OcrStand {
  status: 'aus' | 'laeuft' | 'fertig' | 'fehler'
  fortschritt: number
  text: string
  vorschlag: Vorschlag | null
  fehler: string
}

export const OCR_AUS: OcrStand = { status: 'aus', fortschritt: 0, text: '', vorschlag: null, fehler: '' }

let worker: Promise<Worker> | null = null

function holeWorker(fortschritt?: (p: number) => void): Promise<Worker> {
  if (!worker) {
    worker = import('tesseract.js').then(({ createWorker }) =>
      createWorker('deu', 1, {
        logger: (m) => { if (m.status === 'recognizing text') fortschritt?.(m.progress) },
      }),
    )
    worker.catch(() => { worker = null })
  }
  return worker
}

/** Text aus einem Bild (Canvas oder Blob). */
export async function textAusBild(bild: HTMLCanvasElement | Blob, fortschritt?: (p: number) => void): Promise<string> {
  const w = await holeWorker(fortschritt)
  const r = await w.recognize(bild)
  return r.data.text
}

/** Text aus einer PDF. Gescannte PDFs ohne Textebene: erste Seite als Bild erkennen. */
export async function textAusPdf(pdf: Blob, fortschritt?: (p: number) => void): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const aufgabe = pdfjs.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) })
  const doc = await aufgabe.promise
  try {
    const teile: string[] = []
    for (let i = 1; i <= Math.min(doc.numPages, 5); i++) {
      const inhalt = await (await doc.getPage(i)).getTextContent()
      // Zeilen anhand des hasEOL-Merkmals bilden
      teile.push(inhalt.items.map((x) => ('str' in x ? x.str + (x.hasEOL ? '\n' : ' ') : '')).join(''))
    }
    const text = teile.join('\n')
    if (text.replace(/\s/g, '').length >= 20) return text
    // Scan ohne Text: erste Seite rendern und erkennen
    const seite = await doc.getPage(1)
    const vp = seite.getViewport({ scale: 2 })
    const c = document.createElement('canvas')
    c.width = Math.round(vp.width); c.height = Math.round(vp.height)
    await seite.render({ canvas: c, viewport: vp }).promise
    return textAusBild(c, fortschritt)
  } finally {
    void aufgabe.destroy()
  }
}
