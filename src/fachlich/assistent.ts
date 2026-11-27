// Steuererklärungs-Assistent: Fragen in einfacher Sprache je Bereich, Antworten im Blatt „Erklaerung“.
// Ziel: Vorbereitung für die Steuerberatung (Angaben + Unterlagenliste). Keine Steuerberechnung,
// keine Übermittlung. ELSTER-Zeilen sind nur Hinweise und stehen auf „prüfen“.
// Wichtig: Hier stehen nur allgemeine Fragen, keine persönlichen Daten (Repo ist öffentlich).

export type FrageTyp = 'ja_nein' | 'auswahl' | 'text' | 'datum' | 'betrag'
export const WEISS_NICHT = 'weiss_nicht'

export interface Frage {
  id: string
  frage: string
  /** Erklärung in einfachen Worten: warum wird das gefragt, wo steht es */
  erklaerung: string
  typ: FrageTyp
  optionen?: { wert: string; name: string }[]
  /** Formular und Hinweis zur Zeile – immer „prüfen“ */
  formular: string
  /** Nur anzeigen, wenn eine andere Frage diesen Wert hat */
  wenn?: { frage: string; wert: string }
  /** Unterlage, die bei Antwort „ja“ (bzw. bei jeder Antwort, wenn immer=true) an die Steuerberatung geht */
  unterlage?: { name: string; immer?: boolean }
  /** Hinweis, der bei bestimmter Antwort erscheint */
  hinweis?: { wert: string; text: string }
  /** Vorgeschlagene Antwort (z. B. aus den App-Daten); muss bestätigt werden */
  vorschlag?: string
  /** Zusätzliche Sichtbarkeitsbedingung aus mehreren Antworten (z. B. Alter eines Kindes) */
  zeigen?: (a: Antworten) => boolean
  /** Berechneter Hinweis aus den Antworten (z. B. Kind wird 25); leer = kein Hinweis */
  pruefe?: (a: Antworten) => string
  /** Info aus den App-Daten (z. B. Summe der erfassten Belege); nur Anzeige, kein Klärungspunkt */
  info?: string
}

export interface Bereich {
  id: string
  name: string
  beschreibung: string
  fragen: Frage[]
  /** noch nicht gebaut (folgt in S2–S4) */
  folgt?: boolean
}

export interface Antwort { wert: string; notiz: string }
export type Antworten = Record<string, Antwort>

const JN = (id: string, frage: string, erklaerung: string, rest: Partial<Frage> = {}): Frage =>
  ({ id, frage, erklaerung, typ: 'ja_nein', formular: 'Hauptvordruck (ESt 1 A)', ...rest })

const ANZ = ['0', '1', '2', '3', '4', '5', '6'].map((x) => ({ wert: x, name: x }))
const NA = 'Anlage N'

/** Geburtsjahr aus „JJJJ-MM-TT“, sonst null. */
export function geburtsjahr(wert: string | undefined): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(wert ?? '')
  return m ? Number(m[1]) : null
}

/** Fragen für ein Kind. Altersgrenzen 14/18/25 sind Annahmen (prüfen). */
function kindFragen(jahr: number, i: number, a: Antworten): Frage[] {
  const k = `kind${i}`
  const vorname = a[`${k}_name`]?.wert
  const wer = vorname ? `Kind ${i} (${vorname})` : `Kind ${i}`
  const gj = () => geburtsjahr(a[`${k}_geburt`]?.wert)
  const mind18 = () => { const g = gj(); return g !== null && jahr - g >= 18 }
  const unter14 = () => { const g = gj(); return g !== null && jahr - g <= 14 }
  const F = 'Anlage Kind'
  return [
    { id: `${k}_name`, typ: 'text', formular: F, frage: `${wer}: Vorname`,
      erklaerung: 'Nur der Vorname, damit ihr die Kinder in der App unterscheiden könnt. Steuer-ID des Kindes bitte nicht hier eintragen, sondern der Steuerberatung direkt geben.' },
    { id: `${k}_geburt`, typ: 'datum', formular: F, frage: `${wer}: Geburtsdatum`,
      erklaerung: 'Vom Alter hängt ab, welche Fragen noch kommen: unter 14 Kinderbetreuung, ab 18 Schule/Ausbildung/Studium.',
      pruefe: () => { const g = gj(); return g !== null && jahr - g >= 25 ? `${wer} wird ${jahr} 25 oder älter: Kindergeld/Freibeträge in der Regel nur bis zum Monat des 25. Geburtstags (prüfen) – mit der Steuerberatung klären.` : '' } },
    JN(`${k}_haushalt`, `${wer}: Hat das Kind ${jahr} bei euch gewohnt?`, 'Wohnt das Kind (z. B. zum Studium) auswärts, ist das wichtig für Freibeträge. Auszugsdatum in die Notiz.', { formular: F }),
    JN(`${k}_kindergeld`, `${wer}: Gab es ${jahr} das ganze Jahr Kindergeld?`, 'Die Familienkasse zahlt Kindergeld. Wurde es eingestellt oder gab es Lücken, bitte Zeitraum in die Notiz.',
      { formular: F, hinweis: { wert: '!ja', text: `${wer}: Kindergeld nicht ganzjährig – Zeitraum und Grund mit der Steuerberatung klären.` }, unterlage: { name: `${wer}: Bescheid/Schreiben der Familienkasse` } }),
    JN(`${k}_ausbildung`, `${wer}: War das Kind ${jahr} in Schule, Ausbildung oder Studium?`, 'Kinder ab 18 zählen nur, wenn sie z. B. in Schule, Ausbildung oder Studium sind (bis 25). Bitte Art und Zeitraum in die Notiz (prüfen).',
      { formular: F, zeigen: mind18, unterlage: { name: `${wer}: Schul-/Ausbildungs-/Studienbescheinigung ${jahr}` } }),
    JN(`${k}_erstausbildung`, `${wer}: Ist das die erste Ausbildung bzw. das Erststudium?`, 'Bei einer Zweitausbildung zählt zusätzlich, wie viele Stunden das Kind nebenbei arbeitet (Grenze 20 Std./Woche, prüfen).',
      { formular: F, wenn: { frage: `${k}_ausbildung`, wert: 'ja' }, hinweis: { wert: 'nein', text: `${wer}: Zweitausbildung – Arbeitszeit des Kindes mit der Steuerberatung klären.` } }),
    JN(`${k}_auswaerts`, `${wer}: Hat das Kind während der Ausbildung auswärts gewohnt?`, 'Dann kann es einen Freibetrag für die auswärtige Unterbringung geben (prüfen).',
      { formular: F, wenn: { frage: `${k}_ausbildung`, wert: 'ja' }, unterlage: { name: `${wer}: Nachweis auswärtige Wohnung (z. B. Mietvertrag)` } }),
    JN(`${k}_versicherung`, `${wer}: Habt ihr ${jahr} eine eigene Kranken-/Pflegeversicherung des Kindes bezahlt?`, 'Zum Beispiel, wenn das Kind nicht mehr familienversichert ist. Beiträge können Sonderausgaben sein (prüfen).',
      { formular: F, zeigen: mind18, unterlage: { name: `${wer}: Beitragsbescheinigung Kranken-/Pflegeversicherung` } }),
    JN(`${k}_betreuung`, `${wer}: Habt ihr ${jahr} für Kita, Hort, Tagesmutter oder Ferienbetreuung bezahlt?`, 'Kosten für Kinderbetreuung bis zum 14. Geburtstag zählen teilweise (prüfen). Nicht dazu gehören Essensgeld und Nachhilfe. Bezahlt per Überweisung, nicht bar.',
      { formular: F, zeigen: unter14, unterlage: { name: `${wer}: Rechnungen und Zahlungsnachweise Kinderbetreuung` } }),
    JN(`${k}_schulgeld`, `${wer}: Habt ihr ${jahr} Schulgeld für eine Privatschule bezahlt?`, 'Schulgeld kann teilweise als Sonderausgabe zählen (prüfen). Nicht dazu gehören Kosten für Unterkunft und Verpflegung.',
      { formular: F, unterlage: { name: `${wer}: Bescheinigung Schulgeld` } }),
  ]
}

