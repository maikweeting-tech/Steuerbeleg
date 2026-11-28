// Anlage V: Objekte, Einheiten, Aufteilung von Belegen, Einnahmen, Übersicht und Umlage.
// Reine Rechenlogik ohne Google-Zugriff (testbar). Es wird KEINE Steuer berechnet (AfA nur als Hilfsrechnung, siehe afa.ts).
import type { Beleg } from './beleg'
import type { SteuerjahrKonfig } from './konfiguration'

export type Umlageschluessel = 'wohnflaeche' | 'personen' | 'einheiten' | 'fest'

export interface Objekt {
  id: string
  typ: 'V'
  bezeichnung: string
  adresse: string
  anschaffungsdatum: string
  anschaffungskosten_ct: number | null
  afa_satz: string // nur Info, prüfen
  baujahr: number | null
  gebaeudeanteil_prozent: number | null
  wohnflaeche_m2: number | null
  umlageschluessel: Umlageschluessel
  aktiv: boolean
}

export interface Einheit {
  id: string
  objekt_id: string
  bezeichnung: string
  wohnflaeche_m2: number | null
  personen: number | null
  fest_prozent: number | null
}

export interface Anteil {
  objekt_id: string
  einheit_id: string
  anteil_prozent: number
}

export interface Einnahme {
  id: string
  objekt_id: string
  einheit_id: string
  monat: string // JJJJ-MM
  art: 'Miete' | 'Nebenkosten' | 'Sonstiges'
  betrag_ct: number
  notiz: string
}

export const SCHLUESSEL_NAMEN: Record<Umlageschluessel, string> = {
  wohnflaeche: 'nach Wohnfläche',
  personen: 'nach Personen',
  einheiten: 'je Einheit gleich',
  fest: 'fester Prozentsatz je Einheit',
}

/** Neues, leeres Objekt (Umlageschlüssel Wohnfläche als Vorgabe). */
export function neuesObjekt(bezeichnung: string): Objekt {
  return {
    id: crypto.randomUUID(), typ: 'V', bezeichnung, adresse: '', anschaffungsdatum: '', anschaffungskosten_ct: null, afa_satz: '',
    baujahr: null, gebaeudeanteil_prozent: null, wohnflaeche_m2: null, umlageschluessel: 'wohnflaeche', aktiv: true,
  }
}


// ---------------------------------------------------------------- Aufteilung

/** Prüft eine Aufteilung: Summe 100 %, jeder Anteil > 0, kein Objekt/Einheit doppelt. */
export function pruefeAufteilung(anteile: Anteil[]): string[] {
  const f: string[] = []
  if (anteile.length < 2) f.push('Für eine Aufteilung mindestens zwei Objekte/Einheiten wählen')
  if (anteile.some((a) => !a.objekt_id)) f.push('Objekt fehlt in der Aufteilung')
  if (anteile.some((a) => !(a.anteil_prozent > 0))) f.push('Jeder Anteil muss größer als 0 % sein')
  const summe = anteile.reduce((s, a) => s + (a.anteil_prozent || 0), 0)
  if (Math.abs(summe - 100) > 0.001) f.push(`Summe der Anteile ist ${String(Math.round(summe * 100) / 100).replace('.', ',')} % statt 100 %`)
  const schl = anteile.map((a) => `${a.objekt_id}/${a.einheit_id}`)
  if (new Set(schl).size !== schl.length) f.push('Ein Objekt/eine Einheit ist doppelt aufgeführt')
  return f
}

/**
 * Verteilt einen Centbetrag nach Gewichten so, dass die Summe exakt stimmt
 * (Restcent nach dem größten Rest, bei Gleichstand nach Reihenfolge).
 */
export function verteileCent(betrag: number, gewichte: number[]): number[] {
  const summe = gewichte.reduce((a, b) => a + b, 0)
  if (!gewichte.length || summe <= 0) return gewichte.map(() => 0)
  const neg = betrag < 0
  const b = Math.abs(betrag)
  const roh = gewichte.map((g) => (b * g) / summe)
  const teile = roh.map(Math.floor)
  let rest = b - teile.reduce((a, c) => a + c, 0)
  const reihenfolge = roh.map((r, i) => ({ i, r: r - Math.floor(r) })).sort((x, y) => y.r - x.r || x.i - y.i)
  for (let k = 0; rest > 0; k = (k + 1) % reihenfolge.length, rest--) teile[reihenfolge[k].i]++
  return neg ? teile.map((t) => -t) : teile
}

/** Objekt mit dem größten Anteil (bestimmt den Ablageordner eines aufgeteilten Belegs). */
export function hauptObjekt(anteile: Anteil[]): string {
  return [...anteile].sort((a, b) => b.anteil_prozent - a.anteil_prozent)[0]?.objekt_id ?? ''
}

// ---------------------------------------------------------------- Übersicht je Objekt

export interface ObjektSumme {
  einnahmen_ct: number // Blatt Einnahmen + Belege der Art „einnahme“
  werbungskosten_ct: number
  saldo_ct: number // Einnahmen − Werbungskosten, OHNE AfA
  belege: number
}

