// Excel-Auswertung (M7) mit ExcelJS. Grundsatz: Eingangsdaten stehen als Werte in den Datenblättern
// (Belege, Aufteilung, Objekte, Einheiten, Einnahmen, Fahrten), alle Summen sind Formeln (SUMIFS = SUMMEWENNS).
// Excel speichert Formeln englisch, ein deutsches Excel zeigt sie als SUMMEWENNS usw. an.
import type ExcelJSNs from 'exceljs'
import type { Beleg } from '../fachlich/beleg'
import {
  driveLink, jahresvergleich, katArt, katName, modulName, personenIds, personName, summenJeKategorie, type ExportDaten,
} from './auswertung'
import { FAHRTZWECKE } from '../fachlich/personen'
import { SCHLUESSEL_NAMEN } from '../fachlich/objekte'

type ExcelJS = typeof ExcelJSNs
type WS = ExcelJSNs.Worksheet

const EURO = '#,##0.00 "€";[Red]-#,##0.00 "€"'
const DATUM = 'dd.mm.yyyy'
const PROZENT = '0.0 %'
const euro = (ct: number | null) => (ct === null ? null : ct / 100)
const datum = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))) : null)
const f = (formula: string) => ({ formula })
const str = (s: string) => `"${s.replace(/"/g, '""')}"`
export const OHNE = 'ohne'

/** Spalten des Blatts „Belege“ (Buchstaben werden in Formeln verwendet). */
export const B = {
  nr: 'A', belegdatum: 'B', zahlungsdatum: 'C', betrag: 'D', aussteller: 'E', person: 'F', modul: 'G', modulName: 'H',
  kat: 'I', katName: 'J', art: 'K', objekt: 'L', objektName: 'M', einheit: 'N', umlage: 'O', aufgeteilt: 'P', kind: 'Q',
  zahlungsart: 'R', arbeit: 'S', material: 'T', status: 'U', frage: 'V', notiz: 'W', link: 'X', anteile: 'Y', pruef35a: 'Z',
} as const
const col = (s: string, c: string) => `${s}!$${c}:$${c}`
const BL = (c: string) => col('Belege', c)
const AU = (c: string) => col('Aufteilung', c)

function kopf(ws: WS, zeile: number, werte: string[], breiten?: number[]) {
  const r = ws.getRow(zeile)
  werte.forEach((w, i) => { r.getCell(i + 1).value = w })
  r.font = { bold: true }
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F0' } }
  if (breiten) breiten.forEach((b, i) => { ws.getColumn(i + 1).width = b })
}
function titel(ws: WS, text: string, hinweis?: string) {
  ws.getCell('A1').value = text
  ws.getCell('A1').font = { bold: true, size: 14 }
  if (hinweis) { ws.getCell('A2').value = hinweis; ws.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } } }
}

export interface ExcelErgebnis { buffer: ArrayBuffer; blaetter: string[] }