/** Daten aus der App, die Fragen erzeugen oder vorbelegen (z. B. Mietobjekte). */
export interface Kontext {
  objekte: { id: string; bezeichnung: string; anschaffungsdatum: string }[]
  /** Einnahmen (Miete, Nebenkosten) je Objekt im Steuerjahr in Cent */
  einnahmenCt: Record<string, number>
  /** Belege je „Modul|Kategorie“ im Steuerjahr */
  belegSummen?: Record<string, { anzahl: number; summe_ct: number }>
  /** Anzahl bar bezahlter § 35a-Belege */
  bar35a?: number
}
const LEERER_KONTEXT: Kontext = { objekte: [], einnahmenCt: {} }

/** Summen der Belege je „Modul|Kategorie“ und Barzahlungen § 35a. */
export function belegKontext(belege: { modul: string; kategorie: string; betrag_ct: number | null; zahlungsart?: string }[]): Pick<Kontext, 'belegSummen' | 'bar35a'> {
  const r: Record<string, { anzahl: number; summe_ct: number }> = {}
  for (const b of belege) {
    const k = `${b.modul}|${b.kategorie}`
    r[k] = { anzahl: (r[k]?.anzahl ?? 0) + 1, summe_ct: (r[k]?.summe_ct ?? 0) + (b.betrag_ct ?? 0) }
  }
  return { belegSummen: r, bar35a: belege.filter((b) => b.modul === '35A' && b.zahlungsart === 'bar').length }
}

const zahl = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Summe der Einnahmen je Objekt im Jahr (Monat „JJJJ-MM“). */
export function einnahmenJeObjekt(jahr: number, einnahmen: { objekt_id: string; monat: string; betrag_ct: number }[]): Record<string, number> {
  const r: Record<string, number> = {}
  for (const e of einnahmen) if (e.monat.startsWith(`${jahr}-`)) r[e.objekt_id] = (r[e.objekt_id] ?? 0) + e.betrag_ct
  return r
}

