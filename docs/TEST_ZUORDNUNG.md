# Test – Automatische Zuordnung beim Erfassen

Nach dem Merge ca. 2 Minuten warten, App ganz schließen und neu öffnen. Beim ersten Öffnen ergänzt die App im Belegindex das Blatt **Stichwoerter**.

| Nr. | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Maik | Beleg eines **neuen** Ausstellers fotografieren, z. B. Apotheke, Zahnarzt, Schornsteinfeger | Unter „Angaben“ erscheint „Vorschlag aus dem Belegtext (Stichwort „…“): Bereich › Kategorie“ mit „Übernehmen“ |
| 2 | Maik | „Übernehmen“ | Bereich und Kategorie sind gesetzt; der Vorschlag verschwindet |
| 3 | Maik | Beleg eines **bekannten** Ausstellers | Wie bisher: „Bei … zuletzt“ (Vorschlag aus dem letzten Beleg dieses Ausstellers), kein Stichwort-Vorschlag |
| 4 | Maik | Beleg mit der Adresse eines Mietobjekts (z. B. Grundsteuer- oder Versicherungsschreiben) | Vorschlag nennt zusätzlich das Objekt („Objekt über Adresse erkannt“); Übernehmen setzt Objekt mit |
| 5 | Maik | Seite **Check** → „Stichwörter für die Zuordnung“: eigenes Stichwort anlegen (z. B. Name einer Praxis → Außergewöhnliche Belastungen › Krankheitskosten) | Stichwort steht in der Liste; im Belegindex Blatt „Stichwoerter“ eine Zeile |
| 6 | Maik | Beleg mit diesem Namen erfassen | Vorschlag mit „eigenes“ |
| 7 | Maik | Beleg aus einem anderen Jahr (Zahlungsdatum z. B. 2025, oben ist 2024 gewählt) | Wie bisher: Hinweis „gehört ins Steuerjahr 2025 und wird im Belegindex 2025 gespeichert“ – das Jahr folgt automatisch dem Zahlungsdatum |

Hinweise / Annahmen (prüfen):
- Alles sind Vorschläge; nichts wird ohne „Übernehmen“ eingetragen.
- Die Standard-Stichwörter (Liste unter Check aufklappbar) sind allgemeine Annahmen. Ein Treffer bedeutet nicht, dass die Kosten steuerlich zählen.
- Das Objekt wird nur vorgeschlagen, wenn Straße + Hausnummer (oder eine Bezeichnung ab 6 Zeichen) genau eines aktiven Objekts im Text steht. Die Adresse muss am Objekt eingetragen sein.
- Eigene Stichwörter gelten je Belegindex (Jahr).
