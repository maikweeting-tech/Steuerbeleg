// Stammdaten aus dem Belegindex: Objekte, Einheiten, Einnahmen, Aufteilungen (Anlage V).
// Lesen und Schreiben nur online; eine Kopie liegt lokal für die Erfassung ohne Netz.
import { BLAETTER } from './schema'
import type { Anteil, Einheit, Einnahme, Objekt, Umlageschluessel } from '../fachlich/objekte'
import type { Stichwort } from '../fachlich/zuordnung'
import type { Arbeitstage, Fahrt, Fahrtzweck, Kind } from '../fachlich/personen'
import type { Rhythmus, Vorlage } from '../fachlich/vorlagen'
import type { Buchung, Markierung } from '../fachlich/kontoauszug'
import type { Antworten } from '../fachlich/assistent'
import { KOPF_ID, LEERER_KOPF, type BescheidKopf, type BescheidPosten } from '../fachlich/bescheid'
import type { AfaEingabe } from '../fachlich/afa'

type Zelle = string | number
type Zeile = (Zelle | undefined)[]

const lies = (blatt: string, z: Zeile) => (s: string) => {
  const v = z[BLAETTER[blatt].indexOf(s)]
  return v === undefined || v === null ? '' : String(v)
}
const zahl = (t: string) => (t === '' ? null : Number(t))

export function objektAusZeile(z: Zeile): Objekt {
  const g = lies('Objekte', z)
  return {
    id: g('id'), typ: 'V', bezeichnung: g('bezeichnung'), adresse: g('adresse'), anschaffungsdatum: g('anschaffungsdatum'),
    anschaffungskosten_ct: zahl(g('anschaffungskosten_ct')), afa_satz: g('afa_satz'), baujahr: zahl(g('baujahr')),
    gebaeudeanteil_prozent: zahl(g('gebaeudeanteil_prozent')), wohnflaeche_m2: zahl(g('wohnflaeche_m2')),
    umlageschluessel: (g('umlageschluessel') || 'wohnflaeche') as Umlageschluessel, aktiv: g('aktiv') !== 'nein',
  }
}
export function zeileAusObjekt(o: Objekt): Zelle[] {
  const w: Record<string, Zelle> = {
    ...o, anschaffungskosten_ct: o.anschaffungskosten_ct ?? '', baujahr: o.baujahr ?? '',
    gebaeudeanteil_prozent: o.gebaeudeanteil_prozent ?? '', wohnflaeche_m2: o.wohnflaeche_m2 ?? '', aktiv: o.aktiv ? 'ja' : 'nein',
  } as unknown as Record<string, Zelle>
  return BLAETTER.Objekte.map((s) => w[s] ?? '')
}

export function einheitAusZeile(z: Zeile): Einheit {
  const g = lies('Einheiten', z)
  return { id: g('id'), objekt_id: g('objekt_id'), bezeichnung: g('bezeichnung'), wohnflaeche_m2: zahl(g('wohnflaeche_m2')), personen: zahl(g('personen')), fest_prozent: zahl(g('fest_prozent')) }
}
export function zeileAusEinheit(e: Einheit): Zelle[] {
  const w: Record<string, Zelle> = { ...e, wohnflaeche_m2: e.wohnflaeche_m2 ?? '', personen: e.personen ?? '', fest_prozent: e.fest_prozent ?? '' }
  return BLAETTER.Einheiten.map((s) => w[s] ?? '')
}

export function einnahmeAusZeile(z: Zeile): Einnahme {
  const g = lies('Einnahmen', z)
  return { id: g('id'), objekt_id: g('objekt_id'), einheit_id: g('einheit_id'), monat: g('monat'), art: (g('art') || 'Miete') as Einnahme['art'], betrag_ct: Number(g('betrag_ct') || 0), notiz: g('notiz') }
}
export function zeileAusEinnahme(e: Einnahme): Zelle[] {
  const w: Record<string, Zelle> = { ...e }
  return BLAETTER.Einnahmen.map((s) => w[s] ?? '')
}

export type AufteilungZeile = Anteil & { beleg_id: string }
export function aufteilungAusZeile(z: Zeile): AufteilungZeile {
  const g = lies('Aufteilung', z)
  return { beleg_id: g('beleg_id'), objekt_id: g('objekt_id'), einheit_id: g('einheit_id'), anteil_prozent: Number(g('anteil_prozent') || 0) }
}
export const zeileAusAufteilung = (belegId: string, a: Anteil): Zelle[] => [belegId, a.objekt_id, a.einheit_id, a.anteil_prozent]

// ---------------------------------------------------------------- ab M4: Kinder, Fahrten, Arbeitstage

export function kindAusZeile(z: Zeile): Kind {
  const g = lies('Kinder', z)
  return { id: g('id'), name: g('name'), geburtsdatum: g('geburtsdatum') }
}
export const zeileAusKind = (k: Kind): Zelle[] => BLAETTER.Kinder.map((s) => (k as unknown as Record<string, Zelle>)[s] ?? '')

