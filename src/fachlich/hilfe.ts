// Kurze Erklärungen zu den Eingabefeldern (i-Symbol). Schlüssel = Feldbeschriftung ohne „ *“.
// Steuerliche Hinweise sind allgemein gehalten und mit „prüfen“ gekennzeichnet – maßgeblich ist die Steuerberatung.

export const HILFE: Record<string, string> = {
  // Beleg erfassen / bearbeiten
  'Belegdatum': 'Datum, das auf der Rechnung oder Quittung steht (Rechnungsdatum).',
  'Zahlungsdatum': 'Tag, an dem das Geld tatsächlich geflossen ist (Überweisung, Abbuchung, Barzahlung). Danach richtet sich das Steuerjahr. Ausnahme: regelmäßige Zahlungen um den Jahreswechsel (10-Tage-Regel, prüfen).',
  'Betrag brutto in €': 'Gesamtbetrag inklusive Mehrwertsteuer, so wie er bezahlt wurde. Dezimalkomma verwenden, z. B. 412,50.',
  'Aussteller': 'Wer die Rechnung geschrieben hat (Firma, Praxis, Behörde). Die App merkt sich, wie Belege dieses Ausstellers zugeordnet wurden, und schlägt das beim nächsten Mal vor.',
  'Person': 'Wem der Beleg steuerlich zugerechnet wird. „Gemeinsam“ für Ausgaben, die beide betreffen (z. B. Versicherungen, Haushalt).',
  'Modul': 'Der Bereich der Steuererklärung, zu dem der Beleg gehört, z. B. Anlage N (Arbeit), V (Vermietung), Sonderausgaben. Danach richtet sich auch der Ablageordner.',
  'Kategorie': 'Die genauere Art der Ausgabe innerhalb des Moduls, z. B. Arbeitsmittel, Fahrtkosten, Erhaltungsaufwand. Bestimmt den Unterordner.',
  'Kind': 'Das Kind, für das die Ausgabe angefallen ist (z. B. Betreuung, Schulgeld). Kinder werden unter „Kinder“ angelegt.',
  'Zahlungsart': 'Unbar = Überweisung/Karte/Lastschrift. Bar = gegen Quittung. Wichtig bei Handwerker- und Haushaltsleistungen (§ 35a): dort zählt nur unbare Zahlung (prüfen).',
  'Arbeitskosten (€)': 'Nur der Lohnanteil (Arbeits- und Fahrtkosten) laut Rechnung, brutto. Bei Handwerkerleistungen wird nur dieser Anteil steuerlich begünstigt (§ 35a, prüfen).',
  'Material (€)': 'Materialanteil laut Rechnung, brutto. Wird bei § 35a nicht begünstigt. Arbeitskosten + Material sollen den Gesamtbetrag ergeben.',
  'Status': 'Offen = noch etwas zu klären oder zu ergänzen. Fertig = vollständig, kann so an die Steuerberatung.',
  'Notiz': 'Freier Text für dich, z. B. wofür die Ausgabe war. Erscheint in Listen und Exporten.',
  '❓ Frage an den Steuerberater (leer = keine)': 'Wenn du unsicher bist, ob oder wie der Beleg zählt, schreib die Frage hier hinein. Alle Fragen kommen gesammelt in die Fragenliste für die Steuerberatung.',
  'Objekt': 'Das Mietobjekt, zu dem der Beleg gehört. Objekte werden unter „Objekte“ angelegt.',
  'Einheit (optional, leer = ganzes Objekt)': 'Wohnung oder Einheit im Objekt, wenn die Ausgabe nur diese betrifft (z. B. Reparatur in der EG-Wohnung). Leer lassen, wenn sie das ganze Haus betrifft.',
  'Einheit': 'Wohnung oder Einheit im Objekt, z. B. „EG“ oder „Whg. 2“.',

  // Objekte
  'Bezeichnung': 'Kurzer, eindeutiger Name, unter dem du den Eintrag wiederfindest.',
  'Bezeichnung (wird auch Ordnername, später nicht mehr ändern)': 'Kurzer Name des Objekts, z. B. „Haus Musterstraße“. Daraus wird der Ordnername in Drive. Später nicht mehr ändern, sonst passen Ordner und Liste nicht mehr zusammen.',
  'Adresse': 'Straße, Hausnummer, Ort. Wird auch genutzt, um Belege mit dieser Adresse automatisch dem Objekt zuzuordnen.',
  'Anschaffungsdatum (TT.MM.JJJJ)': 'Datum des Kaufs laut Kaufvertrag (Übergang von Besitz, Nutzen und Lasten). Wichtig für die Abschreibung (AfA) im ersten Jahr.',
  'Anschaffungskosten gesamt (€)': 'Kaufpreis plus Nebenkosten (Grunderwerbsteuer, Notar, Grundbuch, Makler). Grundlage für die Abschreibung – Aufteilung Gebäude/Boden macht die Steuerberatung (prüfen).',
  'Gebäudeanteil (%) – ohne Grund und Boden': 'Anteil der Anschaffungskosten, der auf das Gebäude entfällt. Grund und Boden wird nicht abgeschrieben. Wert z. B. aus Kaufvertrag oder Kaufpreisaufteilung (prüfen).',
  'Baujahr': 'Jahr der Fertigstellung des Gebäudes. Bestimmt mit, welcher Abschreibungssatz gilt (prüfen).',
  'AfA-Satz laut Steuerberater/Bescheid (Text, prüfen)': 'Abschreibungssatz pro Jahr, z. B. „2 %“ oder „3 %“. Nur übernehmen, was die Steuerberatung oder der Bescheid nennt. Die App rechnet damit nicht.',
  'Wohnfläche gesamt (m²)': 'Gesamte Wohnfläche des Objekts. Wird für die Aufteilung von Kosten nach Fläche gebraucht.',
  'Umlageschlüssel': 'Wie gemeinsame Kosten auf die Einheiten verteilt werden: nach Fläche (m²), zu gleichen Teilen oder nach festen Prozenten.',

  // Kinder
  'Vorname (wird Ordnername, später nicht mehr ändern)': 'Vorname des Kindes. Daraus wird der Ordnername in Drive. Später nicht mehr ändern.',
  'Geburtsdatum (TT.MM.JJJJ, optional)': 'Geburtsdatum des Kindes. Daraus ergibt sich das Alter, z. B. für Kinderbetreuung (bis 14) oder Ausbildung (ab 18).',

  // Fahrten
  'Arbeitstage an der Tätigkeitsstätte': 'Tage, an denen du tatsächlich zur Arbeit gefahren bist (ohne Urlaub, Krankheit, Homeoffice). Grundlage für die Entfernungspauschale.',
  'Homeoffice-Tage': 'Tage, an denen du überwiegend zu Hause gearbeitet hast. Dafür gibt es eine Tagespauschale (Betrag und Höchstgrenze prüfen).',
  'Entfernung Wohnung – erste Tätigkeitsstätte, einfach (km)': 'Kürzeste Straßenverbindung von der Wohnung zur Arbeit, nur eine Strecke, volle Kilometer.',
  'Datum': 'Tag der Fahrt bzw. des Eintrags.',
  'Start': 'Ort, an dem die Fahrt beginnt.',
  'Ziel': 'Ort, zu dem du gefahren bist.',
  'Zweck': 'Warum die Fahrt nötig war, z. B. Kundentermin, Fortbildung, Besichtigung Mietobjekt. Das Finanzamt kann danach fragen.',
  'km (einfach)': 'Kilometer für eine Strecke. „Hin und zurück“ anhaken, wenn die Rückfahrt mitzählen soll.',
  'Fahrzeug': 'Mit welchem Fahrzeug gefahren wurde (z. B. eigener Pkw, Firmenwagen). Beim Firmenwagen gelten andere Regeln (prüfen).',

  // Check / Vorlagen / Erinnerung
  'Betrag €': 'Betrag in Euro mit Komma, z. B. 89,90.',
  'Betrag € (leer = schwankt)': 'Wenn die Zahlung immer gleich hoch ist, hier eintragen. Leer lassen, wenn der Betrag jedes Mal anders ist.',
  'Rhythmus': 'Wie oft der Beleg regelmäßig kommt: monatlich, vierteljährlich oder jährlich. Die App erinnert dich auf der Seite „Check“, wenn er fehlt.',
  'erwartet ab Monat': 'In welchem Monat der jährliche Beleg normalerweise kommt.',
  'Monat im Quartal': 'In welchem Monat des Quartals (1., 2. oder 3.) der Beleg normalerweise kommt.',
  'Monat': 'Monat, auf den sich der Eintrag bezieht.',
  'Tag im Monat': 'An welchem Tag die Kalender-Erinnerung kommen soll.',
  'Uhrzeit': 'Um wie viel Uhr die Kalender-Erinnerung kommen soll.',

  // Stichwörter
  'Stichwort (z. B. Name der Praxis)': 'Ein Wort, das auf passenden Belegen steht, z. B. der Name einer Praxis oder Firma. Taucht es im erkannten Text auf, schlägt die App Modul und Kategorie vor.',
  'Bereich': 'Modul und Kategorie, die vorgeschlagen werden sollen, wenn das Stichwort auf einem Beleg steht.',
  'Aussteller (für die Zuordnung vorhandener Belege, leer = egal)': 'Nur Belege dieses Ausstellers berücksichtigen. Leer lassen, wenn der Aussteller egal ist.',

  // Konto
  'Buchungsdatum': 'Spalte der Bankdatei, in der das Datum der Buchung steht.',
  'Betrag': 'Spalte der Bankdatei mit dem Betrag. Ausgaben sind meist negativ.',
  'Empfänger / Zahler': 'Spalte mit dem Namen der Gegenseite (wer Geld bekommen oder gezahlt hat).',
  'Verwendungszweck': 'Spalte mit dem Buchungstext, z. B. Rechnungsnummer.',
  'Soll/Haben-Kennzeichen (S/H)': 'Nur nötig, wenn die Bank Ausgaben nicht mit Minus kennzeichnet, sondern mit S (Soll) und H (Haben).',

  // Bescheid
  'Bescheid vom': 'Datum, das oben auf dem Steuerbescheid steht.',
  'Einspruchsfrist bis (prüfen)': 'Bis wann Einspruch möglich ist: in der Regel ein Monat nach Bekanntgabe (Bescheiddatum + 3 Tage, prüfen). Steht auch in der Rechtsbehelfsbelehrung.',
  'Posten': 'Name der Position, die du vergleichen willst, z. B. „Werbungskosten Person 1“ oder „Einkünfte V&V“.',
  'laut Erklärung €': 'Betrag, der in der abgegebenen Erklärung stand.',
  'laut Bescheid €': 'Betrag, den das Finanzamt im Bescheid angesetzt hat.',
  'Notiz (z. B. Begründung im Bescheid, Rückfrage)': 'Warum das Finanzamt abgewichen ist (steht meist in den Erläuterungen) oder was du klären willst.',

  // Dokumente
  'Datei (PDF oder Foto)': 'Das Dokument als PDF oder Foto. Es wird in Drive unter „Steuer/Dokumente“ abgelegt.',
  'Titel (z. B. „Mietvertrag EG“)': 'Kurzer Name des Dokuments, daraus wird auch der Dateiname.',
  'Art': 'Welche Sorte Dokument, z. B. Mietvertrag, Kaufvertrag, Darlehensvertrag. Hilft beim Wiederfinden.',
  'Gehört zu': 'Wozu das Dokument gehört: ein Objekt, eine Person, das Auslandsobjekt oder allgemein. Bestimmt den Unterordner.',
  'Gültig ab': 'Ab wann der Vertrag gilt. Gültige Dokumente stehen in der Ausfüllhilfe für die Steuerberatung.',
  'Gültig bis (leer = unbefristet)': 'Bis wann der Vertrag gilt. Leer lassen, wenn er unbefristet ist.',

  // Start / Erklärung
  'Link zum Ordner (aus Drive oder der Freigabe-Mail)': 'Den Link zum gemeinsamen Ordner „Steuer“ hier einfügen, z. B. aus der Mail „… hat einen Ordner mit dir geteilt“.',
  'Notiz (optional)': 'Ergänzung zur Antwort, z. B. eine Erklärung oder wo der Nachweis liegt. Kommt mit in die Ausfüllhilfe.',
}

/** Erklärung zu einer Feldbeschriftung (Pflicht-Stern wird ignoriert). */
export function hilfeZu(beschriftung: string): string {
  return HILFE[beschriftung.replace(/\s*\*$/, '').trim()] ?? ''
}
