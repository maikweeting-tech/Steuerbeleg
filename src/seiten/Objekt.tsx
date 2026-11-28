// Anlage V: ein Objekt – Grunddaten (inkl. AfA-Grunddaten ohne Rechnung), Einheiten, Einnahmen,
// Übersicht Einnahmen/Werbungskosten und Umlage umlagefähiger Kosten je Einheit (E4, E9).
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { loescheEinnahme, speichereEinheit, speichereEinnahmen, speichereObjekt } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import {
  monatsreihe, objektSumme, SCHLUESSEL_NAMEN, umlage, type Einheit, type Einnahme, type Objekt, type Umlageschluessel,
} from '../fachlich/objekte'
import { formatDatum, formatEuro, parseBetrag, parseDatum } from '../fachlich/format'
import { istAngemeldet } from '../google/auth'
import ObjektDokumente from '../komponenten/ObjektDokumente'
import Info from '../komponenten/Info'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const vModul = konfig.module.find((m) => m.ebene === 'objekt')
const katName = (k: string) => vModul?.kategorien.find((x) => x.schluessel === k)?.name ?? k
const centText = (c: number | null) => (c === null ? '' : formatEuro(c).replace(/\s?€/, ''))
const zahlOderNull = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')))
const zahlText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export default function ObjektSeite() {
  const { id = '' } = useParams()
  const stamm = useStamm(AKTUELLES_JAHR)
  const { belege } = useDaten(AKTUELLES_JAHR)
  const online = istAngemeldet()
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  const [ok, setOk] = useState('')

  const objekt = stamm.objekte.find((o) => o.id === id)
  const einheiten = stamm.einheiten.filter((e) => e.objekt_id === id)
  const einnahmen = stamm.einnahmen.filter((e) => e.objekt_id === id).sort((a, b) => a.monat.localeCompare(b.monat))

  const aufgabe = async (t: string, f: () => Promise<unknown>, meldung = 'Gespeichert.') => {
    setFehler(''); setOk(''); setLaeuft(t)
    try { await f(); setOk(meldung) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft('') }
  }

  if (!objekt) return <p>Objekt nicht gefunden. <Link to="/objekte">Zur Objektliste</Link></p>

  const summe = objektSumme(id, belege, stamm.aufteilung, stamm.einnahmen, konfig)
  const ul = umlage(id, einheiten, objekt.umlageschluessel, belege.filter((b) => b.modul === vModul?.id), stamm.aufteilung)

  return (
    <>
      <p><Link to="/objekte">← Objekte</Link></p>
      <h2 style={{ fontSize: '1.15rem' }}>{objekt.bezeichnung}</h2>
      <ObjektDokumente objektId={id} />

      <div className="karte">
        <h2>Übersicht {AKTUELLES_JAHR}</h2>
        <table className="belege"><tbody>
          <tr><td>Einnahmen (Blatt Einnahmen + Belege „Einnahme“)</td><td className="betrag">{formatEuro(summe.einnahmen_ct)}</td></tr>
          <tr><td>Werbungskosten aus Belegen (ohne AfA)</td><td className="betrag">{formatEuro(summe.werbungskosten_ct)}</td></tr>
          <tr><td><strong>Saldo vor AfA</strong></td><td className="betrag"><strong>{formatEuro(summe.saldo_ct)}</strong></td></tr>
        </tbody></table>
        <p className="klein">{summe.belege} Beleg(e). Keine Steuerberechnung, keine AfA-Berechnung. Nur übertragene Belege zählen.</p>
      </div>

      <Grunddaten objekt={objekt} online={online} laeuft={!!laeuft}
        speichern={(o) => void aufgabe('Speichere …', () => speichereObjekt(AKTUELLES_JAHR, o))} />

      <div className="karte">
        <h2>Einheiten</h2>
        {einheiten.map((u) => (
          <EinheitZeile key={u.id} einheit={u} online={online} laeuft={!!laeuft}
            speichern={(x) => void aufgabe('Speichere …', () => speichereEinheit(AKTUELLES_JAHR, x))}
            loeschen={() => void aufgabe('Lösche …', () => speichereEinheit(AKTUELLES_JAHR, u, true), 'Gelöscht.')} />
        ))}
        {!einheiten.length && <p className="klein">Keine Einheiten. Für ein Objekt mit nur einer Wohnung nicht nötig.</p>}
        <button className="zweit" disabled={!online || !!laeuft} onClick={() => void aufgabe('Lege an …', () => speichereEinheit(AKTUELLES_JAHR, {
          id: crypto.randomUUID(), objekt_id: id, bezeichnung: `Einheit ${einheiten.length + 1}`, wohnflaeche_m2: null, personen: null, fest_prozent: null,
        }), 'Einheit angelegt.')}>+ Einheit</button>
      </div>

      <EinnahmenKarte objektId={id} einheiten={einheiten} einnahmen={einnahmen} online={online} laeuft={!!laeuft}
        speichern={(l) => void aufgabe('Speichere …', () => speichereEinnahmen(AKTUELLES_JAHR, l), `${l.length} Einnahme(n) gespeichert.`)}
        loeschen={(eid) => void aufgabe('Lösche …', () => loescheEinnahme(AKTUELLES_JAHR, eid), 'Gelöscht.')} />

      <div className="karte">
        <h2>Umlage je Einheit</h2>
        <p className="klein">Schlüssel: {SCHLUESSEL_NAMEN[objekt.umlageschluessel]} (in den Grunddaten änderbar). Belege mit fester Einheit zählen voll bei dieser Einheit.</p>
        {ul.fehler.map((f) => <p key={f} className="fehler">{f}</p>)}
        {ul.zeilen.length > 0 && einheiten.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="belege">
              <thead><tr><th>Kategorie</th>{einheiten.map((u) => <th key={u.id} className="betrag">{u.bezeichnung}</th>)}<th className="betrag">Gesamt</th></tr></thead>
              <tbody>
                {ul.zeilen.map((z) => (
                  <tr key={z.kategorie}><td>{katName(z.kategorie)}</td>{z.je_einheit_ct.map((c, i) => <td key={i} className="betrag">{formatEuro(c)}</td>)}<td className="betrag">{formatEuro(z.gesamt_ct)}</td></tr>
                ))}
                <tr><td><strong>Summe</strong></td>
                  {einheiten.map((_, i) => <td key={i} className="betrag"><strong>{formatEuro(ul.zeilen.reduce((s, z) => s + z.je_einheit_ct[i], 0))}</strong></td>)}
                  <td className="betrag"><strong>{formatEuro(ul.zeilen.reduce((s, z) => s + z.gesamt_ct, 0))}</strong></td></tr>
              </tbody>
            </table>
          </div>
        ) : <p className="klein">Noch keine umlagefähigen Belege{einheiten.length ? '' : ' oder keine Einheiten'}.</p>}
        <p className="klein">Hilfsrechnung, keine rechtssichere Nebenkostenabrechnung (BetrKV, Vorauszahlungen und Abrechnungszeitraum bitte selbst prüfen).</p>
      </div>

      {laeuft && <p className="klein">{laeuft}</p>}
      {ok && !laeuft && <p className="ok">{ok}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {!online && <p className="klein">Ändern geht nur angemeldet und mit Netz.</p>}
    </>
  )
}

