import { holeToken } from './auth'

/** Wartezeiten bei 429/503 (Kontingent pro Minute überschritten bzw. Dienst kurz nicht erreichbar). */
export const WARTEZEITEN_MS = [2000, 5000, 15000, 30000, 60000]
let warte = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
/** Nur für Tests: Warten ersetzen. */
export function setzeWarten(f: (ms: number) => Promise<void>) { warte = f }

/** fetch mit Google-Token und verständlicher Fehlermeldung. Bei 429/503 automatisch mit Wartezeit wiederholen. */
export async function googleFetch(url: string, init: RequestInit = {}): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let r: Response
  for (let versuch = 0; ; versuch++) {
    const t = await holeToken()
    r = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    })
    if ((r.status !== 429 && r.status !== 503) || versuch >= WARTEZEITEN_MS.length) break
    const nach = Number(r.headers.get('Retry-After'))
    await warte(Number.isFinite(nach) && nach > 0 ? nach * 1000 : WARTEZEITEN_MS[versuch])
  }
  if (!r.ok) {
    let text = ''
    try { text = (await r.json())?.error?.message ?? '' } catch { /* kein JSON */ }
    throw new Error(`Google-Fehler ${r.status}: ${text || r.statusText}`)
  }
  return r.status === 204 ? null : r.json()
}
