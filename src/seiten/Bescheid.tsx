// M8 / E12: Bescheid-Abgleich. Posten laut Erklärung gegen laut Bescheid, Abweichung, Notiz.
// Keine Bewertung, keine Fristberechnung: Bescheiddatum und Einspruchsfrist trägst du selbst ein.
import { useEffect, useState } from 'react'
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { speichereBescheidKopf, speichereBescheidPosten, speichereBescheidPostenListe } from '../daten/dienste'
import { useDaten, useStamm } from '../komponenten/hooks'
import { formatDatum, formatEuro, parseBetrag } from '../fachlich/format'
import { abweichung, bescheidSummen, tageBisFrist, vorschlagAusSummen, type BescheidKopf, type BescheidPosten } from '../fachlich/bescheid'
import { summenJeKategorie } from '../export/auswertung'
import { istAngemeldet } from '../google/auth'
import Info from '../komponenten/Info'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]
const centText = (c: number | null) => (c === null ? '' : formatEuro(c).replace(/\s?€/, ''))
const heute = () => new Date().toISOString().slice(0, 10)

function PostenKarte({ p, online, speichere, loesche }: { p: BescheidPosten; online: boolean; speichere: (p: BescheidPosten) => Promise<void>; loesche: (p: BescheidPosten) => Promise<void> }) {
  const [x, setX] = useState({ bezeichnung: p.bezeichnung, erkl: centText(p.erklaerung_ct), besch: centText(p.bescheid_ct), notiz: p.notiz })
  useEffect(() => setX({ bezeichnung: p.bezeichnung, erkl: centText(p.erklaerung_ct), besch: centText(p.bescheid_ct), notiz: p.notiz }), [p])
  const erkl = x.erkl.trim() ? parseBetrag(x.erkl) : null
  const besch = x.besch.trim() ? parseBetrag(x.besch) : null
  const falsch = (x.erkl.trim() && erkl === null) || (x.besch.trim() && besch === null)
  const geaendert = x.bezeichnung !== p.bezeichnung || erkl !== p.erklaerung_ct || besch !== p.bescheid_ct || x.notiz !== p.notiz
  const ab = abweichung({ erklaerung_ct: erkl, bescheid_ct: besch })
  return (
    <div className="karte">
      <label className="feld"><span>Posten<Info zu="Posten" /></span><input value={x.bezeichnung} onChange={(e) => setX({ ...x, bezeichnung: e.target.value })} /></label>
      <div className="zeile">
        <label className="feld"><span>laut Erklärung €<Info zu="laut Erklärung €" /></span><input inputMode="decimal" style={{ maxWidth: 130 }} value={x.erkl} className={x.erkl.trim() && erkl === null ? 'feld-fehler' : ''} onChange={(e) => setX({ ...x, erkl: e.target.value })} /></label>
        <label className="feld"><span>laut Bescheid €<Info zu="laut Bescheid €" /></span><input inputMode="decimal" style={{ maxWidth: 130 }} value={x.besch} className={x.besch.trim() && besch === null ? 'feld-fehler' : ''} onChange={(e) => setX({ ...x, besch: e.target.value })} /></label>
      </div>
      <p className={ab === null ? 'klein' : ab === 0 ? 'ok' : 'fehler'}>
        {ab === null ? 'Abweichung: erst beide Beträge eintragen' : ab === 0 ? 'Keine Abweichung' : `Abweichung: ${formatEuro(ab)}${ab < 0 ? ' (weniger anerkannt)' : ' (mehr anerkannt)'}`}
      </p>
      <label className="feld"><span>Notiz (z. B. Begründung im Bescheid, Rückfrage)<Info zu="Notiz (z. B. Begründung im Bescheid, Rückfrage)" /></span><input value={x.notiz} onChange={(e) => setX({ ...x, notiz: e.target.value })} /></label>
      <div className="zeile">
        <button disabled={!online || !geaendert || !!falsch || !x.bezeichnung.trim()} onClick={() => void speichere({ ...p, bezeichnung: x.bezeichnung.trim(), erklaerung_ct: erkl, bescheid_ct: besch, notiz: x.notiz })}>Speichern</button>
        <button className="zweit" disabled={!online} onClick={() => void loesche(p)}>Löschen</button>
      </div>
    </div>
  )
}

