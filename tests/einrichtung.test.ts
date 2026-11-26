import { describe, expect, it } from 'vitest'
import { sortiereKandidaten } from '../src/daten/einrichtung'

describe('Auswahl des Ordners „Steuer“', () => {
  it('stellt freigegebene Ordner vor eigene', () => {
    const k = sortiereKandidaten([
      { id: 'a', name: 'Steuer', mimeType: '', ownedByMe: true, owners: [{ emailAddress: 'anna@x.de' }] },
      { id: 'm', name: 'Steuer', mimeType: '', ownedByMe: false, owners: [{ emailAddress: 'maik@x.de' }] },
    ])
    expect(k.map((d) => d.id)).toEqual(['m', 'a'])
  })
})
