import { useCallback, useEffect, useState } from 'react'
import { abmelden, holeNutzer, holeToken, warAngemeldet, type Nutzer } from '../google/auth'
import { fehlendeKennungen } from '../google/umgebung'
import { richteEin, sucheWurzel, speichereWurzel, type Ergebnis } from '../daten/einrichtung'
import { kinder, type DriveDatei } from '../google/drive'
import { KONFIGURATIONEN, AKTUELLES_JAHR } from '../konfig'
import { belegindexName } from '../daten/schema'

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
  const fehlend = fehlendeKennungen()

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
  }, [])

  useEffect(() => {
    // Nach erneutem Öffnen still anmelden, falls schon einmal angemeldet
    if (warAngemeldet() && !fehlend.length) aufgabe('Anmeldung …', async () => { await holeToken(false); await nachAnmeldung() })
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
      <p className="hinweis">Die App ersetzt keine Steuerberatung.</p>

      <div className="karte">
        <h2>1. Anmeldung</h2>
        {nutzer ? (
          <div className="zeile">
            <span className="ok">Angemeldet als {nutzer.name} ({nutzer.email})</span>
            <button className="zweit" onClick={() => { abmelden(); setNutzer(null); setWurzel(null) }}>Abmelden</button>
          </div>
        ) : (
          <button disabled={!!laeuft} onClick={() => aufgabe('Anmeldung …', async () => { await holeToken(true); await nachAnmeldung() })}>
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
          ) : kandidaten.length ? (
            <>
              <p>Es gibt mehrere Ordner „Steuer“. Bitte den gemeinsamen auswählen:</p>
              <ul className="liste">
                {kandidaten.map((k) => (
                  <li key={k.id} style={{ marginBottom: 6 }}>
                    <button className="zweit" onClick={() => { speichereWurzel(k.id); setWurzel(k); setKandidaten([]) }}>
                      {k.name} – Eigentümer: {k.ownedByMe ? 'ich' : k.owners?.[0]?.displayName ?? k.owners?.[0]?.emailAddress}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Noch kein Ordner „Steuer“ gefunden. Wurde er für dich freigegeben? Sonst neu anlegen.</p>
          )}
          <div className="zeile">
            {wurzel && (
              <button disabled={!!laeuft} onClick={() => aufgabe('Einrichtung …', async () => {
                setErgebnis(await richteEin(konfig, setLaeuft, wurzel))
              })}>Struktur {konfig.steuerjahr} prüfen / ergänzen</button>
            )}
            {!wurzel && !kandidaten.length && (
              <button disabled={!!laeuft} onClick={() => aufgabe('Einrichtung …', async () => {
                const e = await richteEin(konfig, setLaeuft, null)
                setWurzel(e.wurzel); setErgebnis(e)
              })}>Neu anlegen (Steuer/{konfig.steuerjahr})</button>
            )}
            {wurzel && (
              <button className="zweit" disabled={!!laeuft} onClick={() => { speichereWurzel(null); setWurzel(null); aufgabe('Suche …', nachAnmeldung) }}>
                Anderen Ordner wählen
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

      {laeuft && <p className="klein">{laeuft}</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {meldung && <p className="ok">{meldung}</p>}
    </>
  )
}
