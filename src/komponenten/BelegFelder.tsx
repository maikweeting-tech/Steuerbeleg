// Eingabefelder eines Belegs – gemeinsam für „Erfassen“ und „Beleg bearbeiten“.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { belegHinweise, GEMEINSAM, steuerjahrAus, wirksamesSteuerjahr, type BelegEntwurf } from '../fachlich/beleg'
import { formatEuro, parseBetrag } from '../fachlich/format'
import type { Stamm } from '../daten/stamm'
import ObjektZuordnung from './ObjektZuordnung'
import Info from './Info'

interface Props {
  e: BelegEntwurf
  setE: (f: (a: BelegEntwurf) => BelegEntwurf) => void
  betragText: string
  setBetragText: (t: string) => void
  /** Zahlungsdatum folgt dem Belegdatum, bis es selbst geändert wurde */
  zahlungGeaendert: boolean
  setZahlungGeaendert: (b: boolean) => void
  aussteller: string[]
  stamm: Stamm
  /** wird nach dem Aussteller eingeblendet (z. B. Duplikat-Warnung) */
  children?: ReactNode
  /** Steuerjahr nicht änderbar (Bearbeiten) */
  jahrFest?: boolean
  /** wird erhöht, wenn Beträge von außen gesetzt werden (Vorschläge) – Eingabefelder neu befüllen */
  stand?: number
}

const centText = (c: number | null) => (c === null ? '' : formatEuro(c).replace(/\s?€/, ''))

/** Betragsfeld mit eigenem Text (Komma), Wert in Cent oder null. */
function Betrag({ label, wert, setze }: { label: string; wert: number | null; setze: (c: number | null) => void }) {
  const [t, setT] = useState(() => centText(wert))
  return (
    <label className="feld"><span>{label}<Info zu={label} /></span>
      <input inputMode="decimal" value={t} onChange={(x) => { setT(x.target.value); setze(x.target.value.trim() ? parseBetrag(x.target.value) : null) }} style={{ maxWidth: 140 }} />
      {t.trim() && parseBetrag(t) === null && <span className="fehler klein"> keine gültige Zahl</span>}
    </label>
  )
}

