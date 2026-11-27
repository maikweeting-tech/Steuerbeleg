// E7: Kontoauszug-Abgleich. CSV aus dem Online-Banking wird nur im Browser gelesen.
// Erkannt werden die üblichen deutschen Exporte (Annahme, ohne echte Beispieldatei geprüft):
// Sparkasse CSV-CAMT und CSV-MT940, Volksbanken/Atruvia (VR-Banking), ING, DKB, comdirect.
// Unbekannte Formate: Spalten lassen sich von Hand zuordnen.
import type { Beleg } from './beleg'

export interface Buchung {
  id: string
  konto: string
  datum: string // ISO
  betrag_ct: number // Ausgabe negativ, Eingang positiv
  gegenseite: string
  zweck: string
}

/** beleg_fehlt = Beleg muss noch erfasst werden · privat = nicht steuerrelevant · erledigt = Beleg anders vorhanden */
export type Markierung = 'beleg_fehlt' | 'privat' | 'erledigt'
export const MARKIERUNGEN: { id: Markierung; name: string }[] = [
  { id: 'beleg_fehlt', name: 'Beleg fehlt (nachreichen)' }, { id: 'privat', name: 'privat / nicht steuerlich' }, { id: 'erledigt', name: 'erledigt (Beleg anders vorhanden)' },
]

export interface Spalten {
  datum: number
  betrag: number
  /** optional: Spalte mit S/H (Soll/Haben) */
  sollHaben: number
  /** optional: getrennte Spalten für Soll und Haben (dann betrag = -1) */
  soll: number
  haben: number
  gegenseite: number
  /** DKB: getrennte Spalten Zahlungspflichtige*r / Zahlungsempfänger*in */
  gegenseite2: number
  zweck: number
  zweck2: number
  konto: number
}

export interface Einlesen {
  kopf: string[]
  zeilen: string[][]
  spalten: Spalten
  bank: string
  buchungen: Buchung[]
  warnungen: string[]
}

// ---------------------------------------------------------------- CSV lesen

/** Bytes → Text: UTF-8, bei Fehlern Windows-1252 (Sparkasse exportiert meist so). */
export function dekodiere(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '') } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** CSV mit Anführungszeichen ("" = "), Zeilenumbrüchen in Feldern; Trennzeichen wird erkannt. */
export function parseCsv(text: string): string[][] {
  const probe = text.split(/\r?\n/).slice(0, 40).join('\n')
  const zaehle = (c: string) => probe.split(c).length
  const trenner = [';', '\t', ','].sort((a, b) => zaehle(b) - zaehle(a))[0]
  const zeilen: string[][] = []
  let feld = '', zeile: string[] = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++ } else inQ = false }
      else feld += c
    } else if (c === '"') inQ = true
    else if (c === trenner) { zeile.push(feld); feld = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      zeile.push(feld); zeilen.push(zeile); zeile = []; feld = ''
    } else feld += c
  }
  if (feld !== '' || zeile.length) { zeile.push(feld); zeilen.push(zeile) }
  return zeilen.map((z) => z.map((f) => f.trim())).filter((z) => z.some((f) => f !== ''))
}

// ---------------------------------------------------------------- Werte

