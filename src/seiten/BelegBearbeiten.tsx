// E14: Beleg nachträglich ändern (Angaben, Zuordnung). Die PDF wird umbenannt bzw. verschoben.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { pruefePflicht, type BelegEntwurf } from '../fachlich/beleg'
import { formatEuro, parseBetrag } from '../fachlich/format'
import { aendereBelegOnline } from '../daten/dienste'
import { aenderungen, entwurfAus } from '../daten/bearbeiten'
import { useDaten, useStamm } from '../komponenten/hooks'
import BelegFelder from '../komponenten/BelegFelder'
import { istAngemeldet } from '../google/auth'

const centText = (c: number | null) => (c === null ? '' : formatEuro(c).replace(/\s?€/, ''))

export default function BelegBearbeiten() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { belege } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const alt = belege.find((b) => b.id === id)
  const altAufteilung = useMemo(() => stamm.aufteilung.filter((a) => a.beleg_id === id), [stamm.aufteilung, id])
  const [e, setE0] = useState<BelegEntwurf | null>(null)
  const [betragText, setBetragText] = useState('')
  const [zahlungGeaendert, setZahlungGeaendert] = useState(true)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  const online = istAngemeldet() && navigator.onLine

  // Formular einmal mit dem gespeicherten Stand füllen
  useEffect(() => {
    if (alt && !e) { setE0(entwurfAus(alt, altAufteilung)); setBetragText(centText(alt.betrag_ct)) }
  }, [alt, altAufteilung, e])

  if (!alt) return <p>Beleg nicht gefunden. <Link to="/belege">Zur Liste</Link></p>
  if (!e) return null
  const setE = (f: (a: BelegEntwurf) => BelegEntwurf) => setE0((a) => (a ? f(a) : a))

  const fehlerListe = pruefePflicht(e, KONFIGURATIONEN, stamm.objekte.some((o) => o.aktiv), stamm.kinder.length > 0)
  if (betragText && parseBetrag(betragText) === null) fehlerListe.unshift('Betrag ist keine gültige Zahl (z. B. 412,50)')
  const liste = aenderungen(alt, altAufteilung, e)

  const speichere = async () => {
    setFehler('')
    setLaeuft(true)
    try {
      await aendereBelegOnline(AKTUELLES_JAHR, alt, e)
      navigate('/belege', { state: { meldung: `✓ Beleg Nr. ${alt.belegnr} geändert (${liste.length} Feld${liste.length === 1 ? '' : 'er'}).` } })
    } catch (x) {
      setFehler(x instanceof Error ? x.message : String(x))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <>
      <p><Link to="/belege">← Belege</Link></p>
      <div className="karte">
        <h2>Beleg Nr. {alt.belegnr} bearbeiten</h2>
        <p className="klein">
          {alt.datei_ids ? <a href={`https://drive.google.com/file/d/${alt.datei_ids.split(',')[0]}/view`} target="_blank" rel="noreferrer">PDF ansehen</a> : 'ohne PDF'}
          {' · '}{alt.dateiname}<br />
          zuletzt geändert von {alt.geaendert_von || '–'}, Version {alt.version}
        </p>
        <BelegFelder e={e} setE={setE} betragText={betragText} setBetragText={setBetragText} zahlungGeaendert={zahlungGeaendert}
          setZahlungGeaendert={setZahlungGeaendert} aussteller={[...new Set(belege.map((b) => b.aussteller))].sort()} stamm={stamm} jahrFest />
      </div>
      {fehlerListe.length > 0 && <div className="fehler karte"><strong>Bitte ergänzen:</strong><ul className="liste">{fehlerListe.map((f) => <li key={f}>{f}</li>)}</ul></div>}
      {liste.length > 0 && <p className="klein">Geändert: {liste.map(([f]) => f).join(', ')}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {!online && <p className="klein">Ändern geht nur angemeldet und mit Netz.</p>}
      <div className="zeile">
        <button disabled={laeuft || !online || fehlerListe.length > 0 || !liste.length} onClick={() => void speichere()}>{laeuft ? 'Speichere …' : 'Änderung speichern'}</button>
        <button className="zweit" disabled={laeuft} onClick={() => navigate('/belege')}>Abbrechen</button>
      </div>
      <p className="klein">Das Steuerjahr und die Seiten der PDF lassen sich hier nicht ändern. Jede Änderung steht im Blatt „Protokoll“.</p>
    </>
  )
}