/** Anteil eines Belegs, der auf ein Objekt entfällt (in Cent). */
export function anteilFuerObjekt(b: Beleg, objektId: string, aufteilung: (Anteil & { beleg_id: string })[]): number {
  const eigene = aufteilung.filter((a) => a.beleg_id === b.id)
  const betrag = b.betrag_ct ?? 0
  if (!eigene.length) return b.objekt_id === objektId ? betrag : 0
  const teile = verteileCent(betrag, eigene.map((a) => a.anteil_prozent))
  return eigene.reduce((s, a, i) => s + (a.objekt_id === objektId ? teile[i] : 0), 0)
}

export function objektSumme(
  objektId: string,
  belege: Beleg[],
  aufteilung: (Anteil & { beleg_id: string })[],
  einnahmen: Einnahme[],
  konfig: SteuerjahrKonfig,
): ObjektSumme {
  const v = konfig.module.find((m) => m.ebene === 'objekt')
  const art = (k: string) => v?.kategorien.find((x) => x.schluessel === k)?.art
  let ein = einnahmen.filter((e) => e.objekt_id === objektId).reduce((s, e) => s + e.betrag_ct, 0)
  let wk = 0
  let anzahl = 0
  for (const b of belege) {
    if (b.modul !== v?.id) continue
    const anteil = anteilFuerObjekt(b, objektId, aufteilung)
    if (!anteil && b.objekt_id !== objektId && !aufteilung.some((a) => a.beleg_id === b.id && a.objekt_id === objektId)) continue
    anzahl++
    if (art(b.kategorie) === 'einnahme') ein += anteil
    else if (art(b.kategorie) === 'werbungskosten') wk += anteil
  }
  return { einnahmen_ct: ein, werbungskosten_ct: wk, saldo_ct: ein - wk, belege: anzahl }
}

// ---------------------------------------------------------------- Umlage (E9)

/** Gewicht je Einheit nach Umlageschlüssel; fehlende Angaben → Fehlermeldung. */
export function umlageGewichte(schluessel: Umlageschluessel, einheiten: Einheit[]): { gewichte: number[]; fehler: string[] } {
  const fehler: string[] = []
  const gewichte = einheiten.map((e) => {
    const w = schluessel === 'wohnflaeche' ? e.wohnflaeche_m2 : schluessel === 'personen' ? e.personen : schluessel === 'fest' ? e.fest_prozent : 1
    if (w === null || w === undefined || !(w >= 0)) fehler.push(`Einheit „${e.bezeichnung}“: Angabe für „${SCHLUESSEL_NAMEN[schluessel]}“ fehlt`)
    return w ?? 0
  })
  if (schluessel === 'fest') {
    const s = gewichte.reduce((a, b) => a + b, 0)
    if (Math.abs(s - 100) > 0.001) fehler.push(`Feste Anteile ergeben ${String(s).replace('.', ',')} % statt 100 %`)
  }
  if (!einheiten.length) fehler.push('Keine Einheiten angelegt')
  return { gewichte, fehler }
}

export interface UmlageZeile {
  kategorie: string
  gesamt_ct: number
  je_einheit_ct: number[]
}

/**
 * Verteilt umlagefähige Kosten eines Objekts je Kategorie auf die Einheiten.
 * Belege mit eigener Einheit werden dieser Einheit voll zugeordnet.
 * Hinweis: Hilfsrechnung, keine rechtssichere Nebenkostenabrechnung.
 */
export function umlage(
  objektId: string,
  einheiten: Einheit[],
  schluessel: Umlageschluessel,
  belege: Beleg[],
  aufteilung: (Anteil & { beleg_id: string })[],
): { zeilen: UmlageZeile[]; fehler: string[] } {
  const { gewichte, fehler } = umlageGewichte(schluessel, einheiten)
  const jeKat = new Map<string, number[]>()
  for (const b of belege) {
    if (!b.umlagefaehig) continue
    const betrag = anteilFuerObjekt(b, objektId, aufteilung)
    if (!betrag) continue
    const zeile = jeKat.get(b.kategorie) ?? einheiten.map(() => 0)
    const idx = einheiten.findIndex((e) => e.id === b.einheit_id)
    const teile = idx >= 0 ? einheiten.map((_, i) => (i === idx ? betrag : 0)) : verteileCent(betrag, gewichte)
    teile.forEach((t, i) => (zeile[i] += t))
    jeKat.set(b.kategorie, zeile)
  }
  const zeilen = [...jeKat.entries()].map(([kategorie, je]) => ({ kategorie, je_einheit_ct: je, gesamt_ct: je.reduce((a, c) => a + c, 0) }))
  return { zeilen, fehler }
}

// ---------------------------------------------------------------- Einnahmen

/** 12 Monatszeilen für eine gleichbleibende Miete (Jan–Dez bzw. ab Startmonat). */
export function monatsreihe(jahr: number, abMonat = 1): string[] {
  return Array.from({ length: 13 - abMonat }, (_, i) => `${jahr}-${String(abMonat + i).padStart(2, '0')}`)
}
