// S0: mehrere Steuerjahre (2024, 2026), Anlage R
import { afterEach, describe, expect, it } from 'vitest'
import { ordnerPfade, pruefeKonfig } from '../src/fachlich/konfiguration'
import { gewaehltesJahr, JAHRE, KONFIGURATIONEN } from '../src/konfig'
import { pruefePflicht, leererEntwurf } from '../src/fachlich/beleg'

describe('Steuerjahre', () => {
  afterEach(() => localStorage.clear())
  it('2024 und 2026 sind vorhanden, neuestes zuerst', () => {
    expect(JAHRE).toEqual([2026, 2024])
    expect(KONFIGURATIONEN[2024].steuerjahr).toBe(2024)
  })
  it('Konfiguration 2024 ist vollständig und nur „prüfen“', () => {
    const k = KONFIGURATIONEN[2024]
    expect(pruefeKonfig(k)).toEqual([])
    for (const w of Object.values(k.werte)) expect(w.status).toBe('prüfen')
    for (const m of k.module) for (const x of m.kategorien) expect(x.elster_zeile.status).toBe('prüfen')
  })
  it('Anlage R je Person in beiden Jahren', () => {
    for (const j of JAHRE) expect(ordnerPfade(KONFIGURATIONEN[j]).map((p) => p.join('/'))).toContain('R_Anna/Rentenbescheid und Rentenanpassung')
  })
  it('gewähltes Jahr aus dem Gerätespeicher, sonst das neueste', () => {
    expect(gewaehltesJahr()).toBe(2026)
    localStorage.setItem('steuerbeleg_jahr', '2024')
    expect(gewaehltesJahr()).toBe(2024)
    localStorage.setItem('steuerbeleg_jahr', '1999')
    expect(gewaehltesJahr()).toBe(2026)
  })
  it('Beleg mit Zahlungsdatum 2024 ist speicherbar (Konfiguration 2024 vorhanden)', () => {
    const e = { ...leererEntwurf('x'), belegdatum: '2024-05-02', zahlungsdatum: '2024-05-02', betrag_ct: 1000, aussteller: 'A', person: 'anna', modul: 'R', kategorie: 'rentenbescheid' }
    expect(pruefePflicht(e, KONFIGURATIONEN)).toEqual([])
  })
})
