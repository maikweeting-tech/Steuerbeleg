// Vollständigkeits-Check (M6) mit Vorlagen für wiederkehrende/erwartete Belege (E6) und Kalender-Erinnerung (A5).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { markiereBuchung, nutzerEmail, speichereVorlage, starteSync } from '../daten/dienste'
import { warteschlange } from '../daten/speicher'
import { useDaten, useStamm } from '../komponenten/hooks'
import { formatDatum, formatEuro, parseBetrag } from '../fachlich/format'
import { GEMEINSAM } from '../fachlich/beleg'
import {
  entwurfAusVorlage, kalenderIcs, kalenderLink, leereVorlage, RHYTHMEN, vollstaendigkeit, vorlageAusBeleg,
  type PeriodenErgebnis, type Rhythmus, type Vorlage,
} from '../fachlich/vorlagen'
import { istAngemeldet } from '../google/auth'
import StichwortPflege from '../komponenten/StichwortPflege'
import Info from '../komponenten/Info'
import VorjahrKarte from '../komponenten/VorjahrKarte'
import HandyErinnerung from '../komponenten/HandyErinnerung'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const heute = () => new Date().toISOString().slice(0, 10)
const modulName = (id: string) => konfig.module.find((m) => m.id === id)?.name.split(' – ')[0] ?? id
const katName = (m: string, k: string) => konfig.module.find((x) => x.id === m)?.kategorien.find((y) => y.schluessel === k)?.name ?? k
const centText = (c: number | null) => (c === null ? '' : formatEuro(c).replace(/\s?€/, ''))
const FARBE: Record<PeriodenErgebnis['status'], string> = { erledigt: 'p-ok', faellig: 'p-faellig', fehlt: 'p-fehlt', kuenftig: 'p-kuenftig' }
const ZEICHEN: Record<PeriodenErgebnis['status'], string> = { erledigt: '✓', faellig: '!', fehlt: '✕', kuenftig: '·' }

