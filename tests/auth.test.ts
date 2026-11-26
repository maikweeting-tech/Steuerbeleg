import { describe, expect, it } from 'vitest'
import { anmeldeUrl, parseAntwort } from '../src/google/auth'

describe('parseAntwort', () => {
  it('liest Token, Gültigkeit und state', () => {
    const a = parseAntwort('#access_token=abc.123&token_type=Bearer&expires_in=3599&state=xyz&scope=email')
    expect(a).toEqual({ token: 'abc.123', gueltigSek: 3599, state: 'xyz', fehler: undefined })
  })
  it('liest Fehler', () => {
    expect(parseAntwort('#error=interaction_required&state=xyz')?.fehler).toBe('interaction_required')
  })
  it('ignoriert normale App-Adressen', () => {
    expect(parseAntwort('#/')).toBeNull()
    expect(parseAntwort('#/info')).toBeNull()
    expect(parseAntwort('')).toBeNull()
  })
  it('verträgt #/ vor der Antwort', () => {
    expect(parseAntwort('#/access_token=t&state=s')?.token).toBe('t')
  })
})

describe('anmeldeUrl', () => {
  it('enthält Pflichtangaben und optional prompt=none', () => {
    const u = new URL(anmeldeUrl({ clientId: 'id', redirectUri: 'https://x.github.io/Steuerbeleg/', state: 's', stumm: true, email: 'a@b.de' }))
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(u.searchParams.get('response_type')).toBe('token')
    expect(u.searchParams.get('redirect_uri')).toBe('https://x.github.io/Steuerbeleg/')
    expect(u.searchParams.get('scope')).toContain('auth/drive')
    expect(u.searchParams.get('prompt')).toBe('none')
    expect(u.searchParams.get('login_hint')).toBe('a@b.de')
  })
  it('ohne stumm kein prompt', () => {
    const u = new URL(anmeldeUrl({ clientId: 'id', redirectUri: 'r', state: 's' }))
    expect(u.searchParams.has('prompt')).toBe(false)
  })
})
