// AfA-Hilfsrechnung auf der Objektseite: Eingaben, Rechenweg, Annahmen, Jahrestabelle, Excel mit Formeln.
// Nur Vorschlag für die Steuerberatung – alle Sätze und der Grundstücksanteil sind prüfbedürftig.
import { useEffect, useMemo, useState } from 'react'
import { AKTUELLES_JAHR } from '../konfig'
import { speichereAfa } from '../daten/dienste'
import { AFA_STAND, afaImJahr, leereAfa, rechneAfa, type AfaEingabe } from '../fachlich/afa'
import { formatDatum, formatEuro, parseBetrag, parseDatum } from '../fachlich/format'
import type { Objekt } from '../fachlich/objekte'
import Info from './Info'

type Text = Record<'kaufpreis' | 'grest' | 'notar' | 'grundbuch' | 'makler' | 'sonstige' | 'grundProzent' | 'brw' | 'flaeche' | 'fertig' | 'uebergang' | 'eigen' | 'reno' | 'bisher', string>

const ct = (c: number | null) => (c === null ? '' : formatEuro(c).replace(/\s?€/, ''))
const zahlText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))
const zahl = (t: string) => { const s = t.trim().replace(/\./g, '').replace(',', '.'); return s === '' ? null : Number.isFinite(Number(s)) ? Number(s) : NaN }
const komma = (n: number) => String(n).replace('.', ',')

function alsText(e: AfaEingabe): Text {
  return {
    kaufpreis: ct(e.kaufpreis_ct), grest: ct(e.grunderwerbsteuer_ct), notar: ct(e.notar_ct), grundbuch: ct(e.grundbuch_ct), makler: ct(e.makler_ct),
    sonstige: ct(e.sonstige_nk_ct), grundProzent: zahlText(e.grundanteil_prozent), brw: ct(e.bodenrichtwert_ct), flaeche: zahlText(e.grundstueck_m2),
    fertig: e.fertigstellungsjahr === null ? '' : String(e.fertigstellungsjahr), uebergang: e.uebergang ? formatDatum(e.uebergang) : '',
    eigen: zahlText(e.eigennutzung_prozent), reno: ct(e.renovierung_ct), bisher: e.bisher,
  }
}

/** Aus den Texten eine Eingabe machen; Fehler je Feld. */
function ausText(id: string, t: Text): { e: AfaEingabe; fehler: string[] } {
  const fehler: string[] = []
  const betrag = (s: string, name: string) => { if (!s.trim()) return null; const c = parseBetrag(s); if (c === null) fehler.push(`${name}: keine gültige Zahl`); return c }
  const nr = (s: string, name: string) => { const n = zahl(s); if (Number.isNaN(n)) { fehler.push(`${name}: keine gültige Zahl`); return null } return n }
  const u = t.uebergang.trim() ? parseDatum(t.uebergang) : ''
  if (u === null) fehler.push('Übergang: Datum als TT.MM.JJJJ')
  const e: AfaEingabe = {
    objekt_id: id, kaufpreis_ct: betrag(t.kaufpreis, 'Kaufpreis'), grunderwerbsteuer_ct: betrag(t.grest, 'Grunderwerbsteuer'), notar_ct: betrag(t.notar, 'Notar'),
    grundbuch_ct: betrag(t.grundbuch, 'Grundbuch'), makler_ct: betrag(t.makler, 'Makler'), sonstige_nk_ct: betrag(t.sonstige, 'Sonstige'),
    grundanteil_prozent: nr(t.grundProzent, 'Grundstücksanteil'), bodenrichtwert_ct: betrag(t.brw, 'Bodenrichtwert'), grundstueck_m2: nr(t.flaeche, 'Grundstücksfläche'),
    fertigstellungsjahr: nr(t.fertig, 'Fertigstellungsjahr'), uebergang: u || '', eigennutzung_prozent: nr(t.eigen, 'Eigennutzung'),
    renovierung_ct: betrag(t.reno, 'Renovierung'), bisher: t.bisher.trim(),
  }
  return { e, fehler }
}

