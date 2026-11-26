// Google Drive: Ordner suchen und anlegen. Mit dem Scope drive.file sieht die App nur Dateien,
// die sie selbst angelegt hat oder die der Nutzer über die Dateiauswahl geöffnet hat.
import { googleFetch } from './api'

const DRIVE = 'https://www.googleapis.com/drive/v3/files'
export const ORDNER_MIME = 'application/vnd.google-apps.folder'
export const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'

export interface DriveDatei {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

export async function suche(q: string): Promise<DriveDatei[]> {
  const p = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,webViewLink)',
    pageSize: '1000',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })
  const d = await googleFetch(`${DRIVE}?${p}`)
  return d.files
}

export async function kinder(ordnerId: string): Promise<DriveDatei[]> {
  return suche(`'${esc(ordnerId)}' in parents and trashed = false`)
}

export async function findeInOrdner(name: string, elternId: string, mime?: string): Promise<DriveDatei | null> {
  const q = `name = '${esc(name)}' and '${esc(elternId)}' in parents and trashed = false` + (mime ? ` and mimeType = '${mime}'` : '')
  return (await suche(q))[0] ?? null
}

export async function erstelle(name: string, mimeType: string, elternId?: string, appProperties?: Record<string, string>): Promise<DriveDatei> {
  return googleFetch(`${DRIVE}?fields=id,name,mimeType,webViewLink&supportsAllDrives=true`, {
    method: 'POST',
    body: JSON.stringify({ name, mimeType, parents: elternId ? [elternId] : undefined, appProperties }),
  })
}

export async function holeOderErstelleOrdner(name: string, elternId: string): Promise<DriveDatei> {
  return (await findeInOrdner(name, elternId, ORDNER_MIME)) ?? erstelle(name, ORDNER_MIME, elternId)
}

/** Der Wurzelordner "Steuer" wird an einer App-Eigenschaft wiedererkannt. */
export async function findeWurzel(): Promise<DriveDatei | null> {
  const t = await suche(`appProperties has { key='steuerbeleg' and value='wurzel' } and trashed = false`)
  return t[0] ?? null
}

export async function erstelleWurzel(): Promise<DriveDatei> {
  return erstelle('Steuer', ORDNER_MIME, undefined, { steuerbeleg: 'wurzel' })
}

export async function datei(id: string): Promise<DriveDatei> {
  return googleFetch(`${DRIVE}/${encodeURIComponent(id)}?fields=id,name,mimeType,webViewLink&supportsAllDrives=true`)
}

/** Gibt einen Ordner für eine weitere Person frei (Rolle: Bearbeiter). */
export async function freigeben(dateiId: string, email: string) {
  return googleFetch(
    `${DRIVE}/${encodeURIComponent(dateiId)}/permissions?sendNotificationEmail=true&supportsAllDrives=true`,
    { method: 'POST', body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }) },
  )
}
