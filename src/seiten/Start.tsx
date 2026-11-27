import { useCallback, useEffect, useState } from 'react'
import { abmelden, holeNutzer, istAngemeldet, letzterAnmeldeFehler, starteAnmeldung, stilleAnmeldungMoeglich, type Nutzer } from '../google/auth'
import { fehlendeKennungen } from '../google/umgebung'
import { richteEin, sortiereKandidaten, sucheWurzel, speichereWurzel, verbindeOrdnerPerLink, type Ergebnis } from '../daten/einrichtung'
import { findeWurzeln, kinder, type DriveDatei } from '../google/drive'
import { KONFIGURATIONEN, AKTUELLES_JAHR } from '../konfig'
import { belegindexName } from '../daten/schema'
import { aktualisiereBelege, starteSync } from '../daten/dienste'
import { GrosseKnoepfe } from '../komponenten/Schnellerfassung'
import { useDaten, useStamm } from '../komponenten/hooks'
import { vollstaendigkeit } from '../fachlich/vorlagen'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]

export default function Start() {
  const [nutzer, setNutzer] = useState<Nutzer | null>(null)
  const [wurzel, setWurzel] = useState<DriveDatei | null>(null)
  const [kandidaten, setKandidaten] = useState<DriveDatei[]>([])
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null)
  const [pruefung, setPruefung] = useState<string[] | null>(null)
  const [meldung, setMeldung] = useState('')
  const [fremde, setFremde] = useState<DriveDatei[]>([])
  const [link, setLink] = useState('')
  const fehlend = fehlendeKennungen()
  const { wartend, belege } = useDaten(konfig.steuerjahr)
  const stamm = useStamm(konfig.steuerjahr)
  const fehlen = vollstaendigkeit(stamm.vorlagen, konfig.steuerjahr, belege, new Date().toISOString().slice(0, 10)).reduce((s, v) => s + v.fehlt, 0)
    + stamm.buchungen.filter((b) => b.markierung === 'beleg_fehlt').length

  // Eigener Ordner verbunden, obwohl ein anderer einen „Steuer“-Ordner freigegeben hat? → Hinweis zum Wechseln
  useEffect(() => {
    if (!wurzel?.ownedByMe) { setFremde([]); return }
    let aktiv = true
    findeWurzeln().then((l) => { if (aktiv) setFremde(l.filter((d) => !d.ownedByMe)) }).catch(() => undefined)
    return () => { aktiv = false }
  }, [wurzel])

  const aufgabe = useCallback(async (titel: string, f: () => Promise<void>) => {
    setFehler('')
    setMeldung('')
    setLaeuft(titel)
    try { await f() } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft('') }
  }, [])

  const nachAnmeldung = useCallback(async () => {
    setNutzer(await holeNutzer())
    const r = await sucheWurzel()
    setWurzel(r.wurzel)
    setKandidaten(r.kandidaten)
    void starteSync()
  }, [])

  // „Ordner wechseln“: nichts automatisch wählen, alle gefundenen Ordner zur Auswahl zeigen
  const wechsle = useCallback(() => aufgabe('Suche Ordner …', async () => {
    speichereWurzel(null); setWurzel(null); setFremde([]); setErgebnis(null)
    setKandidaten(sortiereKandidaten(await findeWurzeln()))
  }), [aufgabe])
  const ort = useLocation()
  const navigiere = useNavigate()
  const wechselGewuenscht = new URLSearchParams(ort.search).get('ordner') === 'wechseln'

  useEffect(() => {
    if (fehlend.length) return
    if (wechselGewuenscht && istAngemeldet()) {
      navigiere('/', { replace: true })
      aufgabe('Anmeldung …', async () => { setNutzer(await holeNutzer()) }).then(wechsle)
      return
    }
    const f = letzterAnmeldeFehler()
    if (f && f !== 'stumm') setFehler(f)
    if (istAngemeldet()) aufgabe('Anmeldung …', nachAnmeldung)
    else if (stilleAnmeldungMoeglich()) setLaeuft('Anmeldung …') // Weiterleitung startet in App.tsx
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (fehlend.length)
    return (
      <div className="karte">
        <h2>Einrichtung unvollständig</h2>
        <p className="fehler">Es fehlen Google-Kennungen: {fehlend.join(', ')}</p>
        <p>Siehe Anleitung <code>docs/EINRICHTUNG.md</code>, Abschnitt Google-Cloud-Konsole.</p>
      </div>
    )

  return (
    <>
      <GrosseKnoepfe />
      <div className="status-zeile">
        <Link to="/belege">{belege.length} Beleg{belege.length === 1 ? '' : 'e'} {konfig.steuerjahr}</Link>
        {fehlen > 0 && <Link to="/check" className="fehler">{fehlen} Beleg{fehlen === 1 ? '' : 'e'} fehlen</Link>}
        {wartend.length > 0 && <span className="marke-gelb">{wartend.length} warten auf Übertragung</span>}
        {nutzer && wurzel && (
          <span className="klein">
            Ordner: {wurzel.name} ({wurzel.ownedByMe ? 'eigener' : `von ${wurzel.owners?.[0]?.displayName ?? wurzel.owners?.[0]?.emailAddress ?? 'anderer Person'}`}){' '}
            <button className="zweit" style={{ minHeight: 30, padding: '2px 8px' }} disabled={!!laeuft} onClick={() => void wechsle()}>Ordner wechseln</button>
          </span>
        )}
        {!nutzer && !laeuft && <span className="fehler klein">Nicht angemeldet – Belege werden erst nach der Anmeldung übertragen.</span>}
      </div>

      <details className="einrichtung" open={!(nutzer && wurzel)}>
      <summary>Einrichtung {nutzer && wurzel ? '✓ (Anmeldung, Ordner, Freigabe)' : '– bitte abschließen'}</summary>
      <div className="karte">
        <h2>1. Anmeldung</h2>
        {nutzer ? (
          <div className="zeile">
            <span className="ok">Angemeldet als {nutzer.name} ({nutzer.email})</span>
            <button className="zweit" onClick={() => { abmelden(); setNutzer(null); setWurzel(null) }}>Abmelden</button>
          </div>
        ) : (
          <button disabled={!!laeuft} onClick={() => aufgabe('Weiterleitung zu Google …', async () => starteAnmeldung())}>
            Mit Google anmelden
          </button>
        )}
      </div>

      {nutzer && (
        <div className="karte">
          <h2>2. Ordner „Steuer“ in Google Drive</h2>
          {wurzel ? (
            <p className="ok">
              Verbunden: <a href={wurzel.webViewLink} target="_blank" rel="noreferrer">{wurzel.name}</a>{' '}
              <span className="klein">(Eigentümer: {wurzel.ownedByMe ? 'ich' : wurzel.owners?.[0]?.displayName ?? wurzel.owners?.[0]?.emailAddress ?? 'unbekannt'})</span>
            </p>
          ) : null}
          {wurzel && fremde.length > 0 && (
            <div className="warnung">
              <strong>Achtung:</strong> Du nutzt deinen eigenen Ordner „Steuer“. Es gibt aber einen freigegebenen Ordner
              {fremde.length > 1 ? ' (mehrere)' : ''}. Für die gemeinsame Belegsammlung bitte wechseln:
              <div className="zeile" style={{ marginTop: 6 }}>
                {fremde.map((k) => (
                  <button key={k.id} disabled={!!laeuft} onClick={() => aufgabe('Wechsle Ordner …', async () => {
                    speichereWurzel(k.id); setWurzel(k); setFremde([])
                    await aktualisiereBelege(konfig.steuerjahr).catch(() => undefined)
                    setMeldung('Ordner gewechselt. Belege und Objekte kommen jetzt aus dem gemeinsamen Ordner.')
                  })}>Ordner von {k.owners?.[0]?.displayName ?? k.owners?.[0]?.emailAddress ?? 'anderer Person'} nutzen</button>
                ))}
              </div>
            </div>
          )}
          {wurzel ? null : kandidaten.length ? (
            <>
              <p>Gefundene Ordner „Steuer“. Bitte den <strong>gemeinsamen</strong> auswählen (meist der, dessen Eigentümer nicht „ich“ ist):</p>
              <ul className="liste">
                {kandidaten.map((k) => (
                  <li key={k.id} style={{ marginBottom: 6 }}>
                    <button className="zweit" disabled={!!laeuft} onClick={() => aufgabe('Verbinde …', async () => {
                      speichereWurzel(k.id); setWurzel(k); setKandidaten([])
                      await aktualisiereBelege(konfig.steuerjahr).catch(() => undefined)
                      setMeldung('Ordner verbunden. Belege und Objekte kommen jetzt aus diesem Ordner.')
                    })}>
                      {k.name} – Eigentümer: {k.ownedByMe ? 'ich' : k.owners?.[0]?.displayName ?? k.owners?.[0]?.emailAddress}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="warnung">
              <strong>Kein Ordner „Steuer“ gefunden.</strong> Wenn der Ordner schon bei deinem Partner bzw. deiner Partnerin liegt:
              <ol className="liste" style={{ margin: '6px 0' }}>
                <li>Dort in Google Drive den Ordner „Steuer“ für dich freigeben, Recht <strong>„Bearbeiter“</strong>.</li>
                <li>Hier „Erneut suchen“ tippen – oder den Link zum Ordner unten einfügen.</li>
              </ol>
              <div className="zeile">
                <button disabled={!!laeuft} onClick={() => aufgabe('Suche …', nachAnmeldung)}>Erneut suchen</button>
              </div>
              <label className="feld" style={{ marginTop: 8 }}><span>Link zum Ordner (aus Drive oder der Freigabe-Mail)</span>
                <input value={link} onChange={(x) => setLink(x.target.value)} placeholder="https://drive.google.com/drive/folders/…" />
              </label>
              <button className="zweit" disabled={!!laeuft || !link.trim()} onClick={() => aufgabe('Verbinde …', async () => {
                const d = await verbindeOrdnerPerLink(link)
                setWurzel(d); setLink('')
                await aktualisiereBelege(konfig.steuerjahr).catch(() => undefined)
                setMeldung(`Ordner verbunden (Eigentümer: ${d.ownedByMe ? 'ich' : d.owners?.[0]?.displayName ?? 'andere Person'}).`)
              })}>Ordner verbinden</button>
            </div>
          )}
          <div className="zeile">
            {wurzel && (
              <button disabled={!!laeuft} onClick={() => aufgabe('Einrichtung …', async () => {
                setErgebnis(await richteEin(konfig, setLaeuft, wurzel))
              })}>Struktur {konfig.steuerjahr} prüfen / ergänzen</button>
            )}
            {!wurzel && !kandidaten.length && (
              <details style={{ marginTop: 8 }}>
                <summary className="klein">Ich bin die erste Person – Ordner neu anlegen</summary>
                <button className="zweit" disabled={!!laeuft} onClick={() => aufgabe('Einrichtung …', async () => {
                  const e = await richteEin(konfig, setLaeuft, null)
                  setWurzel(e.wurzel); setErgebnis(e)
                })}>Neu anlegen (Steuer/{konfig.steuerjahr})</button>
              </details>
            )}
            {wurzel && (
              <button className="zweit" disabled={!!laeuft} onClick={() => void wechsle()}>
                Ordner wechseln
              </button>
            )}
          </div>
          <p className="klein">Nur einer legt den Ordner an (Maik). Die Partnerin wählt den freigegebenen Ordner, nicht „Neu anlegen“.</p>
          {ergebnis && (
            <p className="ok">
              Fertig: {ergebnis.ordnerAnzahl} Ordner geprüft/angelegt,{' '}
              <a href={ergebnis.belegindex.webViewLink} target="_blank" rel="noreferrer">{belegindexName(konfig.steuerjahr)}</a> bereit.
            </p>
          )}
        </div>
      )}

      {nutzer && wurzel && (
        <div className="karte">
          <h2>3. Zugriff prüfen</h2>
          <p className="klein">Zeigt, was die App in „Steuer/{konfig.steuerjahr}“ sehen kann. Bei Anna müssen hier Maiks Ordner und der Belegindex erscheinen.</p>
          <button className="zweit" disabled={!!laeuft} onClick={() => aufgabe('Prüfe …', async () => {
            const jahr = (await kinder(wurzel.id)).find((d) => d.name === String(konfig.steuerjahr))
            if (!jahr) { setPruefung([`Kein Ordner „${konfig.steuerjahr}“ sichtbar.`]); return }
            const inhalt = await kinder(jahr.id)
            setPruefung(inhalt.length ? inhalt.map((d) => d.name).sort((a, b) => a.localeCompare(b, 'de')) : ['Ordner ist leer oder nicht sichtbar.'])
          })}>Zugriff prüfen</button>
          {pruefung && <ul className="liste">{pruefung.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      {nutzer && wurzel && (
        <div className="karte">
          <h2>4. Für Partner/in freigeben</h2>
          <p>
            Die Freigabe erfolgt direkt in Google Drive (die App darf mit ihrer knappen Berechtigung keine Ordner freigeben):
            Ordner öffnen → beim Namen „Steuer“ auf ▾ → „Teilen“ → E-Mail-Adresse eintragen → Rolle „Mitbearbeiter“ → Senden.
          </p>
          <a href={wurzel.webViewLink} target="_blank" rel="noreferrer"><button type="button" className="zweit">Ordner „Steuer“ in Drive öffnen</button></a>
        </div>
      )}

      </details>
      <p className="hinweis">Die App ersetzt keine Steuerberatung.</p>

      {laeuft && <p className="klein">{laeuft}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {meldung && <p className="ok">{meldung}</p>}
    </>
  )
}