/** Fragen für ein Mietobjekt. Ausland: nur Klärungshinweis und Unterlagen. 3-Jahres-Grenze ist eine Annahme (prüfen). */
function objektFragen(jahr: number, o: Kontext['objekte'][number], ct: number | undefined, a: Antworten): Frage[] {
  const k = `v_${o.id}`
  const n = o.bezeichnung || 'Objekt'
  const FV = 'Anlage V'
  const inland = () => a[`${k}_lage`]?.wert === 'inland'
  const kaufJahr = geburtsjahr(o.anschaffungsdatum)
  const w = (f: Partial<Frage> & Pick<Frage, 'id' | 'frage' | 'erklaerung'>): Frage => ({ typ: 'ja_nein', formular: FV, wenn: { frage: 'v_vermietet', wert: 'ja' }, zeigen: inland, ...f })
  return [
    { id: `${k}_lage`, typ: 'auswahl', formular: `${FV} bzw. Anlage AUS`, wenn: { frage: 'v_vermietet', wert: 'ja' },
      frage: `${n}: Liegt das Objekt in Deutschland oder im Ausland?`, erklaerung: 'Vermietung im Ausland wird anders erklärt (z. B. Anlage AUS, Steuer im Ausland). Das klärt die Steuerberatung.',
      optionen: [{ wert: 'inland', name: 'Deutschland' }, { wert: 'ausland', name: 'Ausland' }],
      hinweis: { wert: 'ausland', text: `${n}: Vermietung im Ausland – mit der Steuerberatung klären (Anlage AUS, prüfen).` } },
    { ...w({ id: `${k}_ausland_unterlagen`, frage: `${n}: Habt ihr die ausländischen Unterlagen ${jahr} (Steuerbescheid, Abrechnungen der Vermittlung)?`,
      erklaerung: 'Die Steuerberatung braucht Einnahmen, Kosten und die im Ausland gezahlte Steuer.', unterlage: { name: `${n}: ausländischer Steuerbescheid und Abrechnungen ${jahr}` } }),
      zeigen: () => a[`${k}_lage`]?.wert === 'ausland' },
    w({ id: `${k}_art`, typ: 'auswahl', frage: `${n}: Wie wird vermietet?`, erklaerung: 'Bei Ferienwohnungen und teilweiser Selbstnutzung werden Kosten anders aufgeteilt.',
      optionen: [{ wert: 'dauer', name: 'Dauervermietung' }, { wert: 'ferien', name: 'Ferienwohnung' }, { wert: 'teil', name: 'teilweise selbst genutzt' }, { wert: 'sonst', name: 'Garage/Sonstiges' }] }),
    w({ id: `${k}_selbst`, frage: `${n}: Habt ihr die Wohnung ${jahr} auch selbst genutzt?`, erklaerung: 'Bei Selbstnutzung zählen die Kosten nur anteilig. Tage der Selbstnutzung und Leerstand in die Notiz.',
      zeigen: () => inland() && ['ferien', 'teil'].includes(a[`${k}_art`]?.wert ?? ''), hinweis: { wert: 'ja', text: `${n}: Selbstnutzung – Aufteilung der Kosten mit der Steuerberatung klären.` } }),
    w({ id: `${k}_ganzjaehrig`, frage: `${n}: War das Objekt ${jahr} das ganze Jahr vermietet?`, erklaerung: 'Bei Leerstand oder Mieterwechsel bitte Zeitraum und Bemühungen um neue Mieter in die Notiz.',
      hinweis: { wert: '!ja', text: `${n}: Leerstand – Zeitraum und Vermietungsabsicht mit der Steuerberatung klären.` } }),
    w({ id: `${k}_einnahmen`, typ: 'betrag', frage: `${n}: Einnahmen ${jahr} (Miete + Nebenkostenvorauszahlungen) in €`,
      erklaerung: 'Alles, was die Mieter gezahlt haben, auch Nachzahlungen aus der Nebenkostenabrechnung. Der Vorschlag ist die Summe aus „Vermietung → Einnahmen“ in der App.',
      vorschlag: ct ? zahl.format(ct / 100) : undefined }),
    w({ id: `${k}_verbilligt`, frage: `${n}: Ist an Angehörige oder deutlich unter der ortsüblichen Miete vermietet?`, erklaerung: 'Liegt die Miete unter einer bestimmten Grenze der ortsüblichen Miete, zählen die Kosten nur anteilig (Grenzwerte prüfen).',
      hinweis: { wert: 'ja', text: `${n}: verbilligte Vermietung – Vergleich mit ortsüblicher Miete mit der Steuerberatung klären.` } }),
    w({ id: `${k}_nebenkosten`, frage: `${n}: Habt ihr eine Nebenkostenabrechnung erstellt (für ${jahr - 1} oder ${jahr})?`, erklaerung: 'Nachzahlungen der Mieter sind Einnahmen, Erstattungen an die Mieter mindern sie.',
      unterlage: { name: `${n}: Nebenkostenabrechnung(en)` } }),
    w({ id: `${k}_darlehen`, frage: `${n}: Gibt es ein Darlehen für das Objekt?`, erklaerung: 'Schuldzinsen sind Werbungskosten, die Tilgung nicht. Die Bank schickt eine Zinsbescheinigung.',
      unterlage: { name: `${n}: Zinsbescheinigung ${jahr} der Bank` } }),
    w({ id: `${k}_reparatur`, frage: `${n}: Gab es ${jahr} Reparaturen, Renovierungen oder Modernisierungen?`, erklaerung: 'Rechnungen am besten in der App erfassen. Größere Beträge kann die Steuerberatung auf mehrere Jahre verteilen.',
      unterlage: { name: `${n}: Rechnungen Reparaturen/Renovierung` },
      pruefe: () => a[`${k}_reparatur`]?.wert === 'ja' && kaufJahr !== null && jahr - kaufJahr <= 3
        ? `${n}: Renovierung in den ersten 3 Jahren nach dem Kauf – Grenze für anschaffungsnahe Kosten mit der Steuerberatung klären (prüfen).` : '' }),
    w({ id: `${k}_kosten`, frage: `${n}: Sind die laufenden Kosten ${jahr} in der App erfasst (Grundsteuer, Versicherung, Hausgeld, Verwaltung)?`, erklaerung: 'Die Belegmappe für die Steuerberatung enthält nur, was in der App erfasst ist.',
      hinweis: { wert: '!ja', text: `${n}: Belege für laufende Kosten fehlen noch – nacherfassen.` } }),
    w({ id: `${k}_kauf`, frage: `${n}: Wurde das Objekt ${jahr} gekauft, verkauft oder umgebaut (Anbau, Ausbau)?`, erklaerung: 'Dann ändert sich die Abschreibung (AfA). Die App rechnet keine AfA, die Steuerberatung braucht die Verträge.',
      unterlage: { name: `${n}: Kauf-/Verkaufsvertrag bzw. Bauunterlagen` }, hinweis: { wert: 'ja', text: `${n}: Kauf/Verkauf/Umbau – AfA und ggf. Spekulationsfrist mit der Steuerberatung klären.` } }),
  ]
}

/** Kontext aus App-Daten: aktive Objekte, Einnahmen je Objekt, Belegsummen. */
export function kontextAus(
  jahr: number,
  objekte: { id: string; bezeichnung: string; anschaffungsdatum: string; aktiv: boolean }[],
  einnahmen: { objekt_id: string; monat: string; betrag_ct: number }[],
  belege: Parameters<typeof belegKontext>[0],
): Kontext {
  return { objekte: objekte.filter((o) => o.aktiv), einnahmenCt: einnahmenJeObjekt(jahr, einnahmen), ...belegKontext(belege) }
}