export default function Bescheid() {
  const { belege } = useDaten(AKTUELLES_JAHR)
  const stamm = useStamm(AKTUELLES_JAHR)
  const online = istAngemeldet()
  const [kopf, setKopf] = useState<BescheidKopf>(stamm.bescheidKopf)
  useEffect(() => setKopf(stamm.bescheidKopf), [stamm.bescheidKopf])
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')

  const tu = async (f: () => Promise<unknown>) => {
    setFehler(''); setLaeuft(true)
    try { await f() } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaeuft(false) }
  }
  const s = bescheidSummen(stamm.bescheid)
  const tage = tageBisFrist(stamm.bescheidKopf.einspruchsfrist, heute())
  const vorschlag = vorschlagAusSummen(konfig, summenJeKategorie({ konfig, belege }), stamm.bescheid, () => crypto.randomUUID())
  const kopfGeaendert = JSON.stringify(kopf) !== JSON.stringify(stamm.bescheidKopf)

  return (
    <>
      <h2 style={{ fontSize: '1.15rem' }}>Bescheid {AKTUELLES_JAHR} abgleichen</h2>
      <div className="karte">
        <p className="klein">Hier trägst du ein, was in der Erklärung stand und was das Finanzamt im Bescheid angesetzt hat. Die App bildet nur die Differenz und bewertet nichts. Ob ein Einspruch sinnvoll ist, klärst du mit der Steuerberatung.</p>
        <div className="zeile">
          <label className="feld"><span>Bescheid vom<Info zu="Bescheid vom" /></span><input type="date" value={kopf.bescheiddatum} onChange={(e) => setKopf({ ...kopf, bescheiddatum: e.target.value })} /></label>
          <label className="feld"><span>Einspruchsfrist bis (prüfen)<Info zu="Einspruchsfrist bis (prüfen)" /></span><input type="date" value={kopf.einspruchsfrist} onChange={(e) => setKopf({ ...kopf, einspruchsfrist: e.target.value })} /></label>
        </div>
        <p className="klein">Frist bitte selbst aus der Rechtsbehelfsbelehrung des Bescheids übernehmen, die App berechnet sie nicht.</p>
        <label className="feld"><span>Notiz<Info zu="Notiz" /></span><input value={kopf.notiz} onChange={(e) => setKopf({ ...kopf, notiz: e.target.value })} /></label>
        <button disabled={!online || laeuft || !kopfGeaendert} onClick={() => void tu(() => speichereBescheidKopf(AKTUELLES_JAHR, kopf))}>Speichern</button>
        {tage !== null && (
          <p className={tage < 0 ? 'fehler' : tage <= 14 ? 'warnung' : 'klein'}>
            {tage < 0 ? `Einspruchsfrist am ${formatDatum(stamm.bescheidKopf.einspruchsfrist)} abgelaufen.` : `Noch ${tage} Tag(e) bis zur eingetragenen Einspruchsfrist (${formatDatum(stamm.bescheidKopf.einspruchsfrist)}).`}
          </p>
        )}
      </div>

      <div className="karte">
        <h2>Ergebnis</h2>
        <p>Erklärung {formatEuro(s.erklaerung_ct)} · Bescheid {formatEuro(s.bescheid_ct)}</p>
        <p className={s.abweichung_ct === 0 ? 'ok' : 'fehler'}>Summe der Abweichungen: {formatEuro(s.abweichung_ct)} ({s.mitAbweichung} Posten mit Abweichung)</p>
        {s.offen > 0 && <p className="klein">{s.offen} Posten ohne Betrag laut Bescheid.</p>}
      </div>

      {stamm.bescheid.map((p) => (
        <PostenKarte key={p.id} p={p} online={online && !laeuft}
          speichere={(x) => tu(() => speichereBescheidPosten(AKTUELLES_JAHR, x))}
          loesche={(x) => tu(() => speichereBescheidPosten(AKTUELLES_JAHR, x, true))} />
      ))}

      <div className="karte">
        <div className="zeile">
          <button className="zweit" disabled={!online || laeuft} onClick={() => void tu(() => speichereBescheidPosten(AKTUELLES_JAHR, { id: crypto.randomUUID(), bezeichnung: 'Neuer Posten', modul: '', erklaerung_ct: null, bescheid_ct: null, notiz: '' }))}>Posten hinzufügen</button>
          <button className="zweit" disabled={!online || laeuft || !vorschlag.length} onClick={() => void tu(() => speichereBescheidPostenListe(AKTUELLES_JAHR, vorschlag))}>Posten aus Belegsummen anlegen ({vorschlag.length})</button>
        </div>
        <p className="klein">„Aus Belegsummen“ legt je Bereich einen Posten mit der Summe deiner Belege als Wert „laut Erklärung“ an (Annahme). Hat die Steuerberatung andere Werte erklärt, bitte den Betrag ändern.</p>
      </div>
      {laeuft && <p className="klein">Speichere …</p>}
      {fehler && <p className="fehler">{fehler}</p>}
      {!online && <p className="klein">Speichern geht nur angemeldet und mit Netz.</p>}
    </>
  )
}
