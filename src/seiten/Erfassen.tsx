// Beleg erfassen: Seiten (Fotos/PDF) sammeln und bearbeiten, Pflichtfelder ausfüllen, speichern.
// Gespeichert wird zuerst lokal (Warteschlange); die Übertragung nach Drive läuft danach automatisch.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KONFIGURATIONEN, AKTUELLES_JAHR } from '../konfig'
import {
  findeDuplikate, GEMEINSAM, leererEntwurf, pruefePflicht, steuerjahrAus, wirksamesSteuerjahr, type BelegEntwurf,
} from '../fachlich/beleg'
import { formatDatum, formatEuro, parseBetrag } from '../fachlich/format'
import { alsJpeg, rendere, VOLL, vorschau, type Filter, type Seite } from '../erfassung/bild'
import { erstellePdf, type Teil } from '../erfassung/pdf'
import { warteschlange } from '../daten/speicher'
import { nutzerEmail, starteSync } from '../daten/dienste'
import { gespeicherteWurzel } from '../daten/einrichtung'
import { useDaten } from '../komponenten/hooks'
import Zuschnitt from '../komponenten/Zuschnitt'
import { holeGeteilteDateien } from '../erfassung/teilen'

type Eintrag =
  | (Seite & { art: 'bild'; bildUrl: string })
  | { art: 'pdf'; id: string; datei: Blob; name: string }

const neueId = () => crypto.randomUUID()

