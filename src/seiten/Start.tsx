import { useCallback, useEffect, useState } from 'react'
import { abmelden, holeNutzer, holeToken, warAngemeldet, type Nutzer } from '../google/auth'
import { fehlendeKennungen } from '../google/umgebung'
import { richteEin, sucheWurzel, speichereWurzel, type Ergebnis } from '../daten/einrichtung'
import { kinder, datei, type DriveDatei } from '../google/drive'
import { waehleOrdner } from '../google/picker'
import { KONFIGURATIONEN, AKTUELLES_JAHR } from '../konfig'
import { belegindexName } from '../daten/schema'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]

export default function Start() {
  const [nutzer, setNutzer] = useState<Nutzer | null>(null)
  const [wurzel, setWurzel] = useState<DriveDatei | null>(null)
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
    setWurzel(await sucheWurzel())
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
            <p className="ok">Gefunden: <a href={wurzel.webViewLink} target="_blank" rel="noreferrer">{wurzel.name}</a></p>
          ) : (
            <p>Noch kein Ordner verbunden.</p>
          )}
          <div className="zeile">
            <button disabled={!!laeuft} onClick={() => aufgabe('Einrichtung …', async () => {
              const e = await richteEin(konfig, setLaeuft, wurzel)
              setWurzel(e.wurzel); setErgebnis(e)
            })}>
              {wurzel ? `Struktur ${konfig.steuerjahr} prüfen / ergänzen` : `Neu anlegen (Steuer/${konfig.steuerjahr})`}
            </button>
            <button className="zweit" disabled={!!laeuft} onClick={() => aufgabe('Dateiauswahl …', async () => {
              const o = await waehleOrdner()
              if (o) { speichereWurzel(o.id); setWurzel(await datei(o.id)) }
            })}>
              Freigegebenen Ordner auswählen
            </button>
          </div>
          <p className="klein">Maik: „Neu anlegen“. Anna: „Freigegebenen Ordner auswählen“ und den von Maik freigegebenen Ordner „Steuer“ wählen.</p>
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
