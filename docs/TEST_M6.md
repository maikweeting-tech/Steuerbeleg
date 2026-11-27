# Test Meilenstein 6 – Vollständigkeit, Vorlagen, Kontoauszug, Fragen, Suche

Nach dem Merge ca. 2 Minuten warten, App schließen und neu öffnen (bzw. „Jetzt neu laden“).
Neu im Menü: **Check** und **Konto**. Vorlagen, Markierungen und Fragen speichern geht nur angemeldet und mit Netz.
Beim ersten Öffnen ergänzt die App im Belegindex die Blätter **Vorlagen** und **Buchungen** und auf dem Blatt **Belege** die Spalte **frage**. Falls „Belege“ einen Lesefehler zeigt: Start → „Struktur prüfen / ergänzen“.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, Handy | Einen Beleg öffnen (✎) → Feld „❓ Frage an den Steuerberater“ ausfüllen → speichern | In „Belege“ steht die Frage orange unter dem Beleg. Sheet, Blatt Belege: Spalte `frage` gefüllt |
| 2 | Maik, Handy | „Belege“ → Suchfeld `85,10` bzw. ein Ausstellername; danach Filter Modul/Person/„nur ❓ Fragen“ | Liste wird kleiner, darüber „x von y Belegen, Summe …“. „Filter löschen“ zeigt wieder alle |
| 3 | Maik, PC | „Check“ → „Aus vorhandenem Beleg anlegen“: Grundsteuerbeleg wählen, **vierteljährlich** → „Vorlage anlegen“ | Karte „Stadt Kalkar …“ mit Q1–Q4. Quartale mit Beleg grün ✓, vergangene ohne Beleg rot ✕, aktuelles gelb ! |
| 4 | Maik, PC | Rotes Quartal antippen → Betrag/Datum prüfen → **Bestätigen** | Grüne Meldung, Quartal wird ✓. Nach der Übertragung: neue Zeile im Belegindex, Link zeigt auf die PDF des Grundsteuerbescheids (keine neue PDF in Drive), Notiz „… [Vorlage …] (Dauerbeleg)“ |
| 5 | Maik, PC | „Erwarteten Beleg ohne Vorbild anlegen“: „Lohnsteuerbescheinigung Maik“, Modul Anlage N, Person Maik, jährlich | Karte mit „! 2026“ (gelb). Antippen → „Mit Foto/PDF erfassen“ öffnet Erfassen mit vorausgefüllter Zuordnung |
| 6 | Maik | Vorlage ✎ → Betrag ändern, „aktiv“ abhaken → Speichern | Vorlage erscheint als „inaktiv“, keine rote Anzeige mehr dafür |
| 7 | Maik, PC | Online-Banking **Sparkasse Kleve**: Umsätze 2026 als **CSV-CAMT** exportieren → „Konto“ → „CSV-Datei wählen“ | „erkannt als Sparkasse (CSV-CAMT), n Buchungen“. Liste „Zahlungen ohne Beleg“ |
| 8 | Maik, PC | Dasselbe mit dem CSV-Export der **Volksbank Kleverland** | „erkannt als Volksbank / VR-Banking“. Falls „unbekanntes Format“: unter „Spalten zuordnen“ Datum und Betrag wählen und mir einen Screenshot der Spaltenköpfe schicken |
| 9 | Maik, PC | Bei einer Zahlung „Beleg fehlt (nachreichen)“, bei einer anderen „privat“ | Beide verschwinden aus der Liste, stehen unter „Markiert“. Blatt **Buchungen**: genau diese 2 Zeilen. „Check“ zeigt „Zahlungen ohne Beleg: 1“ (rot), Start zeigt „1 Beleg fehlt“ |
| 10 | Maik, PC | Bei einer Zahlung „Beleg erfassen“ | Erfassen öffnet sich mit Betrag, Datum und Empfänger als Aussteller |
| 11 | Maik, Handy | „Check“ → „Monatliche Erinnerung“: Tag/Uhrzeit wählen → „In Google Kalender eintragen“ | Google Kalender zeigt einen Termin „Steuerbelege sammeln“, Wiederholung monatlich → Speichern |
| 12 | Anna, Handy | „Check“ öffnen | Sieht dieselben Vorlagen und roten/grünen Zeiträume wie Maik |

Hinweise / Annahmen (prüfen):
- **CSV-Formate** sind nach den bekannten Exporten nachgebaut (Sparkasse CSV-CAMT/MT940, Volksbank/Atruvia neu und alt mit S/H, ING, DKB, comdirect, Sparda-Bank), nicht mit euren echten Dateien geprüft. Nicht erkannte Spalten lassen sich von Hand zuordnen.
- **Treffer** im Kontoauszug: gleicher Betrag und Datum ± 5 Tage (Zahlungs- oder Belegdatum). Sammelzahlungen oder Teilbeträge werden nicht erkannt.
- Die CSV wird **nicht gespeichert**. Im Sheet stehen nur markierte Buchungen (Datum, Betrag, Empfänger, Verwendungszweck).
- **Vollständigkeit**: ein Zeitraum gilt als erledigt, wenn ein Beleg mit gleichem Modul/Kategorie (und ggf. Aussteller, Person, Objekt) im Zeitraum bezahlt wurde oder aus der Vorlage bestätigt wurde. Rot = Zeitraum vorbei ohne Beleg. Vorlagen, die mitten im Jahr angelegt werden, zeigen frühere Monate rot – dann bestätigen oder Vorlage anpassen.
- **Kalender**: statt einer zusätzlichen Kalender-Berechtigung öffnet die App Google Kalender mit einem fertigen Serientermin, du speicherst ihn selbst (keine Änderung in der Google-Cloud-Konsole nötig).
