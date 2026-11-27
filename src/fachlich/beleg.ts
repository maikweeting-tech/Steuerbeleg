// Fachlogik eines Belegs: Pflichtfelder, Steuerjahr, Dateiname, Zielordner, Duplikate,
// Umwandlung in eine Zeile des Belegindex. Keine Google- oder Browser-Abhängigkeiten (testbar).
import { BLAETTER } from '../daten/schema'
import { ordnerName, type SteuerjahrKonfig } from './konfiguration'
import { hauptObjekt, pruefeAufteilung, type Anteil } from './objekte'

export type BelegPerson = string // Personen-Id aus der Konfiguration oder 'gemeinsam'
export type BelegStatus = 'offen' | 'geprüft' | 'unvollständig'

export interface BelegEntwurf {
  id: string
  belegdatum: string // ISO JJJJ-MM-TT
  zahlungsdatum: string // ISO
  betrag_ct: number | null
  aussteller: string
  person: BelegPerson
  modul: string
  kategorie: string
  steuerjahr: number | null
  steuerjahr_manuell: boolean
  status: BelegStatus
  notiz: string
  // Anlage V (ab M3)
  objekt_id: string
  einheit_id: string
  umlagefaehig: boolean
  /** leer = keine Aufteilung; sonst Anteile je Objekt/Einheit (Summe 100 %) */
  aufteilung: Anteil[]
  // ab M4
  kind_id: string
  zahlungsart: '' | 'unbar' | 'bar'
  /** § 35a: Lohn-/Arbeitskosten und Material, jeweils brutto */
  arbeitskosten_ct: number | null
  material_ct: number | null
  // ab M6 (E10): Frage an den Steuerberater, leer = keine
  frage: string
}

export interface Beleg extends BelegEntwurf {
  belegnr: number
  datei_ids: string
  dateiname: string
  erfasst_von: string
  erfasst_am: string
  geaendert_von: string
  geaendert_am: string
  version: number
}

export const GEMEINSAM = 'gemeinsam'

export function leererEntwurf(id: string): BelegEntwurf {
  return {
    id, belegdatum: '', zahlungsdatum: '', betrag_ct: null, aussteller: '', person: '',
    modul: '', kategorie: '', steuerjahr: null, steuerjahr_manuell: false, status: 'offen', notiz: '',
    objekt_id: '', einheit_id: '', umlagefaehig: false, aufteilung: [],
    kind_id: '', zahlungsart: '', arbeitskosten_ct: null, material_ct: null, frage: '',
  }
}

/**
 * Annahme A6: Steuerjahr = Jahr des Zahlungsdatums (Zufluss-/Abflussprinzip, § 11 EStG).
 * Die 10-Tage-Regel für regelmäßig wiederkehrende Zahlungen wird NICHT automatisch angewandt,
 * dafür lässt sich das Steuerjahr je Beleg manuell überschreiben.
 */
export function steuerjahrAus(zahlungsdatum: string): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(zahlungsdatum)
  return m ? Number(m[1]) : null
}

/** Wirksames Steuerjahr: manuell gesetzt oder aus dem Zahlungsdatum. */
export function wirksamesSteuerjahr(e: BelegEntwurf): number | null {
  return e.steuerjahr_manuell ? e.steuerjahr : steuerjahrAus(e.zahlungsdatum)
}

/** Liefert Fehlermeldungen; leere Liste = speicherbar. */
export function pruefePflicht(e: BelegEntwurf, konfigs: Record<number, SteuerjahrKonfig>, objekteVorhanden = false, kinderVorhanden = false): string[] {
  const f: string[] = []
  if (!e.belegdatum) f.push('Belegdatum fehlt')
  if (!e.zahlungsdatum) f.push('Zahlungsdatum fehlt')
  if (e.betrag_ct === null) f.push('Betrag fehlt')
  else if (e.betrag_ct === 0) f.push('Betrag ist 0')
  if (!e.aussteller.trim()) f.push('Aussteller fehlt')
  if (!e.person) f.push('Person fehlt')
  if (!e.modul) f.push('Modul fehlt')
  const jahr = wirksamesSteuerjahr(e)
  if (!jahr) f.push('Steuerjahr fehlt')
  const konfig = jahr ? konfigs[jahr] : undefined
  if (jahr && !konfig) f.push(`Für das Steuerjahr ${jahr} gibt es keine Konfiguration`)
  if (konfig && e.modul) {
    const m = konfig.module.find((x) => x.id === e.modul)
    if (!m) f.push(`Modul ${e.modul} unbekannt`)
    else {
      if (m.ebene !== 'ohne_kategorie' && !e.kategorie) f.push('Kategorie fehlt')
      if (e.kategorie && !m.kategorien.some((k) => k.schluessel === e.kategorie)) f.push('Kategorie passt nicht zum Modul')
      if (m.ebene === 'person' && e.person === GEMEINSAM) f.push(`${m.name} gilt je Person, nicht „gemeinsam“`)
      if (m.ebene === 'objekt') {
        if (e.aufteilung.length) f.push(...pruefeAufteilung(e.aufteilung))
        else if (objekteVorhanden && !e.objekt_id) f.push('Objekt fehlt')
      }
      if (m.ebene === 'kind' && kinderVorhanden && !e.kind_id) f.push('Kind fehlt')
      if (m.id === '35A' && e.betrag_ct !== null) {
        const a = e.arbeitskosten_ct
        const mat = e.material_ct
        if (a !== null && mat !== null && a + mat !== e.betrag_ct)
          f.push(`Arbeitskosten + Material = ${betragText(a + mat).replace('EUR', ' €')} statt Betrag ${betragText(e.betrag_ct).replace('EUR', ' €')}`)
        else if ((a ?? 0) > e.betrag_ct || (mat ?? 0) > e.betrag_ct) f.push('Arbeitskosten bzw. Material größer als der Betrag')
      }
    }
  }
  return f
}

