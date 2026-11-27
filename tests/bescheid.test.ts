// M8 / E12: Bescheid-Abgleich
import { describe, expect, it } from 'vitest'
import { abweichung, bescheidSummen, tageBisFrist, vorschlagAusSummen, type BescheidPosten } from '../src/fachlich/bescheid'
import { bescheidAusZeile, kopfAusZeile, stammAus, zeileAusBescheid, zeileAusKopf } from '../src/daten/stamm'
import { KONFIGURATIONEN } from '../src/konfig'

const p = (x: Partial<BescheidPosten>): BescheidPosten => ({ id: 'p', bezeichnung: 'X', modul: '', erklaerung_ct: null, bescheid_ct: null, notiz: '', ...x })

describe('Bescheid-Abgleich', () => {
  it('Abweichung = Bescheid − Erklärung, null wenn ein Wert fehlt', () => {
    expect(abweichung(p({ erklaerung_ct: 129999, bescheid_ct: 119999 }))).toBe(-10000)
    expect(abweichung(p({ erklaerung_ct: 100, bescheid_ct: 100 }))).toBe(0)
    expect(abweichung(p({ erklaerung_ct: 100 }))).toBeNull()
    expect(abweichung(p({ bescheid_ct: 0 }))).toBeNull()
  })
  it('Summen zählen offene Posten und Posten mit Abweichung', () => {
    const s = bescheidSummen([p({ erklaerung_ct: 1000, bescheid_ct: 800 }), p({ erklaerung_ct: 500, bescheid_ct: 500 }), p({ erklaerung_ct: 300 })])
    expect(s).toEqual({ erklaerung_ct: 1800, bescheid_ct: 1300, abweichung_ct: -200, mitAbweichung: 1, offen: 1 })
  })
  it('Tage bis zur eingetragenen Frist', () => {
    expect(tageBisFrist('2027-07-13', '2027-07-01')).toBe(12)
    expect(tageBisFrist('2027-07-13', '2027-07-14T09:00:00Z')).toBe(-1)
    expect(tageBisFrist('', '2027-07-01')).toBeNull()
  })
  it('Vorschlag je Modul aus Belegsummen, ohne schon vorhandene Module', () => {
    let n = 0
    const l = vorschlagAusSummen(KONFIGURATIONEN[2026], [{ modul: 'N', summe_ct: 100 }, { modul: 'N', summe_ct: 50 }, { modul: '35A', summe_ct: 999 }], [p({ modul: '35A' })], () => 'n' + ++n)
    expect(l).toHaveLength(1)
    expect(l[0]).toMatchObject({ id: 'n1', modul: 'N', erklaerung_ct: 150, bescheid_ct: null })
  })
  it('Zeilen im Blatt Bescheid: Posten und Kopf hin und zurück', () => {
    const x = p({ id: 'a1', bezeichnung: 'Anlage N', modul: 'N', erklaerung_ct: 150, bescheid_ct: 0, notiz: 'gekürzt' })
    const z = zeileAusBescheid(x, 'maik@x.de', '2027-06-20')
    expect(bescheidAusZeile(z)).toEqual(x)
    const k = { bescheiddatum: '2027-06-10', einspruchsfrist: '2027-07-13', notiz: 'StB informiert' }
    const zk = zeileAusKopf(k, 'm', 't')
    expect(zk[0]).toBe('kopf')
    expect(kopfAusZeile(zk)).toEqual(k)
    const s = stammAus({ Bescheid: [z, zk] })
    expect(s.bescheid).toEqual([x])
    expect(s.bescheidKopf).toEqual(k)
  })
})