export default function BelegFelder({ e, setE, betragText, setBetragText, zahlungGeaendert, setZahlungGeaendert, aussteller, stamm, children, jahrFest, stand = 0 }: Props) {
  const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
  const setze = <K extends keyof BelegEntwurf>(k: K, v: BelegEntwurf[K]) => setE((a) => ({ ...a, [k]: v }))
  const modul = konfig.module.find((m) => m.id === e.modul)
  const jahr = wirksamesSteuerjahr(e)
  const hinweise = belegHinweise(e)

  return (
    <>
      <div className="zeile" style={{ alignItems: 'flex-start' }}>
        <label className="feld"><span>Belegdatum *<Info zu="Belegdatum *" /></span>
          <input type="date" value={e.belegdatum} onChange={(x) => {
            const v = x.target.value
            setE((a) => ({ ...a, belegdatum: v, zahlungsdatum: zahlungGeaendert ? a.zahlungsdatum : v }))
          }} />
        </label>
        <label className="feld"><span>Zahlungsdatum *<Info zu="Zahlungsdatum *" /></span>
          <input type="date" value={e.zahlungsdatum} onChange={(x) => { setZahlungGeaendert(true); setze('zahlungsdatum', x.target.value) }} />
        </label>
      </div>
      <label className="feld"><span>Betrag brutto in € *<Info zu="Betrag brutto in € *" /></span>
        <input inputMode="decimal" placeholder="z. B. 412,50" value={betragText} onChange={(x) => { setBetragText(x.target.value); setze('betrag_ct', parseBetrag(x.target.value)) }} />
        {e.betrag_ct !== null && <span className="klein"> = {formatEuro(e.betrag_ct)}</span>}
      </label>
      <label className="feld"><span>Aussteller *<Info zu="Aussteller *" /></span>
        <input list="aussteller" value={e.aussteller} onChange={(x) => setze('aussteller', x.target.value)} />
        <datalist id="aussteller">{aussteller.map((a) => <option key={a} value={a} />)}</datalist>
      </label>

      {children}

      <fieldset className="feld" style={{ border: 0, padding: 0, margin: '0 0 10px' }}>
        <span style={{ display: 'block', fontSize: '0.9rem', marginBottom: 3 }}>Person *<Info zu="Person" /></span>
        <div className="zeile">
          {[...konfig.personen, { id: GEMEINSAM, name: 'gemeinsam' }].map((p) => (
            <label key={p.id} className="wahl"><input type="radio" name="person" checked={e.person === p.id} onChange={() => setze('person', p.id)} /> {p.name}</label>
          ))}
        </div>
      </fieldset>
      <label className="feld"><span>Modul *<Info zu="Modul *" /></span>
        <select value={e.modul} onChange={(x) => setE((a) => ({ ...a, modul: x.target.value, kategorie: '', objekt_id: '', einheit_id: '', aufteilung: [], umlagefaehig: false, kind_id: '' }))}>
          <option value="">– wählen –</option>
          {konfig.module.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      {modul && modul.kategorien.length > 0 && (
        <label className="feld"><span>Kategorie *<Info zu="Kategorie *" /></span>
          <select value={e.kategorie} onChange={(x) => {
            const k = modul.kategorien.find((y) => y.schluessel === x.target.value)
            setE((a) => ({ ...a, kategorie: x.target.value, umlagefaehig: modul.ebene === 'objekt' ? !!k?.umlagefaehig_vorschlag : false }))
          }}>
            <option value="">– wählen –</option>
            {modul.kategorien.map((k) => <option key={k.schluessel} value={k.schluessel}>{k.name}</option>)}
          </select>
        </label>
      )}
      {modul?.ebene === 'objekt' && <ObjektZuordnung e={e} setE={setE} stamm={stamm} />}
      {modul?.ebene === 'kind' && (stamm.kinder.length ? (
        <label className="feld"><span>Kind *<Info zu="Kind *" /></span>
          <select value={e.kind_id} onChange={(x) => setze('kind_id', x.target.value)}>
            <option value="">– wählen –</option>
            {stamm.kinder.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </label>
      ) : <p className="klein">Noch kein Kind angelegt, der Beleg liegt dann direkt im Ordner „{modul.ordner}“. <Link to="/kinder">Kinder anlegen</Link></p>)}

      {modul?.id === '35A' && (
        <div className="karte" style={{ padding: 8 }}>
          <fieldset className="feld" style={{ border: 0, padding: 0, margin: '0 0 6px' }}>
            <span style={{ display: 'block', fontSize: '0.9rem', marginBottom: 3 }}>Zahlungsart<Info zu="Zahlungsart" /></span>
            <div className="zeile">
              <label className="wahl"><input type="radio" name="zahlungsart" checked={e.zahlungsart === 'unbar'} onChange={() => setze('zahlungsart', 'unbar')} /> unbar (Überweisung, Lastschrift)</label>
              <label className="wahl"><input type="radio" name="zahlungsart" checked={e.zahlungsart === 'bar'} onChange={() => setze('zahlungsart', 'bar')} /> bar</label>
            </div>
          </fieldset>
          <div className="zeile">
            <Betrag key={`ak${stand}`} label="Arbeitskosten (€)" wert={e.arbeitskosten_ct} setze={(c) => setze('arbeitskosten_ct', c)} />
            <Betrag key={`ma${stand}`} label="Material (€)" wert={e.material_ct} setze={(c) => setze('material_ct', c)} />
          </div>
          <p className="klein">Beträge laut Rechnung (brutto). Arbeitskosten + Material müssen den Gesamtbetrag ergeben, wenn beide eingetragen sind.</p>
        </div>
      )}
      {hinweise.length > 0 && <div className="warnung"><ul className="liste">{hinweise.map((h) => <li key={h}>{h}</li>)}</ul></div>}

      <div className="feld">
        <span className="klein">Steuerjahr: <strong>{jahr ?? '–'}</strong> {e.steuerjahr_manuell ? '(manuell)' : '(aus Zahlungsdatum)'}</span>
        {jahr !== null && jahr !== AKTUELLES_JAHR && <p className="warnung klein">Dieser Beleg gehört ins Steuerjahr {jahr} und wird im Belegindex {jahr} gespeichert{KONFIGURATIONEN[jahr] ? '' : ' – dieses Jahr ist in der App noch nicht angelegt, Speichern schlägt fehl'}.</p>}
        {!jahrFest && (
          <label className="wahl" style={{ display: 'block' }}>
            <input type="checkbox" checked={e.steuerjahr_manuell} onChange={(x) => setE((a) => ({ ...a, steuerjahr_manuell: x.target.checked, steuerjahr: a.steuerjahr ?? steuerjahrAus(a.zahlungsdatum) }))} />
            {' '}Steuerjahr abweichend festlegen (z. B. 10-Tage-Regel, § 11 EStG – bitte selbst prüfen)<Info text="Normalerweise zählt das Jahr der Zahlung. Nur anhaken, wenn die Steuerberatung sagt, dass der Beleg in ein anderes Jahr gehört, z. B. bei regelmäßigen Zahlungen kurz vor oder nach Silvester (10-Tage-Regel, prüfen)." />
          </label>
        )}
        {!jahrFest && e.steuerjahr_manuell && (
          <input type="number" style={{ maxWidth: 120 }} value={e.steuerjahr ?? ''} onChange={(x) => setze('steuerjahr', x.target.value ? Number(x.target.value) : null)} />
        )}
      </div>
      <label className="feld"><span>Status<Info zu="Status" /></span>
        <select value={e.status} onChange={(x) => setze('status', x.target.value as BelegEntwurf['status'])}>
          <option value="offen">offen</option>
          <option value="unvollständig">unvollständig</option>
          <option value="geprüft">geprüft</option>
        </select>
      </label>
      <label className="feld"><span>Notiz<Info zu="Notiz" /></span>
        <textarea value={e.notiz} onChange={(x) => setze('notiz', x.target.value)} placeholder="Tipp: Mikrofon der Tastatur für Spracheingabe" />
      </label>
      <label className="feld"><span>❓ Frage an den Steuerberater (leer = keine)<Info zu="❓ Frage an den Steuerberater (leer = keine)" /></span>
        <textarea value={e.frage} onChange={(x) => setze('frage', x.target.value)} placeholder="z. B. Ist das als Werbungskosten absetzbar?" rows={2} />
      </label>
    </>
  )
}
