import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Start from './seiten/Start'
import Info from './seiten/Info'
import Erfassen from './seiten/Erfassen'
import Belege from './seiten/Belege'
import { starteAnmeldung, stilleAnmeldungMoeglich } from './google/auth'
import { automatischerSync } from './daten/dienste'
import { useDaten } from './komponenten/hooks'
import { AKTUELLES_JAHR } from './konfig'

function Navigation() {
  const { wartend } = useDaten(AKTUELLES_JAHR)
  return (
    <nav className="haupt">
      <NavLink to="/" end>Start</NavLink>
      <NavLink to="/erfassen">Erfassen</NavLink>
      <NavLink to="/belege">Belege{wartend.length > 0 && <> <span className="marke" title="warten auf Übertragung">{wartend.length}</span></>}</NavLink>
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
        <h1>Steuerbeleg</h1>
        <Navigation />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/erfassen" element={<Erfassen />} />
          <Route path="/belege" element={<Belege />} />
          <Route path="/info" element={<Info />} />
        </Routes>
      </main>
      <footer className="klein">Die App ersetzt keine Steuerberatung. Sie berechnet keine Steuer und übermittelt nichts an ELSTER.</footer>
    </HashRouter>
  )
}