/** "27.11.2026" | "27.11.26" | "2026-11-27" → ISO */
export function csvDatum(t: string): string | null {
  const s = t.trim()
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s)
  if (m) {
    const j = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    const d = new Date(Date.UTC(j, +m[2] - 1, +m[1]))
    if (d.getUTCDate() !== +m[1] || d.getUTCMonth() !== +m[2] - 1) return null
    return `${j}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** "-1.234,56" | "1234,5" | "-85,10 €" | "+12,00" → Cent; null wenn keine Zahl. */
export function csvBetrag(t: string): number | null {
  const s = t.replace(/\s|€|EUR/gi, '')
  if (!/^[+-]?(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(s)) return null
  const neg = s.startsWith('-')
  const [g, d = ''] = s.replace(/^[+-]/, '').replace(/\./g, '').split(',')
  const c = parseInt(g, 10) * 100 + parseInt((d + '00').slice(0, 2), 10)
  return neg ? -c : c
}

// ---------------------------------------------------------------- Spalten erkennen

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9*/()€ ]/g, '').trim()

const LEER_SPALTEN: Spalten = { datum: -1, betrag: -1, sollHaben: -1, soll: -1, haben: -1, gegenseite: -1, gegenseite2: -1, zweck: -1, zweck2: -1, konto: -1 }

function finde(kopf: string[], muster: RegExp[], nicht?: RegExp): number {
  const n = kopf.map(norm)
  for (const m of muster) {
    const i = n.findIndex((k) => m.test(k) && !(nicht && nicht.test(k)))
    if (i >= 0) return i
  }
  return -1
}

export function erkenneSpalten(kopf: string[]): Spalten {
  const s: Spalten = { ...LEER_SPALTEN }
  s.datum = finde(kopf, [/^buchungstag$/, /^buchungsdatum$/, /^buchung$/, /^datum$/, /buchungstag|buchungsdatum/, /datum/], /valuta|wertstellung/)
  s.betrag = finde(kopf, [/^betrag$/, /^betrag \(€\)$/, /^umsatz in eur$/, /^umsatz$/, /^betrag/, /umsatz/, /amount/], /ursprung|saldo|auslagen/)
  s.sollHaben = finde(kopf, [/^soll\/haben$/, /^s\/h$/, /^soll haben$/])
  if (s.betrag < 0) { s.soll = finde(kopf, [/^soll/, /^lastschrift$/, /^ausgang/]); s.haben = finde(kopf, [/^haben/, /^gutschrift$/, /^eingang/]) }
  s.gegenseite = finde(kopf, [/beguenstigter\/zahlungspflichtiger/, /name zahlungsbeteiligter/, /auftraggeber\/empfanger/, /zahlungsempfanger/, /empfanger/, /auftraggeber/, /^name$/, /gegenseite/])
  s.gegenseite2 = finde(kopf, [/zahlungspflichtige/])
  if (s.gegenseite2 === s.gegenseite) s.gegenseite2 = -1
  s.zweck = finde(kopf, [/^verwendungszweck$/, /verwendungszweck/, /^buchungstext$/, /^vorgang$/])
  s.zweck2 = finde(kopf, [/^buchungstext$/, /^vorgang$/, /^umsatztyp$/])
  if (s.zweck2 === s.zweck) s.zweck2 = -1
  s.konto = finde(kopf, [/^auftragskonto$/, /^iban auftragskonto$/])
  return s
}

function bankName(kopf: string[]): string {
  const k = kopf.map(norm).join('|')
  if (k.includes('beguenstigter/zahlungspflichtiger') && k.includes('glaeubiger id')) return 'Sparkasse (CSV-CAMT)'
  if (k.includes('beguenstigter/zahlungspflichtiger')) return 'Sparkasse (CSV-MT940)'
  if (k.includes('name zahlungsbeteiligter')) return 'Volksbank / VR-Banking'
  if (k.includes('auftraggeber/empfanger')) return 'ING'
  if (k.includes('zahlungsempfanger*in') || k.includes('zahlungspflichtige*r')) return 'DKB'
  if (k.includes('umsatz in eur')) return 'comdirect'
  return 'unbekanntes Format'
}

/** Kopfzeile = erste Zeile, in der Datum- und Betragsspalte erkannt werden (Banken schreiben oft Vorspann-Zeilen). */
export function findeKopf(zeilen: string[][]): number {
  for (let i = 0; i < Math.min(zeilen.length, 40); i++) {
    const s = erkenneSpalten(zeilen[i])
    if (s.datum >= 0 && (s.betrag >= 0 || (s.soll >= 0 && s.haben >= 0))) return i
  }
  return -1
}

/** Einfacher Hash für eine wiedererkennbare Buchungs-Id (gleiche CSV → gleiche Id). */
function hash(t: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function buchungenAus(zeilen: string[][], s: Spalten, kontoStandard = ''): { buchungen: Buchung[]; warnungen: string[] } {
  const buchungen: Buchung[] = []
  let ohneDatum = 0
  const gesehen = new Map<string, number>()
  for (const z of zeilen) {
    const datum = csvDatum(z[s.datum] ?? '')
    let betrag: number | null = null
    if (s.betrag >= 0) betrag = csvBetrag(z[s.betrag] ?? '')
    else if (s.soll >= 0 || s.haben >= 0) {
      const soll = csvBetrag(z[s.soll] ?? ''), haben = csvBetrag(z[s.haben] ?? '')
      betrag = soll ? -Math.abs(soll) : haben ? Math.abs(haben) : null
    }
    if (!datum || betrag === null) { if (z.some(Boolean)) ohneDatum++; continue }
    if (s.sollHaben >= 0) { const sh = (z[s.sollHaben] ?? '').toUpperCase(); if (sh.startsWith('S')) betrag = -Math.abs(betrag); else if (sh.startsWith('H')) betrag = Math.abs(betrag) }
    // DKB: bei Ausgaben zählt die Empfänger-Spalte, bei Eingängen die Zahler-Spalte
    let gegenseite = z[s.gegenseite] ?? ''
    if (s.gegenseite2 >= 0 && (betrag > 0 || !gegenseite)) gegenseite = z[s.gegenseite2] || gegenseite
    const zweck = [z[s.zweck] ?? '', s.zweck2 >= 0 ? z[s.zweck2] ?? '' : ''].filter(Boolean).join(' · ')
    const konto = (s.konto >= 0 ? z[s.konto] : '') || kontoStandard
    const basis = [konto, datum, betrag, gegenseite, zweck].join('|')
    const n = (gesehen.get(basis) ?? 0) + 1
    gesehen.set(basis, n)
    buchungen.push({ id: `bu_${hash(basis + '|' + n)}`, konto, datum, betrag_ct: betrag, gegenseite: gegenseite.replace(/\s{2,}/g, ' '), zweck: zweck.replace(/\s{2,}/g, ' ') })
  }
  const warnungen = ohneDatum ? [`${ohneDatum} Zeile(n) ohne gültiges Datum oder Betrag übersprungen (z. B. Kontostand-Zeilen).`] : []
  return { buchungen, warnungen }
}

export function liesKontoauszug(text: string, spalten?: Spalten): Einlesen {
  const alle = parseCsv(text)
  const k = findeKopf(alle)
  if (k < 0 && !spalten) {
    const kopf = alle[0] ?? []
    return { kopf, zeilen: alle.slice(1), spalten: erkenneSpalten(kopf), bank: 'unbekanntes Format', buchungen: [], warnungen: ['Spalten „Datum“ und „Betrag“ nicht erkannt. Bitte unten von Hand zuordnen.'] }
  }
  const ki = Math.max(k, 0)
  const kopf = alle[ki]
  const s = spalten ?? erkenneSpalten(kopf)
  // Ältere VR-Exporte: Soll/Haben-Kennzeichen in einer Spalte ohne Namen
  if (!spalten && s.sollHaben < 0) {
    const daten = alle.slice(ki + 1, ki + 41)
    const i = kopf.findIndex((_, c) => { const w = daten.map((z) => z[c] ?? '').filter(Boolean); return w.length > 0 && w.every((x) => x === 'S' || x === 'H') })
    if (i >= 0) s.sollHaben = i
  }
  // Vorspann (z. B. ING: IBAN-Zeile) nach einer Kontonummer durchsuchen
  const kontoVorspann = alle.slice(0, ki).flat().find((f) => /^[A-Z]{2}\d{2}[\d ]{12,}$/.test(f.replace(/\s/g, ''))) ?? ''
  const { buchungen, warnungen } = buchungenAus(alle.slice(ki + 1), s, kontoVorspann.replace(/\s/g, ''))
  return { kopf, zeilen: alle.slice(ki + 1), spalten: s, bank: bankName(kopf), buchungen, warnungen }
}

// ---------------------------------------------------------------- Abgleich

export interface Abgleich {
  buchung: Buchung
  treffer: Beleg[]
}

const tageZwischen = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000

/** Treffer = gleicher Betrag (Ausgabe = Belegbetrag) und Datum ± toleranz Tage (Zahlungs- oder Belegdatum). */
export function gleicheAb(buchungen: Buchung[], belege: Beleg[], toleranz = 5): Abgleich[] {
  return buchungen.map((bu) => ({
    buchung: bu,
    treffer: belege.filter((b) => b.betrag_ct !== null && b.betrag_ct === Math.abs(bu.betrag_ct) &&
      [b.zahlungsdatum, b.belegdatum].filter(Boolean).some((d) => tageZwischen(d, bu.datum) <= toleranz)),
  }))
}
