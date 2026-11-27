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

/** Fragenkatalog. jahr wird in Texte eingesetzt; die Antworten steuern die Fragen je Kind. */
export function bereiche(jahr: number, a: Antworten = {}): Bereich[] {
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
    { id: 'vermietung', name: 'Vermietung', beschreibung: 'Anlage V je Objekt. Folgt in S3.', fragen: [], folgt: true },
    { id: 'ausgaben', name: 'Vorsorge, Belastungen, Haushalt', beschreibung: 'Sonderausgaben, außergewöhnliche Belastungen, § 35a. Folgt in S4.', fragen: [], folgt: true },
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
