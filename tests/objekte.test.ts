import { describe, expect, it } from 'vitest'
import {
  anteilFuerObjekt, hauptObjekt, monatsreihe, objektSumme, pruefeAufteilung, umlage, umlageGewichte, verteileCent,
  type Einheit, type Einnahme,
} from '../src/fachlich/objekte'
import { leererEntwurf, pruefePflicht, zielOrdnerPfad, type Beleg } from '../src/fachlich/beleg'
import { KONFIGURATIONEN } from '../src/konfig'

const K = KONFIGURATIONEN[2026]
const beleg = (x: Partial<Beleg>): Beleg => ({
  ...leererEntwurf(x.id ?? 'b'), belegdatum: '2026-02-01', zahlungsdatum: '2026-02-01', betrag_ct: 10000, aussteller: 'X',
  person: 'gemeinsam', modul: 'V', kategorie: 'grundsteuer', belegnr: 1, steuerjahr: 2026, datei_ids: '', dateiname: '',
  erfasst_von: '', erfasst_am: '', geaendert_von: '', geaendert_am: '', version: 1, ...x,
})

describe('verteileCent', () => {
  it('Summe bleibt exakt (100,00 € auf 3 gleiche Teile)', () => {
    const t = verteileCent(10000, [1, 1, 1])
    expect(t).toEqual([3334, 3333, 3333])
    expect(t.reduce((a, b) => a + b)).toBe(10000)
  })
  it('Prozentanteile 60/40 und negative Beträge', () => {
    expect(verteileCent(12345, [60, 40])).toEqual([7407, 4938])
    expect(verteileCent(-1001, [50, 50])).toEqual([-501, -500])
  })
  it('Gewichte 0 → alles 0', () => expect(verteileCent(100, [0, 0])).toEqual([0, 0]))
})

describe('Aufteilung', () => {
  it('gültig', () => expect(pruefeAufteilung([{ objekt_id: 'a', einheit_id: '', anteil_prozent: 60 }, { objekt_id: 'b', einheit_id: '', anteil_prozent: 40 }])).toEqual([]))
  it('Summe ≠ 100 und doppelt', () => {
    const f = pruefeAufteilung([{ objekt_id: 'a', einheit_id: '', anteil_prozent: 50 }, { objekt_id: 'a', einheit_id: '', anteil_prozent: 30 }])
    expect(f.join()).toMatch(/80 %/)
    expect(f.join()).toMatch(/doppelt/)
  })
  it('Hauptobjekt = größter Anteil', () => expect(hauptObjekt([{ objekt_id: 'a', einheit_id: '', anteil_prozent: 30 }, { objekt_id: 'b', einheit_id: '', anteil_prozent: 70 }])).toBe('b'))
  it('Pflicht: Objekt fehlt nur, wenn Objekte vorhanden', () => {
    const e = { ...beleg({}), objekt_id: '' }
    expect(pruefePflicht(e, KONFIGURATIONEN, false)).toEqual([])
    expect(pruefePflicht(e, KONFIGURATIONEN, true)).toContain('Objekt fehlt')
  })
  it('Ordner: Objekt bzw. Hauptobjekt', () => {
    const obj = [{ id: 'a', bezeichnung: 'Haus A' }, { id: 'b', bezeichnung: 'Whg B/1' }]
    expect(zielOrdnerPfad(beleg({ objekt_id: 'a' }), K, obj)).toEqual(['V_Vermietung', 'Haus A', 'Grundsteuer'])
    expect(zielOrdnerPfad(beleg({ aufteilung: [{ objekt_id: 'a', einheit_id: '', anteil_prozent: 40 }, { objekt_id: 'b', einheit_id: '', anteil_prozent: 60 }] }), K, obj))
      .toEqual(['V_Vermietung', 'Whg B-1', 'Grundsteuer'])
    expect(zielOrdnerPfad(beleg({}), K, obj)).toEqual(['V_Vermietung'])
  })
})

