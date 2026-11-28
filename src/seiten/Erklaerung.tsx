// S1: Steuererklärungs-Assistent – Fragen je Bereich, Antworten im Belegindex (Blatt „Erklaerung“).
// Vorbereitung für die Steuerberatung, keine Steuerberechnung, keine Übermittlung.
import { useEffect, useState } from 'react'
import { AKTUELLES_JAHR } from '../konfig'
import { speichereAntwort } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import { Link } from 'react-router-dom'
import { istAngemeldet } from '../google/auth'
import {
  anzeigeWert, bereiche, kontextAus, fortschritt, gesamtFortschritt, hinweisText, klaeren, naechsteOffene, sichtbar, unterlagen, WEISS_NICHT,
  type Antwort, type Frage,
} from '../fachlich/assistent'
import Info from '../komponenten/Info'

const JN = [{ wert: 'ja', name: 'Ja' }, { wert: 'nein', name: 'Nein' }, { wert: WEISS_NICHT, name: 'Weiß nicht' }]

function FrageKarte({ f, a, hinweis, aktiv, online, speichere }: { f: Frage; a?: Antwort; hinweis: string; aktiv: boolean; online: boolean; speichere: (wert: string, notiz: string) => Promise<void> }) {
  const [text, setText] = useState(a?.wert ?? '')
  const [notiz, setNotiz] = useState(a?.notiz ?? '')
  useEffect(() => { setText(a?.wert ?? ''); setNotiz(a?.notiz ?? '') }, [a])
  const wert = a?.wert ?? ''
  const optionen = f.typ === 'ja_nein' ? JN : f.optionen
  return (
    <div className="karte" style={aktiv ? { outline: '2px solid var(--blau)' } : undefined}>
      <p><strong>{f.frage}</strong><Info text={f.erklaerung} /> {wert && <span className="ok">✓</span>}</p>
      {optionen ? (
        <div className="zeile">
          {optionen.map((o) => (
            <button key={o.wert} className={wert === o.wert ? '' : 'zweit'} disabled={!online} onClick={() => void speichere(o.wert, notiz)}>{o.name}</button>
          ))}
        </div>
      ) : (
        <div className="zeile">
          <input type={f.typ === 'datum' ? 'date' : 'text'} inputMode={f.typ === 'betrag' ? 'decimal' : undefined} value={text} onChange={(e) => setText(e.target.value)} />
          <button disabled={!online || text === wert} onClick={() => void speichere(text.trim(), notiz)}>Speichern</button>
        </div>
      )}
      {f.vorschlag && !wert && (
        <p className="klein">Vorschlag: <strong>{anzeigeWert(f, f.vorschlag)}</strong>{' '}
          <button className="zweit" style={{ minHeight: 28, padding: '1px 8px' }} disabled={!online} onClick={() => void speichere(f.vorschlag!, notiz)}>übernehmen</button>
        </p>
      )}
      {f.info && <p className="klein">{f.info}</p>}
      {hinweis && <p className="warnung klein">{hinweis}</p>}
      {f.unterlage && wert === 'ja' && <p className="klein">📄 Unterlage für die Steuerberatung: <strong>{f.unterlage.name}</strong></p>}
      <label className="feld" style={{ marginTop: 6 }}><span className="klein">Notiz (optional)<Info zu="Notiz (optional)" /></span>
        <input value={notiz} onChange={(e) => setNotiz(e.target.value)} onBlur={() => { if (notiz !== (a?.notiz ?? '') && online) void speichere(wert, notiz) }} />
      </label>
      {f.formular !== '–' && <p className="klein" style={{ color: '#666' }}>Formular: {f.formular} – Zeile bitte prüfen</p>}
    </div>
  )
}

export default function Erklaerung() {
  const stamm = useStamm(AKTUELLES_JAHR)
  const { belege } = useDaten(AKTUELLES_JAHR)
  const online = istAngemeldet()
  const a = stamm.antworten
  const liste = bereiche(AKTUELLES_JAHR, a, kontextAus(AKTUELLES_JAHR, stamm.objekte, stamm.einnahmen, belege))
  const [offenId, setOffenId] = useState<string | null>(null)
  const offen = liste.find((b) => b.id === offenId) ?? null
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  const g = gesamtFortschritt(liste, a)

  const speichere = async (id: string, wert: string, notiz: string) => {
    setFehler(''); setLaeuft(true)
    try { await speichereAntwort(AKTUELLES_JAHR, id, wert, notiz) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }

  if (offen) {
    const naechste = naechsteOffene(offen, a)
    const p = fortschritt(offen, a)
    return (
      <>
        <button className="zweit" onClick={() => setOffenId(null)}>← Alle Bereiche</button>
        <h2 style={{ fontSize: '1.15rem' }}>{offen.name} {AKTUELLES_JAHR}</h2>
        <p className="klein">{offen.beschreibung} – {p.fertig} von {p.gesamt} beantwortet.</p>
        {offen.fragen.filter((f) => sichtbar(f, a)).map((f) => (
          <FrageKarte key={f.id} f={f} a={a[f.id]} hinweis={hinweisText(f, a)} aktiv={naechste?.id === f.id} online={online && !laeuft} speichere={(w, n) => speichere(f.id, w, n)} />
        ))}
        {!naechste && <p className="ok">Alle Fragen in diesem Bereich beantwortet.</p>}
        {laeuft && <p className="klein">Speichere …</p>}
        {fehler && <p className="fehler">{fehler}</p>}
        {!online && <p className="klein">Antworten speichern geht nur angemeldet und mit Netz.</p>}
      </>
    )
  }

  const unt = unterlagen(liste, a)
  const kl = klaeren(liste, a)
  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Steuererklärung {AKTUELLES_JAHR} vorbereiten</h2>
      <div className="karte">
        <p className="klein">Der Assistent fragt Bereich für Bereich ab, was die Steuerberatung braucht. Er rechnet keine Steuer aus und übermittelt nichts. Formulare und Zeilen sind nur Hinweise (prüfen).</p>
        <p><strong>{g.fertig} von {g.gesamt}</strong> Fragen beantwortet{g.unklar ? `, ${g.unklar} „weiß nicht“` : ''}.</p>
        <p className="klein">Fertig? Unter <Link to="/export">Export</Link> die „Ausfüllhilfe für die Steuerberatung (PDF)“ erstellen.</p>
      </div>
      {liste.map((b) => {
        const p = fortschritt(b, a)
        return (
          <div key={b.id} className="karte">
            <h2>{b.name}</h2>
            <p className="klein">{b.beschreibung}</p>
            {b.folgt ? <p className="klein">Kommt in einem der nächsten Schritte.</p> : (
              <div className="zeile">
                <button className={p.offen ? '' : 'zweit'} onClick={() => setOffenId(b.id)}>{p.offen ? `Weiter (${p.offen} offen)` : 'Ansehen'}</button>
                <span className={p.offen ? 'klein' : 'ok'}>{p.fertig} / {p.gesamt}</span>
              </div>
            )}
          </div>
        )
      })}
      {unt.length > 0 && (
        <div className="karte">
          <h2>Unterlagen für die Steuerberatung ({unt.length})</h2>
          <ul className="liste">{unt.map((u) => <li key={u.frage}>{u.name} <span className="klein">({u.bereich})</span></li>)}</ul>
        </div>
      )}
      {kl.length > 0 && (
        <div className="karte">
          <h2>Mit der Steuerberatung klären ({kl.length})</h2>
          <ul className="liste">{kl.map((k) => <li key={k.frage}>{k.text}</li>)}</ul>
        </div>
      )}
    </>
  )
}
