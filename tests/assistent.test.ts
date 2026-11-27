// S1: Erklärungs-Assistent – Bedingungen, Fortschritt, Unterlagen, Klärungspunkte, Speicherformat
import { describe, expect, it } from 'vitest'
import { bereiche, fortschritt, geburtsjahr, hinweisText, gesamtFortschritt, klaeren, naechsteOffene, passtWert, sichtbar, unterlagen, WEISS_NICHT, type Antworten } from '../src/fachlich/assistent'
import { antwortenAus, stammAus, zeileAusAntwort } from '../src/daten/stamm'

const L = bereiche(2024)
const haupt = L.find((b) => b.id === 'haupt')!
const allg = L.find((b) => b.id === 'allgemein')!

describe('Erklärungs-Assistent', () => {
  it('Fragen-Ids sind eindeutig, jede Frage hat Erklärung und Formular', () => {
    const ids = L.flatMap((b) => b.fragen.map((f) => f.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const b of L) for (const f of b.fragen) { expect(f.erklaerung.length).toBeGreaterThan(20); expect(f.formular).toBeTruthy() }
  })
  it('Jahr wird in Texte eingesetzt', () => {
    expect(allg.fragen.find((f) => f.id === 'allg_bescheid_vorjahr')!.frage).toContain('2023')
  })
  it('Bedingungen: „!x“ = beantwortet und nicht x', () => {
    expect(passtWert('vermutet', '!ja')).toBe(true)
    expect(passtWert('ja', '!ja')).toBe(false)
    expect(passtWert('', '!ja')).toBe(false)
    expect(sichtbar({ ...haupt.fragen[0], wenn: { frage: 'x', wert: 'ja' } }, { x: { wert: 'ja', notiz: '' } })).toBe(true)
    expect(sichtbar({ ...haupt.fragen[0], wenn: { frage: 'x', wert: 'ja' } }, {})).toBe(false)
  })
  it('Fortschritt und nächste offene Frage', () => {
    const a: Antworten = { haupt_veranlagung: { wert: 'zusammen', notiz: '' }, haupt_adresse: { wert: WEISS_NICHT, notiz: '' } }
    const p = fortschritt(haupt, a)
    expect(p).toMatchObject({ fertig: 2, gesamt: haupt.fragen.length, unklar: 1 })
    expect(naechsteOffene(haupt, a)!.id).toBe('haupt_familienstand')
    expect(gesamtFortschritt(L, a).fertig).toBe(2) // Bereiche „folgt“ zählen nicht
  })
  it('Unterlagen nur bei „ja“, Klärungspunkte bei „weiß nicht“ und ausgelöstem Hinweis', () => {
    const a: Antworten = {
      allg_frist: { wert: 'vermutet', notiz: '' }, allg_bescheid_vorjahr: { wert: 'ja', notiz: '' },
      haupt_behinderung: { wert: 'nein', notiz: '' }, haupt_lohnersatz: { wert: WEISS_NICHT, notiz: '' },
    }
    expect(unterlagen(L, a).map((u) => u.name)).toEqual(['Steuerbescheid 2023'])
    const k = klaeren(L, a).map((x) => x.frage)
    expect(k).toEqual(['allg_frist', 'haupt_lohnersatz'])
  })
  it('Antworten im Blatt Erklaerung hin und zurück', () => {
    const z = zeileAusAntwort('haupt_adresse', 'ja', 'Umzug im Mai', 'm', 't')
    expect(antwortenAus([z])).toEqual({ haupt_adresse: { wert: 'ja', notiz: 'Umzug im Mai' } })
    expect(stammAus({ Erklaerung: [z] }).antworten.haupt_adresse.wert).toBe('ja')
  })

  it('S2: Kinderfragen je Kind, abhängig vom Alter (Testdaten, keine echten Personen)', () => {
    const w = (wert: string) => ({ wert, notiz: '' })
    const kinderFragen = (a: Antworten) => bereiche(2024, a).find((b) => b.id === 'kinder')!.fragen.filter((f) => sichtbar(f, a)).map((f) => f.id)
    expect(kinderFragen({})).toEqual(['kinder_anzahl'])
    const a: Antworten = {
      kinder_anzahl: w('3'),
      kind1_name: w('Testkind'), kind1_geburt: w('1999-06-01'), // 25 in 2024
      kind2_geburt: w('2005-03-01'), // 19
      kind3_geburt: w('2015-03-01'), // 9
    }
    const ids = kinderFragen(a)
    expect(ids.filter((x) => x.startsWith('kind1_'))).toContain('kind1_ausbildung')
    expect(ids).toContain('kind2_ausbildung')
    expect(ids).not.toContain('kind2_betreuung')
    expect(ids).toContain('kind3_betreuung')
    expect(ids).not.toContain('kind3_ausbildung')
    expect(ids).not.toContain('kind2_erstausbildung') // erst nach „ja“ bei Ausbildung
    expect(kinderFragen({ ...a, kind2_ausbildung: w('ja') })).toContain('kind2_erstausbildung')
    // Vorname im Fragetext, Hinweis „25“ nur beim ältesten Kind
    const k = bereiche(2024, a).find((b) => b.id === 'kinder')!
    expect(k.fragen.find((f) => f.id === 'kind1_haushalt')!.frage).toContain('Kind 1 (Testkind)')
    expect(hinweisText(k.fragen.find((f) => f.id === 'kind1_geburt')!, a)).toContain('25')
    expect(hinweisText(k.fragen.find((f) => f.id === 'kind2_geburt')!, a)).toBe('')
    expect(klaeren(bereiche(2024, a), a).map((x) => x.frage)).toEqual(['kind1_geburt'])
    expect(geburtsjahr('2018-01-19')).toBe(2018)
    expect(geburtsjahr('19.01.2018')).toBeNull()
  })
  it('S2: Lohn, Rente, KAP – Folgefragen und Klärungspunkte', () => {
    const w = (wert: string) => ({ wert, notiz: '' })
    const L2 = (a: Antworten) => bereiche(2024, a)
    const sicht = (id: string, a: Antworten) => L2(a).find((b) => b.id === id)!.fragen.filter((f) => sichtbar(f, a)).map((f) => f.id)
    expect(sicht('lohn', {})).toEqual(['n_lohn'])
    expect(sicht('lohn', { n_lohn: w('ja') })).toContain('n_km')
    expect(sicht('rente', { r_rente: w('ja') })).not.toContain('r_befristet')
    const a: Antworten = { r_rente: w('ja'), r_art: w('em'), r_befristet: w(WEISS_NICHT), kap_ertraege: w('ja'), kap_freistellung: w('nein'), n_lohn: w('ja') }
    expect(sicht('rente', a)).toContain('r_befristet')
    expect(klaeren(L2(a), a).map((x) => x.frage)).toEqual(['r_befristet', 'kap_freistellung'])
    expect(unterlagen(L2(a), a).map((u) => u.frage)).toEqual(['n_lohn', 'r_rente', 'kap_ertraege'])
    expect(L2(a).filter((b) => b.folgt).map((b) => b.id)).toEqual(['vermietung', 'ausgaben'])
  })
})
