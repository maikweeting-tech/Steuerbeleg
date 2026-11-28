import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { erinnerungen, neue } from '../src/fachlich/erinnerungen'
import { leereVorlage, type Vorlage } from '../src/fachlich/vorlagen'
import { leererEntwurf, type Beleg } from '../src/fachlich/beleg'
import { LEERER_KOPF } from '../src/fachlich/bescheid'
import { belegCache } from '../src/daten/speicher'
import { erinnere, GEZEIGT } from '../src/daten/erinnern'
import { LEER } from '../src/daten/stamm'

const kita: Vorlage = { ...leereVorlage('v-kita-0001'), bezeichnung: 'Kita-Beitrag', aussteller: 'Kita Muster', rhythmus: 'monatlich', modul: 'SA', kategorie: 'kinderbetreuung' }
const beleg = (monat: string): Beleg => ({
  ...leererEntwurf(`b${monat}`), belegdatum: `2025-${monat}-05`, zahlungsdatum: `2025-${monat}-05`, betrag_ct: 20000, aussteller: 'Kita Muster', person: 'gemeinsam', modul: 'SA', kategorie: 'kinderbetreuung',
  steuerjahr: 2025, belegnr: 1, datei_ids: '', dateiname: '', erfasst_von: '', erfasst_am: '', geaendert_von: '', geaendert_am: '', version: 1,
})

describe('Erinnerungen', () => {
  it('fehlender Monatsbeleg: jüngster Zeitraum, Anzahl offen', () => {
    const belege = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map(beleg)
    const l = erinnerungen(2025, { vorlagen: [kita], belege }, '2025-12-15')
    expect(l).toHaveLength(1)
    expect(l[0].titel).toBe('Kita-Beitrag: Beleg für November 2025 fehlt')
    expect(l[0].id).toBe('vorlage:v-kita-0001:2025-11')
    // Dezember läuft noch (fällig, nicht „fehlt“)
    expect(l[0].text).not.toContain('insgesamt')
  })

  it('mehrere offene Zeiträume werden zusammengefasst', () => {
    const l = erinnerungen(2025, { vorlagen: [kita], belege: [beleg('01')] }, '2026-01-10')
    expect(l[0].titel).toContain('Dezember 2025')
    expect(l[0].text).toContain('insgesamt 11 Zeiträume')
  })

  it('Einspruchsfrist: Stufen 14/7/3/1/0, danach nichts', () => {
    const d = (einspruchsfrist: string) => ({ vorlagen: [], belege: [], bescheidKopf: { ...LEERER_KOPF, einspruchsfrist } })
    expect(erinnerungen(2025, d('2026-03-20'), '2026-03-01')).toEqual([])
    expect(erinnerungen(2025, d('2026-03-20'), '2026-03-13')[0]).toMatchObject({ id: 'frist:2025:2026-03-20:7', titel: 'Einspruchsfrist Bescheid 2025 endet in 7 Tagen' })
    // am 5. Tag geöffnet: Stufe 7 (falls noch nicht gezeigt), Text mit echter Restzeit
    expect(erinnerungen(2025, d('2026-03-20'), '2026-03-15')[0]).toMatchObject({ id: 'frist:2025:2026-03-20:7', titel: 'Einspruchsfrist Bescheid 2025 endet in 5 Tagen' })
    expect(erinnerungen(2025, d('2026-03-20'), '2026-03-19')[0].titel).toContain('in 1 Tag')
    expect(erinnerungen(2025, d('2026-03-20'), '2026-03-20')[0].titel).toContain('endet heute')
    expect(erinnerungen(2025, d('2026-03-20'), '2026-03-21')).toEqual([])
  })

  it('schon gezeigte werden nicht wiederholt', () => {
    const l = erinnerungen(2025, { vorlagen: [kita], belege: [] }, '2026-01-10')
    expect(neue(l, { [l[0].id]: '2026-01-10' })).toEqual([])
  })

  it('erinnere: liest die lokale Kopie, zeigt einmal, merkt sich die Anzeige', async () => {
    await belegCache.schreibeRoh('stamm_2025', { ...LEER, vorlagen: [kita] })
    await belegCache.schreibe(2025, [])
    const gezeigt: string[] = []
    const n1 = await erinnere(async (e) => { gezeigt.push(e.titel) })
    const n2 = await erinnere(async (e) => { gezeigt.push(e.titel) })
    expect(n1).toBe(1)
    expect(n2).toBe(0)
    expect(gezeigt[0]).toContain('Kita-Beitrag')
    expect(Object.keys((await belegCache.liesRoh<Record<string, string>>(GEZEIGT)) ?? {})).toHaveLength(1)
  })
})
