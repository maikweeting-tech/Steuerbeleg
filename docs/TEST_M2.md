# Test Meilenstein 2 – Beleg erfassen

Nach dem Merge ca. 2 Minuten warten. Am Handy die installierte App **einmal schließen und neu öffnen**, damit die neue Version geladen wird.
Ergebnis je Zeile zurückmelden (ok / Screenshot vom Fehler).

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, Handy | Oben „Erfassen“ → „📷 Foto aufnehmen“ → einen echten Kassenbon fotografieren | Vorschau „Seite 1“ erscheint, Kontrast verbessert |
| 2 | Maik, Handy | ✂ tippen, Ecken an die Bonkanten ziehen, „Übernehmen“ | Vorschau zeigt nur noch den Bon |
| 3 | Maik, Handy | Zweites Foto aufnehmen (zweite Seite), mit ◀ Reihenfolge tauschen, ⟳ drehen | Zwei Seiten, Reihenfolge und Drehung stimmen |
| 4 | Maik, Handy | Sofort „Beleg speichern“ | Rote Liste „Bitte ergänzen“ mit allen Pflichtfeldern |
| 5 | Maik, Handy | Belegdatum, Betrag (z. B. `12,34`), Aussteller, Person Maik, Modul Anlage N, Kategorie Arbeitsmittel → speichern | Seite „Belege“: grüne Meldung, nach einigen Sekunden Zeile mit Nr. 1 |
| 6 | Maik | Google Drive: `Steuer/2026/N_Maik/Arbeitsmittel/` | PDF `JJJJ-MM-TT_B0001_<Aussteller>_12,34EUR.pdf` mit beiden Seiten |
| 7 | Maik | Sheet `00_Belegindex_2026`, Blätter **Belege** und **Protokoll** | Je eine neue Zeile, Betrag `1234` (Cent), Steuerjahr 2026 |
| 8 | Maik, Handy | Neuen Beleg mit **gleichem Datum und Betrag** beginnen | Gelbe Warnung „Möglicherweise doppelt: Nr. 1 …“ (Speichern bleibt möglich) |
| 9 | Maik, Handy | **Flugmodus an**, Beleg erfassen (Modul „Sonstiges“, Person gemeinsam) und speichern | „Wartet auf Übertragung (1)“, im Menü „Belege 1“ |
| 10 | Maik, Handy | Flugmodus aus, App kurz in den Hintergrund und wieder öffnen oder „Übertragen / Aktualisieren“ | Warteschlange leer, Beleg als Nr. 2 in der Liste, PDF in `Sonstiges_ungeklaert` |
| 11 | Maik, Handy (Android) | In der Galerie oder Mail ein Bild/PDF → Teilen → „Steuerbeleg“ | App öffnet „Erfassen“ mit der Datei als Seite 1 |
| 12 | Anna, Handy | Anmelden, „Belege“ → „Übertragen / Aktualisieren“ | Anna sieht Maiks Belege Nr. 1 und 2 |
| 13 | Maik, PC | Beleg mit Zahlungsdatum 05.01.2027 | Meldung „Für das Steuerjahr 2027 gibt es keine Konfiguration“ (richtig so) |

Hinweis zu Nr. 11: Das Teilen-Ziel erscheint erst, nachdem die App neu installiert bzw. einmal neu geöffnet wurde. Unter iPhone gibt es diese Funktion nicht.
