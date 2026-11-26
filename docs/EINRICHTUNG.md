# Einrichtung Schritt für Schritt (Windows)

Diese Anleitung machst du **einmal**. Dauer etwa 45 Minuten. Die Bezeichnungen in der
Google-Cloud-Konsole ändert Google gelegentlich; wenn ein Menüpunkt anders heißt, such nach
dem fett gedruckten Begriff.

---

## A. Programme installieren

1. **Node.js** (Version 22 LTS): <https://nodejs.org> → „LTS“ herunterladen → installieren, alle Vorgaben lassen.
2. **Git für Windows**: <https://git-scm.com/download/win> → installieren, alle Vorgaben lassen.
3. Optional **Visual Studio Code**: <https://code.visualstudio.com> (zum Ansehen der Dateien).
4. Prüfen: Windows-Taste → „PowerShell“ öffnen und eingeben:
   ```
   node -v
   git --version
   ```
   Es müssen zwei Versionsnummern erscheinen (z. B. `v22.…`).

## B. Projekt auf den PC holen

In PowerShell:
```
cd $HOME\Documents
git clone https://github.com/maikweeting-tech/Steuerbeleg.git
cd Steuerbeleg
npm install
```
`npm install` lädt die Bibliotheken (dauert 1 bis 2 Minuten, Warnungen sind normal).

> **Windows-Hinweis:** Meldet PowerShell „Ausführung von Skripts ist deaktiviert“, immer `npm.cmd`
> statt `npm` schreiben (z. B. `npm.cmd install`, `npm.cmd run dev`). Jedes neue PowerShell-Fenster
> startet in `C:\Users\<Name>` – vorher immer `cd $HOME\Documents\Steuerbeleg`.
> `npm audit fix --force` bitte nicht ausführen.

## C. Google-Cloud-Konsole

Mit **deinem** Google-Konto (Maik) unter <https://console.cloud.google.com>:

1. **Projekt erstellen**: oben links Projektauswahl → „Neues Projekt“ → Name `Steuerbeleg` → Erstellen. Danach das Projekt oben auswählen.
2. **APIs aktivieren**: Menü → „APIs und Dienste“ → **Bibliothek**. Nacheinander suchen und „Aktivieren“:
   - **Google Drive API**
   - **Google Sheets API**
   - (ab Meilenstein 6 zusätzlich **Google Calendar API**)
3. **Anmeldebildschirm** (heißt „Google Auth Platform“ oder „OAuth-Zustimmungsbildschirm“):
   - „Jetzt starten“ → App-Name `Steuerbeleg`, Support-E-Mail = deine Adresse.
   - Zielgruppe: **Extern**.
   - Kontakt-E-Mail eintragen → Fertigstellen.
   - Bereich **Zielgruppe** → **Testnutzer** → „Nutzer hinzufügen“ → deine und Annas Gmail-Adresse.
     Die App bleibt im Status „Test“. Das ist gewollt: keine Prüfung durch Google nötig.
   - Bereich **Datenzugriff**: nichts nötig. Die App fordert beim Anmelden vollen Drive-Zugriff
     (`.../auth/drive`) an; sie arbeitet aber nur im Ordner „Steuer“. Grund: Mit dem knappen
     Zugriff `drive.file` sieht die Partnerin die Unterordner nicht (getestet 26.11.2026).
4. **OAuth-Client**: Bereich **Clients** → „Client erstellen“
   - Anwendungstyp: **Webanwendung**, Name `Steuerbeleg Web`
   - **Autorisierte JavaScript-Ursprünge** (ohne Pfad, ohne Schrägstrich am Ende):
     - `http://localhost:5173`
     - `https://maikweeting-tech.github.io`
   - **Autorisierte Weiterleitungs-URIs** (genau so, **mit** Schrägstrich am Ende):
     - `http://localhost:5173/Steuerbeleg/`
     - `https://maikweeting-tech.github.io/Steuerbeleg/`
   - Erstellen bzw. Speichern. Änderungen wirken bei Google nach 5 Minuten bis einigen Stunden.
   - Grund: Die App meldet per **Weiterleitung** an (kein Pop-up). Fehlt eine Adresse, zeigt Google
     „Fehler 400: redirect_uri_mismatch“.
   - Die **Client-ID** (endet auf `.apps.googleusercontent.com`) kopieren.
> Die Client-ID ist nicht geheim: Sie steht ohnehin im ausgelieferten Programm.
> API-Schlüssel und Picker API werden nicht mehr benötigt (falls schon angelegt: löschen oder lassen).

## D. Lokale Datei `.env`

Im Ordner `Steuerbeleg` die Datei `.env.example` kopieren und die Kopie `.env` nennen.
Die Client-ID aus Abschnitt C eintragen:
```
VITE_GOOGLE_CLIENT_ID=…apps.googleusercontent.com
```
Die Datei `.env` wird nicht zu GitHub hochgeladen (steht in `.gitignore`).

## E. App lokal starten

```
npm run dev
```
Browser: <http://localhost:5173/Steuerbeleg/>. Beenden in PowerShell mit `Strg + C`.

Beim Anmelden den **Haken bei Google Drive** setzen, sonst kann die App nichts anlegen.
Beim ersten Anmelden zeigt Google „Diese App wurde nicht von Google überprüft“ →
„Erweitert“ → „Weiter zu Steuerbeleg“. Das ist im Test-Status normal.

## F. GitHub Pages einrichten

Auf <https://github.com/maikweeting-tech/Steuerbeleg>:

1. **Settings → Pages** → „Build and deployment“ → Source: **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Reiter „Variables“** → „New repository variable“:
   - Name `GOOGLE_CLIENT_ID`, Wert = Client-ID
3. Nach jedem Übernehmen in `main` baut GitHub die App automatisch (Reiter **Actions**, grüner Haken).
   Adresse: <https://maikweeting-tech.github.io/Steuerbeleg/>

## G. App auf dem Handy installieren (Android)

Adresse aus F.3 in **Chrome** öffnen → Menü ⋮ → **„App installieren“** bzw. „Zum Startbildschirm hinzufügen“.
