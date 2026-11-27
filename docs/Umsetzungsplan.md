# Steuerbeleg-App – Umsetzungsplan (Entwurf zur Freigabe)

Stand: 27.11.2026 (Ergänzungen E1–E13) · Repository: `maikweeting-tech/Steuerbeleg` · Adresse später: `https://maikweeting-tech.github.io/Steuerbeleg/`

> Die App ersetzt keine Steuerberatung. Sie berechnet keine Steuer und übermittelt nichts an ELSTER.

---

## 1. Getroffene Annahmen (bitte prüfen)

| Nr. | Annahme | Begründung |
|---|---|---|
| A1 | Annas Konto ist ein privates @gmail.com-Konto (kein Workspace). | Antwort „beide“ war nicht eindeutig. Bei Workspace ändert sich nur die Einrichtung, nicht die App. |
| A2 | Ordner `Steuer/` liegt in Maiks Drive und wird für Anna freigegeben. | Einer muss Eigentümer sein; der Speicherplatz zählt bei Maik. |
| A3 | Sheet heißt `00_Belegindex_2026`. | So steht es in der Ordnerstruktur. |
| A4 | Kein KI-Modul in Version 1, nur Tesseract. | Tesseract erkennt Text direkt im Browser, nichts verlässt das Gerät. Ein KI-Modul lässt sich später ergänzen. |
| A5 | Erinnerung = monatlicher Serientermin im Google-Kalender (entschieden 26.11.2026). | Echte Push-Nachrichten bräuchten einen Server. |
| A6 | Steuerjahr wird aus dem **Zahlungsdatum** abgeleitet und ist pro Beleg manuell überschreibbar. | Ausnahme regelmäßig wiederkehrender Zahlungen um den Jahreswechsel (10-Tage-Regel, § 11 EStG) rechnet die App **nicht** automatisch; du entscheidest im Einzelfall. Fachlich prüfen. |
| A7 | Beträge werden intern in Cent (Ganzzahl) gespeichert. | Vermeidet Rundungsfehler bei Summen und Aufteilungen. |
| A8 | Persönliche Daten (Adressen, Kindernamen, Belege) liegen **nur** in Drive/Sheet, nie im Repository. | Wichtig, falls das Repo öffentlich ist. |

---

## 2. Öffentliches oder privates Repository?

- **GitHub Free:** GitHub Pages geht nur aus einem **öffentlichen** Repository. Für ein privates Repo mit Pages brauchst du GitHub Pro (Preis prüfen, zuletzt ca. 4 $/Monat).
- **Was ist bei öffentlichem Repo sichtbar?** Nur der Quellcode und die Konfigurationsdatei mit Kategorien und Platzhalterwerten. Das ist unkritisch.
- **Was ist nicht sichtbar?** Belege, Beträge, Objekte, Kinder, Fahrten. Diese liegen ausschließlich in eurem Google Drive. Die App-Seite selbst ist zwar für jeden aufrufbar, zeigt aber ohne Google-Anmeldung und Freigabe des Ordners nichts an.
- Die OAuth-Client-ID darf öffentlich sein. Geheime Schlüssel gibt es im Code nicht.

**Empfehlung:** öffentliches Repo mit GitHub Free.

---

## 3. Architektur

```
Handy / PC (Browser, installierte PWA)
 ├─ React + TypeScript + Vite
 ├─ Service Worker (vite-plugin-pwa): Offline, Teilen-Ziel (Android)
 ├─ IndexedDB (Dexie): lokale Kopie + Warteschlange für Offline-Erfassung
 ├─ Tesseract.js (deu): Texterkennung lokal, pdf.js für Text aus PDFs
 ├─ ExcelJS: Excel-Export mit Formeln und Formatierung
 └─ pdf-lib: Checkliste und Belegmappe als PDF
        │  Google Identity Services (Anmeldung, Zugriffstoken ca. 1 h, still erneuert)
        ▼
Google Drive (Belegdateien)  ·  Google Sheets (Belegindex)  ·  Google Kalender (Erinnerung)
```

- **Kein eigener Server.** GitHub Pages liefert nur die statischen Dateien aus.
- **Routing mit HashRouter** (`…/Steuerbeleg/#/belege`), weil GitHub Pages bei Unterseiten sonst „404“ meldet.
- **Synchronisierung:** Erfasste Belege landen zuerst in IndexedDB. Bei Netz werden Datei → Drive und Zeile → Sheet übertragen. Jede Zeile hat eine `version`; ändern beide gleichzeitig, gewinnt die spätere Änderung, und die ältere steht im Protokoll.