/**
 * Hinweise, die das Speichern nicht verhindern (gelb anzeigen).
 * § 35a: begünstigt sind nur Arbeitskosten bei unbarer Zahlung (§ 35a Abs. 5 EStG – Annahme, bitte prüfen).
 */
export function belegHinweise(e: BelegEntwurf): string[] {
  const h: string[] = []
  if (e.modul === '35A') {
    if (e.zahlungsart === 'bar') h.push('Barzahlung: Für § 35a wird in der Regel eine Zahlung auf das Konto des Leistenden verlangt. Bitte prüfen.')
    if (!e.zahlungsart) h.push('Zahlungsart (unbar/bar) fehlt.')
    if (e.arbeitskosten_ct === null) h.push('Arbeitskosten fehlen. Begünstigt ist in der Regel nur der Lohnanteil laut Rechnung.')
  }
  return h
}

/**
 * Zielordner relativ zu Steuer/<Jahr>/.
 * Anlage V: <Modulordner>/<Objekt>/<Kategorie>; aufgeteilte Belege liegen beim Objekt mit dem
 * größten Anteil (Annahme). Ohne Objekt (z. B. noch keins angelegt) direkt im Modulordner.
 * Ebene „kind“: <Modulordner>/<Kind>/<Kategorie>; ohne Kind direkt im Modulordner.
 */
export function zielOrdnerPfad(
  e: BelegEntwurf, konfig: SteuerjahrKonfig,
  objekte: { id: string; bezeichnung: string }[] = [], kinder: { id: string; name: string }[] = [],
): string[] {
  const m = konfig.module.find((x) => x.id === e.modul)
  if (!m) throw new Error(`Modul ${e.modul} unbekannt`)
  const kat = m.kategorien.find((k) => k.schluessel === e.kategorie)
  if (m.ebene === 'person') {
    const p = konfig.personen.find((x) => x.id === e.person)
    if (!p) throw new Error('Person fehlt')
    const basis = m.ordner.replace('{person}', p.name).split('/').map(ordnerName)
    return kat ? [...basis, ordnerName(kat.name)] : basis
  }
  const basis = m.ordner.split('/').map(ordnerName)
  if (m.ebene === 'keine' && kat) return [...basis, ordnerName(kat.name)]
  if (m.ebene === 'objekt') {
    const id = e.aufteilung.length ? hauptObjekt(e.aufteilung) : e.objekt_id
    const o = objekte.find((x) => x.id === id)
    if (o) return kat ? [...basis, ordnerName(o.bezeichnung), ordnerName(kat.name)] : [...basis, ordnerName(o.bezeichnung)]
  }
  if (m.ebene === 'kind') {
    const k = kinder.find((x) => x.id === e.kind_id)
    if (k) return kat ? [...basis, ordnerName(k.name), ordnerName(kat.name)] : [...basis, ordnerName(k.name)]
  }
  return basis
}

