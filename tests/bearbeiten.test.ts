import { describe, expect, it } from 'vitest'
import { aendereBeleg, aenderungen, entwurfAus, erledigeAuftraege, KonfliktFehler, type BearbeitenDienste } from '../src/daten/bearbeiten'
import { leererEntwurf, zeileAus, type Beleg } from '../src/fachlich/beleg'
import { KONFIGURATIONEN } from '../src/konfig'
import { BLAETTER } from '../src/daten/schema'

const alt: Beleg = {
  ...leererEntwurf('b1'), belegdatum: '2026-02-01', zahlungsdatum: '2026-02-01', betrag_ct: 8500, aussteller: 'Physio Kalkar',
  person: 'maik', modul: 'SA', kategorie: 'kv_pv', steuerjahr: 2026, belegnr: 4, datei_ids: 'F1',
  dateiname: '2026-02-01_B0004_Physio-Kalkar_85,00EUR.pdf', erfasst_von: 'maik', erfasst_am: 'x', geaendert_von: 'maik', geaendert_am: 'x', version: 1,
}

function fake(version = 1) {
  const blaetter: Record<string, (string | number)[][]> = { Belege: [zeileAus({ ...alt, version })], Aufteilung: [], Protokoll: [], Auftraege: [] }
  const bewegt: [string, string, string][] = []
  const pfade: string[] = []
  const d: BearbeitenDienste = {
    konfig: KONFIGURATIONEN[2026], indexId: 'S', ordnerId: 'J',
    stamm: { objekte: [{ id: 'o1', bezeichnung: 'Kalkar Wissel' } as never], kinder: [], aufteilung: [] },
    nutzer: () => 'anna', jetzt: () => 'T',
    leseBlatt: async (_s, b) => blaetter[b],
    ersetzeZeile: async (_s, b, id, z) => { const i = blaetter[b].findIndex((x) => x[0] === id); if (i < 0) return false; blaetter[b][i] = z ?? []; return true },
    leereZeilen: async (_s, b, id) => { blaetter[b] = blaetter[b].filter((x) => x[0] !== id); return 1 },
    haengeAn: async (_s, b, z) => { blaetter[b].push(...z) },
    holeOderErstellePfad: async (p) => { pfade.push(p.join('/')); return { id: 'O:' + p.join('/') } },
    verschiebeDatei: async (id, name, o) => { bewegt.push([id, name, o]); return { id, name } },
  }
  return { d, blaetter, bewegt, pfade }
}

