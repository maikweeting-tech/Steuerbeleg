// AfA-Hilfsrechnung für ein vermietetes Gebäude (lineare Gebäude-AfA nach § 7 Abs. 4 EStG).
// Nur Vorschlag für die Steuerberatung: Sätze, Grundstücksanteil und Rechtsstand sind prüfbedürftig.
// Reine Rechenlogik ohne Google-Zugriff (testbar). Beträge in Cent.

export interface AfaEingabe {
  objekt_id: string
  kaufpreis_ct: number | null
  grunderwerbsteuer_ct: number | null
  notar_ct: number | null
  grundbuch_ct: number | null
  makler_ct: number | null
  sonstige_nk_ct: number | null
  /** Anteil Grund und Boden an den Anschaffungskosten in % (laut Kaufvertrag/Steuerberatung) */
  grundanteil_prozent: number | null
  /** Ersatzweise: Bodenrichtwert (ct je m²) × Grundstücksfläche */
  bodenrichtwert_ct: number | null
  grundstueck_m2: number | null
  fertigstellungsjahr: number | null
  /** Übergang Nutzen und Lasten (JJJJ-MM-TT) */
  uebergang: string
  /** selbst genutzter Anteil in % (0 = ganz vermietet) */
  eigennutzung_prozent: number | null
  /** Instandsetzung/Modernisierung in den ersten 3 Jahren nach Anschaffung, netto ohne USt */
  renovierung_ct: number | null
  /** AfA laut bisherigem Bescheid (Text, nur zum Vergleich) */
  bisher: string
}

export const leereAfa = (objekt_id: string): AfaEingabe => ({
  objekt_id, kaufpreis_ct: null, grunderwerbsteuer_ct: null, notar_ct: null, grundbuch_ct: null, makler_ct: null, sonstige_nk_ct: null,
  grundanteil_prozent: null, bodenrichtwert_ct: null, grundstueck_m2: null, fertigstellungsjahr: null, uebergang: '',
  eigennutzung_prozent: null, renovierung_ct: null, bisher: '',
})

/** Rechtsstand der Sätze (prüfen). */
export const AFA_STAND = '§ 7 Abs. 4 Satz 1 Nr. 2 EStG i. d. F. JStG 2022 (prüfen)'
/** Grenze anschaffungsnahe Herstellungskosten, § 6 Abs. 1 Nr. 1a EStG (prüfen) */
export const GRENZE_ANSCHAFFUNGSNAH = 0.15

/** AfA-Satz in % nach Fertigstellungsjahr (Wohngebäude im Privatvermögen, linear). */
export function afaSatz(fertigstellungsjahr: number): { prozent: number; grund: string } {
  if (fertigstellungsjahr < 1925) return { prozent: 2.5, grund: 'Fertigstellung vor 1925: 2,5 % (40 Jahre)' }
  if (fertigstellungsjahr <= 2022) return { prozent: 2, grund: 'Fertigstellung 1925–2022: 2 % (50 Jahre)' }
  return { prozent: 3, grund: 'Fertigstellung ab 2023: 3 % (33,33 Jahre)' }
}

export interface AfaJahr { jahr: number; monate: number; betrag_ct: number; restwert_ct: number }

export interface AfaErgebnis {
  fehlt: string[]
  kaufnebenkosten_ct: number
  anschaffungskosten_ct: number
  boden_ct: number
  bodenWeg: 'prozent' | 'bodenrichtwert' | ''
  anschaffungsnah_ct: number
  gebaeude_ct: number
  vermietet_prozent: number
  bemessung_ct: number
  satz: { prozent: number; grund: string } | null
  jahresbetrag_ct: number
  tabelle: AfaJahr[]
  annahmen: string[]
  hinweise: string[]
}

const n = (x: number | null) => x ?? 0

