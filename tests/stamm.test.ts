import { describe, expect, it } from 'vitest'
import { einheitAusZeile, einnahmeAusZeile, objektAusZeile, stammAus, zeileAusEinheit, zeileAusEinnahme, zeileAusObjekt } from '../src/daten/stamm'
import { neuesObjekt } from '../src/fachlich/objekte'

describe('Stammdaten-Zeilen (Hin und zurück)', () => {
  it('Objekt', () => {
    const o = { ...neuesObjekt('Kalkar'), adresse: 'Hauptstr. 5', anschaffungskosten_ct: 25000000, gebaeudeanteil_prozent: 80, wohnflaeche_m2: 150, umlageschluessel: 'personen' as const }
    expect(objektAusZeile(zeileAusObjekt(o))).toEqual(o)
    expect(objektAusZeile(zeileAusObjekt({ ...o, aktiv: false })).aktiv).toBe(false)
  })
  it('Einheit und Einnahme', () => {
    const e = { id: 'e1', objekt_id: 'o', bezeichnung: 'EG', wohnflaeche_m2: 60.5, personen: null, fest_prozent: null }
    expect(einheitAusZeile(zeileAusEinheit(e))).toEqual(e)
    const n = { id: 'n1', objekt_id: 'o', einheit_id: 'e1', monat: '2026-03', art: 'Miete' as const, betrag_ct: 65000, notiz: '' }
    expect(einnahmeAusZeile(zeileAusEinnahme(n))).toEqual(n)
  })
  it('Leere Zeilen werden übersprungen', () => {
    expect(stammAus({ Objekte: [[], [''], zeileAusObjekt(neuesObjekt('A'))] }).objekte).toHaveLength(1)
  })
})
