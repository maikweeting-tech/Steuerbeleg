// Automatische Zuordnung: Stichwörter und Objekt über Adresse (Testdaten, keine echten Personen/Adressen)
import { describe, expect, it } from 'vitest'
import { normalisiere, objektNachText, STANDARD_STICHWOERTER, vorschlagNachStichwort } from '../src/fachlich/zuordnung'
import { stichwoerterAus, zeileAusStichwort } from '../src/daten/stamm'
import { KONFIGURATIONEN } from '../src/konfig'

const K = KONFIGURATIONEN[2024]

describe('Automatische Zuordnung', () => {
  it('alle Standard-Stichwörter zeigen auf Module/Kategorien, die es 2024–2026 gibt', () => {
    for (const j of [2024, 2025, 2026]) for (const s of STANDARD_STICHWOERTER) {
      const m = KONFIGURATIONEN[j].module.find((x) => x.id === s.modul)
      expect(m, `${s.stichwort} → ${s.modul}`).toBeTruthy()
      expect(m!.kategorien.some((k) => k.schluessel === s.kategorie), `${s.stichwort} → ${s.kategorie}`).toBe(true)
    }
  })
  it('normalisiert Umlaute, ß, Straße und Satzzeichen', () => {
    expect(normalisiere('Zahnärztin Müller-Groß, Hauptstraße 12')).toBe(' zahnaerztin mueller gross hauptstr 12 ')
  })
  it('findet Bereich und Kategorie, längstes Stichwort gewinnt, kurze Wörter nur ganz', () => {
    expect(vorschlagNachStichwort('Zahnarztpraxis Dr. Test\nRechnung', [], K)).toMatchObject({ modul: 'AGB', kategorie: 'krankheitskosten', eigen: false })
    expect(vorschlagNachStichwort('Bezirksschornsteinfegermeister Test', [], K)).toMatchObject({ modul: '35A', kategorie: 'handwerker', stichwort: 'bezirksschornstein' })
    expect(vorschlagNachStichwort('Wohngebäudeversicherung 2024', [], K)).toMatchObject({ modul: 'V', kategorie: 'gebaeudeversicherung', stichwort: 'wohngebaeudeversicherung' })
    expect(vorschlagNachStichwort('Beitrag AOK Rheinland', [], K)).toMatchObject({ modul: 'SA', kategorie: 'kv_pv' })
    expect(vorschlagNachStichwort('Kodak Fotobuch', [], K)).toBeNull() // „dak“ nur als ganzes Wort
    expect(vorschlagNachStichwort('Baumarkt Kassenbon', [], K)).toBeNull()
  })
  it('eigene Stichwörter gehen vor, ungültige Kategorien werden ignoriert', () => {
    const eigene = [{ stichwort: 'Praxis Test', modul: 'KIND', kategorie: 'kinderbetreuung' }, { stichwort: 'apotheke', modul: 'XX', kategorie: 'y' }]
    expect(vorschlagNachStichwort('Praxis Test – Zahnarzt', eigene, K)).toMatchObject({ modul: 'KIND', eigen: true })
    expect(vorschlagNachStichwort('Apotheke am Markt', eigene, K)).toMatchObject({ modul: 'AGB', eigen: false })
  })
  it('Objekt über Adresse oder Bezeichnung, nur bei eindeutigem Treffer', () => {
    const o = [
      { id: 'o1', bezeichnung: 'Testhaus Nord', adresse: 'Musterstraße 5, 12345 Testdorf' },
      { id: 'o2', bezeichnung: 'FeWo', adresse: 'Beispielweg 7a, 99999 Irgendwo' },
      { id: 'o3', bezeichnung: 'Alt', adresse: 'Musterstraße 9, 12345 Testdorf', aktiv: false },
    ]
    expect(objektNachText('Grundsteuerbescheid für Musterstr. 5 in Testdorf', o)).toMatchObject({ id: 'o1', grund: 'Adresse' })
    expect(objektNachText('Objekt: Musterstraße 55', o)).toBeNull() // andere Hausnummer
    expect(objektNachText('Abrechnung Testhaus Nord 2024', o)).toMatchObject({ id: 'o1', grund: 'Bezeichnung' })
    expect(objektNachText('FeWo Reinigung', o)).toBeNull() // Bezeichnung zu kurz
    expect(objektNachText('Musterstraße 9', o)).toBeNull() // inaktiv
    expect(objektNachText('Musterstr 5 und Beispielweg 7a', o)).toBeNull() // zwei Treffer
  })
  it('Blatt Stichwoerter hin und zurück', () => {
    const z = zeileAusStichwort({ stichwort: 'praxis test', modul: 'AGB', kategorie: 'krankheitskosten' }, 'm', 't')
    expect(stichwoerterAus([z])).toEqual([{ stichwort: 'praxis test', modul: 'AGB', kategorie: 'krankheitskosten' }])
  })
})
