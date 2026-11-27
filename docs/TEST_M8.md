# Test Meilenstein 8 – Abnahme, Kurzanleitung, Bescheid-Abgleich

Nach dem Merge ca. 2 Minuten warten, App schließen und neu öffnen (bzw. „Jetzt neu laden“).
Neu im Menü: **Bescheid**. Beim ersten Öffnen ergänzt die App im Belegindex das Blatt **Bescheid** (falls ein Lesefehler kommt: Start → „Struktur prüfen / ergänzen“).
Kurzanleitung: `docs/KURZANLEITUNG.md`.

## Abnahmetest (Ende-zu-Ende)

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| A1 | Maik, Handy | Kameraknopf → einen echten Beleg (z. B. Bürobedarf, Anlage N Arbeitsmittel) fotografieren → speichern | Meldung „gespeichert“, kurz danach „übertragen“ |
| A2 | Maik, PC | Drive → Steuer/2026/N_… /Arbeitsmittel | PDF mit Namen `JJJJ-MM-TT_B000x_Aussteller_Betrag.pdf`, Foto lesbar |
| A3 | Maik, PC | Sheet `00_Belegindex_2026`, Blatt Belege | Neue Zeile mit Betrag, Kategorie, Link auf die PDF |
| A4 | Maik, PC | App → Export → „Aktualisieren“ → Excel-Auswertung → in Excel öffnen | Übersicht, Zeile „Arbeitsmittel“: Summe enthält den neuen Betrag; Gesamt = Summe „Belege“ in der App; Blatt Prüfung alles „OK“ |
| A5 | Anna, Handy | Belege öffnen | Sieht Maiks neuen Beleg |

## Bescheid-Abgleich (E12)

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| B1 | Maik | „Bescheid“ → Bescheiddatum und Einspruchsfrist eintragen → Speichern | Hinweis „Noch n Tag(e) bis zur eingetragenen Einspruchsfrist“; ab 14 Tagen vorher gelb, nach Ablauf rot |
| B2 | Maik | „Posten aus Belegsummen anlegen“ | Je Bereich mit Belegen ein Posten, „laut Erklärung“ = Belegsumme |
| B3 | Maik | Bei einem Posten „laut Bescheid“ 100 € niedriger eintragen → Speichern | „Abweichung: −100,00 € (weniger anerkannt)“ rot; Ergebnis-Karte zeigt die Summe. Sheet: Blatt Bescheid hat die Zeile |
| B4 | Maik | Export → Excel → Blatt **Bescheid** | Spalte Abweichung ist eine Formel (Bescheid − Erklärung), Summenzeile unten |
| B5 | Anna | „Bescheid“ öffnen | Sieht dieselben Posten |

Hinweise / Annahmen (prüfen):
- **Keine Bewertung, keine Fristberechnung.** Die Einspruchsfrist trägst du aus der Rechtsbehelfsbelehrung selbst ein. Die App zeigt nur die Tage bis dahin.
- **„Aus Belegsummen“** setzt die Belegsumme als Wert „laut Erklärung“. Hat die Steuerberatung andere Werte erklärt (Pauschalen, Kürzungen), bitte überschreiben.
- **Automatischer Abnahmetest**: Foto → PDF → Ablage → Belegindex → Excel wird im Test mit nachgebildetem Drive durchlaufen, LibreOffice rechnet die Excel neu; Gesamtsumme und Summen je Kategorie stimmen, Prüfblatt alles OK. Der echte Weg über Google (A1–A5) bleibt dein Test.
- Testdatensatz für die Prüfungen: `tests/hilfen/exportDaten.ts` (fiktive Werte) und `tests/hilfen/beleg.jpg`.
