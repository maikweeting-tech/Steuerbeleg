// Eingang: PDFs, die z. B. aus Gmail nach Steuer/<Jahr>/Eingang_Gmail gelegt wurden und noch zugeordnet werden müssen.
// Reine Hilfsfunktionen (ohne Google), damit sie testbar sind.

export const EINGANG_ORDNER = 'Eingang_Gmail'

export interface EingangDatei {
  id: string
  name: string
  mimeType: string
  /** Jahresordner, in dem die Datei liegt (nicht zwingend das Steuerjahr des Belegs) */
  jahr: number
}

/**
 * Datum und Absender aus dem Dateinamen „Datum_Absender…“ lesen (nur als Vorschlag).
 * Erkannt werden 2025-03-14, 20250314 und 14.03.2025 am Anfang des Namens.
 */
export function ausDateiname(name: string): { datum: string; absender: string } {
  const ohne = name.replace(/\.pdf$/i, '')
  const m = /^(\d{4})-?(\d{2})-?(\d{2})[_\s-]+(.*)$/.exec(ohne) ?? (() => {
    const d = /^(\d{2})\.(\d{2})\.(\d{4})[_\s-]+(.*)$/.exec(ohne)
    return d ? [d[0], d[3], d[2], d[1], d[4]] as unknown as RegExpExecArray : null
  })()
  if (!m) return { datum: '', absender: '' }
  const [, j, mo, t, rest] = m
  const datum = `${j}-${mo}-${t}`
  const gueltig = !Number.isNaN(Date.parse(datum)) && Number(mo) >= 1 && Number(mo) <= 12 && Number(t) >= 1 && Number(t) <= 31
  const absender = rest.split('_')[0].trim()
  return { datum: gueltig ? datum : '', absender }
}

/** Offene Eingänge: nur PDFs, die noch keinem Beleg/Dokument gehören und nicht in der Warteschlange stehen. Sortiert nach Name. */
export function offeneEingaenge(dateien: EingangDatei[], erledigteIds: Set<string>): EingangDatei[] {
  return dateien
    .filter((d) => (d.mimeType === 'application/pdf' || /\.pdf$/i.test(d.name)) && !erledigteIds.has(d.id))
    .sort((a, b) => a.jahr - b.jahr || a.name.localeCompare(b.name))
}

/** Alle Datei-Ids, die schon einem Beleg zugeordnet sind (Spalte datei_ids kann mehrere, kommagetrennt, enthalten). */
export function belegDateiIds(belege: { datei_ids: string }[]): string[] {
  return belege.flatMap((b) => b.datei_ids.split(',').map((x) => x.trim()).filter(Boolean))
}
