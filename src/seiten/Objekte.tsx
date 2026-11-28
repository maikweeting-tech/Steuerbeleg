// Anlage V: Objektliste mit Kurzübersicht und Neuanlage.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { ladeStamm, speichereObjekt } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import { neuesObjekt, objektSumme } from '../fachlich/objekte'
import { formatEuro } from '../fachlich/format'
import { istAngemeldet } from '../google/auth'
import Info from '../komponenten/Info'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]

export default function Objekte() {
  const stamm = useStamm(AKTUELLES_JAHR)
  const { belege } = useDaten(AKTUELLES_JAHR)
  const [name, setName] = useState('')
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  const online = istAngemeldet()

  const aufgabe = async (t: string, f: () => Promise<unknown>) => {
    setFehler(''); setLaeuft(t)
    try { await f() } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft('') }
  }

  const objekte = stamm.objekte.filter((o) => o.aktiv)

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Anlage V – Objekte {AKTUELLES_JAHR}</h2>
      <p className="klein">Yerseke (NL) wird getrennt im Modul „Ausland“ geführt und erscheint hier nicht.</p>
      {objekte.map((o) => {
        const s = objektSumme(o.id, belege, stamm.aufteilung, stamm.einnahmen, konfig)
        return (
          <Link key={o.id} to={`/objekte/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="karte">
              <h2>{o.bezeichnung}</h2>
              <div className="klein">{o.adresse || 'Adresse fehlt'} · {stamm.einheiten.filter((e) => e.objekt_id === o.id).length} Einheit(en) · {s.belege} Beleg(e)</div>
              <table className="belege" style={{ marginTop: 6 }}><tbody>
                <tr><td>Einnahmen</td><td className="betrag">{formatEuro(s.einnahmen_ct)}</td></tr>
                <tr><td>Werbungskosten (ohne AfA)</td><td className="betrag">{formatEuro(s.werbungskosten_ct)}</td></tr>
                <tr><td><strong>Saldo vor AfA</strong></td><td className="betrag"><strong>{formatEuro(s.saldo_ct)}</strong></td></tr>
              </tbody></table>
            </div>
          </Link>
        )
      })}
      {!objekte.length && <p>Noch keine Objekte. Lege zuerst deine Vermietungsobjekte an.</p>}

      <div className="karte">
        <h2>Neues Objekt</h2>
        <label className="feld"><span>Bezeichnung (wird auch Ordnername, später nicht mehr ändern)<Info zu="Bezeichnung (wird auch Ordnername, später nicht mehr ändern)" /></span>
          <input value={name} placeholder="z. B. Kalkar Hauptstraße 5" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="zeile">
          <button disabled={!online || !name.trim() || !!laeuft} onClick={() => void aufgabe('Lege an …', async () => {
            if (objekte.some((o) => o.bezeichnung.trim().toLowerCase() === name.trim().toLowerCase())) throw new Error('Ein Objekt mit dieser Bezeichnung gibt es schon.')
            await speichereObjekt(AKTUELLES_JAHR, neuesObjekt(name.trim()))
            setName('')
          })}>Anlegen</button>
          <button className="zweit" disabled={!online || !!laeuft} onClick={() => void aufgabe('Lade …', () => ladeStamm(AKTUELLES_JAHR))}>Aktualisieren</button>
        </div>
        {!online && <p className="klein">Objekte anlegen und ändern geht nur angemeldet und mit Netz.</p>}
      </div>
      {laeuft && <p className="klein">{laeuft}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
    </>
  )
}
