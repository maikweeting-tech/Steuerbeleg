// Legt die Ordnerstruktur Steuer/<Jahr>/… und den Belegindex in Google Drive an.
// Bereits vorhandene Ordner werden wiederverwendet, es entstehen keine Doppelungen.
import { ordnerPfade, type SteuerjahrKonfig } from '../fachlich/konfiguration'
import { erstelleWurzel, findeWurzeln, holeOderErstelleOrdner, datei, type DriveDatei } from '../google/drive'
import { holeOderErstelleBelegindex } from '../google/sheets'

const SPEICHER = 'steuerbeleg.wurzelId'

export function gespeicherteWurzel(): string | null {
  try { return localStorage.getItem(SPEICHER) } catch { return null }
}
export function speichereWurzel(id: string | null) {
  try { if (id) localStorage.setItem(SPEICHER, id); else localStorage.removeItem(SPEICHER) } catch { /* privat */ }
}

/** Fremde (freigegebene) Ordner zuerst, dann eigene; innerhalb alphabetisch nach Eigentümer. */
export function sortiereKandidaten(k: DriveDatei[]): DriveDatei[] {
  const eig = (d: DriveDatei) => d.owners?.[0]?.emailAddress ?? ''
  return [...k].sort((a, b) => Number(!!a.ownedByMe) - Number(!!b.ownedByMe) || eig(a).localeCompare(eig(b)))
}

export interface Suchergebnis {
  /** eindeutig gefundener bzw. gespeicherter Ordner */
  wurzel: DriveDatei | null
  /** mehrere Kandidaten: Nutzer muss wählen */
  kandidaten: DriveDatei[]
}

/** Ordner-Id aus einem Drive-Link (…/folders/<id>, …?id=<id>) oder einer reinen Id; sonst null. */
export function ordnerIdAusLink(text: string): string | null {
  const t = text.trim()
  const m = t.match(/\/folders\/([-\w]{10,})/) ?? t.match(/[?&]id=([-\w]{10,})/) ?? t.match(/^([-\w]{10,})$/)
  return m ? m[1] : null
}

/** Verbindet einen Ordner per Link (z. B. aus der Freigabe-Mail). */
export async function verbindeOrdnerPerLink(text: string): Promise<DriveDatei> {
  const id = ordnerIdAusLink(text)
  if (!id) throw new Error('Das ist kein Link zu einem Drive-Ordner. Bitte den Link aus Google Drive kopieren (Ordner → Teilen → Link kopieren).')
  let d: DriveDatei
  try { d = await datei(id) } catch { throw new Error('Ordner nicht erreichbar. Ist er für dich freigegeben (Bearbeiter)?') }
  if (d.mimeType !== 'application/vnd.google-apps.folder') throw new Error(`„${d.name}“ ist kein Ordner.`)
  speichereWurzel(d.id)
  return d
}

/** Sucht den Ordner "Steuer": zuerst gespeicherte Id, sonst alle Kandidaten. */
export async function sucheWurzel(): Promise<Suchergebnis> {
  const id = gespeicherteWurzel()
  if (id) {
    try { return { wurzel: await datei(id), kandidaten: [] } } catch { speichereWurzel(null) }
  }
  const k = sortiereKandidaten(await findeWurzeln())
  if (k.length === 1) {
    speichereWurzel(k[0].id)
    return { wurzel: k[0], kandidaten: [] }
  }
  return { wurzel: null, kandidaten: k }
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
  // Neu angelegt wird nur, wenn ausdrücklich kein Ordner übergeben wurde (Knopf „Neu anlegen“).
  const wurzel = vorhandeneWurzel ?? (await erstelleWurzel())
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
