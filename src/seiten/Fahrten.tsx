// Anlage N: Arbeitstage/Homeoffice-Tage zählen (E3) und Fahrtenbuch je Person.
// Es wird nur gezählt. Pauschalsätze aus der Konfiguration werden angezeigt, aber nicht multipliziert.
import { useEffect, useState } from 'react'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { loescheFahrt, speichereArbeitstage, speichereFahrten } from '../daten/dienste'
import { useStamm } from '../komponenten/hooks'
import { FAHRTZWECKE, leereArbeitstage, pruefeFahrt, zaehle, type Arbeitstage, type Fahrt, type Fahrtzweck } from '../fachlich/personen'
import { formatDatum } from '../fachlich/format'
import { istAngemeldet } from '../google/auth'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const zahl = (n: number | null) => (n === null ? '–' : n.toLocaleString('de-DE', { maximumFractionDigits: 1 }))
const zahlOderNull = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')))
const WERTE = ['entfernungspauschale', 'homeoffice_tagespauschale', 'homeoffice_hoechsttage', 'dienstreise_km_satz_pkw']

export default function Fahrten() {
  const stamm = useStamm(AKTUELLES_JAHR)
  const [person, setPerson] = useState(konfig.personen[0]?.id ?? '')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  const [ok, setOk] = useState('')
  const online = istAngemeldet()

  const gespeichert = stamm.arbeitstage.find((a) => a.person === person)
  const hoechst = konfig.werte.homeoffice_hoechsttage?.wert
  const z = zaehle(person, gespeichert, stamm.fahrten, typeof hoechst === 'number' ? hoechst : null)
  const fahrten = stamm.fahrten.filter((f) => f.person === person).sort((a, b) => b.datum.localeCompare(a.datum))

  const aufgabe = async (f: () => Promise<unknown>, meldung: string) => {
    setFehler(''); setOk(''); setLaeuft(true)
    try { await f(); setOk(meldung) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Anlage N – Tage und Fahrten {AKTUELLES_JAHR}</h2>
      <div className="zeile">
        {konfig.personen.map((p) => (
          <label key={p.id} className="wahl"><input type="radio" name="np" checked={person === p.id} onChange={() => { setPerson(p.id); setOk('') }} /> {p.name}</label>
        ))}
      </div>

      <TageKarte key={person + (gespeichert ? JSON.stringify(gespeichert) : '')} person={person} gespeichert={gespeichert} online={online} laeuft={laeuft}
        speichern={(a) => void aufgabe(() => speichereArbeitstage(AKTUELLES_JAHR, a), 'Tage gespeichert.')} />

      <div className="karte">
        <h2>Zähler</h2>
        <div className="zaehler">
          <span>Arbeitstage an der Tätigkeitsstätte</span><span className="wert">{z.arbeitstage}</span>
          <span>Homeoffice-Tage</span><span className="wert">{z.homeoffice_tage}</span>
          <span>Entfernung (einfach)</span><span className="wert">{zahl(z.entfernung_km)} km</span>
          <span>Arbeitstage × Entfernung</span><span className="wert">{zahl(z.entfernungs_km_summe)} km</span>
          {FAHRTZWECKE.filter((w) => w !== 'Arbeitsweg').map((w) => (
            <span key={w} style={{ display: 'contents' }}><span>Fahrtenbuch {w}</span><span className="wert">{zahl(z.km_je_zweck[w])} km</span></span>
          ))}
        </div>
        {z.hinweise.map((h) => <p key={h} className="warnung">{h}</p>)}
        <details style={{ marginTop: 8 }}>
          <summary className="klein">Sätze aus der Konfiguration (nur Anzeige, keine Berechnung)</summary>
          <ul className="liste klein">
            {WERTE.map((k) => {
              const w = konfig.werte[k]
              return <li key={k}>{k}: {w?.wert ?? 'nicht eingetragen'} {w?.einheit} – Status „{w?.status ?? 'prüfen'}“</li>
            })}
          </ul>
        </details>
      </div>

      <FahrtKarte person={person} online={online} laeuft={laeuft}
        speichern={(l) => void aufgabe(() => speichereFahrten(AKTUELLES_JAHR, l), `${l.length} Fahrt(en) gespeichert.`)} />

      <div className="karte">
        <h2>Fahrtenbuch ({fahrten.length})</h2>
        {fahrten.length ? (
          <table className="belege">
            <thead><tr><th>Datum</th><th>Ziel / Zweck</th><th className="betrag">km</th><th></th></tr></thead>
            <tbody>
              {fahrten.map((f) => (
                <tr key={f.id}>
                  <td>{formatDatum(f.datum)}</td>
                  <td>{f.start ? `${f.start} → ` : ''}{f.ziel}<div className="klein">{f.zweck}{f.fahrzeug ? ` · ${f.fahrzeug}` : ''}</div></td>
                  <td className="betrag">{zahl(f.km)}</td>
                  <td><button className="zweit" style={{ minHeight: 30, padding: '2px 8px' }} disabled={!online || laeuft} aria-label="Fahrt löschen"
                    onClick={() => void aufgabe(() => loescheFahrt(AKTUELLES_JAHR, f.id), 'Fahrt gelöscht.')}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="klein">Noch keine Fahrten. Den täglichen Arbeitsweg nicht einzeln eintragen, dafür gibt es oben die Arbeitstage.</p>}
      </div>

      {laeuft && <p className="klein">Speichere …</p>}
      {ok && !laeuft && <p className="ok">{ok}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {!online && <p className="klein">Speichern geht nur angemeldet und mit Netz.</p>}
    </>
  )
}

function Zaehlfeld({ label, wert, setze }: { label: string; wert: number; setze: (n: number) => void }) {
  return (
    <div className="feld">
      <span style={{ display: 'block', fontSize: '0.9rem' }}>{label}</span>
      <div className="zeile">
        <button className="zweit" onClick={() => setze(Math.max(0, wert - 1))} aria-label={`${label} minus 1`}>−1</button>
        <input aria-label={label} inputMode="numeric" style={{ maxWidth: 80, textAlign: 'right' }} value={wert}
          onChange={(x) => setze(Math.max(0, Math.floor(Number(x.target.value) || 0)))} />
        <button className="zweit" onClick={() => setze(wert + 1)} aria-label={`${label} plus 1`}>+1</button>
      </div>
    </div>
  )
}

function TageKarte({ person, gespeichert, online, laeuft, speichern }: {
  person: string; gespeichert: Arbeitstage | undefined; online: boolean; laeuft: boolean; speichern: (a: Arbeitstage) => void
}) {
  const [a, setA] = useState<Arbeitstage>(() => gespeichert ?? leereArbeitstage(person, AKTUELLES_JAHR))
  const [km, setKm] = useState(() => (a.entfernung_km === null ? '' : String(a.entfernung_km).replace('.', ',')))
  useEffect(() => setA((x) => ({ ...x, entfernung_km: zahlOderNull(km) })), [km])
  const geaendert = JSON.stringify(a) !== JSON.stringify(gespeichert ?? leereArbeitstage(person, AKTUELLES_JAHR))
  const kmFalsch = km.trim() !== '' && !Number.isFinite(zahlOderNull(km))
  return (
    <div className="karte">
      <h2>Arbeitstage und Homeoffice</h2>
      <Zaehlfeld label="Arbeitstage an der Tätigkeitsstätte" wert={a.arbeitstage} setze={(n) => setA((x) => ({ ...x, arbeitstage: n }))} />
      <Zaehlfeld label="Homeoffice-Tage" wert={a.homeoffice_tage} setze={(n) => setA((x) => ({ ...x, homeoffice_tage: n }))} />
      <label className="feld"><span>Entfernung Wohnung – erste Tätigkeitsstätte, einfach (km)</span>
        <input inputMode="decimal" style={{ maxWidth: 100 }} value={km} onChange={(x) => setKm(x.target.value)} />
      </label>
      {kmFalsch && <p className="fehler">Entfernung keine gültige Zahl</p>}
      <button disabled={!online || laeuft || !geaendert || kmFalsch} onClick={() => speichern({ ...a, person, jahr: AKTUELLES_JAHR })}>Tage speichern</button>
      {geaendert && <span className="klein"> nicht gespeichert</span>}
      <p className="klein">Tipp: einmal im Monat nachtragen (Kalender/Zeiterfassung). Tage, an denen du im Homeoffice und im Büro warst, bitte selbst zuordnen (prüfen).</p>
    </div>
  )
}

function FahrtKarte({ person, online, laeuft, speichern }: { person: string; online: boolean; laeuft: boolean; speichern: (l: Fahrt[]) => void }) {
  const leer = (): Fahrt => ({ id: '', person, datum: '', start: '', ziel: '', km: 0, zweck: 'Dienstreise', fahrzeug: '' })
  const [f, setF] = useState<Fahrt>(leer)
  const [kmText, setKmText] = useState('')
  const [hinUndZurueck, setHinUndZurueck] = useState(true)
  const km = (zahlOderNull(kmText) ?? 0) * (hinUndZurueck ? 2 : 1)
  const fehler = pruefeFahrt({ ...f, person, km })
  const [versucht, setVersucht] = useState(false)
  const s = (k: keyof Fahrt) => (x: { target: { value: string } }) => setF((a) => ({ ...a, [k]: x.target.value }))
  return (
    <div className="karte">
      <h2>Fahrt eintragen</h2>
      <div className="zeile" style={{ alignItems: 'flex-start' }}>
        <label className="feld"><span>Datum *</span><input type="date" value={f.datum} onChange={s('datum')} /></label>
        <label className="feld"><span>Zweck</span>
          <select value={f.zweck} onChange={(x) => setF((a) => ({ ...a, zweck: x.target.value as Fahrtzweck }))}>
            {FAHRTZWECKE.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
      </div>
      <label className="feld"><span>Start</span><input value={f.start} onChange={s('start')} placeholder="z. B. Kalkar" /></label>
      <label className="feld"><span>Ziel *</span><input value={f.ziel} onChange={s('ziel')} placeholder="z. B. Baustelle Kleve, Schulung Düsseldorf" /></label>
      <div className="zeile">
        <label className="feld"><span>km (einfach) *</span><input inputMode="decimal" style={{ maxWidth: 90 }} value={kmText} onChange={(x) => setKmText(x.target.value)} /></label>
        <label className="feld"><span>Fahrzeug</span><input value={f.fahrzeug} onChange={s('fahrzeug')} placeholder="z. B. privater Pkw" /></label>
      </div>
      <label className="wahl" style={{ display: 'block' }}><input type="checkbox" checked={hinUndZurueck} onChange={(x) => setHinUndZurueck(x.target.checked)} /> Hin und zurück (km × 2 = {zahl(km)} km)</label>
      {versucht && fehler.map((x) => <p key={x} className="fehler">{x}</p>)}
      <button disabled={!online || laeuft} onClick={() => {
        setVersucht(true)
        if (fehler.length) return
        speichern([{ ...f, id: crypto.randomUUID(), person, km, start: f.start.trim(), ziel: f.ziel.trim(), fahrzeug: f.fahrzeug.trim() }])
        setF({ ...leer(), zweck: f.zweck, fahrzeug: f.fahrzeug, start: f.start }); setKmText(''); setVersucht(false)
      }}>Fahrt speichern</button>
    </div>
  )
}
