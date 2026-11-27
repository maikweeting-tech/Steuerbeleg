# Test Meilenstein 5 – Texterkennung, Vorschläge, § 35a-Lohnanteil

Nach dem Merge ca. 2 Minuten warten. App **schließen und neu öffnen** (bzw. „Jetzt neu laden“ im blauen Hinweis).
Die Texterkennung läuft **auf dem Handy**, das Foto verlässt dafür das Gerät nicht. Beim **ersten Mal** lädt die App das Erkennungsprogramm und die deutschen Sprachdaten (ca. 5–15 MB, WLAN empfohlen), danach geht es schneller.
Alles sind **nur Vorschläge**: Es wird nichts eingetragen, bevor du „Übernehmen“ tippst. Ergebnis je Zeile zurückmelden (ok / Screenshot).

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, Handy | Erfassen → Foto einer gut lesbaren Rechnung | Unter „2. Angaben“ erst „Texterkennung läuft … %“, nach ca. 5–30 s Kasten „Vorschläge aus dem Belegtext“ mit Datum, Betrag, Aussteller |
| 2 | Maik, Handy | Vorschläge mit dem Papier vergleichen → „Alle übernehmen“ | Felder Belegdatum, Zahlungsdatum, Betrag, Aussteller sind gefüllt, in der Liste steht „✓ übernommen“ |
| 3 | Maik, Handy | „Erkannten Text anzeigen“ | Der gelesene Text erscheint (zur Kontrolle, Fehler sind bei schlechten Fotos normal) |
| 4 | Maik, Handy | Kassenbon (Supermarkt/Tankstelle) fotografieren | Betrag = Endsumme, **nicht** MwSt- oder Nettozeile. Unter dem Kasten steht, aus welcher Zeile der Betrag stammt |
| 5 | Maik, PC | Erfassen → „Datei / Galerie“ → eine PDF-Rechnung (z. B. Stadtwerke, digital erhalten) | Vorschläge erscheinen schnell (Text wird direkt aus der PDF gelesen) |
| 6 | Maik, Handy | Neuen Beleg vom **gleichen Aussteller** wie ein früherer (z. B. Grundsteuer, Stadtwerke). Aussteller übernehmen oder eintippen | Blauer Kasten „Bei „…“ zuletzt (n Belege): Modul › Kategorie › Objekt › Person“ → „Übernehmen“ füllt Person, Modul, Kategorie, Objekt |
| 7 | Maik, Handy | Handwerkerrechnung mit getrennt ausgewiesenem Lohn und Material fotografieren | Zeile „§ 35a Arbeit / Material“ mit beiden Beträgen. Vor Modulwahl steht „erst Modul § 35a wählen“ |
| 8 | Maik, Handy | Modul **§ 35a** wählen → bei „§ 35a Arbeit / Material“ auf „Übernehmen“ | Felder Arbeitskosten und Material sind gefüllt. Passt die Summe nicht zum Brutto, kommt die rote Meldung aus M4 |
| 9 | Maik, Handy | Foto zuschneiden (✂) → „Text neu erkennen“ | Neue Vorschläge auf Basis des zugeschnittenen Bildes |
| 10 | Maik, Handy | Flugmodus, Foto aufnehmen | Wenn das Programm schon einmal geladen war: Erkennung geht. Sonst Meldung „Texterkennung nicht möglich“ – Erfassen und Speichern gehen trotzdem |

Hinweise / Annahmen (prüfen):
- Erkennung von Handschrift und sehr schlechten Fotos ist unzuverlässig. Immer mit dem Beleg vergleichen.
- Der **Gesamtbetrag** wird in Zeilen mit „Gesamt/Summe/Brutto/zu zahlen/Rechnungsbetrag“ gesucht, Netto-, MwSt-, Rabatt- und Skontozeilen werden ausgelassen. Ohne solche Zeile wird der größte Betrag vorgeschlagen.
- **Lohnanteil**: Zeilen mit „Lohn, Arbeitskosten, Arbeitsleistung, Montage, Anfahrt, Arbeitszeit“; **Material**: „Material, Materialkosten, Ersatzteil“. Ob die Beträge brutto oder netto ausgewiesen sind, prüfst du selbst (§ 35a: begünstigt sind Arbeitskosten inkl. USt, Fahrtkosten – bitte prüfen).
- Das Erkennungsprogramm wird von cdn.jsdelivr.net geladen (nur Programm und Sprachdaten, keine Belegdaten).
