// Legt die Ordnerstruktur Steuer/<Jahr>/… und den Belegindex in Google Drive an.
// Bereits vorhandene Ordner werden wiederverwendet, es entstehen keine Doppelungen.
import { ordnerPfade, type SteuerjahrKonfig } from '../fachlich/konfiguration'
import { erstelleWurzel, findeWurzel, holeOderErstelleOrdner, datei, type DriveDatei } from '../google/drive'
import { holeOderErstelleBelegindex } from '../google/sheets'

const SPEICHER = 'steuerbeleg.wurzelId'

export function gespeicherteWurzel(): string | null {
  try { return localStorage.getItem(SPEICHER) } catch { return null }
}
export function speichereWurzel(id: string | null) {
  try { if (id) localStorage.setItem(SPEICHER, id); else localStorage.removeItem(SPEICHER) } catch { /* privat */ }
}

/** Sucht den Ordner "Steuer": zuerst gespeicherte Id, dann per App-Eigenschaft. */
export async function sucheWurzel(): Promise<DriveDatei | null> {
  const id = gespeicherteWurzel()
  if (id) {
    try { return await datei(id) } catch { speichereWurzel(null) }
  }
  const w = await findeWurzel()
  if (w) speichereWurzel(w.id)
  return w
}

export interface Ergebnis {
  wurzel: DriveDatei
  jahresordner: DriveDatei
  belegindex: DriveDatei
  ordnerAnzahl: number
}

export async function richteEin(
  konfig: SteuerjahrKonfig,
  fortschritt: (text: string) => void,
  vorhandeneWurzel?: DriveDatei | null,
): Promise<Ergebnis> {
  fortschritt('Ordner „Steuer“ …')
  const wurzel = vorhandeneWurzel ?? (await sucheWurzel()) ?? (await erstelleWurzel())
  speichereWurzel(wurzel.id)
  const jahresordner = await holeOderErstelleOrdner(String(konfig.steuerjahr), wurzel.id)

  const ids = new Map<string, string>([['', jahresordner.id]])
  const pfade = ordnerPfade(konfig)
  let i = 0
  for (const p of pfade) {
    i++
    fortschritt(`Ordner ${i} von ${pfade.length}: ${p.join('/')}`)
    const eltern = ids.get(p.slice(0, -1).join('/'))!
    const o = await holeOderErstelleOrdner(p[p.length - 1], eltern)
    ids.set(p.join('/'), o.id)
  }
  fortschritt('Belegindex …')
  const belegindex = await holeOderErstelleBelegindex(konfig.steuerjahr, jahresordner.id)
  return { wurzel, jahresordner, belegindex, ordnerAnzahl: pfade.length }
}
