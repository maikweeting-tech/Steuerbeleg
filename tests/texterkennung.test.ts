import { describe, expect, it } from 'vitest'
import { betraegeInZeile, datenInZeile, findeAussteller, findeBetrag, findeDatum, findeLohnMaterial, werteAus, zuordnungNachAussteller } from '../src/fachlich/texterkennung'

const RECHNUNG = `Malerbetrieb Hendriks GmbH
Hauptstraße 12, 47546 Kalkar
Tel. 02824 12345

Rechnung Nr. 2026-117
Rechnungsdatum: 14.03.2026
Leistungszeitraum 02.03.2026 - 06.03.2026

Arbeitskosten (Lohn) 18 Std.            756,00
Material Farbe, Abdeckung               244,00
Zwischensumme netto                   1.000,00
zzgl. 19 % MwSt.                        190,00
Gesamtbetrag                          1.190,00 €
Zahlbar bis 28.03.2026 ohne Abzug.`

describe('Texterkennung – Auswertung', () => {
  it('findet Daten in üblichen Schreibweisen', () => {
    expect(datenInZeile('Datum 14.03.2026')).toEqual(['2026-03-14'])
    expect(datenInZeile('am 4.3.26')).toEqual(['2026-03-04'])
    expect(datenInZeile('Kalkar, 7. März 2026')).toEqual(['2026-03-07'])
    expect(datenInZeile('31.02.2026')).toEqual([])
  })
  it('findet Beträge, auch mit Lesefehlern', () => {
    expect(betraegeInZeile('Summe 1.234,56 EUR')).toEqual([123456])
    expect(betraegeInZeile('Summe 1O5,9O')).toEqual([10590])
    expect(betraegeInZeile('Menge 3 Stück à 12,50 = 37,50')).toEqual([1250, 3750])
    expect(betraegeInZeile('PLZ 47546')).toEqual([])
  })
  it('Rechnungsdatum vor anderen Daten, kein Datum in der Zukunft', () => {
    expect(findeDatum(RECHNUNG, '2026-11-27')).toBe('2026-03-14')
    expect(findeDatum('Kassenbon\n12.05.2026 10:14\n01.01.2030', '2026-11-27')).toBe('2026-05-12')
  })
  it('Gesamtbetrag brutto, nicht Netto/MwSt', () => {
    expect(findeBetrag(RECHNUNG)?.cent).toBe(119000)
    expect(findeBetrag('Brot 2,40\nKäse 5,99\nMwSt 0,58')?.cent).toBe(599)
  })
  it('Aussteller: bekannter Name hat Vorrang, sonst erste Kopfzeile', () => {
    expect(findeAussteller(RECHNUNG, ['Stadtwerke Kleve', 'Malerbetrieb Hendriks'])).toBe('Malerbetrieb Hendriks')
    expect(findeAussteller(RECHNUNG, [])).toBe('Malerbetrieb Hendriks GmbH')
    expect(findeAussteller('Rechnung\nPhysiotherapie Weber\nStr. 3', [])).toBe('Physiotherapie Weber')
  })
  it('§ 35a: Lohn- und Materialanteil', () => {
    expect(findeLohnMaterial(RECHNUNG)).toEqual({ arbeitskosten_ct: 75600, material_ct: 24400 })
    expect(findeLohnMaterial('Gesamt 100,00')).toEqual({ arbeitskosten_ct: null, material_ct: null })
  })
  it('werteAus fasst alles zusammen', () => {
    const v = werteAus(RECHNUNG, [], '2026-11-27')
    expect(v).toMatchObject({ belegdatum: '2026-03-14', betrag_ct: 119000, aussteller: 'Malerbetrieb Hendriks GmbH' })
    expect(v.betragZeile).toContain('Gesamtbetrag')
  })
})

describe('Vorschlag nach Aussteller', () => {
  const b = (aussteller: string, modul: string, kategorie: string, erfasst_am: string) => ({
    aussteller, modul, kategorie, erfasst_am, belegdatum: '', person: 'maik', objekt_id: '', einheit_id: '', umlagefaehig: false, kind_id: '', zahlungsart: '' as const,
  })
  it('nimmt den zuletzt erfassten ähnlichen Beleg', () => {
    const l = [b('Stadtwerke Kleve', 'V', 'strom', '2026-01-10'), b('Stadtwerke Kleve GmbH', 'V', 'wasser', '2026-03-01'), b('Physio Weber', 'AGB', 'krankheitskosten', '2026-04-01')]
    expect(zuordnungNachAussteller('stadtwerke kleve', l)).toMatchObject({ modul: 'V', kategorie: 'wasser', anzahl: 2 })
    expect(zuordnungNachAussteller('Bäcker', l)).toBeNull()
    expect(zuordnungNachAussteller('St', l)).toBeNull()
  })
})
