// Öffentliche Google-Kennungen. Sie sind nicht geheim (sie stehen ohnehin im ausgelieferten
// JavaScript), werden aber per Umgebungsvariable gesetzt, damit jeder seinen eigenen
// Google-Cloud-Client nutzen kann. Lokal: Datei .env, bei GitHub: Repository-Variablen.
export const GOOGLE = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
  /** Projektnummer aus der Google-Cloud-Konsole, für die Dateiauswahl (Picker). */
  appId: import.meta.env.VITE_GOOGLE_APP_ID as string | undefined,
}

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
  'profile',
].join(' ')

export function fehlendeKennungen(): string[] {
  return Object.entries(GOOGLE)
    .filter(([, v]) => !v)
    .map(([k]) => k)
}