/** Info-Zeile „In der App erfasst: n Belege, x €“ für eine oder mehrere Kategorien. */
function belegInfo(kx: Kontext, ...schluessel: string[]): string | undefined {
  const l = schluessel.map((s) => kx.belegSummen?.[s]).filter((x): x is { anzahl: number; summe_ct: number } => !!x)
  if (!l.length) return undefined
  const n = l.reduce((s, x) => s + x.anzahl, 0), ct = l.reduce((s, x) => s + x.summe_ct, 0)
  return `In der App erfasst: ${n} Beleg(e), zusammen ${zahl.format(ct / 100)} € (prüfen).`
}

/** Fragenkatalog. jahr wird in Texte eingesetzt; Antworten und App-Daten steuern Fragen je Kind und je Objekt. */
export function bereiche(jahr: number, a: Antworten = {}, kx: Kontext = LEERER_KONTEXT): Bereich[] {
  const kinder = Math.min(6, Math.max(0, Number(a.kinder_anzahl?.wert) || 0))
  return [
    {
      id: 'allgemein', name: 'Allgemeines und Fristen',
      beschreibung: 'Was die Steuerberatung vorab wissen muss.',
      fragen: [
        {
          id: 'allg_frist', typ: 'auswahl', formular: '–',
          frage: `Hat eure Steuerberatung für ${jahr} eine Fristverlängerung?`,
          erklaerung: 'Gibt die Steuerberatung die Erklärung ab, gilt eine längere Frist als ohne Beratung. Ist sie vorbei, kann das Finanzamt einen Verspätungszuschlag festsetzen. Fristen bitte immer mit der Steuerberatung klären (prüfen).',
          optionen: [{ wert: 'ja', name: 'ja, bestätigt' }, { wert: 'vermutet', name: 'vermutlich' }, { wert: 'nein', name: 'nein' }, { wert: WEISS_NICHT, name: 'weiß nicht' }],
          hinweis: { wert: '!ja', text: 'Mit der Steuerberatung klären: Frist bzw. Verlängerung für dieses Jahr.' },
        },
        JN('allg_bescheid_vorjahr', `Liegt der Steuerbescheid ${jahr - 1} vor?`,
          'Die Steuerberatung braucht ihn, um Vorträge (z. B. Verluste) und Abweichungen zu prüfen.',
          { formular: '–', unterlage: { name: `Steuerbescheid ${jahr - 1}` } }),
        JN('allg_post_fa', `Gab es ${jahr} Post vom Finanzamt (Vorauszahlungen, Rückfragen, Prüfungen)?`,
          'Zum Beispiel ein Bescheid über Vorauszahlungen oder ein Schreiben mit Rückfragen.',
          { formular: '–', unterlage: { name: 'Schreiben des Finanzamts' } }),
      ],
    },
    {
      id: 'haupt', name: 'Hauptvordruck (Mantelbogen)',
      beschreibung: 'Persönliche Angaben. Die Steuerberatung kennt sie meist schon – hier geht es um Änderungen.',
      fragen: [
        {
          id: 'haupt_veranlagung', typ: 'auswahl', formular: 'Hauptvordruck (ESt 1 A), Veranlagungsart',
          frage: 'Wie werdet ihr veranlagt?',
          erklaerung: 'Verheiratete können gemeinsam (Zusammenveranlagung) oder getrennt (Einzelveranlagung) abgeben. Meist ist die Zusammenveranlagung günstiger; das entscheidet die Steuerberatung.',
          optionen: [{ wert: 'zusammen', name: 'Zusammenveranlagung' }, { wert: 'einzeln', name: 'Einzelveranlagung' }, { wert: WEISS_NICHT, name: 'weiß nicht' }],
          vorschlag: 'zusammen',
        },
        JN('haupt_adresse', `Hat sich ${jahr} eure Adresse geändert?`, 'Bei Umzug: neues Datum und neue Anschrift in die Notiz.', { hinweis: { wert: 'ja', text: 'Umzugsdatum und neue Anschrift in die Notiz. Umzugskosten können Werbungskosten sein (prüfen).' } }),
        JN('haupt_familienstand', `Hat sich ${jahr} euer Familienstand geändert (Heirat, Trennung, Tod)?`, 'Das bestimmt, ob ihr zusammen veranlagt werden dürft.', { unterlage: { name: 'Nachweis Familienstand (z. B. Urkunde)' } }),
        JN('haupt_religion', `Ist ${jahr} jemand in die Kirche ein- oder ausgetreten?`, 'Davon hängt die Kirchensteuer ab. Datum in die Notiz.', { unterlage: { name: 'Bescheinigung Kirchenaustritt/-eintritt' } }),
        JN('haupt_bank', 'Hat sich das Konto für die Erstattung geändert?', 'Auf dieses Konto überweist das Finanzamt eine Erstattung. Neue IBAN gebt ihr der Steuerberatung direkt (nicht in der App speichern).'),
        JN('haupt_behinderung', `Hatte ${jahr} jemand von euch einen Grad der Behinderung (Bescheid vom Versorgungsamt)?`,
          'Dann gibt es einen Pauschbetrag. Grad und Merkzeichen stehen im Bescheid bzw. Ausweis.',
          { formular: 'Anlage Außergewöhnliche Belastungen', unterlage: { name: 'Bescheid über den Grad der Behinderung (Versorgungsamt)' } }),
        JN('haupt_pflege', `Habt ihr ${jahr} jemanden unentgeltlich gepflegt (Pflegegrad 2 oder höher)?`,
          'Für die häusliche Pflege kann es einen Pflege-Pauschbetrag geben (prüfen).',
          { formular: 'Anlage Außergewöhnliche Belastungen', unterlage: { name: 'Nachweis Pflegegrad der gepflegten Person' } }),
        JN('haupt_lohnersatz', `Gab es ${jahr} Krankengeld, Arbeitslosengeld, Elterngeld oder Kurzarbeitergeld?`,
          'Diese Leistungen sind steuerfrei, erhöhen aber den Steuersatz (Progressionsvorbehalt). Die Bescheinigung kommt von der Kasse bzw. Agentur.',
          { formular: 'Anlage N bzw. Hauptvordruck', unterlage: { name: 'Bescheinigung über Lohnersatzleistungen' } }),
      ],
    },
    {
      id: 'kinder', name: 'Kinder', beschreibung: 'Anlage Kind: je Kind ein paar Fragen, abhängig vom Alter.',
      fragen: [
        { id: 'kinder_anzahl', typ: 'auswahl', formular: 'Anlage Kind (je Kind eine)', optionen: ANZ,
          frage: `Für wie viele Kinder gab es ${jahr} Kindergeld (oder hätte es geben können)?`,
          erklaerung: 'Gezählt werden eigene Kinder, auch volljährige in Ausbildung. Danach fragt die App je Kind weiter.' },
        ...Array.from({ length: kinder }, (_, n) => kindFragen(jahr, n + 1, a)).flat(),
      ],
    },
    {
      id: 'lohn', name: 'Lohn und Gehalt (Anlage N)', beschreibung: 'Arbeitslohn und Werbungskosten, je Person eine Anlage N.',
      fragen: [
        JN('n_lohn', `Hatte jemand von euch ${jahr} Lohn oder Gehalt (auch Minijob)?`, 'Den Lohn meldet der Arbeitgeber dem Finanzamt. Ihr bekommt dazu die Lohnsteuerbescheinigung (meist mit der Dezember-Abrechnung).',
          { formular: NA, unterlage: { name: `Lohnsteuerbescheinigung(en) ${jahr}` } }),
        { id: 'n_wer', typ: 'auswahl', formular: NA, wenn: { frage: 'n_lohn', wert: 'ja' },
          frage: 'Wer hatte Lohn oder Gehalt?', erklaerung: 'Für jede Person mit Lohn gibt es eine eigene Anlage N.',
          optionen: [{ wert: 'person_a', name: 'Person A' }, { wert: 'person_b', name: 'Person B' }, { wert: 'beide', name: 'beide' }] },
        { id: 'n_km', typ: 'betrag', formular: `${NA}, Entfernungspauschale`, wenn: { frage: 'n_lohn', wert: 'ja' },
          frage: 'Einfache Entfernung Wohnung – Arbeit in km (kürzeste Straßenverbindung)', erklaerung: 'Nur die einfache Strecke, ganze Kilometer. Bei mehreren Personen bitte je Person in die Notiz. Pauschale je km ist ein Normwert (prüfen).' },
        { id: 'n_tage', typ: 'betrag', formular: `${NA}, Entfernungspauschale`, wenn: { frage: 'n_lohn', wert: 'ja' },
          frage: `An wie vielen Tagen seid ihr ${jahr} zur Arbeit gefahren?`, erklaerung: 'Urlaub, Krankheit und Homeoffice-Tage abziehen. Grobe Zahl reicht, die Steuerberatung prüft.' },
        { id: 'n_homeoffice', typ: 'betrag', formular: `${NA}, Homeoffice-Pauschale`, wenn: { frage: 'n_lohn', wert: 'ja' },
          frage: `An wie vielen Tagen habt ihr ${jahr} überwiegend zu Hause gearbeitet?`, erklaerung: 'Für Homeoffice-Tage gibt es eine Tagespauschale mit Höchstbetrag (Normwert, prüfen). 0 eintragen, wenn keine.' },
        JN('n_arbeitsmittel', 'Habt ihr Arbeitsmittel selbst bezahlt (Werkzeug, Arbeitskleidung, Fachbücher, Computer)?', 'Belege dazu habt ihr ggf. schon in der App erfasst (Kategorie Anlage N).',
          { formular: `${NA}, Werbungskosten`, wenn: { frage: 'n_lohn', wert: 'ja' }, unterlage: { name: 'Belege Arbeitsmittel (Belegmappe)' } }),
        JN('n_fortbildung', 'Gab es Kosten für Fortbildung, Lehrgänge oder Prüfungen?', 'Auch Fahrtkosten und Material für die Fortbildung, abzüglich Zuschüsse.',
          { formular: `${NA}, Werbungskosten`, wenn: { frage: 'n_lohn', wert: 'ja' }, unterlage: { name: 'Belege Fortbildung' } }),
        JN('n_gewerkschaft', 'Habt ihr Gewerkschafts- oder Berufsverbandsbeiträge bezahlt?', 'Die Jahresbescheinigung kommt meist von der Gewerkschaft.',
          { formular: `${NA}, Werbungskosten`, wenn: { frage: 'n_lohn', wert: 'ja' }, unterlage: { name: 'Beitragsbescheinigung Gewerkschaft/Verband' } }),
        JN('n_auswaerts', 'Wart ihr beruflich auswärts tätig (Baustellen, Dienstreisen, Montage)?', 'Dann zählen Fahrtkosten und Verpflegungspauschalen, soweit der Arbeitgeber nichts erstattet hat. Liste mit Datum, Ort, Abwesenheit (prüfen).',
          { formular: `${NA}, Reisekosten`, wenn: { frage: 'n_lohn', wert: 'ja' }, unterlage: { name: 'Aufstellung Auswärtstätigkeit + Erstattungen Arbeitgeber' },
            hinweis: { wert: 'ja', text: 'Auswärtstätigkeit: erste Tätigkeitsstätte und Erstattungen des Arbeitgebers mit der Steuerberatung klären.' } }),
        JN('n_doppelt', 'Hatte jemand eine zweite Wohnung am Arbeitsort (doppelte Haushaltsführung)?', 'Kosten der Zweitwohnung und Heimfahrten können zählen (prüfen).',
          { formular: `${NA}, doppelte Haushaltsführung`, wenn: { frage: 'n_lohn', wert: 'ja' }, unterlage: { name: 'Mietvertrag Zweitwohnung, Nachweise Heimfahrten' } }),
      ],
    },
    {
      id: 'rente', name: 'Renten (Anlage R)', beschreibung: 'Gesetzliche Rente, Erwerbsminderungsrente, Betriebs- und Privatrenten.',
      fragen: [
        JN('r_rente', `Hat jemand von euch ${jahr} eine Rente bekommen?`, 'Zum Beispiel Altersrente, Erwerbsminderungsrente, Witwenrente, Betriebsrente oder private Rente. Die Rentenkasse meldet die Rente dem Finanzamt (Rentenbezugsmitteilung).',
          { formular: 'Anlage R', unterlage: { name: `Rentenanpassungsmitteilung bzw. Leistungsmitteilung ${jahr}` } }),
        { id: 'r_art', typ: 'auswahl', formular: 'Anlage R bzw. R-AV/bAV', wenn: { frage: 'r_rente', wert: 'ja' },
          frage: 'Welche Rente?', erklaerung: 'Bei mehreren Renten die wichtigste wählen und die weiteren in die Notiz.',
          optionen: [{ wert: 'alter', name: 'Altersrente' }, { wert: 'em', name: 'Erwerbsminderung' }, { wert: 'hinterbliebene', name: 'Witwen-/Waisenrente' }, { wert: 'betrieb', name: 'Betriebsrente' }, { wert: 'privat', name: 'private Rente' }, { wert: WEISS_NICHT, name: 'weiß nicht' }] },
        { id: 'r_beginn', typ: 'datum', formular: 'Anlage R, Rentenbeginn', wenn: { frage: 'r_rente', wert: 'ja' },
          frage: 'Seit wann wird die Rente gezahlt (Rentenbeginn laut Bescheid)?', erklaerung: 'Vom Jahr des Rentenbeginns hängt ab, welcher Anteil steuerpflichtig ist (prüfen).' },
        JN('r_befristet', 'Ist die Erwerbsminderungsrente befristet?', 'Steht im Rentenbescheid. Befristete Renten werden anders besteuert als unbefristete (prüfen).',
          { formular: 'Anlage R', wenn: { frage: 'r_art', wert: 'em' }, unterlage: { name: 'Rentenbescheid (mit Befristung)' },
            hinweis: { wert: '!nein', text: 'Erwerbsminderungsrente befristet oder unklar: Besteuerung mit der Steuerberatung klären.' } }),
        JN('r_nachzahlung', `Gab es ${jahr} eine Nachzahlung für frühere Jahre?`, 'Zum Beispiel nach einem späten Rentenbescheid. Nachzahlungen werden besonders behandelt (prüfen).',
          { formular: 'Anlage R', wenn: { frage: 'r_rente', wert: 'ja' }, unterlage: { name: 'Bescheid über die Nachzahlung' },
            hinweis: { wert: 'ja', text: 'Rentennachzahlung für frühere Jahre mit der Steuerberatung klären.' } }),
        JN('r_kosten', 'Gab es Kosten rund um die Rente (Rentenberater, Anwalt, Sozialverband)?', 'Solche Kosten können Werbungskosten sein (prüfen).',
          { formular: 'Anlage R, Werbungskosten', wenn: { frage: 'r_rente', wert: 'ja' }, unterlage: { name: 'Rechnungen Rentenberatung/Sozialverband' } }),
      ],
    },
    {
      id: 'kap', name: 'Kapitalerträge (Anlage KAP)', beschreibung: 'Zinsen, Dividenden, Fonds. Meist reicht die Abgeltungsteuer der Bank.',
      fragen: [
        JN('kap_ertraege', `Gab es ${jahr} Zinsen, Dividenden oder Fondserträge?`, 'Die Bank schickt dazu eine Jahressteuerbescheinigung (oft im Online-Postfach).',
          { formular: 'Anlage KAP', unterlage: { name: `Jahressteuerbescheinigungen der Banken ${jahr}` } }),
        JN('kap_freistellung', 'Hattet ihr bei den Banken Freistellungsaufträge?', 'Bis zum Sparer-Pauschbetrag behält die Bank dann keine Steuer ein (Normwert, prüfen).',
          { formular: 'Anlage KAP', wenn: { frage: 'kap_ertraege', wert: 'ja' }, hinweis: { wert: '!ja', text: 'Freistellungsaufträge fehlen oder unklar: Erstattung einbehaltener Steuer mit der Steuerberatung klären.' } }),
        JN('kap_ausland', 'Habt ihr Konten oder Depots im Ausland?', 'Ausländische Banken ziehen keine deutsche Abgeltungsteuer ab, die Erträge müssen erklärt werden.',
          { formular: 'Anlage KAP', unterlage: { name: 'Jahresaufstellung ausländische Konten/Depots' }, hinweis: { wert: 'ja', text: 'Erträge aus dem Ausland mit der Steuerberatung klären.' } }),
        JN('kap_privat', 'Habt ihr privat Geld verliehen und dafür Zinsen bekommen?', 'Ohne Bank wird keine Steuer abgezogen, die Zinsen müssen erklärt werden.',
          { formular: 'Anlage KAP', hinweis: { wert: 'ja', text: 'Private Darlehenszinsen mit der Steuerberatung klären.' } }),
      ],
    },
    {
      id: 'vermietung', name: 'Vermietung (Anlage V)', beschreibung: 'Je Mietobjekt aus der App ein paar Fragen. Objekte im Ausland nur als Klärungspunkt.',
      fragen: [
        JN('v_vermietet', `Habt ihr ${jahr} etwas vermietet (Wohnung, Haus, Ferienwohnung, Garage)?`, 'Die Fragen je Objekt kommen aus den Objekten, die ihr in der App unter „Vermietung“ angelegt habt.',
          { formular: 'Anlage V (je Objekt eine)', pruefe: () => a.v_vermietet?.wert === 'ja' && !kx.objekte.length ? 'Noch kein Mietobjekt in der App: bitte unter „Vermietung“ anlegen, dann erscheinen die Fragen je Objekt.' : '' }),
        ...kx.objekte.flatMap((o) => objektFragen(jahr, o, kx.einnahmenCt[o.id], a)),
      ],
    },
    {
      id: 'vorsorge', name: 'Vorsorge und Sonderausgaben', beschreibung: 'Versicherungen, Altersvorsorge, Spenden, Kirchensteuer.',
      fragen: [
        JN('sa_kv', `Habt ihr ${jahr} selbst Beiträge zur Kranken-/Pflegeversicherung gezahlt (nicht über Lohn oder Rente)?`, 'Beiträge, die Arbeitgeber oder Rentenkasse abziehen, kennt das Finanzamt schon. Hier geht es um selbst überwiesene Beiträge, z. B. freiwillige Versicherung oder Zusatzversicherungen.',
          { formular: 'Anlage Vorsorgeaufwand', unterlage: { name: `Beitragsbescheinigungen Kranken-/Pflegeversicherung ${jahr}` }, info: belegInfo(kx, 'SA|kv_pv') }),
        JN('sa_erstattung', `Gab es ${jahr} Beitragsrückerstattungen oder Bonuszahlungen der Krankenkasse?`, 'Erstattungen mindern die abziehbaren Beiträge. Bonusprogramme werden zum Teil anders behandelt (prüfen).',
          { formular: 'Anlage Vorsorgeaufwand', unterlage: { name: 'Mitteilung der Krankenkasse über Erstattungen/Bonus' } }),
        JN('sa_altersvorsorge', 'Zahlt jemand in einen Riester- oder Rürup-Vertrag ein?', 'Dafür kommt jedes Jahr eine Bescheinigung vom Anbieter. Die Steuerberatung entscheidet, wie sie berücksichtigt wird.',
          { formular: 'Anlage AV bzw. Vorsorgeaufwand', unterlage: { name: `Bescheinigungen Riester/Rürup ${jahr}` }, info: belegInfo(kx, 'SA|altersvorsorge') }),
        JN('sa_versicherungen', 'Habt ihr weitere Versicherungen bezahlt (Haftpflicht, Unfall, Risikolebens-, Berufsunfähigkeitsversicherung)?', 'Diese zählen zu den sonstigen Vorsorgeaufwendungen; oft wirken sie wegen Höchstbeträgen nicht mehr (prüfen). Hausrat und Rechtsschutz gehören in der Regel nicht dazu.',
          { formular: 'Anlage Vorsorgeaufwand', unterlage: { name: 'Beitragsübersicht weitere Versicherungen' }, info: belegInfo(kx, 'SA|haftpflicht') }),
        JN('sa_spenden', `Habt ihr ${jahr} gespendet oder Mitgliedsbeiträge an gemeinnützige Vereine oder Parteien gezahlt?`, 'Für kleinere Spenden reicht oft der Kontoauszug, sonst eine Zuwendungsbestätigung (Grenze prüfen).',
          { formular: 'Hauptvordruck, Sonderausgaben', unterlage: { name: 'Zuwendungsbestätigungen / Kontoauszüge Spenden' }, info: belegInfo(kx, 'SA|spenden') }),
        JN('sa_kirchensteuer', `Habt ihr ${jahr} Kirchensteuer direkt ans Finanzamt gezahlt oder erstattet bekommen?`, 'Kirchensteuer über den Lohn kennt das Finanzamt. Hier geht es um Nachzahlungen oder Erstattungen laut Steuerbescheid.',
          { formular: 'Hauptvordruck, Sonderausgaben', info: belegInfo(kx, 'SA|kirchensteuer') }),
        JN('sa_unterhalt', 'Habt ihr Unterhalt an einen früheren Ehegatten oder an bedürftige Angehörige gezahlt (nicht an eigene Kinder mit Kindergeld)?', 'Dafür gibt es eigene Regeln und Anlagen (prüfen).',
          { formular: 'Anlage U bzw. Anlage Unterhalt', hinweis: { wert: 'ja', text: 'Unterhaltszahlungen mit der Steuerberatung klären.' }, unterlage: { name: 'Nachweise Unterhaltszahlungen' } }),
      ],
    },
    {
      id: 'agb', name: 'Außergewöhnliche Belastungen', beschreibung: 'Krankheit, Pflege, Bestattung. Zählen nur über der zumutbaren Belastung (prüfen).',
      fragen: [
        JN('agb_krankheit', `Habt ihr ${jahr} Krankheitskosten selbst bezahlt?`, 'Zum Beispiel Zuzahlungen, Brille, Zahnersatz, Medikamente auf Rezept, Fahrten zur Behandlung. Erstattungen der Kasse oder Beihilfe abziehen. Es zählt nur der Teil über der zumutbaren Belastung (prüfen).',
          { formular: 'Anlage Außergewöhnliche Belastungen', unterlage: { name: 'Rechnungen Krankheitskosten + Erstattungen der Kasse' }, info: belegInfo(kx, 'AGB|krankheitskosten') }),
        JN('agb_pflege', `Habt ihr ${jahr} Pflege- oder Heimkosten bezahlt (für euch oder Angehörige)?`, 'Leistungen der Pflegekasse werden abgezogen. Der Pflege-Pauschbetrag (Hauptvordruck) und tatsächliche Kosten schließen sich teilweise aus (prüfen).',
          { formular: 'Anlage Außergewöhnliche Belastungen', unterlage: { name: 'Rechnungen Pflege/Heim + Bescheide Pflegekasse' }, info: belegInfo(kx, 'AGB|pflegekosten') }),
        JN('agb_bestattung', `Habt ihr ${jahr} Bestattungskosten getragen?`, 'Zählt nur, soweit der Nachlass und Versicherungsleistungen die Kosten nicht decken (prüfen).',
          { formular: 'Anlage Außergewöhnliche Belastungen', unterlage: { name: 'Rechnungen Bestattung + Nachweis Nachlass' }, info: belegInfo(kx, 'AGB|bestattung'), hinweis: { wert: 'ja', text: 'Bestattungskosten: Nachlass und Erstattungen mit der Steuerberatung klären.' } }),
        JN('agb_sonstige', `Gab es ${jahr} sonstige besondere Kosten (z. B. Schäden durch Unwetter, Hochwasser, Brand; behinderungsbedingter Umbau)?`, 'Nur wenn sie zwangsläufig waren und nicht von einer Versicherung bezahlt wurden (prüfen).',
          { formular: 'Anlage Außergewöhnliche Belastungen', unterlage: { name: 'Rechnungen und Versicherungsabrechnung' }, info: belegInfo(kx, 'AGB|sonstige_agb'), hinweis: { wert: 'ja', text: 'Sonstige außergewöhnliche Belastungen mit der Steuerberatung klären.' } }),
      ],
    },
    {
      id: 'haushalt', name: 'Haushalt und Handwerker (§ 35a)', beschreibung: 'Haushaltsnahe Dienstleistungen und Handwerker in der selbst genutzten Wohnung.',
      fragen: [
        JN('h35_haushaltsnah', `Habt ihr ${jahr} für Reinigung, Gartenpflege, Winterdienst oder ähnliche Dienste im eigenen Haushalt bezahlt?`, 'Begünstigt sind nur die Arbeitskosten (nicht Material), bezahlt per Überweisung. Höchstbeträge prüfen.',
          { formular: 'Hauptvordruck, § 35a', unterlage: { name: 'Rechnungen haushaltsnahe Dienstleistungen + Zahlungsnachweise' }, info: belegInfo(kx, '35A|haushaltsnah') }),
        JN('h35_handwerker', `Gab es ${jahr} Handwerkerarbeiten in eurer selbst genutzten Wohnung (Reparatur, Wartung, Schornsteinfeger)?`, 'Nur die selbst genutzte Wohnung, nicht vermietete Objekte (die gehören zu Anlage V). Arbeitskosten getrennt auf der Rechnung, unbar bezahlt.',
          { formular: 'Hauptvordruck, § 35a', unterlage: { name: 'Handwerkerrechnungen + Zahlungsnachweise' }, info: belegInfo(kx, '35A|handwerker'),
            pruefe: () => (kx.bar35a ?? 0) > 0 ? `${kx.bar35a} § 35a-Beleg(e) in der App sind bar bezahlt – in der Regel nicht begünstigt (prüfen).` : '' }),
        JN('h35_nebenkosten', 'Gibt es für eure selbst genutzte Wohnung eine Nebenkosten- oder Hausgeldabrechnung mit Ausweis nach § 35a?', 'Auch Mieter können Anteile für Hausmeister, Treppenhausreinigung oder Gartenpflege aus der Nebenkostenabrechnung ansetzen.',
          { formular: 'Hauptvordruck, § 35a', unterlage: { name: 'Nebenkosten-/Hausgeldabrechnung mit § 35a-Ausweis' } }),
        JN('h35_minijob', 'Habt ihr eine Haushaltshilfe als Minijob angemeldet (Haushaltsscheck)?', 'Die Minijob-Zentrale schickt eine Jahresbescheinigung.',
          { formular: 'Hauptvordruck, § 35a', unterlage: { name: 'Bescheinigung der Minijob-Zentrale' }, info: belegInfo(kx, '35A|minijob') }),
      ],
    },
  ]
}

