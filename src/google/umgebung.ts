// Öffentliche Google-Kennung des OAuth-Clients. Sie ist nicht geheim (steht ohnehin im
// ausgelieferten JavaScript), wird aber per Umgebungsvariable gesetzt.
// Lokal: Datei .env, bei GitHub: Repository-Variable GOOGLE_CLIENT_ID.
export const GOOGLE = {
  // Leerzeichen, Zeilenumbrüche und Anführungszeichen entfernen (häufiger Kopierfehler in der Variable)
  clientId: ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').replace(/[\s"']/g, '') || undefined,
}

// Voller Drive-Zugriff (entschieden 26.11.2026): Mit dem knappen Scope drive.file sieht die
// Partnerin die von Maiks App angelegten Unterordner nicht. Die App arbeitet trotzdem nur im
// Ordner "Steuer".
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'openid',
  'email',
  'profile',
].join(' ')

export function fehlendeKennungen(): string[] {
  return Object.entries(GOOGLE)
    .filter(([, v]) => !v)
    .map(([k]) => k)
}