describe('Objektsumme (ohne AfA)', () => {
  const auf = [{ beleg_id: 'g', objekt_id: 'a', einheit_id: '', anteil_prozent: 60 }, { beleg_id: 'g', objekt_id: 'b', einheit_id: '', anteil_prozent: 40 }]
  const belege = [
    beleg({ id: 'g', betrag_ct: 100000 }), // Grundsteuer 1.000 € aufgeteilt 60/40
    beleg({ id: 'm', objekt_id: 'a', kategorie: 'kaltmiete', betrag_ct: 50000 }),
    beleg({ id: 'z', objekt_id: 'b', kategorie: 'schuldzinsen', betrag_ct: 20000 }),
    beleg({ id: 'n', modul: 'N', objekt_id: 'a', betrag_ct: 99999 }),
  ]
  const einnahmen: Einnahme[] = [{ id: 'e1', objekt_id: 'a', einheit_id: '', monat: '2026-01', art: 'Miete', betrag_ct: 80000, notiz: '' }]
  it('Anteil eines aufgeteilten Belegs', () => {
    expect(anteilFuerObjekt(belege[0], 'a', auf)).toBe(60000)
    expect(anteilFuerObjekt(belege[0], 'b', auf)).toBe(40000)
  })
  it('Objekt a: Einnahmen 800 + 500, Kosten 600', () => {
    expect(objektSumme('a', belege, auf, einnahmen, K)).toEqual({ einnahmen_ct: 130000, werbungskosten_ct: 60000, saldo_ct: 70000, belege: 2 })
  })
  it('Objekt b: Kosten 400 + 200', () => {
    expect(objektSumme('b', belege, auf, einnahmen, K)).toEqual({ einnahmen_ct: 0, werbungskosten_ct: 60000, saldo_ct: -60000, belege: 2 })
  })
})

describe('Umlage (E9)', () => {
  const einheiten: Einheit[] = [
    { id: 'eg', objekt_id: 'a', bezeichnung: 'EG', wohnflaeche_m2: 60, personen: 1, fest_prozent: 30 },
    { id: 'og', objekt_id: 'a', bezeichnung: 'OG', wohnflaeche_m2: 90, personen: 3, fest_prozent: 70 },
  ]
  it('nach Wohnfläche 60/90', () => {
    const r = umlage('a', einheiten, 'wohnflaeche', [beleg({ objekt_id: 'a', umlagefaehig: true, betrag_ct: 150000 })], [])
    expect(r.zeilen).toEqual([{ kategorie: 'grundsteuer', gesamt_ct: 150000, je_einheit_ct: [60000, 90000] }])
  })
  it('nach Personen, nicht umlagefähige ignoriert, Einheit direkt', () => {
    const r = umlage('a', einheiten, 'personen', [
      beleg({ id: '1', objekt_id: 'a', umlagefaehig: true, betrag_ct: 40000 }),
      beleg({ id: '2', objekt_id: 'a', umlagefaehig: false, betrag_ct: 99999 }),
      beleg({ id: '3', objekt_id: 'a', einheit_id: 'eg', kategorie: 'gebaeudeversicherung', umlagefaehig: true, betrag_ct: 5000 }),
    ], [])
    expect(r.zeilen).toEqual([
      { kategorie: 'grundsteuer', gesamt_ct: 40000, je_einheit_ct: [10000, 30000] },
      { kategorie: 'gebaeudeversicherung', gesamt_ct: 5000, je_einheit_ct: [5000, 0] },
    ])
  })
  it('Fehlende Angaben und feste Anteile ≠ 100 %', () => {
    expect(umlageGewichte('wohnflaeche', [{ ...einheiten[0], wohnflaeche_m2: null }]).fehler.length).toBe(1)
    expect(umlageGewichte('fest', [{ ...einheiten[0], fest_prozent: 50 }]).fehler.join()).toMatch(/50 %/)
  })
})

describe('Monatsreihe', () => {
  it('Jan–Dez bzw. ab Mai', () => {
    expect(monatsreihe(2026).length).toBe(12)
    expect(monatsreihe(2026, 5)[0]).toBe('2026-05')
    expect(monatsreihe(2026, 5).at(-1)).toBe('2026-12')
  })
})
