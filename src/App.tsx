import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import Start from './seiten/Start'
import Info from './seiten/Info'

export default function App() {
  return (
    <HashRouter>
      <header>
        <h1><Link to="/" style={{ textDecoration: 'none' }}>Steuerbeleg</Link></h1>
        <Link to="/info">Info</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/info" element={<Info />} />
        </Routes>
      </main>
      <footer className="klein">Die App ersetzt keine Steuerberatung. Sie berechnet keine Steuer und übermittelt nichts an ELSTER.</footer>
    </HashRouter>
  )
}
