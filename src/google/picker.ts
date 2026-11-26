// Google-Dateiauswahl (Picker). Damit öffnet Anna einmalig den von Maik freigegebenen Ordner
// "Steuer"; erst dann darf die App (Scope drive.file) mit ihm arbeiten.
import { GOOGLE } from './umgebung'
import { holeToken } from './auth'
import { ladeSkript } from './skript'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any
declare const gapi: any

export async function waehleOrdner(): Promise<{ id: string; name: string } | null> {
  if (!GOOGLE.apiKey || !GOOGLE.appId) throw new Error('VITE_GOOGLE_API_KEY bzw. VITE_GOOGLE_APP_ID fehlt (siehe docs/EINRICHTUNG.md).')
  const t = await holeToken()
  await ladeSkript('https://apis.google.com/js/api.js')
  await new Promise<void>((ok) => gapi.load('picker', ok))
  return new Promise((ok) => {
    const ansicht = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setOwnedByMe(false)
      .setMimeTypes('application/vnd.google-apps.folder')
    const picker = new google.picker.PickerBuilder()
      .setTitle('Ordner „Steuer“ auswählen')
      .setLocale('de')
      .setOAuthToken(t)
      .setDeveloperKey(GOOGLE.apiKey)
      .setAppId(GOOGLE.appId)
      .addView(ansicht)
      .setCallback((d: any) => {
        if (d.action === google.picker.Action.PICKED) ok({ id: d.docs[0].id, name: d.docs[0].name })
        else if (d.action === google.picker.Action.CANCEL) ok(null)
      })
      .build()
    picker.setVisible(true)
  })
}