### Google-Berechtigungen (Scopes)

| Scope | Wofür | Hinweis |
|---|---|---|
| `drive.file` | Dateien und Sheet, die die App angelegt oder über die Google-Dateiauswahl geöffnet hat | Minimal. **Risiko:** Anna muss den freigegebenen Ordner einmal über die Dateiauswahl öffnen. Ob sie damit auch Maiks neu angelegte Dateien sieht, teste ich in M1. Falls nein, Ausweichlösung `drive` (weiter gefasst), nur nach Rückfrage. |
| `calendar.events` | Monatlicher Erinnerungstermin | Nur wenn du ihn in den Einstellungen anlegst. |
| `openid email profile` | Name im Änderungsprotokoll | |

Die App bleibt im Google-Modus „Test“ mit euch beiden als Testnutzer. Dann ist keine Prüfung durch Google nötig, ihr seht beim Anmelden nur einen Hinweis „App nicht verifiziert“.

---

## 4. Datenmodell (Tabellenblätter im Belegindex)

**Belege** (eine Zeile je Beleg)

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| id | Text (UUID) | ja | |
| belegnr | Zahl | ja | laufend je Steuerjahr |
| steuerjahr | Zahl | ja | aus Zahlungsdatum, überschreibbar (A6) |
| belegdatum | Datum | ja | |
| zahlungsdatum | Datum | ja | |
| betrag_brutto_ct | Zahl (Cent) | ja | Anzeige in € mit Komma |
| aussteller | Text | ja | |
| person | Maik / Anna / gemeinsam | ja | |
| modul | V / AUS / KIND / N / SA / 35A / SONST (später EUER) | ja | |
| kategorie | Schlüssel aus Konfiguration | ja | |
| objekt_id, einheit_id, kind_id | Text | je nach Modul | |
| zahlungsart | unbar / bar | bei § 35a | bar → Warnhinweis |
| arbeitskosten_ct, material_ct | Zahl | bei § 35a | Summe = Brutto wird geprüft |
| netto_ct, ust_ct, ust_satz, vorsteuer | Zahl | nein | reserviert für EÜR |
| status | offen / geprüft / unvollständig | ja | |
| notiz | Text | nein | auch per Spracheingabe |
| datei_ids, dateiname | Text | ja | Link zur Drive-Datei |
| erfasst_von/am, geaendert_von/am, version | | ja | |

**Aufteilung** – beleg_id, objekt_id, einheit_id, anteil_prozent (Summe je Beleg = 100 %)
**Objekte** – id, typ (V/AUS), bezeichnung, adresse, anschaffungsdatum, anschaffungskosten, afa_satz (nur Info)
**Einheiten** – id, objekt_id, bezeichnung
**Kinder** – id, name, geburtsdatum
**Fahrten** – id, person, datum, start, ziel, km, zweck (Arbeitsweg/Dienstreise/Fortbildung), fahrzeug
**Arbeitstage** – person, jahr, entfernung_km, arbeitstage, homeoffice_tage
**Einnahmen** (E4) – id, objekt_id, einheit_id, monat, art (Miete/Nebenkosten/Sonstiges), betrag_ct, notiz
**Vorlagen** (E6) – id, bezeichnung, aussteller, betrag_ct, rhythmus (monatlich/vierteljährlich/jährlich), modul, kategorie, person, objekt_id, dauerbeleg_datei_id, aktiv
**Protokoll** – zeit, nutzer, aktion, beleg_id, feld, alt, neu
**Zuordnungen** – aussteller → zuletzt verwendete Kategorie/Objekt (für Vorschläge)

### Konfiguration `config/steuerjahr_2026.json` (im Repo)

```json
{
  "steuerjahr": 2026,
  "module": { "V": { "bezeichnung": "Anlage V", "ordner": "V_Vermietung",
    "kategorien": [ { "schluessel": "grundsteuer", "name": "Grundsteuer",
      "art": "werbungskosten", "elster_zeile": { "wert": null, "status": "prüfen" },
      "soll": { "je": "objekt", "anzahl": 1 } } ] } },
  "werte": {
    "entfernungspauschale_bis_20km": { "wert": null, "einheit": "€/km", "quelle": "", "status": "prüfen" }
  }
}
```

