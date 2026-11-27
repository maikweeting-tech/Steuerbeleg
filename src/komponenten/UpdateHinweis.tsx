// Zeigt einen Hinweis, sobald eine neue App-Version geladen ist. Neu geladen wird erst auf Tipp,
// damit eine angefangene Erfassung (Fotos, Eingaben) nicht verloren geht.
import { useEffect, useState } from 'react'

export default function UpdateHinweis() {
  const [neu, setNeu] = useState(false)
  useEffect(() => {
    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null
    if (!sw) return
    // Beim allerersten Start übernimmt der Service Worker die Seite ebenfalls – das ist kein Update
    const hatteVersion = !!sw.controller
    const wechsel = () => { if (hatteVersion) setNeu(true) }
    sw.addEventListener('controllerchange', wechsel)
    // Beim Öffnen und bei jeder Rückkehr in die App nach einer neuen Version fragen
    const pruefe = () => { if (document.visibilityState === 'visible') void sw.getRegistration().then((r) => r?.update()).catch(() => undefined) }
    pruefe()
    document.addEventListener('visibilitychange', pruefe)
    return () => { sw.removeEventListener('controllerchange', wechsel); document.removeEventListener('visibilitychange', pruefe) }
  }, [])
  if (!neu) return null
  return (
    <div className="warnung zeile" style={{ justifyContent: 'space-between' }} role="status">
      <span>Neue Version der App ist da.</span>
      <button onClick={() => location.reload()}>Jetzt neu laden</button>
    </div>
  )
}
