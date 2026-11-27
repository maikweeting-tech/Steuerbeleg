// E14: Beleg nachträglich ändern. Ablauf (nur online):
// 1. Zeile im Belegindex neu lesen und Version vergleichen (gleichzeitige Änderung durch Anna/Maik erkennen)
// 2. PDF umbenennen bzw. in den neuen Zielordner verschieben (Belegnummer bleibt)
// 3. Aufteilung ersetzen, Belegzeile überschreiben (Version + 1), je geändertem Feld eine Protokollzeile
import { belegAusZeile, dateiname, wirksamesSteuerjahr, zeileAus, zielOrdnerPfad, type Beleg, type BelegEntwurf } from '../fachlich/beleg'
import type { SteuerjahrKonfig } from '../fachlich/konfiguration'
import type { Anteil } from '../fachlich/objekte'
import { zeileAusAufteilung, type Stamm } from './stamm'

type Zelle = string | number

export interface BearbeitenDienste {
  konfig: SteuerjahrKonfig
  indexId: string
  ordnerId: string
  stamm: Pick<Stamm, 'objekte' | 'kinder' | 'aufteilung'>
  nutzer: () => string
  jetzt: () => string
  leseBlatt: (sheetId: string, blatt: string) => Promise<Zelle[][]>
  ersetzeZeile: (sheetId: string, blatt: string, id: string, zeile: Zelle[] | null) => Promise<boolean>
  leereZeilen: (sheetId: string, blatt: string, id: string) => Promise<number>
  haengeAn: (sheetId: string, blatt: string, zeilen: Zelle[][]) => Promise<void>
  holeOderErstellePfad: (pfad: string[], elternId: string) => Promise<{ id: string }>
  verschiebeDatei: (id: string, name: string, ordnerId: string) => Promise<{ id: string; name: string; offen?: boolean }>
}

/** Felder, die im Protokoll einzeln erscheinen. */
const FELDER: (keyof BelegEntwurf)[] = [
  'belegdatum', 'zahlungsdatum', 'betrag_ct', 'aussteller', 'person', 'modul', 'kategorie', 'status', 'notiz',
  'objekt_id', 'einheit_id', 'umlagefaehig', 'kind_id', 'zahlungsart', 'arbeitskosten_ct', 'material_ct',
]

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const aufteilungText = (l: Anteil[]) => l.map((a) => `${a.objekt_id}${a.einheit_id ? '/' + a.einheit_id : ''}:${a.anteil_prozent}`).join(' ')

/** Liste der geänderten Felder [feld, alt, neu]. */
export function aenderungen(alt: Beleg, altAufteilung: Anteil[], neu: BelegEntwurf): [string, string, string][] {
  const l: [string, string, string][] = FELDER.filter((f) => text(alt[f]) !== text(neu[f])).map((f) => [f, text(alt[f]), text(neu[f])])
  if (aufteilungText(altAufteilung) !== aufteilungText(neu.aufteilung)) l.push(['aufteilung', aufteilungText(altAufteilung), aufteilungText(neu.aufteilung)])
  return l
}

export class KonfliktFehler extends Error {}

/** Speichert die Änderung. Gibt den neuen Stand des Belegs zurück. */
export async function aendereBeleg(alt: Beleg, neu: BelegEntwurf, d: BearbeitenDienste): Promise<Beleg> {
  if (wirksamesSteuerjahr(neu) !== alt.steuerjahr)
    throw new Error('Das Steuerjahr lässt sich beim Bearbeiten nicht ändern (anderer Belegindex). Bitte den Beleg im richtigen Jahr neu erfassen.')
  const altAufteilung = d.stamm.aufteilung.filter((a) => a.beleg_id === alt.id)
  const liste = aenderungen(alt, altAufteilung, neu)
  if (!liste.length) return alt

  // 1. Gleichzeitige Änderung erkennen
  const zeilen = await d.leseBlatt(d.indexId, 'Belege')
  const aktuell = zeilen.filter((z) => z[0] === alt.id).map(belegAusZeile)[0]
  if (!aktuell) throw new KonfliktFehler('Der Beleg ist im Belegindex nicht mehr vorhanden. Bitte „Aktualisieren“.')
  if (aktuell.version !== alt.version)
    throw new KonfliktFehler(`Der Beleg wurde inzwischen geändert (von ${aktuell.geaendert_von || 'unbekannt'}). Bitte „Aktualisieren“ und erneut bearbeiten.`)

  // 2. PDF umbenennen/verschieben (Belegnummer bleibt)
  let datei = { id: alt.datei_ids, name: alt.dateiname }
  let auftrag: Zelle[] | null = null
  const name = dateiname(neu, alt.belegnr)
  const pfadAlt = zielOrdnerPfad(alt, d.konfig, d.stamm.objekte, d.stamm.kinder).join('/')
  const pfadNeu = zielOrdnerPfad(neu, d.konfig, d.stamm.objekte, d.stamm.kinder)
  if (alt.datei_ids && (name !== alt.dateiname || pfadNeu.join('/') !== pfadAlt)) {
    const id = alt.datei_ids.split(',')[0]
    const ordner = await d.holeOderErstellePfad(pfadNeu, d.ordnerId)
    const erg = await d.verschiebeDatei(id, name, ordner.id)
    datei = { id: alt.datei_ids, name }
    // Google erlaubt das Verschieben meist nur dem Eigentümer: Auftrag hinterlegen, den dessen App erledigt
    if (erg.offen) auftrag = [crypto.randomUUID(), 'verschieben', alt.id, id, pfadNeu.join('/'), name, d.nutzer(), d.jetzt(), '']
  }

  // 3. Aufteilung, Belegzeile, Protokoll
  if (liste.some(([f]) => f === 'aufteilung')) {
    if (altAufteilung.length) await d.leereZeilen(d.indexId, 'Aufteilung', alt.id)
    if (neu.aufteilung.length) await d.haengeAn(d.indexId, 'Aufteilung', neu.aufteilung.map((a) => zeileAusAufteilung(alt.id, a)))
  }
  const jetzt = d.jetzt()
  const beleg: Beleg = {
    ...alt, ...neu, steuerjahr: alt.steuerjahr, belegnr: alt.belegnr,
    datei_ids: datei.id, dateiname: datei.name, geaendert_von: d.nutzer(), geaendert_am: jetzt, version: alt.version + 1,
  }
  if (!(await d.ersetzeZeile(d.indexId, 'Belege', alt.id, zeileAus(beleg)))) throw new KonfliktFehler('Belegzeile nicht gefunden.')
  await d.haengeAn(d.indexId, 'Protokoll', liste.map(([f, a, n]) => [jetzt, d.nutzer(), 'geändert', alt.id, f, a, n]))
  if (auftrag) await d.haengeAn(d.indexId, 'Auftraege', [auftrag])
  return { ...beleg, pdfOffen: !!auftrag } as Beleg & { pdfOffen?: boolean }
}

