// Zuschneiden per Fingertipp: vier Ecken ziehen. Arbeitet mit Anteilen 0…1 des gedrehten Bildes.
import { useEffect, useRef, useState } from 'react'
import { alsJpeg, begrenze, rendere, VOLL, type Rechteck, type Seite } from '../erfassung/bild'

type Ecke = 'lo' | 'ro' | 'lu' | 'ru'

export default function Zuschnitt({ seite, fertig }: { seite: Seite; fertig: (r: Rechteck | null) => void }) {
  const [url, setUrl] = useState('')
  const [r, setR] = useState<Rechteck>(seite.zuschnitt)
  const box = useRef<HTMLDivElement>(null)
  const zieht = useRef<Ecke | null>(null)

  useEffect(() => {
    let u = ''
    void rendere({ ...seite, zuschnitt: VOLL, filter: 'original' }, 1200).then(alsJpeg).then((b) => { u = URL.createObjectURL(b); setUrl(u) })
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [seite])

  const bewege = (e: React.PointerEvent) => {
    if (!zieht.current || !box.current) return
    const g = box.current.getBoundingClientRect()
    const px = Math.min(1, Math.max(0, (e.clientX - g.left) / g.width))
    const py = Math.min(1, Math.max(0, (e.clientY - g.top) / g.height))
    setR((a) => {
      let { x, y } = a
      let x2 = a.x + a.b
      let y2 = a.y + a.h
      if (zieht.current!.includes('l')) x = Math.min(px, x2 - 0.05); else x2 = Math.max(px, x + 0.05)
      if (zieht.current!.includes('o')) y = Math.min(py, y2 - 0.05); else y2 = Math.max(py, y + 0.05)
      return begrenze({ x, y, b: x2 - x, h: y2 - y })
    })
  }

  const ecke = (k: Ecke) => {
    const left = k.includes('l') ? r.x : r.x + r.b
    const top = k.includes('o') ? r.y : r.y + r.h
    return (
      <div
        key={k}
        className="griff"
        style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
        onPointerDown={(e) => { zieht.current = k; (e.target as HTMLElement).setPointerCapture(e.pointerId) }}
      />
    )
  }

  return (
    <div className="karte">
      <h2>Zuschneiden</h2>
      <p className="klein">Ecken an die Kanten des Belegs ziehen.</p>
      {url ? (
        <div className="zuschnitt" ref={box} onPointerMove={bewege} onPointerUp={() => (zieht.current = null)}>
          <img src={url} alt="Beleg" draggable={false} />
          <div className="rahmen" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.b * 100}%`, height: `${r.h * 100}%` }} />
          {(['lo', 'ro', 'lu', 'ru'] as Ecke[]).map(ecke)}
        </div>
      ) : <p>Bild wird geladen …</p>}
      <div className="zeile" style={{ marginTop: 10 }}>
        <button onClick={() => fertig(r)}>Übernehmen</button>
        <button className="zweit" onClick={() => setR(VOLL)}>Ganzes Bild</button>
        <button className="zweit" onClick={() => fertig(null)}>Abbrechen</button>
      </div>
    </div>
  )
}