describe('Beleg bearbeiten (E14)', () => {
  it('Physio: SA → agB Krankheitskosten, PDF wird verschoben, Nummer bleibt', async () => {
    const f = fake()
    const neu = { ...entwurfAus(alt, []), modul: 'AGB', kategorie: 'krankheitskosten' }
    const b = await aendereBeleg(alt, neu, f.d)
    expect(f.bewegt).toEqual([['F1', '2026-02-01_B0004_Physio-Kalkar_85,00EUR.pdf', 'O:agB_Aussergewoehnliche_Belastungen/Krankheitskosten']])
    expect(b.version).toBe(2)
    expect(b.belegnr).toBe(4)
    const z = f.blaetter.Belege[0]
    expect([z[BLAETTER.Belege.indexOf('modul')], z[BLAETTER.Belege.indexOf('version')], z[BLAETTER.Belege.indexOf('geaendert_von')]]).toEqual(['AGB', 2, 'anna'])
    expect(f.blaetter.Protokoll.map((p) => p[4])).toEqual(['modul', 'kategorie'])
  })

  it('Grundsteuer nachträglich Objekt zuordnen, Betrag ändert Dateinamen', async () => {
    const g: Beleg = { ...alt, modul: 'V', kategorie: 'grundsteuer', person: 'gemeinsam' }
    const f = fake()
    f.blaetter.Belege = [zeileAus(g)]
    await aendereBeleg(g, { ...entwurfAus(g, []), objekt_id: 'o1', betrag_ct: 9000 }, f.d)
    expect(f.bewegt[0]).toEqual(['F1', '2026-02-01_B0004_Physio-Kalkar_90,00EUR.pdf', 'O:V_Vermietung/Kalkar Wissel/Grundsteuer'])
  })

  it('Nur Notiz geändert: keine Dateiänderung', async () => {
    const f = fake()
    await aendereBeleg(alt, { ...entwurfAus(alt, []), notiz: 'Rezept liegt bei' }, f.d)
    expect(f.bewegt).toEqual([])
    expect(f.blaetter.Protokoll).toEqual([['T', 'anna', 'geändert', 'b1', 'notiz', '', 'Rezept liegt bei']])
  })

  it('Aufteilung wird ersetzt', async () => {
    const g: Beleg = { ...alt, modul: 'V', kategorie: 'grundsteuer', objekt_id: 'o1' }
    const f = fake()
    f.blaetter.Belege = [zeileAus(g)]
    f.blaetter.Aufteilung = [['b1', 'o1', '', 100], ['x', 'o1', '', 50]]
    f.d.stamm.aufteilung = [{ beleg_id: 'b1', objekt_id: 'o1', einheit_id: '', anteil_prozent: 100 }]
    await aendereBeleg(g, { ...entwurfAus(g, f.d.stamm.aufteilung), aufteilung: [{ objekt_id: 'o1', einheit_id: '', anteil_prozent: 60 }, { objekt_id: 'o2', einheit_id: '', anteil_prozent: 40 }] }, f.d)
    expect(f.blaetter.Aufteilung).toEqual([['x', 'o1', '', 50], ['b1', 'o1', '', 60], ['b1', 'o2', '', 40]])
  })

  it('Gleichzeitige Änderung wird erkannt, Steuerjahr nicht änderbar', async () => {
    await expect(aendereBeleg(alt, { ...entwurfAus(alt, []), notiz: 'x' }, fake(2).d)).rejects.toBeInstanceOf(KonfliktFehler)
    await expect(aendereBeleg(alt, { ...entwurfAus(alt, []), zahlungsdatum: '2027-01-05' }, fake().d)).rejects.toThrow(/Steuerjahr/)
  })

  it('Keine Änderung → nichts schreiben', async () => {
    const f = fake()
    expect(aenderungen(alt, [], entwurfAus(alt, []))).toEqual([])
    await aendereBeleg(alt, entwurfAus(alt, []), f.d)
    expect(f.blaetter.Protokoll).toEqual([])
  })

  it('Fremde PDF: Änderung gespeichert, Verschiebe-Auftrag für den Eigentümer', async () => {
    const f = fake()
    f.d.verschiebeDatei = async (id, _n) => ({ id, name: alt.dateiname, offen: true })
    const b = await aendereBeleg(alt, { ...entwurfAus(alt, []), modul: 'AGB', kategorie: 'krankheitskosten' }, f.d) as Beleg & { pdfOffen?: boolean }
    expect(b.pdfOffen).toBe(true)
    expect(f.blaetter.Belege[0][BLAETTER.Belege.indexOf('modul')]).toBe('AGB')
    const a = f.blaetter.Auftraege[0]
    expect([a[1], a[2], a[3], a[4], a[8]]).toEqual(['verschieben', 'b1', 'F1', 'agB_Aussergewoehnliche_Belastungen/Krankheitskosten', ''])

    // Eigentümer öffnet die App: Auftrag wird erledigt
    const g = fake()
    g.blaetter.Auftraege = [[...a]]
    expect(await erledigeAuftraege(g.d)).toBe(1)
    expect(g.bewegt[0]).toEqual(['F1', '2026-02-01_B0004_Physio-Kalkar_85,00EUR.pdf', 'O:agB_Aussergewoehnliche_Belastungen/Krankheitskosten'])
    expect(g.blaetter.Auftraege[0][8]).toBe('T')
    // nochmal: nichts mehr offen
    expect(await erledigeAuftraege(g.d)).toBe(0)
  })

  it('Auftrag bleibt offen, wenn auch dieses Konto nicht verschieben darf; nur der letzte je Datei wird ausgeführt', async () => {
    const g = fake()
    const zeile = (id: string, pfad: string) => [id, 'verschieben', 'b1', 'F1', pfad, 'n.pdf', 'anna', 'T0', '']
    g.blaetter.Auftraege = [zeile('a1', 'X/Alt'), zeile('a2', 'X/Neu')]
    expect(await erledigeAuftraege(g.d)).toBe(2)
    expect(g.bewegt.map((x) => x[2])).toEqual(['O:X/Neu'])
    const h = fake()
    h.d.verschiebeDatei = async (id) => ({ id, name: 'x', offen: true })
    h.blaetter.Auftraege = [zeile('a3', 'X/Neu')]
    expect(await erledigeAuftraege(h.d)).toBe(0)
    expect(h.blaetter.Auftraege[0][8]).toBe('')
  })
})
