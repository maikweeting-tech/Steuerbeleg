// Wiederkehrende bzw. erwartete Belege (E6) und Vollständigkeits-Check (M6).
// Eine Vorlage beschreibt einen Beleg, der regelmäßig erwartet wird (monatlich, vierteljährlich, jährlich).
// Für jeden Zeitraum wird geprüft, ob ein passender Beleg im Belegindex steht.
import { aehnlicherAussteller, type Beleg, type BelegEntwurf } from './beleg'

export type Rhythmus = 'monatlich' | 'vierteljaehrlich' | 'jaehrlich'
export const RHYTHMEN: { id: Rhythmus; name: string }[] = [
  { id: 'monatlich', name: 'monatlich' }, { id: 'vierteljaehrlich', name: 'vierteljährlich' }, { id: 'jaehrlich', name: 'jährlich' },
]

export interface Vorlage {
  id: string
  bezeichnung: string
  aussteller: string
  /** leer = Betrag schwankt bzw. nur „erwarteter Beleg“ (Erfassen mit Foto/PDF nötig) */
  betrag_ct: number | null
  rhythmus: Rhythmus
  modul: string
  kategorie: string
  person: string
  objekt_id: string
  einheit_id: string
  kind_id: string
  /** Datei-Id des Dauerbelegs in Drive (z. B. Versicherungsschein), leer = keiner */
  dauerbeleg_datei_id: string
  aktiv: boolean
  /** jährlich: ab diesem Monat erwartet (1–12); vierteljährlich: Monat im Quartal (1–3); monatlich ohne Bedeutung */
  faellig_monat: number
}

export type PeriodenStatus = 'erledigt' | 'faellig' | 'fehlt' | 'kuenftig'

export interface Periode {
  schluessel: string // z. B. 2026-03, 2026-Q1, 2026
  name: string // z. B. März 2026
  von: string // ISO, erster Tag
  bis: string // ISO, letzter Tag
  faellig_ab: string // ISO, ab hier wird der Beleg erwartet
}

export interface PeriodenErgebnis extends Periode {
  status: PeriodenStatus
  belege: Beleg[]
}

const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const z2 = (n: number) => String(n).padStart(2, '0')
const letzterTag = (j: number, m: number) => new Date(Date.UTC(j, m, 0)).getUTCDate()

/** Zeiträume eines Steuerjahres. */
export function perioden(v: Pick<Vorlage, 'rhythmus' | 'faellig_monat'>, jahr: number): Periode[] {
  const fm = Math.max(1, Math.floor(v.faellig_monat || 1))
  if (v.rhythmus === 'monatlich')
    return MONATSNAMEN.map((n, i) => ({
      schluessel: `${jahr}-${z2(i + 1)}`, name: `${n} ${jahr}`,
      von: `${jahr}-${z2(i + 1)}-01`, bis: `${jahr}-${z2(i + 1)}-${letzterTag(jahr, i + 1)}`, faellig_ab: `${jahr}-${z2(i + 1)}-01`,
    }))
  if (v.rhythmus === 'vierteljaehrlich')
    return [0, 1, 2, 3].map((q) => {
      const m1 = q * 3 + 1
      return {
        schluessel: `${jahr}-Q${q + 1}`, name: `${q + 1}. Quartal ${jahr}`,
        von: `${jahr}-${z2(m1)}-01`, bis: `${jahr}-${z2(m1 + 2)}-${letzterTag(jahr, m1 + 2)}`, faellig_ab: `${jahr}-${z2(m1 + Math.min(fm, 3) - 1)}-01`,
      }
    })
  return [{ schluessel: String(jahr), name: `Jahr ${jahr}`, von: `${jahr}-01-01`, bis: `${jahr}-12-31`, faellig_ab: `${jahr}-${z2(Math.min(fm, 12))}-01` }]
}

/** Passt ein Beleg zur Vorlage (ohne Zeitraum)? Verknüpfte Belege (vorlage_id in der Notiz) zählen immer. */
export function passt(v: Vorlage, b: Pick<Beleg, 'modul' | 'kategorie' | 'aussteller' | 'person' | 'objekt_id' | 'kind_id' | 'notiz'>): boolean {
  if (b.notiz.includes(vorlageMarke(v.id))) return true
  if (b.modul !== v.modul || (v.kategorie && b.kategorie !== v.kategorie)) return false
  if (v.aussteller && !aehnlicherAussteller(b.aussteller, v.aussteller)) return false
  if (v.person && b.person !== v.person) return false
  if (v.objekt_id && b.objekt_id && b.objekt_id !== v.objekt_id) return false
  if (v.kind_id && b.kind_id !== v.kind_id) return false
  return true
}

/** Datum, das für den Zeitraum zählt: Zahlungsdatum, sonst Belegdatum. */
const datumVon = (b: Pick<Beleg, 'zahlungsdatum' | 'belegdatum'>) => b.zahlungsdatum || b.belegdatum

/** Prüft alle Zeiträume einer Vorlage gegen die Belege. heute = ISO-Datum. */
export function pruefeVorlage(v: Vorlage, jahr: number, belege: Beleg[], heute: string): PeriodenErgebnis[] {
  const passende = belege.filter((b) => passt(v, b))
  return perioden(v, jahr).map((p) => {
    const treffer = passende.filter((b) => { const d = datumVon(b); return d >= p.von && d <= p.bis })
    const status: PeriodenStatus = treffer.length ? 'erledigt' : heute > p.bis ? 'fehlt' : heute >= p.faellig_ab ? 'faellig' : 'kuenftig'
    return { ...p, status, belege: treffer }
  })
}