/** Rechnet die Hilfsrechnung. Fehlende Pflichtangaben stehen in „fehlt“; die Tabelle ist dann leer. */
export function rechneAfa(e: AfaEingabe): AfaErgebnis {
  const fehlt: string[] = []
  if (!e.kaufpreis_ct) fehlt.push('Kaufpreis')
  if (!e.fertigstellungsjahr) fehlt.push('Fertigstellungsjahr')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.uebergang)) fehlt.push('Übergang Nutzen und Lasten')
  const mitProzent = e.grundanteil_prozent !== null
  const mitBrw = !mitProzent && !!e.bodenrichtwert_ct && !!e.grundstueck_m2
  if (!mitProzent && !mitBrw) fehlt.push('Grundstücksanteil (% oder Bodenrichtwert und Fläche)')

  const kaufnebenkosten_ct = n(e.grunderwerbsteuer_ct) + n(e.notar_ct) + n(e.grundbuch_ct) + n(e.makler_ct) + n(e.sonstige_nk_ct)
  const anschaffungskosten_ct = n(e.kaufpreis_ct) + kaufnebenkosten_ct
  const boden_ct = mitProzent ? Math.round(anschaffungskosten_ct * n(e.grundanteil_prozent) / 100)
    : mitBrw ? Math.min(anschaffungskosten_ct, Math.round(n(e.bodenrichtwert_ct) * n(e.grundstueck_m2))) : 0
  const gebaeudeOhne = anschaffungskosten_ct - boden_ct
  const reno = n(e.renovierung_ct)
  const anschaffungsnah_ct = reno > gebaeudeOhne * GRENZE_ANSCHAFFUNGSNAH ? reno : 0
  const gebaeude_ct = gebaeudeOhne + anschaffungsnah_ct
  const vermietet_prozent = 100 - Math.min(100, Math.max(0, n(e.eigennutzung_prozent)))
  const bemessung_ct = Math.round(gebaeude_ct * vermietet_prozent / 100)
  const satz = e.fertigstellungsjahr ? afaSatz(e.fertigstellungsjahr) : null
  const jahresbetrag_ct = satz ? Math.round(bemessung_ct * satz.prozent / 100) : 0

  const annahmen = [
    'Wohngebäude im Privatvermögen, lineare AfA nach § 7 Abs. 4 EStG (prüfen).',
    `AfA-Satz nach Fertigstellungsjahr, Rechtsstand ${AFA_STAND}.`,
    'Anschaffungskosten = Kaufpreis + Kaufnebenkosten (Grunderwerbsteuer, Notar, Grundbuch, Makler, Sonstiges); Nebenkosten anteilig auf Boden und Gebäude.',
    mitProzent ? `Grund und Boden: ${String(e.grundanteil_prozent).replace('.', ',')} % der Anschaffungskosten (Angabe laut Kaufvertrag/Steuerberatung, prüfen).`
      : mitBrw ? 'Grund und Boden: Bodenrichtwert × Grundstücksfläche, vom Gesamtpreis abgezogen (vereinfachte Restwertmethode – die Finanzverwaltung nutzt i. d. R. die BMF-Arbeitshilfe zur Kaufpreisaufteilung; Steuerberatung prüfen).' : 'Grund und Boden: fehlt.',
    'Erstes Jahr zeitanteilig: volle Monate ab dem Monat des Übergangs von Nutzen und Lasten (Monat des Übergangs zählt mit).',
    'Jahresbeträge auf Cent gerundet; im letzten Jahr nur der Restwert.',
    vermietet_prozent < 100 ? `Nur der vermietete Anteil (${vermietet_prozent} %) wird abgeschrieben.` : 'Ganz vermietet (100 %).',
  ]
  const hinweise: string[] = []
  if (reno && anschaffungsnah_ct) hinweise.push(`Renovierung in den ersten 3 Jahren (${(reno / 100).toFixed(2).replace('.', ',')} €) liegt über 15 % der Gebäudekosten: anschaffungsnahe Herstellungskosten nach § 6 Abs. 1 Nr. 1a EStG – hier der AfA-Basis zugerechnet (prüfen).`)
  else if (reno) hinweise.push('Renovierung in den ersten 3 Jahren liegt unter 15 % der Gebäudekosten: in der Regel sofort abziehbarer Erhaltungsaufwand, nicht in der AfA-Basis (prüfen).')
  if (e.fertigstellungsjahr && e.fertigstellungsjahr >= 2023) hinweise.push('Neubau: ggf. degressive AfA (§ 7 Abs. 5a EStG) oder Sonder-AfA (§ 7b EStG) möglich – mit Steuerberatung klären.')
  if (e.bisher.trim()) hinweise.push(`Laut bisherigem Bescheid: ${e.bisher.trim()} – mit diesem Vorschlag vergleichen.`)

  const tabelle: AfaJahr[] = []
  if (!fehlt.length && satz && jahresbetrag_ct > 0) {
    let rest = bemessung_ct
    let jahr = Number(e.uebergang.slice(0, 4))
    let monate = 13 - Number(e.uebergang.slice(5, 7))
    while (rest > 0 && tabelle.length < 200) {
      const betrag = Math.min(rest, Math.round(jahresbetrag_ct * monate / 12))
      rest -= betrag
      tabelle.push({ jahr, monate, betrag_ct: betrag, restwert_ct: rest })
      jahr++
      monate = 12
    }
  }
  return { fehlt, kaufnebenkosten_ct, anschaffungskosten_ct, boden_ct, bodenWeg: mitProzent ? 'prozent' : mitBrw ? 'bodenrichtwert' : '', anschaffungsnah_ct, gebaeude_ct, vermietet_prozent, bemessung_ct, satz, jahresbetrag_ct, tabelle, annahmen, hinweise }
}

/** AfA-Betrag eines Jahres aus der Tabelle (0, wenn keiner). */
export const afaImJahr = (r: AfaErgebnis, jahr: number) => r.tabelle.find((t) => t.jahr === jahr)?.betrag_ct ?? 0
