// Bildbearbeitung im Browser (Canvas): verkleinern, drehen, zuschneiden, Kontrast.
// Alles läuft lokal, kein Bild verlässt das Gerät vor dem Upload nach Drive.

export type Filter = 'original' | 'kontrast' | 'sw'

/** Zuschnitt als Anteil 0…1 des (gedrehten) Bildes */
export interface Rechteck { x: number; y: number; b: number; h: number }

export const VOLL: Rechteck = { x: 0, y: 0, b: 1, h: 1 }

export interface Seite {
  id: string
  quelle: Blob // Originalfoto
  drehung: 0 | 90 | 180 | 270
  zuschnitt: Rechteck
  filter: Filter
}

/** Max. Kantenlänge 2000 px: gut lesbar, ca. 300–600 kB je Seite als JPEG. */
export const MAX_KANTE = 2000

export function skaliere(b: number, h: number, max = MAX_KANTE): { b: number; h: number } {
  const f = Math.min(1, max / Math.max(b, h))
  return { b: Math.round(b * f), h: Math.round(h * f) }
}

/** Zuschnitt auf gültigen Bereich begrenzen (Mindestgröße 5 %). */
export function begrenze(r: Rechteck): Rechteck {
  const b = Math.min(1, Math.max(0.05, r.b))
  const h = Math.min(1, Math.max(0.05, r.h))
  return { x: Math.min(1 - b, Math.max(0, r.x)), y: Math.min(1 - h, Math.max(0, r.y)), b, h }
}

/**
 * Kontrastverstärkung: Helligkeitswerte so strecken, dass 2 % dunkelste → schwarz,
 * 2 % hellste → weiß (Papier wird weiß, Schrift dunkel). Liefert Tabelle 0…255.
 */
export function kontrastTabelle(histogramm: number[], anteil = 0.02): number[] {
  const summe = histogramm.reduce((a, b) => a + b, 0)
  let lo = 0
  let hi = 255
  // lo = erster Wert, bei dem die Summe von unten den Anteil überschreitet (hi entsprechend von oben)
  for (let s = histogramm[0]; lo < 255 && s <= summe * anteil; ) s += histogramm[++lo]
  for (let s = histogramm[255]; hi > 0 && s <= summe * anteil; ) s += histogramm[--hi]
  if (hi <= lo) return histogramm.map((_, i) => i)
  return histogramm.map((_, i) => Math.round(Math.min(255, Math.max(0, ((i - lo) * 255) / (hi - lo)))))
}

async function ladeBild(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

/** Rendert eine Seite mit Drehung, Zuschnitt und Filter. */
export async function rendere(s: Seite, max = MAX_KANTE): Promise<HTMLCanvasElement> {
  const bild = await ladeBild(s.quelle)
  const quer = s.drehung === 90 || s.drehung === 270
  const gb = quer ? bild.height : bild.width // Größe nach Drehung
  const gh = quer ? bild.width : bild.height
  const z = begrenze(s.zuschnitt)
  const ziel = skaliere(gb * z.b, gh * z.h, max)
  const f = ziel.b / (gb * z.b)
  const c = document.createElement('canvas')
  c.width = ziel.b
  c.height = ziel.h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(f, f)
  ctx.translate(-z.x * gb, -z.y * gh)
  ctx.translate(gb / 2, gh / 2)
  ctx.rotate((s.drehung * Math.PI) / 180)
  ctx.drawImage(bild, -bild.width / 2, -bild.height / 2)
  bild.close()
  if (s.filter !== 'original') wendeFilterAn(ctx, c.width, c.height, s.filter)
  return c
}

function wendeFilterAn(ctx: CanvasRenderingContext2D, b: number, h: number, filter: Filter) {
  const daten = ctx.getImageData(0, 0, b, h)
  const p = daten.data
  const hist = new Array(256).fill(0)
  for (let i = 0; i < p.length; i += 4) hist[Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])]++
  const t = kontrastTabelle(hist)
  for (let i = 0; i < p.length; i += 4) {
    if (filter === 'sw') {
      const g = t[Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])]
      p[i] = p[i + 1] = p[i + 2] = g
    } else {
      // Helligkeit verschieben statt Kanäle einzeln strecken: vermeidet Farbstiche
      const l = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])
      const d = t[l] - l
      p[i] = Math.min(255, Math.max(0, p[i] + d))
      p[i + 1] = Math.min(255, Math.max(0, p[i + 1] + d))
      p[i + 2] = Math.min(255, Math.max(0, p[i + 2] + d))
    }
  }
  ctx.putImageData(daten, 0, 0)
}

export function alsJpeg(c: HTMLCanvasElement, qualitaet = 0.82): Promise<Blob> {
  return new Promise((ok, fehler) => c.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht erzeugt werden'))), 'image/jpeg', qualitaet))
}

/** Vorschaubild (klein) als Objekt-URL */
export async function vorschau(s: Seite): Promise<string> {
  return URL.createObjectURL(await alsJpeg(await rendere(s, 600), 0.7))
}
