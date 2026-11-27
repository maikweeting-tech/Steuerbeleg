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

/** Fragenkatalog. jahr wird nur in Texte eingesetzt. */
export function bereiche(jahr: number): Bereich[] {
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
    { id: 'kinder', name: 'Kinder', beschreibung: 'Anlage Kind je Kind. Folgt in S2.', fragen: [], folgt: true },
    { id: 'einkuenfte', name: 'Lohn, Rente, Kapitalerträge', beschreibung: 'Anlage N, R und KAP. Folgt in S2.', fragen: [], folgt: true },
    { id: 'vermietung', name: 'Vermietung', beschreibung: 'Anlage V je Objekt. Folgt in S3.', fragen: [], folgt: true },
    { id: 'ausgaben', name: 'Vorsorge, Belastungen, Haushalt', beschreibung: 'Sonderausgaben, außergewöhnliche Belastungen, § 35a. Folgt in S4.', fragen: [], folgt: true },
  ]
}

/** Passt der Antwortwert zur Bedingung? „!x“ = alles außer x (auch leer zählt nicht). */
export function passtWert(wert: string | undefined, bedingung: string): boolean {
  if (!wert) return false
  return bedingung.startsWith('!') ? wert !== bedingung.slice(1) : wert === bedingung
}

export const sichtbar = (f: Frage, a: Antworten) => !f.wenn || passtWert(a[f.wenn.frage]?.wert, f.wenn.wert)
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
    if (w === WEISS_NICHT) r.push({ bereich: b.name, frage: f.id, text: f.frage })
    else if (f.hinweis && passtWert(w, f.hinweis.wert)) r.push({ bereich: b.name, frage: f.id, text: f.hinweis.text })
  }
  return r
}

export const anzeigeWert = (f: Frage, w: string) =>
  f.typ === 'ja_nein' ? ({ ja: 'ja', nein: 'nein', [WEISS_NICHT]: 'weiß nicht' } as Record<string, string>)[w] ?? w : f.optionen?.find((o) => o.wert === w)?.name ?? w
