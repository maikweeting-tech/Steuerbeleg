// Überträgt wartende Belege: PDF → Drive (Zielordner), Zeile → Belegindex, Eintrag → Protokoll.
// Jeder Schritt ist wiederholbar: Eine schon hochgeladene Datei wird über ihre Beleg-Id erkannt,
// eine schon eingetragene Zeile ebenso. So entstehen bei Abbrüchen keine Doppelungen.
import {
  belegAusZeile, dateiname, naechsteBelegnr, wirksamesSteuerjahr, zeileAus, zielOrdnerPfad, type Beleg,
} from '../fachlich/beleg'
import type { SteuerjahrKonfig } from '../fachlich/konfiguration'
import { belegindexName } from './schema'
import type { Wartend } from './speicher'

type Zelle = string | number

export interface SyncDienste {
  konfigs: Record<number, SteuerjahrKonfig>
  wurzelId: () => string | null
  nutzer: () => string
  jetzt: () => string
  findeOrdner: (name: string, elternId: string) => Promise<{ id: string } | null>
  findeSheet: (name: string, elternId: string) => Promise<{ id: string } | null>
  holeOderErstellePfad: (pfad: string[], elternId: string) => Promise<{ id: string }>
  findeBelegDatei: (belegId: string) => Promise<{ id: string; name: string } | null>
  ladeHoch: (name: string, mime: string, inhalt: Blob, elternId: string, app: Record<string, string>) => Promise<{ id: string; name: string }>
  leseBlatt: (sheetId: string, blatt: string) => Promise<Zelle[][]>
  haengeAn: (sheetId: string, blatt: string, zeilen: Zelle[][]) => Promise<void>
}

export interface Ablage {
  alle: () => Promise<Wartend[]>
  speichere: (w: Wartend) => Promise<void>
  entferne: (id: string) => Promise<void>
  cacheSchreiben: (jahr: number, b: Beleg[]) => Promise<void>
}

export class SyncFehler extends Error {}

interface Jahr { indexId: string; ordnerId: string; belege: Beleg[] }

async function ladeJahr(jahr: number, d: SyncDienste): Promise<Jahr> {
  const wurzel = d.wurzelId()
  if (!wurzel) throw new SyncFehler('Kein Ordner „Steuer“ verbunden. Bitte auf der Startseite verbinden.')
  const ordner = await d.findeOrdner(String(jahr), wurzel)
  if (!ordner) throw new SyncFehler(`Ordner „Steuer/${jahr}“ fehlt. Bitte auf der Startseite „Struktur prüfen“.`)
  const index = await d.findeSheet(belegindexName(jahr), ordner.id)
  if (!index) throw new SyncFehler(`${belegindexName(jahr)} fehlt. Bitte auf der Startseite „Struktur prüfen“.`)
  const belege = (await d.leseBlatt(index.id, 'Belege')).filter((z) => z[0]).map(belegAusZeile)
  return { indexId: index.id, ordnerId: ordner.id, belege }
}

/** Überträgt einen Beleg. Gibt den fertigen Beleg zurück. */
export async function uebertrage(w: Wartend, d: SyncDienste, jahre: Map<number, Jahr>): Promise<Beleg> {
  const jahr = wirksamesSteuerjahr(w.entwurf)
  const konfig = jahr ? d.konfigs[jahr] : undefined
  if (!jahr || !konfig) throw new SyncFehler(`Keine Konfiguration für Steuerjahr ${jahr ?? '?'}`)
  if (!jahre.has(jahr)) jahre.set(jahr, await ladeJahr(jahr, d))
  const j = jahre.get(jahr)!

  const schon = j.belege.find((b) => b.id === w.id)
  if (schon) return schon

  let datei = await d.findeBelegDatei(w.id)
  let nr = Number(/_B(\d+)_/.exec(datei?.name ?? '')?.[1] ?? 0)
  if (!datei) {
    nr = naechsteBelegnr(j.belege, jahr)
    const ziel = await d.holeOderErstellePfad(zielOrdnerPfad(w.entwurf, konfig), j.ordnerId)
    datei = await d.ladeHoch(dateiname(w.entwurf, nr), 'application/pdf', w.pdf, ziel.id, { steuerbeleg_beleg: w.id })
  }
  const jetzt = d.jetzt()
  const beleg: Beleg = {
    ...w.entwurf, steuerjahr: jahr, belegnr: nr || naechsteBelegnr(j.belege, jahr),
    datei_ids: datei.id, dateiname: datei.name,
    erfasst_von: w.erfasst_von, erfasst_am: w.erfasst_am, geaendert_von: d.nutzer(), geaendert_am: jetzt, version: 1,
  }
  await d.haengeAn(j.indexId, 'Belege', [zeileAus(beleg)])
  await d.haengeAn(j.indexId, 'Protokoll', [[jetzt, d.nutzer(), 'erfasst', w.id, '', '', datei.name]])
  j.belege.push(beleg)
  return beleg
}

export interface SyncErgebnis { uebertragen: number; fehler: number }

/** Arbeitet die Warteschlange der Reihe nach ab. Fehler bleiben am Eintrag stehen. */
export async function synchronisiere(d: SyncDienste, a: Ablage): Promise<SyncErgebnis> {
  const jahre = new Map<number, Jahr>()
  let uebertragen = 0
  let fehler = 0
  for (const w of await a.alle()) {
    try {
      await uebertrage(w, d, jahre)
      await a.entferne(w.id)
      uebertragen++
    } catch (e) {
      fehler++
      await a.speichere({ ...w, versuche: w.versuche + 1, fehler: e instanceof Error ? e.message : String(e) })
      // Ohne Anmeldung/Netz lohnt es sich nicht, die übrigen Einträge zu versuchen
      if (!(e instanceof SyncFehler)) break
    }
  }
  for (const [jahr, j] of jahre) await a.cacheSchreiben(jahr, j.belege)
  return { uebertragen, fehler }
}

/** Liest den Belegindex eines Jahres (für Liste und Duplikat-Prüfung). */
export async function ladeBelege(jahr: number, d: SyncDienste): Promise<Beleg[]> {
  return (await ladeJahr(jahr, d)).belege
}
