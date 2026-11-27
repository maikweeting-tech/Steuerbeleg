// M7: Exporte – Excel-Auswertung, Checkliste, Fragenliste, Belegmappe und ZIP-Paket (E5).
// Alles wird im Browser erstellt. Speichern in Drive unter Steuer/<Jahr>/Export ist optional.
import { useState } from 'react'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { aktualisiereBelege, ladeVorjahr, speichereExport } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import { formatEuro } from '../fachlich/format'
import { istAngemeldet } from '../google/auth'
import { ladeInhalt } from '../google/drive'
import { ladeDokumente } from '../daten/dokumentablage'
import { fragen, gesamt, HINWEIS, type ExportDaten } from '../export/auswertung'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
type Art = 'erklaerung' | 'excel' | 'checkliste' | 'fragen' | 'mappe' | 'zip'
const ARTEN: { id: Art; name: string; text: string; drive: boolean }[] = [
  { id: 'erklaerung', name: 'Ausfüllhilfe für die Steuerberatung (PDF)', text: 'Antworten aus „Erklärung“, Unterlagenliste und Punkte zum Klären.', drive: false },
  { id: 'excel', name: 'Excel-Auswertung', text: 'Summen mit Formeln je Anlage, Prüfblatt, Annahmen, alle Belege.', drive: false },
  { id: 'checkliste', name: 'Checkliste (PDF)', text: 'Offene Punkte, Summen je Bereich, Anlage V, § 35a, Fragen.', drive: false },
  { id: 'fragen', name: 'Fragenliste (PDF)', text: 'Alle Belege mit Frage an die Steuerberatung.', drive: false },
  { id: 'mappe', name: 'Belegmappe (PDF)', text: 'Deckblatt, Verzeichnis und alle Belege mit Stempel in einer Datei. Lädt alle Dateien aus Drive.', drive: true },
  { id: 'zip', name: 'ZIP-Paket', text: 'Alle Belegdateien in Ordnern wie in Drive, dazu Excel, Checkliste, Ausfüllhilfe und Fragenliste.', drive: true },
]

