// Automatische Zuordnung beim Erfassen: Bereich/Kategorie über Stichwörter im Belegtext,
// Mietobjekt über die Adresse. Alles sind nur VORSCHLÄGE, der Nutzer übernimmt sie selbst.
// Die Standardliste ist allgemein gehalten (keine persönlichen Daten) und eine Annahme (prüfen).
import type { SteuerjahrKonfig } from './konfiguration'

export interface Stichwort { stichwort: string; modul: string; kategorie: string }

const S = (modul: string, kategorie: string, ...w: string[]): Stichwort[] => w.map((stichwort) => ({ stichwort, modul, kategorie }))

/** Standard-Stichwörter (Annahme, prüfen). Eigene Stichwörter haben Vorrang. */
export const STANDARD_STICHWOERTER: Stichwort[] = [
  ...S('AGB', 'krankheitskosten', 'zahnarzt', 'arztpraxis', 'praxis dr', 'apotheke', 'optiker', 'brille', 'hoergeraet', 'physiotherap', 'krankengymnast', 'krankenhaus', 'klinik', 'zuzahlung', 'heilpraktiker', 'sanitaetshaus', 'kieferorthop'),
  ...S('AGB', 'pflegekosten', 'pflegedienst', 'pflegeheim', 'tagespflege', 'ambulante pflege'),
  ...S('AGB', 'bestattung', 'bestattung', 'bestatter', 'friedhof'),
  ...S('35A', 'handwerker', 'schornsteinfeger', 'bezirksschornstein', 'heizungsbau', 'sanitaer', 'elektroinstallation', 'elektrotechnik', 'dachdecker', 'malerbetrieb', 'malermeister', 'fliesenleger', 'tischlerei', 'schreinerei', 'installateur', 'glaserei', 'rohrreinigung', 'heizungswartung'),
  ...S('35A', 'haushaltsnah', 'gebaeudereinigung', 'reinigungsservice', 'gartenpflege', 'gartenbau', 'winterdienst', 'hausmeisterservice', 'fensterreinigung'),
  ...S('35A', 'minijob', 'minijob zentrale', 'haushaltsscheck'),
  ...S('SA', 'kv_pv', 'krankenkasse', 'krankenversicherung', 'pflegeversicherung', 'aok', 'barmer', 'dak', 'ikk', 'bkk'),
  ...S('SA', 'altersvorsorge', 'riester', 'ruerup', 'basisrente'),
  ...S('SA', 'haftpflicht', 'haftpflicht', 'unfallversicherung', 'risikolebensversicherung', 'berufsunfaehigkeit'),
  ...S('SA', 'spenden', 'zuwendungsbestaetigung', 'spendenbescheinigung', 'spende'),
  ...S('SA', 'kirchensteuer', 'kirchensteuer', 'kirchgeld'),
  ...S('N', 'arbeitsmittel', 'arbeitskleidung', 'arbeitsschuhe', 'sicherheitsschuhe', 'werkzeug', 'fachbuch'),
  ...S('N', 'fortbildung', 'lehrgang', 'fortbildung', 'weiterbildung', 'pruefungsgebuehr', 'seminar'),
  ...S('N', 'berufsverband', 'gewerkschaft', 'ig bau', 'ig metall', 'verdi', 'berufsverband'),
  ...S('KIND', 'kinderbetreuung', 'kindertagesstaette', 'kindergarten', 'kita', 'tagesmutter', 'offene ganztag', 'ogs', 'hort', 'ferienbetreuung'),
  ...S('KIND', 'schulgeld', 'schulgeld', 'privatschule'),
  ...S('V', 'grundsteuer', 'grundsteuer', 'grundbesitzabgaben'),
  ...S('V', 'gebaeudeversicherung', 'wohngebaeudeversicherung', 'gebaeudeversicherung'),
  ...S('V', 'schuldzinsen', 'zinsbescheinigung', 'baufinanzierung', 'darlehenskonto'),
  ...S('V', 'hausverwaltung', 'hausverwaltung', 'hausgeldabrechnung'),
  ...S('KAP', 'jahressteuerbescheinigung', 'jahressteuerbescheinigung', 'ertraegnisaufstellung'),
  ...S('KAP', 'verlustbescheinigung', 'verlustbescheinigung'),
  ...S('R', 'rentenbezugsmitteilung', 'rentenbezugsmitteilung', 'leistungsmitteilung'),
  ...S('R', 'rentenbescheid', 'rentenbescheid', 'rentenanpassung', 'deutsche rentenversicherung'),
]

/** Kleinbuchstaben, Umlaute ausgeschrieben, Satzzeichen → Leerzeichen, „straße/str.“ → „str“. */
export function normalisiere(t: string): string {
  return ` ${t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/strasse\b/g, 'str').replace(/[^a-z0-9]+/g, ' ').trim()} `
}

/** Kommt das Stichwort im Text vor? Kurze Wörter (≤ 4 Zeichen) nur als ganzes Wort. */
function enthaelt(text: string, stichwort: string): boolean {
  const w = normalisiere(stichwort).trim()
  if (!w) return false
  return w.length <= 4 ? text.includes(` ${w} `) : text.includes(w)
}

/**
 * Bereich und Kategorie aus dem Belegtext. Eigene Stichwörter vor Standard, sonst das längste Stichwort.
 * Nur Treffer, deren Modul/Kategorie es im Steuerjahr gibt.
 */
export function vorschlagNachStichwort(text: string, eigene: Stichwort[], konfig: SteuerjahrKonfig): (Stichwort & { eigen: boolean }) | null {
  const t = normalisiere(text)
  const gueltig = (s: Stichwort) => konfig.module.some((m) => m.id === s.modul && (!s.kategorie || m.kategorien.some((k) => k.schluessel === s.kategorie)))
  const finde = (l: Stichwort[]) => l.filter((s) => gueltig(s) && enthaelt(t, s.stichwort)).sort((a, b) => b.stichwort.length - a.stichwort.length)[0]
  const e = finde(eigene)
  if (e) return { ...e, eigen: true }
  const s = finde(STANDARD_STICHWOERTER)
  return s ? { ...s, eigen: false } : null
}

/** Straße + Hausnummer aus „Straße 5, 12345 Ort“ (normalisiert), sonst ''. */
function strasse(adresse: string): string {
  const teil = normalisiere(adresse.split(',')[0] ?? '').trim()
  return /\d/.test(teil) && teil.length >= 6 ? teil : ''
}

/** Mietobjekt, dessen Adresse (oder lange Bezeichnung) im Text steht – nur bei genau einem Treffer. */
export function objektNachText(text: string, objekte: { id: string; bezeichnung: string; adresse: string; aktiv?: boolean }[]): { id: string; bezeichnung: string; grund: string } | null {
  const t = normalisiere(text)
  const treffer = objekte.filter((o) => o.aktiv !== false).flatMap((o) => {
    const s = strasse(o.adresse)
    if (s && t.includes(` ${s} `)) return [{ id: o.id, bezeichnung: o.bezeichnung, grund: 'Adresse' }]
    const b = normalisiere(o.bezeichnung).trim()
    if (b.length >= 6 && t.includes(` ${b} `)) return [{ id: o.id, bezeichnung: o.bezeichnung, grund: 'Bezeichnung' }]
    return []
  })
  return treffer.length === 1 ? treffer[0] : null
}