export async function erstelleExcel(d: ExportDaten, ExcelJSMod: ExcelJS): Promise<ExcelErgebnis> {
  const { konfig: k } = d
  const wb = new ExcelJSMod.Workbook()
  wb.creator = 'Steuerbeleg'
  wb.created = new Date(d.erstellt)
  wb.calcProperties.fullCalcOnLoad = true
  const vModul = k.module.find((m) => m.ebene === 'objekt')?.id ?? 'V'
  const belege = [...d.belege].sort((a, b) => a.belegnr - b.belegnr)
  const aufgeteilt = new Set(d.stamm.aufteilung.map((a) => a.beleg_id))
  const zeileVon = new Map<string, number>()

  // Reihenfolge der Blätter: Auswertungen vorn, Daten hinten
  const uebersicht = wb.addWorksheet('Übersicht')
  const anlageV = wb.addWorksheet('Anlage V')
  const p35a = wb.addWorksheet('35a')
  const nk = wb.addWorksheet('NK-Vorlage')
  const anlageN = wb.addWorksheet('Anlage N')
  const fragenWs = wb.addWorksheet('Fragen')
  const vergleich = wb.addWorksheet('Jahresvergleich')
  const pruefung = wb.addWorksheet('Prüfung')
  const annahmen = wb.addWorksheet('Annahmen')
  const bl = wb.addWorksheet('Belege', { views: [{ state: 'frozen', ySplit: 1 }] })
  const au = wb.addWorksheet('Aufteilung', { views: [{ state: 'frozen', ySplit: 1 }] })
  const ob = wb.addWorksheet('Objekte')
  const eh = wb.addWorksheet('Einheiten')
  const en = wb.addWorksheet('Einnahmen')
  const fa = wb.addWorksheet('Fahrten')

  // ------------------------------------------------------------ Datenblätter (Eingaben)
  kopf(ob, 1, ['Objekt-ID', 'Bezeichnung', 'Adresse', 'Anschaffungsdatum', 'Anschaffungskosten €', 'AfA-Satz (nur Info, prüfen)', 'Baujahr', 'Gebäudeanteil %', 'Wohnfläche m²', 'Umlageschlüssel'], [16, 28, 30, 14, 16, 18, 8, 12, 12, 18])
  d.stamm.objekte.forEach((o, i) => {
    ob.getRow(i + 2).values = [o.id, o.bezeichnung, o.adresse, datum(o.anschaffungsdatum), euro(o.anschaffungskosten_ct), o.afa_satz, o.baujahr, o.gebaeudeanteil_prozent, o.wohnflaeche_m2, o.umlageschluessel]
  })
  ob.getColumn(4).numFmt = DATUM; ob.getColumn(5).numFmt = EURO

  kopf(eh, 1, ['Einheit-ID', 'Objekt-ID', 'Bezeichnung', 'Wohnfläche m²', 'Personen', 'fester Anteil %'], [16, 16, 24, 12, 10, 14])
  d.stamm.einheiten.forEach((e, i) => { eh.getRow(i + 2).values = [e.id, e.objekt_id, e.bezeichnung, e.wohnflaeche_m2, e.personen, e.fest_prozent] })

  kopf(en, 1, ['Objekt-ID', 'Einheit-ID', 'Monat', 'Betrag €', 'Art', 'Notiz'], [16, 16, 10, 14, 14, 30])
  d.stamm.einnahmen.forEach((e, i) => { en.getRow(i + 2).values = [e.objekt_id, e.einheit_id || OHNE, e.monat, euro(e.betrag_ct), e.art, e.notiz] })
  en.getColumn(4).numFmt = EURO

  kopf(fa, 1, ['Person', 'Datum', 'Start', 'Ziel', 'km', 'Zweck', 'Fahrzeug'], [12, 12, 18, 26, 8, 14, 16])
  d.stamm.fahrten.forEach((x, i) => { fa.getRow(i + 2).values = [x.person, datum(x.datum), x.start, x.ziel, x.km, x.zweck, x.fahrzeug] })
  fa.getColumn(2).numFmt = DATUM

  kopf(bl, 1, ['Nr.', 'Belegdatum', 'Zahlungsdatum', 'Betrag brutto €', 'Aussteller', 'Person', 'Modul-ID', 'Modul', 'Kategorie-Schlüssel', 'Kategorie', 'Art',
    'Objekt-ID', 'Objekt', 'Einheit-ID', 'umlagefähig', 'aufgeteilt', 'Kind', 'Zahlungsart', 'Arbeitskosten €', 'Material €', 'Status', 'Frage an Steuerberater',
    'Notiz', 'Beleg', 'Summe Anteile % (Formel)', 'Prüfung § 35a (Formel)'],
  [6, 11, 11, 13, 26, 10, 8, 22, 18, 24, 13, 14, 20, 12, 10, 9, 12, 10, 13, 12, 12, 30, 30, 8, 12, 12])
  belege.forEach((b: Beleg, i) => {
    const r = i + 2
    zeileVon.set(b.id, r)
    const kind = b.kind_id ? d.stamm.kinder.find((x) => x.id === b.kind_id)?.name ?? b.kind_id : ''
    const row = bl.getRow(r)
    row.values = [
      b.belegnr, datum(b.belegdatum), datum(b.zahlungsdatum), euro(b.betrag_ct), b.aussteller, b.person, b.modul, modulName(k, b.modul),
      b.kategorie, katName(k, b.modul, b.kategorie), katArt(k, b.modul, b.kategorie),
      aufgeteilt.has(b.id) ? '' : b.objekt_id, null, (!aufgeteilt.has(b.id) && b.einheit_id) || OHNE, b.umlagefaehig ? 'ja' : 'nein',
      aufgeteilt.has(b.id) ? 'ja' : 'nein', kind, b.zahlungsart, euro(b.arbeitskosten_ct), euro(b.material_ct), b.status, b.frage, b.notiz,
    ]
    row.getCell(B.objektName).value = f(`IF(${B.objekt}${r}="","",IFERROR(INDEX(Objekte!$B:$B,MATCH(${B.objekt}${r},Objekte!$A:$A,0)),"?"))`)
    const link = driveLink(b)
    if (link) row.getCell(B.link).value = { text: 'öffnen', hyperlink: link }
    row.getCell(B.anteile).value = f(`IF(${B.aufgeteilt}${r}="ja",SUMIFS(${AU('E')},${AU('A')},${B.nr}${r}),"")`)
    row.getCell(B.pruef35a).value = f(`IF(AND(${B.arbeit}${r}<>"",${B.material}${r}<>""),IF(ABS(${B.arbeit}${r}+${B.material}${r}-${B.betrag}${r})<0.005,"ok","Abweichung"),"")`)
  })
  for (const c of [B.belegdatum, B.zahlungsdatum]) bl.getColumn(c).numFmt = DATUM
  for (const c of [B.betrag, B.arbeit, B.material]) bl.getColumn(c).numFmt = EURO
  bl.autoFilter = { from: 'A1', to: `Z${Math.max(1, belege.length + 1)}` }

  kopf(au, 1, ['Beleg-Nr.', 'Objekt-ID', 'Objekt', 'Einheit-ID', 'Anteil %', 'Betrag anteilig €', 'Kategorie', 'Art', 'umlagefähig', 'Modul'], [9, 16, 24, 12, 9, 15, 18, 13, 11, 8])
  let ar = 2
  for (const b of belege) {
    for (const a of d.stamm.aufteilung.filter((x) => x.beleg_id === b.id)) {
      const row = au.getRow(ar)
      row.values = [b.belegnr, a.objekt_id, null, a.einheit_id || OHNE, a.anteil_prozent]
      const such = (c: string) => `INDEX(${BL(c)},MATCH($A${ar},${BL(B.nr)},0))`
      row.getCell('C').value = f(`IFERROR(INDEX(Objekte!$B:$B,MATCH(B${ar},Objekte!$A:$A,0)),"?")`)
      row.getCell('F').value = f(`SUMIFS(${BL(B.betrag)},${BL(B.nr)},A${ar})*E${ar}/100`)
      row.getCell('G').value = f(such(B.kat))
      row.getCell('H').value = f(such(B.art))
      row.getCell('I').value = f(such(B.umlage))
      row.getCell('J').value = f(such(B.modul))
      ar++
    }
  }
  au.getColumn('F').numFmt = EURO

  // ------------------------------------------------------------ Übersicht
  const personen = personenIds(k)
  titel(uebersicht, `Übersicht Steuerjahr ${d.jahr}`, `Summen der Bruttobeträge je Modul und Kategorie (Formeln auf Blatt „Belege“). Erstellt ${d.erstellt.slice(0, 10)}. Die App ersetzt keine Steuerberatung.`)
  personen.forEach((p, i) => { uebersicht.getCell(3, 8 + i).value = personName(k, p) })
  kopf(uebersicht, 4, ['Modul-ID', 'Modul', 'Kategorie-Schlüssel', 'Kategorie', 'ELSTER-Zeile (prüfen)', 'Anzahl', 'Summe €', ...personen], [9, 30, 20, 30, 14, 8, 14, ...personen.map(() => 13)])
  const summen = summenJeKategorie(d)
  let r = 5
  const modulZeilen: number[] = []
  const MODUL_GESAMT = '(Modul gesamt)'
  for (const m of k.module) {
    const kats = summen.filter((s) => s.modul === m.id)
    if (!kats.length) continue
    const mr = r++
    modulZeilen.push(mr)
    const row = uebersicht.getRow(mr)
    row.values = [m.id, m.name, MODUL_GESAMT]
    row.font = { bold: true }
    row.getCell(6).value = f(`COUNTIFS(${BL(B.modul)},$A${mr})`)
    row.getCell(7).value = f(`SUMIFS(${BL(B.betrag)},${BL(B.modul)},$A${mr})`)
    personen.forEach((_, i) => { row.getCell(8 + i).value = f(`SUMIFS(${BL(B.betrag)},${BL(B.modul)},$A${mr},${BL(B.person)},${colLetter(8 + i)}$4)`) })
    if (kats.length === 1 && !kats[0].kategorie) continue
    for (const s of kats) {
      const kr = r++
      const kat = m.kategorien.find((x) => x.schluessel === s.kategorie)
      const z = uebersicht.getRow(kr)
      z.values = [m.id, '', s.kategorie, kat?.name ?? s.kategorie, kat?.elster_zeile?.wert === null || kat?.elster_zeile?.wert === undefined ? '' : String(kat.elster_zeile.wert)]
      z.getCell(6).value = f(`COUNTIFS(${BL(B.modul)},$A${kr},${BL(B.kat)},$C${kr})`)
      z.getCell(7).value = f(`SUMIFS(${BL(B.betrag)},${BL(B.modul)},$A${kr},${BL(B.kat)},$C${kr})`)
      personen.forEach((_, i) => { z.getCell(8 + i).value = f(`SUMIFS(${BL(B.betrag)},${BL(B.modul)},$A${kr},${BL(B.kat)},$C${kr},${BL(B.person)},${colLetter(8 + i)}$4)`) })
    }
  }
  const gr = r + 1
  const gesamtZeile = uebersicht.getRow(gr)
  gesamtZeile.values = ['', 'Gesamt', '', '', '']
  gesamtZeile.font = { bold: true }
  const bereich = (c: string) => `${c}5:${c}${Math.max(5, r - 1)}`
  gesamtZeile.getCell(6).value = f(`SUMIFS(${bereich('F')},${bereich('C')},${str(MODUL_GESAMT)})`)
  gesamtZeile.getCell(7).value = f(`SUMIFS(${bereich('G')},${bereich('C')},${str(MODUL_GESAMT)})`)
  personen.forEach((_, i) => { const c = colLetter(8 + i); gesamtZeile.getCell(8 + i).value = f(`SUMIFS(${bereich(c)},${bereich('C')},${str(MODUL_GESAMT)})`) })
  for (let c = 7; c < 8 + personen.length; c++) uebersicht.getColumn(c).numFmt = EURO

  // ------------------------------------------------------------ Anlage V
  titel(anlageV, `Anlage V – Einnahmen und Werbungskosten je Objekt ${d.jahr}`, 'Aufgeteilte Belege anteilig (Blatt „Aufteilung“). AfA wird NICHT berechnet, Grunddaten nur zur Info (prüfen).')
  kopf(anlageV, 4, ['Objekt-ID', 'Objekt', 'Einnahmen (Blatt Einnahmen) €', 'Einnahmen aus Belegen €', 'Werbungskosten €', 'Überschuss €', 'Anschaffungskosten € (Info)', 'Gebäudeanteil % (Info)'], [16, 28, 18, 16, 16, 14, 18, 14])
  const vZeilen: number[] = []
  d.stamm.objekte.forEach((o, i) => {
    const z = 5 + i
    vZeilen.push(z)
    const row = anlageV.getRow(z)
    row.values = [o.id, o.bezeichnung]
    const ausBelegen = (art: string) =>
      `SUMIFS(${BL(B.betrag)},${BL(B.objekt)},$A${z},${BL(B.art)},${str(art)},${BL(B.modul)},${str(vModul)})+SUMIFS(${AU('F')},${AU('B')},$A${z},${AU('H')},${str(art)},${AU('J')},${str(vModul)})`
    row.getCell(3).value = f(`SUMIFS(Einnahmen!$D:$D,Einnahmen!$A:$A,$A${z})`)
    row.getCell(4).value = f(ausBelegen('einnahme'))
    row.getCell(5).value = f(ausBelegen('werbungskosten'))
    row.getCell(6).value = f(`C${z}+D${z}-E${z}`)
    row.getCell(7).value = f(`IFERROR(INDEX(Objekte!$E:$E,MATCH($A${z},Objekte!$A:$A,0)),"")`)
    row.getCell(8).value = f(`IFERROR(INDEX(Objekte!$H:$H,MATCH($A${z},Objekte!$A:$A,0)),"")`)
  })
  let vr = 6 + d.stamm.objekte.length
  anlageV.getCell(vr, 1).value = 'Werbungskosten je Objekt und Kategorie'
  anlageV.getCell(vr, 1).font = { bold: true }
  vr++
  kopf(anlageV, vr, ['Objekt-ID', 'Objekt', 'Kategorie-Schlüssel', 'Kategorie', 'Art', 'Summe €'])
  vr++
  const vm = k.module.find((m) => m.id === vModul)
  for (const o of d.stamm.objekte) {
    for (const kat of vm?.kategorien ?? []) {
      const hat = d.belege.some((b) => b.modul === vModul && b.kategorie === kat.schluessel &&
        (b.objekt_id === o.id || d.stamm.aufteilung.some((a) => a.beleg_id === b.id && a.objekt_id === o.id)))
      if (!hat) continue
      const row = anlageV.getRow(vr)
      row.values = [o.id, o.bezeichnung, kat.schluessel, kat.name, kat.art]
      row.getCell(6).value = f(`SUMIFS(${BL(B.betrag)},${BL(B.objekt)},$A${vr},${BL(B.kat)},$C${vr},${BL(B.modul)},${str(vModul)})+SUMIFS(${AU('F')},${AU('B')},$A${vr},${AU('G')},$C${vr},${AU('J')},${str(vModul)})`)
      vr++
    }
  }
  for (const c of [3, 4, 5, 6, 7]) anlageV.getColumn(c).numFmt = EURO

  // ------------------------------------------------------------ § 35a
  titel(p35a, `§ 35a EStG – Haushaltsnahe Dienstleistungen / Handwerker ${d.jahr}`, 'Nur Summen der Belege. Die Steuerermäßigung wird NICHT berechnet (Höchstbeträge und Prozentsätze prüfen).')
  kopf(p35a, 4, ['Kategorie-Schlüssel', 'Kategorie', 'Anzahl', 'Betrag brutto €', 'Arbeitskosten €', 'Material €'], [20, 34, 8, 15, 15, 13])
  const m35 = k.module.find((m) => m.id === '35A')
  let pr = 5
  for (const kat of m35?.kategorien ?? []) {
    if (!d.belege.some((b) => b.modul === '35A' && b.kategorie === kat.schluessel)) continue
    const row = p35a.getRow(pr)
    row.values = [kat.schluessel, kat.name]
    const kr = `${BL(B.modul)},"35A",${BL(B.kat)},$A${pr}`
    row.getCell(3).value = f(`COUNTIFS(${kr})`)
    row.getCell(4).value = f(`SUMIFS(${BL(B.betrag)},${kr})`)
    row.getCell(5).value = f(`SUMIFS(${BL(B.arbeit)},${kr})`)
    row.getCell(6).value = f(`SUMIFS(${BL(B.material)},${kr})`)
    pr++
  }
  const p35sum = p35a.getRow(pr)
  p35sum.values = ['', 'Summe']
  p35sum.font = { bold: true }
  for (const [i, c] of ['C', 'D', 'E', 'F'].entries()) p35sum.getCell(3 + i).value = f(pr > 5 ? `SUM(${c}5:${c}${pr - 1})` : '0')
  p35a.getCell(pr + 2, 2).value = 'Anzahl Barzahlungen (nicht begünstigt, prüfen)'
  p35a.getCell(pr + 2, 3).value = f(`COUNTIFS(${BL(B.modul)},"35A",${BL(B.zahlungsart)},"bar")`)
  for (const c of [4, 5, 6]) p35a.getColumn(c).numFmt = EURO

  // ------------------------------------------------------------ NK-Vorlage (E9)
  titel(nk, `Vorlage Nebenkosten (umlagefähige Kosten je Einheit) ${d.jahr}`, 'Keine rechtssichere Nebenkostenabrechnung. Verteilschlüssel je Objekt selbst festgelegt (prüfen).')
  let nr = 4
  for (const o of d.stamm.objekte) {
    const einheiten = d.stamm.einheiten.filter((e) => e.objekt_id === o.id)
    const kats = [...new Set(d.belege.filter((b) => b.umlagefaehig && (b.objekt_id === o.id || d.stamm.aufteilung.some((a) => a.beleg_id === b.id && a.objekt_id === o.id))).map((b) => b.kategorie))]
    if (!kats.length || !einheiten.length) continue
    nk.getCell(nr, 1).value = `${o.bezeichnung} – Schlüssel: ${SCHLUESSEL_NAMEN[o.umlageschluessel]}`
    nk.getCell(nr, 1).font = { bold: true }
    nr++
    kopf(nk, nr, ['Kategorie-Schlüssel', 'Kategorie', 'nach Schlüssel zu verteilen €', ...einheiten.map((e) => e.bezeichnung), 'Summe €'], [20, 28, 18, ...einheiten.map(() => 14), 14])
    const idRow = nr + 1, wertRow = nr + 2, anteilRow = nr + 3
    nk.getCell(idRow, 2).value = 'Einheit-ID'
    nk.getCell(wertRow, 2).value = `Schlüsselwert (${SCHLUESSEL_NAMEN[o.umlageschluessel]})`
    nk.getCell(anteilRow, 2).value = 'Anteil'
    const spalte = o.umlageschluessel === 'wohnflaeche' ? 'D' : o.umlageschluessel === 'personen' ? 'E' : 'F'
    const erste = colLetter(4), letzte = colLetter(3 + einheiten.length)
    einheiten.forEach((e, i) => {
      const c = colLetter(4 + i)
      nk.getCell(`${c}${idRow}`).value = e.id
      nk.getCell(`${c}${wertRow}`).value = o.umlageschluessel === 'einheiten' ? f('1') : f(`IFERROR(INDEX(Einheiten!$${spalte}:$${spalte},MATCH(${c}${idRow},Einheiten!$A:$A,0)),0)`)
      nk.getCell(`${c}${anteilRow}`).value = o.umlageschluessel === 'fest'
        ? f(`${c}${wertRow}/100`) : f(`IF(SUM($${erste}${wertRow}:$${letzte}${wertRow})=0,0,${c}${wertRow}/SUM($${erste}${wertRow}:$${letzte}${wertRow}))`)
      nk.getCell(`${c}${anteilRow}`).numFmt = PROZENT
    })
    nr = anteilRow + 1
    const objektId = str(o.id)
    for (const kat of kats) {
      const row = nk.getRow(nr)
      row.values = [kat, katName(k, vModul, kat)]
      // Belege ohne feste Einheit + aufgeteilte Belege werden nach Schlüssel verteilt (wie in der App)
      row.getCell(3).value = f(`SUMIFS(${BL(B.betrag)},${BL(B.objekt)},${objektId},${BL(B.kat)},$A${nr},${BL(B.umlage)},"ja",${BL(B.einheit)},"${OHNE}")+SUMIFS(${AU('F')},${AU('B')},${objektId},${AU('G')},$A${nr},${AU('I')},"ja")`)
      einheiten.forEach((_, i) => {
        const c = colLetter(4 + i)
        row.getCell(4 + i).value = f(`$C${nr}*${c}$${anteilRow}+SUMIFS(${BL(B.betrag)},${BL(B.objekt)},${objektId},${BL(B.kat)},$A${nr},${BL(B.umlage)},"ja",${BL(B.einheit)},${c}$${idRow})`)
      })
      row.getCell(4 + einheiten.length).value = f(`SUM(${erste}${nr}:${letzte}${nr})`)
      for (let c = 3; c <= 4 + einheiten.length; c++) row.getCell(c).numFmt = EURO
      nr++
    }
    nr += 2
  }
  if (nr === 4) nk.getCell('A4').value = 'Keine umlagefähigen Kosten mit Objekt und Einheiten erfasst.'

  // ------------------------------------------------------------ Anlage N
  titel(anlageN, `Anlage N – Tage und Fahrten ${d.jahr}`, 'Nur Zählgrößen. Pauschalen werden NICHT berechnet (Sätze siehe unten, prüfen).')
  kopf(anlageN, 4, ['Person', 'Name', 'Arbeitstage', 'Homeoffice-Tage', 'Entfernung km (einfach)', 'Arbeitstage × Entfernung km', ...FAHRTZWECKE.map((z) => `Fahrtenbuch ${z} km`)], [10, 14, 11, 14, 14, 16, ...FAHRTZWECKE.map(() => 16)])
  FAHRTZWECKE.forEach((z, i) => { anlageN.getCell(3, 7 + i).value = z })
  k.personen.forEach((p, i) => {
    const z = 5 + i
    const a = d.stamm.arbeitstage.find((x) => x.person === p.id)
    const row = anlageN.getRow(z)
    row.values = [p.id, p.name, a?.arbeitstage ?? 0, a?.homeoffice_tage ?? 0, a?.entfernung_km ?? null]
    row.getCell(6).value = f(`IF(E${z}="","",C${z}*E${z})`)
    FAHRTZWECKE.forEach((_, j) => { const c = colLetter(7 + j); row.getCell(7 + j).value = f(`SUMIFS(Fahrten!$E:$E,Fahrten!$A:$A,$A${z},Fahrten!$F:$F,${c}$3)`) })
  })
  let nz = 6 + k.personen.length
  anlageN.getCell(nz++, 1).value = 'Sätze aus der Konfiguration (nur Info, prüfen):'
  for (const key of ['entfernungspauschale', 'homeoffice_tagespauschale', 'homeoffice_hoechsttage', 'dienstreise_km_satz_pkw']) {
    const w = k.werte[key]
    anlageN.getRow(nz++).values = [key, w?.wert ?? 'nicht eingetragen', w?.einheit ?? '', `Status: ${w?.status ?? 'prüfen'}`]
  }

  // ------------------------------------------------------------ Fragen (E10)
  titel(fragenWs, `Fragen an den Steuerberater ${d.jahr}`, 'Verweise auf das Blatt „Belege“.')
  kopf(fragenWs, 4, ['Nr.', 'Belegdatum', 'Aussteller', 'Betrag €', 'Modul', 'Kategorie', 'Frage', 'Beleg'], [6, 11, 26, 13, 22, 24, 50, 8])
  let fr = 5
  for (const b of belege.filter((x) => x.frage.trim())) {
    const z = zeileVon.get(b.id)!
    const row = fragenWs.getRow(fr)
    ;[B.nr, B.belegdatum, B.aussteller, B.betrag, B.modulName, B.katName, B.frage].forEach((c, i) => { row.getCell(i + 1).value = f(`Belege!${c}${z}`) })
    const link = driveLink(b)
    if (link) row.getCell(8).value = { text: 'öffnen', hyperlink: link }
    row.getCell(7).alignment = { wrapText: true, vertical: 'top' }
    fr++
  }
  fragenWs.getColumn(2).numFmt = DATUM; fragenWs.getColumn(4).numFmt = EURO
  if (fr === 5) fragenWs.getCell('A5').value = 'Keine Fragen markiert.'

  // ------------------------------------------------------------ Jahresvergleich (E11)
  const jv = jahresvergleich(d)
  titel(vergleich, `Jahresvergleich ${d.jahr - 1} / ${d.jahr}`, jv ? `Vorjahr: Werte aus ${'00_Belegindex_' + (d.jahr - 1)} (Eingabe). Aktuelles Jahr: Formeln auf Blatt „Belege“.` : `Kein Belegindex ${d.jahr - 1} gefunden – Vergleich ab dem nächsten Jahr möglich.`)
  if (jv) {
    kopf(vergleich, 4, ['Modul-ID', 'Modul', 'Kategorie-Schlüssel', 'Kategorie', `${d.jahr - 1} €`, `${d.jahr} €`, 'Differenz €', 'Veränderung'], [9, 30, 20, 30, 14, 14, 14, 12])
    jv.forEach((x, i) => {
      const z = 5 + i
      const row = vergleich.getRow(z)
      row.values = [x.modul, modulName(k, x.modul), x.kategorie, katName(k, x.modul, x.kategorie), euro(x.vorjahr_ct)]
      row.getCell(6).value = f(x.kategorie ? `SUMIFS(${BL(B.betrag)},${BL(B.modul)},$A${z},${BL(B.kat)},$C${z})` : `SUMIFS(${BL(B.betrag)},${BL(B.modul)},$A${z})`)
      row.getCell(7).value = f(`F${z}-E${z}`)
      row.getCell(8).value = f(`IF(E${z}=0,"",G${z}/E${z})`)
      row.getCell(8).numFmt = PROZENT
    })
    for (const c of [5, 6, 7]) vergleich.getColumn(c).numFmt = EURO
  }

  // ------------------------------------------------------------ Annahmen
  titel(annahmen, 'Annahmen und Festlegungen', 'Bitte prüfen. Normwerte/Sätze gegen Originalquelle bzw. Steuerberater prüfen.')
  kopf(annahmen, 4, ['Nr.', 'Annahme', 'Begründung', 'Status'], [5, 55, 70, 12])
  const A: [string, string, string][] = [
    ['Beträge sind Bruttobeträge laut Beleg in €.', 'So erfasst in der App; Netto/USt werden nicht getrennt.', 'Festlegung'],
    ['Steuerjahr = Jahr des Zahlungsdatums, je Beleg manuell änderbar.', 'Zufluss-/Abflussprinzip § 11 EStG; 10-Tage-Regel wird nicht automatisch angewandt.', 'prüfen'],
    ['Aufgeteilte Belege werden mit Anteil % auf Objekte verteilt (Blatt Aufteilung, ungerundet).', 'Die App rundet je Anteil auf ganze Cent; Abweichungen von wenigen Cent zur App-Anzeige sind möglich.', 'Festlegung'],
    ['Art einer Kategorie (Einnahme/Werbungskosten/Ausgabe) kommt aus der Jahreskonfiguration.', 'Steuert die Summen auf Blatt Anlage V.', 'prüfen'],
    ['ELSTER-Zeilen sind Hinweise aus der Konfiguration.', 'Zeilennummern ändern sich je Formularjahr.', 'prüfen'],
    ['Keine AfA-Berechnung, keine Steuerberechnung, keine § 35a-Ermäßigung, keine zumutbare Belastung.', 'Bewusst ausgeschlossen (Umsetzungsplan).', 'Festlegung'],
    ['Pauschalen (Entfernung, Homeoffice) werden nur als Zählgrößen ausgegeben.', 'Sätze stehen nur zur Info auf Blatt Anlage N.', 'prüfen'],
    ['NK-Vorlage: umlagefähige Kosten nach selbst gewähltem Schlüssel; Belege mit fester Einheit gehen direkt an diese Einheit.', 'Keine rechtssichere Nebenkostenabrechnung (BetrKV, Mietvertrag prüfen).', 'prüfen'],
    ['Belege aus Vorlagen verweisen auf einen Dauerbeleg (gleiche Datei).', 'Kein eigener Zahlungsnachweis je Zeitraum – ggf. Kontoauszug beilegen.', 'prüfen'],
    [`Jahresvergleich: Vorjahreswerte sind Summen aus dem Belegindex ${d.jahr - 1} (feste Werte).`, 'Die Vorjahresbelege liegen nicht in dieser Datei.', 'Festlegung'],
    ['Einheit-ID „ohne“ = Beleg keiner Einheit zugeordnet.', 'Leere Zellen lassen sich in SUMMEWENNS nicht in allen Programmen gleich abfragen.', 'Festlegung'],
  ]
  A.forEach((x, i) => { const row = annahmen.getRow(5 + i); row.values = [i + 1, ...x]; row.alignment = { wrapText: true, vertical: 'top' } })

  // ------------------------------------------------------------ Prüfung
  titel(pruefung, 'Prüfung', 'Gegenproben mit Formeln. „OK“ = stimmt, sonst bitte prüfen.')
  kopf(pruefung, 4, ['Prüfung', 'Wert 1', 'Wert 2', 'Ergebnis'], [60, 16, 16, 14])
  const pz: [string, string, string, string][] = [
    ['Summe aller Belege = Gesamtsumme Übersicht', `SUM(${BL(B.betrag)})`, `'Übersicht'!G${gr}`, 'IF(ABS(B{r}-C{r})<0.005,"OK","ABWEICHUNG")'],
    ['Anzahl Belege = Anzahl Übersicht', `COUNT(${BL(B.nr)})`, `'Übersicht'!F${gr}`, 'IF(B{r}=C{r},"OK","ABWEICHUNG")'],
    ['Aufteilung: Summe der Anteile € = Summe der aufgeteilten Belege', `SUM(${AU('F')})`, `SUMIFS(${BL(B.betrag)},${BL(B.aufgeteilt)},"ja")`, 'IF(ABS(B{r}-C{r})<0.005,"OK","ABWEICHUNG")'],
    ['Aufgeteilte Belege, deren Anteile nicht 100 % ergeben', `COUNTIFS(${BL(B.aufgeteilt)},"ja",${BL(B.anteile)},"<>100")`, '0', 'IF(B{r}=0,"OK","PRÜFEN")'],
    ['§ 35a: Belege mit Arbeitskosten + Material ≠ Betrag', `COUNTIF(${BL(B.pruef35a)},"Abweichung")`, '0', 'IF(B{r}=0,"OK","PRÜFEN")'],
    ['Anlage V: Werbungskosten aller Objekte = Werbungskosten aller V-Belege', vZeilen.length ? `SUM('Anlage V'!E${vZeilen[0]}:E${vZeilen[vZeilen.length - 1]})` : '0',
      `SUMIFS(${BL(B.betrag)},${BL(B.modul)},${str(vModul)},${BL(B.art)},"werbungskosten")`, 'IF(ABS(B{r}-C{r})<0.005,"OK","PRÜFEN (Beleg ohne Objekt?)")'],
  ]
  pz.forEach(([t, w1, w2, erg], i) => {
    const z = 5 + i
    const row = pruefung.getRow(z)
    row.getCell(1).value = t
    row.getCell(2).value = f(w1)
    row.getCell(3).value = f(w2)
    row.getCell(4).value = f(erg.replace(/\{r\}/g, String(z)))
  })
  pruefung.getColumn(2).numFmt = '#,##0.00'; pruefung.getColumn(3).numFmt = '#,##0.00'

  const buffer = await wb.xlsx.writeBuffer()
  return { buffer: buffer as ArrayBuffer, blaetter: wb.worksheets.map((w) => w.name) }
}

export function colLetter(n: number): string {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}
