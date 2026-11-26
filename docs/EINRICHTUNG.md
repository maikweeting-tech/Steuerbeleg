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

## C. Google-Cloud-Konsole

Mit **deinem** Google-Konto (Maik) unter <https://console.cloud.google.com>:

1. **Projekt erstellen**: oben links Projektauswahl → „Neues Projekt“ → Name `Steuerbeleg` → Erstellen. Danach das Projekt oben auswählen.
2. **APIs aktivieren**: Menü → „APIs und Dienste“ → **Bibliothek**. Nacheinander suchen und „Aktivieren“:
   - **Google Drive API**
   - **Google Sheets API**
   - **Google Picker API**
   - (ab Meilenstein 6 zusätzlich **Google Calendar API**)
3. **Anmeldebildschirm** (heißt „Google Auth Platform“ oder „OAuth-Zustimmungsbildschirm“):
   - „Jetzt starten“ → App-Name `Steuerbeleg`, Support-E-Mail = deine Adresse.
   - Zielgruppe: **Extern**.
   - Kontakt-E-Mail eintragen → Fertigstellen.
   - Bereich **Zielgruppe** → **Testnutzer** → „Nutzer hinzufügen“ → deine und Annas Gmail-Adresse.
     Die App bleibt im Status „Test“. Das ist gewollt: keine Prüfung durch Google nötig.
   - Bereich **Datenzugriff** → „Bereiche hinzufügen“ → `.../auth/drive.file`, `openid`, `email`, `profile` → Speichern.
4. **OAuth-Client**: Bereich **Clients** → „Client erstellen“
   - Anwendungstyp: **Webanwendung**, Name `Steuerbeleg Web`
   - **Autorisierte JavaScript-Ursprünge** (ohne Pfad, ohne Schrägstrich am Ende):
     - `http://localhost:5173`
     - `https://maikweeting-tech.github.io`
   - Weiterleitungs-URIs: leer lassen → Erstellen.
   - Die **Client-ID** (endet auf `.apps.googleusercontent.com`) kopieren.
5. **API-Schlüssel** (nur für die Dateiauswahl): „APIs und Dienste“ → **Anmeldedaten** → „Anmeldedaten erstellen“ → **API-Schlüssel**.
   - Schlüssel bearbeiten → Anwendungseinschränkung **Websites**:
     `http://localhost:5173/*` und `https://maikweeting-tech.github.io/*`
   - API-Einschränkung: nur **Google Picker API** → Speichern.
   - Schlüssel kopieren.
6. **Projektnummer**: Zahnrad/„Projekteinstellungen“ oder Dashboard → **Projektnummer** (nur Ziffern) kopieren.

> Client-ID, API-Schlüssel und Projektnummer sind nicht geheim: Sie stehen ohnehin im
> ausgelieferten Programm. Der API-Schlüssel ist durch die Einschränkungen oben nur von
> euren Adressen aus nutzbar.

## D. Lokale Datei `.env`

Im Ordner `Steuerbeleg` die Datei `.env.example` kopieren und die Kopie `.env` nennen.
Die drei Werte aus Abschnitt C eintragen:
```
VITE_GOOGLE_CLIENT_ID=…apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIza…
VITE_GOOGLE_APP_ID=123456789012
```
Die Datei `.env` wird nicht zu GitHub hochgeladen (steht in `.gitignore`).

## E. App lokal starten

```
npm run dev
```
Browser: <http://localhost:5173/Steuerbeleg/>. Beenden in PowerShell mit `Strg + C`.

Beim ersten Anmelden zeigt Google „Diese App wurde nicht von Google überprüft“ →
„Erweitert“ → „Weiter zu Steuerbeleg“. Das ist im Test-Status normal.

## F. GitHub Pages einrichten

Auf <https://github.com/maikweeting-tech/Steuerbeleg>:

1. **Settings → Pages** → „Build and deployment“ → Source: **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Reiter „Variables“** → „New repository variable“, dreimal:
   - `GOOGLE_CLIENT_ID` = Client-ID
   - `GOOGLE_API_KEY` = API-Schlüssel
   - `GOOGLE_APP_ID` = Projektnummer
3. Nach jedem Übernehmen in `main` baut GitHub die App automatisch (Reiter **Actions**, grüner Haken).
   Adresse: <https://maikweeting-tech.github.io/Steuerbeleg/>

## G. App auf dem Handy installieren (Android)

Adresse aus F.3 in **Chrome** öffnen → Menü ⋮ → **„App installieren“** bzw. „Zum Startbildschirm hinzufügen“.
