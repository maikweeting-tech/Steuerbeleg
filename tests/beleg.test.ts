import { describe, expect, it } from 'vitest'
import {
  betragText, belegAusZeile, dateiname, findeDuplikate, leererEntwurf, naechsteBelegnr, pruefePflicht,
  sauber, steuerjahrAus, wirksamesSteuerjahr, zeileAus, zielOrdnerPfad, type Beleg, type BelegEntwurf,
} from '../src/fachlich/beleg'
import { KONFIGURATIONEN } from '../src/konfig'
import { BLAETTER } from '../src/daten/schema'

const K = KONFIGURATIONEN[2026]
const e = (x: Partial<BelegEntwurf>): BelegEntwurf => ({
  ...leererEntwurf('id1'), belegdatum: '2026-03-14', zahlungsdatum: '2026-03-20', betrag_ct: 41250,
  aussteller: 'Stadtwerke Musterstadt', person: 'maik', modul: 'N', kategorie: 'arbeitsmittel', ...x,
})

describe('Steuerjahr (Annahme A6)', () => {
  it('aus Zahlungsdatum', () => {
    expect(steuerjahrAus('2026-12-31')).toBe(2026)
    expect(steuerjahrAus('')).toBeNull()
  })
  it('Zahlung im Januar nach Beleg im Dezember → Folgejahr', () => {
    expect(wirksamesSteuerjahr(e({ belegdatum: '2025-12-28', zahlungsdatum: '2026-01-05' }))).toBe(2026)
  })
  it('manuell überschrieben', () => {
    expect(wirksamesSteuerjahr(e({ zahlungsdatum: '2026-01-05', steuerjahr_manuell: true, steuerjahr: 2025 }))).toBe(2025)
  })
})

describe('Pflichtfelder', () => {
  it('vollständiger Beleg ist ok', () => expect(pruefePflicht(e({}), KONFIGURATIONEN)).toEqual([]))
  it('leerer Entwurf meldet alle Pflichtfelder', () => {
    const f = pruefePflicht(leererEntwurf('x'), KONFIGURATIONEN)
    for (const t of ['Belegdatum', 'Zahlungsdatum', 'Betrag', 'Aussteller', 'Person', 'Modul', 'Steuerjahr'])
      expect(f.some((x) => x.startsWith(t))).toBe(true)
  })
  it('Anlage N nicht gemeinsam', () => {
    expect(pruefePflicht(e({ person: 'gemeinsam' }), KONFIGURATIONEN).join()).toMatch(/je Person/)
  })
  it('Kategorie muss zum Modul passen', () => {
    expect(pruefePflicht(e({ kategorie: 'grundsteuer' }), KONFIGURATIONEN)).toContain('Kategorie passt nicht zum Modul')
  })
  it('SONST braucht keine Kategorie', () => {
    expect(pruefePflicht(e({ modul: 'SONST', kategorie: '', person: 'gemeinsam' }), KONFIGURATIONEN)).toEqual([])
  })
  it('Jahr ohne Konfiguration', () => {
    expect(pruefePflicht(e({ zahlungsdatum: '2027-01-02' }), KONFIGURATIONEN).join()).toMatch(/2027/)
  })
})

describe('Zielordner', () => {
  it('Anlage N je Person mit Kategorie', () => expect(zielOrdnerPfad(e({}), K)).toEqual(['N_Maik', 'Arbeitsmittel']))
  it('Modul mit Unterordner (Yerseke)', () =>
    expect(zielOrdnerPfad(e({ modul: 'AUS', kategorie: 'versicherung', person: 'gemeinsam' }), K)).toEqual(['AUS_Ausland', 'Yerseke_NL', 'Versicherung']))
  it('Anlage V vorerst Modulordner', () =>
    expect(zielOrdnerPfad(e({ modul: 'V', kategorie: 'grundsteuer' }), K)).toEqual(['V_Vermietung']))
  it('SONST ohne Kategorie', () => expect(zielOrdnerPfad(e({ modul: 'SONST', kategorie: '' }), K)).toEqual(['Sonstiges_ungeklaert']))
})

describe('Dateiname', () => {
  it('Format', () => expect(dateiname(e({}), 7)).toBe('2026-03-14_B0007_Stadtwerke-Musterstadt_412,50EUR.pdf'))
  it('verbotene Zeichen und Länge', () => {
    expect(sauber('A/B: "C" <D>|E?')).toBe('A-B-C-D-E')
    expect(sauber('x'.repeat(60)).length).toBe(40)
    expect(sauber('   ')).toBe('unbekannt')
  })
  it('Betrag', () => {
    expect(betragText(5)).toBe('0,05EUR')
    expect(betragText(123456)).toBe('1234,56EUR')
    expect(betragText(-1999)).toBe('-19,99EUR')
  })
})

describe('Belegnummer', () => {
  it('laufend je Jahr', () => {
    expect(naechsteBelegnr([], 2026)).toBe(1)
    expect(naechsteBelegnr([{ belegnr: 3, steuerjahr: 2026 }, { belegnr: 9, steuerjahr: 2025 }, { belegnr: 5, steuerjahr: 2026 }], 2026)).toBe(6)
  })
})

describe('Duplikate (E1)', () => {
  const alt = [
    { id: 'a', belegdatum: '2026-03-14', betrag_ct: 41250, aussteller: 'Stadtwerke', belegnr: 1 },
    { id: 'b', belegdatum: '2026-03-14', betrag_ct: 41250, aussteller: 'Bäcker Meyer', belegnr: 2 },
    { id: 'c', belegdatum: '2026-03-15', betrag_ct: 41250, aussteller: 'Stadtwerke', belegnr: 3 },
  ]
  it('gleiches Datum + Betrag, ähnlicher Aussteller zuerst', () => {
    const d = findeDuplikate(e({}), alt)
    expect(d.map((x) => [x.beleg.id, x.stufe])).toEqual([['a', 'hoch'], ['b', 'mittel']])
  })
  it('sich selbst nicht melden, ohne Betrag nichts', () => {
    expect(findeDuplikate(e({ id: 'a' }), alt).map((x) => x.beleg.id)).toEqual(['b'])
    expect(findeDuplikate(e({ betrag_ct: null }), alt)).toEqual([])
  })
})

describe('Zeile im Belegindex', () => {
  it('hin und zurück, Spalten passen zum Schema', () => {
    const b: Beleg = { ...e({ notiz: 'Test' }), belegnr: 4, steuerjahr: 2026, datei_ids: 'f1', dateiname: 'x.pdf',
      erfasst_von: 'm@x.de', erfasst_am: '2026-11-27T10:00:00Z', geaendert_von: 'm@x.de', geaendert_am: '2026-11-27T10:00:00Z', version: 1 }
    const z = zeileAus(b)
    expect(z.length).toBe(BLAETTER.Belege.length)
    expect(z[BLAETTER.Belege.indexOf('betrag_brutto_ct')]).toBe(41250)
    expect(belegAusZeile(z)).toEqual(b)
  })
})
