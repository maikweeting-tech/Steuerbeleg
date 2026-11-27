// E12: Bescheid-Abgleich. Posten laut Erklärung gegen Posten laut Steuerbescheid.
// Nur Erfassung und Differenz, keine Bewertung. Einspruchsfrist trägst du selbst ein (prüfen).
import type { SteuerjahrKonfig } from './konfiguration'

export interface BescheidPosten {
  id: string
  bezeichnung: string
  modul: string
  /** Betrag laut Erklärung (Cent); leer = nicht angegeben */
  erklaerung_ct: number | null
  /** Betrag laut Bescheid (Cent); leer = noch nicht eingetragen */
  bescheid_ct: number | null
  notiz: string
}

export interface BescheidKopf {
  /** ISO-Datum des Bescheids */
  bescheiddatum: string
  /** ISO-Datum, selbst eingetragen (z. B. laut Rechtsbehelfsbelehrung) */
  einspruchsfrist: string
  notiz: string
}

export const KOPF_ID = 'kopf'
export const LEERER_KOPF: BescheidKopf = { bescheiddatum: '', einspruchsfrist: '', notiz: '' }

/** Abweichung Bescheid − Erklärung in Cent; null, wenn ein Wert fehlt. Negativ = weniger anerkannt. */
export const abweichung = (p: Pick<BescheidPosten, 'erklaerung_ct' | 'bescheid_ct'>) =>
  p.erklaerung_ct === null || p.bescheid_ct === null ? null : p.bescheid_ct - p.erklaerung_ct

/** Summen über alle Posten (nur Posten mit beiden Werten fließen in die Abweichung ein). */
export function bescheidSummen(l: BescheidPosten[]) {
  const beide = l.filter((p) => abweichung(p) !== null)
  return {
    erklaerung_ct: l.reduce((s, p) => s + (p.erklaerung_ct ?? 0), 0),
    bescheid_ct: l.reduce((s, p) => s + (p.bescheid_ct ?? 0), 0),
    abweichung_ct: beide.reduce((s, p) => s + abweichung(p)!, 0),
    mitAbweichung: beide.filter((p) => abweichung(p) !== 0).length,
    offen: l.filter((p) => p.bescheid_ct === null).length,
  }
}

/** Tage bis zur selbst eingetragenen Einspruchsfrist (negativ = abgelaufen), null ohne Frist. */
export function tageBisFrist(frist: string, heute: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(frist) || !/^\d{4}-\d{2}-\d{2}/.test(heute)) return null
  return Math.round((Date.parse(frist) - Date.parse(heute.slice(0, 10))) / 86400000)
}

/**
 * Vorschlag: je Modul ein Posten mit der Belegsumme als „laut Erklärung“.
 * Annahme: Die Erklärung enthält die Belegsummen; abweichende Werte (z. B. Pauschalen, Kürzungen
 * durch die Steuerberatung) trägst du von Hand ein.
 */
export function vorschlagAusSummen(konfig: SteuerjahrKonfig, summen: { modul: string; summe_ct: number }[], vorhanden: BescheidPosten[], neueId: () => string): BescheidPosten[] {
  const jeModul = new Map<string, number>()
  for (const s of summen) jeModul.set(s.modul, (jeModul.get(s.modul) ?? 0) + s.summe_ct)
  return konfig.module
    .filter((m) => jeModul.has(m.id) && !vorhanden.some((p) => p.modul === m.id))
    .map((m) => ({ id: neueId(), bezeichnung: m.name, modul: m.id, erklaerung_ct: jeModul.get(m.id)!, bescheid_ct: null, notiz: '' }))
}
