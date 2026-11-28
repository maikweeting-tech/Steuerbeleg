# Test: Erinnerungen aufs Handy

## So funktioniert es (und die Grenzen)

- **Kein Server-Push:** Die App hat keinen eigenen Server, daher kein echtes Web-Push. Die Erinnerungen sind **lokale Benachrichtigungen**, die die App selbst erzeugt.
- **Geprüft wird beim Öffnen der App** (immer) und, wenn möglich, **im Hintergrund** (Periodic Background Sync).
- **Hintergrund-Prüfung nur in Chrome auf Android und nur mit installierter App** („Zum Startbildschirm hinzufügen“). Wie oft geprüft wird, entscheidet Chrome selbst. Das ist höchstens etwa einmal am Tag und bei seltener Nutzung der App seltener. Energiesparmodus oder Akku-Optimierung können die Prüfung ganz aussetzen.
- **Grundlage sind die zuletzt geladenen Daten auf dem Handy.** Was auf dem anderen Handy erfasst wurde, zählt erst, wenn die App einmal mit Netz geöffnet wurde.
- **Jede Erinnerung kommt nur einmal.** Bei der Einspruchsfrist gibt es Stufen: 14, 7, 3 und 1 Tag vorher sowie am letzten Tag.
- **Feste Termine:** Für feste Termine wie die Einspruchsfrist zusätzlich den Kalender-Eintrag auf „Check“ nutzen, denn der ist zuverlässiger.

## Schritte

1. **App installieren:** App in Chrome (Android) öffnen, dann Menü → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“. Danach die App vom Startbildschirm starten.
2. **Einschalten:** Auf „Check“ die Karte **Erinnerungen aufs Handy** öffnen und „Erinnerungen einschalten“ tippen. Die Benachrichtigungen erlauben.
   - Erwartet: „Benachrichtigungen: erlaubt“.
   - „Hintergrund-Prüfung“ steht auf „aktiv“, oder auf „nicht verfügbar“, wenn Chrome sie nicht anbietet.
3. **Test-Erinnerung:** „Test-Erinnerung“ tippen.
   - Erwartet: Die Benachrichtigung „Steuerbeleg: Test-Erinnerung“ erscheint.
   - Antippen öffnet die App auf „Check“.
4. **Fehlender Monatsbeleg:** Eine monatliche Vorlage anlegen (Seite Vorlagen), für die der Beleg des Vormonats fehlt.
   - App schließen und neu öffnen.
   - Erwartet: „<Vorlage>: Beleg für <Monat> fehlt“, gegebenenfalls mit „(insgesamt N Zeiträume offen)“.
   - Beim erneuten Öffnen kommt dieselbe Erinnerung nicht noch einmal.
5. **Einspruchsfrist:** Auf „Bescheid“ eine Einspruchsfrist eintragen, die in 7 Tagen oder weniger endet.
   - App neu öffnen.
   - Erwartet: „Einspruchsfrist Bescheid <Jahr> endet in N Tagen“.
   - Antippen öffnet „Bescheid“.
   - Das Datum dort gegen den Bescheid prüfen.
6. **Liste:** Unter „Aktuelle Erinnerungen“ stehen alle derzeit fälligen Einträge, auch bereits gezeigte.
7. **Hintergrund (optional, dauert):** App einen Tag lang nicht öffnen. Prüfen, ob eine neue Erinnerung von selbst kommt.
   - Wenn nicht, ist die Hintergrund-Prüfung durch Chrome bzw. Akku-Einstellungen verhindert worden.
   - Das ist kein Fehler der App.

## Bei Problemen

- **„blockiert“:** Android-Einstellungen → Apps → Steuerbeleg bzw. Chrome → Benachrichtigungen einschalten.
- **Akku-Optimierung für Chrome ausschalten:** Damit wird die Hintergrund-Prüfung wahrscheinlicher.
