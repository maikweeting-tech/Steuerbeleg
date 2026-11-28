// Eingang laden: PDFs in Steuer/<Jahr>/Eingang_Gmail aller eingerichteten Jahre. Nur online.
import { findeInOrdner, kinder, ORDNER_MIME } from '../google/drive'
import { gespeicherteWurzel } from './einrichtung'
import { EINGANG_ORDNER, type EingangDatei } from '../fachlich/eingang'

export async function ladeEingang(jahre: number[]): Promise<EingangDatei[]> {
  const wurzel = gespeicherteWurzel()
  if (!wurzel) throw new Error('Kein Ordner „Steuer“ verbunden (Start → Ordner verbinden).')
  const liste: EingangDatei[] = []
  for (const jahr of jahre) {
    const j = await findeInOrdner(String(jahr), wurzel, ORDNER_MIME)
    const e = j && (await findeInOrdner(EINGANG_ORDNER, j.id, ORDNER_MIME))
    if (!e) continue
    for (const d of await kinder(e.id)) if (d.mimeType !== ORDNER_MIME) liste.push({ id: d.id, name: d.name, mimeType: d.mimeType, jahr })
  }
  return liste
}
