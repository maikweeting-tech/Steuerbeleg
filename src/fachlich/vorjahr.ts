// Vorjahresvergleich: Was gab es im Vorjahr, das im gewählten Jahr (noch) fehlt?
// Vergleich je Kategorie (Modul + Kategorie) und je Aussteller. Reine Logik ohne Google (testbar).
import { normalisiere } from './zuordnung'

export interface VergleichBeleg {
  aussteller: string
  modul: string
  kategorie: string
  betrag_ct: number | null
  zahlungsdatum: string
}

export interface FehlendeKategorie { modul: string; kategorie: string; vorjahrAnzahl: number; vorjahrSumme_ct: number }

export interface AusstellerVergleich {
  schluessel: string
  aussteller: string
  modul: string
  kategorie: string
  vorjahrAnzahl: number
  vorjahrSumme_ct: number
  /** Betrag des letzten Belegs im Vorjahr (Vorschlag beim Erfassen) */
  letzterBetrag_ct: number | null
  letztesDatum: string
  aktuellAnzahl: number
}

export interface VorjahrVergleich {
  kategorien: FehlendeKategorie[]
  /** im gewählten Jahr gar nicht vorhanden */
  fehlend: AusstellerVergleich[]
  /** vorhanden, aber seltener als im Vorjahr (z. B. 12 Monatsrechnungen im Vorjahr, jetzt 9) */
  weniger: AusstellerVergleich[]
}

const katSchluessel = (b: Pick<VergleichBeleg, 'modul' | 'kategorie'>) => `${b.modul}|${b.kategorie}`

/** Vergleicht die Belege des Vorjahres mit denen des gewählten Jahres. Ausgeblendete Schlüssel werden weggelassen. */
export function vergleicheVorjahr(vorjahr: VergleichBeleg[], aktuell: VergleichBeleg[], ausgeblendet: Set<string> = new Set()): VorjahrVergleich {
  const aktKat = new Set(aktuell.map(katSchluessel))
  const kat = new Map<string, FehlendeKategorie>()
  for (const b of vorjahr) {
    const k = katSchluessel(b)
    if (aktKat.has(k) || ausgeblendet.has(`kat:${k}`)) continue
    const x = kat.get(k) ?? { modul: b.modul, kategorie: b.kategorie, vorjahrAnzahl: 0, vorjahrSumme_ct: 0 }
    x.vorjahrAnzahl++
    x.vorjahrSumme_ct += b.betrag_ct ?? 0
    kat.set(k, x)
  }

  const aktAnzahl = new Map<string, number>()
  for (const b of aktuell) { const n = normalisiere(b.aussteller).trim(); if (n) aktAnzahl.set(n, (aktAnzahl.get(n) ?? 0) + 1) }
  const aus = new Map<string, AusstellerVergleich>()
  for (const b of [...vorjahr].sort((a, c) => a.zahlungsdatum.localeCompare(c.zahlungsdatum))) {
    const n = normalisiere(b.aussteller).trim()
    if (!n || ausgeblendet.has(`aus:${n}`)) continue
    const x = aus.get(n) ?? { schluessel: `aus:${n}`, aussteller: b.aussteller, modul: b.modul, kategorie: b.kategorie, vorjahrAnzahl: 0, vorjahrSumme_ct: 0, letzterBetrag_ct: null, letztesDatum: '', aktuellAnzahl: aktAnzahl.get(n) ?? 0 }
    x.vorjahrAnzahl++
    x.vorjahrSumme_ct += b.betrag_ct ?? 0
    // der jüngste Beleg bestimmt Zuordnung und Vorschlagsbetrag
    x.letzterBetrag_ct = b.betrag_ct
    x.letztesDatum = b.zahlungsdatum
    x.modul = b.modul
    x.kategorie = b.kategorie
    aus.set(n, x)
  }
  const liste = [...aus.values()].sort((a, c) => c.vorjahrSumme_ct - a.vorjahrSumme_ct || a.aussteller.localeCompare(c.aussteller))
  return {
    kategorien: [...kat.values()].sort((a, c) => c.vorjahrSumme_ct - a.vorjahrSumme_ct),
    fehlend: liste.filter((x) => x.aktuellAnzahl === 0),
    weniger: liste.filter((x) => x.aktuellAnzahl > 0 && x.aktuellAnzahl < x.vorjahrAnzahl),
  }
}
