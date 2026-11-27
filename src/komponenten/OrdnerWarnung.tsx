// Hinweis auf „Belege“: kein Ordner verbunden, oder eigener Ordner verbunden, obwohl ein freigegebener existiert.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gespeicherteWurzel } from '../daten/einrichtung'
import { datei, findeWurzeln } from '../google/drive'
import { istAngemeldet } from '../google/auth'

type Zustand = { art: 'ok' } | { art: 'keiner' } | { art: 'eigener'; von: string }

export default function OrdnerWarnung() {
  const [z, setZ] = useState<Zustand>({ art: 'ok' })
  useEffect(() => {
    if (!istAngemeldet()) return
    let aktiv = true
    const id = gespeicherteWurzel()
    const pruefe = async (): Promise<Zustand> => {
      if (!id) return { art: 'keiner' }
      const w = await datei(id)
      if (!w.ownedByMe) return { art: 'ok' }
      const fremd = (await findeWurzeln()).filter((d) => !d.ownedByMe)
      if (!fremd.length) return { art: 'ok' }
      const o = fremd[0].owners?.[0]
      return { art: 'eigener', von: o?.displayName ?? o?.emailAddress ?? 'anderer Person' }
    }
    pruefe().then((r) => { if (aktiv) setZ(r) }).catch(() => undefined)
    return () => { aktiv = false }
  }, [])
  if (z.art === 'ok') return null
  return (
    <div className="warnung">
      {z.art === 'keiner'
        ? <>Kein Ordner „Steuer“ verbunden. </>
        : <><strong>Achtung:</strong> Hier ist dein eigener Ordner „Steuer“ verbunden, nicht der gemeinsame von {z.von}. </>}
      <Link to="/?ordner=wechseln">Ordner wechseln</Link>
    </div>
  )
}