export function fahrtAusZeile(z: Zeile): Fahrt {
  const g = lies('Fahrten', z)
  return { id: g('id'), person: g('person'), datum: g('datum'), start: g('start'), ziel: g('ziel'), km: Number(g('km') || 0), zweck: (g('zweck') || 'Sonstiges') as Fahrtzweck, fahrzeug: g('fahrzeug') }
}
export const zeileAusFahrt = (f: Fahrt): Zelle[] => BLAETTER.Fahrten.map((s) => (f as unknown as Record<string, Zelle>)[s] ?? '')

export function arbeitstageAusZeile(z: Zeile): Arbeitstage {
  const g = lies('Arbeitstage', z)
  return { person: g('person'), jahr: Number(g('jahr') || 0), entfernung_km: zahl(g('entfernung_km')), arbeitstage: Number(g('arbeitstage') || 0), homeoffice_tage: Number(g('homeoffice_tage') || 0) }
}
export const zeileAusArbeitstage = (a: Arbeitstage): Zelle[] =>
  [a.person, a.jahr, a.entfernung_km ?? '', a.arbeitstage, a.homeoffice_tage]

// ---------------------------------------------------------------- ab M6: Vorlagen, Buchungen

export function vorlageAusZeile(z: Zeile): Vorlage {
  const g = lies('Vorlagen', z)
  return {
    id: g('id'), bezeichnung: g('bezeichnung'), aussteller: g('aussteller'), betrag_ct: zahl(g('betrag_ct')),
    rhythmus: (['monatlich', 'vierteljaehrlich', 'jaehrlich'].includes(g('rhythmus')) ? g('rhythmus') : 'jaehrlich') as Rhythmus,
    modul: g('modul'), kategorie: g('kategorie'), person: g('person'), objekt_id: g('objekt_id'), einheit_id: g('einheit_id'),
    kind_id: g('kind_id'), dauerbeleg_datei_id: g('dauerbeleg_datei_id'), aktiv: g('aktiv') !== 'nein', faellig_monat: Number(g('faellig_monat') || 1),
  }
}
export function zeileAusVorlage(v: Vorlage): Zelle[] {
  const w: Record<string, Zelle> = { ...v, betrag_ct: v.betrag_ct ?? '', aktiv: v.aktiv ? 'ja' : 'nein' } as unknown as Record<string, Zelle>
  return BLAETTER.Vorlagen.map((s) => w[s] ?? '')
}

export function buchungAusZeile(z: Zeile): Buchung & { markierung: Markierung; beleg_id: string; notiz: string } {
  const g = lies('Buchungen', z)
  return {
    id: g('id'), konto: g('konto'), datum: g('datum'), betrag_ct: Number(g('betrag_ct') || 0), gegenseite: g('gegenseite'), zweck: g('zweck'),
    markierung: (g('markierung') || 'beleg_fehlt') as Markierung, beleg_id: g('beleg_id'), notiz: g('notiz'),
  }
}
export function zeileAusBuchung(b: Buchung, m: Markierung, beleg_id: string, notiz: string, von: string, am: string): Zelle[] {
  const w: Record<string, Zelle> = { ...b, markierung: m, beleg_id, notiz, markiert_von: von, markiert_am: am }
  return BLAETTER.Buchungen.map((s) => w[s] ?? '')
}

// ---------------------------------------------------------------- ab M8: Bescheid (E12)

export function bescheidAusZeile(z: Zeile): BescheidPosten {
  const g = lies('Bescheid', z)
  return { id: g('id'), bezeichnung: g('bezeichnung'), modul: g('modul'), erklaerung_ct: zahl(g('erklaerung_ct')), bescheid_ct: zahl(g('bescheid_ct')), notiz: g('notiz') }
}
export function kopfAusZeile(z: Zeile | undefined): BescheidKopf {
  if (!z) return LEERER_KOPF
  const g = lies('Bescheid', z)
  return { bescheiddatum: g('bescheiddatum'), einspruchsfrist: g('einspruchsfrist'), notiz: g('notiz') }
}
export function zeileAusBescheid(p: BescheidPosten, von: string, am: string): Zelle[] {
  const w: Record<string, Zelle> = { ...p, erklaerung_ct: p.erklaerung_ct ?? '', bescheid_ct: p.bescheid_ct ?? '', geaendert_von: von, geaendert_am: am }
  return BLAETTER.Bescheid.map((s) => w[s] ?? '')
}
export function zeileAusKopf(k: BescheidKopf, von: string, am: string): Zelle[] {
  const w: Record<string, Zelle> = { ...k, id: KOPF_ID, bezeichnung: 'Bescheid', geaendert_von: von, geaendert_am: am }
  return BLAETTER.Bescheid.map((s) => w[s] ?? '')
}

// ---------------------------------------------------------------- ab S1: Erklärungs-Assistent

