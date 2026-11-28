# Test – Dokumentenablage (Verträge)

Nach dem Merge ca. 2 Minuten warten, App ganz schließen und neu öffnen. Nur angemeldet und mit Netz.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik | Menü **Dokumente** öffnen | Seite „Dokumente“; in Drive entsteht `Steuer/Dokumente` mit der Liste `00_Dokumente` |
| 2 | Maik | Datei wählen (PDF oder Foto), Titel, Art „Mietvertrag“, „Gehört zu“ = ein Mietobjekt, „Gültig ab“ setzen → Speichern | Dokument erscheint unter dem Objekt; in Drive `Steuer/Dokumente/Objekte/<Objekt>/Mietvertrag_<Titel>.pdf`; in `00_Dokumente` eine Zeile |
| 3 | Maik | Auf den Titel tippen | Datei öffnet sich in Drive |
| 4 | Maik | Weiteres Dokument „Gehört zu“ = Auslandsobjekt, z. B. Kaufvertrag | Ablage unter `Steuer/Dokumente/Ausland` |
| 5 | Maik | **Objekte** → Objekt öffnen | Karte „Verträge und Dokumente“ mit dem Mietvertrag; „Dokument hinzufügen“ öffnet Dokumente mit vorgewähltem Objekt |
| 6 | Maik | **Export** → Ausfüllhilfe erstellen | Abschnitt „Verträge und Dokumente <Jahr>“ mit allen im Jahr gültigen Dokumenten; Beginn im Jahr = „NEU <Jahr>“ |
| 7 | Anna | Dokumente öffnen | Sieht dieselben Dokumente |
| 8 | Maik | Ein Test-Dokument „Löschen“ → „Wirklich löschen“ | Eintrag weg, Datei im Drive-Papierkorb (30 Tage wiederherstellbar) |

Hinweise / Annahmen:
- Die Ablage ist unabhängig vom Steuerjahr. „Gültig ab/bis“ steuert, in welchem Jahr ein Dokument in der Ausfüllhilfe steht (leer = immer).
- Mehrseitige Verträge am besten als ein PDF hochladen (z. B. vorher mit dem Handy-Scanner).
