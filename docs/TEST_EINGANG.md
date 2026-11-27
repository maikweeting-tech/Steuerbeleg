# Test: Eingang (PDFs aus Gmail zuordnen)

Voraussetzung: PR „Dokumentenablage“ ist gemergt (dieser PR baut darauf auf). App nach dem Merge einmal ganz schließen und neu öffnen.

## 1. Liste
1. Menü **Eingang** öffnen.
2. Erwartet: je Jahr (2024, 2025, 2026) eine Karte mit den PDFs aus `Steuer/<Jahr>/Eingang_Gmail`, Anzahl „offen“ stimmt mit Drive überein.
3. **Vorschau** tippen: die PDF erscheint in der Seite (Google-Vorschau). Nochmal tippen schließt sie.

## 2. Als Beleg erfassen
1. Bei einer Rechnung **Als Beleg erfassen** tippen.
2. Erwartet: Seite „Erfassen“ mit Vorschau der PDF, keine Knöpfe für Foto/Datei. Datum und Aussteller sind aus dem Dateinamen vorbelegt (prüfen!), Texterkennung läuft, Stichwort-Vorschlag erscheint, wenn ein Stichwort passt.
3. Angaben ergänzen, **Beleg speichern**.
4. Erwartet: zurück im Eingang mit grüner Meldung, die Datei ist aus der Liste verschwunden.
5. In Drive prüfen: die PDF liegt jetzt im passenden Belegordner des **Zahlungsjahres** (nicht zwingend des Eingangsjahres), umbenannt nach dem Muster `Datum_Bxxxx_Aussteller_Betrag.pdf`. Es gibt **kein** zweites Exemplar.
6. Im Belegindex des Zahlungsjahres: neue Zeile, im Blatt „Protokoll“ steht „erfasst (Eingang)“.

## 3. Als Dokument ablegen
1. Bei einem Vertrag (z. B. Kaufvertrag) **Als Dokument ablegen** tippen.
2. Erwartet: Seite „Dokumente“ zeigt „Datei aus dem Eingang: …“ statt der Dateiauswahl.
3. Titel, Art, „Gehört zu“ und Gültigkeit eintragen, **Dokument speichern**.
4. Erwartet: zurück im Eingang, Datei verschwunden; in Drive unter `Steuer/Dokumente/…` umbenannt; in der Liste „00_Dokumente“ eingetragen.

## 4. Andere Person (optional)
- Erfasst die zweite Person einen Beleg aus dem Eingang, wird der Beleg eingetragen und ein Auftrag im Blatt „Auftraege“ angelegt. Beim nächsten Öffnen der App des Eigentümers wird die PDF verschoben.
- „Als Dokument ablegen“ geht nur beim Eigentümer der Datei (Meldung sonst).

## Annahmen
- Dateinamen beginnen mit dem Datum (JJJJ-MM-TT, JJJJMMTT oder TT.MM.JJJJ), danach `_Absender`. Ohne Datum bleibt das Feld leer.
- Die Vorschau braucht eine Google-Anmeldung im Browser.
