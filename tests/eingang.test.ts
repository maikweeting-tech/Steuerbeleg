import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { ausDateiname, belegDateiIds, offeneEingaenge } from '../src/fachlich/eingang'
import { synchronisiere, type Ablage, type SyncDienste } from '../src/daten/sync'
import { leererEntwurf, type Beleg } from '../src/fachlich/beleg'
import type { Wartend } from '../src/daten/speicher'
import { KONFIGURATIONEN } from '../src/konfig'
import { BLAETTER } from '../src/daten/schema'

describe('Eingang: Dateiname', () => {
  it('liest Datum und Absender', () => {
    expect(ausDateiname('2025-03-14_Musterfirma_Rechnung 12.pdf')).toEqual({ datum: '2025-03-14', absender: 'Musterfirma' })
    expect(ausDateiname('20250314_Musterfirma.pdf')).toEqual({ datum: '2025-03-14', absender: 'Musterfirma' })
    expect(ausDateiname('14.03.2025_Muster GmbH_x.pdf')).toEqual({ datum: '2025-03-14', absender: 'Muster GmbH' })
  })
  it('ohne Datum am Anfang: leer, ungültiges Datum: nur Absender', () => {
    expect(ausDateiname('Rechnung.pdf')).toEqual({ datum: '', absender: '' })
    expect(ausDateiname('2025-13-40_Firma.pdf')).toEqual({ datum: '', absender: 'Firma' })
  })
})

describe('Eingang: offene Dateien', () => {
  it('nur PDFs, ohne erledigte, nach Jahr und Name sortiert', () => {
    const d = [
      { id: 'b', name: '2025-02-01_B.pdf', mimeType: 'application/pdf', jahr: 2025 },
      { id: 'a', name: '2025-01-01_A.pdf', mimeType: 'application/pdf', jahr: 2025 },
      { id: 'x', name: 'notiz.txt', mimeType: 'text/plain', jahr: 2025 },
      { id: 'c', name: '2024-05-01_C.pdf', mimeType: 'application/pdf', jahr: 2024 },
      { id: 'e', name: '2025-03-01_E.pdf', mimeType: 'application/pdf', jahr: 2025 },
    ]
    expect(offeneEingaenge(d, new Set(['e'])).map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })
  it('Datei-Ids aus Belegen (auch mehrere je Beleg)', () => {
    expect(belegDateiIds([{ datei_ids: 'F1, F2' }, { datei_ids: '' }, { datei_ids: 'F3' }])).toEqual(['F1', 'F2', 'F3'])
  })
})

function fakes(offen = false) {
  const blaetter: Record<string, (string | number)[][]> = { Belege: [], Protokoll: [], Objekte: [], Aufteilung: [], Kinder: [], Auftraege: [] }
  const hoch: string[] = []
  const verschoben: { id: string; name: string; ordner: string }[] = []
  const d: SyncDienste = {
    konfigs: KONFIGURATIONEN,
    wurzelId: () => 'W',
    nutzer: () => 'person@x.de',
    jetzt: () => '2026-11-27T11:00:00Z',
    findeOrdner: async (n) => ({ id: 'J' + n }),
    findeSheet: async () => ({ id: 'S' }),
    holeOderErstellePfad: async (p) => ({ id: 'O:' + p.join('/') }),
    findeBelegDatei: async () => null,
    ladeHoch: async (name) => { hoch.push(name); return { id: 'NEU', name } },
    leseBlatt: async (_s, b) => blaetter[b],
    haengeAn: async (_s, b, z) => { blaetter[b].push(...z) },
    verschiebeDatei: async (id, name, ordner) => { if (!offen) verschoben.push({ id, name, ordner }); return { id, name, offen } },
  }
  let liste: Wartend[] = []
  const cache: Record<number, Beleg[]> = {}
  const a: Ablage = {
    alle: async () => [...liste],
    speichere: async (w) => { liste = [...liste.filter((x) => x.id !== w.id), w] },
    entferne: async (id) => { liste = liste.filter((x) => x.id !== id) },
    cacheSchreiben: async (j, b) => { cache[j] = b },
  }
  return { d, a, blaetter, hoch, verschoben, setze: (l: Wartend[]) => { liste = l }, liste: () => liste }
}

const ausEingang = (id: string): Wartend => ({
  id, pdf: null, quelle: { id: 'G1', name: '2025-03-14_Firma.pdf' }, seiten: 2, erfasst_von: 'person@x.de', erfasst_am: '2026-11-27T10:00:00Z', versuche: 0,
  entwurf: { ...leererEntwurf(id), belegdatum: '2025-03-14', zahlungsdatum: '2025-03-14', betrag_ct: 1000, aussteller: 'Firma', person: 'maik', modul: 'N', kategorie: 'arbeitsmittel' },
})

describe('Eingang: Übertragen', () => {
  it('verschiebt und benennt die vorhandene PDF um, lädt nichts hoch, trägt in den Belegindex des Zahlungsjahres ein', async () => {
    const f = fakes()
    f.setze([ausEingang('a')])
    expect(await synchronisiere(f.d, f.a)).toEqual({ uebertragen: 1, fehler: 0 })
    expect(f.hoch).toEqual([])
    expect(f.verschoben).toHaveLength(1)
    expect(f.verschoben[0].id).toBe('G1')
    expect(f.verschoben[0].name).toBe('2025-03-14_B0001_Firma_10,00EUR.pdf')
    const z = f.blaetter.Belege[0]
    expect(z[BLAETTER.Belege.indexOf('datei_ids')]).toBe('G1')
    expect(z[BLAETTER.Belege.indexOf('steuerjahr')]).toBe(2025)
    expect(f.blaetter.Protokoll[0][2]).toBe('erfasst (Eingang)')
    expect(f.blaetter.Auftraege).toEqual([])
    expect(f.liste()).toEqual([])
  })
  it('darf das Konto nicht verschieben: Auftrag für den Eigentümer, Beleg trotzdem eingetragen', async () => {
    const f = fakes(true)
    f.setze([ausEingang('b')])
    await synchronisiere(f.d, f.a)
    expect(f.blaetter.Belege).toHaveLength(1)
    expect(f.blaetter.Auftraege).toHaveLength(1)
    expect(f.blaetter.Auftraege[0].slice(1, 6)).toEqual(['verschieben', 'b', 'G1', f.blaetter.Auftraege[0][4], '2025-03-14_B0001_Firma_10,00EUR.pdf'])
  })
  it('Wiederholung nach Abbruch: kein doppelter Beleg', async () => {
    const f = fakes()
    f.setze([ausEingang('c')])
    await synchronisiere(f.d, f.a)
    f.setze([ausEingang('c')])
    await synchronisiere(f.d, f.a)
    expect(f.blaetter.Belege).toHaveLength(1)
  })
})
