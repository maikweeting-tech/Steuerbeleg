import { describe, expect, it } from 'vitest'
import { csvBetrag, csvDatum, dekodiere, gleicheAb, liesKontoauszug, parseCsv } from '../src/fachlich/kontoauszug'
import { leererEntwurf, type Beleg } from '../src/fachlich/beleg'

// Beispieldateien nach öffentlich bekannten Exportformaten nachgebaut (Annahme, keine echten Dateien der Banken)
const SPARKASSE_CAMT = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00324500000000000000";"14.03.26";"14.03.26";"FOLGELASTSCHRIFT";"Grundsteuer 1. Quartal";"DE98ZZZ";"M1";"";"";"";"";"Stadt Kalkar";"DE11";"WELADED1KLE";"-85,10";"EUR";"Umsatz gebucht"
"DE00324500000000000000";"20.03.26";"20.03.26";"GUTSCHR. UEBERWEISUNG";"Miete Maerz";"";"";"";"";"";"";"Mieter Muster";"DE22";"";"650,00";"EUR";"Umsatz gebucht"`

const SPARKASSE_MT940 = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Beguenstigter/Zahlungspflichtiger";"Kontonummer";"BLZ";"Betrag";"Waehrung";"Info"
"0000000";"02.02.26";"02.02.26";"LASTSCHRIFT";"Strom Januar";"Stadtwerke Kleve GmbH";"123";"324";"-119,00";"EUR";"Umsatz gebucht"`

const VOLKSBANK = `Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;Saldo nach Buchung;Bemerkung;Kategorie;Steuerrelevant;Glaeubiger ID;Mandatsreferenz
Girokonto;DE00324604300000000000;GENODED1GDL;Volksbank Kleverland;05.03.2026;05.03.2026;Malerbetrieb Hendriks GmbH;DE33;;Überweisung;Rechnung 2026-117;-1.190,00;EUR;2.000,00;;;;;`

const VOLKSBANK_ALT = `Buchungstag;Valuta;Auftraggeber/Zahlungsempfänger;Empfänger/Zahlungspflichtiger;Konto-Nr.;IBAN;BLZ;BIC;Vorgang/Verwendungszweck;Kundenreferenz;Währung;Umsatz;
"05.03.2026";"05.03.2026";"Maik";"Physio Weber";"";"DE44";"";"";"Rechnung 12";"";"EUR";"85,00";"S"
"06.03.2026";"06.03.2026";"Firma";"Maik";"";"DE55";"";"";"Gehalt";"";"EUR";"3.000,00";"H"`

const ING = `Umsatzanzeige;Datei erstellt am: 27.11.2026 18:00
IBAN;DE12 5001 0517 0000 0000 00
Kontoname;Girokonto
Zeitraum;01.01.2026 - 27.11.2026

Buchung;Wertstellungsdatum;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag;Währung
10.04.2026;10.04.2026;Kita Sonnenschein;Lastschrift;Beitrag April;1.234,56;EUR;-210,00;EUR`

const DKB = `"Konto";"Girokonto DE00120300000000000000"
""
"Kontostand vom 27.11.2026:";"1.000,00 €"
""
"Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige*r";"Zahlungsempfänger*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag (€)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"
"12.05.26";"12.05.26";"Gebucht";"Maik";"HUK-Coburg";"Beitrag Haftpflicht";"Ausgang";"DE66";"-61,5";"";"";""
"13.05.26";"13.05.26";"Gebucht";"Arbeitgeber GmbH";"Maik";"Gehalt";"Eingang";"DE77";"2.500";"";"";""`

const COMDIRECT = `;
"Umsätze Girokonto";"Zeitraum: 01.01.2026 - 27.11.2026";
"Neuer Kontostand";"1.000,00 EUR";

"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR";
"15.06.2026";"15.06.2026";"Lastschrift / Belastung";"Auftraggeber: Stadtwerke Kleve Buchungstext: Wasser";"-45,20";
"Alter Kontostand";"900,00 EUR";`

describe('Kontoauszug – Werte', () => {
  it('Datum und Betrag', () => {
    expect(csvDatum('14.03.26')).toBe('2026-03-14')
    expect(csvDatum('05.03.2026')).toBe('2026-03-05')
    expect(csvDatum('31.02.2026')).toBeNull()
    expect(csvBetrag('-1.190,00')).toBe(-119000)
    expect(csvBetrag('-61,5')).toBe(-6150)
    expect(csvBetrag('2.500')).toBe(250000)
    expect(csvBetrag('Saldo')).toBeNull()
  })
  it('CSV mit Anführungszeichen und Zeilenumbruch im Feld', () => {
    expect(parseCsv('a;"b;c";"d ""x"""\n1;"2\n3";4')).toEqual([['a', 'b;c', 'd "x"'], ['1', '2\n3', '4']])
  })
  it('Windows-1252 wird erkannt', () => {
    expect(dekodiere(new Uint8Array([0x4d, 0xe4, 0x72, 0x7a]))).toBe('März')
    expect(dekodiere(new TextEncoder().encode('März'))).toBe('März')
  })
})

