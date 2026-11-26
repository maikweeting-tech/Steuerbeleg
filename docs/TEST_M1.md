# Test Meilenstein 1

Bitte der Reihe nach prüfen und Ergebnis (ok / Fehlermeldung) zurückmelden.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, PC | `npm.cmd test` | „14 passed“ |
| 2 | Maik, PC | `npm.cmd run dev`, Seite öffnen, „Mit Google anmelden“ | „Angemeldet als Maik (…)“ |
| 3 | Maik, PC | „Neu anlegen (Steuer/2026)“ | „Fertig: … Ordner geprüft/angelegt, 00_Belegindex_2026 bereit“ |
| 4 | Maik | In Google Drive nachsehen | `Steuer/2026/` mit allen Ordnern laut Spezifikation, Sheet mit Blättern Belege, Aufteilung, … |
| 5 | Maik | Nochmals „Struktur 2026 prüfen / ergänzen“ | Keine doppelten Ordner in Drive |
| 6 | Maik | Abschnitt 4: „Ordner „Steuer“ in Drive öffnen“ → Teilen → Annas Adresse, Mitbearbeiter | Anna bekommt eine E-Mail von Google |
| 7 | Anna | App öffnen, anmelden, „Freigegebenen Ordner auswählen“ → „Steuer“ | Ordner gefunden |
| 8 | Anna | „Zugriff prüfen“ | **Wichtigster Test:** Liste zeigt Maiks Ordner und `00_Belegindex_2026`. Erscheint „leer oder nicht sichtbar“, bitte melden (dann reicht `drive.file` nicht). |
| 9 | Maik, Handy | Nach Übernahme in `main`: GitHub-Pages-Adresse in Chrome → „App installieren“ | App-Symbol auf dem Startbildschirm, Anmeldung klappt |
| 10 | beide | Seite „Info“ | „8 von 8 Werten haben noch den Status „prüfen““ |
