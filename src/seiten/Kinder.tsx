// Anlage Kind: Kinder anlegen (Name wird Ordnername unter „Kind“).
import { useState } from 'react'
import { AKTUELLES_JAHR } from '../konfig'
import { speichereKind } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import { formatDatum, parseDatum } from '../fachlich/format'
import { istAngemeldet } from '../google/auth'
import Info from '../komponenten/Info'

export default function Kinder() {
  const stamm = useStamm(AKTUELLES_JAHR)
  const { belege } = useDaten(AKTUELLES_JAHR)
  const [name, setName] = useState('')
  const [geb, setGeb] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  const online = istAngemeldet()
  const gebIso = geb.trim() ? parseDatum(geb) : ''

  const aufgabe = async (f: () => Promise<unknown>) => {
    setFehler(''); setLaeuft(true)
    try { await f() } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Kinder</h2>
      <div className="karte">
        {stamm.kinder.map((k) => {
          const n = belege.filter((b) => b.kind_id === k.id).length
          return (
            <div key={k.id} className="zeile" style={{ justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '6px 0' }}>
              <span><strong>{k.name}</strong>{k.geburtsdatum ? ` · geb. ${formatDatum(k.geburtsdatum)}` : ''} <span className="klein">· {n} Beleg(e)</span></span>
              <button className="zweit" disabled={!online || laeuft || n > 0} title={n ? 'Es gibt noch Belege zu diesem Kind' : ''}
                onClick={() => void aufgabe(() => speichereKind(AKTUELLES_JAHR, k, true))}>Löschen</button>
            </div>
          )
        })}
        {!stamm.kinder.length && <p className="klein">Noch keine Kinder angelegt.</p>}
      </div>
      <div className="karte">
        <h2>Kind anlegen</h2>
        <label className="feld"><span>Vorname (wird Ordnername, später nicht mehr ändern)<Info zu="Vorname (wird Ordnername, später nicht mehr ändern)" /></span><input value={name} onChange={(x) => setName(x.target.value)} /></label>
        <label className="feld"><span>Geburtsdatum (TT.MM.JJJJ, optional)<Info zu="Geburtsdatum (TT.MM.JJJJ, optional)" /></span><input value={geb} onChange={(x) => setGeb(x.target.value)} /></label>
        {gebIso === null && <p className="fehler">Datum als TT.MM.JJJJ</p>}
        <button disabled={!online || laeuft || !name.trim() || gebIso === null} onClick={() => void aufgabe(async () => {
          if (stamm.kinder.some((k) => k.name.trim().toLowerCase() === name.trim().toLowerCase())) throw new Error('Ein Kind mit diesem Namen gibt es schon.')
          await speichereKind(AKTUELLES_JAHR, { id: crypto.randomUUID(), name: name.trim(), geburtsdatum: gebIso || '' })
          setName(''); setGeb('')
        })}>Anlegen</button>
        {!online && <p className="klein">Anlegen geht nur angemeldet und mit Netz.</p>}
        <p className="klein">Namen und Geburtsdaten stehen nur in eurem Belegindex in Google Drive, nicht in der App.</p>
      </div>
      {fehler && <p className="fehler">{fehler}</p>}
    </>
  )
}
