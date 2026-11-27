// Stammdaten aus dem Belegindex: Objekte, Einheiten, Einnahmen, Aufteilungen (Anlage V).
// Lesen und Schreiben nur online; eine Kopie liegt lokal für die Erfassung ohne Netz.
import { BLAETTER } from './schema'
import type { Anteil, Einheit, Einnahme, Objekt, Umlageschluessel } from '../fachlich/objekte'

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

export interface Stamm {
  objekte: Objekt[]
  einheiten: Einheit[]
  einnahmen: Einnahme[]
  aufteilung: AufteilungZeile[]
}

export const LEER: Stamm = { objekte: [], einheiten: [], einnahmen: [], aufteilung: [] }

export function stammAus(blaetter: Record<string, Zeile[]>): Stamm {
  const voll = (l: Zeile[] | undefined) => (l ?? []).filter((z) => z[0] !== undefined && z[0] !== '')
  return {
    objekte: voll(blaetter.Objekte).map(objektAusZeile),
    einheiten: voll(blaetter.Einheiten).map(einheitAusZeile),
    einnahmen: voll(blaetter.Einnahmen).map(einnahmeAusZeile),
    aufteilung: voll(blaetter.Aufteilung).map(aufteilungAusZeile),
  }
}
