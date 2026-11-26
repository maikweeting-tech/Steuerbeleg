import konfig2026 from '../config/steuerjahr_2026.json'
import type { SteuerjahrKonfig } from './fachlich/konfiguration'

/** Alle verfügbaren Steuerjahre. Neues Jahr: JSON-Datei kopieren und hier ergänzen. */
export const KONFIGURATIONEN: Record<number, SteuerjahrKonfig> = {
  2026: konfig2026 as SteuerjahrKonfig,
}
export const AKTUELLES_JAHR = 2026
