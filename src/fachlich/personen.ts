// Anlage N und Anlage Kind: Kinder, Fahrtenbuch, Arbeitstage und Pauschalen-Zähler (E3).
// Reine Rechenlogik. Es wird NUR gezählt; Pauschalsätze werden angezeigt, aber nicht multipliziert.

export interface Kind {
  id: string
  name: string
  geburtsdatum: string // ISO, optional
}

export type Fahrtzweck = 'Arbeitsweg' | 'Dienstreise' | 'Fortbildung' | 'Sonstiges'
export const FAHRTZWECKE: Fahrtzweck[] = ['Arbeitsweg', 'Dienstreise', 'Fortbildung', 'Sonstiges']

export interface Fahrt {
  id: string
  person: string
  datum: string // ISO
  start: string
  ziel: string
  km: number
  zweck: Fahrtzweck
  fahrzeug: string
}

/** Eine Zeile je Person und Jahr. Entfernung = einfache Strecke Wohnung–erste Tätigkeitsstätte. */
export interface Arbeitstage {
  person: string
  jahr: number
  entfernung_km: number | null
  arbeitstage: number
  homeoffice_tage: number
}

export const leereArbeitstage = (person: string, jahr: number): Arbeitstage =>
  ({ person, jahr, entfernung_km: null, arbeitstage: 0, homeoffice_tage: 0 })

export interface Zaehler {
  arbeitstage: number
  homeoffice_tage: number
  entfernung_km: number | null
  /** Arbeitstage × einfache Entfernung (nur Zählgröße „Entfernungskilometer“, kein Euro-Betrag) */
  entfernungs_km_summe: number | null
  /** gefahrene km laut Fahrtenbuch je Zweck */
  km_je_zweck: Record<Fahrtzweck, number>
  fahrten: number
  hinweise: string[]
}

/** Zählt je Person. hoechsttage = Höchstzahl Homeoffice-Tage aus der Konfiguration (null = unbekannt, nicht prüfen). */
export function zaehle(person: string, a: Arbeitstage | undefined, fahrten: Fahrt[], hoechsttage: number | null): Zaehler {
  const t = a ?? leereArbeitstage(person, 0)
  const eigene = fahrten.filter((f) => f.person === person)
  const km_je_zweck = Object.fromEntries(FAHRTZWECKE.map((z) => [z, 0])) as Record<Fahrtzweck, number>
  for (const f of eigene) km_je_zweck[f.zweck] = Math.round((km_je_zweck[f.zweck] + (f.km || 0)) * 10) / 10
  const hinweise: string[] = []
  if (t.arbeitstage + t.homeoffice_tage > 366) hinweise.push('Arbeitstage + Homeoffice-Tage ergeben mehr als 366 Tage.')
  if (hoechsttage !== null && t.homeoffice_tage > hoechsttage) hinweise.push(`Mehr Homeoffice-Tage als der Höchstwert aus der Konfiguration (${hoechsttage}, prüfen).`)
  if (t.arbeitstage > 0 && t.entfernung_km === null) hinweise.push('Entfernung Wohnung – Tätigkeitsstätte fehlt.')
  return {
    arbeitstage: t.arbeitstage,
    homeoffice_tage: t.homeoffice_tage,
    entfernung_km: t.entfernung_km,
    entfernungs_km_summe: t.entfernung_km === null ? null : Math.round(t.arbeitstage * t.entfernung_km * 10) / 10,
    km_je_zweck,
    fahrten: eigene.length,
    hinweise,
  }
}

/** Prüft eine Fahrt vor dem Speichern. */
export function pruefeFahrt(f: Fahrt): string[] {
  const x: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.datum)) x.push('Datum fehlt')
  if (!f.person) x.push('Person fehlt')
  if (!(f.km > 0)) x.push('km müssen größer als 0 sein')
  if (!f.ziel.trim()) x.push('Ziel fehlt')
  return x
}
