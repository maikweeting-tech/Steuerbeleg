// Dokumentenablage: Pfade, Dateinamen, Gültigkeit, Liste je Jahr (Testdaten)
import { describe, expect, it } from 'vitest'
import {
  dokumentAusZeile, dokumentDateiname, dokumentPfad, dokumenteFuerJahr, gueltigImJahr, zeileAusDokument, zuordnungName, type Dokument,
} from '../src/fachlich/dokumente'

const O = [{ id: 'o1', bezeichnung: 'Testhaus / Nord' }]
const P = [{ id: 'p1', name: 'Person A' }]
const D = (x: Partial<Dokument>): Dokument => ({ id: 'd', titel: 'T', art: 'Mietvertrag', zuordnung: 'allgemein', gueltig_von: '', gueltig_bis: '', datei_id: 'F', dateiname: '', notiz: '', erfasst_von: '', erfasst_am: '', ...x })

describe('Dokumentenablage', () => {
  it('Ordnerpfad je Zuordnung', () => {
    expect(dokumentPfad({ zuordnung: 'objekt:o1' }, O, P)).toEqual(['Objekte', 'Testhaus - Nord'])
    expect(dokumentPfad({ zuordnung: 'person:p1' }, O, P)).toEqual(['Personen', 'Person A'])
    expect(dokumentPfad({ zuordnung: 'ausland' }, O, P)).toEqual(['Ausland'])
    expect(dokumentPfad({ zuordnung: 'objekt:weg' }, O, P)).toEqual(['Allgemein'])
  })
  it('Dateiname ohne Sonderzeichen, Endung bleibt', () => {
    expect(dokumentDateiname('Mietvertrag', 'EG links (2019)', 'scan.JPG')).toBe('Mietvertrag_EG_links_2019.jpg')
    expect(dokumentDateiname('Kaufvertrag', 'Größe/Übergabe', 'x')).toBe('Kaufvertrag_GrößeÜbergabe.pdf')
  })
  it('Gültigkeit im Jahr, neu und endet', () => {
    expect(gueltigImJahr(D({}), 2024)).toBe(true)
    expect(gueltigImJahr(D({ gueltig_bis: '2023-12-31' }), 2024)).toBe(false)
    expect(gueltigImJahr(D({ gueltig_von: '2025-01-01' }), 2024)).toBe(false)
    const l = dokumenteFuerJahr([
      D({ id: 'a', zuordnung: 'objekt:o1', gueltig_von: '2024-04-01' }),
      D({ id: 'b', zuordnung: 'objekt:o1', gueltig_von: '2019-01-01', gueltig_bis: '2024-03-31' }),
      D({ id: 'c', gueltig_bis: '2022-01-01' }),
    ], 2024)
    expect(l.map((x) => [x.id, x.neu, x.endet])).toEqual([['a', true, false], ['b', false, true]])
  })
  it('Zeile hin und zurück, lesbare Zuordnung', () => {
    const d = D({ id: 'x1', titel: 'Vertrag', zuordnung: 'person:p1', gueltig_von: '2024-01-01', notiz: 'n' })
    expect(dokumentAusZeile(zeileAusDokument(d))).toEqual(d)
    expect(zuordnungName('objekt:o1', O, P)).toBe('Testhaus / Nord')
    expect(zuordnungName('ausland', O, P)).toBe('Auslandsobjekt')
  })
})
