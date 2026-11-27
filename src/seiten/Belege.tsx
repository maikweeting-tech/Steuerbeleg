// Übersicht: wartende (noch nicht übertragene) Belege und der Belegindex des Jahres.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { aktualisiereBelege, starteSync } from '../daten/dienste'
import { warteschlange } from '../daten/speicher'
import { istAngemeldet, starteAnmeldung } from '../google/auth'
import { formatDatum, formatEuro } from '../fachlich/format'
import { useDaten, useStamm } from '../komponenten/hooks'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const modulName = (id: string) => konfig.module.find((m) => m.id === id)?.name.split(' – ')[0] ?? id
const katName = (m: string, k: string) => konfig.module.find((x) => x.id === m)?.kategorien.find((y) => y.schluessel === k)?.name ?? k
const personName = (p: string) => konfig.personen.find((x) => x.id === p)?.name ?? p

export default function Belege() {
  const { wartend, belege, laeuft } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const objektText = (id: string, oid: string) =>
    stamm.aufteilung.some((a) => a.beleg_id === id) ? ' · aufgeteilt' : oid ? ` · ${stamm.objekte.find((o) => o.id === oid)?.bezeichnung ?? 'Objekt?'}` : ''
  const meldung = (useLocation().state as { meldung?: string } | null)?.meldung
  const [fehler, setFehler] = useState('')
  const [lade, setLade] = useState(false)
  const angemeldet = istAngemeldet()

  const aktualisiere = async () => {
    setFehler('')
    setLade(true)
    try {
      await starteSync()
      await aktualisiereBelege(AKTUELLES_JAHR)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLade(false)
    }
  }

  const sortiert = [...belege].sort((a, b) => b.belegnr - a.belegnr)

  return (
    <>
      {meldung && (wartend.length
        ? <p className="ok">{meldung}</p>
        : <p className="ok">✓ Beleg gespeichert und nach Drive übertragen.</p>)}
      {!angemeldet && (
        <p className="warnung">
          Nicht angemeldet. Erfassen geht trotzdem, übertragen wird nach der Anmeldung.{' '}
          <button className="zweit" onClick={() => starteAnmeldung()}>Anmelden</button>
        </p>
      )}
      <div className="zeile" style={{ marginBottom: 14 }}>
        <Link to="/erfassen"><button>+ Beleg erfassen</button></Link>
        <button className="zweit" disabled={!angemeldet || lade || laeuft} onClick={() => void aktualisiere()}>
          {lade || laeuft ? 'Läuft …' : 'Übertragen / Aktualisieren'}
        </button>
      </div>
      {fehler && <p className="fehler">{fehler}</p>}

      {wartend.length > 0 && (
        <div className="karte wartend">
          <h2>Wartet auf Übertragung ({wartend.length})</h2>
          <ul className="liste">
            {wartend.map((w) => (
              <li key={w.id}>
                {formatDatum(w.entwurf.belegdatum)} · {w.entwurf.aussteller} · {formatEuro(w.entwurf.betrag_ct ?? 0)} · {w.seiten} S.
                {w.fehler && <div className="fehler klein">Fehler ({w.versuche}×): {w.fehler}</div>}
                <div>
                  <button className="zweit" style={{ minHeight: 34, padding: '3px 10px', marginTop: 4 }} onClick={() => {
                    if (confirm('Diesen noch nicht übertragenen Beleg endgültig verwerfen?')) void warteschlange.entferne(w.id)
                  }}>Verwerfen</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="karte">
        <h2>Belegindex {AKTUELLES_JAHR} ({belege.length})</h2>
        {belege.length > 0 && <p className="klein">Mit ✎ lässt sich ein Beleg ändern (z. B. Kategorie oder Objekt). Die PDF wird dabei mit verschoben.</p>}
        {!belege.length && <p className="klein">Noch keine Belege geladen. „Übertragen / Aktualisieren“ liest den Belegindex aus Drive.</p>}
        {belege.length > 0 && (
          <table className="belege">
            <thead><tr><th>Nr.</th><th>Datum</th><th>Aussteller / Zuordnung</th><th className="betrag">Betrag</th></tr></thead>
            <tbody>
              {sortiert.map((b) => (
                <tr key={b.id}>
                  <td>{b.belegnr}<br /><Link to={`/belege/${b.id}`} className="klein-knopf" aria-label={`Beleg ${b.belegnr} bearbeiten`}>✎</Link></td>
                  <td>{formatDatum(b.belegdatum)}</td>
                  <td>
                    {b.datei_ids ? <a href={`https://drive.google.com/file/d/${b.datei_ids.split(',')[0]}/view`} target="_blank" rel="noreferrer">{b.aussteller}</a> : b.aussteller}
                    <div className="klein">{modulName(b.modul)}{b.kategorie ? ` · ${katName(b.modul, b.kategorie)}` : ''}{objektText(b.id, b.objekt_id)}{b.kind_id ? ` · ${stamm.kinder.find((k) => k.id === b.kind_id)?.name ?? 'Kind?'}` : ''} · {personName(b.person)}{b.status !== 'offen' ? ` · ${b.status}` : ''}{stamm.pdfOffen.includes(b.id) ? ' · ⏳ PDF wird noch verschoben' : ''}</div>
                  </td>
                  <td className="betrag">{formatEuro(b.betrag_ct ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