Alle Pauschalen, Höchstbeträge und ELSTER-Zeilen nur als Platzhalter (`null`) mit `status: "prüfen"`. Neues Jahr = Datei kopieren.

---

## 5. Ordnerstruktur im Repository

```
Steuerbeleg/
  config/steuerjahr_2026.json
  public/            Icons, Manifest-Grafiken
  src/
    google/          Anmeldung, Drive, Sheets, Kalender
    daten/           Datenmodell, IndexedDB, Synchronisierung
    fachlich/        Steuerjahr, Aufteilung, Summen, Duplikate, Soll-Liste
    erfassung/       Kamera, Zuschneiden, PDF, Texterkennung
    export/          Excel, Checkliste-PDF, Belegmappe
    seiten/          Oberflächen (Belege, Objekte, Fahrten, Einstellungen …)
  tests/             Vitest-Tests + Testdatensatz (30 fiktive Belege)
  .github/workflows/deploy.yml
  .env.example       (OAuth-Client-ID), .env in .gitignore
  ANLEITUNG.md       Kurzanleitung Maik/Anna
```

---

## 6. Meilensteine (angepasst)

Änderung gegenüber deinem Vorschlag: Die Bereitstellung auf GitHub Pages ziehe ich in **M1** vor, weil du die App am Handy nur über eine https-Adresse testen kannst. Tests schreibe ich in jedem Meilenstein mit, nicht erst in M8.

| M | Inhalt | Du testest |
|---|---|---|
| 1 | Setup-Anleitung, Grundgerüst PWA, Anmeldung, Ordneranlage in Drive, Actions-Workflow | ✓ weitgehend erledigt, offen: Handy-Installation, Annas Doppelordner |
| 2 | Beleg erfassen (Foto mehrseitig, Zuschneiden, Kontrast, PDF, Teilen-Menü), Pflichtfelder, Dateiname, Belegindex, **Offline-Erfassung (E2)**, **Duplikat-Warnung (E1)** | Beleg fotografieren → Drive → Zeile im Sheet; Flugmodus → später hochgeladen; gleichen Beleg zweimal → Warnung |
| 3 | Anlage V + Kamperland, Objekte/Einheiten, Aufteilung in %, **V+V je Objekt: Einnahmen gegen Kosten, AfA-Grunddaten (E4)**, **umlagefähige Kosten je Einheit (E9)** | Beleg auf zwei Objekte aufteilen; Objektübersicht Einnahmen/Kosten nachrechnen |
| 4 | Anlage N mit Fahrtenbuch, **Pauschalen-Zähler Homeoffice-Tage/Arbeitstage/km (E3)**, Kind, Sonderausgaben, § 35a, **Module agB und KAP (E8)** | Fahrten und Tage erfassen, Zähler stimmen; § 35a bar → Warnung |
| 5 | Texterkennung, Vorschläge nach Aussteller, **§ 35a Lohnanteil-Vorschlag (E13)** | Datum/Betrag/Aussteller werden vorgeschlagen |
| 6 | Vollständigkeits-Check, Kalender-Erinnerung, **wiederkehrende Belege (E6)**, **Kontoauszug-Abgleich (E7)**, **Fragen-Markierung (E10)**, Suche/Filter | Fehlende Belege rot, Termin im Kalender, Vorlage monatlich bestätigen |
| 7 | Exporte: Checkliste PDF, Excel (SUMMEWENNS, Blätter Annahmen/Prüfung), Belegmappe, **Jahresübergabe als ZIP mit PDF-Übersicht (E5)**, **NK-Vorlage (E9)**, **Fragenliste (E10)**, **Jahresvergleich (E11)** | Summen stichprobenartig nachrechnen, ZIP öffnen |
| 8 | Testdatensatz, Abnahmetest, Kurzanleitung, **Bescheid-Abgleich (E12)** | Abnahme: Handyfoto → Drive → Index → Excel-Summe |

Hinweis Excel: Formeln werden in der Datei englisch gespeichert (`SUMIFS`). Ein deutsches Excel zeigt sie automatisch als `SUMMEWENNS` an. Die Tests prüfen, dass die Formeln vorhanden sind, und rechnen die Ergebnisse unabhängig nach.

---

## 7. Ergänzungen vom 27.11.2026 (bitte prüfen)

