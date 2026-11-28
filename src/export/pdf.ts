// PDF-Exporte (M7): Checkliste (E5/M6-Vollständigkeit), Fragenliste (E14) und Belegmappe (E5).
// pdf-lib mit Standardschrift Helvetica (WinAnsi). Nicht darstellbare Zeichen werden ersetzt.
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import { formatDatum, formatEuro } from '../fachlich/format'
import {
  fragen, gesamt, HINWEIS, katName, modulName, objekte, offenePunkte, paragraph35a, personenIds, personName, summeModul, summenJeKategorie,
  mappenReihenfolge, type ExportDaten,
} from './auswertung'
export { mappenReihenfolge }
import type { Beleg } from '../fachlich/beleg'
import { dokumenteFuerJahr, zuordnungName } from '../fachlich/dokumente'
import { afaImJahr, rechneAfa } from '../fachlich/afa'
import { anzeigeWert, bereiche, gesamtFortschritt, klaeren, kontextAus, sichtbar, unterlagen } from '../fachlich/assistent'

const A4: [number, number] = [595.28, 841.89]
const RAND = 50

const ERSATZ: Record<string, string> = { '≠': '<>', '≤': '<=', '≥': '>=', '✓': 'OK', '❓': '?', '→': '->', '×': 'x', ' ': ' ' }

/** Ersetzt Zeichen, die Helvetica (WinAnsi) nicht kennt. */
export function saeubere(text: string, font: PDFFont): string {
  const ok = new Set(font.getCharacterSet())
  let s = ''
  for (const c of text.replace(/\r?\n/g, ' ')) {
    if (ok.has(c.codePointAt(0)!)) s += c
    else if (ERSATZ[c] !== undefined) s += ERSATZ[c]
    else s += '?'
  }
  return s
}

/** Einfacher Textsatz mit Zeilenumbruch, Seitenumbruch und Tabellen. */
class Satz {
  doc: PDFDocument
  font!: PDFFont
  fett!: PDFFont
  seite!: PDFPage
  y = 0
  seiten = 0
  kopf: string
  constructor(doc: PDFDocument, kopf: string) { this.doc = doc; this.kopf = kopf }
  async init() {
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.fett = await this.doc.embedFont(StandardFonts.HelveticaBold)
    this.neueSeite()
    return this
  }
  neueSeite() {
    this.seite = this.doc.addPage(A4)
    this.seiten++
    this.seite.drawText(saeubere(this.kopf, this.font), { x: RAND, y: A4[1] - 30, size: 8, font: this.font, color: rgb(0.4, 0.4, 0.4) })
    this.seite.drawText(saeubere(`${HINWEIS}   Seite ${this.seiten}`, this.font), { x: RAND, y: 25, size: 7, font: this.font, color: rgb(0.4, 0.4, 0.4) })
    this.y = A4[1] - 55
  }
  platz(h: number) { if (this.y - h < 45) this.neueSeite() }
  umbruch(text: string, breite: number, size: number, font = this.font): string[] {
    const woerter = saeubere(text, font).split(' ')
    const zeilen: string[] = []
    let z = ''
    for (const w of woerter) {
      const t = z ? `${z} ${w}` : w
      if (font.widthOfTextAtSize(t, size) <= breite || !z) z = t
      else { zeilen.push(z); z = w }
    }
    if (z) zeilen.push(z)
    // überlange Einzelwörter hart kürzen
    return zeilen.map((x) => { let y = x; while (y.length > 1 && font.widthOfTextAtSize(y, size) > breite) y = y.slice(0, -1); return y })
  }
  text(t: string, o: { size?: number; fett?: boolean; einzug?: number; farbe?: [number, number, number]; abstand?: number } = {}) {
    const size = o.size ?? 10, font = o.fett ? this.fett : this.font, x = RAND + (o.einzug ?? 0)
    for (const z of this.umbruch(t, A4[0] - RAND - x, size, font)) {
      this.platz(size + 3)
      this.seite.drawText(z, { x, y: this.y - size, size, font, color: rgb(...(o.farbe ?? [0, 0, 0])) })
      this.y -= size + 3
    }
    this.y -= o.abstand ?? 2
  }
  ueberschrift(t: string) { this.platz(40); this.y -= 6; this.text(t, { size: 13, fett: true, abstand: 4 }) }
  /** Tabelle: Spaltenbreiten in Punkt, rechts = rechtsbündige Spalten. */
  tabelle(kopf: string[], zeilen: string[][], breiten: number[], rechts: number[] = [], fettZeilen: number[] = []) {
    const size = 8.5
    const zeile = (werte: string[], fett: boolean) => {
      const font = fett ? this.fett : this.font
      const teile = werte.map((w, i) => this.umbruch(w, breiten[i] - 4, size, font))
      const h = Math.max(...teile.map((x) => x.length)) * (size + 2) + 3
      this.platz(h)
      let x = RAND
      teile.forEach((l, i) => {
        l.forEach((z, j) => {
          const w = font.widthOfTextAtSize(z, size)
          this.seite.drawText(z, { x: rechts.includes(i) ? x + breiten[i] - 4 - w : x, y: this.y - size - j * (size + 2), size, font })
        })
        x += breiten[i]
      })
      this.y -= h
      this.seite.drawLine({ start: { x: RAND, y: this.y + 1 }, end: { x: RAND + breiten.reduce((a, b) => a + b, 0), y: this.y + 1 }, thickness: 0.3, color: rgb(0.7, 0.7, 0.7) })
    }
    zeile(kopf, true)
    zeilen.forEach((z, i) => zeile(z, fettZeilen.includes(i)))
    this.y -= 6
  }
}

