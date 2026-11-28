// Auswertung für die Exporte (M7). Reine Rechenlogik in Cent – dient der Checkliste (PDF)
// und als unabhängige Gegenrechnung zu den Excel-Formeln (Tests).
import type { Beleg } from '../fachlich/beleg'
import type { Dokument } from '../fachlich/dokumente'
import type { SteuerjahrKonfig } from '../fachlich/konfiguration'
import { anteilFuerObjekt, objektSumme, umlage } from '../fachlich/objekte'
import type { Stamm } from '../daten/stamm'
import { vollstaendigkeit, type Vollstaendigkeit } from '../fachlich/vorlagen'

export interface ExportDaten {
  jahr: number
  konfig: SteuerjahrKonfig
  belege: Beleg[]
  stamm: Stamm
  /** Belegindex des Vorjahres (E11), null = nicht vorhanden */
  vorjahr: Beleg[] | null
  /** ISO-Zeitpunkt der Erstellung */
  erstellt: string
  /** Dokumentenablage (Verträge), falls geladen */
  dokumente?: Dokument[]
}

export interface KatSumme { modul: string; kategorie: string; anzahl: number; summe_ct: number; je_person: Record<string, number> }

export const HINWEIS = 'Die App ersetzt keine Steuerberatung. Summen ohne Gewähr, bitte prüfen.'

export const PERSONEN_GEMEINSAM = 'gemeinsam'
export const personenIds = (k: SteuerjahrKonfig) => [...k.personen.map((p) => p.id), PERSONEN_GEMEINSAM]

const schluessel = (m: string, k: string) => `${m}|${k}`

/** Summen je Modul und Kategorie (in Konfigurationsreihenfolge, nur mit Belegen). */
export function summenJeKategorie(d: Pick<ExportDaten, 'konfig' | 'belege'>): KatSumme[] {
  const map = new Map<string, KatSumme>()
  for (const b of d.belege) {
    const s = schluessel(b.modul, b.kategorie)
    const x = map.get(s) ?? { modul: b.modul, kategorie: b.kategorie, anzahl: 0, summe_ct: 0, je_person: {} }
    x.anzahl++
    x.summe_ct += b.betrag_ct ?? 0
    x.je_person[b.person] = (x.je_person[b.person] ?? 0) + (b.betrag_ct ?? 0)
    map.set(s, x)
  }
  const reihenfolge = d.konfig.module.flatMap((m) => [schluessel(m.id, ''), ...m.kategorien.map((k) => schluessel(m.id, k.schluessel))])
  const rang = (s: string) => { const i = reihenfolge.indexOf(s); return i < 0 ? 1e6 : i }
  return [...map.entries()].sort((a, b) => rang(a[0]) - rang(b[0]) || a[0].localeCompare(b[0])).map(([, v]) => v)
}

export function summeModul(l: KatSumme[], modul: string) {
  return l.filter((x) => x.modul === modul).reduce((s, x) => ({ anzahl: s.anzahl + x.anzahl, summe_ct: s.summe_ct + x.summe_ct }), { anzahl: 0, summe_ct: 0 })
}

export const gesamt = (belege: Beleg[]) => belege.reduce((s, b) => s + (b.betrag_ct ?? 0), 0)

/** Anlage V je Objekt (wie Seite „Objekte“). */
export function objekte(d: ExportDaten) {
  return d.stamm.objekte.map((o) => ({ objekt: o, ...objektSumme(o.id, d.belege, d.stamm.aufteilung, d.stamm.einnahmen, d.konfig) }))
}

/** Anlage V: Kosten je Objekt und Kategorie (inkl. Aufteilungsanteile). */
export function objektKategorien(d: ExportDaten, objektId: string): { kategorie: string; summe_ct: number }[] {
  const v = d.konfig.module.find((m) => m.ebene === 'objekt')
  const m = new Map<string, number>()
  for (const b of d.belege) {
    if (b.modul !== v?.id) continue
    const a = anteilFuerObjekt(b, objektId, d.stamm.aufteilung)
    if (a) m.set(b.kategorie, (m.get(b.kategorie) ?? 0) + a)
  }
  return [...m.entries()].map(([kategorie, summe_ct]) => ({ kategorie, summe_ct }))
}

