# Steuerbeleg

PWA zum Sammeln und Ordnen von Belegen für die Einkommensteuererklärung (Zusammenveranlagung).
Belege und Daten liegen ausschließlich im eigenen Google Drive; dieses Repository enthält nur
den Quellcode und die Konfiguration mit ungeprüften Platzhalterwerten.

> Die App ersetzt keine Steuerberatung. Sie berechnet keine Steuer und übermittelt nichts an ELSTER.

- Einrichtung: [docs/EINRICHTUNG.md](docs/EINRICHTUNG.md)
- Konfiguration je Steuerjahr: [config/steuerjahr_2026.json](config/steuerjahr_2026.json)

| Befehl | Zweck |
|---|---|
| `npm run dev` | lokal starten (<http://localhost:5173/Steuerbeleg/>) |
| `npm test` | automatische Tests |
| `npm run build` | Version für GitHub Pages bauen |
