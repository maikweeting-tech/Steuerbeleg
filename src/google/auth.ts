// Anmeldung mit Google Identity Services (Token-Modell, nur im Browser, kein Server).
// Das Zugriffstoken gilt ca. 1 Stunde und wird bei Bedarf still erneuert.
import { GOOGLE, SCOPES } from './umgebung'
import { ladeSkript } from './skript'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any

export interface Nutzer {
  email: string
  name: string
}

let tokenClient: any = null
let token: { wert: string; ablauf: number } | null = null
let warteschlange: { ok: (t: string) => void; fehler: (e: Error) => void }[] = []

async function client() {
  if (tokenClient) return tokenClient
  if (!GOOGLE.clientId) throw new Error('VITE_GOOGLE_CLIENT_ID ist nicht gesetzt (siehe docs/EINRICHTUNG.md).')
  await ladeSkript('https://accounts.google.com/gsi/client')
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE.clientId,
    scope: SCOPES,
    callback: (antwort: any) => {
      const w = warteschlange
      warteschlange = []
      if (antwort.error) {
        w.forEach((x) => x.fehler(new Error(antwort.error_description || antwort.error)))
        return
      }
      token = { wert: antwort.access_token, ablauf: Date.now() + (antwort.expires_in - 60) * 1000 }
      try { localStorage.setItem('angemeldet', '1') } catch { /* privat */ }
      w.forEach((x) => x.ok(token!.wert))
    },
    error_callback: (e: any) => {
      const w = warteschlange
      warteschlange = []
      w.forEach((x) => x.fehler(new Error(e?.message || 'Anmeldung abgebrochen')))
    },
  })
  return tokenClient
}

/** Fordert ein Token an. interaktiv=true zeigt das Google-Fenster (nur nach Klick aufrufen). */
export async function holeToken(interaktiv = false): Promise<string> {
  if (token && Date.now() < token.ablauf) return token.wert
  const c = await client()
  return new Promise((ok, fehler) => {
    warteschlange.push({ ok, fehler })
    c.requestAccessToken({ prompt: interaktiv ? 'consent' : '' })
  })
}

export function warAngemeldet(): boolean {
  try { return localStorage.getItem('angemeldet') === '1' } catch { return false }
}

export async function abmelden() {
  if (token) {
    try { google.accounts.oauth2.revoke(token.wert) } catch { /* egal */ }
  }
  token = null
  try { localStorage.removeItem('angemeldet') } catch { /* privat */ }
}

export async function holeNutzer(): Promise<Nutzer> {
  const t = await holeToken()
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${t}` } })
  if (!r.ok) throw new Error(`Nutzerdaten nicht abrufbar (${r.status})`)
  const d = await r.json()
  return { email: d.email, name: d.given_name || d.name || d.email }
}
