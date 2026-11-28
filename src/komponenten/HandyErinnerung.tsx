// Erinnerungen aufs Handy einschalten: Erlaubnis für Benachrichtigungen + Hintergrund-Prüfung (wo der Browser sie anbietet).
import { useEffect, useState } from 'react'
import { aktuelleErinnerungen, erinnere, kannBenachrichtigen, SYNC_TAG, zeigeMit } from '../daten/erinnern'
import type { Erinnerung } from '../fachlich/erinnerungen'
import Info from './Info'

type Periodic = { periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void>; getTags: () => Promise<string[]> } }


export default function HandyErinnerung() {
  const [erlaubnis, setErlaubnis] = useState(() => (kannBenachrichtigen() ? Notification.permission : 'unsupported'))
  const [hintergrund, setHintergrund] = useState<'aktiv' | 'nicht verfügbar' | 'aus' | '?'>('?')
  const [liste, setListe] = useState<Erinnerung[]>([])
  const [meldung, setMeldung] = useState('')

  const pruefeHintergrund = async () => {
    if (!('serviceWorker' in navigator)) { setHintergrund('nicht verfügbar'); return }
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & Periodic
    if (!reg.periodicSync) { setHintergrund('nicht verfügbar'); return }
    setHintergrund((await reg.periodicSync.getTags()).includes(SYNC_TAG) ? 'aktiv' : 'aus')
  }
  useEffect(() => { void pruefeHintergrund(); void aktuelleErinnerungen().then(setListe) }, [])

  const einschalten = async () => {
    setMeldung('')
    const p = await Notification.requestPermission()
    setErlaubnis(p)
    if (p !== 'granted') { setMeldung('Benachrichtigungen wurden nicht erlaubt. Ändern: Android-Einstellungen → Apps → Steuerbeleg (bzw. Chrome) → Benachrichtigungen.'); return }
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & Periodic
    try {
      const status = await (navigator.permissions?.query({ name: 'periodic-background-sync' as PermissionName }).then((x) => x.state).catch(() => 'prompt'))
      if (reg.periodicSync && status !== 'denied') await reg.periodicSync.register(SYNC_TAG, { minInterval: 24 * 60 * 60 * 1000 })
    } catch { /* Browser lehnt ab: nur Prüfung beim Öffnen */ }
    await pruefeHintergrund()
    const n = await erinnere(zeigeMit(reg))
    setMeldung(n ? `${n} Erinnerung(en) angezeigt.` : 'Eingeschaltet. Gerade gibt es nichts Neues.')
  }
  const test = async () => {
    const reg = await navigator.serviceWorker.ready
    await zeigeMit(reg)({ id: `test-${Date.now()}`, titel: 'Steuerbeleg: Test-Erinnerung', text: 'So sehen Erinnerungen aus. Tippen öffnet „Check“.', ziel: '/check' })
  }

  return (
    <div className="karte">
      <h2>Erinnerungen aufs Handy<Info text="Die App meldet sich, wenn ein regelmäßiger Beleg fehlt (aus deinen Vorlagen, z. B. Kita-Beitrag November) oder die Einspruchsfrist eines Bescheids bald endet (14, 7, 3, 1 Tag vorher). Geprüft wird beim Öffnen der App und – wo Android/Chrome es erlaubt – etwa einmal am Tag im Hintergrund." /></h2>
      {erlaubnis === 'unsupported' && <p className="klein">Dieser Browser kann keine Benachrichtigungen anzeigen.</p>}
      {erlaubnis !== 'unsupported' && (
        <>
          <p className="klein">Benachrichtigungen: <strong>{erlaubnis === 'granted' ? 'erlaubt' : erlaubnis === 'denied' ? 'blockiert' : 'noch nicht erlaubt'}</strong> · Hintergrund-Prüfung: <strong>{hintergrund}</strong></p>
          <div className="zeile">
            {erlaubnis !== 'granted' && <button disabled={erlaubnis === 'denied'} onClick={() => void einschalten()}>Erinnerungen einschalten</button>}
            {erlaubnis === 'granted' && hintergrund !== 'aktiv' && <button className="zweit" onClick={() => void einschalten()}>Hintergrund-Prüfung erneut versuchen</button>}
            {erlaubnis === 'granted' && <button className="zweit" onClick={() => void test()}>Test-Erinnerung</button>}
          </div>
        </>
      )}
      {meldung && <p className="klein">{meldung}</p>}
      {hintergrund === 'nicht verfügbar' && <p className="klein">Ohne Hintergrund-Prüfung kommen Erinnerungen nur, wenn du die App öffnest. Für feste Termine (z. B. Einspruchsfrist) zusätzlich den Kalender-Eintrag unten nutzen.</p>}
      <details>
        <summary className="klein">Aktuelle Erinnerungen ({liste.length})</summary>
        {liste.length ? <ul className="liste klein">{liste.map((e) => <li key={e.id}><strong>{e.titel}</strong> – {e.text}</li>)}</ul> : <p className="klein">Keine.</p>}
      </details>
    </div>
  )
}