export default function Check() {
  const { belege, wartend } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const online = istAngemeldet()
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  const [ok, setOk] = useState('')
  const [offen, setOffen] = useState<{ v: Vorlage; p: PeriodenErgebnis } | null>(null)

  const aufgabe = async (f: () => Promise<unknown>, meldung: string) => {
    setFehler(''); setOk(''); setLaeuft(true)
    try { await f(); setOk(meldung) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }

  // Noch nicht übertragene Belege zählen mit (sonst bleibt ein gerade bestätigter Monat rot)
  const alle = [...belege, ...wartend.map((w) => ({ ...w.entwurf, belegnr: 0, datei_ids: '', dateiname: '', erfasst_von: '', erfasst_am: w.erfasst_am, geaendert_von: '', geaendert_am: '', version: 0 }))]
  const voll = vollstaendigkeit(stamm.vorlagen, AKTUELLES_JAHR, alle, heute())
  const fehlt = voll.reduce((s, v) => s + v.fehlt, 0)
  const faellig = voll.reduce((s, v) => s + v.faellig, 0)
  const ohneBeleg = stamm.buchungen.filter((b) => b.markierung === 'beleg_fehlt')
  const unvollstaendig = belege.filter((b) => b.status === 'unvollständig')
  const fragen = belege.filter((b) => b.frage.trim())

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Vollständigkeit {AKTUELLES_JAHR}</h2>
      <div className="karte">
        <div className="zaehler">
          <span>Fehlende Belege aus Vorlagen</span><span className={'wert' + (fehlt ? ' fehler' : '')}>{fehlt}</span>
          <span>Jetzt fällig</span><span className="wert">{faellig}</span>
          <span>Zahlungen ohne Beleg (Kontoauszug)</span><span className={'wert' + (ohneBeleg.length ? ' fehler' : '')}>{ohneBeleg.length}</span>
          <span>Belege mit Status „unvollständig“</span><span className="wert">{unvollstaendig.length}</span>
          <span>❓ Fragen an den Steuerberater</span><span className="wert">{fragen.length}</span>
        </div>
        {!stamm.vorlagen.length && <p className="klein">Noch keine Vorlagen. Lege unten fest, welche Belege du regelmäßig erwartest (z. B. Kita monatlich, Grundsteuer vierteljährlich, Lohnsteuerbescheinigung jährlich).</p>}
      </div>

      {voll.map(({ vorlage: v, perioden }) => (
        <div className="karte" key={v.id}>
          <strong>{v.bezeichnung}</strong> <span className="klein">· {RHYTHMEN.find((r) => r.id === v.rhythmus)?.name} · {modulName(v.modul)}{v.kategorie ? ` › ${katName(v.modul, v.kategorie)}` : ''}{v.betrag_ct !== null ? ` · ${formatEuro(v.betrag_ct)}` : ''}</span>
          <div className="perioden">
            {perioden.map((p) => (
              <button key={p.schluessel} className={'periode ' + FARBE[p.status]} title={`${p.name}: ${p.status}`}
                disabled={p.status === 'kuenftig'}
                onClick={() => setOffen(offen?.p.schluessel === p.schluessel && offen.v.id === v.id ? null : { v, p })}>
                {ZEICHEN[p.status]} {v.rhythmus === 'monatlich' ? p.name.slice(0, 3) : v.rhythmus === 'vierteljaehrlich' ? `Q${p.schluessel.slice(-1)}` : p.schluessel}
              </button>
            ))}
          </div>
          {offen?.v.id === v.id && <Periode v={v} p={offen.p} laeuft={laeuft} fertig={(m) => { setOffen(null); setOk(m) }} />}
        </div>
      ))}

      {ohneBeleg.length > 0 && (
        <div className="karte">
          <h2>Zahlungen ohne Beleg</h2>
          <ul className="liste">
            {ohneBeleg.map((b) => (
              <li key={b.id} className="fehler">
                {formatDatum(b.datum)} · {formatEuro(Math.abs(b.betrag_ct))} · {b.gegenseite || b.zweck}
                {' '}<Link to="/erfassen" className="klein">Beleg erfassen</Link>
                {' '}<button className="zweit" style={{ minHeight: 30, padding: '2px 8px' }} disabled={!online || laeuft}
                  onClick={() => void aufgabe(() => markiereBuchung(AKTUELLES_JAHR, b, 'erledigt'), 'Als erledigt markiert.')}>erledigt</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unvollstaendig.length > 0 && (
        <div className="karte">
          <h2>Belege „unvollständig“</h2>
          <ul className="liste">{unvollstaendig.map((b) => <li key={b.id}><Link to={`/belege/${b.id}`}>Nr. {b.belegnr}</Link> · {b.aussteller} · {formatEuro(b.betrag_ct ?? 0)}{b.notiz ? ` · ${b.notiz}` : ''}</li>)}</ul>
        </div>
      )}

      <VorjahrKarte belege={belege} wartend={wartend} antworten={stamm.antworten ?? {}} online={online} />

      <Vorlagen belege={belege} vorlagen={stamm.vorlagen} online={online} laeuft={laeuft}
        speichern={(v, loeschen) => void aufgabe(() => speichereVorlage(AKTUELLES_JAHR, v, loeschen), loeschen ? 'Vorlage gelöscht.' : 'Vorlage gespeichert.')} />

      <StichwortPflege eigene={stamm.stichwoerter ?? []} />
      <HandyErinnerung />
      <Erinnerung />

      {laeuft && <p className="klein">Speichere …</p>}
      {ok && !laeuft && <p className="ok">{ok}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {!online && <p className="klein">Vorlagen ändern geht nur angemeldet und mit Netz.</p>}
    </>
  )
}

/** Ein Zeitraum: bestätigen (Beleg aus Vorlage) oder mit Foto/PDF erfassen. */
function Periode({ v, p, laeuft, fertig }: { v: Vorlage; p: PeriodenErgebnis; laeuft: boolean; fertig: (m: string) => void }) {
  const [betrag, setBetrag] = useState(centText(v.betrag_ct))
  const [datum, setDatum] = useState(p.faellig_ab)
  const cent = parseBetrag(betrag)
  if (p.status === 'erledigt')
    return <p className="klein">{p.name}: {p.belege.map((b) => `${b.belegnr ? 'Nr. ' + b.belegnr : 'wartet'} (${formatDatum(b.zahlungsdatum || b.belegdatum)}, ${formatEuro(b.betrag_ct ?? 0)})`).join(', ')}</p>
  const bestaetigen = async () => {
    const id = crypto.randomUUID()
    const e = entwurfAusVorlage(v, p, id, cent, datum)
    await warteschlange.speichere({
      id, entwurf: { ...e, steuerjahr: AKTUELLES_JAHR }, pdf: null, seiten: 0,
      dauerbeleg: v.dauerbeleg_datei_id ? { id: v.dauerbeleg_datei_id, name: 'Dauerbeleg' } : undefined,
      erfasst_von: nutzerEmail(), erfasst_am: new Date().toISOString(), versuche: 0,
    })
    void starteSync()
    fertig(`${p.name} bestätigt. Er wird in den Belegindex übertragen.`)
  }
  return (
    <div className="karte" style={{ padding: 8, marginTop: 6 }}>
      <strong>{p.name}</strong> <span className={p.status === 'fehlt' ? 'fehler' : 'klein'}>{p.status === 'fehlt' ? 'fehlt' : 'fällig'}</span>
      {v.dauerbeleg_datei_id ? (
        <>
          <p className="klein">Bestätigen trägt einen Beleg mit Verweis auf den <a href={`https://drive.google.com/file/d/${v.dauerbeleg_datei_id}/view`} target="_blank" rel="noreferrer">Dauerbeleg</a> ein (keine neue PDF).</p>
          <div className="zeile">
            <label className="feld"><span>Betrag €<Info zu="Betrag €" /></span><input inputMode="decimal" style={{ maxWidth: 110 }} value={betrag} onChange={(x) => setBetrag(x.target.value)} /></label>
            <label className="feld"><span>Zahlungsdatum<Info zu="Zahlungsdatum" /></span><input type="date" value={datum} min={p.von} max={p.bis} onChange={(x) => setDatum(x.target.value)} /></label>
          </div>
          <button disabled={laeuft || cent === null || !datum} onClick={() => void bestaetigen()}>Bestätigen</button>{' '}
        </>
      ) : <p className="klein">Kein Dauerbeleg hinterlegt: bitte den Beleg fotografieren bzw. als PDF erfassen.</p>}
      <Link to={`/erfassen?vorlage=${v.id}`}><button className="zweit">Mit Foto/PDF erfassen</button></Link>
    </div>
  )
}

function Vorlagen({ belege, vorlagen, online, laeuft, speichern }: {
  belege: ReturnType<typeof useDaten>['belege']; vorlagen: Vorlage[]; online: boolean; laeuft: boolean; speichern: (v: Vorlage, loeschen?: boolean) => void
}) {
  const [quelle, setQuelle] = useState('')
  const [rhythmus, setRhythmus] = useState<Rhythmus>('monatlich')
  const [neu, setNeu] = useState<Vorlage>(() => leereVorlage(crypto.randomUUID()))
  const [bearbeite, setBearbeite] = useState<Vorlage | null>(null)
  const modul = konfig.module.find((m) => m.id === neu.modul)
  const sortiert = [...belege].sort((a, b) => b.belegnr - a.belegnr)
  return (
    <div className="karte">
      <h2>Vorlagen (wiederkehrende / erwartete Belege)</h2>
      {vorlagen.map((v) => bearbeite?.id === v.id ? (
        <VorlageForm key={v.id} v={bearbeite} setV={setBearbeite} online={online} laeuft={laeuft}
          speichern={() => { speichern(bearbeite); setBearbeite(null) }} abbrechen={() => setBearbeite(null)} loeschen={() => { speichern(v, true); setBearbeite(null) }} />
      ) : (
        <div key={v.id} className="zeile" style={{ justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '4px 0' }}>
          <span className={v.aktiv ? '' : 'klein'}>{v.bezeichnung} <span className="klein">· {RHYTHMEN.find((r) => r.id === v.rhythmus)?.name}{v.betrag_ct !== null ? ` · ${formatEuro(v.betrag_ct)}` : ''}{v.dauerbeleg_datei_id ? ' · Dauerbeleg' : ''}{v.aktiv ? '' : ' · inaktiv'}</span></span>
          <button className="zweit" style={{ minHeight: 30, padding: '2px 8px' }} onClick={() => setBearbeite(v)}>✎</button>
        </div>
      ))}

      <h3 style={{ fontSize: '1rem' }}>Aus vorhandenem Beleg anlegen</h3>
      <p className="klein">Übernimmt Aussteller, Modul, Kategorie, Person, Objekt und Betrag. Die PDF des Belegs dient als Dauerbeleg (z. B. Versicherungsschein, Kita-Bescheid, Grundsteuerbescheid).</p>
      <select value={quelle} onChange={(x) => setQuelle(x.target.value)} style={{ maxWidth: '100%' }}>
        <option value="">– Beleg wählen –</option>
        {sortiert.map((b) => <option key={b.id} value={b.id}>Nr. {b.belegnr} · {b.aussteller} · {formatEuro(b.betrag_ct ?? 0)}</option>)}
      </select>
      <div className="zeile" style={{ marginTop: 6 }}>
        <select value={rhythmus} onChange={(x) => setRhythmus(x.target.value as Rhythmus)}>{RHYTHMEN.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <button disabled={!online || laeuft || !quelle} onClick={() => {
          const b = belege.find((x) => x.id === quelle)
          if (b) { speichern(vorlageAusBeleg(b, crypto.randomUUID(), rhythmus)); setQuelle('') }
        }}>Vorlage anlegen</button>
      </div>

      <h3 style={{ fontSize: '1rem' }}>Erwarteten Beleg ohne Vorbild anlegen</h3>
      <p className="klein">Z. B. Lohnsteuerbescheinigung, Jahressteuerbescheinigung der Bank, Spendenquittung.</p>
      <label className="feld"><span>Bezeichnung *<Info zu="Bezeichnung *" /></span><input value={neu.bezeichnung} onChange={(x) => setNeu({ ...neu, bezeichnung: x.target.value })} placeholder="z. B. Lohnsteuerbescheinigung Maik" /></label>
      <div className="zeile">
        <select aria-label="Modul" value={neu.modul} onChange={(x) => setNeu({ ...neu, modul: x.target.value, kategorie: '' })}>
          <option value="">– Modul –</option>{konfig.module.map((m) => <option key={m.id} value={m.id}>{modulName(m.id)}</option>)}
        </select>
        {modul && modul.kategorien.length > 0 && (
          <select aria-label="Kategorie" value={neu.kategorie} onChange={(x) => setNeu({ ...neu, kategorie: x.target.value })}>
            <option value="">– Kategorie –</option>{modul.kategorien.map((k) => <option key={k.schluessel} value={k.schluessel}>{k.name}</option>)}
          </select>
        )}
        <select aria-label="Person" value={neu.person} onChange={(x) => setNeu({ ...neu, person: x.target.value })}>
          <option value="">– Person (beliebig) –</option>{[...konfig.personen, { id: GEMEINSAM, name: 'gemeinsam' }].map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Rhythmus" value={neu.rhythmus} onChange={(x) => setNeu({ ...neu, rhythmus: x.target.value as Rhythmus })}>{RHYTHMEN.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      <button disabled={!online || laeuft || !neu.bezeichnung.trim() || !neu.modul} onClick={() => { speichern({ ...neu, bezeichnung: neu.bezeichnung.trim() }); setNeu(leereVorlage(crypto.randomUUID())) }}>Erwarteten Beleg anlegen</button>
    </div>
  )
}

function VorlageForm({ v, setV, online, laeuft, speichern, abbrechen, loeschen }: {
  v: Vorlage; setV: (v: Vorlage) => void; online: boolean; laeuft: boolean; speichern: () => void; abbrechen: () => void; loeschen: () => void
}) {
  const [betrag, setBetrag] = useState(centText(v.betrag_ct))
  const cent = betrag.trim() ? parseBetrag(betrag) : null
  const fm = v.rhythmus === 'jaehrlich' ? 12 : v.rhythmus === 'vierteljaehrlich' ? 3 : 0
  return (
    <div className="karte" style={{ padding: 8 }}>
      <label className="feld"><span>Bezeichnung<Info zu="Bezeichnung" /></span><input value={v.bezeichnung} onChange={(x) => setV({ ...v, bezeichnung: x.target.value })} /></label>
      <label className="feld"><span>Aussteller (für die Zuordnung vorhandener Belege, leer = egal)<Info zu="Aussteller (für die Zuordnung vorhandener Belege, leer = egal)" /></span><input value={v.aussteller} onChange={(x) => setV({ ...v, aussteller: x.target.value })} /></label>
      <div className="zeile">
        <label className="feld"><span>Betrag € (leer = schwankt)<Info zu="Betrag € (leer = schwankt)" /></span><input inputMode="decimal" style={{ maxWidth: 110 }} value={betrag} onChange={(x) => { setBetrag(x.target.value); setV({ ...v, betrag_ct: x.target.value.trim() ? parseBetrag(x.target.value) : null }) }} /></label>
        <label className="feld"><span>Rhythmus<Info zu="Rhythmus" /></span><select value={v.rhythmus} onChange={(x) => setV({ ...v, rhythmus: x.target.value as Rhythmus, faellig_monat: 1 })}>{RHYTHMEN.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        {fm > 0 && (
          <label className="feld"><span>{fm === 12 ? 'erwartet ab Monat' : 'Monat im Quartal'}<Info zu={fm === 12 ? 'erwartet ab Monat' : 'Monat im Quartal'} /></span>
            <select value={v.faellig_monat} onChange={(x) => setV({ ...v, faellig_monat: Number(x.target.value) })}>
              {Array.from({ length: fm }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="wahl" style={{ display: 'block' }}><input type="checkbox" checked={v.aktiv} onChange={(x) => setV({ ...v, aktiv: x.target.checked })} /> aktiv</label>
      {v.dauerbeleg_datei_id && <label className="wahl" style={{ display: 'block' }}><input type="checkbox" checked onChange={() => setV({ ...v, dauerbeleg_datei_id: '' })} /> Dauerbeleg verwenden (Haken weg = jedes Mal Foto/PDF)</label>}
      {betrag.trim() && cent === null && <p className="fehler klein">Betrag ungültig</p>}
      <div className="zeile">
        <button disabled={!online || laeuft || (!!betrag.trim() && cent === null)} onClick={speichern}>Speichern</button>
        <button className="zweit" onClick={abbrechen}>Abbrechen</button>
        <button className="zweit" disabled={!online || laeuft} onClick={loeschen}>Löschen</button>
      </div>
    </div>
  )
}

/** A5: monatlicher Serientermin, ohne zusätzliche Berechtigung (Google zeigt den Termin vorausgefüllt an). */
function Erinnerung() {
  const [tag, setTag] = useState(1)
  const [stunde, setStunde] = useState(19)
  const titel = 'Steuerbelege sammeln'
  const text = `Belege des Monats in der App Steuerbeleg erfassen: ${location.origin}${import.meta.env.BASE_URL}`
  const ics = () => {
    const blob = new Blob([kalenderIcs({ titel, text, tag, stunde, ab: new Date(), uid: `steuerbeleg-erinnerung-${tag}-${stunde}` })], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'Steuerbeleg-Erinnerung.ics'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <div className="karte">
      <h2>Monatliche Erinnerung</h2>
      <div className="zeile">
        <label className="feld"><span>Tag im Monat<Info zu="Tag im Monat" /></span><select value={tag} onChange={(x) => setTag(Number(x.target.value))}>{Array.from({ length: 28 }, (_, i) => <option key={i} value={i + 1}>{i + 1}.</option>)}</select></label>
        <label className="feld"><span>Uhrzeit<Info zu="Uhrzeit" /></span><select value={stunde} onChange={(x) => setStunde(Number(x.target.value))}>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i + 7}>{i + 7}:00</option>)}</select></label>
      </div>
      <div className="zeile">
        <a href={kalenderLink({ titel, text, tag, stunde, ab: new Date() })} target="_blank" rel="noreferrer"><button>In Google Kalender eintragen</button></a>
        <button className="zweit" onClick={ics}>.ics-Datei (andere Kalender)</button>
      </div>
      <p className="klein">Google Kalender öffnet sich mit einem fertigen Serientermin (jeden Monat). Dort nur noch „Speichern“ tippen. Am besten für euch beide eintragen bzw. Anna einladen.</p>
    </div>
  )
}
