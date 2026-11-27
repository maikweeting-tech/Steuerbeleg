# Test Meilenstein 7 – Exporte (Excel, Checkliste, Fragen, Belegmappe, ZIP)

Nach dem Merge ca. 2 Minuten warten, App schließen und neu öffnen (bzw. „Jetzt neu laden“).
Neu im Menü: **Export**. Alle Dateien entstehen im Browser. Belegmappe, ZIP und „In Drive speichern“ gehen nur angemeldet und mit Netz.
Vor jedem Export auf der Export-Seite **„Aktualisieren“** tippen, damit die Belege beider Personen dabei sind.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, PC | „Export“ → „Aktualisieren“ → **Excel-Auswertung** „Erstellen“ → „Herunterladen“ → in Excel öffnen | Blätter: Übersicht, Anlage V, 35a, NK-Vorlage, Anlage N, Fragen, Jahresvergleich, Prüfung, Annahmen, Belege, Aufteilung, Objekte, Einheiten, Einnahmen, Fahrten |
| 2 | Maik, PC | Excel, Blatt **Übersicht**: eine Summenzelle anklicken | Zelle enthält eine Formel (SUMMEWENNS), keinen festen Wert. Gesamtsumme = Summe in „Belege“ der App |
| 3 | Maik, PC | Blatt **Belege**: bei einem Beleg den Betrag testweise ändern (nicht speichern) | Übersicht, Anlage und Prüfung rechnen sofort mit. Danach Datei ohne Speichern schließen |
| 4 | Maik, PC | Blatt **Prüfung** | Alle Zeilen „OK“. „PRÜFEN“ heißt: z. B. Anlage-V-Beleg ohne Objekt oder § 35a-Beleg, bei dem Lohn + Material ≠ Betrag – den Beleg in der App korrigieren |
| 5 | Maik, PC | Blatt **Annahmen** lesen | Alle Annahmen mit Begründung, Steuerwerte als „prüfen“ gekennzeichnet |
| 6 | Maik, Handy | **Checkliste (PDF)** „Erstellen“ → „Herunterladen“ | PDF mit offenen Punkten (fehlende Belege aus „Check“, Zahlungen „Beleg fehlt“), Summen je Bereich und Person, Anlage V je Objekt, § 35a, Fragen |
| 7 | Maik, Handy | **Fragenliste (PDF)** | Nur Belege mit ❓-Frage, sortiert nach Nr., mit Betrag und Bereich |
| 8 | Maik, PC | **Belegmappe (PDF)** „Erstellen“ (dauert je nach Anzahl Belege, Fortschritt wird angezeigt) | Deckblatt, Inhaltsverzeichnis mit Seitenzahlen, danach jeder Beleg mit gelbem Stempel oben links „Nr. · Bereich / Kategorie · Betrag“. Seitenzahl im Verzeichnis = Seite im PDF-Betrachter |
| 9 | Maik, PC | In der Mappe einen Dauerbeleg suchen (z. B. Grundsteuerbescheid, aus Vorlage bestätigt) | Datei nur einmal enthalten, Stempel nennt alle zugehörigen Beleg-Nr. Verzeichnis: „Dauerbeleg, siehe Seite …“ |
| 10 | Maik, PC | **ZIP-Paket** „Erstellen“ → „Herunterladen“ → entpacken | Ordner `Belege_2026/…` wie in Drive, dazu Auswertung.xlsx, Checkliste.pdf, Fragen.pdf |
| 11 | Maik, PC | Beim ZIP „In Drive speichern“ | Meldung „Gespeichert in Steuer/2026/Export/…“. In Drive liegt die Datei im Ordner `Export` |
| 12 | Anna, Handy | „Export“ → Checkliste erstellen | Gleiche Summen wie bei Maik (nach „Aktualisieren“) |

Hinweise / Annahmen (prüfen):
- **Keine Steuerberechnung**: Excel und PDFs enthalten nur Summen. Keine AfA, keine § 35a-Ermäßigung, keine zumutbare Belastung.
- **ELSTER-Zeilen** stehen in der Übersicht nur als leere Spalte zum Selbst-Eintragen (Zeilennummern ändern sich jährlich).
- **Excel geprüft**: Im automatischen Test rechnet LibreOffice die Mappe neu, die Ergebnisse werden mit der unabhängigen Rechnung der App verglichen (Übersicht, Prüfung, Anlage V ± 1 Cent, § 35a, NK-Vorlage je Einheit, Anlage N, Jahresvergleich). Ergebnis: alles gleich. Die Prüfung „§ 35a Lohn + Material ≠ Betrag“ schlägt beim absichtlich falschen Testbeleg korrekt an.
- **NK-Vorlage** ist eine Hilfsrechnung, keine rechtssichere Nebenkostenabrechnung (BetrKV, Mietvertrag prüfen).
- **Jahresvergleich** nutzt den Belegindex 2025, falls vorhanden. Gibt es keinen, bleibt das Blatt leer.
- **Belegmappe und ZIP** wurden automatisch nur mit Testdateien geprüft, nicht mit deinem echten Drive (dort bitte Test 8–11). Bilder (JPEG/PNG) und PDFs werden übernommen; andere Dateitypen stehen als Hinweis im Ergebnis.
- Die Mappe entsteht im Speicher des Geräts. Bei sehr vielen Belegen (mehrere hundert MB) lieber am PC erstellen.
