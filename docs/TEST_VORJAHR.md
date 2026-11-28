# Test: Vorjahresvergleich

Nach dem Merge App ganz schließen und neu öffnen. Oben das Jahr **2025** wählen (Vergleich mit 2024).

1. Seite **Check** → Karte **Vorjahresvergleich 2024 → 2025**.
2. Erwartet, sofern es den Belegindex 2024 gibt:
   - **Kategorien ohne Beleg in 2025**: z. B. „Sonderausgaben · Versicherung“ mit Anzahl und Summe aus 2024.
   - **Aussteller fehlen in 2025**: z. B. eine Versicherung oder die Grundsteuer, mit Anzahl, Summe, letztem Datum und Betrag aus 2024.
   - **Weniger Belege als im Vorjahr**: z. B. 12 Monatsrechnungen in 2024, erst 9 in 2025.
3. **Jetzt erfassen** öffnet „Erfassen“ mit Aussteller, Modul und Kategorie vorbelegt. Betrag und Datum kommen vom neuen Beleg.
4. **Fällt weg** blendet einen Punkt aus (gespeichert im Belegindex 2025, Blatt „Erklaerung“, sieht auch die zweite Person). Unten „… ausgeblendet“ → **wieder zeigen** macht es rückgängig.
5. Ohne Belegindex 2024: Hinweis „Kein Belegindex 2024 gefunden“.

## Annahmen
- Gleicher Aussteller = gleiche Schreibweise nach Vereinheitlichung (Groß/klein, Umlaute, Satzzeichen egal). Andere Schreibweise („Stadtwerke Kleve“ vs. „SWK“) gilt als anderer Aussteller.
- Es zählen übertragene und noch wartende Belege des gewählten Jahres.