describe('Kontoauszug – Formate (Annahme)', () => {
  const pruefe = (csv: string, bank: string, erwartet: Partial<Record<'datum' | 'betrag_ct' | 'gegenseite', unknown>>[]) => {
    const r = liesKontoauszug(csv)
    expect(r.bank).toBe(bank)
    expect(r.buchungen.map((b) => ({ datum: b.datum, betrag_ct: b.betrag_ct, gegenseite: b.gegenseite }))).toEqual(erwartet)
    return r
  }
  it('Sparkasse CSV-CAMT', () => {
    const r = pruefe(SPARKASSE_CAMT, 'Sparkasse (CSV-CAMT)', [
      { datum: '2026-03-14', betrag_ct: -8510, gegenseite: 'Stadt Kalkar' }, { datum: '2026-03-20', betrag_ct: 65000, gegenseite: 'Mieter Muster' }])
    expect(r.buchungen[0].zweck).toContain('Grundsteuer')
  })
  it('Sparkasse CSV-MT940', () => pruefe(SPARKASSE_MT940, 'Sparkasse (CSV-MT940)', [{ datum: '2026-02-02', betrag_ct: -11900, gegenseite: 'Stadtwerke Kleve GmbH' }]))
  it('Volksbank (VR-Banking)', () => pruefe(VOLKSBANK, 'Volksbank / VR-Banking', [{ datum: '2026-03-05', betrag_ct: -119000, gegenseite: 'Malerbetrieb Hendriks GmbH' }]))
  it('Volksbank altes Format mit S/H', () => {
    const r = liesKontoauszug(VOLKSBANK_ALT)
    expect(r.buchungen.map((b) => b.betrag_ct)).toEqual([-8500, 300000])
  })
  it('ING mit Vorspann', () => {
    const r = pruefe(ING, 'ING', [{ datum: '2026-04-10', betrag_ct: -21000, gegenseite: 'Kita Sonnenschein' }])
    expect(r.buchungen[0].konto).toBe('DE12500105170000000000')
  })
  it('DKB: Gegenseite je nach Vorzeichen', () => pruefe(DKB, 'DKB', [
    { datum: '2026-05-12', betrag_ct: -6150, gegenseite: 'HUK-Coburg' }, { datum: '2026-05-13', betrag_ct: 250000, gegenseite: 'Arbeitgeber GmbH' }]))
  it('comdirect', () => {
    const r = pruefe(COMDIRECT, 'comdirect', [{ datum: '2026-06-15', betrag_ct: -4520, gegenseite: '' }])
    expect(r.buchungen[0].zweck).toContain('Stadtwerke Kleve')
  })
  it('gleiche Datei → gleiche Buchungs-Ids', () => {
    expect(liesKontoauszug(SPARKASSE_CAMT).buchungen.map((b) => b.id)).toEqual(liesKontoauszug(SPARKASSE_CAMT).buchungen.map((b) => b.id))
  })
  it('unbekanntes Format → Hinweis zur Spaltenzuordnung', () => {
    const r = liesKontoauszug('a;b;c\n1;2;3')
    expect(r.buchungen).toEqual([])
    expect(r.warnungen[0]).toContain('von Hand')
  })
})

describe('Abgleich', () => {
  const beleg = (betrag_ct: number, zahlungsdatum: string): Beleg => ({
    ...leererEntwurf('x' + betrag_ct), betrag_ct, zahlungsdatum, belegdatum: zahlungsdatum, belegnr: 1, datei_ids: '', dateiname: '',
    erfasst_von: '', erfasst_am: '', geaendert_von: '', geaendert_am: '', version: 1,
  })
  it('gleicher Betrag und Datum ± 5 Tage', () => {
    const bu = liesKontoauszug(SPARKASSE_CAMT).buchungen
    const a = gleicheAb(bu, [beleg(8510, '2026-03-10'), beleg(8510, '2026-03-01'), beleg(8511, '2026-03-14')])
    expect(a[0].treffer.map((b) => b.zahlungsdatum)).toEqual(['2026-03-10'])
    expect(a[1].treffer).toEqual([])
  })
})