const neuesDoc = async (titel: string) => {
  const doc = await PDFDocument.create()
  doc.setTitle(titel); doc.setProducer('Steuerbeleg'); doc.setCreator('Steuerbeleg')
  return doc
}
/** Erstellzeit in Ortszeit (d.erstellt ist ISO/UTC). */
const erstelltAm = (d: ExportDaten) => new Date(d.erstellt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')
const alsBlob = async (doc: PDFDocument) => new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' })

// ------------------------------------------------------------------ Checkliste

/** Übersicht und Checkliste für das Steuerjahr (Summen, offene Punkte, Fragen). */
export async function checklistePdf(d: ExportDaten): Promise<Blob> {
  const doc = await neuesDoc(`Checkliste Steuer ${d.jahr}`)
  const s = await new Satz(doc, `Steuerbeleg · Checkliste ${d.jahr} · erstellt ${erstelltAm(d)}`).init()
  const k = d.konfig
  s.text(`Checkliste Steuerjahr ${d.jahr}`, { size: 18, fett: true, abstand: 4 })
  s.text(`${d.belege.length} Belege, Summe ${formatEuro(gesamt(d.belege))}. Personen: ${k.personen.map((p) => p.name).join(', ')}.`)
  s.text(HINWEIS, { size: 9, farbe: [0.6, 0, 0], abstand: 8 })

  // offene Punkte zuerst
  const o = offenePunkte(d)
  s.ueberschrift('Offene Punkte')
  if (!o.voll.length && !o.ohneBeleg.length && !o.unvollstaendig.length) s.text('Keine offenen Punkte.')
  for (const v of o.voll) {
    const fehlend = v.perioden.filter((p) => p.status === 'fehlt' || p.status === 'faellig').map((p) => p.name)
    s.text(`[ ] ${v.vorlage.bezeichnung}: ${v.fehlt} fehlen, ${v.faellig} fällig (${fehlend.join(', ')})`)
  }
  for (const b of o.ohneBeleg) s.text(`[ ] Zahlung ohne Beleg: ${formatDatum(b.datum)} · ${formatEuro(b.betrag_ct)} · ${b.gegenseite}`)
  for (const b of o.unvollstaendig) s.text(`[ ] Beleg Nr. ${b.belegnr} unvollständig: ${b.aussteller} · ${formatEuro(b.betrag_ct ?? 0)}`)

  // Summen je Modul/Kategorie
  s.ueberschrift('Summen je Bereich und Kategorie')
  const pers = personenIds(k)
  const l = summenJeKategorie(d)
  const zeilen: string[][] = []
  const fett: number[] = []
  for (const m of k.module) {
    const teil = l.filter((x) => x.modul === m.id)
    if (!teil.length) continue
    const sm = summeModul(l, m.id)
    fett.push(zeilen.length)
    zeilen.push([m.name, String(sm.anzahl), formatEuro(sm.summe_ct), ...pers.map((p) => formatEuro(teil.reduce((a, x) => a + (x.je_person[p] ?? 0), 0)))])
    for (const x of teil) zeilen.push([`   ${katName(k, x.modul, x.kategorie)}`, String(x.anzahl), formatEuro(x.summe_ct), ...pers.map((p) => formatEuro(x.je_person[p] ?? 0))])
  }
  for (const x of l.filter((y) => !k.module.some((m) => m.id === y.modul))) zeilen.push([`${modulName(k, x.modul)} / ${katName(k, x.modul, x.kategorie)}`, String(x.anzahl), formatEuro(x.summe_ct), ...pers.map((p) => formatEuro(x.je_person[p] ?? 0))])
  const pb = (495 - 160 - 36 - 68) / pers.length
  s.tabelle(['Bereich / Kategorie', 'Anz.', 'Summe', ...pers.map((p) => personName(k, p))], zeilen, [160, 36, 68, ...pers.map(() => pb)], [1, 2, ...pers.map((_, i) => 3 + i)], fett)

  // Anlage V
  const ov = objekte(d)
  if (ov.length) {
    s.ueberschrift('Anlage V je Objekt (ohne AfA)')
    s.tabelle(['Objekt', 'Einnahmen', 'Werbungskosten', 'Saldo'],
      ov.map((x) => [x.objekt.bezeichnung, formatEuro(x.einnahmen_ct), formatEuro(x.werbungskosten_ct), formatEuro(x.saldo_ct)]), [195, 100, 100, 100], [1, 2, 3])
  }

  // § 35a
  const p = paragraph35a(d)
  if (p.kategorien.length) {
    s.ueberschrift('§ 35a EStG (nur Summen, Ermäßigung nicht berechnet)')
    s.tabelle(['Kategorie', 'Anz.', 'Betrag', 'Arbeitskosten', 'Material'],
      p.kategorien.map((x) => [katName(k, '35A', x.kategorie), String(x.anzahl), formatEuro(x.summe_ct), formatEuro(x.arbeit_ct), formatEuro(x.material_ct)]), [175, 40, 95, 95, 90], [1, 2, 3, 4])
    if (p.bar) s.text(`Achtung: ${p.bar} Beleg(e) bar bezahlt. Barzahlungen sind bei § 35a in der Regel nicht begünstigt (prüfen).`, { farbe: [0.6, 0, 0] })
  }

  // Fragen
  const fr = fragen(d)
  if (fr.length) {
    s.ueberschrift(`Fragen an die Steuerberatung (${fr.length})`)
    for (const b of fr) s.text(`Nr. ${b.belegnr} · ${formatDatum(b.belegdatum)} · ${b.aussteller} · ${formatEuro(b.betrag_ct ?? 0)}: ${b.frage}`)
  }
  return alsBlob(doc)
}

// ------------------------------------------------------------------ Fragenliste

export async function fragenPdf(d: ExportDaten): Promise<Blob> {
  const doc = await neuesDoc(`Fragen Steuer ${d.jahr}`)
  const s = await new Satz(doc, `Steuerbeleg · Fragen ${d.jahr} · erstellt ${erstelltAm(d)}`).init()
  s.text(`Fragen zur Steuererklärung ${d.jahr}`, { size: 18, fett: true, abstand: 8 })
  const fr = fragen(d)
  if (!fr.length) s.text('Keine Fragen erfasst.')
  s.tabelle(['Nr.', 'Datum', 'Aussteller', 'Bereich / Kategorie', 'Betrag', 'Frage'],
    fr.map((b) => [String(b.belegnr), formatDatum(b.belegdatum), b.aussteller, `${modulName(d.konfig, b.modul)} / ${katName(d.konfig, b.modul, b.kategorie)}`, formatEuro(b.betrag_ct ?? 0), b.frage]),
    [30, 55, 85, 100, 60, 165], [0, 4])
  s.text('Antworten bitte direkt hier notieren oder per Mail zurück.', { size: 9, farbe: [0.4, 0.4, 0.4] })
  return alsBlob(doc)
}

// ------------------------------------------------------------------ Ausfüllhilfe (Assistent)

/** Antworten aus dem Assistenten, Unterlagenliste und Klärungspunkte für die Steuerberatung. */
export async function erklaerungPdf(d: ExportDaten): Promise<Blob> {
  const doc = await neuesDoc(`Ausfüllhilfe Steuer ${d.jahr}`)
  const s = await new Satz(doc, `Steuerbeleg · Ausfüllhilfe ${d.jahr} · erstellt ${erstelltAm(d)}`).init()
  const a = d.stamm.antworten
  const liste = bereiche(d.jahr, a, kontextAus(d.jahr, d.stamm.objekte, d.stamm.einnahmen, d.belege)).filter((b) => !b.folgt)
  const g = gesamtFortschritt(liste, a)
  s.text(`Ausfüllhilfe Steuererklärung ${d.jahr}`, { size: 18, fett: true, abstand: 4 })
  s.text(`Vorbereitung für die Steuerberatung. ${g.fertig} von ${g.gesamt} Fragen beantwortet${g.unklar ? `, ${g.unklar} „weiß nicht“` : ''}. Summen und Belege: siehe Checkliste und Belegmappe.`)
  s.text(`${HINWEIS} Formulare/Zeilen sind nur Hinweise (prüfen). Es wird keine Steuer berechnet.`, { size: 9, farbe: [0.6, 0, 0], abstand: 8 })

  const kl = klaeren(liste, a)
  s.ueberschrift(`Mit der Steuerberatung klären (${kl.length})`)
  if (!kl.length) s.text('Keine Punkte.')
  for (const k of kl) s.text(`[ ] ${k.bereich}: ${k.text}`)

  const un = unterlagen(liste, a)
  s.ueberschrift(`Unterlagen für die Steuerberatung (${un.length})`)
  if (!un.length) s.text('Keine Unterlagen aus den Antworten.')
  for (const u of un) s.text(`[ ] ${u.name} (${u.bereich})`)

  if (d.dokumente) {
    const dok = dokumenteFuerJahr(d.dokumente, d.jahr)
    s.ueberschrift(`Verträge und Dokumente ${d.jahr} (${dok.length}, liegen in Drive unter Steuer/Dokumente)`)
    if (!dok.length) s.text('Keine Dokumente mit Gültigkeit im Jahr abgelegt.')
    else s.tabelle(['Gehört zu', 'Dokument', 'Gültig', 'Hinweis'],
      dok.map((x) => [zuordnungName(x.zuordnung, d.stamm.objekte, d.konfig.personen), `${x.art}: ${x.titel}`,
        `${x.gueltig_von ? formatDatum(x.gueltig_von) : '…'} – ${x.gueltig_bis ? formatDatum(x.gueltig_bis) : 'unbefristet'}`,
        [x.neu ? `NEU ${d.jahr}` : '', x.endet ? `endet ${d.jahr}` : '', x.notiz].filter(Boolean).join(' · ')]),
      [120, 170, 110, 95])
  }

  const afa = (d.stamm.afa ?? []).map((e) => ({ o: d.stamm.objekte.find((x) => x.id === e.objekt_id), r: rechneAfa(e) })).filter((x) => x.o)
  if (afa.length) {
    s.ueberschrift(`AfA-Hilfsrechnung ${d.jahr} (Vorschlag, bitte prüfen)`)
    s.tabelle(['Objekt', 'Bemessungsgrundlage', 'Satz', `AfA ${d.jahr}`],
      afa.map(({ o, r }) => r.fehlt.length
        ? [o!.bezeichnung, `fehlt: ${r.fehlt.join(', ')}`, '', '']
        : [o!.bezeichnung, formatEuro(r.bemessung_ct), `${String(r.satz?.prozent ?? 0).replace('.', ',')} %`, formatEuro(afaImJahr(r, d.jahr))]),
      [150, 150, 60, 135])
    for (const { o, r } of afa) for (const h of r.hinweise) s.text(`${o!.bezeichnung}: ${h}`, { size: 9 })
    s.text('Rechenweg und Annahmen: Objektseite in der App bzw. Excel „AfA_<Objekt>.xlsx“. Satz nach § 7 Abs. 4 EStG, Grundstücksanteil und Rechtsstand prüfen.', { size: 9 })
  }

  for (const b of liste) {
    const fr = b.fragen.filter((f) => sichtbar(f, a))
    if (!fr.length) continue
    s.ueberschrift(b.name)
    s.tabelle(['Frage', 'Antwort', 'Notiz / Info', 'Formular (prüfen)'],
      fr.map((f) => {
        const x = a[f.id]
        return [f.frage, x?.wert ? anzeigeWert(f, x.wert) : 'offen', [x?.notiz, f.info].filter(Boolean).join(' · '), f.formular]
      }), [200, 75, 130, 90])
  }
  return alsBlob(doc)
}

// ------------------------------------------------------------------ Belegmappe

export interface MappeEintrag { beleg: Beleg; seite: number | null; hinweis: string }

/** Lädt Belegdateien (PDF/JPEG/PNG) per Datei-Id. */
export type DateiLader = (id: string) => Promise<{ daten: ArrayBuffer; mimeType: string }>

/**
 * Belegmappe: Deckblatt, Inhaltsverzeichnis, dann alle Belegdateien mit Stempel (Nr., Bereich, Betrag).
 * Dauerbelege (eine Datei für mehrere Belege) werden nur einmal eingefügt, das Verzeichnis verweist darauf.
 */
export async function belegmappePdf(d: ExportDaten, lade: DateiLader, fortschritt?: (fertig: number, gesamt: number) => void): Promise<{ pdf: Blob; eintraege: MappeEintrag[] }> {
  const doc = await neuesDoc(`Belegmappe ${d.jahr}`)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  const liste = mappenReihenfolge(d)
  const eintraege: MappeEintrag[] = []
  const schonDrin = new Map<string, number>() // Datei-Id → erste Seite (1-basiert, vor Deckblatt/TOC)
  const inhalt = await PDFDocument.create()
  let n = 0
  for (const b of liste) {
    const ids = b.datei_ids.split(',').map((x) => x.trim()).filter(Boolean)
    if (!ids.length) { eintraege.push({ beleg: b, seite: null, hinweis: 'keine Datei' }); fortschritt?.(++n, liste.length); continue }
    let erste: number | null = null
    let hinweis = ''
    for (const id of ids) {
      const bekannt = schonDrin.get(id)
      if (bekannt !== undefined) { erste ??= bekannt; hinweis = 'Dauerbeleg, siehe Seite'; continue }
      try {
        const f = await lade(id)
        const start = inhalt.getPageCount() + 1
        if (f.mimeType === 'application/pdf') {
          const q = await PDFDocument.load(f.daten, { ignoreEncryption: true })
          ;(await inhalt.copyPages(q, q.getPageIndices())).forEach((p) => inhalt.addPage(p))
        } else if (f.mimeType === 'image/jpeg' || f.mimeType === 'image/png') {
          const bild = f.mimeType === 'image/png' ? await inhalt.embedPng(f.daten) : await inhalt.embedJpg(f.daten)
          const sk = Math.min((A4[0] - 40) / bild.width, (A4[1] - 80) / bild.height, 1)
          const seite = inhalt.addPage(A4)
          seite.drawImage(bild, { x: (A4[0] - bild.width * sk) / 2, y: A4[1] - 60 - bild.height * sk, width: bild.width * sk, height: bild.height * sk })
        } else { hinweis = `Dateityp ${f.mimeType} nicht eingefügt`; continue }
        if (inhalt.getPageCount() >= start) { schonDrin.set(id, start); erste ??= start }
      } catch (e) { hinweis = `Datei nicht ladbar: ${e instanceof Error ? e.message : String(e)}` }
    }
    eintraege.push({ beleg: b, seite: erste, hinweis })
    fortschritt?.(++n, liste.length)
  }

  // Deckblatt + Verzeichnis in eigenem Satz, danach Inhaltsseiten anhängen
  const s = await new Satz(doc, `Steuerbeleg · Belegmappe ${d.jahr} · erstellt ${erstelltAm(d)}`).init()
  s.y -= 120
  s.text(`Belegmappe ${d.jahr}`, { size: 26, fett: true, abstand: 10 })
  s.text(d.konfig.personen.map((p) => p.name).join(' und '), { size: 14, abstand: 6 })
  s.text(`${liste.length} Belege, Summe ${formatEuro(gesamt(liste))}`, { size: 12, abstand: 4 })
  s.text(`erstellt am ${erstelltAm(d)}`, { size: 10, abstand: 20 })
  s.text(HINWEIS, { size: 9, farbe: [0.6, 0, 0] })
  s.neueSeite()
  s.text('Inhaltsverzeichnis', { size: 16, fett: true, abstand: 6 })
  // Platzbedarf des Verzeichnisses vorab schätzen, damit die Seitenzahlen stimmen (Probesatz)
  const probe = await new Satz(await PDFDocument.create(), '').init()
  probe.y = s.y
  const tocZeilen = (versatz: number) => eintraege.map((e) => [
    String(e.beleg.belegnr), formatDatum(e.beleg.zahlungsdatum || e.beleg.belegdatum), e.beleg.aussteller,
    `${modulName(d.konfig, e.beleg.modul)} / ${katName(d.konfig, e.beleg.modul, e.beleg.kategorie)}`,
    formatEuro(e.beleg.betrag_ct ?? 0), e.seite === null ? (e.hinweis || '–') : `${e.hinweis ? e.hinweis + ' ' : ''}${e.seite + versatz}`,
  ])
  const breiten = [32, 55, 110, 140, 63, 95]
  const kopf = ['Nr.', 'Datum', 'Aussteller', 'Bereich / Kategorie', 'Betrag', 'Seite']
  probe.tabelle(kopf, tocZeilen(999), breiten, [0, 4])
  const versatz = s.seiten + probe.seiten - 1
  s.tabelle(kopf, tocZeilen(versatz), breiten, [0, 4])
  while (s.seiten < versatz) s.neueSeite() // falls der Probesatz eine Seite mehr brauchte

  const kopien = await doc.copyPages(inhalt, inhalt.getPageIndices())
  kopien.forEach((p) => doc.addPage(p))
  // Stempel auf jede Belegseite
  const seiten = doc.getPages()
  const stempel = new Map<number, string[]>()
  for (const e of eintraege) {
    if (e.seite === null) continue
    const t = `Nr. ${e.beleg.belegnr} · ${modulName(d.konfig, e.beleg.modul)} / ${katName(d.konfig, e.beleg.modul, e.beleg.kategorie)} · ${formatEuro(e.beleg.betrag_ct ?? 0)}`
    stempel.set(e.seite, [...(stempel.get(e.seite) ?? []), t])
  }
  let aktuell: string[] = []
  for (let i = 1; i <= inhalt.getPageCount(); i++) {
    aktuell = stempel.get(i) ?? aktuell
    const p = seiten[versatz + i - 1]
    const { width, height } = p.getSize()
    const rot = p.getRotation().angle % 360
    const text = saeubere(aktuell.join(' | '), fett)
    const size = 8
    const w = Math.min(fett.widthOfTextAtSize(text, size) + 8, (rot === 90 || rot === 270 ? height : width) - 20)
    if (rot === 0) {
      p.drawRectangle({ x: 10, y: height - 22, width: w, height: 14, color: rgb(1, 1, 0.75), borderColor: rgb(0.6, 0.5, 0), borderWidth: 0.5, opacity: 0.9 })
      p.drawText(text, { x: 14, y: height - 18, size, font: fett, color: rgb(0.3, 0.2, 0), maxWidth: w - 8 })
    } else {
      // gedrehte Seiten: Stempel unten links, mitgedreht
      p.drawText(text, { x: 14, y: 14, size, font: fett, color: rgb(0.5, 0.3, 0), rotate: degrees(rot) })
    }
    p.drawText(saeubere(`Mappe S. ${versatz + i}`, font), { x: width - 70, y: 8, size: 7, font, color: rgb(0.4, 0.4, 0.4) })
  }
  return { pdf: await alsBlob(doc), eintraege }
}
