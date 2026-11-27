import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { synchronisiere, type Ablage, type SyncDienste } from '../src/daten/sync'
import { leererEntwurf, type Beleg } from '../src/fachlich/beleg'
import type { Wartend } from '../src/daten/speicher'
import { warteschlange } from '../src/daten/speicher'
import { KONFIGURATIONEN } from '../src/konfig'
import { BLAETTER } from '../src/daten/schema'

function wartend(id: string, x: Partial<Wartend['entwurf']> = {}): Wartend {
  return {
    id, pdf: new Blob(['%PDF'], { type: 'application/pdf' }), seiten: 1, erfasst_von: 'maik@x.de', erfasst_am: `2026-11-27T10:00:0${id.length}Z`, versuche: 0,
    entwurf: { ...leererEntwurf(id), belegdatum: '2026-03-14', zahlungsdatum: '2026-03-14', betrag_ct: 1000, aussteller: 'Bäcker', person: 'maik', modul: 'N', kategorie: 'arbeitsmittel', ...x },
  }
}

function fakes(opts: { ohneIndex?: boolean; upFehler?: boolean } = {}) {
  const blaetter: Record<string, (string | number)[][]> = { Belege: [], Protokoll: [], Objekte: [['oA', 'V', 'Haus A']], Aufteilung: [], Kinder: [['k1', 'Emma', '']] }
  const dateien: { id: string; name: string; eltern: string; app: Record<string, string> }[] = []
  const ordner: string[] = []
  const d: SyncDienste = {
    konfigs: KONFIGURATIONEN,
    wurzelId: () => 'W',
    nutzer: () => 'maik@x.de',
    jetzt: () => '2026-11-27T11:00:00Z',
    findeOrdner: async (n) => (n === '2026' ? { id: 'J2026' } : null),
    findeSheet: async () => (opts.ohneIndex ? null : { id: 'S' }),
    holeOderErstellePfad: async (p) => { ordner.push(p.join('/')); return { id: 'O:' + p.join('/') } },
    findeBelegDatei: async (id) => dateien.find((f) => f.app.steuerbeleg_beleg === id) ?? null,
    ladeHoch: async (name, _m, _b, eltern, app) => {
      if (opts.upFehler) throw new Error('Netzwerk weg')
      const f = { id: 'F' + dateien.length, name, eltern, app }
      dateien.push(f)
      return f
    },
    leseBlatt: async (_s, b) => blaetter[b],
    haengeAn: async (_s, b, z) => { blaetter[b].push(...z) },
  }
  let liste: Wartend[] = []
  const cache: Record<number, Beleg[]> = {}
  const a: Ablage = {
    alle: async () => [...liste],
    speichere: async (w) => { liste = [...liste.filter((x) => x.id !== w.id), w] },
    entferne: async (id) => { liste = liste.filter((x) => x.id !== id) },
    cacheSchreiben: async (j, b) => { cache[j] = b },
  }
  return { d, a, blaetter, dateien, ordner, cache, setze: (l: Wartend[]) => { liste = l }, liste: () => liste }
}

describe('Synchronisierung', () => {
  it('lädt hoch, trägt ein, nummeriert fortlaufend', async () => {
    const f = fakes()
    f.setze([wartend('a'), wartend('bb', { modul: 'AUS', kategorie: 'versicherung', person: 'gemeinsam' })])
    expect(await synchronisiere(f.d, f.a)).toEqual({ uebertragen: 2, fehler: 0 })
    expect(f.dateien.map((x) => x.name)).toEqual([
      '2026-03-14_B0001_Bäcker_10,00EUR.pdf',
      '2026-03-14_B0002_Bäcker_10,00EUR.pdf',
    ])
    expect(f.dateien[1].eltern).toBe('O:AUS_Ausland/Kamperland_NL/Versicherung')
    expect(f.blaetter.Belege.length).toBe(2)
    expect(f.blaetter.Belege[1][BLAETTER.Belege.indexOf('belegnr')]).toBe(2)
    expect(f.blaetter.Protokoll[0].slice(2, 4)).toEqual(['erfasst', 'a'])
    expect(f.liste()).toEqual([])
    expect(f.cache[2026].length).toBe(2)
  })

  it('wiederholt ohne Doppelungen (Datei schon oben, Zeile fehlt)', async () => {
    const f = fakes()
    f.dateien.push({ id: 'Falt', name: '2026-03-14_B0005_Bäcker_10,00EUR.pdf', eltern: 'x', app: { steuerbeleg_beleg: 'a' } })
    f.setze([wartend('a')])
    await synchronisiere(f.d, f.a)
    expect(f.dateien.length).toBe(1)
    expect(f.blaetter.Belege[0][BLAETTER.Belege.indexOf('belegnr')]).toBe(5)
    // zweiter Lauf mit demselben Eintrag: Zeile existiert schon → nichts doppelt
    f.setze([wartend('a')])
    await synchronisiere(f.d, f.a)
    expect(f.blaetter.Belege.length).toBe(1)
  })

  it('Netzfehler: Eintrag bleibt mit Fehlermeldung, Abbruch', async () => {
    const f = fakes({ upFehler: true })
    f.setze([wartend('a'), wartend('bb')])
    expect(await synchronisiere(f.d, f.a)).toEqual({ uebertragen: 0, fehler: 1 })
    expect(f.liste().find((x) => x.id === 'a')?.fehler).toBe('Netzwerk weg')
    expect(f.liste().find((x) => x.id === 'a')?.versuche).toBe(1)
  })

  it('fehlender Belegindex: verständliche Meldung', async () => {
    const f = fakes({ ohneIndex: true })
    f.setze([wartend('a')])
    await synchronisiere(f.d, f.a)
    expect(f.liste()[0].fehler).toMatch(/Struktur prüfen/)
  })
})

