// AfA-Hilfsrechnung als Excel-Datei: Eingaben als Werte, alle Ergebnisse als Formeln, Annahmen auf eigenem Blatt.
// Excel speichert Formeln englisch (ROUND = RUNDEN, IF = WENN …).
import type ExcelJSNs from 'exceljs'
import { AFA_STAND, GRENZE_ANSCHAFFUNGSNAH, rechneAfa, type AfaEingabe } from '../fachlich/afa'

type ExcelJS = typeof ExcelJSNs
const EURO = '#,##0.00 "€"'
const euro = (ct: number | null) => (ct === null ? null : ct / 100)
const f = (formula: string) => ({ formula })

/** Zeilen der Eingaben und Ergebnisse im Blatt „AfA“ (Spalte B). Für Tests exportiert. */
export const Z = {
  kaufpreis: 4, grest: 5, notar: 6, grundbuch: 7, makler: 8, sonstige: 9, grundProzent: 10, brw: 11, flaeche: 12, fertig: 13, uebergang: 14, eigen: 15, reno: 16,
  nk: 19, ak: 20, boden: 21, gebOhne: 22, nah: 23, geb: 24, vermietet: 25, bmg: 26, satz: 27, jahr: 28, tabelle: 32,
} as const

export async function erstelleAfaExcel(objektName: string, e: AfaEingabe, ExcelJSMod: ExcelJS): Promise<ArrayBuffer> {
  const r = rechneAfa(e)
  const wb = new ExcelJSMod.Workbook()
  wb.creator = 'Steuerbeleg'
  wb.calcProperties.fullCalcOnLoad = true
  const ws = wb.addWorksheet('AfA')
  const an = wb.addWorksheet('Annahmen')
  ws.getColumn(1).width = 52; ws.getColumn(2).width = 18; ws.getColumn(3).width = 16; ws.getColumn(4).width = 18; ws.getColumn(5).width = 60
  ws.getCell('A1').value = `AfA-Hilfsrechnung ${objektName} – Vorschlag für die Steuerberatung, prüfen`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = `Gelb = Eingabe. Alle anderen Werte sind Formeln. Rechtsstand: ${AFA_STAND}`
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } }

  const eingabe = (z: number, text: string, wert: number | Date | null, fmt?: string, quelle = '') => {
    ws.getCell(`A${z}`).value = text
    const c = ws.getCell(`B${z}`)
    c.value = wert
    if (fmt) c.numFmt = fmt
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
    if (quelle) ws.getCell(`E${z}`).value = quelle
  }
  ws.getCell('A3').value = 'Eingaben'
  ws.getCell('A3').font = { bold: true }
  eingabe(Z.kaufpreis, 'Kaufpreis laut Kaufvertrag', euro(e.kaufpreis_ct), EURO, 'Kaufvertrag')
  eingabe(Z.grest, 'Grunderwerbsteuer', euro(e.grunderwerbsteuer_ct), EURO, 'Bescheid Grunderwerbsteuer')
  eingabe(Z.notar, 'Notar', euro(e.notar_ct), EURO, 'Notarrechnung')
  eingabe(Z.grundbuch, 'Grundbuch / Amtsgericht', euro(e.grundbuch_ct), EURO, 'Kostenrechnung Amtsgericht')
  eingabe(Z.makler, 'Makler', euro(e.makler_ct), EURO, 'Maklerrechnung')
  eingabe(Z.sonstige, 'Sonstige Kaufnebenkosten', euro(e.sonstige_nk_ct), EURO)
  eingabe(Z.grundProzent, 'Anteil Grund und Boden in % (leer = Bodenrichtwert verwenden)', e.grundanteil_prozent, '0.00', 'Kaufvertrag / Steuerberatung (prüfen)')
  eingabe(Z.brw, 'Bodenrichtwert €/m² (nur wenn % leer)', euro(e.bodenrichtwert_ct), EURO, 'BORIS / Gutachterausschuss')
  eingabe(Z.flaeche, 'Grundstücksfläche m² (nur wenn % leer)', e.grundstueck_m2, '0.00', 'Grundbuch / Kaufvertrag')
  eingabe(Z.fertig, 'Fertigstellungsjahr Gebäude', e.fertigstellungsjahr, '0')
  const u = /^\d{4}-\d{2}-\d{2}$/.test(e.uebergang) ? new Date(Date.UTC(+e.uebergang.slice(0, 4), +e.uebergang.slice(5, 7) - 1, +e.uebergang.slice(8, 10))) : null
  eingabe(Z.uebergang, 'Übergang Nutzen und Lasten', u, 'dd.mm.yyyy', 'Kaufvertrag')
  eingabe(Z.eigen, 'Selbst genutzter Anteil in %', e.eigennutzung_prozent ?? 0, '0.00')
  eingabe(Z.reno, 'Renovierung in den ersten 3 Jahren, netto', euro(e.renovierung_ct) ?? 0, EURO, 'Rechnungen (ohne USt)')

  ws.getCell('A18').value = 'Berechnung'
  ws.getCell('A18').font = { bold: true }
  const B = (z: number) => `B${z}`
  const formel = (z: number, text: string, fx: string, fmt: string, erkl: string) => {
    ws.getCell(`A${z}`).value = text
    ws.getCell(`B${z}`).value = f(fx)
    ws.getCell(`B${z}`).numFmt = fmt
    ws.getCell(`E${z}`).value = erkl
  }
  formel(Z.nk, 'Kaufnebenkosten', `SUM(${B(Z.grest)}:${B(Z.sonstige)})`, EURO, 'Summe der Nebenkosten')
  formel(Z.ak, 'Anschaffungskosten gesamt', `${B(Z.kaufpreis)}+${B(Z.nk)}`, EURO, 'Kaufpreis + Nebenkosten')
  formel(Z.boden, 'davon Grund und Boden', `IF(${B(Z.grundProzent)}<>"",ROUND(${B(Z.ak)}*${B(Z.grundProzent)}/100,2),MIN(${B(Z.ak)},ROUND(${B(Z.brw)}*${B(Z.flaeche)},2)))`, EURO, 'nicht abschreibbar (prüfen)')
  formel(Z.gebOhne, 'Gebäude (ohne Renovierung)', `${B(Z.ak)}-${B(Z.boden)}`, EURO, '')
  formel(Z.nah, 'anschaffungsnahe Herstellungskosten', `IF(${B(Z.reno)}>${B(Z.gebOhne)}*${GRENZE_ANSCHAFFUNGSNAH},${B(Z.reno)},0)`, EURO, '§ 6 Abs. 1 Nr. 1a EStG: über 15 % in 3 Jahren (prüfen)')
  formel(Z.geb, 'Gebäude gesamt', `${B(Z.gebOhne)}+${B(Z.nah)}`, EURO, '')
  formel(Z.vermietet, 'vermieteter Anteil in %', `100-MIN(100,MAX(0,${B(Z.eigen)}))`, '0.00', '')
  formel(Z.bmg, 'AfA-Bemessungsgrundlage', `ROUND(${B(Z.geb)}*${B(Z.vermietet)}/100,2)`, EURO, '')
  formel(Z.satz, 'AfA-Satz in %', `IF(${B(Z.fertig)}<1925,2.5,IF(${B(Z.fertig)}<=2022,2,3))`, '0.00', 'vor 1925: 2,5 % · 1925–2022: 2 % · ab 2023: 3 % (prüfen)')
  formel(Z.jahr, 'AfA voller Jahresbetrag', `ROUND(${B(Z.bmg)}*${B(Z.satz)}/100,2)`, EURO, '')

  const t = Z.tabelle
  ws.getCell(`A${t - 2}`).value = 'AfA je Jahr'
  ws.getCell(`A${t - 2}`).font = { bold: true }
  ;['Jahr', 'Monate', 'AfA €', 'Restwert €'].forEach((h, i) => { const c = ws.getRow(t - 1).getCell(i + 1); c.value = h; c.font = { bold: true } })
  const zeilen = Math.max(r.tabelle.length, 1)
  for (let i = 0; i < zeilen; i++) {
    const z = t + i
    const row = ws.getRow(z)
    if (i === 0) {
      row.getCell(1).value = f(`YEAR(${B(Z.uebergang)})`)
      row.getCell(2).value = f(`13-MONTH(${B(Z.uebergang)})`)
      row.getCell(3).value = f(`MIN(${B(Z.bmg)},ROUND($B$${Z.jahr}*B${z}/12,2))`)
      row.getCell(4).value = f(`${B(Z.bmg)}-C${z}`)
    } else {
      row.getCell(1).value = f(`A${z - 1}+1`)
      row.getCell(2).value = 12
      row.getCell(3).value = f(`MIN(D${z - 1},ROUND($B$${Z.jahr}*B${z}/12,2))`)
      row.getCell(4).value = f(`D${z - 1}-C${z}`)
    }
    row.getCell(3).numFmt = EURO
    row.getCell(4).numFmt = EURO
  }

  an.getColumn(1).width = 6
  an.getColumn(2).width = 120
  an.getCell('A1').value = 'Annahmen und Hinweise (prüfen)'
  an.getCell('A1').font = { bold: true, size: 14 }
  const texte = [...r.annahmen, ...r.hinweise, 'Die App ersetzt keine Steuerberatung. Alle Sätze und Beträge bitte gegen die Originalnorm bzw. mit der Steuerberatung prüfen.']
  texte.forEach((x, i) => {
    an.getCell(`A${i + 3}`).value = i + 1
    an.getCell(`B${i + 3}`).value = x
    an.getCell(`B${i + 3}`).alignment = { wrapText: true }
  })
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}
