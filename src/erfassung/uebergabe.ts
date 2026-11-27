// Übergibt Dateien vom Kameraknopf (Startseite / schwebender Knopf) an die Seite „Erfassen“.
let vorgemerkt: File[] = []

export function merkeVor(dateien: File[]) {
  vorgemerkt = [...vorgemerkt, ...dateien]
}

/** Liefert die vorgemerkten Dateien genau einmal. */
export function nimmVorgemerkte(): File[] {
  const d = vorgemerkt
  vorgemerkt = []
  return d
}