/** § 35a je Kategorie: Betrag, Arbeitskosten, Material; Anzahl Barzahlungen. */
export function paragraph35a(d: Pick<ExportDaten, 'belege'>) {
  const l = d.belege.filter((b) => b.modul === '35A')
  const kat = new Map<string, { anzahl: number; summe_ct: number; arbeit_ct: number; material_ct: number }>()
  for (const b of l) {
    const x = kat.get(b.kategorie) ?? { anzahl: 0, summe_ct: 0, arbeit_ct: 0, material_ct: 0 }
    x.anzahl++; x.summe_ct += b.betrag_ct ?? 0; x.arbeit_ct += b.arbeitskosten_ct ?? 0; x.material_ct += b.material_ct ?? 0
    kat.set(b.kategorie, x)
  }
  return { kategorien: [...kat.entries()].map(([kategorie, v]) => ({ kategorie, ...v })), bar: l.filter((b) => b.zahlungsart === 'bar').length }
}

/** NK-Vorlage je Objekt (E9). */
export function nebenkosten(d: ExportDaten) {
  return d.stamm.objekte.map((o) => {
    const einheiten = d.stamm.einheiten.filter((e) => e.objekt_id === o.id)
    return { objekt: o, einheiten, ...umlage(o.id, einheiten, o.umlageschluessel, d.belege, d.stamm.aufteilung) }
  }).filter((x) => x.zeilen.length)
}

/** Jahresvergleich (E11): Summen je Modul/Kategorie Vorjahr gegen aktuelles Jahr. */
export function jahresvergleich(d: ExportDaten) {
  if (!d.vorjahr) return null
  const jetzt = summenJeKategorie(d)
  const vor = summenJeKategorie({ konfig: d.konfig, belege: d.vorjahr })
  const alle = new Map<string, { modul: string; kategorie: string; vorjahr_ct: number; aktuell_ct: number }>()
  for (const x of vor) alle.set(schluessel(x.modul, x.kategorie), { modul: x.modul, kategorie: x.kategorie, vorjahr_ct: x.summe_ct, aktuell_ct: 0 })
  for (const x of jetzt) {
    const s = schluessel(x.modul, x.kategorie)
    alle.set(s, { ...(alle.get(s) ?? { modul: x.modul, kategorie: x.kategorie, vorjahr_ct: 0 }), aktuell_ct: x.summe_ct })
  }
  return [...alle.values()]
}

/** Reihenfolge der Mappe: nach Bereich (Konfiguration), Kategorie, Belegnummer. */
export function mappenReihenfolge(d: Pick<ExportDaten, 'konfig' | 'belege'>): Beleg[] {
  const rang = (b: Beleg) => { const i = d.konfig.module.findIndex((m) => m.id === b.modul); return i < 0 ? 999 : i }
  return [...d.belege].sort((a, b) => rang(a) - rang(b) || a.kategorie.localeCompare(b.kategorie) || a.belegnr - b.belegnr)
}

export function fragen(d: Pick<ExportDaten, 'belege'>) {
  return [...d.belege].filter((b) => b.frage.trim()).sort((a, b) => a.belegnr - b.belegnr)
}

export function offenePunkte(d: ExportDaten): { voll: Vollstaendigkeit[]; ohneBeleg: Stamm['buchungen']; unvollstaendig: Beleg[] } {
  const heute = d.erstellt.slice(0, 10)
  return {
    voll: vollstaendigkeit(d.stamm.vorlagen, d.jahr, d.belege, heute).filter((v) => v.fehlt > 0 || v.faellig > 0),
    ohneBeleg: d.stamm.buchungen.filter((b) => b.markierung === 'beleg_fehlt'),
    unvollstaendig: d.belege.filter((b) => b.status === 'unvollständig'),
  }
}

export const modulName = (k: SteuerjahrKonfig, id: string) => k.module.find((m) => m.id === id)?.name ?? (id || '(ohne Modul)')
export const katName = (k: SteuerjahrKonfig, m: string, kat: string) =>
  k.module.find((x) => x.id === m)?.kategorien.find((y) => y.schluessel === kat)?.name ?? (kat || '(ohne Kategorie)')
export const katArt = (k: SteuerjahrKonfig, m: string, kat: string) =>
  k.module.find((x) => x.id === m)?.kategorien.find((y) => y.schluessel === kat)?.art ?? ''
export const personName = (k: SteuerjahrKonfig, id: string) => k.personen.find((p) => p.id === id)?.name ?? (id === PERSONEN_GEMEINSAM ? 'gemeinsam' : id)
export const driveLink = (b: Pick<Beleg, 'datei_ids'>) => (b.datei_ids ? `https://drive.google.com/file/d/${b.datei_ids.split(',')[0]}/view` : '')
