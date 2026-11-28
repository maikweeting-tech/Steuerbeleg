// Dokumentenablage: Verträge und Dauerdokumente, unabhängig vom Steuerjahr (Drive: Steuer/Dokumente).
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { loescheDokument, speichereDokument } from '../daten/dokumentablage'
import { useStamm } from '../komponenten/hooks'
import { useDokumente } from '../komponenten/useDokumente'
import { ARTEN, driveDateiLink, zuordnungName, zuordnungObjekt, zuordnungPerson, type Dokument } from '../fachlich/dokumente'
import { formatDatum } from '../fachlich/format'
import { istAngemeldet } from '../google/auth'
import Info from '../komponenten/Info'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const zeitraum = (d: Dokument) => d.gueltig_von || d.gueltig_bis ? `${d.gueltig_von ? formatDatum(d.gueltig_von) : '…'} – ${d.gueltig_bis ? formatDatum(d.gueltig_bis) : 'unbefristet'}` : ''

export default function Dokumente() {
  const stamm = useStamm(AKTUELLES_JAHR)
  const { liste, laedt, fehler: ladeFehler, neuLaden } = useDokumente()
  const [params] = useSearchParams()
  const online = istAngemeldet()
  const leer = { titel: '', art: 'Mietvertrag', zuordnung: params.get('zuordnung') ?? 'allgemein', gueltig_von: '', gueltig_bis: '', notiz: '' }
  const [e, setE] = useState(leer)
  // Aus dem Eingang: Datei liegt schon in Drive (?eingang=<id>&name=<dateiname>)
  const eingang = params.get('eingang') ? { id: params.get('eingang')!, name: params.get('name') ?? 'Dokument.pdf' } : null
  const [datei, setDatei] = useState<File | { id: string; name: string } | null>(eingang)
  const navigate = useNavigate()
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  const [loeschen, setLoeschen] = useState('')
  const objekte = stamm.objekte
  const personen = konfig.personen

  const speichern = async () => {
    if (!datei) return
    setFehler(''); setLaeuft('Lade hoch …')
    try {
      await speichereDokument(e, datei, objekte, personen)
      if (eingang) { navigate('/eingang', { state: { meldung: `„${e.titel}“ in Dokumente abgelegt.` } }); return }
      setE({ ...leer, zuordnung: e.zuordnung }); setDatei(null); await neuLaden()
    }
    catch (x) { setFehler(x instanceof Error ? x.message : String(x)) } finally { setLaeuft('') }
  }
  const entfernen = async (d: Dokument) => {
    setFehler(''); setLaeuft('Lösche …')
    try { await loescheDokument(d); setLoeschen(''); await neuLaden() } catch (x) { setFehler(x instanceof Error ? x.message : String(x)) } finally { setLaeuft('') }
  }

  const gruppen = [...new Set(liste.map((d) => d.zuordnung))].sort()
  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Dokumente</h2>
      <div className="karte">
        <p className="klein">Verträge und Dauerdokumente, unabhängig vom Steuerjahr. Ablage in Drive unter „Steuer/Dokumente“, Liste „00_Dokumente“. Gültige Dokumente stehen in der Ausfüllhilfe für die Steuerberatung.</p>
        <h2>Neues Dokument</h2>
        {eingang
          ? <p>Datei aus dem Eingang: <a href={driveDateiLink(eingang.id)} target="_blank" rel="noreferrer">{eingang.name}</a><br /><span className="klein">Sie wird umbenannt und in den passenden Ordner unter „Steuer/Dokumente“ verschoben.</span></p>
          : <label className="feld"><span>Datei (PDF oder Foto)<Info zu="Datei (PDF oder Foto)" /></span><input type="file" accept="application/pdf,image/*" onChange={(x) => setDatei(x.target.files?.[0] ?? null)} /></label>}
        <label className="feld"><span>Titel (z. B. „Mietvertrag EG“)<Info zu="Titel (z. B. „Mietvertrag EG“)" /></span><input value={e.titel} onChange={(x) => setE({ ...e, titel: x.target.value })} /></label>
        <div className="zeile">
          <label className="feld"><span>Art<Info zu="Art" /></span><select value={e.art} onChange={(x) => setE({ ...e, art: x.target.value })}>{ARTEN.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="feld"><span>Gehört zu<Info zu="Gehört zu" /></span>
            <select value={e.zuordnung} onChange={(x) => setE({ ...e, zuordnung: x.target.value })}>
              <option value="allgemein">Allgemein</option>
              {objekte.map((o) => <option key={o.id} value={zuordnungObjekt(o.id)}>Objekt: {o.bezeichnung}</option>)}
              <option value="ausland">Auslandsobjekt</option>
              {personen.map((p) => <option key={p.id} value={zuordnungPerson(p.id)}>Person: {p.name}</option>)}
            </select></label>
        </div>
        <div className="zeile">
          <label className="feld"><span>Gültig ab<Info zu="Gültig ab" /></span><input type="date" value={e.gueltig_von} onChange={(x) => setE({ ...e, gueltig_von: x.target.value })} /></label>
          <label className="feld"><span>Gültig bis (leer = unbefristet)<Info zu="Gültig bis (leer = unbefristet)" /></span><input type="date" value={e.gueltig_bis} onChange={(x) => setE({ ...e, gueltig_bis: x.target.value })} /></label>
        </div>
        <label className="feld"><span>Notiz<Info zu="Notiz" /></span><input value={e.notiz} onChange={(x) => setE({ ...e, notiz: x.target.value })} /></label>
        <button disabled={!online || !datei || e.titel.trim().length < 2 || !!laeuft} onClick={() => void speichern()}>{laeuft || 'Dokument speichern'}</button>
        {!online && <p className="klein">Nur angemeldet und mit Netz.</p>}
        {fehler && <p className="fehler">{fehler}</p>}
      </div>
      {laedt && <p className="klein">Lade Dokumente …</p>}
      {ladeFehler && <p className="fehler">{ladeFehler}</p>}
      {!laedt && online && !liste.length && !ladeFehler && <p className="klein">Noch keine Dokumente abgelegt.</p>}
      {gruppen.map((g) => (
        <div key={g} className="karte">
          <h2>{zuordnungName(g, objekte, personen)}</h2>
          <ul className="liste">{liste.filter((d) => d.zuordnung === g).map((d) => (
            <li key={d.id}>
              <a href={driveDateiLink(d.datei_id)} target="_blank" rel="noreferrer">{d.art}: {d.titel}</a>
              {zeitraum(d) && <span className="klein"> · {zeitraum(d)}</span>}
              {d.notiz && <span className="klein"> · {d.notiz}</span>}{' '}
              {loeschen === d.id
                ? <><button className="zweit" disabled={!!laeuft} onClick={() => void entfernen(d)}>Wirklich löschen</button> <button className="zweit" onClick={() => setLoeschen('')}>Abbrechen</button></>
                : <button className="zweit" style={{ minHeight: 28, padding: '1px 8px' }} disabled={!online} onClick={() => setLoeschen(d.id)}>Löschen</button>}
            </li>
          ))}</ul>
        </div>
      ))}
      {liste.length > 0 && <p className="klein">Löschen entfernt den Eintrag und legt die Datei in den Drive-Papierkorb (dort 30 Tage wiederherstellbar).</p>}
    </>
  )
}
