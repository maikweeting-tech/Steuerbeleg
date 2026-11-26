import { KONFIGURATIONEN, AKTUELLES_JAHR } from '../konfig'

export default function Info() {
  const k = KONFIGURATIONEN[AKTUELLES_JAHR]
  const offen = Object.values(k.werte).filter((w) => w.status !== 'geprüft').length
  return (
    <>
      <div className="karte">
        <h2>Über die App</h2>
        <p>Belegsammlung für die Einkommensteuererklärung (Zusammenveranlagung). Die Belege liegen ausschließlich in eurem Google Drive.</p>
        <p className="hinweis">Die App ersetzt keine Steuerberatung.</p>
      </div>
      <div className="karte">
        <h2>Konfiguration Steuerjahr {k.steuerjahr}</h2>
        <p>{k.module.length} Module, {k.module.reduce((s, m) => s + m.kategorien.length, 0)} Kategorien.</p>
        <p className={offen ? 'fehler' : 'ok'}>{offen} von {Object.keys(k.werte).length} Werten haben noch den Status „prüfen“.</p>
        <p className="klein">{k.hinweis}</p>
      </div>
      <p className="klein">Version {__APP_VERSION__}</p>
    </>
  )
}
