import { describe, expect, it } from 'vitest'
import { entwurfAusVorlage, kalenderIcs, kalenderLink, leereVorlage, perioden, pruefeVorlage, vollstaendigkeit, vorlageAusBeleg, type Vorlage } from '../src/fachlich/vorlagen'
import { leererEntwurf, type Beleg } from '../src/fachlich/beleg'

const beleg = (p: Partial<Beleg>): Beleg => ({
  ...leererEntwurf('b' + Math.random()), belegnr: 1, datei_ids: 'datei1', dateiname: '', erfasst_von: '', erfasst_am: '', geaendert_von: '', geaendert_am: '', version: 1, ...p,
})
const kita: Vorlage = { ...leereVorlage('v1'), bezeichnung: 'Kita-Beitrag', aussteller: 'Kita Sonnenschein', betrag_ct: 21000, rhythmus: 'monatlich', modul: 'KIND', kategorie: 'kinderbetreuung', person: 'gemeinsam' }

describe('Perioden', () => {
  it('monatlich, vierteljährlich, jährlich', () => {
    expect(perioden(kita, 2026)).toHaveLength(12)
    expect(perioden(kita, 2026)[1]).toMatchObject({ schluessel: '2026-02', von: '2026-02-01', bis: '2026-02-28' })
    const q = perioden({ rhythmus: 'vierteljaehrlich', faellig_monat: 2 }, 2026)
    expect(q.map((p) => p.faellig_ab)).toEqual(['2026-02-01', '2026-05-01', '2026-08-01', '2026-11-01'])
    expect(q[3].bis).toBe('2026-12-31')
    expect(perioden({ rhythmus: 'jaehrlich', faellig_monat: 3 }, 2026)).toEqual([{ schluessel: '2026', name: 'Jahr 2026', von: '2026-01-01', bis: '2026-12-31', faellig_ab: '2026-03-01' }])
  })
})

describe('Vollständigkeit', () => {
  const belege = [
    beleg({ modul: 'KIND', kategorie: 'kinderbetreuung', aussteller: 'Kita Sonnenschein e.V.', person: 'gemeinsam', zahlungsdatum: '2026-01-05' }),
    beleg({ modul: 'KIND', kategorie: 'kinderbetreuung', aussteller: 'Sonstwer', person: 'gemeinsam', zahlungsdatum: '2026-02-05' }),
    beleg({ modul: 'KIND', kategorie: 'kinderbetreuung', aussteller: 'x', person: 'gemeinsam', zahlungsdatum: '2026-03-05', notiz: 'März [Vorlage v1]' }),
  ]
  it('Status je Monat', () => {
    const p = pruefeVorlage(kita, 2026, belege, '2026-04-10')
    expect(p.slice(0, 5).map((x) => x.status)).toEqual(['erledigt', 'fehlt', 'erledigt', 'faellig', 'kuenftig'])
  })
  it('Zusammenfassung ohne inaktive Vorlagen', () => {
    const v = vollstaendigkeit([kita, { ...kita, id: 'v2', aktiv: false }], 2026, belege, '2026-04-10')
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ fehlt: 1, faellig: 1, erledigt: 2 })
  })
  it('Entwurf aus Vorlage trägt die Marke und zählt als erledigt', () => {
    const p = perioden(kita, 2026)[1]
    const e = entwurfAusVorlage(kita, p, 'neu', 21000, '2026-02-01')
    expect(e).toMatchObject({ modul: 'KIND', kategorie: 'kinderbetreuung', betrag_ct: 21000, aussteller: 'Kita Sonnenschein' })
    const b = beleg({ ...e })
    expect(pruefeVorlage(kita, 2026, [b], '2026-04-10')[1].status).toBe('erledigt')
  })
  it('Vorlage aus Beleg übernimmt Zuordnung und Dauerbeleg', () => {
    const v = vorlageAusBeleg(beleg({ aussteller: 'HUK', modul: 'SONDER', kategorie: 'haftpflicht', zahlungsdatum: '2026-05-12', datei_ids: 'abc,def', betrag_ct: 6150 }), 'v9', 'jaehrlich')
    expect(v).toMatchObject({ dauerbeleg_datei_id: 'abc', faellig_monat: 5, betrag_ct: 6150, modul: 'SONDER' })
  })
})

describe('Kalender', () => {
  it('Google-Link mit monatlicher Wiederholung', () => {
    const u = new URL(kalenderLink({ titel: 'Belege', text: 'x', tag: 1, stunde: 19, ab: new Date(2026, 10, 27, 12) }))
    expect(u.searchParams.get('recur')).toBe('RRULE:FREQ=MONTHLY')
    expect(u.searchParams.get('dates')).toBe('20261201T190000/20261201T193000')
  })
  it('ICS-Datei', () => {
    const t = kalenderIcs({ titel: 'Belege; sammeln', text: 'a', tag: 28, stunde: 19, ab: new Date(2026, 10, 27, 12), uid: 'u1' })
    expect(t).toContain('DTSTART;TZID=Europe/Berlin:20261128T190000')
    expect(t).toContain('SUMMARY:Belege\\; sammeln')
  })
})
