import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Start from './seiten/Start'
import Info from './seiten/Info'
import Erfassen from './seiten/Erfassen'
import Belege from './seiten/Belege'
import Objekte from './seiten/Objekte'
import ObjektSeite from './seiten/Objekt'
import BelegBearbeiten from './seiten/BelegBearbeiten'
import Fahrten from './seiten/Fahrten'
import Kinder from './seiten/Kinder'
import Check from './seiten/Check'
import Konto from './seiten/Konto'
import Export from './seiten/Export'
import Bescheid from './seiten/Bescheid'
import Erklaerung from './seiten/Erklaerung'
import { starteAnmeldung, stilleAnmeldungMoeglich } from './google/auth'
import { automatischerSync } from './daten/dienste'
import { useDaten } from './komponenten/hooks'
import { AKTUELLES_JAHR, JAHRE, waehleJahr } from './konfig'
import { KameraKnopf } from './komponenten/Schnellerfassung'
import UpdateHinweis from './komponenten/UpdateHinweis'
import JahrAnlegen from './komponenten/JahrAnlegen'

function Kamera() {
  const p = useLocation().pathname
  return p === '/erfassen' || p.startsWith('/belege/') ? null : <KameraKnopf />
}

function Navigation() {
  const { wartend } = useDaten(AKTUELLES_JAHR)
  return (
    <nav className="haupt">
      <NavLink to="/" end>Start</NavLink>
      <NavLink to="/erfassen">Erfassen</NavLink>
      <NavLink to="/belege">Belege{wartend.length > 0 && <> <span className="marke" title="warten auf Übertragung">{wartend.length}</span></>}</NavLink>
      <NavLink to="/check">Check</NavLink>
      <NavLink to="/konto">Konto</NavLink>
      <NavLink to="/erklaerung">Erklärung</NavLink>
      <NavLink to="/export">Export</NavLink>
      <NavLink to="/bescheid">Bescheid</NavLink>
      <NavLink to="/objekte">Objekte</NavLink>
      <NavLink to="/fahrten">Fahrten</NavLink>
      <NavLink to="/kinder">Kinder</NavLink>
      <NavLink to="/info">Info</NavLink>
    </nav>
  )
}

export default function App() {
  useEffect(() => {
    // Nach erneutem Öffnen still neu anmelden (einmal je Tab), sonst Warteschlange übertragen
    if (stilleAnmeldungMoeglich()) starteAnmeldung(true)
    else automatischerSync()
  }, [])

  return (
    <HashRouter>
      <header>
        <h1>Steuerbeleg{' '}
          <select className="jahr" aria-label="Steuerjahr" value={AKTUELLES_JAHR} onChange={(e) => waehleJahr(Number(e.target.value))}>
            {JAHRE.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </h1>
        <Navigation />
      </header>
      <main>
        <UpdateHinweis />
        <JahrAnlegen />
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/erfassen" element={<Erfassen />} />
          <Route path="/belege" element={<Belege />} />
          <Route path="/belege/:id" element={<BelegBearbeiten />} />
          <Route path="/fahrten" element={<Fahrten />} />
          <Route path="/kinder" element={<Kinder />} />
          <Route path="/objekte" element={<Objekte />} />
          <Route path="/objekte/:id" element={<ObjektSeite />} />
          <Route path="/check" element={<Check />} />
          <Route path="/konto" element={<Konto />} />
          <Route path="/export" element={<Export />} />
          <Route path="/bescheid" element={<Bescheid />} />
          <Route path="/erklaerung" element={<Erklaerung />} />
          <Route path="/info" element={<Info />} />
        </Routes>
      </main>
      <Kamera />
      <footer className="klein">Die App ersetzt keine Steuerberatung. Sie berechnet keine Steuer und übermittelt nichts an ELSTER.</footer>
    </HashRouter>
  )
}