// ---------------------------------------------------------------- Grunddaten

function Grunddaten({ objekt, online, laeuft, speichern }: { objekt: Objekt; online: boolean; laeuft: boolean; speichern: (o: Objekt) => void }) {
  const roh = () => ({
    adresse: objekt.adresse, anschaffungsdatum: objekt.anschaffungsdatum ? formatDatum(objekt.anschaffungsdatum) : '',
    kosten: centText(objekt.anschaffungskosten_ct), afa: objekt.afa_satz, baujahr: zahlText(objekt.baujahr),
    anteil: zahlText(objekt.gebaeudeanteil_prozent), flaeche: zahlText(objekt.wohnflaeche_m2), schluessel: objekt.umlageschluessel,
  })
  const [f, setF] = useState(roh)
  useEffect(() => setF(roh()), [objekt]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = (k: keyof ReturnType<typeof roh>) => (x: { target: { value: string } }) => setF((a) => ({ ...a, [k]: x.target.value }))

  const fehler: string[] = []
  const datum = f.anschaffungsdatum.trim() ? parseDatum(f.anschaffungsdatum) : ''
  if (datum === null) fehler.push('Anschaffungsdatum als TT.MM.JJJJ')
  const kosten = f.kosten.trim() ? parseBetrag(f.kosten) : null
  if (f.kosten.trim() && kosten === null) fehler.push('Anschaffungskosten keine gültige Zahl')
  for (const [k, t] of [['baujahr', 'Baujahr'], ['anteil', 'Gebäudeanteil'], ['flaeche', 'Wohnfläche']] as const) {
    if (f[k].trim() && !Number.isFinite(zahlOderNull(f[k]))) fehler.push(`${t} keine gültige Zahl`)
  }
  const anteil = zahlOderNull(f.anteil)
  if (anteil !== null && (anteil < 0 || anteil > 100)) fehler.push('Gebäudeanteil zwischen 0 und 100 %')

  return (
    <div className="karte">
      <h2>Grunddaten</h2>
      <label className="feld"><span>Adresse<Info zu="Adresse" /></span><input value={f.adresse} onChange={s('adresse')} /></label>
      <label className="feld"><span>Wohnfläche gesamt (m²)<Info zu="Wohnfläche gesamt (m²)" /></span><input inputMode="decimal" value={f.flaeche} onChange={s('flaeche')} /></label>
      <label className="feld"><span>Umlageschlüssel<Info zu="Umlageschlüssel" /></span>
        <select value={f.schluessel} onChange={s('schluessel')}>
          {(Object.keys(SCHLUESSEL_NAMEN) as Umlageschluessel[]).map((k) => <option key={k} value={k}>{SCHLUESSEL_NAMEN[k]}</option>)}
        </select>
      </label>
      <fieldset style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8 }}>
        <legend className="klein">AfA-Grunddaten (nur zur Information, es wird keine AfA berechnet)</legend>
        <label className="feld"><span>Anschaffungsdatum (TT.MM.JJJJ)<Info zu="Anschaffungsdatum (TT.MM.JJJJ)" /></span><input value={f.anschaffungsdatum} onChange={s('anschaffungsdatum')} /></label>
        <label className="feld"><span>Anschaffungskosten gesamt (€)<Info zu="Anschaffungskosten gesamt (€)" /></span><input inputMode="decimal" value={f.kosten} onChange={s('kosten')} /></label>
        <label className="feld"><span>Gebäudeanteil (%) – ohne Grund und Boden<Info zu="Gebäudeanteil (%) – ohne Grund und Boden" /></span><input inputMode="decimal" value={f.anteil} onChange={s('anteil')} /></label>
        <label className="feld"><span>Baujahr<Info zu="Baujahr" /></span><input inputMode="numeric" value={f.baujahr} onChange={s('baujahr')} /></label>
        <label className="feld"><span>AfA-Satz laut Steuerberater/Bescheid (Text, prüfen)<Info zu="AfA-Satz laut Steuerberater/Bescheid (Text, prüfen)" /></span><input value={f.afa} placeholder="z. B. 2 % linear – prüfen" onChange={s('afa')} /></label>
      </fieldset>
      {fehler.map((x) => <p key={x} className="fehler">{x}</p>)}
      <button disabled={!online || laeuft || fehler.length > 0} onClick={() => speichern({
        ...objekt, adresse: f.adresse.trim(), anschaffungsdatum: datum || '', anschaffungskosten_ct: kosten, afa_satz: f.afa.trim(),
        baujahr: zahlOderNull(f.baujahr), gebaeudeanteil_prozent: anteil, wohnflaeche_m2: zahlOderNull(f.flaeche),
        umlageschluessel: f.schluessel as Umlageschluessel,
      })}>Grunddaten speichern</button>
    </div>
  )
}

