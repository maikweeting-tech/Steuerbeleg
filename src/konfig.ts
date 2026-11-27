import konfig2024 from '../config/steuerjahr_2024.json'
import konfig2025 from '../config/steuerjahr_2025.json'
import konfig2026 from '../config/steuerjahr_2026.json'
import type { SteuerjahrKonfig } from './fachlich/konfiguration'

/** Alle verfügbaren Steuerjahre. Neues Jahr: JSON-Datei kopieren und hier ergänzen. */
export const KONFIGURATIONEN: Record<number, SteuerjahrKonfig> = {
  2024: konfig2024 as SteuerjahrKonfig,
  2025: konfig2025 as SteuerjahrKonfig,
  2026: konfig2026 as SteuerjahrKonfig,
}
export const JAHRE = Object.keys(KONFIGURATIONEN).map(Number).sort((a, b) => b - a)

const SCHLUESSEL = 'steuerbeleg_jahr'

/** Gewähltes Steuerjahr (pro Gerät gespeichert), sonst das neueste. */
export function gewaehltesJahr(): number {
  try {
    const j = Number(globalThis.localStorage?.getItem(SCHLUESSEL))
    if (KONFIGURATIONEN[j]) return j
  } catch { /* kein Speicher */ }
  return JAHRE[0]
}

/** Steuerjahr, mit dem die App gerade arbeitet. Wechsel über waehleJahr() lädt die App neu. */
export const AKTUELLES_JAHR = gewaehltesJahr()

export function waehleJahr(j: number) {
  if (!KONFIGURATIONEN[j]) return
  try { localStorage.setItem(SCHLUESSEL, String(j)) } catch { /* kein Speicher */ }
  location.reload()
}
