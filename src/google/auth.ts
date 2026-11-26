// Anmeldung per OAuth-2.0-Weiterleitung (ohne Pop-up, ohne Server).
// Ablauf: App leitet zu Google → Google leitet mit #access_token=… zurück → verarbeiteRueckkehr()
// liest das Token aus der Adresse, bevor React startet. Das Token gilt ca. 1 Stunde.
// Grund für die Weiterleitung: Das Pop-up von Google Identity Services liefert auf GitHub Pages
// wegen der Cross-Origin-Opener-Policy kein Token zurück (Test 26.11.2026).
import { GOOGLE, SCOPES } from './umgebung'

export interface Nutzer {
  email: string
  name: string
}

const K = {
  token: 'steuerbeleg.token',
  angemeldet: 'angemeldet',
  email: 'steuerbeleg.email',
  state: 'steuerbeleg.oauthState',
  rueckweg: 'steuerbeleg.rueckweg',
  stumm: 'steuerbeleg.stummVersucht',
}

export interface Antwort {
  token?: string
  gueltigSek?: number
  state?: string
  fehler?: string
}

/** Liest die Antwort von Google aus dem Adress-Fragment (#access_token=…&expires_in=…&state=…). */
export function parseAntwort(hash: string): Antwort | null {
  const h = hash.replace(/^#\/?/, '')
  if (!/(^|&)(access_token|error)=/.test(h)) return null
  const p = new URLSearchParams(h)
  return {
    token: p.get('access_token') ?? undefined,
    gueltigSek: p.has('expires_in') ? Number(p.get('expires_in')) : undefined,
    state: p.get('state') ?? undefined,
    fehler: p.get('error') ?? undefined,
  }
}

/** Baut die Adresse der Google-Anmeldeseite. */
export function anmeldeUrl(o: { clientId: string; redirectUri: string; state: string; stumm?: boolean; email?: string | null }): string {
  const p = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
    state: o.state,
  })
  if (o.stumm) p.set('prompt', 'none')
  if (o.email) p.set('login_hint', o.email)
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

function lies(s: Storage, k: string): string | null {
  try { return s.getItem(k) } catch { return null }
}
function schreib(s: Storage, k: string, v: string | null) {
  try { if (v === null) s.removeItem(k); else s.setItem(k, v) } catch { /* privater Modus */ }
}

export function rueckleitAdresse(): string {
  return location.origin + import.meta.env.BASE_URL
}

/** Leitet zu Google weiter. stumm=true versucht es ohne Rückfrage (prompt=none). */
export function starteAnmeldung(stumm = false) {
  if (!GOOGLE.clientId) throw new Error('VITE_GOOGLE_CLIENT_ID ist nicht gesetzt (siehe docs/EINRICHTUNG.md).')
  const state = crypto.randomUUID()
  schreib(sessionStorage, K.state, state)
  schreib(sessionStorage, K.rueckweg, location.hash || '#/')
  if (stumm) schreib(sessionStorage, K.stumm, '1')
  location.assign(anmeldeUrl({ clientId: GOOGLE.clientId, redirectUri: rueckleitAdresse(), state, stumm, email: lies(localStorage, K.email) }))
}

let rueckkehrFehler = ''

/** Muss vor dem Start von React aufgerufen werden (main.tsx). */
export function verarbeiteRueckkehr() {
  const a = parseAntwort(location.hash)
  if (!a) return
  const erwartet = lies(sessionStorage, K.state)
  const rueckweg = lies(sessionStorage, K.rueckweg) || '#/'
  schreib(sessionStorage, K.state, null)
  schreib(sessionStorage, K.rueckweg, null)
  if (a.fehler) {
    // Bei stummem Versuch ist "interaction_required"/"login_required" normal: dann Knopf zeigen.
    rueckkehrFehler = lies(sessionStorage, K.stumm) ? 'stumm' : `Anmeldung abgebrochen (${a.fehler}).`
  } else if (!erwartet || a.state !== erwartet) {
    rueckkehrFehler = 'Anmeldung ungültig (Sicherheitsprüfung „state“ fehlgeschlagen). Bitte erneut anmelden.'
  } else if (a.token) {
    const ablauf = Date.now() + ((a.gueltigSek || 3600) - 60) * 1000
    schreib(localStorage, K.token, JSON.stringify({ wert: a.token, ablauf }))
    schreib(localStorage, K.angemeldet, '1')
    schreib(sessionStorage, K.stumm, null)
  }
  // Token aus der Adresse entfernen (nicht im Verlauf lassen)
  history.replaceState(null, '', location.pathname + location.search + rueckweg)
}

function gespeichertesToken(): string | null {
  const roh = lies(localStorage, K.token)
  if (!roh) return null
  try {
    const t = JSON.parse(roh) as { wert: string; ablauf: number }
    return Date.now() < t.ablauf ? t.wert : null
  } catch { return null }
}

export function istAngemeldet(): boolean {
  return gespeichertesToken() !== null
}

/** Fehler aus der letzten Rückkehr von Google ('' = keiner, 'stumm' = stiller Versuch erfolglos). */
export function letzterAnmeldeFehler(): string {
  return rueckkehrFehler
}

/** Darf beim Öffnen still neu angemeldet werden? Nur einmal je Browser-Tab, um Schleifen zu vermeiden. */
export function stilleAnmeldungMoeglich(): boolean {
  return warAngemeldet() && !istAngemeldet() && !rueckkehrFehler && !lies(sessionStorage, K.stumm) && navigator.onLine
}

export async function holeToken(): Promise<string> {
  const t = gespeichertesToken()
  if (t) return t
  throw new Error('Nicht angemeldet oder Anmeldung abgelaufen. Bitte auf „Mit Google anmelden“ tippen.')
}

export function warAngemeldet(): boolean {
  return lies(localStorage, K.angemeldet) === '1'
}

export async function abmelden() {
  const t = gespeichertesToken()
  schreib(localStorage, K.token, null)
  schreib(localStorage, K.angemeldet, null)
  schreib(sessionStorage, K.stumm, null)
  if (t) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: t }),
      })
    } catch { /* egal */ }
  }
}

export async function holeNutzer(): Promise<Nutzer> {
  const t = await holeToken()
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${t}` } })
  if (!r.ok) throw new Error(`Nutzerdaten nicht abrufbar (${r.status})`)
  const d = await r.json()
  schreib(localStorage, K.email, d.email)
  return { email: d.email, name: d.given_name || d.name || d.email }
}