describe('Anlage V', () => {
  it('Objektordner und Aufteilung', async () => {
    const f = fakes()
    f.setze([
      wartend('a', { modul: 'V', kategorie: 'grundsteuer', person: 'gemeinsam', objekt_id: 'oA' }),
      wartend('bb', { modul: 'V', kategorie: 'grundsteuer', person: 'gemeinsam', aufteilung: [{ objekt_id: 'oA', einheit_id: '', anteil_prozent: 70 }, { objekt_id: 'oB', einheit_id: '', anteil_prozent: 30 }] }),
    ])
    await synchronisiere(f.d, f.a)
    expect(f.dateien[0].eltern).toBe('O:V_Vermietung/Haus A/Grundsteuer')
    expect(f.dateien[1].eltern).toBe('O:V_Vermietung/Haus A/Grundsteuer')
    expect(f.blaetter.Aufteilung).toEqual([['bb', 'oA', '', 70], ['bb', 'oB', '', 30]])
    expect(f.blaetter.Belege[0][BLAETTER.Belege.indexOf('objekt_id')]).toBe('oA')
    expect(f.blaetter.Belege[1][BLAETTER.Belege.indexOf('objekt_id')]).toBe('')
  })
})

describe('Anlage Kind und § 35a', () => {
  it('Kindordner und § 35a-Spalten', async () => {
    const f = fakes()
    f.setze([
      wartend('a', { modul: 'KIND', kategorie: 'kinderbetreuung', kind_id: 'k1' }),
      wartend('bb', { modul: '35A', kategorie: 'handwerker', person: 'gemeinsam', zahlungsart: 'unbar', arbeitskosten_ct: 600, material_ct: 400 }),
    ])
    await synchronisiere(f.d, f.a)
    expect(f.dateien[0].eltern).toBe('O:Kind/Emma/Kinderbetreuungskosten')
    const z = f.blaetter.Belege[1]
    expect([z[BLAETTER.Belege.indexOf('zahlungsart')], z[BLAETTER.Belege.indexOf('arbeitskosten_ct')], z[BLAETTER.Belege.indexOf('material_ct')]]).toEqual(['unbar', 600, 400])
  })

  it('Beleg aus Vorlage: kein Upload, Verweis auf Dauerbeleg, Frage-Spalte', async () => {
    const f = fakes()
    f.setze([{ ...wartend('v', { frage: 'Absetzbar?' }), pdf: null, dauerbeleg: { id: 'DAUER1', name: 'Versicherungsschein.pdf' } }])
    expect(await synchronisiere(f.d, f.a)).toEqual({ uebertragen: 1, fehler: 0 })
    expect(f.dateien).toEqual([])
    const z = f.blaetter.Belege[0]
    expect([z[BLAETTER.Belege.indexOf('datei_ids')], z[BLAETTER.Belege.indexOf('dateiname')], z[BLAETTER.Belege.indexOf('belegnr')], z[BLAETTER.Belege.indexOf('frage')]])
      .toEqual(['DAUER1', '', 1, 'Absetzbar?'])
  })
})

describe('IndexedDB-Warteschlange', () => {
  it('speichert und entfernt', async () => {
    await warteschlange.speichere(wartend('x'))
    expect((await warteschlange.alle()).map((w) => w.id)).toEqual(['x'])
    await warteschlange.entferne('x')
    expect(await warteschlange.alle()).toEqual([])
  })
})
