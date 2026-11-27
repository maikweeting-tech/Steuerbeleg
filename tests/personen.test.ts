import { describe, expect, it } from 'vitest'
import { pruefeFahrt, zaehle, type Fahrt } from '../src/fachlich/personen'
import { belegHinweise, leererEntwurf, pruefePflicht, zielOrdnerPfad } from '../src/fachlich/beleg'
import { KONFIGURATIONEN } from '../src/konfig'

const fahrt = (km: number, zweck: Fahrt['zweck'], person = 'maik'): Fahrt => ({ id: String(km), person, datum: '2026-03-01', start: '', ziel: 'X', km, zweck, fahrzeug: '' })

describe('Zähler Anlage N (E3)', () => {
  it('zählt Tage, Entfernungs-km und Fahrten je Zweck, je Person getrennt', () => {
    const z = zaehle('maik', { person: 'maik', jahr: 2026, entfernung_km: 23.5, arbeitstage: 180, homeoffice_tage: 40 },
      [fahrt(120, 'Dienstreise'), fahrt(35.4, 'Dienstreise'), fahrt(80, 'Fortbildung'), fahrt(999, 'Dienstreise', 'anna')], null)
    expect(z.entfernungs_km_summe).toBe(4230) // 180 × 23,5
    expect(z.km_je_zweck.Dienstreise).toBe(155.4)
    expect(z.km_je_zweck.Fortbildung).toBe(80)
    expect(z.fahrten).toBe(3)
    expect(z.hinweise).toEqual([])
  })
  it('Hinweise: > 366 Tage, Höchstwert, Entfernung fehlt', () => {
    const z = zaehle('maik', { person: 'maik', jahr: 2026, entfernung_km: null, arbeitstage: 300, homeoffice_tage: 100 }, [], 50)
    expect(z.hinweise).toHaveLength(3)
    expect(z.entfernungs_km_summe).toBeNull()
  })
  it('Fahrt prüfen', () => expect(pruefeFahrt({ ...fahrt(0, 'Dienstreise'), ziel: '', datum: '' })).toHaveLength(3))
})

describe('§ 35a und Kind', () => {
  const basis = { ...leererEntwurf('x'), belegdatum: '2026-05-02', zahlungsdatum: '2026-05-02', betrag_ct: 100000, aussteller: 'Maler', person: 'gemeinsam', modul: '35A', kategorie: 'handwerker' }
  it('Arbeit + Material muss Betrag ergeben', () => {
    expect(pruefePflicht({ ...basis, arbeitskosten_ct: 60000, material_ct: 40000 }, KONFIGURATIONEN)).toEqual([])
    expect(pruefePflicht({ ...basis, arbeitskosten_ct: 60000, material_ct: 30000 }, KONFIGURATIONEN)[0]).toMatch(/Arbeitskosten \+ Material = 900,00 € statt Betrag 1000,00 €/)
    expect(pruefePflicht({ ...basis, arbeitskosten_ct: 120000 }, KONFIGURATIONEN)).toHaveLength(1)
  })
  it('Barzahlung → Hinweis', () => {
    expect(belegHinweise({ ...basis, zahlungsart: 'bar', arbeitskosten_ct: 1 })[0]).toMatch(/Barzahlung/)
    expect(belegHinweise({ ...basis, zahlungsart: 'unbar', arbeitskosten_ct: 1 })).toEqual([])
  })
  it('Kind fehlt nur, wenn Kinder angelegt; Ordner je Kind', () => {
    const k = { ...basis, modul: 'KIND', kategorie: 'kinderbetreuung' }
    expect(pruefePflicht(k, KONFIGURATIONEN, false, false)).toEqual([])
    expect(pruefePflicht(k, KONFIGURATIONEN, false, true)).toEqual(['Kind fehlt'])
    expect(zielOrdnerPfad({ ...k, kind_id: 'k1' }, KONFIGURATIONEN[2026], [], [{ id: 'k1', name: 'Emma' }])).toEqual(['Kind', 'Emma', 'Kinderbetreuungskosten'])
  })
})
