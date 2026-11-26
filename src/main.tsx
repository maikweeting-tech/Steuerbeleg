import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { verarbeiteRueckkehr } from './google/auth'

// Antwort von Google (#access_token=…) auswerten, bevor der HashRouter die Adresse liest
verarbeiteRueckkehr()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
