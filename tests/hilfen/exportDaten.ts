// Testdatensatz für die Exporte (fiktive Werte).
import { leererEntwurf, type Beleg } from '../../src/fachlich/beleg'
import { LEER, type Stamm } from '../../src/daten/stamm'
import { KONFIGURATIONEN } from '../../src/konfig'
import type { ExportDaten } from '../../src/export/auswertung'

let n = 0
export const beleg = (p: Partial<Beleg>): Beleg => ({
  ...leererEntwurf('id' + ++n), belegnr: n, datei_ids: 'F' + n, dateiname: `x${n}.pdf`, erfasst_von: '', erfasst_am: '', geaendert_von: '', geaendert_am: '', version: 1,
  belegdatum: '2026-03-01', zahlungsdatum: '2026-03-01', person: 'maik', ...p,
})

export function testDaten(): ExportDaten {
  n = 0
  const belege = [
    beleg({ modul: 'V', kategorie: 'grundsteuer', betrag_ct: 8510, aussteller: 'Stadt Kalkar', objekt_id: 'oK', person: 'gemeinsam', umlagefaehig: true }),
    beleg({ modul: 'V', kategorie: 'grundsteuer', betrag_ct: 8510, aussteller: 'Stadt Kalkar', objekt_id: 'oK', person: 'gemeinsam', umlagefaehig: true, einheit_id: 'eOG' }),
    beleg({ modul: 'V', kategorie: 'gebaeudeversicherung', betrag_ct: 100001, aussteller: 'Provinzial', person: 'gemeinsam', umlagefaehig: true }), // aufgeteilt
    beleg({ modul: 'V', kategorie: 'erhaltungsaufwand', betrag_ct: 119000, aussteller: 'Maler', objekt_id: 'oK' }),
    beleg({ modul: 'V', kategorie: 'kaltmiete', betrag_ct: 65000, aussteller: 'Mieter', objekt_id: 'oK' }),
    beleg({ modul: '35A', kategorie: 'handwerker', betrag_ct: 100000, aussteller: 'Hendriks', arbeitskosten_ct: 60000, material_ct: 40000, zahlungsart: 'unbar' }),
    beleg({ modul: '35A', kategorie: 'handwerker', betrag_ct: 50000, aussteller: 'Bar GmbH', arbeitskosten_ct: 20000, material_ct: 20000, zahlungsart: 'bar', frage: 'Bar bezahlt – trotzdem absetzbar?' }),
    beleg({ modul: 'AGB', kategorie: 'krankheitskosten', betrag_ct: 8500, aussteller: 'Physio Weber', person: 'anna' }),
    beleg({ modul: 'N', kategorie: 'arbeitsmittel', betrag_ct: 12999, aussteller: 'Laptoptasche', frage: 'Arbeitsmittel oder privat?' }),
    beleg({ modul: 'KAP', kategorie: 'jahressteuerbescheinigung', betrag_ct: 0, aussteller: 'Sparkasse' }),
  ]
  const stamm: Stamm = {
    ...LEER,
    objekte: [
      { id: 'oK', typ: 'V', bezeichnung: 'Kalkar Wissel', adresse: 'X-Str. 1', anschaffungsdatum: '2015-06-01', anschaffungskosten_ct: 25000000, afa_satz: '2 %', baujahr: 1985, gebaeudeanteil_prozent: 80, wohnflaeche_m2: 180, umlageschluessel: 'wohnflaeche', aktiv: true },
      { id: 'oN', typ: 'V', bezeichnung: 'Kamperland', adresse: 'NL', anschaffungsdatum: '', anschaffungskosten_ct: null, afa_satz: '', baujahr: null, gebaeudeanteil_prozent: null, wohnflaeche_m2: null, umlageschluessel: 'einheiten', aktiv: true },
    ],
    einheiten: [
      { id: 'eEG', objekt_id: 'oK', bezeichnung: 'EG', wohnflaeche_m2: 100, personen: 2, fest_prozent: null },
      { id: 'eOG', objekt_id: 'oK', bezeichnung: 'OG', wohnflaeche_m2: 80, personen: 1, fest_prozent: null },
      { id: 'eA', objekt_id: 'oN', bezeichnung: 'Haus', wohnflaeche_m2: 60, personen: null, fest_prozent: null },
    ],
    einnahmen: [
      { id: 'm1', objekt_id: 'oK', einheit_id: 'eEG', monat: '2026-01', art: 'Miete', betrag_ct: 70000, notiz: '' },
      { id: 'm2', objekt_id: 'oK', einheit_id: 'eOG', monat: '2026-01', art: 'Miete', betrag_ct: 55000, notiz: '' },
    ],
    aufteilung: [
      { beleg_id: 'id3', objekt_id: 'oK', einheit_id: '', anteil_prozent: 70 },
      { beleg_id: 'id3', objekt_id: 'oN', einheit_id: '', anteil_prozent: 30 },
    ],
    fahrten: [
      { id: 'f1', person: 'maik', datum: '2026-04-01', start: 'Kalkar', ziel: 'Kleve', km: 46, zweck: 'Dienstreise', fahrzeug: '' },
      { id: 'f2', person: 'maik', datum: '2026-05-01', start: 'Kalkar', ziel: 'Düsseldorf', km: 180.5, zweck: 'Fortbildung', fahrzeug: '' },
    ],
    arbeitstage: [{ person: 'maik', jahr: 2026, entfernung_km: 23.5, arbeitstage: 180, homeoffice_tage: 40 }],
    bescheid: [
      { id: 'p1', bezeichnung: 'Anlage N Werbungskosten', modul: 'N', erklaerung_ct: 129999, bescheid_ct: 119999, notiz: 'Arbeitsmittel gekürzt' },
      { id: 'p2', bezeichnung: 'Handwerker § 35a', modul: '35A', erklaerung_ct: 80000, bescheid_ct: null, notiz: '' },
    ],
    bescheidKopf: { bescheiddatum: '2027-06-10', einspruchsfrist: '2027-07-13', notiz: '' },
  }
  return { jahr: 2026, konfig: KONFIGURATIONEN[2026], belege, stamm, vorjahr: [beleg({ modul: 'AGB', kategorie: 'krankheitskosten', betrag_ct: 5000 })], erstellt: '2026-11-27T18:00:00Z' }
}
