// i-Symbol mit kurzer Erklärung: Tippen blendet den Text unter der Beschriftung ein bzw. aus.
import { useState } from 'react'
import { hilfeZu } from '../fachlich/hilfe'

export default function Info({ zu, text }: { zu?: string; text?: string }) {
  const [offen, setOffen] = useState(false)
  const t = text ?? hilfeZu(zu ?? '')
  if (!t) return null
  return (
    <>
      {' '}
      <button type="button" className="info" aria-label="Erklärung" aria-expanded={offen} title="Erklärung"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOffen((o) => !o) }}>i</button>
      {offen && <span className="info-text" role="note">{t}</span>}
    </>
  )
}
