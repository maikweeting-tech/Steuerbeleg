// Google-Anfragen: bei 429/503 automatisch mit Wartezeit wiederholen
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/google/auth', () => ({ holeToken: async () => 'T' }))
import { googleFetch, setzeWarten, WARTEZEITEN_MS } from '../src/google/api'

const antwort = (status: number, body: unknown = {}, kopf: Record<string, string> = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: kopf })

describe('googleFetch', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('wiederholt bei 429 und liefert dann das Ergebnis', async () => {
    const gewartet: number[] = []
    setzeWarten(async (ms) => { gewartet.push(ms) })
    const f = vi.fn().mockResolvedValueOnce(antwort(429, { error: { message: 'Quota exceeded' } }))
      .mockResolvedValueOnce(antwort(429, {}, { 'Retry-After': '7' }))
      .mockResolvedValueOnce(antwort(200, { ok: 1 }))
    vi.stubGlobal('fetch', f)
    expect(await googleFetch('https://x')).toEqual({ ok: 1 })
    expect(f).toHaveBeenCalledTimes(3)
    expect(gewartet).toEqual([WARTEZEITEN_MS[0], 7000])
  })
  it('gibt nach allen Versuchen eine Fehlermeldung, andere Fehler sofort', async () => {
    setzeWarten(async () => {})
    const f = vi.fn().mockImplementation(async () => antwort(429, { error: { message: 'Quota exceeded' } }))
    vi.stubGlobal('fetch', f)
    await expect(googleFetch('https://x')).rejects.toThrow('Google-Fehler 429: Quota exceeded')
    expect(f).toHaveBeenCalledTimes(WARTEZEITEN_MS.length + 1)
    const g = vi.fn().mockResolvedValue(antwort(404, { error: { message: 'weg' } }))
    vi.stubGlobal('fetch', g)
    await expect(googleFetch('https://x')).rejects.toThrow('404')
    expect(g).toHaveBeenCalledTimes(1)
  })
})