// ---------------------------------------------------------------- Aufträge an den Eigentümer

export interface Auftrag { id: string; beleg_id: string; datei_id: string; ziel_pfad: string; name: string; erledigt_am: string }

export const auftragAusZeile = (z: Zelle[]): Auftrag => ({
  id: String(z[0] ?? ''), beleg_id: String(z[2] ?? ''), datei_id: String(z[3] ?? ''), ziel_pfad: String(z[4] ?? ''), name: String(z[5] ?? ''), erledigt_am: String(z[8] ?? ''),
})

/** Erledigt offene Aufträge, soweit das eigene Konto die Datei verschieben darf. Gibt die Anzahl erledigter zurück. */
export async function erledigeAuftraege(d: Pick<BearbeitenDienste, 'indexId' | 'ordnerId' | 'jetzt' | 'leseBlatt' | 'ersetzeZeile' | 'holeOderErstellePfad' | 'verschiebeDatei'>): Promise<number> {
  const zeilen = await d.leseBlatt(d.indexId, 'Auftraege')
  const offen = zeilen.filter((z) => z[0] && z[1] === 'verschieben' && !z[8]).map((z) => ({ z, a: auftragAusZeile(z) }))
  // Mehrere Aufträge zur selben Datei: nur der letzte zählt, die älteren werden mit erledigt
  const letzter = new Map(offen.map(({ a }) => [a.datei_id, a.id]))
  let n = 0
  for (const { z, a } of offen) {
    try {
      if (letzter.get(a.datei_id) === a.id) {
        const ordner = await d.holeOderErstellePfad(a.ziel_pfad.split('/'), d.ordnerId)
        if ((await d.verschiebeDatei(a.datei_id, a.name, ordner.id)).offen) continue
      }
      const neu = [...z]
      neu[8] = d.jetzt()
      await d.ersetzeZeile(d.indexId, 'Auftraege', a.id, neu)
      n++
    } catch { /* Datei weg o. Ä.: Auftrag bleibt sichtbar offen */ }
  }
  return n
}

/** Macht aus einem gespeicherten Beleg wieder einen Entwurf (für das Formular). */
export function entwurfAus(b: Beleg, aufteilung: Anteil[]): BelegEntwurf {
  const e: BelegEntwurf = {
    id: b.id, belegdatum: b.belegdatum, zahlungsdatum: b.zahlungsdatum, betrag_ct: b.betrag_ct, aussteller: b.aussteller,
    person: b.person, modul: b.modul, kategorie: b.kategorie, steuerjahr: b.steuerjahr, steuerjahr_manuell: b.steuerjahr_manuell,
    status: b.status, notiz: b.notiz, objekt_id: b.objekt_id, einheit_id: b.einheit_id, umlagefaehig: b.umlagefaehig,
    aufteilung: [], kind_id: b.kind_id, zahlungsart: b.zahlungsart, arbeitskosten_ct: b.arbeitskosten_ct, material_ct: b.material_ct,
  }
  return { ...e, aufteilung: aufteilung.map(({ objekt_id, einheit_id, anteil_prozent }) => ({ objekt_id, einheit_id, anteil_prozent })) }
}
