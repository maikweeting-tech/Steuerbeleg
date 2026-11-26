import { describe, expect, it } from 'vitest'
import { formatDatum, formatEuro, parseBetrag, parseDatum } from '../src/fachlich/format'

describe('Beträge', () => {
  it('formatiert Cent als Euro mit Komma', () => {
    expect(formatEuro(41250).replace(/\s/g, ' ')).toBe('412,50 €')
    expect(formatEuro(123456).replace(/\s/g, ' ')).toBe('1.234,56 €')
  })
  it('liest deutsche Beträge', () => {
    expect(parseBetrag('412,50')).toBe(41250)
    expect(parseBetrag('1.234,5')).toBe(123450)
    expect(parseBetrag('412 €')).toBe(41200)
    expect(parseBetrag('0,07')).toBe(7)
    expect(parseBetrag('-12,30')).toBe(-1230)
  })
  it('lehnt ungültige Beträge ab', () => {
    expect(parseBetrag('12.5')).toBeNull()
    expect(parseBetrag('abc')).toBeNull()
    expect(parseBetrag('1,234')).toBeNull()
  })
})

describe('Datum', () => {
  it('wandelt ISO ↔ TT.MM.JJJJ', () => {
    expect(formatDatum('2026-03-14')).toBe('14.03.2026')
    expect(parseDatum('14.03.2026')).toBe('2026-03-14')
    expect(parseDatum('1.2.2026')).toBe('2026-02-01')
  })
  it('lehnt ungültige Daten ab', () => {
    expect(parseDatum('31.02.2026')).toBeNull()
    expect(parseDatum('2026-03-14')).toBeNull()
  })
})
