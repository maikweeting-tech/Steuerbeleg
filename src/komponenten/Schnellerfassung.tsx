// Schnellster Weg zum Beleg: Kamera öffnet sofort, danach geht es direkt ins Formular.
import { useNavigate } from 'react-router-dom'
import { merkeVor } from '../erfassung/uebergabe'

function useWeiter() {
  const navigate = useNavigate()
  return (liste: FileList | null) => {
    const d = [...(liste ?? [])]
    if (!d.length) return
    merkeVor(d)
    navigate(`/erfassen?neu=${Date.now()}`)
  }
}

/** Runder Kameraknopf unten rechts (auf allen Seiten außer „Erfassen“). */
export function KameraKnopf() {
  const weiter = useWeiter()
  return (
    <label className="fab" title="Beleg fotografieren" aria-label="Beleg fotografieren">
      <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { weiter(e.target.files); e.target.value = '' }} />
      <span aria-hidden="true">📷</span>
    </label>
  )
}

/** Große Knöpfe für die Startseite. */
export function GrosseKnoepfe() {
  const weiter = useWeiter()
  return (
    <div className="gross-knoepfe">
      <label className="gross">
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { weiter(e.target.files); e.target.value = '' }} />
        <span>📷 Beleg fotografieren</span>
      </label>
      <label className="gross zweit">
        <input type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { weiter(e.target.files); e.target.value = '' }} />
        <span>📄 Datei / PDF wählen</span>
      </label>
    </div>
  )
}