const stempel = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`

function herunterladen(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function Export() {
  const { belege, wartend } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const online = istAngemeldet()
  const [laeuft, setLaeuft] = useState<Art | 'aktualisieren' | null>(null)
  const [stand, setStand] = useState('')
  const [fehler, setFehler] = useState('')
  const [ergebnis, setErgebnis] = useState<{ blob: Blob; name: string; mime: string; hinweise: string[] } | null>(null)
  const [gespeichert, setGespeichert] = useState('')

  const daten = async (): Promise<ExportDaten> => ({
    jahr: AKTUELLES_JAHR, konfig: KONFIGURATIONEN[AKTUELLES_JAHR], belege, stamm,
    vorjahr: online ? await ladeVorjahr(AKTUELLES_JAHR) : null, erstellt: new Date().toISOString(),
    dokumente: online ? await ladeDokumente().catch(() => undefined) : undefined,
  })
  const excel = async (d: ExportDaten) => {
    const [{ default: ExcelJS }, { erstelleExcel }] = await Promise.all([import('exceljs'), import('../export/excel')])
    return new Uint8Array((await erstelleExcel(d, ExcelJS)).buffer)
  }

  const erstelle = async (art: Art) => {
    setFehler(''); setErgebnis(null); setGespeichert(''); setLaeuft(art); setStand('Daten sammeln …')
    try {
      const d = await daten()
      const basis = `Steuer_${AKTUELLES_JAHR}`
      const zeit = stempel(new Date())
      const pdf = await import('../export/pdf')
      // Dateien nur einmal laden, auch wenn Mappe und ZIP sie brauchen
      const cache = new Map<string, ReturnType<typeof ladeInhalt>>()
      const lade = (id: string) => { if (!cache.has(id)) cache.set(id, ladeInhalt(id)); return cache.get(id)! }
      const melde = (n: number, g: number) => setStand(`Belegdateien laden: ${n} von ${g}`)
      if (art === 'erklaerung') {
        setErgebnis({ blob: await pdf.erklaerungPdf(d), name: `${basis}_Ausfuellhilfe_${zeit}.pdf`, mime: 'application/pdf', hinweise: [] })
      } else if (art === 'excel') {
        setStand('Excel erstellen …')
        setErgebnis({ blob: new Blob([await excel(d) as BlobPart], { type: XLSX }), name: `${basis}_Auswertung_${zeit}.xlsx`, mime: XLSX, hinweise: [] })
      } else if (art === 'checkliste') {
        setErgebnis({ blob: await pdf.checklistePdf(d), name: `${basis}_Checkliste_${zeit}.pdf`, mime: 'application/pdf', hinweise: [] })
      } else if (art === 'fragen') {
        setErgebnis({ blob: await pdf.fragenPdf(d), name: `${basis}_Fragen_${zeit}.pdf`, mime: 'application/pdf', hinweise: [] })
      } else if (art === 'mappe') {
        const r = await pdf.belegmappePdf(d, lade, melde)
        setErgebnis({ blob: r.pdf, name: `${basis}_Belegmappe_${zeit}.pdf`, mime: 'application/pdf', hinweise: r.eintraege.filter((e) => e.hinweis && e.seite === null).map((e) => `Nr. ${e.beleg.belegnr}: ${e.hinweis}`) })
      } else {
        setStand('Excel und PDFs erstellen …')
        const zusatz: Record<string, Uint8Array> = {
          [`${basis}_Auswertung.xlsx`]: await excel(d),
          [`${basis}_Checkliste.pdf`]: new Uint8Array(await (await pdf.checklistePdf(d)).arrayBuffer()),
          [`${basis}_Ausfuellhilfe.pdf`]: new Uint8Array(await (await pdf.erklaerungPdf(d)).arrayBuffer()),
        }
        if (fragen(d).length) zusatz[`${basis}_Fragen.pdf`] = new Uint8Array(await (await pdf.fragenPdf(d)).arrayBuffer())
        const { erstellePaket } = await import('../export/paket')
        const r = await erstellePaket(d, lade, zusatz, melde)
        setErgebnis({ blob: r.zip, name: `${basis}_Paket_${zeit}.zip`, mime: 'application/zip', hinweise: r.fehler })
      }
      setStand('')
    } catch (e) { setFehler(e instanceof Error ? e.message : String(e)); setStand('') } finally { setLaeuft(null) }
  }

  const inDrive = async () => {
    if (!ergebnis) return
    setFehler(''); setStand('In Drive speichern …')
    try { await speichereExport(AKTUELLES_JAHR, ergebnis.name, ergebnis.mime, ergebnis.blob); setGespeichert(`Gespeichert in Steuer/${AKTUELLES_JAHR}/Export/${ergebnis.name}`) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setStand('') }
  }

  const aktualisieren = async () => {
    setFehler(''); setLaeuft('aktualisieren')
    try { await aktualisiereBelege(AKTUELLES_JAHR) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(null) }
  }

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Export {AKTUELLES_JAHR}</h2>
      <div className="karte">
        <p className="klein">Stand der lokalen Kopie: <strong>{belege.length} Belege</strong>, Summe {formatEuro(gesamt(belege))}. Vor dem Export bitte aktualisieren, damit auch Annas bzw. Maiks neueste Belege dabei sind.</p>
        {wartend.length > 0 && <p className="warnung klein">{wartend.length} Beleg(e) warten noch auf Übertragung und fehlen im Export.</p>}
        <button className="zweit" disabled={!online || laeuft !== null} onClick={() => void aktualisieren()}>{laeuft === 'aktualisieren' ? 'Aktualisiere …' : 'Aktualisieren'}</button>
        <p className="klein warnung">{HINWEIS}</p>
      </div>
      {ARTEN.map((a) => (
        <div key={a.id} className="karte">
          <h2>{a.name}</h2>
          <p className="klein">{a.text}</p>
          <button disabled={laeuft !== null || (a.drive && !online) || (a.id !== 'erklaerung' && !belege.length)} onClick={() => void erstelle(a.id)}>{laeuft === a.id ? 'Erstelle …' : 'Erstellen'}</button>
          {a.drive && !online && <p className="klein">Nur angemeldet und mit Netz (Dateien kommen aus Drive).</p>}
        </div>
      ))}
      {stand && <p className="klein">{stand}</p>}
      {ergebnis && (
        <div className="karte">
          <h2>Fertig: {ergebnis.name}</h2>
          <p className="klein">{ergebnis.blob.size < 1024 * 1024 ? `${Math.max(1, Math.round(ergebnis.blob.size / 1024))} KB` : `${(ergebnis.blob.size / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`}</p>
          {ergebnis.hinweise.map((h) => <p key={h} className="warnung klein">{h}</p>)}
          <div className="zeile">
            <button onClick={() => herunterladen(ergebnis.blob, ergebnis.name)}>Herunterladen</button>
            <button className="zweit" disabled={!online || !!stand} onClick={() => void inDrive()}>In Drive speichern</button>
          </div>
          {gespeichert && <p className="ok">{gespeichert}</p>}
        </div>
      )}
      {fehler && <p className="fehler">{fehler}</p>}
    </>
  )
}
