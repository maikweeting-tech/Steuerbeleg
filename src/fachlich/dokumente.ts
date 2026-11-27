// Dokumentenablage: Verträge und andere Dauerdokumente, unabhängig vom Steuerjahr.
// Liste „00_Dokumente“ im Drive-Ordner „Steuer/Dokumente“. Reine Logik ohne Google-Zugriff (testbar).

export const DOKUMENT_SPALTEN = ['id', 'titel', 'art', 'zuordnung', 'gueltig_von', 'gueltig_bis', 'datei_id', 'dateiname', 'notiz', 'erfasst_von', 'erfasst_am'] as const

export const ARTEN = ['Mietvertrag', 'Kaufvertrag', 'Darlehensvertrag', 'Versicherung', 'Arbeitsvertrag', 'Bescheid', 'Sonstiges'] as const

export interface Dokument {
  id: string
  titel: string
  art: string
  /** „objekt:<id>“, „person:<id>“, „ausland“ oder „allgemein“ */
  zuordnung: string
  gueltig_von: string // JJJJ-MM-TT oder leer
  gueltig_bis: string // JJJJ-MM-TT oder leer = unbefristet
  datei_id: string
  dateiname: string
  notiz: string
  erfasst_von: string
  erfasst_am: string
}

type Zelle = string | number

export function dokumentAusZeile(z: Zelle[]): Dokument {
  const w = Object.fromEntries(DOKUMENT_SPALTEN.map((s, i) => [s, String(z[i] ?? '')])) as Record<(typeof DOKUMENT_SPALTEN)[number], string>
  return { ...w }
}
export const zeileAusDokument = (d: Dokument): Zelle[] => DOKUMENT_SPALTEN.map((s) => d[s])

export const zuordnungObjekt = (id: string) => `objekt:${id}`
export const zuordnungPerson = (id: string) => `person:${id}`

/** Ordnerpfad unter „Steuer/Dokumente“. Unbekanntes Objekt/Person → „Allgemein“. */
export function dokumentPfad(d: Pick<Dokument, 'zuordnung'>, objekte: { id: string; bezeichnung: string }[], personen: { id: string; name: string }[]): string[] {
  const [typ, id] = d.zuordnung.split(':')
  const sauber = (s: string) => s.replace(/[/\\]/g, '-').trim() || 'ohne Name'
  if (typ === 'objekt') { const o = objekte.find((x) => x.id === id); if (o) return ['Objekte', sauber(o.bezeichnung)] }
  if (typ === 'person') { const p = personen.find((x) => x.id === id); if (p) return ['Personen', sauber(p.name)] }
  if (typ === 'ausland') return ['Ausland']
  return ['Allgemein']
}

/** Dateiname in Drive: „Art_Titel.ext“ ohne Sonderzeichen. */
export function dokumentDateiname(art: string, titel: string, original: string): string {
  const ext = /\.([a-z0-9]{2,4})$/i.exec(original)?.[1]?.toLowerCase() ?? 'pdf'
  const teil = (s: string) => s.normalize('NFC').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '_')
  return `${[teil(art), teil(titel)].filter(Boolean).join('_') || 'Dokument'}.${ext}`
}

/** Ist das Dokument im Jahr gültig (Zeitraum überschneidet das Jahr)? Leere Daten = offen. */
export function gueltigImJahr(d: Pick<Dokument, 'gueltig_von' | 'gueltig_bis'>, jahr: number): boolean {
  const von = d.gueltig_von || '0000-01-01', bis = d.gueltig_bis || '9999-12-31'
  return von <= `${jahr}-12-31` && bis >= `${jahr}-01-01`
}

/** Dokumente für die Steuerberatung im Jahr; „neu“ = Beginn im Jahr, „endet“ = Ende im Jahr. */
export function dokumenteFuerJahr(l: Dokument[], jahr: number): (Dokument & { neu: boolean; endet: boolean })[] {
  return l.filter((d) => gueltigImJahr(d, jahr))
    .map((d) => ({ ...d, neu: d.gueltig_von.startsWith(`${jahr}-`), endet: d.gueltig_bis.startsWith(`${jahr}-`) }))
    .sort((a, b) => a.zuordnung.localeCompare(b.zuordnung) || a.art.localeCompare(b.art) || a.titel.localeCompare(b.titel))
}

/** Lesbare Zuordnung. */
export function zuordnungName(z: string, objekte: { id: string; bezeichnung: string }[], personen: { id: string; name: string }[]): string {
  const [typ, id] = z.split(':')
  if (typ === 'objekt') return objekte.find((x) => x.id === id)?.bezeichnung ?? 'Objekt (gelöscht)'
  if (typ === 'person') return personen.find((x) => x.id === id)?.name ?? 'Person'
  if (typ === 'ausland') return 'Auslandsobjekt'
  return 'Allgemein'
}

export const driveDateiLink = (id: string) => (id ? `https://drive.google.com/file/d/${id}/view` : '')
