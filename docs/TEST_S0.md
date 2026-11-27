# Test S0 – Steuerjahr 2024 in der App

Nach dem Merge ca. 2 Minuten warten, App schließen und neu öffnen (bzw. „Jetzt neu laden“).
Neu: Oben neben „Steuerbeleg“ steht das **Steuerjahr** (Auswahl 2026 / 2024). Die Auswahl gilt je Gerät; beim Wechsel lädt die App neu.
Neu in beiden Jahren: Bereich **Anlage R – Renten**.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, PC | Oben Jahr **2024** wählen | App lädt neu, alle Seiten zeigen 2024 (z. B. „Vollständigkeit 2024“, „Export 2024“) |
| 2 | Maik, PC | Start → „Struktur 2024 prüfen / ergänzen“ | „Fertig: … Ordner …, 00_Belegindex_2024 bereit“. In Drive: `Steuer/2024/` mit allen Bereichsordnern inkl. `R_…` je Person |
| 3 | Maik, PC | Start → „Objekte, Einheiten und Kinder aus 2026 übernehmen“ → „Aus 2026 übernehmen“ | Meldung mit Anzahl. „Objekte“ und „Kinder“ zeigen sie für 2024; in Drive Objektordner unter `Steuer/2024/V_Vermietung/` |
| 4 | Maik | „Kinder“: alle drei Kinder mit Geburtsdatum prüfen bzw. anlegen | Alle drei vorhanden |
| 5 | Maik, Handy | Jahr 2024 wählen → einen Beleg von 2024 erfassen (Zahlungsdatum 2024) | Steuerjahr 2024; nach dem Übertragen Zeile in `00_Belegindex_2024`, PDF in `Steuer/2024/…` |
| 6 | Maik, Handy | Jahr 2026 eingestellt lassen, Beleg mit Zahlungsdatum 2024 erfassen | Gelber Hinweis „gehört ins Steuerjahr 2024 …“. Landet trotzdem im Belegindex 2024 |
| 7 | Anna, Handy | Jahr 2024 wählen → „Belege“ | Sieht die 2024er-Belege |

Hinweise / Annahmen (prüfen):
- **Konfiguration 2024** ist eine Kopie von 2026 (gleiche Bereiche und Kategorien). Alle Sätze und ELSTER-Zeilen sind leere Platzhalter „prüfen“.
- **Anlage R** hat die Kategorien Rentenbescheid und Rentenanpassung, Leistungsmitteilung (Rentenbezugsmitteilung) und Werbungskosten zur Rente. Ob eine Erwerbsminderungsrente dorthin gehört, bitte mit der Steuerberatung bestätigen.
- Mieten (Einnahmen), Fahrten, Arbeitstage und Vorlagen werden **nicht** aus 2026 übernommen, sie gelten je Jahr.
