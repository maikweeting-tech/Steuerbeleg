// S1: Erklärungs-Assistent – Bedingungen, Fortschritt, Unterlagen, Klärungspunkte, Speicherformat
import { describe, expect, it } from 'vitest'
import { bereiche, fortschritt, gesamtFortschritt, klaeren, naechsteOffene, passtWert, sichtbar, unterlagen, WEISS_NICHT, type Antworten } from '../src/fachlich/assistent'
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
})
