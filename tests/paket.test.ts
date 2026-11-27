// @vitest-environment node
// M7/E5: ZIP-Paket – Ordnerstruktur wie in Drive, Dauerbeleg nur einmal, Fehler werden gemeldet.
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { erstellePaket } from '../src/export/paket'
import { testDaten } from './hilfen/exportDaten'

describe('ZIP-Paket', () => {
  it('legt Belege in Ordnern ab, Dauerbeleg einmal, Zusatzdateien im Wurzelordner', async () => {
    const d = testDaten()
    d.belege[0].datei_ids = 'DAUER'; d.belege[1].datei_ids = 'DAUER'
    const geladen: string[] = []
    const lade = async (id: string) => {
      geladen.push(id)
      if (id === 'F9') throw new Error('404')
      return { daten: new TextEncoder().encode(`Inhalt ${id}`).buffer as ArrayBuffer, name: `${id}.pdf` }
    }
    const r = await erstellePaket(d, lade, { 'Steuer_2026_Checkliste.pdf': new Uint8Array([1, 2, 3]) })
    const z = unzipSync(new Uint8Array(await r.zip.arrayBuffer()))
    const namen = Object.keys(z)
    expect(geladen.filter((x) => x === 'DAUER')).toHaveLength(1)
    expect(r.fehler).toEqual(['Nr. 9: 404'])
    expect(namen).toContain('Steuer_2026_Checkliste.pdf')
    // 10 Belege, 2 teilen sich DAUER, 1 Fehler → 8 Belegdateien + 1 Zusatz
    expect(namen.filter((n) => n.startsWith('Belege_2026/'))).toHaveLength(8)
    expect(r.dateien).toBe(9)
    const dauer = namen.find((n) => new TextDecoder().decode(z[n]) === 'Inhalt DAUER')!
    expect(dauer).toMatch(/^Belege_2026\/.*Kalkar Wissel\/.*x1\.pdf$/)
    expect(namen.some((n) => n.includes('/x8.pdf'))).toBe(true)
  })
})
