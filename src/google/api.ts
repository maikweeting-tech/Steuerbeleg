import { holeToken } from './auth'

/** fetch mit Google-Token und verständlicher Fehlermeldung. */
export async function googleFetch(url: string, init: RequestInit = {}): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = await holeToken()
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  if (!r.ok) {
    let text = ''
    try { text = (await r.json())?.error?.message ?? '' } catch { /* kein JSON */ }
    throw new Error(`Google-Fehler ${r.status}: ${text || r.statusText}`)
  }
  return r.status === 204 ? null : r.json()
}
