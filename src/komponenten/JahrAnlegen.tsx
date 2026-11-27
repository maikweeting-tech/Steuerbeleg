// Hinweis mit Knopf, wenn das gewählte Steuerjahr in Drive noch nicht angelegt ist (Ordner + Belegindex).
// Steht über jeder Seite, damit niemand den Knopf in der eingeklappten Einrichtung suchen muss.
import { useEffect, useState } from 'react'
import { AKTUELLES_JAHR } from '../konfig'
import { jahrAngelegt, legeJahrAn } from '../daten/dienste'

export default function JahrAnlegen() {
  const [fehlt, setFehlt] = useState(false)
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  useEffect(() => {
    let aktiv = true
    void jahrAngelegt(AKTUELLES_JAHR).then((x) => { if (aktiv) setFehlt(x === false) })
    return () => { aktiv = false }
  }, [])
  if (!fehlt) return null
  const anlegen = async () => {
    setFehler(''); setLaeuft('Lege an …')
    try { await legeJahrAn(AKTUELLES_JAHR, setLaeuft); setFehlt(false) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft('') }
  }
  return (
    <div className="warnung">
      <p><strong>Steuerjahr {AKTUELLES_JAHR} ist in Drive noch nicht angelegt.</strong> Die App legt im Ordner „Steuer“ den Ordner {AKTUELLES_JAHR} mit allen Unterordnern und den Belegindex an.</p>
      <button disabled={!!laeuft} onClick={() => void anlegen()}>{laeuft ? 'Lege an …' : `Jahr ${AKTUELLES_JAHR} anlegen`}</button>
      {laeuft && <p className="klein">{laeuft}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
    </div>
  )
}