export default function Erfassen() {
  const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
  const { wartend, belege } = useDaten(AKTUELLES_JAHR)
  const navigate = useNavigate()
  const ort = useLocation()
  const [seiten, setSeiten] = useState<Eintrag[]>([])
  const [bearbeite, setBearbeite] = useState<string | null>(null)
  const [e, setE] = useState<BelegEntwurf>(() => leererEntwurf(neueId()))
  const [betragText, setBetragText] = useState('')
  const [zahlungGeaendert, setZahlungGeaendert] = useState(false)
  const [versucht, setVersucht] = useState(false)
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')

  const setze = <K extends keyof BelegEntwurf>(k: K, v: BelegEntwurf[K]) => setE((a) => ({ ...a, [k]: v }))

  const fuegeHinzu = useCallback(async (dateien: File[] | Blob[]) => {
    setFehler('')
    const neu: Eintrag[] = []
    for (const d of dateien) {
      const name = d instanceof File ? d.name : 'geteilt'
      if (d.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
        neu.push({ art: 'pdf', id: neueId(), datei: d, name })
      } else if (d.type.startsWith('image/')) {
        const s: Seite = { id: neueId(), quelle: d, drehung: 0, zuschnitt: VOLL, filter: 'kontrast' }
        try {
          neu.push({ ...s, art: 'bild', bildUrl: await vorschau(s) })
        } catch {
          setFehler(`„${name}“ kann nicht gelesen werden (Format ${d.type || 'unbekannt'}). Bitte als JPG oder PDF.`)
        }
      } else setFehler(`„${name}“ ist weder Bild noch PDF.`)
    }
    setSeiten((a) => [...a, ...neu])
  }, [])

  // Über das Teilen-Menü (Android) geschickte Dateien übernehmen
  useEffect(() => {
    if (!ort.search.includes('geteilt')) return
    void holeGeteilteDateien().then((d) => { if (d.length) void fuegeHinzu(d) })
  }, [ort.search, fuegeHinzu])

  const aendereSeite = async (id: string, f: (s: Seite) => Seite) => {
    const alt = seiten.find((s) => s.id === id)
    if (!alt || alt.art !== 'bild') return
    const s = f(alt)
    const url = await vorschau(s)
    URL.revokeObjectURL(alt.bildUrl)
    setSeiten((a) => a.map((x) => (x.id === id ? { ...s, art: 'bild', bildUrl: url } : x)))
  }
  const entferne = (id: string) => setSeiten((a) => a.filter((x) => x.id !== id))
  const nachVorn = (i: number) => setSeiten((a) => (i ? [...a.slice(0, i - 1), a[i], a[i - 1], ...a.slice(i + 1)] : a))

  const modul = konfig.module.find((m) => m.id === e.modul)
  const fehlerListe = useMemo(() => {
    const f = pruefePflicht(e, KONFIGURATIONEN)
    if (betragText && parseBetrag(betragText) === null) f.unshift('Betrag ist keine gültige Zahl (z. B. 412,50)')
    if (!seiten.length) f.unshift('Mindestens eine Seite (Foto oder PDF) fehlt')
    return f
  }, [e, betragText, seiten.length])

  const duplikate = useMemo(() => findeDuplikate(e, [
    ...belege,
    ...wartend.map((w) => ({ ...w.entwurf })),
  ]), [e, belege, wartend])

  const aussteller = useMemo(() => [...new Set(belege.map((b) => b.aussteller).filter(Boolean))].sort(), [belege])

  const speichere = async () => {
    setVersucht(true)
    if (fehlerListe.length) return
    setLaeuft('PDF wird erstellt …')
    setFehler('')
    try {
      const teile: Teil[] = []
      for (const s of seiten) {
        if (s.art === 'pdf') teile.push({ art: 'pdf', daten: await s.datei.arrayBuffer() })
        else teile.push({ art: 'jpeg', daten: await (await alsJpeg(await rendere(s))).arrayBuffer() })
      }
      const { pdf, seiten: anzahl } = await erstellePdf(teile)
      const jahr = wirksamesSteuerjahr(e)
      await warteschlange.speichere({
        id: e.id, entwurf: { ...e, steuerjahr: jahr }, pdf, seiten: anzahl,
        erfasst_von: nutzerEmail(), erfasst_am: new Date().toISOString(), versuche: 0,
      })
      seiten.forEach((s) => s.art === 'bild' && URL.revokeObjectURL(s.bildUrl))
      void starteSync()
      navigate('/belege', { state: { meldung: `Beleg gespeichert (${anzahl} Seite${anzahl === 1 ? '' : 'n'}). Er wird nach Drive übertragen, sobald Netz und Anmeldung da sind.` } })
    } catch (x) {
      setFehler(x instanceof Error ? x.message : String(x))
    } finally {
      setLaeuft('')
    }
  }

  const bearbeitet = seiten.find((s) => s.id === bearbeite)
  if (bearbeitet && bearbeitet.art === 'bild')
    return <Zuschnitt seite={bearbeitet} fertig={(r) => { setBearbeite(null); if (r) void aendereSeite(bearbeitet.id, (s) => ({ ...s, zuschnitt: r })) }} />

  const jahr = wirksamesSteuerjahr(e)

  return (
    <>
      {!gespeicherteWurzel() && <p className="warnung">Noch kein Ordner „Steuer“ verbunden. Du kannst erfassen; übertragen wird erst, wenn auf der Startseite ein Ordner verbunden ist.</p>}

      <div className="karte">
        <h2>1. Seiten</h2>
        <div className="zeile">
          <label className="knopf">
            <input type="file" accept="image/*" capture="environment" hidden onChange={(x) => { void fuegeHinzu([...(x.target.files ?? [])]); x.target.value = '' }} />
            <span>📷 Foto aufnehmen</span>
          </label>
          <label className="knopf zweit">
            <input type="file" accept="image/*,application/pdf" multiple hidden onChange={(x) => { void fuegeHinzu([...(x.target.files ?? [])]); x.target.value = '' }} />
            <span>Datei / Galerie</span>
          </label>
        </div>
        <p className="klein">Mehrseitige Belege: einfach weitere Fotos aufnehmen. Die Seiten werden zu einer PDF zusammengefügt.</p>
        {seiten.length > 0 && (
          <div className="seiten">
            {seiten.map((s, i) => (
              <div className="seite" key={s.id}>
                {s.art === 'bild' ? <img src={s.bildUrl} alt={`Seite ${i + 1}`} /> : <div className="pdf-platz">PDF<br /><span className="klein">{s.name}</span></div>}
                <div className="klein">Seite {i + 1}</div>
                <div className="zeile">
                  {s.art === 'bild' && <button className="zweit" title="Drehen" onClick={() => void aendereSeite(s.id, (x) => ({ ...x, drehung: ((x.drehung + 90) % 360) as Seite['drehung'], zuschnitt: VOLL }))}>⟳</button>}
                  {s.art === 'bild' && <button className="zweit" title="Zuschneiden" onClick={() => setBearbeite(s.id)}>✂</button>}
                  {i > 0 && <button className="zweit" title="Nach vorn" onClick={() => nachVorn(i)}>◀</button>}
                  <button className="zweit" title="Entfernen" onClick={() => entferne(s.id)}>✕</button>
                </div>
                {s.art === 'bild' && (
                  <select value={s.filter} onChange={(x) => void aendereSeite(s.id, (y) => ({ ...y, filter: x.target.value as Filter }))}>
                    <option value="kontrast">Kontrast</option>
                    <option value="sw">Schwarz-weiß</option>
                    <option value="original">Original</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="karte">
        <h2>2. Angaben</h2>
        <div className="zeile" style={{ alignItems: 'flex-start' }}>
          <label className="feld"><span>Belegdatum *</span>
            <input type="date" value={e.belegdatum} onChange={(x) => {
              const v = x.target.value
              setE((a) => ({ ...a, belegdatum: v, zahlungsdatum: zahlungGeaendert ? a.zahlungsdatum : v }))
            }} />
          </label>
          <label className="feld"><span>Zahlungsdatum *</span>
            <input type="date" value={e.zahlungsdatum} onChange={(x) => { setZahlungGeaendert(true); setze('zahlungsdatum', x.target.value) }} />
          </label>
        </div>
        <label className="feld"><span>Betrag brutto in € *</span>
          <input inputMode="decimal" placeholder="z. B. 412,50" value={betragText} onChange={(x) => { setBetragText(x.target.value); setze('betrag_ct', parseBetrag(x.target.value)) }} />
          {e.betrag_ct !== null && <span className="klein"> = {formatEuro(e.betrag_ct)}</span>}
        </label>
        <label className="feld"><span>Aussteller *</span>
          <input list="aussteller" value={e.aussteller} onChange={(x) => setze('aussteller', x.target.value)} />
          <datalist id="aussteller">{aussteller.map((a) => <option key={a} value={a} />)}</datalist>
        </label>

        {duplikate.length > 0 && (
          <div className="warnung">
            <strong>Möglicherweise doppelt:</strong>
            <ul className="liste">
              {duplikate.map((d) => (
                <li key={d.beleg.id}>
                  {d.beleg.belegnr ? `Nr. ${d.beleg.belegnr}, ` : '(noch nicht übertragen) '}
                  {formatDatum(d.beleg.belegdatum)}, {formatEuro(d.beleg.betrag_ct ?? 0)}, {d.beleg.aussteller}
                  {d.stufe === 'hoch' ? ' – gleicher Aussteller' : ''}
                </li>
              ))}
            </ul>
            <span className="klein">Gleiches Datum und gleicher Betrag. Speichern ist trotzdem möglich.</span>
          </div>
        )}

        <fieldset className="feld" style={{ border: 0, padding: 0, margin: '0 0 10px' }}>
          <span style={{ display: 'block', fontSize: '0.9rem', marginBottom: 3 }}>Person *</span>
          <div className="zeile">
            {[...konfig.personen, { id: GEMEINSAM, name: 'gemeinsam' }].map((p) => (
              <label key={p.id} className="wahl"><input type="radio" name="person" checked={e.person === p.id} onChange={() => setze('person', p.id)} /> {p.name}</label>
            ))}
          </div>
        </fieldset>
        <label className="feld"><span>Modul *</span>
          <select value={e.modul} onChange={(x) => setE((a) => ({ ...a, modul: x.target.value, kategorie: '' }))}>
            <option value="">– wählen –</option>
            {konfig.module.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        {modul && modul.kategorien.length > 0 && (
          <label className="feld"><span>Kategorie *</span>
            <select value={e.kategorie} onChange={(x) => setze('kategorie', x.target.value)}>
              <option value="">– wählen –</option>
              {modul.kategorien.map((k) => <option key={k.schluessel} value={k.schluessel}>{k.name}</option>)}
            </select>
          </label>
        )}
        {modul && (modul.ebene === 'objekt' || modul.ebene === 'kind') && (
          <p className="klein">Zuordnung zu {modul.ebene === 'objekt' ? 'Objekt' : 'Kind'} folgt in einem späteren Meilenstein. Der Beleg liegt vorerst im Ordner „{modul.ordner}“.</p>
        )}

        <div className="feld">
          <span className="klein">Steuerjahr: <strong>{jahr ?? '–'}</strong> {e.steuerjahr_manuell ? '(manuell)' : '(aus Zahlungsdatum)'}</span>
          <label className="wahl" style={{ display: 'block' }}>
            <input type="checkbox" checked={e.steuerjahr_manuell} onChange={(x) => setE((a) => ({ ...a, steuerjahr_manuell: x.target.checked, steuerjahr: a.steuerjahr ?? steuerjahrAus(a.zahlungsdatum) }))} />
            {' '}Steuerjahr abweichend festlegen (z. B. 10-Tage-Regel, § 11 EStG – bitte selbst prüfen)
          </label>
          {e.steuerjahr_manuell && (
            <input type="number" style={{ maxWidth: 120 }} value={e.steuerjahr ?? ''} onChange={(x) => setze('steuerjahr', x.target.value ? Number(x.target.value) : null)} />
          )}
        </div>
        <label className="feld"><span>Status</span>
          <select value={e.status} onChange={(x) => setze('status', x.target.value as BelegEntwurf['status'])}>
            <option value="offen">offen</option>
            <option value="unvollständig">unvollständig</option>
            <option value="geprüft">geprüft</option>
          </select>
        </label>
        <label className="feld"><span>Notiz</span>
          <textarea value={e.notiz} onChange={(x) => setze('notiz', x.target.value)} placeholder="Tipp: Mikrofon der Tastatur für Spracheingabe" />
        </label>
      </div>

      {versucht && fehlerListe.length > 0 && (
        <div className="fehler karte"><strong>Bitte ergänzen:</strong><ul className="liste">{fehlerListe.map((f) => <li key={f}>{f}</li>)}</ul></div>
      )}
      {fehler && <p className="fehler">{fehler}</p>}
      <div className="zeile">
        <button disabled={!!laeuft} onClick={() => void speichere()}>{laeuft || 'Beleg speichern'}</button>
        <button className="zweit" disabled={!!laeuft} onClick={() => navigate('/belege')}>Abbrechen</button>
      </div>
    </>
  )
}
