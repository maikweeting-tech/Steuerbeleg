// Auswertung des erkannten Belegtextes (M5, E13). Reine Logik, ohne Tesseract.
// Alles sind nur VORSCHLÄGE: der Nutzer übernimmt sie ausdrücklich und prüft sie.
import { aehnlicherAussteller, type Beleg, type BelegEntwurf } from './beleg'
import { parseBetrag, parseDatum } from './format'

export interface Vorschlag {
  belegdatum: string | null
  betrag_ct: number | null
  aussteller: string | null
  arbeitskosten_ct: number | null
  material_ct: number | null
  /** Zeile, aus der der Betrag stammt (zur Kontrolle) */
  betragZeile: string
}

const normal = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')

const MONATE: Record<string, number> = {
  jan: 1, januar: 1, feb: 2, februar: 2, mär: 3, maer: 3, märz: 3, maerz: 3, mrz: 3, apr: 4, april: 4, mai: 5, jun: 6, juni: 6,
  jul: 7, juli: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, dez: 12, dezember: 12,
}

/** Typische Lesefehler in Zahlen glätten (O→0, l/I→1, Leerzeichen zwischen Ziffern). */
function glaetteZahlen(z: string): string {
  return z
    .replace(/(?<=\d)[oO](?=[\d,.])|(?<=[\d,.])[oO](?=\d|\b)/g, '0')
    .replace(/(?<=\d)[lI](?=\d)/g, '1')
    .replace(/(?<=\d) (?=\d{3}\b|,\d{2}\b)/g, '')
    .replace(/(?<=\d) ?, ?(?=\d{2}\b)/g, ',')
}

/** Alle Daten einer Zeile als ISO (TT.MM.JJJJ, TT.MM.JJ, TT. Monat JJJJ). */
export function datenInZeile(zeile: string): string[] {
  const z = glaetteZahlen(zeile)
  const l: string[] = []
  for (const m of z.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/g)) {
    const j = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    const iso = parseDatum(`${m[1]}.${m[2]}.${j}`)
    if (iso) l.push(iso)
  }
  for (const m of z.matchAll(/\b(\d{1,2})\.?\s*([A-Za-zÄÖÜäöü]{3,9})\.?\s+(\d{4})\b/g)) {
    const mo = MONATE[m[2].toLowerCase()]
    const iso = mo ? parseDatum(`${m[1]}.${mo}.${m[3]}`) : null
    if (iso) l.push(iso)
  }
  return l
}

/** Alle Beträge einer Zeile in Cent (Format 1.234,56 oder 1234,56; ganze Zahlen ohne Komma zählen nicht). */
export function betraegeInZeile(zeile: string): number[] {
  const z = glaetteZahlen(zeile)
  const l: number[] = []
  for (const m of z.matchAll(/(?<![\d.,])-?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?![\d,])/g)) {
    const c = parseBetrag(`${m[1]},${m[2]}`)
    if (c !== null && c > 0) l.push(c)
  }
  return l
}

const DATUM_WORT = /rechnungsdatum|belegdatum|leistungsdatum|datum|date/i
const SUMME_WORT = /gesamtbetrag|rechnungsbetrag|endbetrag|zu zahlen|zahlbetrag|gesamtsumme|brutto|summe|gesamt|total|betrag/i
const KEINE_SUMME = /netto|mwst|ust\b|umsatzsteuer|mehrwertsteuer|steuer\s*\d|zwischensumme|rabatt|skonto|anzahlung|bereits gezahlt|gutschrift/i
const LOHN_WORT = /arbeitskosten|arbeitslohn|lohnkosten|lohnanteil|lohn|arbeitsleistung|montage|anfahrt|arbeitszeit|personalkosten/i
const MATERIAL_WORT = /materialkosten|materialanteil|material|ersatzteil/i
const KEIN_AUSSTELLER = /rechnung|quittung|beleg|datum|seite|kunde|nr\.|nummer|str(asse|aße|\.)|\d{5}\s|tel|fax|e-?mail|www\.|http|ust-?id|steuer/i

/** Datum: zuerst in Zeilen mit „Datum“, sonst das späteste Datum, das nicht in der Zukunft liegt. */
export function findeDatum(text: string, heute = new Date().toISOString().slice(0, 10)): string | null {
  const zeilen = text.split('\n')
  for (const z of zeilen) if (DATUM_WORT.test(z)) { const d = datenInZeile(z).find((x) => x <= heute); if (d) return d }
  const alle = zeilen.flatMap(datenInZeile).filter((x) => x <= heute && x >= '2000-01-01').sort()
  return alle.length ? alle[alle.length - 1] : null
}

