import { describe, expect, it } from 'vitest'
import { vergleicheVorjahr, type VergleichBeleg } from '../src/fachlich/vorjahr'

const b = (aussteller: string, modul: string, kategorie: string, betrag: number, datum: string): VergleichBeleg => ({ aussteller, modul, kategorie, betrag_ct: betrag, zahlungsdatum: datum })

const vorjahr = [
  b('Muster-Versicherung AG', 'SA', 'versicherung', 30000, '2024-01-10'),
  b('Stadtwerke', 'V', 'nebenkosten', 10000, '2024-02-01'),
  b('Stadtwerke', 'V', 'nebenkosten', 12000, '2024-05-01'),
  b('Stadtwerke', 'V', 'nebenkosten', 11000, '2024-08-01'),
  b('Praxis Beispiel', 'AGB', 'krankheit', 5000, '2024-03-03'),
  b('Bäckerei', 'N', 'arbeitsmittel', 800, '2024-04-04'),
]
const aktuell = [
  b('STADTWERKE', 'V', 'nebenkosten', 11500, '2025-02-01'),
  b('Bäckerei', 'N', 'arbeitsmittel', 900, '2025-04-04'),
]

describe('Vorjahresvergleich', () => {
  it('findet fehlende Kategorien, fehlende und seltenere Aussteller', () => {
    const v = vergleicheVorjahr(vorjahr, aktuell)
    expect(v.kategorien.map((k) => k.kategorie)).toEqual(['versicherung', 'krankheit'])
    expect(v.kategorien[0]).toEqual({ modul: 'SA', kategorie: 'versicherung', vorjahrAnzahl: 1, vorjahrSumme_ct: 30000 })
    expect(v.fehlend.map((a) => a.aussteller)).toEqual(['Muster-Versicherung AG', 'Praxis Beispiel'])
    // Schreibweise egal (STADTWERKE = Stadtwerke), 3 im Vorjahr, 1 jetzt
    expect(v.weniger).toHaveLength(1)
    expect(v.weniger[0]).toMatchObject({ aussteller: 'Stadtwerke', vorjahrAnzahl: 3, aktuellAnzahl: 1, vorjahrSumme_ct: 33000, letzterBetrag_ct: 11000, letztesDatum: '2024-08-01' })
  })

  it('„Fällt weg“ blendet aus', () => {
    const v = vergleicheVorjahr(vorjahr, aktuell, new Set(['kat:SA|versicherung', 'aus:praxis beispiel']))
    expect(v.kategorien.map((k) => k.kategorie)).toEqual(['krankheit'])
    expect(v.fehlend.map((a) => a.aussteller)).toEqual(['Muster-Versicherung AG'])
  })

  it('alles vorhanden: leer', () => {
    const v = vergleicheVorjahr(aktuell, aktuell)
    expect(v).toEqual({ kategorien: [], fehlend: [], weniger: [] })
  })
})
