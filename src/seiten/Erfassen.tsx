// Beleg erfassen: Seiten (Fotos/PDF) sammeln und bearbeiten, Pflichtfelder ausfüllen, speichern.
// Gespeichert wird zuerst lokal (Warteschlange); die Übertragung nach Drive läuft danach automatisch.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import {
  findeDuplikate, leererEntwurf, pruefePflicht, wirksamesSteuerjahr, type BelegEntwurf,
} from '../fachlich/beleg'
import { formatDatum, formatEuro, parseBetrag } from '../fachlich/format'
import { alsJpeg, rendere, VOLL, vorschau, type Filter, type Seite } from '../erfassung/bild'
import { erstellePdf, type Teil } from '../erfassung/pdf'
import { warteschlange } from '../daten/speicher'
import { nutzerEmail, starteSync } from '../daten/dienste'
import { gespeicherteWurzel } from '../daten/einrichtung'
import { useDaten, useStamm } from '../komponenten/hooks'
import BelegFelder from '../komponenten/BelegFelder'
import Zuschnitt from '../komponenten/Zuschnitt'
import { holeGeteilteDateien } from '../erfassung/teilen'
import { nimmVorgemerkte } from '../erfassung/uebergabe'
import { OCR_AUS, textAusBild, textAusPdf, type OcrStand } from '../erfassung/ocr'
import { werteAus, zuordnungNachAussteller } from '../fachlich/texterkennung'
import { vorlageMarke } from '../fachlich/vorlagen'
import { AusstellerVorschlag, OcrVorschlaege, StichwortVorschlag } from '../komponenten/Vorschlaege'
import { objektNachText, vorschlagNachStichwort } from '../fachlich/zuordnung'
import { ausDateiname } from '../fachlich/eingang'
import { ladeInhalt } from '../google/drive'

type Eintrag =
  | (Seite & { art: 'bild'; bildUrl: string })
  | { art: 'pdf'; id: string; datei: Blob; name: string }

const neueId = () => crypto.randomUUID()

