// Vorjahresvergleich auf der Seite „Check“: Kategorien und Aussteller aus dem Vorjahr, die im gewählten Jahr fehlen.
// „Fällt weg“ wird gemeinsam im Belegindex gespeichert (Blatt Erklaerung, id „vj:…“), damit beide es sehen.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { ladeVorjahr, speichereAntwort } from '../daten/dienste'
import type { Beleg } from '../fachlich/beleg'
import type { Wartend } from '../daten/speicher'
import { vergleicheVorjahr, type AusstellerVergleich } from '../fachlich/vorjahr'
import { formatDatum, formatEuro } from '../fachlich/format'
import { katName, modulName } from '../export/auswertung'
import type { Antworten } from '../fachlich/assistent'
import Info from './Info'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
export const VJ = 'vj:'

export default function VorjahrKarte({ belege, wartend, antworten, online }: { belege: Beleg[]; wartend: Wartend[]; antworten: Antworten; online: boolean }) {
  const navigate = useNavigate()
  const [vorjahr, setVorjahr] = useState<Beleg[] | null | undefined>(undefined)
  const [laeuft, setLaeuft] = useState('')
  const [fehler, setFehler] = useState('')
  useEffect(() => {
    if (!online) return
    let aktiv = true
    void ladeVorjahr(AKTUELLES_JAHR).then((v) => { if (aktiv) setVorjahr(v) })
    return () => { aktiv = false }
  }, [online])

  const ausgeblendet = useMemo(() => new Set(Object.entries(antworten ?? {}).filter(([k, a]) => k.startsWith(VJ) && a.wert).map(([k]) => k.slice(VJ.length))), [antworten])
  const v = useMemo(() => vorjahr ? vergleicheVorjahr(vorjahr, [...belege, ...wartend.map((w) => w.entwurf)], ausgeblendet) : null, [vorjahr, belege, wartend, ausgeblendet])

  const markiere = async (schluessel: string, weg: boolean) => {
    setFehler(''); setLaeuft(schluessel)
    try { await speichereAntwort(AKTUELLES_JAHR, VJ + schluessel, weg ? 'entfaellt' : '', '') } catch (x) { setFehler(x instanceof Error ? x.message : String(x)) } finally { setLaeuft('') }
  }
  const erfassen = (a: AusstellerVergleich) => `/erfassen?${new URLSearchParams({ aussteller: a.aussteller, modul: a.modul, kategorie: a.kategorie })}`
  const kat = (m: string, k: string) => `${modulName(konfig, m)} · ${katName(konfig, m, k)}`
  const wegKnopf = (schluessel: string) => (
    <button className="zweit" style={{ minHeight: 28, padding: '1px 8px' }} disabled={!online || !!laeuft} onClick={() => void markiere(schluessel, true)}>Fällt weg</button>
  )
  const zeile = (a: AusstellerVergleich, teil: boolean) => (
    <li key={a.schluessel} style={{ marginBottom: 6 }}>
      <strong>{a.aussteller}</strong> <span className="klein">· {kat(a.modul, a.kategorie)}</span><br />
      <span className="klein">
        {AKTUELLES_JAHR - 1}: {a.vorjahrAnzahl} Beleg(e), {formatEuro(a.vorjahrSumme_ct)}, zuletzt {formatDatum(a.letztesDatum)}
        {a.letzterBetrag_ct !== null ? ` (${formatEuro(a.letzterBetrag_ct)})` : ''}
        {teil ? ` · ${AKTUELLES_JAHR}: erst ${a.aktuellAnzahl}` : ''}
      </span>{' '}
      <button style={{ minHeight: 28, padding: '1px 8px' }} onClick={() => navigate(erfassen(a))}>Jetzt erfassen</button>{' '}
      {wegKnopf(a.schluessel)}
    </li>
  )

  const anzahlWeg = ausgeblendet.size
  return (
    <div className="karte">
      <h2>Vorjahresvergleich {AKTUELLES_JAHR - 1} → {AKTUELLES_JAHR}<Info text="Zeigt, was im Vorjahr da war und im gewählten Jahr noch fehlt: ganze Kategorien und einzelne Aussteller (z. B. Versicherung, Grundsteuer). Was es dieses Jahr wirklich nicht mehr gibt, mit „Fällt weg“ ausblenden – das sieht dann auch die andere Person." /></h2>
      {!online && <p className="klein">Nur angemeldet und mit Netz.</p>}
      {online && vorjahr === undefined && <p className="klein">Lade Belegindex {AKTUELLES_JAHR - 1} …</p>}
      {online && vorjahr === null && <p className="klein">Kein Belegindex {AKTUELLES_JAHR - 1} gefunden – nichts zu vergleichen.</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {v && (
        <>
          {!v.kategorien.length && !v.fehlend.length && !v.weniger.length && <p className="ok">Alles aus {AKTUELLES_JAHR - 1} ist auch {AKTUELLES_JAHR} vorhanden.</p>}
          {v.kategorien.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem' }}>Kategorien ohne Beleg in {AKTUELLES_JAHR} ({v.kategorien.length})</h3>
              <ul className="liste">{v.kategorien.map((k) => {
                const s = `kat:${k.modul}|${k.kategorie}`
                return <li key={s}>{kat(k.modul, k.kategorie)} <span className="klein">· {AKTUELLES_JAHR - 1}: {k.vorjahrAnzahl} Beleg(e), {formatEuro(k.vorjahrSumme_ct)}</span> {wegKnopf(s)}</li>
              })}</ul>
            </>
          )}
          {v.fehlend.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem' }}>Aussteller fehlen in {AKTUELLES_JAHR} ({v.fehlend.length})</h3>
              <ul className="liste">{v.fehlend.map((a) => zeile(a, false))}</ul>
            </>
          )}
          {v.weniger.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem' }}>Weniger Belege als im Vorjahr ({v.weniger.length})</h3>
              <ul className="liste">{v.weniger.map((a) => zeile(a, true))}</ul>
            </>
          )}
          {anzahlWeg > 0 && (
            <details>
              <summary className="klein">{anzahlWeg} als „fällt weg“ ausgeblendet</summary>
              <ul className="liste klein">{[...ausgeblendet].map((s) => (
                <li key={s}>{s.startsWith('kat:') ? (() => { const [m, k] = s.slice(4).split('|'); return kat(m, k) })() : s.slice(4)}{' '}
                  <button className="zweit" style={{ minHeight: 26, padding: '0 8px' }} disabled={!online || !!laeuft} onClick={() => void markiere(s, false)}>wieder zeigen</button></li>
              ))}</ul>
            </details>
          )}
          <p className="klein">Vergleich über den Aussteller (Schreibweise wird vereinheitlicht) und Modul/Kategorie. Nur übertragene und wartende Belege zählen.</p>
        </>
      )}
    </div>
  )
}
