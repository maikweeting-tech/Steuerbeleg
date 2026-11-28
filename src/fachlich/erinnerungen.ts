// Erinnerungen fürs Handy: fehlende wiederkehrende Belege (Vorlagen) und ablaufende Einspruchsfrist.
// Reine Logik ohne Browser-Zugriff (testbar); angezeigt werden sie vom Service Worker bzw. der App.
import type { Beleg } from './beleg'
import type { BescheidKopf } from './bescheid'
import { vollstaendigkeit, type Vorlage } from './vorlagen'

export interface Erinnerung {
  /** eindeutig je Anlass – dieselbe Erinnerung wird nur einmal gezeigt */
  id: string
  titel: string
  text: string
  /** Ziel in der App (Hash-Route) */
  ziel: string
}

/** Tage vor Fristende, an denen an den Einspruch erinnert wird. */
export const FRIST_TAGE = [14, 7, 3, 1, 0]

const tageBis = (heute: string, datum: string) => Math.round((Date.parse(datum) - Date.parse(heute)) / 86_400_000)

export function erinnerungen(jahr: number, d: { vorlagen: Vorlage[]; bescheidKopf?: BescheidKopf; belege: Beleg[] }, heute: string): Erinnerung[] {
  const l: Erinnerung[] = []

  // Wiederkehrende Belege: je Vorlage eine Erinnerung für den jüngsten fehlenden Zeitraum
  for (const v of vollstaendigkeit(d.vorlagen, jahr, d.belege, heute)) {
    const fehlend = v.perioden.filter((p) => p.status === 'fehlt')
    if (!fehlend.length) continue
    const letzte = fehlend[fehlend.length - 1]
    const mehr = fehlend.length > 1 ? ` (insgesamt ${fehlend.length} Zeiträume offen)` : ''
    l.push({
      id: `vorlage:${v.vorlage.id}:${letzte.schluessel}`,
      titel: `${v.vorlage.bezeichnung}: Beleg für ${letzte.name} fehlt`,
      text: `Bitte erfassen oder in „Check“ bestätigen${mehr}.`,
      ziel: '/check',
    })
  }

  // Einspruchsfrist aus dem Bescheid-Abgleich
  const frist = d.bescheidKopf?.einspruchsfrist ?? ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(frist)) {
    const t = tageBis(heute, frist)
    // Stufe = nächste Erinnerungsschwelle (14, 7, 3, 1, 0 Tage); wer die App erst am 5. Tag öffnet, bekommt die 7-Tage-Erinnerung
    const stufe = t >= 0 ? [...FRIST_TAGE].reverse().find((x) => x >= t) : undefined
    if (stufe !== undefined) {
      l.push({
        id: `frist:${jahr}:${frist}:${stufe}`,
        titel: t === 0 ? `Einspruchsfrist Bescheid ${jahr} endet heute` : `Einspruchsfrist Bescheid ${jahr} endet in ${t} Tag${t === 1 ? '' : 'en'}`,
        text: `Frist bis ${frist.slice(8, 10)}.${frist.slice(5, 7)}.${frist.slice(0, 4)} (Datum bitte prüfen). Abweichungen siehe „Bescheid“.`,
        ziel: '/bescheid',
      })
    }
  }
  return l
}

/** Nur noch nicht gezeigte Erinnerungen. */
export const neue = (l: Erinnerung[], gezeigt: Record<string, string>) => l.filter((e) => !gezeigt[e.id])
