// Google Drive: Ordner suchen und anlegen. Die App arbeitet ausschließlich im Ordner "Steuer".
import { googleFetch } from './api'
import { holeToken } from './auth'

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


const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

/** Lädt eine Datei hoch (multipart). appProperties dienen zum Wiederfinden (z. B. Beleg-Id). */
export async function ladeHoch(name: string, mimeType: string, inhalt: Blob, elternId: string, appProperties?: Record<string, string>): Promise<DriveDatei> {
  const meta = new Blob([JSON.stringify({ name, mimeType, parents: [elternId], appProperties })], { type: 'application/json' })
  const form = new FormData()
  form.append('metadata', meta)
  form.append('file', inhalt)
  const t = await holeToken()
  const r = await fetch(`${UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=${FELDER}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}` },
    body: form,
  })
  if (!r.ok) {
    let text = ''
    try { text = (await r.json())?.error?.message ?? '' } catch { /* kein JSON */ }
    throw new Error(`Upload fehlgeschlagen (${r.status}): ${text || r.statusText}`)
  }
  return r.json()
}

/** Datei eines Belegs (über appProperties), falls schon hochgeladen – verhindert Doppel-Uploads. */
export async function findeBelegDatei(belegId: string): Promise<DriveDatei | null> {
  return (await suche(`appProperties has { key='steuerbeleg_beleg' and value='${esc(belegId)}' } and trashed = false`))[0] ?? null
}

/** Legt einen Ordnerpfad unterhalb von elternId an bzw. findet ihn. */
export async function holeOderErstellePfad(pfad: string[], elternId: string): Promise<DriveDatei> {
  let aktuell: DriveDatei | null = null
  let id = elternId
  for (const teil of pfad) {
    aktuell = await holeOderErstelleOrdner(teil, id)
    id = aktuell.id
  }
  if (!aktuell) throw new Error('Leerer Ordnerpfad')
  return aktuell
}

/**
 * Benennt eine Datei um und verschiebt sie in einen anderen Ordner (nur wenn nötig).
 * Darf das Konto die Datei nicht verschieben/umbenennen (z. B. gehört sie einer anderen Person,
 * Regel von Google für „Meine Ablage“), wird das Erlaubte erledigt und offen = true zurückgegeben.
 */
export async function verschiebeDatei(id: string, name: string, neuerOrdnerId: string): Promise<{ id: string; name: string; offen: boolean }> {
  const info: { name: string; parents?: string[]; capabilities?: { canRename?: boolean; canMoveItemWithinDrive?: boolean } } =
    await googleFetch(`${DRIVE}/${encodeURIComponent(id)}?fields=name,parents,capabilities(canRename,canMoveItemWithinDrive)&supportsAllDrives=true`)
  const alt = info.parents ?? []
  const umbenennen = info.name !== name && info.capabilities?.canRename !== false
  const verschieben = !alt.includes(neuerOrdnerId) && info.capabilities?.canMoveItemWithinDrive !== false
  const offen = (info.name !== name && !umbenennen) || (!alt.includes(neuerOrdnerId) && !verschieben)
  if (!umbenennen && !verschieben) return { id, name: info.name, offen }
  const p = new URLSearchParams({ supportsAllDrives: 'true', fields: 'id,name' })
  if (verschieben) { p.set('addParents', neuerOrdnerId); if (alt.length) p.set('removeParents', alt.join(',')) }
  const d: { id: string; name: string } = await googleFetch(`${DRIVE}/${encodeURIComponent(id)}?${p}`, { method: 'PATCH', body: JSON.stringify(umbenennen ? { name } : {}) })
  return { id: d.id, name: d.name, offen }
}

/** Dateiinhalt laden (alt=media) – für Belegmappe und ZIP-Export. */
export async function ladeInhalt(id: string): Promise<{ daten: ArrayBuffer; mimeType: string; name: string }> {
  const meta = await datei(id)
  const t = await holeToken()
  const r = await fetch(`${DRIVE}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${t}` } })
  if (!r.ok) throw new Error(`Datei ${meta.name || id} nicht ladbar (${r.status})`)
  return { daten: await r.arrayBuffer(), mimeType: meta.mimeType, name: meta.name }
}

/** Upload großer Dateien (resumable, für Exporte > 5 MB). */
export async function ladeHochGross(name: string, mimeType: string, inhalt: Blob, elternId: string): Promise<DriveDatei> {
  const t = await holeToken()
  const start = await fetch(`${UPLOAD}?uploadType=resumable&supportsAllDrives=true&fields=${FELDER}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mimeType, 'X-Upload-Content-Length': String(inhalt.size) },
    body: JSON.stringify({ name, mimeType, parents: [elternId] }),
  })
  const ziel = start.headers.get('Location')
  if (!start.ok || !ziel) throw new Error(`Upload konnte nicht gestartet werden (${start.status})`)
  const r = await fetch(ziel, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: inhalt })
  if (!r.ok) throw new Error(`Upload fehlgeschlagen (${r.status})`)
  return r.json()
}

/** Datei in den Papierkorb (in Drive 30 Tage wiederherstellbar). */
export async function inPapierkorb(id: string): Promise<void> {
  await googleFetch(`${DRIVE}/${encodeURIComponent(id)}?supportsAllDrives=true`, { method: 'PATCH', body: JSON.stringify({ trashed: true }) })
}