export default function Erfassen() {
  const { wartend, belege } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const navigate = useNavigate()
  const ort = useLocation()
  const [seiten, setSeiten] = useState<Eintrag[]>([])
  const [bearbeite, setBearbeite] = useState<string | null>(null)
  const [e, setE] = useState<BelegEntwurf>(() => leererEntwurf(neueId()))
  const [betragText, setBetragText] = useState('')
  const [zahlungGeaendert, setZahlungGeaendert] = useState(false)
  const [versucht, setVersucht] = useState(false)
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  const [ocr, setOcr] = useState<OcrStand>(OCR_AUS)
  const [stand, setStand] = useState(0)
  const ocrLauf = useRef(0)
  // Aus dem Eingang (?eingang=<Drive-Id>&name=…): die PDF liegt schon in Drive und wird beim Übertragen nur verschoben
  const [quelle, setQuelle] = useState<{ id: string; name: string } | null>(null)

  const fuegeHinzu = useCallback(async (dateien: File[] | Blob[]) => {
    setFehler('')
    const neu: Eintrag[] = []
    for (const d of dateien) {
      const name = d instanceof File ? d.name : 'geteilt'
      if (d.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
        neu.push({ art: 'pdf', id: neueId(), datei: d, name })
      } else if (d.type.startsWith('image/')) {
        const s: Seite = { id: neueId(), quelle: d, drehung: 0, zuschnitt: VOLL, filter: 'kontrast' }
        try {
          neu.push({ ...s, art: 'bild', bildUrl: await vorschau(s) })
        } catch {
          setFehler(`„${name}“ kann nicht gelesen werden (Format ${d.type || 'unbekannt'}). Bitte als JPG oder PDF.`)
        }
      } else setFehler(`„${name}“ ist weder Bild noch PDF.`)
    }
    setSeiten((a) => [...a, ...neu])
  }, [])

  // Vom Kameraknopf (Start/schwebend) übergebene Fotos übernehmen
  useEffect(() => {
    const d = nimmVorgemerkte()
    if (d.length) void fuegeHinzu(d)
  }, [ort.search, fuegeHinzu])

  // Vorbelegung aus „Check“ (?vorlage=…) bzw. „Konto“ (?betrag=…&datum=…&aussteller=…), einmalig
  const vorbelegt = useRef(false)
  useEffect(() => {
    if (vorbelegt.current) return
    const q = new URLSearchParams(ort.search)
    const vid = q.get('vorlage')
    if (vid) {
      const v = stamm.vorlagen.find((x) => x.id === vid)
      if (!v) return // Stammdaten noch nicht geladen
      vorbelegt.current = true
      setE((a) => ({
        ...a, aussteller: v.aussteller || v.bezeichnung, person: v.person, modul: v.modul, kategorie: v.kategorie,
        objekt_id: v.objekt_id, einheit_id: v.einheit_id, kind_id: v.kind_id,
        notiz: `${v.bezeichnung} ${vorlageMarke(v.id)}`, betrag_ct: v.betrag_ct ?? a.betrag_ct,
      }))
      if (v.betrag_ct !== null) setBetragText(formatEuro(v.betrag_ct).replace(/\s?€/, ''))
    } else if (q.get('betrag')) {
      vorbelegt.current = true
      const c = Number(q.get('betrag'))
      const d = q.get('datum') ?? ''
      setE((a) => ({ ...a, betrag_ct: c, aussteller: q.get('aussteller') ?? a.aussteller, belegdatum: d || a.belegdatum, zahlungsdatum: d || a.zahlungsdatum }))
      setBetragText(formatEuro(c).replace(/\s?€/, ''))
      if (d) setZahlungGeaendert(true)
    }
  }, [ort.search, stamm.vorlagen])

  // PDF aus dem Eingang laden (für Vorschau und Texterkennung); Datum/Absender aus dem Dateinamen vorschlagen
  const eingangGeladen = useRef('')
  useEffect(() => {
    const q = new URLSearchParams(ort.search)
    const id = q.get('eingang')
    if (!id || eingangGeladen.current === id) return
    eingangGeladen.current = id
    const name = q.get('name') ?? 'Eingang.pdf'
    setLaeuft('PDF wird aus Drive geladen …')
    void ladeInhalt(id).then(({ daten, mimeType }) => {
      setSeiten([{ art: 'pdf', id: neueId(), datei: new Blob([daten], { type: mimeType || 'application/pdf' }), name }])
      setQuelle({ id, name })
      const v = ausDateiname(name)
      setE((a) => ({ ...a, aussteller: a.aussteller || v.absender, belegdatum: a.belegdatum || v.datum, zahlungsdatum: a.zahlungsdatum || v.datum }))
    }).catch((x) => setFehler(`PDF aus dem Eingang nicht ladbar: ${x instanceof Error ? x.message : String(x)}`)).finally(() => setLaeuft(''))
  }, [ort.search])

  // Über das Teilen-Menü (Android) geschickte Dateien übernehmen
  useEffect(() => {
    if (!ort.search.includes('geteilt')) return
    void holeGeteilteDateien().then((d) => { if (d.length) void fuegeHinzu(d) })
  }, [ort.search, fuegeHinzu])

  const aendereSeite = async (id: string, f: (s: Seite) => Seite) => {
    const alt = seiten.find((s) => s.id === id)
    if (!alt || alt.art !== 'bild') return
    const s = f(alt)
    const url = await vorschau(s)
    URL.revokeObjectURL(alt.bildUrl)
    setSeiten((a) => a.map((x) => (x.id === id ? { ...s, art: 'bild', bildUrl: url } : x)))
  }
  const entferne = (id: string) => setSeiten((a) => a.filter((x) => x.id !== id))
  const nachVorn = (i: number) => setSeiten((a) => (i ? [...a.slice(0, i - 1), a[i], a[i - 1], ...a.slice(i + 1)] : a))

  const fehlerListe = useMemo(() => {
    const f = pruefePflicht(e, KONFIGURATIONEN, stamm.objekte.some((o) => o.aktiv), stamm.kinder.length > 0)
    if (betragText && parseBetrag(betragText) === null) f.unshift('Betrag ist keine gültige Zahl (z. B. 412,50)')
    if (!seiten.length) f.unshift('Mindestens eine Seite (Foto oder PDF) fehlt')
    return f
  }, [e, betragText, seiten.length, stamm.objekte, stamm.kinder])

  const duplikate = useMemo(() => findeDuplikate(e, [
    ...belege,
    ...wartend.map((w) => ({ ...w.entwurf })),
  ]), [e, belege, wartend])

  const aussteller = useMemo(() => [...new Set(belege.map((b) => b.aussteller).filter(Boolean))].sort(), [belege])

  // Texterkennung der ersten Seite (läuft im Hintergrund, Ergebnis nur als Vorschlag)
  const erkenne = useCallback(async (s: Eintrag) => {
    const lauf = ++ocrLauf.current
    setOcr({ ...OCR_AUS, status: 'laeuft' })
    const fort = (p: number) => { if (lauf === ocrLauf.current) setOcr((o) => ({ ...o, fortschritt: p })) }
    try {
      const text = s.art === 'pdf' ? await textAusPdf(s.datei, fort) : await textAusBild(await rendere(s), fort)
      if (lauf === ocrLauf.current) setOcr({ ...OCR_AUS, status: 'fertig', text, vorschlag: werteAus(text, aussteller) })
    } catch (x) {
      if (lauf === ocrLauf.current) setOcr({ ...OCR_AUS, status: 'fehler', fehler: x instanceof Error ? x.message : String(x) })
    }
  }, [aussteller])
  const erste = seiten[0]
  useEffect(() => { if (erste && ocr.status === 'aus') void erkenne(erste) }, [erste, ocr.status, erkenne])

  const uebernimm = (felder: string[]) => {
    const v = ocr.vorschlag
    if (!v) return
    if (felder.includes('betrag') && v.betrag_ct !== null) setBetragText(formatEuro(v.betrag_ct).replace(/\s?€/, ''))
    setE((a) => {
      const n = { ...a }
      if (felder.includes('datum') && v.belegdatum) { n.belegdatum = v.belegdatum; if (!zahlungGeaendert) n.zahlungsdatum = v.belegdatum }
      if (felder.includes('betrag') && v.betrag_ct !== null) n.betrag_ct = v.betrag_ct
      if (felder.includes('aussteller') && v.aussteller) n.aussteller = v.aussteller
      if (felder.includes('lohn')) { n.arbeitskosten_ct = v.arbeitskosten_ct; n.material_ct = v.material_ct }
      return n
    })
    if (felder.includes('lohn')) setStand((x) => x + 1)
  }

  const zuordnung = useMemo(() => zuordnungNachAussteller(e.aussteller, belege), [e.aussteller, belege])
  const belegText = `${e.aussteller}\n${ocr.status === 'fertig' ? ocr.text : ''}`
  const stichwort = useMemo(() => (zuordnung ? null : vorschlagNachStichwort(belegText, stamm.stichwoerter ?? [], KONFIGURATIONEN[AKTUELLES_JAHR])), [zuordnung, belegText, stamm.stichwoerter])
  const objektTreffer = useMemo(() => objektNachText(belegText, stamm.objekte), [belegText, stamm.objekte])
  const objektEbene = (m: string) => KONFIGURATIONEN[AKTUELLES_JAHR].module.find((x) => x.id === m)?.ebene === 'objekt'
  const zielModul = stichwort?.modul || e.modul || (objektTreffer ? 'V' : '')
  const objektVorschlag = objektTreffer && objektEbene(zielModul) && e.objekt_id !== objektTreffer.id ? objektTreffer : null
  const stichwortOffen = !!stichwort && (e.modul !== stichwort.modul || e.kategorie !== stichwort.kategorie)
  const uebernimmStichwort = () => setE((a) => ({
    ...a,
    ...(stichwortOffen && stichwort ? { modul: stichwort.modul, kategorie: stichwort.kategorie } : {}),
    ...(objektVorschlag ? { modul: stichwortOffen && stichwort ? stichwort.modul : a.modul || 'V', objekt_id: objektVorschlag.id, einheit_id: '', aufteilung: [] } : {}),
  }))
  const zuordnungOffen = !!zuordnung && (e.modul !== zuordnung.modul || e.kategorie !== zuordnung.kategorie || e.objekt_id !== zuordnung.objekt_id || e.kind_id !== zuordnung.kind_id)

  const speichere = async () => {
    setVersucht(true)
    if (fehlerListe.length) return
    setLaeuft('PDF wird erstellt …')
    setFehler('')
    try {
      if (quelle && seiten[0]?.art === 'pdf') {
        // Eingang: keine neue PDF, die vorhandene Datei wird beim Übertragen umbenannt und verschoben
        const { seiten: anzahl } = await erstellePdf([{ art: 'pdf', daten: await seiten[0].datei.arrayBuffer() }])
        await warteschlange.speichere({
          id: e.id, entwurf: { ...e, steuerjahr: wirksamesSteuerjahr(e) }, pdf: null, quelle, seiten: anzahl,
          erfasst_von: nutzerEmail(), erfasst_am: new Date().toISOString(), versuche: 0,
        })
        void starteSync()
        navigate('/eingang', { state: { meldung: `Beleg gespeichert. Die PDF wird beim Übertragen in den passenden Ordner verschoben.` } })
        return
      }
      const teile: Teil[] = []
      for (const s of seiten) {
        if (s.art === 'pdf') teile.push({ art: 'pdf', daten: await s.datei.arrayBuffer() })
        else teile.push({ art: 'jpeg', daten: await (await alsJpeg(await rendere(s))).arrayBuffer() })
      }
      const { pdf, seiten: anzahl } = await erstellePdf(teile)
      const jahr = wirksamesSteuerjahr(e)
      await warteschlange.speichere({
        id: e.id, entwurf: { ...e, steuerjahr: jahr }, pdf, seiten: anzahl,
        erfasst_von: nutzerEmail(), erfasst_am: new Date().toISOString(), versuche: 0,
      })
      seiten.forEach((s) => s.art === 'bild' && URL.revokeObjectURL(s.bildUrl))
      void starteSync()
      navigate('/belege', { state: { meldung: `Beleg gespeichert (${anzahl} Seite${anzahl === 1 ? '' : 'n'}). Er wird nach Drive übertragen, sobald Netz und Anmeldung da sind.` } })
    } catch (x) {
      setFehler(x instanceof Error ? x.message : String(x))
    } finally {
      setLaeuft('')
    }
  }

  const bearbeitet = seiten.find((s) => s.id === bearbeite)
  if (bearbeitet && bearbeitet.art === 'bild')
    return <Zuschnitt seite={bearbeitet} fertig={(r) => { setBearbeite(null); if (r) void aendereSeite(bearbeitet.id, (s) => ({ ...s, zuschnitt: r })) }} />


  return (
    <>
      {!gespeicherteWurzel() && <p className="warnung">Noch kein Ordner „Steuer“ verbunden. Du kannst erfassen; übertragen wird erst, wenn auf der Startseite ein Ordner verbunden ist.</p>}

      <div className="karte">
        <h2>1. Seiten</h2>
        {quelle && <p className="klein">PDF aus dem Eingang: <a href={`https://drive.google.com/file/d/${quelle.id}/view`} target="_blank" rel="noreferrer">{quelle.name} ansehen</a>. Sie wird nicht neu erstellt, sondern beim Übertragen umbenannt und in den passenden Ordner verschoben.</p>}
        {quelle && <iframe title="Vorschau" src={`https://drive.google.com/file/d/${quelle.id}/preview`} style={{ width: '100%', height: 420, border: '1px solid #ccc', borderRadius: 6 }} />}
        {!quelle && <div className="zeile">
          <label className="knopf gross-foto">
            <input type="file" accept="image/*" capture="environment" hidden onChange={(x) => { void fuegeHinzu([...(x.target.files ?? [])]); x.target.value = '' }} />
            <span>📷 {seiten.length ? 'Weitere Seite fotografieren' : 'Foto aufnehmen'}</span>
          </label>
          <label className="knopf zweit">
            <input type="file" accept="image/*,application/pdf" multiple hidden onChange={(x) => { void fuegeHinzu([...(x.target.files ?? [])]); x.target.value = '' }} />
            <span>Datei / Galerie</span>
          </label>
        </div>}
        {!quelle && <p className="klein">Mehrseitige Belege: einfach weitere Fotos aufnehmen. Die Seiten werden zu einer PDF zusammengefügt.</p>}
        {seiten.length > 0 && (
          <div className="seiten">
            {seiten.map((s, i) => (
              <div className="seite" key={s.id}>
                {s.art === 'bild' ? <img src={s.bildUrl} alt={`Seite ${i + 1}`} /> : <div className="pdf-platz">PDF<br /><span className="klein">{s.name}</span></div>}
                <div className="klein">Seite {i + 1}</div>
                <div className="zeile">
                  {s.art === 'bild' && <button className="zweit" title="Drehen" onClick={() => void aendereSeite(s.id, (x) => ({ ...x, drehung: ((x.drehung + 90) % 360) as Seite['drehung'], zuschnitt: VOLL }))}>⟳</button>}
                  {s.art === 'bild' && <button className="zweit" title="Zuschneiden" onClick={() => setBearbeite(s.id)}>✂</button>}
                  {i > 0 && <button className="zweit" title="Nach vorn" onClick={() => nachVorn(i)}>◀</button>}
                  {!quelle && <button className="zweit" title="Entfernen" onClick={() => entferne(s.id)}>✕</button>}
                </div>
                {s.art === 'bild' && (
                  <select value={s.filter} onChange={(x) => void aendereSeite(s.id, (y) => ({ ...y, filter: x.target.value as Filter }))}>
                    <option value="kontrast">Kontrast</option>
                    <option value="sw">Schwarz-weiß</option>
                    <option value="original">Original</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="karte">
        <h2>2. Angaben</h2>
        <OcrVorschlaege ocr={ocr} e={e} uebernimm={uebernimm} neuErkennen={erste ? () => void erkenne(erste) : undefined} />
        <BelegFelder e={e} setE={setE} betragText={betragText} setBetragText={setBetragText} zahlungGeaendert={zahlungGeaendert}
          setZahlungGeaendert={setZahlungGeaendert} aussteller={aussteller} stamm={stamm} stand={stand}>
          {zuordnung && zuordnungOffen && (
            <AusstellerVorschlag z={zuordnung} stamm={stamm} uebernimm={() => setE((a) => ({
              ...a, person: zuordnung.person, modul: zuordnung.modul, kategorie: zuordnung.kategorie, objekt_id: zuordnung.objekt_id,
              einheit_id: zuordnung.einheit_id, umlagefaehig: zuordnung.umlagefaehig, kind_id: zuordnung.kind_id,
              zahlungsart: zuordnung.zahlungsart, aufteilung: [],
            }))} />
          )}
          {(stichwortOffen || objektVorschlag) && (
            <StichwortVorschlag s={stichwortOffen ? stichwort : null} objekt={objektVorschlag} uebernimm={uebernimmStichwort} />
          )}
          {duplikate.length > 0 && (
            <div className="warnung">
              <strong>Möglicherweise doppelt:</strong>
              <ul className="liste">
                {duplikate.map((d) => (
                  <li key={d.beleg.id}>
                    {d.beleg.belegnr ? `Nr. ${d.beleg.belegnr}, ` : '(noch nicht übertragen) '}
                    {formatDatum(d.beleg.belegdatum)}, {formatEuro(d.beleg.betrag_ct ?? 0)}, {d.beleg.aussteller}
                    {d.stufe === 'hoch' ? ' – gleicher Aussteller' : ''}
                  </li>
                ))}
              </ul>
              <span className="klein">Gleiches Datum und gleicher Betrag. Speichern ist trotzdem möglich.</span>
            </div>
          )}
        </BelegFelder>
      </div>

      {versucht && fehlerListe.length > 0 && (
        <div className="fehler karte"><strong>Bitte ergänzen:</strong><ul className="liste">{fehlerListe.map((f) => <li key={f}>{f}</li>)}</ul></div>
      )}
      {fehler && <p className="fehler">{fehler}</p>}
      <div className="zeile">
        <button disabled={!!laeuft} onClick={() => void speichere()}>{laeuft || 'Beleg speichern'}</button>
        <button className="zweit" disabled={!!laeuft} onClick={() => navigate(quelle ? '/eingang' : '/belege')}>Abbrechen</button>
      </div>
    </>
  )
}
