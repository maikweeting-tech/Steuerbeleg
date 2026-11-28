import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HILFE, hilfeZu } from '../src/fachlich/hilfe'

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.tsx') ? [p] : [] })
}

describe('i-Symbole', () => {
  const quellen = dateien('src').map((p) => [p, readFileSync(p, 'utf8')] as const)

  it('jede feste Beschriftung mit i-Symbol hat eine Erklärung', () => {
    const fehlt = quellen.flatMap(([p, s]) => [...s.matchAll(/<Info zu="([^"]+)" \/>/g)].map((m) => m[1]).filter((k) => !hilfeZu(k)).map((k) => `${p}: ${k}`))
    expect(fehlt).toEqual([])
  })

  it('jedes Eingabefeld mit fester Beschriftung hat ein i-Symbol', () => {
    const ohne = quellen.flatMap(([p, s]) => [...s.matchAll(/<label className="feld"[^>]*><span[^>]*>([^<{]+)<\/span>/g)].map((m) => `${p}: ${m[1]}`))
    expect(ohne).toEqual([])
  })

  it('Pflichtstern wird ignoriert, Texte sind nicht leer', () => {
    expect(hilfeZu('Belegdatum *')).toBe(HILFE.Belegdatum)
    expect(Object.values(HILFE).every((t) => t.length > 20)).toBe(true)
  })

  it('Konto-Spalten und Zählfelder haben Erklärungen', () => {
    for (const k of ['Buchungsdatum', 'Betrag', 'Empfänger / Zahler', 'Verwendungszweck', 'Soll/Haben-Kennzeichen (S/H)', 'Arbeitstage an der Tätigkeitsstätte', 'Homeoffice-Tage', 'Arbeitskosten (€)', 'Material (€)', 'erwartet ab Monat', 'Monat im Quartal'])
      expect(hilfeZu(k), k).not.toBe('')
  })
})
