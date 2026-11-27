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
  verschiebeDatei: (id: string, name: string, ordnerId: string) => Promise<{ id: string; name: string }>
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
  const name = dateiname(neu, alt.belegnr)
  const pfadAlt = zielOrdnerPfad(alt, d.konfig, d.stamm.objekte, d.stamm.kinder).join('/')
  const pfadNeu = zielOrdnerPfad(neu, d.konfig, d.stamm.objekte, d.stamm.kinder)
  if (alt.datei_ids && (name !== alt.dateiname || pfadNeu.join('/') !== pfadAlt)) {
    const ordner = await d.holeOderErstellePfad(pfadNeu, d.ordnerId)
    datei = await d.verschiebeDatei(alt.datei_ids, name, ordner.id)
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
  return beleg
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
