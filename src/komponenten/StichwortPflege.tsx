// Eigene Stichwörter für die automatische Zuordnung beim Erfassen (Blatt „Stichwoerter“ im Belegindex).
import { useState } from 'react'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { speichereStichwort } from '../daten/dienste'
import { STANDARD_STICHWOERTER, type Stichwort } from '../fachlich/zuordnung'
import { istAngemeldet } from '../google/auth'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const name = (s: Stichwort) => {
  const m = konfig.module.find((x) => x.id === s.modul)
  return [m?.name.split(' – ')[0] ?? s.modul, m?.kategorien.find((k) => k.schluessel === s.kategorie)?.name].filter(Boolean).join(' › ')
}

export default function StichwortPflege({ eigene }: { eigene: Stichwort[] }) {
  const [neu, setNeu] = useState<Stichwort>({ stichwort: '', modul: '', kategorie: '' })
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  const online = istAngemeldet()
  const modul = konfig.module.find((m) => m.id === neu.modul)
  const los = async (s: Stichwort, loeschen = false) => {
    setFehler(''); setLaeuft(true)
    try { await speichereStichwort(AKTUELLES_JAHR, s, loeschen); if (!loeschen) setNeu({ stichwort: '', modul: '', kategorie: '' }) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }
  return (
    <div className="karte">
      <h2>Stichwörter für die Zuordnung</h2>
      <p className="klein">Beim Erfassen sucht die App diese Wörter im Belegtext und schlägt Bereich und Kategorie vor, wenn der Aussteller noch unbekannt ist. Eigene Stichwörter gehen vor. Gespeichert im Belegindex {AKTUELLES_JAHR}.</p>
      {eigene.length > 0 ? (
        <ul className="liste">{eigene.map((s) => (
          <li key={s.stichwort}>„{s.stichwort}“ → {name(s)}{' '}
            <button className="zweit" style={{ minHeight: 28, padding: '1px 8px' }} disabled={!online || laeuft} onClick={() => void los(s, true)}>Löschen</button></li>
        ))}</ul>
      ) : <p className="klein">Noch keine eigenen Stichwörter.</p>}
      <div className="zeile">
        <label className="feld"><span>Stichwort (z. B. Name der Praxis)</span><input value={neu.stichwort} onChange={(x) => setNeu({ ...neu, stichwort: x.target.value })} /></label>
        <label className="feld"><span>Bereich</span>
          <select value={neu.modul} onChange={(x) => setNeu({ ...neu, modul: x.target.value, kategorie: '' })}>
            <option value="">–</option>{konfig.module.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
        <label className="feld"><span>Kategorie</span>
          <select value={neu.kategorie} onChange={(x) => setNeu({ ...neu, kategorie: x.target.value })} disabled={!modul?.kategorien.length}>
            <option value="">–</option>{modul?.kategorien.map((k) => <option key={k.schluessel} value={k.schluessel}>{k.name}</option>)}
          </select></label>
      </div>
      <button disabled={!online || laeuft || neu.stichwort.trim().length < 3 || !neu.modul} onClick={() => void los(neu)}>{laeuft ? 'Speichere …' : 'Stichwort speichern'}</button>
      {!online && <p className="klein">Speichern nur angemeldet und mit Netz.</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      <details><summary className="klein">Standard-Stichwörter ({STANDARD_STICHWOERTER.length}, Annahme – prüfen)</summary>
        <ul className="liste klein">{STANDARD_STICHWOERTER.map((s) => <li key={`${s.modul}|${s.stichwort}`}>„{s.stichwort}“ → {name(s)}</li>)}</ul>
      </details>
    </div>
  )
}
