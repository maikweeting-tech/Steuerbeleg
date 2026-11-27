// Suche und Filter für die Belegliste (M6).
import type { Beleg } from './beleg'
import { formatEuro } from './format'

export interface Filter {
  text: string
  modul: string
  person: string
  status: string
  nurFragen: boolean
}

export const KEIN_FILTER: Filter = { text: '', modul: '', person: '', status: '', nurFragen: false }

const klein = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/**
 * Text: alle Wörter müssen vorkommen (Aussteller, Notiz, Frage, Nr., Betrag, Datum, Kategoriename).
 * Beträge werden in der Schreibweise „85,10“ durchsucht.
 */
export function filtereBelege(belege: Beleg[], f: Filter, beschreibe: (b: Beleg) => string = () => ''): Beleg[] {
  const woerter = klein(f.text).split(/\s+/).filter(Boolean)
  return belege.filter((b) => {
    if (f.modul && b.modul !== f.modul) return false
    if (f.person && b.person !== f.person) return false
    if (f.status && b.status !== f.status) return false
    if (f.nurFragen && !b.frage.trim()) return false
    if (!woerter.length) return true
    const betrag = b.betrag_ct === null ? '' : formatEuro(b.betrag_ct).replace(/\s?€/, '')
    const datum = b.belegdatum ? b.belegdatum.split('-').reverse().join('.') : ''
    const heu = klein([b.aussteller, b.notiz, b.frage, String(b.belegnr), betrag, betrag.replace(/\./g, ''), datum, beschreibe(b)].join(' '))
    return woerter.every((w) => heu.includes(w))
  })
}

export const summe = (l: Beleg[]) => l.reduce((s, b) => s + (b.betrag_ct ?? 0), 0)