| Nr. | Ergänzung | Meilenstein | Annahme / Abgrenzung |
|---|---|---|---|
| E1 | Duplikat-Warnung | M2 (vorher M6) | Treffer = gleiches Belegdatum **und** gleicher Betrag; zusätzlich ähnlicher Aussteller erhöht die Trefferstufe. Nur Warnung, Speichern bleibt möglich. |
| E2 | Offline-Erfassung am Handy | M2 (war schon geplant) | Fotos + Angaben in IndexedDB, Upload bei Netz. Hinweis „x Belege warten“. |
| E3 | Pauschalen-Zähler | M4 | Die App **zählt** nur (Homeoffice-Tage, Arbeitstage, km je Person). Sätze stehen in `config/steuerjahr_2026.json` als Platzhalter mit Status „prüfen“ und werden nur angezeigt, **nicht** mit den Zählern multipliziert (keine Steuerberechnung). |
| E4 | V+V je Objekt | M3 | Neues Blatt **Einnahmen** (Miete monatlich je Objekt/Einheit). Übersicht je Objekt: Summe Einnahmen, Summe Kosten. AfA nur Grunddaten (Kaufpreis, Anschaffungsdatum, Baujahr, Gebäudeanteil, AfA-Satz als Info „prüfen“), **keine AfA-Berechnung**. |
| E5 | Jahresübergabe als ZIP | M7 | ZIP wird im Browser erzeugt: alle Belegdateien nach Modul geordnet, PDF-Übersicht, Excel. Speicherort: Ordner `Export` in Drive und Download. Bei sehr vielen Fotos (> ca. 300 MB) kann es am Handy langsam werden, dann am PC erzeugen. |
| E6 | Wiederkehrende Belege | M6 | Neues Blatt **Vorlagen**. Die App zeigt fällige Vorlagen, du bestätigst mit einem Tipp → Zeile im Belegindex mit Verweis auf einen Dauerbeleg (z. B. Versicherungsschein, Kita-Bescheid), Betrag änderbar. |
| E7 | Kontoauszug-Abgleich (CSV) | M6 | CSV aus dem Online-Banking wird im Browser gelesen. Treffer = gleicher Betrag und Datum ± 5 Tage. Ergebnis: Liste „Zahlung ohne Beleg“. **Offen:** Bank und CSV-Format (Beispieldatei mit geschwärzten Daten nötig). Die CSV wird nicht dauerhaft gespeichert, nur markierte Buchungen im Blatt **Buchungen**. |
| E8 | Module agB und KAP | M4 | Zusätzliche Module in der Konfigurationsdatei: Außergewöhnliche Belastungen (Krankheit, Pflege) und Anlage KAP (Jahressteuerbescheinigungen). Kategorien und Zeilen als Platzhalter „prüfen“. Keine Berechnung der zumutbaren Belastung. |
| E9 | Umlagefähige Kosten je Einheit | M3, Export M7 | Kategorie bzw. Beleg als „umlagefähig“ markieren, Verteilschlüssel je Objekt (Wohnfläche, Personen, Einheiten oder fest in %) legst du selbst fest. Ergebnis ist eine Excel-Vorlage, **keine** rechtssichere Nebenkostenabrechnung. |
| E10 | Fragen an den Steuerberater | M6, Export M7 | Neue Spalte `frage` am Ende des Blatts Belege (bestehende Zeilen bleiben gültig). Export als PDF/Excel mit Link zum Beleg. |
| E11 | Jahresvergleich | M7 | Summen je Modul/Kategorie gegenüber dem Vorjahres-Belegindex. Sinnvoll ab Steuerjahr 2027. |
| E12 | Bescheid-Abgleich | M8 | Neues Blatt **Bescheid**: Posten laut Erklärung, laut Bescheid, Abweichung, Notiz. Nur Erfassung, keine Bewertung. Einspruchsfrist trägst du selbst ein (Wert „prüfen“). |
| E13 | § 35a Lohnanteil-Vorschlag | M5 | Texterkennung sucht Begriffe wie „Lohn“, „Arbeitskosten“, „Material“ und schlägt Beträge vor; du bestätigst. Summe Arbeit + Material = Brutto wird geprüft. |

## 8. Noch offen

1. Ergänzungen E7–E13 und ihre Zuordnung so in Ordnung? (E1–E6 freigegeben 27.11.2026)
3. Für E7: Welche Bank? Beispiel-CSV (Namen/IBAN geschwärzt) wird in M6 gebraucht.
2. Abschluss M1: Handy-Installation (Test 9), Annas Doppelordner löschen.