/** Passt der Antwortwert zur Bedingung? „!x“ = alles außer x (auch leer zählt nicht). */
export function passtWert(wert: string | undefined, bedingung: string): boolean {
  if (!wert) return false
  return bedingung.startsWith('!') ? wert !== bedingung.slice(1) : wert === bedingung
}

export const sichtbar = (f: Frage, a: Antworten) => (!f.wenn || passtWert(a[f.wenn.frage]?.wert, f.wenn.wert)) && (!f.zeigen || f.zeigen(a))

/** Hinweistext einer Frage: ausgelöster fester Hinweis bzw. berechneter Hinweis. */
export function hinweisText(f: Frage, a: Antworten): string {
  const w = a[f.id]?.wert
  const fest = f.hinweis && passtWert(w, f.hinweis.wert) ? f.hinweis.text : ''
  return [fest, f.pruefe?.(a) ?? ''].filter(Boolean).join(' ')
}
export const beantwortet = (f: Frage, a: Antworten) => !!a[f.id]?.wert

export function fortschritt(b: Bereich, a: Antworten) {
  const s = b.fragen.filter((f) => sichtbar(f, a))
  const fertig = s.filter((f) => beantwortet(f, a)).length
  return { fertig, gesamt: s.length, offen: s.length - fertig, unklar: s.filter((f) => a[f.id]?.wert === WEISS_NICHT).length }
}

