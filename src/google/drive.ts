// Google Drive: Ordner suchen und anlegen. Die App arbeitet ausschließlich im Ordner "Steuer".
import { googleFetch } from './api'

const DRIVE = 'https://www.googleapis.com/drive/v3/files'
export const ORDNER_MIME = 'application/vnd.google-apps.folder'
export const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'

export interface DriveDatei {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  ownedByMe?: boolean
  owners?: { displayName?: string; emailAddress?: string }[]
}

const FELDER = 'id,name,mimeType,webViewLink,ownedByMe,owners(displayName,emailAddress)'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

export async function suche(q: string): Promise<DriveDatei[]> {
  const p = new URLSearchParams({
    q,
    fields: `files(${FELDER})`,
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
  return googleFetch(`${DRIVE}?fields=${FELDER}&supportsAllDrives=true`, {
    method: 'POST',
    body: JSON.stringify({ name, mimeType, parents: elternId ? [elternId] : undefined, appProperties }),
  })
}

export async function holeOderErstelleOrdner(name: string, elternId: string): Promise<DriveDatei> {
  return (await findeInOrdner(name, elternId, ORDNER_MIME)) ?? erstelle(name, ORDNER_MIME, elternId)
}

/**
 * Alle Ordner "Steuer", die als Wurzel infrage kommen: von der App markierte (eigene oder
 * freigegebene) sowie für mich freigegebene Ordner mit dem Namen "Steuer".
 */
export async function findeWurzeln(): Promise<DriveDatei[]> {
  const [markiert, geteilt] = await Promise.all([
    suche(`appProperties has { key='steuerbeleg' and value='wurzel' } and trashed = false`),
    suche(`name = 'Steuer' and mimeType = '${ORDNER_MIME}' and sharedWithMe and trashed = false`),
  ])
  const alle = new Map<string, DriveDatei>()
  for (const d of [...markiert, ...geteilt]) alle.set(d.id, d)
  return [...alle.values()]
}

export async function erstelleWurzel(): Promise<DriveDatei> {
  return erstelle('Steuer', ORDNER_MIME, undefined, { steuerbeleg: 'wurzel' })
}

export async function datei(id: string): Promise<DriveDatei> {
  return googleFetch(`${DRIVE}/${encodeURIComponent(id)}?fields=${FELDER}&supportsAllDrives=true`)
}

