// Typen und Hilfsfunktionen für die Steuerjahr-Konfiguration (config/steuerjahr_<Jahr>.json).
// Fachliche Werte stehen ausschließlich in der Konfigurationsdatei, nicht im Code.

export type PruefStatus = 'prüfen' | 'geprüft'

export interface KonfigWert {
  wert: number | string | null
  einheit: string
  quelle: string
  status: PruefStatus
}

export interface Kategorie {
  schluessel: string
  name: string
  art: 'einnahme' | 'werbungskosten' | 'ausgabe' | 'nachweis' | 'info'
  elster_zeile: KonfigWert
}

/** Ebene unterhalb des Modulordners: je Objekt, je Kind, je Person oder direkt Kategorien. */
export type ModulEbene = 'objekt' | 'kind' | 'person' | 'keine' | 'ohne_kategorie'

export interface Modul {
  id: string
  name: string
  /** Ordnername; "{person}" wird bei Ebene "person" durch den Personennamen ersetzt. */
  ordner: string
  ebene: ModulEbene
  kategorien: Kategorie[]
}

export interface Person {
  id: string
  name: string
}

export interface SteuerjahrKonfig {
  steuerjahr: number
  hinweis: string
  personen: Person[]
  module: Modul[]
  zusatzordner: string[]
  werte: Record<string, KonfigWert>
}

/** Drive erlaubt fast alle Zeichen; "/" würde aber als Pfadtrenner missverstanden. */
export function ordnerName(name: string): string {
  return name.replace(/[/\\]/g, '-').trim()
}

/**
 * Liefert alle Ordnerpfade (relativ zu Steuer/<Jahr>/), die beim Einrichten angelegt werden.
 * Objekt- und Kind-Unterordner entstehen erst, wenn Objekte bzw. Kinder angelegt werden
 * (siehe objekte/kinder-Parameter).
 */
export function ordnerPfade(
  konfig: SteuerjahrKonfig,
  objekte: string[] = [],
  kinder: string[] = [],
): string[][] {
  const pfade: string[][] = []
  const mitKategorien = (basis: string[], m: Modul) => {
    pfade.push(basis)
    for (const k of m.kategorien) pfade.push([...basis, ordnerName(k.name)])
  }

  for (const m of konfig.module) {
    const basis = m.ordner.split('/').map(ordnerName)
    switch (m.ebene) {
      case 'person':
        for (const p of konfig.personen) {
          const b = m.ordner.replace('{person}', p.name).split('/').map(ordnerName)
          mitKategorien(b, m)
        }
        break
      case 'objekt':
        pfade.push(basis)
        for (const o of objekte) mitKategorien([...basis, ordnerName(o)], m)
        break
      case 'kind':
        pfade.push(basis)
        for (const k of kinder) mitKategorien([...basis, ordnerName(k)], m)
        break
      case 'ohne_kategorie':
        pfade.push(basis)
        break
      default:
        mitKategorien(basis, m)
    }
  }
  for (const z of konfig.zusatzordner) pfade.push([ordnerName(z)])

  // Zwischenebenen (z. B. "AUS_Ausland" vor "Kamperland_NL") ergänzen, Duplikate entfernen,
  // Eltern immer vor Kindern sortieren.
  const set = new Map<string, string[]>()
  for (const p of pfade) for (let i = 1; i <= p.length; i++) set.set(p.slice(0, i).join('/'), p.slice(0, i))
  return [...set.values()].sort((a, b) => a.length - b.length || a.join('/').localeCompare(b.join('/'), 'de'))
}

/** Prüft, dass jeder Wert die Pflichtfelder hat. Gibt eine Liste von Fehlermeldungen zurück. */
export function pruefeKonfig(konfig: SteuerjahrKonfig): string[] {
  const fehler: string[] = []
  const pruefeWert = (pfad: string, w: KonfigWert | undefined) => {
    if (!w) return fehler.push(`${pfad}: fehlt`)
    for (const f of ['wert', 'einheit', 'quelle', 'status'] as const)
      if (!(f in w)) fehler.push(`${pfad}: Feld "${f}" fehlt`)
  }
  for (const [name, w] of Object.entries(konfig.werte)) pruefeWert(`werte.${name}`, w)
  const ids = new Set<string>()
  for (const m of konfig.module) {
    if (ids.has(m.id)) fehler.push(`Modul ${m.id} doppelt`)
    ids.add(m.id)
    const schl = new Set<string>()
    for (const k of m.kategorien) {
      if (schl.has(k.schluessel)) fehler.push(`${m.id}.${k.schluessel} doppelt`)
      schl.add(k.schluessel)
      pruefeWert(`${m.id}.${k.schluessel}.elster_zeile`, k.elster_zeile)
    }
  }
  return fehler
}
