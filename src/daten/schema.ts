// Tabellenblätter des Belegindex (Google Sheet "00_Belegindex_<Jahr>") mit Spaltenköpfen.
// Reihenfolge der Spalten nicht ändern, ohne eine Migration vorzusehen.

export const BLAETTER: Record<string, string[]> = {
  Belege: [
    'id', 'belegnr', 'steuerjahr', 'steuerjahr_manuell', 'belegdatum', 'zahlungsdatum',
    'betrag_brutto_ct', 'aussteller', 'person', 'modul', 'kategorie',
    'objekt_id', 'einheit_id', 'kind_id', 'zahlungsart', 'arbeitskosten_ct', 'material_ct',
    'netto_ct', 'ust_ct', 'ust_satz', 'vorsteuer', 'status', 'notiz', 'datei_ids', 'dateiname',
    'erfasst_von', 'erfasst_am', 'geaendert_von', 'geaendert_am', 'version',
    // ab M3 (nur am Ende anhängen!)
    'umlagefaehig',
  ],
  Aufteilung: ['beleg_id', 'objekt_id', 'einheit_id', 'anteil_prozent'],
  Objekte: [
    'id', 'typ', 'bezeichnung', 'adresse', 'anschaffungsdatum', 'anschaffungskosten_ct', 'afa_satz',
    // ab M3
    'baujahr', 'gebaeudeanteil_prozent', 'wohnflaeche_m2', 'umlageschluessel', 'aktiv',
  ],
  Einheiten: ['id', 'objekt_id', 'bezeichnung', 'wohnflaeche_m2', 'personen', 'fest_prozent'],
  Einnahmen: ['id', 'objekt_id', 'einheit_id', 'monat', 'art', 'betrag_ct', 'notiz'],
  Kinder: ['id', 'name', 'geburtsdatum'],
  Fahrten: ['id', 'person', 'datum', 'start', 'ziel', 'km', 'zweck', 'fahrzeug'],
  Arbeitstage: ['person', 'jahr', 'entfernung_km', 'arbeitstage', 'homeoffice_tage'],
  Protokoll: ['zeit', 'nutzer', 'aktion', 'beleg_id', 'feld', 'alt', 'neu'],
  Zuordnungen: ['aussteller', 'modul', 'kategorie', 'objekt_id', 'person', 'zuletzt'],
  // ab M4: Aufträge an den Eigentümer einer PDF (Verschieben darf bei Google meist nur der Eigentümer)
  Auftraege: ['id', 'art', 'beleg_id', 'datei_id', 'ziel_pfad', 'name', 'angelegt_von', 'angelegt_am', 'erledigt_am'],
}

export const belegindexName = (jahr: number) => `00_Belegindex_${jahr}`
