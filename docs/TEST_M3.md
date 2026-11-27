# Test Meilenstein 3 – Anlage V mit Objekten

Nach dem Merge ca. 2 Minuten warten. App **einmal schließen und neu öffnen** (PC: Strg+F5).
Objekte, Einheiten und Einnahmen lassen sich nur **angemeldet und mit Netz** ändern. Belege erfassen geht weiterhin offline.
Ergebnis je Zeile zurückmelden (ok / Screenshot vom Fehler). Die Beispielzahlen sind frei gewählt, gern echte nehmen.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, PC | Oben neuer Menüpunkt **„Objekte“** öffnen | Seite „Anlage V – Objekte 2026“, Hinweis zu Kamperland |
| 2 | Maik, PC | Neues Objekt anlegen, Bezeichnung z. B. `Kalkar Hauptstr` → „Anlegen“ | Objekt erscheint mit 0,00 €. In Drive: `Steuer/2026/V_Vermietung/Kalkar Hauptstr/` mit Kategorie-Unterordnern. Sheet: Blatt **Objekte** neue Zeile, neues Blatt **Einnahmen** vorhanden |
| 3 | Maik, PC | Objekt antippen → Grunddaten ausfüllen (Adresse, Wohnfläche, Anschaffungsdatum, Kosten, Gebäudeanteil, Baujahr, AfA-Satz als Text) → speichern | „Gespeichert.“; nach „← Objekte“ und zurück sind die Werte noch da |
| 4 | Maik, PC | Ggf. zweites Objekt anlegen (z. B. Garage) | Zwei Objekte in der Liste |
| 5 | Maik, PC | Im Objekt „+ Einheit“ zweimal, umbenennen (z. B. EG, OG), m² eintragen, je „Speichern“ | Zwei Einheiten, Blatt **Einheiten** zwei Zeilen |
| 6 | Maik, PC | Einnahmen: Monat Jan, Miete, Einheit EG, `650,00`, Haken „Gleicher Betrag für alle Monate“ → speichern | „12 Einnahme(n) gespeichert.“, Tabelle Jan–Dez, Summe 7.800,00 €; Übersicht oben Einnahmen 7.800,00 € |
| 7 | Maik, PC | Eine Einnahme mit ✕ löschen | Zeile weg, Summe 7.150,00 € |
| 8 | Maik, Handy | Erfassen: Modul **Anlage V**, Kategorie **Grundsteuer** | Feld „Objekt *“ erscheint, Haken **„Umlagefähig“** ist schon gesetzt (Vorschlag) |
| 9 | Maik, Handy | Objekt Kalkar wählen, Einheit leer lassen, Rest ausfüllen, speichern | Belege-Liste: „Anlage V · Grundsteuer · Kalkar Hauptstr“. PDF in `V_Vermietung/Kalkar Hauptstr/Grundsteuer/` |
| 10 | Maik, Handy | Neuer V-Beleg (z. B. Gebäudeversicherung `333,33`), Haken **„Auf mehrere aufteilen“**, Zeile 1 Kalkar 70 %, Zeile 2 Garage 30 % | Summe zeigt erst rot ≠ 100 %, bei 70 + 30 schwarz „100 %“; Speichern geht |
| 11 | Maik | Nach Übertragung: Belege-Liste und Sheet | Liste „· aufgeteilt“; Blatt **Aufteilung** 2 Zeilen; PDF bei Kalkar (größter Anteil) |
| 12 | Maik, PC | Objekte-Übersicht | Kalkar: Werbungskosten enthält 233,33 € aus Nr. 10; Garage: 100,00 € (Summe exakt 333,33 €) |
| 13 | Maik, PC | Objekt Kalkar → „Umlage je Einheit“ | Tabelle je Kategorie und Einheit nach Wohnfläche; Zeilensummen = Gesamt |
| 14 | Maik, PC | Grunddaten: Umlageschlüssel auf „fester Prozentsatz“, speichern | Rote Meldung „Angabe … fehlt“ bzw. „Feste Anteile ergeben … statt 100 %“, bis bei den Einheiten % eingetragen sind |
| 15 | Maik, Handy | Modul Anlage V ohne Objekt speichern | Rote Liste „Objekt fehlt“ |
| 16 | Anna, Handy | Anmelden, „Objekte“ | Anna sieht dieselben Objekte und Summen |

Hinweise:
- Die Bezeichnung eines Objekts ist zugleich der Ordnername. **Nach dem Anlegen nicht mehr ändern** (Umbenennen folgt ggf. später).
- „Saldo vor AfA“ ist nur Einnahmen minus Werbungskosten aus den Belegen. Es wird **keine AfA und keine Steuer** berechnet.
- Die Umlage ist eine Hilfsrechnung, keine rechtssichere Nebenkostenabrechnung.
- Ein Belegindex aus M1/M2 wird beim ersten Öffnen der Objekte automatisch um das Blatt „Einnahmen“ und neue Spalten ergänzt.