export interface Vollstaendigkeit {
  vorlage: Vorlage
  perioden: PeriodenErgebnis[]
  fehlt: number
  faellig: number
  erledigt: number
}

export function vollstaendigkeit(vorlagen: Vorlage[], jahr: number, belege: Beleg[], heute: string): Vollstaendigkeit[] {
  return vorlagen.filter((v) => v.aktiv).map((v) => {
    const p = pruefeVorlage(v, jahr, belege, heute)
    const n = (s: PeriodenStatus) => p.filter((x) => x.status === s).length
    return { vorlage: v, perioden: p, fehlt: n('fehlt'), faellig: n('faellig'), erledigt: n('erledigt') }
  })
}

/** Marke in der Notiz eines aus der Vorlage bestätigten Belegs. */
export const vorlageMarke = (id: string) => `[Vorlage ${id.slice(0, 8)}]`

/** Entwurf für die Bestätigung eines Zeitraums. Datum = Fälligkeitsbeginn (änderbar). */
export function entwurfAusVorlage(v: Vorlage, p: Periode, id: string, betrag_ct: number | null, datum: string): BelegEntwurf {
  return {
    id, belegdatum: datum, zahlungsdatum: datum, betrag_ct, aussteller: v.aussteller || v.bezeichnung,
    person: v.person, modul: v.modul, kategorie: v.kategorie, steuerjahr: null, steuerjahr_manuell: false,
    status: 'offen', notiz: `${p.name} – ${v.bezeichnung} ${vorlageMarke(v.id)}${v.dauerbeleg_datei_id ? ' (Dauerbeleg)' : ''}`,
    objekt_id: v.objekt_id, einheit_id: v.einheit_id, umlagefaehig: false, aufteilung: [],
    kind_id: v.kind_id, zahlungsart: '', arbeitskosten_ct: null, material_ct: null, frage: '',
  }
}

/** Vorlage aus einem vorhandenen Beleg (Zuordnung und Dauerbeleg werden übernommen). */
export function vorlageAusBeleg(b: Beleg, id: string, rhythmus: Rhythmus): Vorlage {
  const monat = Number((b.zahlungsdatum || b.belegdatum).slice(5, 7)) || 1
  return {
    id, bezeichnung: b.aussteller, aussteller: b.aussteller, betrag_ct: b.betrag_ct, rhythmus,
    modul: b.modul, kategorie: b.kategorie, person: b.person, objekt_id: b.objekt_id, einheit_id: b.einheit_id, kind_id: b.kind_id,
    dauerbeleg_datei_id: b.datei_ids.split(',')[0] ?? '', aktiv: true,
    faellig_monat: rhythmus === 'vierteljaehrlich' ? ((monat - 1) % 3) + 1 : rhythmus === 'jaehrlich' ? monat : 1,
  }
}

export const leereVorlage = (id: string): Vorlage => ({
  id, bezeichnung: '', aussteller: '', betrag_ct: null, rhythmus: 'jaehrlich', modul: '', kategorie: '', person: '',
  objekt_id: '', einheit_id: '', kind_id: '', dauerbeleg_datei_id: '', aktiv: true, faellig_monat: 1,
})

// ---------------------------------------------------------------- Kalender-Erinnerung (A5)

/**
 * Link „Termin in Google Kalender anlegen“ mit monatlicher Wiederholung.
 * Ohne Kalender-Berechtigung der App: Google zeigt den Termin vorausgefüllt an, du speicherst ihn selbst.
 */
export function kalenderLink(o: { titel: string; text: string; tag: number; stunde: number; ab: Date }): string {
  const d = new Date(o.ab.getFullYear(), o.ab.getMonth(), o.tag, o.stunde, 0)
  if (d < o.ab) d.setMonth(d.getMonth() + 1)
  const f = (x: Date) => `${x.getFullYear()}${z2(x.getMonth() + 1)}${z2(x.getDate())}T${z2(x.getHours())}${z2(x.getMinutes())}00`
  const ende = new Date(d.getTime() + 30 * 60000)
  const p = new URLSearchParams({ action: 'TEMPLATE', text: o.titel, details: o.text, dates: `${f(d)}/${f(ende)}`, ctz: 'Europe/Berlin', recur: 'RRULE:FREQ=MONTHLY' })
  return `https://calendar.google.com/calendar/render?${p}`
}

/** Dieselbe Erinnerung als .ics-Datei (für andere Kalender). */
export function kalenderIcs(o: { titel: string; text: string; tag: number; stunde: number; ab: Date; uid: string }): string {
  const d = new Date(o.ab.getFullYear(), o.ab.getMonth(), o.tag, o.stunde, 0)
  if (d < o.ab) d.setMonth(d.getMonth() + 1)
  const f = (x: Date) => `${x.getFullYear()}${z2(x.getMonth() + 1)}${z2(x.getDate())}T${z2(x.getHours())}${z2(x.getMinutes())}00`
  const ende = new Date(d.getTime() + 30 * 60000)
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Steuerbeleg//DE', 'BEGIN:VEVENT', `UID:${o.uid}`,
    `DTSTAMP:${f(o.ab)}`, `DTSTART;TZID=Europe/Berlin:${f(d)}`, `DTEND;TZID=Europe/Berlin:${f(ende)}`, 'RRULE:FREQ=MONTHLY',
    `SUMMARY:${esc(o.titel)}`, `DESCRIPTION:${esc(o.text)}`, 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}
