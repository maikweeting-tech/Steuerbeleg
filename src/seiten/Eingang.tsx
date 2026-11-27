// Eingang: PDFs aus Steuer/<Jahr>/Eingang_Gmail ansehen und zuordnen – als Beleg (Erfassen) oder als Dokument (Verträge).
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KONFIGURATIONEN } from '../konfig'
import { ladeEingang } from '../daten/eingang'
import { belegCache, beiAenderung, warteschlange } from '../daten/speicher'
import { belegDateiIds, EINGANG_ORDNER, offeneEingaenge, type EingangDatei } from '../fachlich/eingang'
import { istAngemeldet } from '../google/auth'

const JAHRE = Object.keys(KONFIGURATIONEN).map(Number).sort()

export default function Eingang() {
  const navigate = useNavigate()
  const meldung = (useLocation().state as { meldung?: string } | null)?.meldung
  const [alle, setAlle] = useState<EingangDatei[]>([])
  const [erledigt, setErledigt] = useState<Set<string>>(new Set())
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')
  const [vorschau, setVorschau] = useState('')
  const online = istAngemeldet()

  const neuLaden = useCallback(async () => {
    if (!istAngemeldet()) return
    setLaedt(true); setFehler('')
    try { setAlle(await ladeEingang(JAHRE)) } catch (x) { setFehler(x instanceof Error ? x.message : String(x)) } finally { setLaedt(false) }
  }, [])
  useEffect(() => { void neuLaden() }, [neuLaden])

  // Schon zugeordnete Dateien ausblenden: in einem Belegindex eingetragen oder in der Warteschlange
  useEffect(() => {
    const lade = async () => {
      const [w, ...b] = await Promise.all([warteschlange.alle(), ...JAHRE.map((j) => belegCache.lies(j))])
      setErledigt(new Set([...w.map((x) => x.quelle?.id ?? '').filter(Boolean), ...belegDateiIds(b.flat())]))
    }
    void lade()
    return beiAenderung(() => void lade())
  }, [])

  const liste = offeneEingaenge(alle, erledigt)
  const q = (d: EingangDatei) => `eingang=${encodeURIComponent(d.id)}&name=${encodeURIComponent(d.name)}`
  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Eingang</h2>
      {meldung && <p className="ok">{meldung}</p>}
      <div className="karte">
        <p className="klein">PDFs aus „Steuer/&lt;Jahr&gt;/{EINGANG_ORDNER}“ (z. B. aus Gmail). Je Datei: als Beleg erfassen (Zuordnung mit Texterkennung und Stichwort-Vorschlag, die PDF wird in den passenden Belegordner verschoben und in den Belegindex eingetragen) oder als Dokument ablegen (z. B. Kaufvertrag, Mietvertrag).</p>
        <button className="zweit" disabled={!online || laedt} onClick={() => void neuLaden()}>{laedt ? 'Lade …' : 'Neu laden'}</button>
        {!online && <p className="klein">Nur angemeldet und mit Netz.</p>}
        {fehler && <p className="fehler">{fehler}</p>}
      </div>
      {online && !laedt && !fehler && !liste.length && <p className="klein">Keine offenen PDFs im Eingang.</p>}
      {JAHRE.filter((j) => liste.some((d) => d.jahr === j)).map((j) => (
        <div key={j} className="karte">
          <h2>{j} <span className="klein">({liste.filter((d) => d.jahr === j).length} offen)</span></h2>
          <ul className="liste">{liste.filter((d) => d.jahr === j).map((d) => (
            <li key={d.id} style={{ marginBottom: 10 }}>
              <div>{d.name}</div>
              <div className="zeile">
                <button className="zweit" onClick={() => setVorschau(vorschau === d.id ? '' : d.id)}>{vorschau === d.id ? 'Vorschau zu' : 'Vorschau'}</button>
                <button onClick={() => navigate(`/erfassen?${q(d)}`)}>Als Beleg erfassen</button>
                <button className="zweit" onClick={() => navigate(`/dokumente?${q(d)}`)}>Als Dokument ablegen</button>
              </div>
              {vorschau === d.id && <iframe title={`Vorschau ${d.name}`} src={`https://drive.google.com/file/d/${d.id}/preview`} style={{ width: '100%', height: 420, border: '1px solid #ccc', borderRadius: 6, marginTop: 6 }} />}
            </li>
          ))}</ul>
        </div>
      ))}
      <p className="klein">Verschieben darf Google in „Meine Ablage“ nur dem Eigentümer der Datei. Erfasst die andere Person einen Beleg aus dem Eingang, wird ein Auftrag hinterlegt, den die App des Eigentümers beim nächsten Übertragen erledigt. Dokumente bitte vom Eigentümer ablegen lassen.</p>
    </>
  )
}