export default function AfaKarte({ objekt, gespeichert, online }: { objekt: Objekt; gespeichert?: AfaEingabe; online: boolean }) {
  // Vorbelegung aus den Grunddaten des Objekts, solange noch nichts gespeichert ist
  const start = useMemo(() => gespeichert ?? {
    ...leereAfa(objekt.id), uebergang: objekt.anschaffungsdatum, fertigstellungsjahr: objekt.baujahr,
    grundanteil_prozent: objekt.gebaeudeanteil_prozent === null ? null : 100 - objekt.gebaeudeanteil_prozent,
  }, [gespeichert, objekt])
  const [t, setT] = useState<Text>(() => alsText(start))
  useEffect(() => { setT(alsText(start)) }, [start])
  const [laeuft, setLaeuft] = useState('')
  const [meldung, setMeldung] = useState('')
  const [fehler, setFehler] = useState('')
  const { e, fehler: eingabeFehler } = ausText(objekt.id, t)
  const r = rechneAfa(e)
  const s = (k: keyof Text) => (x: { target: { value: string } }) => setT({ ...t, [k]: x.target.value })

  const speichern = async () => {
    setFehler(''); setMeldung(''); setLaeuft('Speichere …')
    try { await speichereAfa(AKTUELLES_JAHR, e); setMeldung('Gespeichert.') } catch (x) { setFehler(x instanceof Error ? x.message : String(x)) } finally { setLaeuft('') }
  }
  const excel = async () => {
    setFehler(''); setLaeuft('Erstelle Excel …')
    try {
      const [{ default: ExcelJS }, { erstelleAfaExcel }] = await Promise.all([import('exceljs'), import('../export/afaExcel')])
      const buf = await erstelleAfaExcel(objekt.bezeichnung, e, ExcelJS)
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url; a.download = `AfA_${objekt.bezeichnung.replace(/[^\p{L}\p{N}]+/gu, '_')}.xlsx`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (x) { setFehler(x instanceof Error ? x.message : String(x)) } finally { setLaeuft('') }
  }

  const feld = (k: keyof Text, label: string, hilfe: string, platz = '') => (
    <label className="feld"><span>{label}<Info text={hilfe} /></span><input value={t[k]} placeholder={platz} onChange={s(k)} style={{ maxWidth: 180 }} /></label>
  )
  const zeile = (text: string, c: number, fett = false) => <tr><td>{fett ? <strong>{text}</strong> : text}</td><td className="betrag">{fett ? <strong>{formatEuro(c)}</strong> : formatEuro(c)}</td></tr>
  const imJahr = afaImJahr(r, AKTUELLES_JAHR)

  return (
    <div className="karte">
      <h2>AfA-Hilfsrechnung <span className="klein">(Vorschlag für die Steuerberatung, prüfen)</span></h2>
      <p className="klein">Lineare Gebäude-AfA, Rechtsstand {AFA_STAND}. Die App gibt das Ergebnis nur als Vorschlag weiter. Verbindlich sind Steuerberatung und Bescheid.</p>
      <details open={!gespeichert}>
        <summary>Eingaben</summary>
        <div className="zeile">
          {feld('kaufpreis', 'Kaufpreis (€)', 'Kaufpreis laut Kaufvertrag, ohne Nebenkosten.', 'z. B. 250.000,00')}
          {feld('uebergang', 'Übergang Nutzen und Lasten (TT.MM.JJJJ)', 'Steht im Kaufvertrag. Ab diesem Monat beginnt die AfA (Monat zählt mit).')}
          {feld('fertig', 'Fertigstellungsjahr', 'Jahr, in dem das Gebäude fertig gebaut wurde (nicht das Kaufjahr). Bestimmt den AfA-Satz.')}
        </div>
        <div className="zeile">
          {feld('grest', 'Grunderwerbsteuer (€)', 'Laut Bescheid des Finanzamts zur Grunderwerbsteuer.')}
          {feld('notar', 'Notar (€)', 'Notarkosten für den Kaufvertrag, brutto. Kosten für eine Grundschuld (Darlehen) gehören nicht hierher, die sind Werbungskosten.')}
          {feld('grundbuch', 'Grundbuch (€)', 'Gebühren des Amtsgerichts für die Eigentumsumschreibung. Grundschuld-Eintrag nicht hier.')}
          {feld('makler', 'Makler (€)', 'Maklerprovision, brutto.')}
          {feld('sonstige', 'Sonstige Nebenkosten (€)', 'Weitere Kosten des Erwerbs, z. B. Gutachten vor dem Kauf (prüfen).')}
        </div>
        <div className="zeile">
          {feld('grundProzent', 'Anteil Grund und Boden (%)', 'Anteil des Grundstücks an den Anschaffungskosten, z. B. laut Kaufvertrag oder Steuerberatung. Der Boden wird nicht abgeschrieben. Leer lassen, wenn du stattdessen Bodenrichtwert und Fläche einträgst.')}
          {feld('brw', 'Bodenrichtwert (€/m²)', 'Nur wenn kein Prozentanteil bekannt ist. Zu finden bei BORIS bzw. dem Gutachterausschuss, Stand Kaufdatum.')}
          {feld('flaeche', 'Grundstücksfläche (m²)', 'Laut Grundbuch oder Kaufvertrag.')}
        </div>
        <div className="zeile">
          {feld('eigen', 'Selbst genutzt (%)', 'Anteil, den ihr selbst nutzt. Dieser Anteil wird nicht abgeschrieben. 0 oder leer = ganz vermietet.')}
          {feld('reno', 'Renovierung erste 3 Jahre, netto (€)', 'Instandsetzung und Modernisierung in den ersten 3 Jahren nach dem Kauf, ohne Mehrwertsteuer. Über 15 % der Gebäudekosten werden sie zur AfA-Basis (anschaffungsnahe Herstellungskosten, prüfen).')}
          {feld('bisher', 'AfA laut bisherigem Bescheid', 'Falls schon ein Bescheid AfA enthält: Satz und Betrag, z. B. „2 %, 3.200 €“. Nur zum Vergleich.')}
        </div>
        {eingabeFehler.length > 0 && <div className="fehler"><ul className="liste">{eingabeFehler.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        <div className="zeile">
          <button disabled={!online || !!laeuft || eingabeFehler.length > 0} onClick={() => void speichern()}>{laeuft === 'Speichere …' ? laeuft : 'Angaben speichern'}</button>
          <button className="zweit" disabled={!!laeuft || eingabeFehler.length > 0} onClick={() => void excel()}>{laeuft === 'Erstelle Excel …' ? laeuft : 'Excel mit Formeln'}</button>
        </div>
        {meldung && <p className="ok">{meldung}</p>}
        {fehler && <p className="fehler">{fehler}</p>}
      </details>

      {r.fehlt.length > 0
        ? <p className="warnung">Für die Rechnung fehlt noch: {r.fehlt.join(', ')}.</p>
        : (
          <>
            <table className="belege"><tbody>
              {zeile('Kaufpreis', e.kaufpreis_ct ?? 0)}
              {zeile('+ Kaufnebenkosten', r.kaufnebenkosten_ct)}
              {zeile('= Anschaffungskosten', r.anschaffungskosten_ct, true)}
              {zeile(`− Grund und Boden${r.bodenWeg === 'prozent' ? ` (${komma(e.grundanteil_prozent ?? 0)} %)` : ' (Bodenrichtwert × Fläche)'}`, r.boden_ct)}
              {r.anschaffungsnah_ct > 0 && zeile('+ anschaffungsnahe Herstellungskosten', r.anschaffungsnah_ct)}
              {zeile('= Gebäude', r.gebaeude_ct)}
              {r.vermietet_prozent < 100 && zeile(`davon vermietet (${komma(r.vermietet_prozent)} %)`, r.bemessung_ct)}
              {zeile('AfA-Bemessungsgrundlage', r.bemessung_ct, true)}
              <tr><td>AfA-Satz</td><td className="betrag">{komma(r.satz?.prozent ?? 0)} %</td></tr>
              {zeile('AfA voller Jahresbetrag', r.jahresbetrag_ct, true)}
              {zeile(`AfA ${AKTUELLES_JAHR}`, imJahr, true)}
            </tbody></table>
            <p className="klein">{r.satz?.grund} (prüfen).</p>
            {r.hinweise.map((h) => <p key={h} className="warnung klein">{h}</p>)}
            <details>
              <summary>Jahrestabelle ({r.tabelle.length} Jahre, bis {r.tabelle[r.tabelle.length - 1]?.jahr})</summary>
              <table className="belege"><thead><tr><th>Jahr</th><th>Monate</th><th className="betrag">AfA</th><th className="betrag">Restwert</th></tr></thead><tbody>
                {r.tabelle.map((x) => <tr key={x.jahr} style={x.jahr === AKTUELLES_JAHR ? { fontWeight: 'bold' } : undefined}><td>{x.jahr}</td><td>{x.monate}</td><td className="betrag">{formatEuro(x.betrag_ct)}</td><td className="betrag">{formatEuro(x.restwert_ct)}</td></tr>)}
              </tbody></table>
            </details>
          </>
        )}
      <details>
        <summary>Annahmen</summary>
        <ul className="liste klein">{r.annahmen.map((a) => <li key={a}>{a}</li>)}</ul>
      </details>
    </div>
  )
}