/** Gesamtbetrag: größter Betrag in Zeilen mit Summen-Begriff (ohne Netto/MwSt), sonst größter Betrag überhaupt. */
export function findeBetrag(text: string): { cent: number; zeile: string } | null {
  const zeilen = text.split('\n')
  const bester = (l: string[]) => {
    let r: { cent: number; zeile: string } | null = null
    for (const z of l) for (const c of betraegeInZeile(z)) if (!r || c > r.cent) r = { cent: c, zeile: z.trim() }
    return r
  }
  return bester(zeilen.filter((z) => SUMME_WORT.test(z) && !KEINE_SUMME.test(z))) ?? bester(zeilen.filter((z) => !KEINE_SUMME.test(z)))
}

/** Aussteller: bekannter Aussteller, der im Text vorkommt; sonst die erste sinnvolle Zeile oben. */
export function findeAussteller(text: string, bekannte: string[]): string | null {
  const zeilen = text.split('\n').map((z) => z.trim()).filter(Boolean)
  const alles = normal(zeilen.join(' '))
  const treffer = bekannte.filter((b) => normal(b).length >= 3 && alles.includes(normal(b)))
  if (treffer.length) return [...treffer].sort((a, b) => b.length - a.length)[0]
  const z = zeilen.slice(0, 8).find((x) => /[A-Za-zÄÖÜäöü]{3}/.test(x) && x.length >= 3 && x.length <= 60 && !KEIN_AUSSTELLER.test(x))
  return z ? z.replace(/\s{2,}/g, ' ') : null
}

/** § 35a: Beträge hinter „Lohn/Arbeitskosten …“ und „Material …“ (jeweils größter in der Zeile, Netto/MwSt-Zeilen ausgenommen). */
export function findeLohnMaterial(text: string): { arbeitskosten_ct: number | null; material_ct: number | null } {
  const suche = (wort: RegExp, nicht?: RegExp) => {
    let r: number | null = null
    for (const z of text.split('\n')) {
      if (!wort.test(z) || /mwst|ust\b|umsatzsteuer/i.test(z) || (nicht && nicht.test(z))) continue
      const b = betraegeInZeile(z)
      if (b.length) r = Math.max(r ?? 0, ...b)
    }
    return r
  }
  return { arbeitskosten_ct: suche(LOHN_WORT, MATERIAL_WORT), material_ct: suche(MATERIAL_WORT, LOHN_WORT) }
}

export function werteAus(text: string, bekannteAussteller: string[], heute?: string): Vorschlag {
  const b = findeBetrag(text)
  return {
    belegdatum: findeDatum(text, heute),
    betrag_ct: b?.cent ?? null,
    betragZeile: b?.zeile ?? '',
    aussteller: findeAussteller(text, bekannteAussteller),
    ...findeLohnMaterial(text),
  }
}

// ---------------------------------------------------------------- Vorschläge nach Aussteller

export type Zuordnung = Pick<BelegEntwurf, 'person' | 'modul' | 'kategorie' | 'objekt_id' | 'einheit_id' | 'umlagefaehig' | 'kind_id' | 'zahlungsart'>

/** Zuordnung des zuletzt erfassten Belegs mit ähnlichem Aussteller (oder null). */
export function zuordnungNachAussteller(aussteller: string, belege: Pick<Beleg, keyof Zuordnung | 'aussteller' | 'belegdatum' | 'erfasst_am'>[]): (Zuordnung & { aussteller: string; anzahl: number }) | null {
  if (aussteller.trim().length < 3) return null
  const passend = belege.filter((b) => b.modul && aehnlicherAussteller(b.aussteller, aussteller))
  if (!passend.length) return null
  const l = [...passend].sort((a, b) => (b.erfasst_am || b.belegdatum).localeCompare(a.erfasst_am || a.belegdatum))[0]
  return {
    aussteller: l.aussteller, anzahl: passend.length,
    person: l.person, modul: l.modul, kategorie: l.kategorie, objekt_id: l.objekt_id, einheit_id: l.einheit_id,
    umlagefaehig: l.umlagefaehig, kind_id: l.kind_id, zahlungsart: l.zahlungsart,
  }
}
