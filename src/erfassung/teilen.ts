// Android „Teilen“: Der Service Worker legt die geteilten Dateien im Cache „steuerbeleg-geteilt“ ab
// und öffnet #/erfassen?geteilt=1. Hier werden sie abgeholt und gelöscht.
export const GETEILT_CACHE = 'steuerbeleg-geteilt'

export async function holeGeteilteDateien(): Promise<File[]> {
  if (!('caches' in window)) return []
  const c = await caches.open(GETEILT_CACHE)
  const dateien: File[] = []
  for (const anfrage of await c.keys()) {
    const r = await c.match(anfrage)
    if (r) {
      const blob = await r.blob()
      const name = decodeURIComponent(r.headers.get('X-Dateiname') ?? 'geteilt')
      dateien.push(new File([blob], name, { type: blob.type }))
    }
    await c.delete(anfrage)
  }
  return dateien
}
