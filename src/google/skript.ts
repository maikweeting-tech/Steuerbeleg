const geladen = new Map<string, Promise<void>>()

/** Lädt ein externes Google-Skript genau einmal. */
export function ladeSkript(src: string): Promise<void> {
  let p = geladen.get(src)
  if (!p) {
    p = new Promise((ok, fehler) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => ok()
      s.onerror = () => fehler(new Error(`Skript konnte nicht geladen werden: ${src}`))
      document.head.appendChild(s)
    })
    geladen.set(src, p)
  }
  return p
}
