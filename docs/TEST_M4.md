# Test Meilenstein 4 – Beleg bearbeiten, Anlage N, Kind, § 35a, agB, KAP

Nach dem Merge ca. 2 Minuten warten. App **einmal schließen und neu öffnen** (PC: Strg+F5).
Ändern, Kinder, Tage und Fahrten gehen nur **angemeldet und mit Netz**. Ergebnis je Zeile zurückmelden (ok / Screenshot vom Fehler).

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik, PC | „Belege“ → beim **Physio-Beleg** auf ✎ | Seite „Beleg Nr. … bearbeiten“ mit allen Angaben, Link „PDF ansehen“ |
| 2 | Maik, PC | Modul **Außergewöhnliche Belastungen**, Kategorie **Krankheitskosten** → „Änderung speichern“ | Grüne Meldung „Beleg Nr. … geändert (2 Felder)“. Drive: PDF liegt jetzt in `agB_Aussergewoehnliche_Belastungen/Krankheitskosten/`, nicht mehr unter KV |
| 3 | Maik | Sheet, Blatt **Belege** und **Protokoll** | Belegzeile: modul `AGB`, version `2`. Protokoll: 2 Zeilen „geändert“ mit alt/neu |
| 4 | Maik, PC | **Grundsteuerbeleg Nr. 2** → ✎ → Objekt „Kalkar Wissel …“ wählen → speichern. Danach Nr. 3 genauso | PDFs liegen in `V_Vermietung/Kalkar Wissel …/Grundsteuer/`. „Objekte“: Kalkar Wissel zeigt 2 Belege und die Summe |
| 5 | Maik, PC | Einen Beleg öffnen, Betrag ändern (z. B. 85,00 → 85,10), speichern, danach zurück auf den alten Betrag | Dateiname der PDF ändert sich mit, Belegnummer bleibt gleich |
| 6 | Maik + Anna | Beide öffnen denselben Beleg. Maik speichert eine Änderung, danach speichert Anna eine andere | Anna bekommt „Der Beleg wurde inzwischen geändert …“. Nach „Aktualisieren“ geht es |
| 7 | Maik, PC | Menü **„Kinder“** → Kind anlegen (Vorname, Geburtsdatum optional) | Kind erscheint, Blatt **Kinder** eine Zeile |
| 8 | Maik, Handy | Erfassen: Modul **Anlage Kind**, Kategorie Kinderbetreuung | Feld „Kind *“, ohne Auswahl rote Meldung „Kind fehlt“. Nach Speichern: PDF in `Kind/<Name>/Kinderbetreuungskosten/` |
| 9 | Maik, Handy | Menü **„Fahrten“**, Person Maik: Arbeitstage und Homeoffice-Tage mit +1/−1 oder direkt eintragen, Entfernung (einfach) eintragen → „Tage speichern“ | Zähler zeigt die Tage und „Arbeitstage × Entfernung“ in km (z. B. 180 × 23,5 = 4.230 km). Blatt **Arbeitstage** eine Zeile für Maik |
| 10 | Maik, Handy | Fahrt eintragen: Dienstreise, Ziel, 23 km, Haken „Hin und zurück“ | Fahrtenbuch zeigt 46 km, Zähler „Fahrtenbuch Dienstreise 46 km“. Blatt **Fahrten** eine Zeile |
| 11 | Anna, Handy | „Fahrten“ → Person Anna | Eigene Zähler, Maiks Fahrten erscheinen nicht |
| 12 | Maik, Handy | Erfassen: Modul **§ 35a**, Zahlungsart **bar** | Gelbe Warnung „Barzahlung …“ (Speichern bleibt möglich) |
| 13 | Maik, Handy | § 35a: Betrag `1.000,00`, Arbeitskosten `600,00`, Material `300,00` | Rote Meldung „Arbeitskosten + Material = 900,00 € statt Betrag 1000,00 €“. Material auf `400,00` → Meldung weg |
| 14 | Maik, Handy | Erfassen: Modul **Anlage KAP**, Kategorie Jahressteuerbescheinigung | Speichern geht, PDF in `KAP_Kapitalertraege/Jahressteuerbescheinigung/` |
| 15 | Maik | „Info“-Seite | Neue Module agB und KAP mit Zeilen „prüfen“ |

Hinweise:
- Beim Bearbeiten lässt sich das **Steuerjahr nicht ändern** (anderer Belegindex). Falls nötig: neu erfassen.
- Eine PDF, die Anna hochgeladen hat, kann Google eventuell nur von Anna verschieben lassen. Dann erscheint eine Meldung und es wird nichts geändert.
- Die Zähler zählen nur. Pauschalen (Entfernungspauschale, Homeoffice-Pauschale) werden **nicht** mit den Tagen multipliziert, die Sätze stehen nur zur Info in der Konfiguration (Status „prüfen“).
- agB: keine Berechnung der zumutbaren Belastung.