const VERBOTEN = /[\\/:*?"<>|\n\r\t]/g

/** Aussteller für Dateinamen: verbotene Zeichen weg, Leerzeichen → "-", max. 40 Zeichen. */
export function sauber(text: string): string {
  return text.replace(VERBOTEN, ' ').trim().replace(/\s+/g, '-').slice(0, 40).replace(/-+$/, '') || 'unbekannt'
}

/** Betrag für Dateinamen: 412,50EUR (Komma, ohne Tausenderpunkt). */
export function betragText(cent: number): string {
  const neg = cent < 0
  const c = Math.abs(cent)
  return `${neg ? '-' : ''}${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}EUR`
}

/** Dateiname: <Belegdatum>_B<Nr. 4-stellig>_<Aussteller>_<Betrag>.pdf */
export function dateiname(e: BelegEntwurf, belegnr: number): string {
  return `${e.belegdatum}_B${String(belegnr).padStart(4, '0')}_${sauber(e.aussteller)}_${betragText(e.betrag_ct ?? 0)}.pdf`
}

/** Nächste laufende Nummer im Steuerjahr. */
export function naechsteBelegnr(vorhandene: Pick<Beleg, 'belegnr' | 'steuerjahr'>[], jahr: number): number {
  return vorhandene.filter((b) => b.steuerjahr === jahr).reduce((max, b) => Math.max(max, b.belegnr || 0), 0) + 1
}

// ---------------------------------------------------------------- Duplikate (E1)

export interface DuplikatKandidat {
  id: string
  belegdatum: string
  betrag_ct: number | null
  aussteller: string
  belegnr?: number
}

export interface Duplikat {
  beleg: DuplikatKandidat
  stufe: 'hoch' | 'mittel'
}

const normal = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')

/** Aussteller gelten als ähnlich, wenn der eine im anderen enthalten ist (nach Normalisierung). */
export function aehnlicherAussteller(a: string, b: string): boolean {
  const x = normal(a)
  const y = normal(b)
  if (!x || !y) return false
  return x.includes(y) || y.includes(x)
}

/** Treffer = gleiches Belegdatum und gleicher Betrag; ähnlicher Aussteller → Stufe „hoch“. */
export function findeDuplikate(e: Pick<BelegEntwurf, 'id' | 'belegdatum' | 'betrag_ct' | 'aussteller'>, vorhandene: DuplikatKandidat[]): Duplikat[] {
  if (!e.belegdatum || e.betrag_ct === null) return []
  return vorhandene
    .filter((b) => b.id !== e.id && b.belegdatum === e.belegdatum && b.betrag_ct === e.betrag_ct)
    .map((b) => ({ beleg: b, stufe: aehnlicherAussteller(b.aussteller, e.aussteller) ? 'hoch' as const : 'mittel' as const }))
    .sort((a, b) => (a.stufe === b.stufe ? 0 : a.stufe === 'hoch' ? -1 : 1))
}

// ---------------------------------------------------------------- Zeilen im Belegindex

const SPALTEN = BLAETTER.Belege
type Zelle = string | number

export function zeileAus(b: Beleg): Zelle[] {
  const w: Record<string, Zelle> = {
    id: b.id, belegnr: b.belegnr, steuerjahr: b.steuerjahr ?? '', steuerjahr_manuell: b.steuerjahr_manuell ? 'ja' : '',
    belegdatum: b.belegdatum, zahlungsdatum: b.zahlungsdatum, betrag_brutto_ct: b.betrag_ct ?? '',
    aussteller: b.aussteller, person: b.person, modul: b.modul, kategorie: b.kategorie,
    status: b.status, notiz: b.notiz, datei_ids: b.datei_ids, dateiname: b.dateiname,
    objekt_id: b.aufteilung.length ? '' : b.objekt_id, einheit_id: b.aufteilung.length ? '' : b.einheit_id,
    umlagefaehig: b.umlagefaehig ? 'ja' : '',
    kind_id: b.kind_id, zahlungsart: b.zahlungsart,
    arbeitskosten_ct: b.arbeitskosten_ct ?? '', material_ct: b.material_ct ?? '', frage: b.frage,
    erfasst_von: b.erfasst_von, erfasst_am: b.erfasst_am, geaendert_von: b.geaendert_von,
    geaendert_am: b.geaendert_am, version: b.version,
  }
  return SPALTEN.map((s) => w[s] ?? '')
}

export function belegAusZeile(z: (string | number | undefined)[]): Beleg {
  const g = (s: string) => {
    const v = z[SPALTEN.indexOf(s)]
    return v === undefined || v === null ? '' : String(v)
  }
  const zahl = (s: string) => (g(s) === '' ? null : Number(g(s)))
  return {
    id: g('id'), belegnr: zahl('belegnr') ?? 0, steuerjahr: zahl('steuerjahr'), steuerjahr_manuell: g('steuerjahr_manuell') === 'ja',
    belegdatum: g('belegdatum'), zahlungsdatum: g('zahlungsdatum'), betrag_ct: zahl('betrag_brutto_ct'),
    aussteller: g('aussteller'), person: g('person'), modul: g('modul'), kategorie: g('kategorie'),
    status: (g('status') || 'offen') as BelegStatus, notiz: g('notiz'), datei_ids: g('datei_ids'), dateiname: g('dateiname'),
    erfasst_von: g('erfasst_von'), erfasst_am: g('erfasst_am'), geaendert_von: g('geaendert_von'),
    geaendert_am: g('geaendert_am'), version: zahl('version') ?? 1,
    objekt_id: g('objekt_id'), einheit_id: g('einheit_id'), umlagefaehig: g('umlagefaehig') === 'ja', aufteilung: [],
    kind_id: g('kind_id'), zahlungsart: (['unbar', 'bar'].includes(g('zahlungsart')) ? g('zahlungsart') : '') as BelegEntwurf['zahlungsart'],
    arbeitskosten_ct: zahl('arbeitskosten_ct'), material_ct: zahl('material_ct'), frage: g('frage'),
  }
}
