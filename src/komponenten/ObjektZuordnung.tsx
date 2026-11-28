// Anlage V im Erfassungsformular: Objekt/Einheit wählen, optional auf mehrere aufteilen, umlagefähig.
import { Link } from 'react-router-dom'
import type { BelegEntwurf } from '../fachlich/beleg'
import type { Anteil } from '../fachlich/objekte'
import type { Stamm } from '../daten/stamm'
import Info from './Info'

interface Props {
  e: BelegEntwurf
  setE: (f: (a: BelegEntwurf) => BelegEntwurf) => void
  stamm: Stamm
}

export default function ObjektZuordnung({ e, setE, stamm }: Props) {
  const objekte = stamm.objekte.filter((o) => o.aktiv)
  const einheitenVon = (id: string) => stamm.einheiten.filter((x) => x.objekt_id === id)
  const aufgeteilt = e.aufteilung.length > 0
  const summe = e.aufteilung.reduce((s, a) => s + (a.anteil_prozent || 0), 0)

  if (!objekte.length) {
    return <p className="klein">Noch kein Objekt angelegt. Der Beleg liegt dann direkt im Ordner „V_Vermietung“. <Link to="/objekte">Objekte anlegen</Link></p>
  }

  const setzeAnteil = (i: number, teil: Partial<Anteil>) =>
    setE((a) => ({ ...a, aufteilung: a.aufteilung.map((x, k) => (k === i ? { ...x, ...teil } : x)) }))

  const umschalten = (an: boolean) =>
    setE((a) => ({
      ...a,
      aufteilung: an
        ? [{ objekt_id: a.objekt_id || objekte[0].id, einheit_id: a.einheit_id, anteil_prozent: 50 }, { objekt_id: '', einheit_id: '', anteil_prozent: 50 }]
        : [],
    }))

  return (
    <div className="feld">
      {!aufgeteilt && (
        <>
          <label className="feld"><span>Objekt *<Info zu="Objekt *" /></span>
            <select value={e.objekt_id} onChange={(x) => setE((a) => ({ ...a, objekt_id: x.target.value, einheit_id: '' }))}>
              <option value="">– wählen –</option>
              {objekte.map((o) => <option key={o.id} value={o.id}>{o.bezeichnung}</option>)}
            </select>
          </label>
          {e.objekt_id && einheitenVon(e.objekt_id).length > 0 && (
            <label className="feld"><span>Einheit (optional, leer = ganzes Objekt)<Info zu="Einheit (optional, leer = ganzes Objekt)" /></span>
              <select value={e.einheit_id} onChange={(x) => setE((a) => ({ ...a, einheit_id: x.target.value }))}>
                <option value="">– ganzes Objekt –</option>
                {einheitenVon(e.objekt_id).map((u) => <option key={u.id} value={u.id}>{u.bezeichnung}</option>)}
              </select>
            </label>
          )}
        </>
      )}

      <label className="wahl" style={{ display: 'block' }}>
        <input type="checkbox" checked={aufgeteilt} onChange={(x) => umschalten(x.target.checked)} /> Auf mehrere Objekte/Einheiten aufteilen<Info text="Wenn eine Rechnung mehrere Objekte oder Wohnungen betrifft (z. B. eine Versicherung für zwei Häuser): anhaken und die Prozentanteile eintragen. Zusammen müssen es 100 % sein." />
      </label>

      {aufgeteilt && (
        <div className="karte" style={{ padding: 8 }}>
          {e.aufteilung.map((a, i) => (
            <div key={i} className="zeile" style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #ddd', alignItems: 'center' }}>
              <select aria-label={`Objekt ${i + 1}`} value={a.objekt_id} onChange={(x) => setzeAnteil(i, { objekt_id: x.target.value, einheit_id: '' })}>
                <option value="">– Objekt –</option>
                {objekte.map((o) => <option key={o.id} value={o.id}>{o.bezeichnung}</option>)}
              </select>
              {a.objekt_id && einheitenVon(a.objekt_id).length > 0 && (
                <select aria-label={`Einheit ${i + 1}`} value={a.einheit_id} onChange={(x) => setzeAnteil(i, { einheit_id: x.target.value })}>
                  <option value="">ganzes Objekt</option>
                  {einheitenVon(a.objekt_id).map((u) => <option key={u.id} value={u.id}>{u.bezeichnung}</option>)}
                </select>
              )}
              <input aria-label={`Anteil ${i + 1} in Prozent`} type="number" step="any" min="0" max="100" style={{ maxWidth: 90 }}
                value={a.anteil_prozent || ''}
                onChange={(x) => setzeAnteil(i, { anteil_prozent: x.target.valueAsNumber || 0 })} /> %
              {e.aufteilung.length > 2 && (
                <button className="zweit" onClick={() => setE((b) => ({ ...b, aufteilung: b.aufteilung.filter((_, k) => k !== i) }))}>✕</button>
              )}
            </div>
          ))}
          <div className="zeile" style={{ alignItems: 'center' }}>
            <button className="zweit" onClick={() => setE((b) => ({ ...b, aufteilung: [...b.aufteilung, { objekt_id: '', einheit_id: '', anteil_prozent: 0 }] }))}>+ Zeile</button>
            <span className={Math.abs(summe - 100) > 0.001 ? 'fehler' : 'klein'}>Summe: {String(Math.round(summe * 100) / 100).replace('.', ',')} %</span>
          </div>
          <p className="klein">Der Beleg (PDF) liegt im Ordner des Objekts mit dem größten Anteil. Die Beträge werden centgenau verteilt.</p>
        </div>
      )}

      <label className="wahl" style={{ display: 'block' }}>
        <input type="checkbox" checked={e.umlagefaehig} onChange={(x) => setE((a) => ({ ...a, umlagefaehig: x.target.checked }))} /> Umlagefähig (Nebenkosten auf Mieter, bitte selbst prüfen)<Info text="Anhaken, wenn die Kosten über die Nebenkostenabrechnung an die Mieter weitergegeben werden (z. B. Müllabfuhr, Grundsteuer, Gebäudeversicherung). Laut Mietvertrag und Betriebskostenverordnung prüfen." />
      </label>
    </div>
  )
}
