import { describe, expect, it } from 'vitest'
import { ordnerPfade, pruefeKonfig, type SteuerjahrKonfig } from '../src/fachlich/konfiguration'
import roh from '../config/steuerjahr_2026.json'
import { BLAETTER } from '../src/daten/schema'

const konfig = roh as SteuerjahrKonfig

describe('Konfiguration 2026', () => {
  it('ist vollständig (wert, einheit, quelle, status bei jedem Wert)', () => {
    expect(pruefeKonfig(konfig)).toEqual([])
  })
  it('enthält nur ungeprüfte Platzhalter', () => {
    for (const w of Object.values(konfig.werte)) expect(w.status).toBe('prüfen')
    for (const m of konfig.module) for (const k of m.kategorien) expect(k.elster_zeile.status).toBe('prüfen')
  })
})

describe('Ordnerstruktur', () => {
  const pfade = ordnerPfade(konfig).map((p) => p.join('/'))

  it('legt alle Hauptordner aus der Spezifikation an', () => {
    for (const o of ['V_Vermietung', 'AUS_Ausland', 'AUS_Ausland/Kamperland_NL', 'Kind', 'N_Maik', 'N_Anna',
      'Sonderausgaben_Vorsorge', '35a_Haushalt_Handwerker', 'Sonstiges_ungeklaert', 'Export'])
      expect(pfade).toContain(o)
  })
  it('legt Kategorien je Person an', () => {
    expect(pfade).toContain('N_Maik/Fortbildungskosten')
    expect(pfade).toContain('N_Anna/Fortbildungskosten')
  })
  it('legt Objekt- und Kindordner erst an, wenn vorhanden', () => {
    expect(pfade.some((p) => p.startsWith('V_Vermietung/'))).toBe(false)
    const mit = ordnerPfade(konfig, ['Haus Goch'], ['Lena']).map((p) => p.join('/'))
    expect(mit).toContain('V_Vermietung/Haus Goch/Grundsteuer')
    expect(mit).toContain('Kind/Lena/Schulgeld')
  })
  it('sortiert Eltern vor Kindern und ohne Doppelungen', () => {
    expect(new Set(pfade).size).toBe(pfade.length)
    pfade.forEach((p, i) => {
      const eltern = p.split('/').slice(0, -1).join('/')
      if (eltern) expect(pfade.indexOf(eltern)).toBeLessThan(i)
    })
  })
  it('ersetzt Schrägstriche in Ordnernamen', () => {
    const k: SteuerjahrKonfig = { ...konfig, module: [{ id: 'X', name: 'X', ordner: 'X', ebene: 'keine',
      kategorien: [{ schluessel: 'a', name: 'Kranken/Pflege', art: 'ausgabe', elster_zeile: { wert: null, einheit: '', quelle: '', status: 'prüfen' } }] }], zusatzordner: [] }
    expect(ordnerPfade(k).map((p) => p.join('/'))).toContain('X/Kranken-Pflege')
  })
})

describe('Belegindex-Schema', () => {
  it('hat eindeutige Spalten je Blatt', () => {
    for (const [, spalten] of Object.entries(BLAETTER)) expect(new Set(spalten).size).toBe(spalten.length)
  })
  it('enthält die Pflichtfelder', () => {
    for (const f of ['belegdatum', 'zahlungsdatum', 'betrag_brutto_ct', 'aussteller', 'kategorie', 'status'])
      expect(BLAETTER.Belege).toContain(f)
  })
})
