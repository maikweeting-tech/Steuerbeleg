// E7: Kontoauszug-Abgleich. Die CSV wird nur im Browser gelesen und nicht gespeichert;
// im Belegindex landen nur Buchungen, die du ausdrücklich markierst (Blatt „Buchungen“).
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AKTUELLES_JAHR } from '../konfig'
import { markiereBuchung } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import { formatDatum, formatEuro } from '../fachlich/format'
import { buchungenAus, dekodiere, gleicheAb, liesKontoauszug, MARKIERUNGEN, type Buchung, type Einlesen, type Markierung, type Spalten } from '../fachlich/kontoauszug'
import { istAngemeldet } from '../google/auth'

const FELDER: { k: keyof Spalten; name: string; pflicht?: boolean }[] = [
  { k: 'datum', name: 'Buchungsdatum', pflicht: true }, { k: 'betrag', name: 'Betrag', pflicht: true },
  { k: 'gegenseite', name: 'Empfänger / Zahler' }, { k: 'zweck', name: 'Verwendungszweck' }, { k: 'sollHaben', name: 'Soll/Haben-Kennzeichen (S/H)' },
]

export default function Konto() {
  const { belege, wartend } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const online = istAngemeldet()
  const [datei, setDatei] = useState('')
  const [ein, setEin] = useState<Einlesen | null>(null)
  const [eingaenge, setEingaenge] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')

  const lies = async (f: File) => {
    setFehler('')
    try {
      const r = liesKontoauszug(dekodiere(new Uint8Array(await f.arrayBuffer())))
      setEin(r); setDatei(f.name)
    } catch (e) { setFehler(`Datei nicht lesbar: ${e instanceof Error ? e.message : String(e)}`) }
  }
  const ordneZu = (k: keyof Spalten, i: number) => {
    if (!ein) return
    const s = { ...ein.spalten, [k]: i, ...(k === 'betrag' && i >= 0 ? { soll: -1, haben: -1 } : {}) }
    setEin({ ...ein, spalten: s, ...buchungenAus(ein.zeilen, s) })
  }

  const markiert = useMemo(() => new Map(stamm.buchungen.map((b) => [b.id, b])), [stamm.buchungen])
  const alleBelege = useMemo(() => [...belege, ...wartend.map((w) => ({ ...w.entwurf, belegnr: 0, datei_ids: '', dateiname: '', erfasst_von: '', erfasst_am: '', geaendert_von: '', geaendert_am: '', version: 0 }))], [belege, wartend])
  const imJahr = (ein?.buchungen ?? []).filter((b) => b.datum.startsWith(String(AKTUELLES_JAHR)) && (eingaenge || b.betrag_ct < 0))
  const abgleich = gleicheAb(imJahr, alleBelege)
  const ohne = abgleich.filter((a) => !a.treffer.length && !markiert.has(a.buchung.id))
  const mit = abgleich.filter((a) => a.treffer.length)
  const mark = abgleich.filter((a) => !a.treffer.length && markiert.has(a.buchung.id))

  const setze = async (b: Buchung, m: Markierung | null) => {
    setFehler(''); setLaeuft(true)
    try { await markiereBuchung(AKTUELLES_JAHR, b, m) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }
  const erfassenLink = (b: Buchung) => `/erfassen?${new URLSearchParams({ betrag: String(Math.abs(b.betrag_ct)), datum: b.datum, aussteller: b.gegenseite })}`

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Kontoauszug abgleichen {AKTUELLES_JAHR}</h2>
      <div className="karte">
        <p className="klein">Im Online-Banking die Umsätze des Jahres als <strong>CSV</strong> exportieren (Sparkasse: „CSV-CAMT“, Volksbank: „CSV“). Die Datei wird nur hier im Browser gelesen und <strong>nicht gespeichert</strong>. Gespeichert werden nur Buchungen, die du unten markierst.</p>
        <label className="knopf zweit">
          <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(x) => { const f = x.target.files?.[0]; if (f) void lies(f); x.target.value = '' }} />
          <span>CSV-Datei wählen</span>
        </label>
        {ein && (
          <p className="klein">{datei}: erkannt als <strong>{ein.bank}</strong>, {ein.buchungen.length} Buchungen, davon {imJahr.length} {eingaenge ? '' : 'Ausgaben '}in {AKTUELLES_JAHR}.</p>
        )}
        {ein?.warnungen.map((w) => <p key={w} className="warnung klein">{w}</p>)}
        {ein && (
          <details open={!ein.buchungen.length}>
            <summary className="klein">Spalten zuordnen (falls etwas nicht stimmt)</summary>
            {FELDER.map((f) => (
              <label key={f.k} className="feld"><span>{f.name}{f.pflicht ? ' *' : ''}</span>
                <select value={ein.spalten[f.k]} onChange={(x) => ordneZu(f.k, Number(x.target.value))}>
                  <option value={-1}>– keine –</option>
                  {ein.kopf.map((k, i) => <option key={i} value={i}>{k || `Spalte ${i + 1}`}{ein.zeilen[0]?.[i] ? ` (z. B. ${ein.zeilen[0][i].slice(0, 25)})` : ''}</option>)}
                </select>
              </label>
            ))}
          </details>
        )}
        {ein && <label className="wahl"><input type="checkbox" checked={eingaenge} onChange={(x) => setEingaenge(x.target.checked)} /> auch Eingänge (Gutschriften) anzeigen</label>}
      </div>

      {ein && (
        <div className="karte">
          <h2>Zahlungen ohne Beleg ({ohne.length})</h2>
          <p className="klein">Kein Beleg mit gleichem Betrag und Datum ± 5 Tage. Bitte je Zahlung entscheiden.</p>
          {ohne.map(({ buchung: b }) => (
            <div key={b.id} className="buchung">
              <div><strong>{formatEuro(b.betrag_ct)}</strong> · {formatDatum(b.datum)} · {b.gegenseite || '–'}</div>
              <div className="klein">{b.zweck}</div>
              <div className="zeile">
                <Link to={erfassenLink(b)}><button className="zweit">Beleg erfassen</button></Link>
                {MARKIERUNGEN.map((m) => <button key={m.id} className="zweit" disabled={!online || laeuft} onClick={() => void setze(b, m.id)}>{m.name}</button>)}
              </div>
            </div>
          ))}
          {!ohne.length && <p className="ok">Zu jeder Zahlung gibt es einen Beleg oder eine Markierung.</p>}
        </div>
      )}

      {ein && mark.length > 0 && (
        <details className="karte">
          <summary>Markiert ({mark.length})</summary>
          {mark.map(({ buchung: b }) => (
            <div key={b.id} className="klein" style={{ padding: '3px 0' }}>
              {formatDatum(b.datum)} · {formatEuro(b.betrag_ct)} · {b.gegenseite} · <strong>{MARKIERUNGEN.find((m) => m.id === markiert.get(b.id)?.markierung)?.name}</strong>{' '}
              <button className="zweit" style={{ minHeight: 28, padding: '1px 8px' }} disabled={!online || laeuft} onClick={() => void setze(b, null)}>zurücksetzen</button>
            </div>
          ))}
        </details>
      )}

      {ein && mit.length > 0 && (
        <details className="karte">
          <summary>Mit Beleg ({mit.length})</summary>
          {mit.map(({ buchung: b, treffer }) => (
            <div key={b.id} className="klein" style={{ padding: '3px 0' }}>
              {formatDatum(b.datum)} · {formatEuro(b.betrag_ct)} · {b.gegenseite} → {treffer.map((t) => t.belegnr ? `Nr. ${t.belegnr}` : 'wartet').join(', ')}
            </div>
          ))}
        </details>
      )}

      {laeuft && <p className="klein">Speichere …</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {!online && <p className="klein">Markieren geht nur angemeldet und mit Netz. Lesen und Abgleichen geht auch so.</p>}
    </>
  )
}
