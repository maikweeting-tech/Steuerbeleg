# Test: AfA-Hilfsrechnung

Nach dem Merge App ganz schließen und neu öffnen. Jahr oben wählen (z. B. 2025).

1. **Objekte** → Objekt öffnen → Karte **AfA-Hilfsrechnung**.
2. Vorbelegt aus den Grunddaten: Übergang (= Anschaffungsdatum), Fertigstellungsjahr (= Baujahr), Grundanteil (= 100 % − Gebäudeanteil). Bitte prüfen und korrigieren.
3. Eingeben: Kaufpreis, Grunderwerbsteuer, Notar, Grundbuch, Makler, ggf. Sonstige; Grundanteil in % **oder** Bodenrichtwert + Fläche; selbst genutzt %, Renovierung der ersten 3 Jahre (netto), AfA laut bisherigem Bescheid.
4. Erwartet: Rechenweg Kaufpreis → Anschaffungskosten → minus Boden → Gebäude → Bemessungsgrundlage, Satz, voller Jahresbetrag, AfA des gewählten Jahres. Darunter Hinweise und die Jahrestabelle.
5. **Angaben speichern** → im Belegindex Blatt „AfA“ steht eine Zeile zum Objekt.
6. **Excel mit Formeln** → Datei `AfA_<Objekt>.xlsx`. Gelbe Zellen = Eingaben, alles andere Formeln. Eine Eingabe ändern: Ergebnisse rechnen neu. Blatt „Annahmen“ lesen.
7. **Export** → Ausfüllhilfe: Abschnitt „AfA-Hilfsrechnung … (Vorschlag, bitte prüfen)“ mit Objekt, Bemessungsgrundlage, Satz und AfA des Jahres.

## Gegenrechnung von Hand (Beispiel aus dem Test, erfundene Zahlen)
| Schritt | Wert |
|---|---|
| Kaufpreis | 250.000,00 € |
| Nebenkosten 16.250 + 3.000 + 1.200 + 8.925 | 29.375,00 € |
| Anschaffungskosten | 279.375,00 € |
| Grund und Boden 20 % | 55.875,00 € |
| Bemessungsgrundlage | 223.500,00 € |
| Satz (Fertigstellung 1975) | 2 % |
| Jahresbetrag | 4.470,00 € |
| Kaufjahr ab 15.07. (6 Monate) | 2.235,00 € |

## Annahmen (prüfen)
- Lineare AfA für Wohngebäude im Privatvermögen, § 7 Abs. 4 Satz 1 Nr. 2 EStG i. d. F. JStG 2022: vor 1925 2,5 %, 1925–2022 2 %, ab 2023 3 %.
- Erstes Jahr monatsgenau, Monat des Übergangs zählt mit (§ 7 Abs. 1 Satz 4 EStG, prüfen).
- Kaufnebenkosten werden anteilig auf Boden und Gebäude verteilt (gleicher Prozentsatz).
- Bodenrichtwert-Weg = vereinfachte Restwertmethode; die Finanzverwaltung nutzt i. d. R. die BMF-Arbeitshilfe zur Kaufpreisaufteilung.
- Renovierung der ersten 3 Jahre über 15 % der Gebäudekosten (netto) wird als anschaffungsnahe Herstellungskosten der Basis zugerechnet (§ 6 Abs. 1 Nr. 1a EStG).
- Degressive AfA (§ 7 Abs. 5a), Sonder-AfA (§ 7b), Denkmal-AfA, Ausland: nicht gerechnet, nur Hinweis.
- Werte aus Bescheid/Steuerberatung haben Vorrang.