export function antwortenAus(zeilen: Zeile[]): Antworten {
  const a: Antworten = {}
  for (const z of zeilen) { const g = lies('Erklaerung', z); if (g('id')) a[g('id')] = { wert: g('wert'), notiz: g('notiz') } }
  return a
}
export function zeileAusAntwort(id: string, wert: string, notiz: string, von: string, am: string): Zelle[] {
  const w: Record<string, Zelle> = { id, wert, notiz, geaendert_von: von, geaendert_am: am }
  return BLAETTER.Erklaerung.map((s) => w[s] ?? '')
}

// ---------------------------------------------------------------- eigene Stichwörter (Zuordnung)

export function stichwoerterAus(zeilen: Zeile[]): Stichwort[] {
  return zeilen.map((z) => { const g = lies('Stichwoerter', z); return { stichwort: g('stichwort'), modul: g('modul'), kategorie: g('kategorie') } }).filter((x) => x.stichwort && x.modul)
}
export function zeileAusStichwort(s: Stichwort, von: string, am: string): Zelle[] {
  const w: Record<string, Zelle> = { ...s, geaendert_von: von, geaendert_am: am }
  return BLAETTER.Stichwoerter.map((x) => w[x] ?? '')
}

// ---------------------------------------------------------------- AfA-Hilfsrechnung

const AFA_ZAHLEN = ['kaufpreis_ct', 'grunderwerbsteuer_ct', 'notar_ct', 'grundbuch_ct', 'makler_ct', 'sonstige_nk_ct', 'grundanteil_prozent', 'bodenrichtwert_ct', 'grundstueck_m2', 'fertigstellungsjahr', 'eigennutzung_prozent', 'renovierung_ct'] as const
export function afaAusZeile(z: Zeile): AfaEingabe {
  const g = lies('AfA', z)
  const e = { objekt_id: g('objekt_id'), uebergang: g('uebergang'), bisher: g('bisher') } as AfaEingabe
  for (const k of AFA_ZAHLEN) e[k] = zahl(g(k))
  return e
}
export function zeileAusAfa(e: AfaEingabe, von: string, am: string): Zelle[] {
  const w: Record<string, Zelle | null> = { ...e, geaendert_von: von, geaendert_am: am }
  return BLAETTER.AfA.map((s) => w[s] ?? '')
}

export interface Stamm {
  objekte: Objekt[]
  einheiten: Einheit[]
  einnahmen: Einnahme[]
  aufteilung: AufteilungZeile[]
  kinder: Kind[]
  fahrten: Fahrt[]
  arbeitstage: Arbeitstage[]
  /** offene Verschiebe-Aufträge (beleg_id) */
  pdfOffen: string[]
  vorlagen: Vorlage[]
  buchungen: ReturnType<typeof buchungAusZeile>[]
  bescheid: BescheidPosten[]
  bescheidKopf: BescheidKopf
  antworten: Antworten
  stichwoerter: Stichwort[]
  afa: AfaEingabe[]
}

export const LEER: Stamm = { objekte: [], einheiten: [], einnahmen: [], aufteilung: [], kinder: [], fahrten: [], arbeitstage: [], pdfOffen: [], vorlagen: [], buchungen: [], bescheid: [], bescheidKopf: LEERER_KOPF, antworten: {}, stichwoerter: [], afa: [] }

export function stammAus(blaetter: Record<string, Zeile[]>): Stamm {
  const voll = (l: Zeile[] | undefined) => (l ?? []).filter((z) => z[0] !== undefined && z[0] !== '')
  return {
    objekte: voll(blaetter.Objekte).map(objektAusZeile),
    einheiten: voll(blaetter.Einheiten).map(einheitAusZeile),
    einnahmen: voll(blaetter.Einnahmen).map(einnahmeAusZeile),
    aufteilung: voll(blaetter.Aufteilung).map(aufteilungAusZeile),
    kinder: voll(blaetter.Kinder).map(kindAusZeile),
    fahrten: voll(blaetter.Fahrten).map(fahrtAusZeile),
    arbeitstage: voll(blaetter.Arbeitstage).map(arbeitstageAusZeile),
    pdfOffen: voll(blaetter.Auftraege).filter((z) => !z[8]).map((z) => String(z[2] ?? '')),
    vorlagen: voll(blaetter.Vorlagen).map(vorlageAusZeile),
    buchungen: voll(blaetter.Buchungen).map(buchungAusZeile),
    bescheid: voll(blaetter.Bescheid).filter((z) => z[0] !== KOPF_ID).map(bescheidAusZeile),
    antworten: antwortenAus(voll(blaetter.Erklaerung)),
    stichwoerter: stichwoerterAus(voll(blaetter.Stichwoerter)),
    afa: voll(blaetter.AfA).map(afaAusZeile),
    bescheidKopf: kopfAusZeile(voll(blaetter.Bescheid).find((z) => z[0] === KOPF_ID)),
  }
}