// ---------------------------------------------------------------- Einheit

function EinheitZeile({ einheit, online, laeuft, speichern, loeschen }: {
  einheit: Einheit; online: boolean; laeuft: boolean; speichern: (e: Einheit) => void; loeschen: () => void
}) {
  const roh = () => ({ name: einheit.bezeichnung, flaeche: zahlText(einheit.wohnflaeche_m2), personen: zahlText(einheit.personen), fest: zahlText(einheit.fest_prozent) })
  const [f, setF] = useState(roh)
  useEffect(() => setF(roh()), [einheit]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = (k: keyof ReturnType<typeof roh>) => (x: { target: { value: string } }) => setF((a) => ({ ...a, [k]: x.target.value }))
  const ungueltig = [f.flaeche, f.personen, f.fest].some((t) => t.trim() !== '' && !Number.isFinite(zahlOderNull(t))) || !f.name.trim()
  return (
    <div className="seite" style={{ padding: 6, marginBottom: 6 }}>
      <div className="zeile">
        <input aria-label="Bezeichnung der Einheit" value={f.name} onChange={s('name')} style={{ flex: '1 1 140px' }} />
        <input aria-label="Wohnfläche m²" placeholder="m²" inputMode="decimal" value={f.flaeche} onChange={s('flaeche')} style={{ maxWidth: 70 }} />
        <input aria-label="Personen" placeholder="Pers." inputMode="numeric" value={f.personen} onChange={s('personen')} style={{ maxWidth: 60 }} />
        <input aria-label="Fester Anteil %" placeholder="%" inputMode="decimal" value={f.fest} onChange={s('fest')} style={{ maxWidth: 60 }} />
      </div>
      <div className="zeile" style={{ marginTop: 4 }}>
        <button disabled={!online || laeuft || ungueltig} onClick={() => speichern({
          ...einheit, bezeichnung: f.name.trim(), wohnflaeche_m2: zahlOderNull(f.flaeche), personen: zahlOderNull(f.personen), fest_prozent: zahlOderNull(f.fest),
        })}>Speichern</button>
        <button className="zweit" disabled={!online || laeuft} onClick={loeschen}>Löschen</button>
        <span className="klein">m² · Personen · fester % (je nach Schlüssel)</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Einnahmen

function EinnahmenKarte({ objektId, einheiten, einnahmen, online, laeuft, speichern, loeschen }: {
  objektId: string; einheiten: Einheit[]; einnahmen: Einnahme[]; online: boolean; laeuft: boolean
  speichern: (l: Einnahme[]) => void; loeschen: (id: string) => void
}) {
  const [monat, setMonat] = useState(1)
  const [serie, setSerie] = useState(false)
  const [art, setArt] = useState<Einnahme['art']>('Miete')
  const [einheit, setEinheit] = useState('')
  const [betrag, setBetrag] = useState('')
  const [notiz, setNotiz] = useState('')
  const cent = parseBetrag(betrag)
  const monate = serie ? monatsreihe(AKTUELLES_JAHR, monat) : [`${AKTUELLES_JAHR}-${String(monat).padStart(2, '0')}`]
  const doppelt = monate.filter((m) => einnahmen.some((x) => x.monat === m && x.art === art && x.einheit_id === einheit))
  const einheitName = (eid: string) => einheiten.find((u) => u.id === eid)?.bezeichnung ?? (eid ? '?' : '–')
  const gesamt = einnahmen.reduce((s, x) => s + x.betrag_ct, 0)

  return (
    <div className="karte">
      <h2>Einnahmen {AKTUELLES_JAHR}</h2>
      <div className="zeile">
        <label className="feld"><span>Monat<Info zu="Monat" /></span>
          <select value={monat} onChange={(x) => setMonat(Number(x.target.value))}>{MONATE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        </label>
        <label className="feld"><span>Art<Info text="Miete = Kaltmiete, Nebenkosten = Vorauszahlungen bzw. Nachzahlungen der Mieter, Sonstiges = z. B. Stellplatz, Erstattungen." /></span>
          <select value={art} onChange={(x) => setArt(x.target.value as Einnahme['art'])}>
            <option>Miete</option><option>Nebenkosten</option><option>Sonstiges</option>
          </select>
        </label>
        {einheiten.length > 0 && (
          <label className="feld"><span>Einheit<Info zu="Einheit" /></span>
            <select value={einheit} onChange={(x) => setEinheit(x.target.value)}>
              <option value="">– ganzes Objekt –</option>
              {einheiten.map((u) => <option key={u.id} value={u.id}>{u.bezeichnung}</option>)}
            </select>
          </label>
        )}
        <label className="feld"><span>Betrag (€)<Info text="Tatsächlich erhaltener Betrag in Euro, z. B. 650,00. Mit dem Haken „Gleicher Betrag für alle Monate“ wird er für jeden Monat bis Dezember eingetragen." /></span><input inputMode="decimal" value={betrag} placeholder="650,00" onChange={(x) => setBetrag(x.target.value)} style={{ maxWidth: 110 }} /></label>
      </div>
      <label className="feld"><span>Notiz<Info zu="Notiz" /></span><input value={notiz} onChange={(x) => setNotiz(x.target.value)} /></label>
      <label className="wahl" style={{ display: 'block' }}>
        <input type="checkbox" checked={serie} onChange={(x) => setSerie(x.target.checked)} /> Gleicher Betrag für alle Monate ab {MONATE[monat - 1]} bis Dez ({13 - monat} Zeilen)
      </label>
      {betrag && cent === null && <p className="fehler">Betrag ist keine gültige Zahl</p>}
      {doppelt.length > 0 && <p className="warnung">Für {doppelt.length} Monat(e) gibt es schon eine Einnahme dieser Art. Speichern ist trotzdem möglich.</p>}
      <button disabled={!online || laeuft || !cent} onClick={() => {
        speichern(monate.map((m) => ({ id: crypto.randomUUID(), objekt_id: objektId, einheit_id: einheit, monat: m, art, betrag_ct: cent ?? 0, notiz: notiz.trim() })))
        setBetrag(''); setNotiz('')
      }}>Einnahme speichern</button>

      {einnahmen.length > 0 && (
        <table className="belege" style={{ marginTop: 8 }}>
          <thead><tr><th>Monat</th><th>Art</th>{einheiten.length > 0 && <th>Einheit</th>}<th className="betrag">Betrag</th><th></th></tr></thead>
          <tbody>
            {einnahmen.map((x) => (
              <tr key={x.id}>
                <td>{MONATE[Number(x.monat.slice(5, 7)) - 1] ?? x.monat}</td>
                <td>{x.art}{x.notiz ? <div className="klein">{x.notiz}</div> : null}</td>
                {einheiten.length > 0 && <td>{einheitName(x.einheit_id)}</td>}
                <td className="betrag">{formatEuro(x.betrag_ct)}</td>
                <td><button className="zweit" style={{ minHeight: 30, padding: '2px 8px' }} disabled={!online || laeuft} onClick={() => loeschen(x.id)} aria-label="Einnahme löschen">✕</button></td>
              </tr>
            ))}
            <tr><td colSpan={einheiten.length > 0 ? 3 : 2}><strong>Summe</strong></td><td className="betrag"><strong>{formatEuro(gesamt)}</strong></td><td></td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
