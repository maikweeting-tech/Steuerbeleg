// E5: Export-Paket als ZIP (fflate) – Belegdateien in der Ordnerstruktur wie in Drive,
// dazu Checkliste, Fragenliste und Excel-Auswertung.
import { zipSync, type Zippable } from 'fflate'
import { zielOrdnerPfad } from '../fachlich/beleg'
import { mappenReihenfolge, type ExportDaten } from './auswertung'

export type InhaltLader = (id: string) => Promise<{ daten: ArrayBuffer; name: string }>

export interface PaketErgebnis { zip: Blob; dateien: number; fehler: string[] }

const sicher = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Datei'

/** Belegdateien laden und mit den Zusatzdateien zu einem ZIP packen. Dauerbelege nur einmal. */
export async function erstellePaket(
  d: ExportDaten, lade: InhaltLader, zusatz: Record<string, Uint8Array>, fortschritt?: (fertig: number, gesamt: number) => void,
): Promise<PaketErgebnis> {
  const baum: Zippable = {}
  const fehler: string[] = []
  const gesehen = new Set<string>()
  const belegeOrdner = `Belege_${d.jahr}`
  let n = 0, dateien = 0
  const liste = mappenReihenfolge(d)
  for (const b of liste) {
    let pfad: string[]
    try { pfad = zielOrdnerPfad(b, d.konfig, d.stamm.objekte, d.stamm.kinder) } catch { pfad = ['ohne Zuordnung'] }
    const ids = b.datei_ids.split(',').map((x) => x.trim()).filter(Boolean)
    for (const [i, id] of ids.entries()) {
      if (gesehen.has(id)) continue
      gesehen.add(id)
      try {
        const f = await lade(id)
        const name = sicher(b.dateiname && ids.length === 1 ? b.dateiname : `${String(b.belegnr).padStart(3, '0')}_${i + 1}_${f.name}`)
        const ziel = [belegeOrdner, ...pfad.map(sicher), name].join('/')
        baum[ziel] = [new Uint8Array(f.daten), { level: 0 }] // PDFs/JPEGs sind schon komprimiert
        dateien++
      } catch (e) { fehler.push(`Nr. ${b.belegnr}: ${e instanceof Error ? e.message : String(e)}`) }
    }
    fortschritt?.(++n, liste.length)
  }
  for (const [name, daten] of Object.entries(zusatz)) baum[name] = daten
  const zip = zipSync(baum, { level: 6 })
  return { zip: new Blob([zip as BlobPart], { type: 'application/zip' }), dateien: dateien + Object.keys(zusatz).length, fehler }
}
