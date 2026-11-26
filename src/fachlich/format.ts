// Deutsche Formatierung: Komma als Dezimaltrennzeichen, Beträge in €, Datum TT.MM.JJJJ.
// Beträge werden intern als ganze Cent gespeichert (keine Rundungsfehler).

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function formatEuro(cent: number): string {
  return euro.format(cent / 100)
}

/** "412,50" | "1.234,5" | "412" → Cent. Gibt null zurück, wenn keine gültige Zahl. */
export function parseBetrag(text: string): number | null {
  const t = text.replace(/\s|€|EUR/gi, '')
  if (!/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$|^-?\d+(,\d{1,2})?$/.test(t)) return null
  const [ganz, dez = ''] = t.replace(/\./g, '').split(',')
  const neg = ganz.startsWith('-')
  const cent = Math.abs(parseInt(ganz, 10)) * 100 + parseInt((dez + '00').slice(0, 2), 10)
  return neg ? -cent : cent
}

/** ISO-Datum "2026-03-14" → "14.03.2026" */
export function formatDatum(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

/** "14.03.2026" → "2026-03-14", null bei ungültigem Datum */
export function parseDatum(text: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim())
  if (!m) return null
  const [t, mo, j] = [+m[1], +m[2], +m[3]]
  const d = new Date(Date.UTC(j, mo - 1, t))
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null
  return `${j}-${String(mo).padStart(2, '0')}-${String(t).padStart(2, '0')}`
}