export function gesamtFortschritt(l: Bereich[], a: Antworten) {
  return l.filter((b) => !b.folgt).map((b) => fortschritt(b, a)).reduce((s, x) => ({ fertig: s.fertig + x.fertig, gesamt: s.gesamt + x.gesamt, unklar: s.unklar + x.unklar }), { fertig: 0, gesamt: 0, unklar: 0 })
}

/** Erste offene Frage eines Bereichs (für „weiter“). */
export const naechsteOffene = (b: Bereich, a: Antworten) => b.fragen.find((f) => sichtbar(f, a) && !beantwortet(f, a)) ?? null

/** Unterlagen für die Steuerberatung aus den Antworten. */
export function unterlagen(l: Bereich[], a: Antworten): { bereich: string; frage: string; name: string }[] {
  const r: { bereich: string; frage: string; name: string }[] = []
  for (const b of l) for (const f of b.fragen) {
    if (!f.unterlage || !sichtbar(f, a)) continue
    if (f.unterlage.immer ? beantwortet(f, a) : a[f.id]?.wert === 'ja') r.push({ bereich: b.name, frage: f.id, name: f.unterlage.name })
  }
  return r
}

/** Punkte „mit Steuerberatung klären“: weiß-nicht-Antworten und ausgelöste Hinweise. */
export function klaeren(l: Bereich[], a: Antworten): { bereich: string; frage: string; text: string }[] {
  const r: { bereich: string; frage: string; text: string }[] = []
  for (const b of l) for (const f of b.fragen) {
    if (!sichtbar(f, a)) continue
    const w = a[f.id]?.wert
    const h = hinweisText(f, a)
    if (w === WEISS_NICHT) r.push({ bereich: b.name, frage: f.id, text: f.frage })
    else if (h) r.push({ bereich: b.name, frage: f.id, text: h })
  }
  return r
}

export const anzeigeWert = (f: Frage, w: string) =>
  f.typ === 'ja_nein' ? ({ ja: 'ja', nein: 'nein', [WEISS_NICHT]: 'weiß nicht' } as Record<string, string>)[w] ?? w : f.optionen?.find((o) => o.wert === w)?.name ?? w
