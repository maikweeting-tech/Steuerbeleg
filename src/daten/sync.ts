// Überträgt wartende Belege: PDF → Drive (Zielordner), Zeile → Belegindex, Eintrag → Protokoll.
// Jeder Schritt ist wiederholbar: Eine schon hochgeladene Datei wird über ihre Beleg-Id erkannt,
// eine schon eingetragene Zeile ebenso. So entstehen bei Abbrüchen keine Doppelungen.
import {
  belegAusZeile, dateiname, naechsteBelegnr, wirksamesSteuerjahr, zeileAus, zielOrdnerPfad, type Beleg,
} from '../fachlich/beleg'
import type { SteuerjahrKonfig } from '../fachlich/konfiguration'
import { belegindexName } from './schema'
import type { Wartend } from './speicher'
import { aufteilungAusZeile, kindAusZeile, objektAusZeile, zeileAusAufteilung, type AufteilungZeile } from './stamm'
import type { Objekt } from '../fachlich/objekte'
import type { Kind } from '../fachlich/personen'

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

interface Jahr { indexId: string; ordnerId: string; belege: Beleg[]; objekte: Objekt[]; aufteilung: AufteilungZeile[]; kinder: Kind[] }

/** Ordner und Belegindex eines Jahres finden (Fehler mit Hinweis, wenn sie fehlen). */
export async function findeIndex(jahr: number, d: SyncDienste): Promise<{ indexId: string; ordnerId: string }> {
  const wurzel = d.wurzelId()
  if (!wurzel) throw new SyncFehler('Kein Ordner „Steuer“ verbunden. Bitte auf „Start“ unter „2. Ordner Steuer“ den gemeinsamen Ordner verbinden.')
  const ordner = await d.findeOrdner(String(jahr), wurzel)
  if (!ordner) throw new SyncFehler(`Ordner „Steuer/${jahr}“ fehlt. Bitte oben auf „Jahr ${jahr} anlegen“ tippen (bzw. Start → „Struktur ${jahr} prüfen / ergänzen“).`)
  const index = await d.findeSheet(belegindexName(jahr), ordner.id)
  if (!index) throw new SyncFehler(`${belegindexName(jahr)} fehlt. Bitte oben auf „Jahr ${jahr} anlegen“ tippen (bzw. Start → „Struktur ${jahr} prüfen / ergänzen“).`)
  return { indexId: index.id, ordnerId: ordner.id }
}

async function ladeJahr(jahr: number, d: SyncDienste): Promise<Jahr> {
  const { indexId, ordnerId } = await findeIndex(jahr, d)
  const [b, o, a, k] = await Promise.all(['Belege', 'Objekte', 'Aufteilung', 'Kinder'].map((n) => d.leseBlatt(indexId, n)))
  return {
    indexId, ordnerId,
    belege: b.filter((z) => z[0]).map(belegAusZeile),
    objekte: o.filter((z) => z[0]).map(objektAusZeile),
    aufteilung: a.filter((z) => z[0]).map(aufteilungAusZeile),
    kinder: k.filter((z) => z[0]).map(kindAusZeile),
  }
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

  let datei = w.pdf ? await d.findeBelegDatei(w.id) : null
  let nr = Number(/_B(\d+)_/.exec(datei?.name ?? '')?.[1] ?? 0)
  if (!w.pdf) {
    // E6: Beleg aus Vorlage – verweist auf den Dauerbeleg, es wird keine Datei hochgeladen
    nr = naechsteBelegnr(j.belege, jahr)
    // dateiname bleibt leer: so wird der Dauerbeleg beim Bearbeiten nie verschoben oder umbenannt
    datei = { id: w.dauerbeleg?.id ?? '', name: '' }
  } else if (!datei) {
    nr = naechsteBelegnr(j.belege, jahr)
    const ziel = await d.holeOderErstellePfad(zielOrdnerPfad(w.entwurf, konfig, j.objekte, j.kinder), j.ordnerId)
    datei = await d.ladeHoch(dateiname(w.entwurf, nr), 'application/pdf', w.pdf, ziel.id, { steuerbeleg_beleg: w.id })
  }
  const jetzt = d.jetzt()
  const beleg: Beleg = {
    ...w.entwurf, steuerjahr: jahr, belegnr: nr || naechsteBelegnr(j.belege, jahr),
    datei_ids: datei.id, dateiname: datei.name,
    erfasst_von: w.erfasst_von, erfasst_am: w.erfasst_am, geaendert_von: d.nutzer(), geaendert_am: jetzt, version: 1,
  }
  // Aufteilung vor der Belegzeile schreiben; bei Wiederholung nur fehlende Anteile ergänzen
  if (w.entwurf.aufteilung.length && !j.aufteilung.some((a) => a.beleg_id === w.id)) {
    await d.haengeAn(j.indexId, 'Aufteilung', w.entwurf.aufteilung.map((a) => zeileAusAufteilung(w.id, a)))
    j.aufteilung.push(...w.entwurf.aufteilung.map((a) => ({ ...a, beleg_id: w.id })))
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
