import { describe, expect, it } from 'vitest'
import { ordnerIdAusLink, sortiereKandidaten } from '../src/daten/einrichtung'

describe('Auswahl des Ordners „Steuer“', () => {
  it('stellt freigegebene Ordner vor eigene', () => {
    const k = sortiereKandidaten([
      { id: 'a', name: 'Steuer', mimeType: '', ownedByMe: true, owners: [{ emailAddress: 'anna@x.de' }] },
      { id: 'm', name: 'Steuer', mimeType: '', ownedByMe: false, owners: [{ emailAddress: 'maik@x.de' }] },
    ])
    expect(k.map((d) => d.id)).toEqual(['m', 'a'])
  })
})

describe('Ordner-Link', () => {
  it('liest die Id aus üblichen Drive-Links', () => {
    expect(ordnerIdAusLink('https://drive.google.com/drive/folders/1AbC_def-GHIjkl?usp=sharing')).toBe('1AbC_def-GHIjkl')
    expect(ordnerIdAusLink('https://drive.google.com/drive/u/0/folders/1AbC_def-GHIjkl')).toBe('1AbC_def-GHIjkl')
    expect(ordnerIdAusLink('https://drive.google.com/open?id=1AbC_def-GHIjkl')).toBe('1AbC_def-GHIjkl')
    expect(ordnerIdAusLink(' 1AbC_def-GHIjkl ')).toBe('1AbC_def-GHIjkl')
  })
  it('lehnt Unsinn ab', () => {
    expect(ordnerIdAusLink('Steuer')).toBeNull()
    expect(ordnerIdAusLink('https://example.com/x')).toBeNull()
  })
})
