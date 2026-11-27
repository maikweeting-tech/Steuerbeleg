// Vorschläge beim Erfassen (M5): aus der Texterkennung und aus früheren Belegen desselben Ausstellers.
// Nichts wird automatisch eingetragen – der Nutzer übernimmt jeden Vorschlag selbst.
import { AKTUELLES_JAHR, KONFIGURATIONEN } from '../konfig'
import { formatDatum, formatEuro } from '../fachlich/format'
import type { BelegEntwurf } from '../fachlich/beleg'
import type { Zuordnung } from '../fachlich/texterkennung'
import type { OcrStand } from '../erfassung/ocr'
import type { Stamm } from '../daten/stamm'

const konfig = KONFIGURATIONEN[AKTUELLES_JAHR]

type Feld = 'datum' | 'betrag' | 'aussteller' | 'lohn'

export function OcrVorschlaege({ ocr, e, uebernimm, neuErkennen }: {
  ocr: OcrStand
  e: BelegEntwurf
  uebernimm: (felder: Feld[]) => void
  neuErkennen?: () => void
}) {
  if (ocr.status === 'aus') return null
  if (ocr.status === 'laeuft')
    return <p className="klein">🔎 Texterkennung läuft … {ocr.fortschritt ? `${Math.round(ocr.fortschritt * 100)} %` : '(beim ersten Mal wird das Programm geladen)'}</p>
  if (ocr.status === 'fehler')
    return <p className="klein fehler">Texterkennung nicht möglich: {ocr.fehler} {neuErkennen && <button className="zweit" onClick={neuErkennen}>Nochmal</button>}</p>
  const v = ocr.vorschlag
  if (!v) return null
  const zeilen: { feld: Feld; name: string; wert: string; gleich: boolean }[] = []
  if (v.belegdatum) zeilen.push({ feld: 'datum', name: 'Belegdatum', wert: formatDatum(v.belegdatum), gleich: e.belegdatum === v.belegdatum })
  if (v.betrag_ct !== null) zeilen.push({ feld: 'betrag', name: 'Betrag brutto', wert: formatEuro(v.betrag_ct), gleich: e.betrag_ct === v.betrag_ct })
  if (v.aussteller) zeilen.push({ feld: 'aussteller', name: 'Aussteller', wert: v.aussteller, gleich: e.aussteller === v.aussteller })
  if (v.arbeitskosten_ct !== null || v.material_ct !== null)
    zeilen.push({
      feld: 'lohn', name: '§ 35a Arbeit / Material',
      wert: `${v.arbeitskosten_ct === null ? '–' : formatEuro(v.arbeitskosten_ct)} / ${v.material_ct === null ? '–' : formatEuro(v.material_ct)}`,
      gleich: e.arbeitskosten_ct === v.arbeitskosten_ct && e.material_ct === v.material_ct,
    })
  const offen = zeilen.filter((z) => !z.gleich && (z.feld !== 'lohn' || e.modul === '35A'))
  return (
    <div className="karte vorschlag">
      <strong>Vorschläge aus dem Belegtext</strong> <span className="klein">(bitte mit dem Beleg vergleichen)</span>
      {zeilen.length ? (
        <table className="vorschlaege"><tbody>
          {zeilen.map((z) => (
            <tr key={z.feld}>
              <td className="klein">{z.name}</td>
              <td><strong>{z.wert}</strong></td>
              <td>{z.gleich ? <span className="ok klein">✓ übernommen</span>
                : z.feld === 'lohn' && e.modul !== '35A' ? <span className="klein">erst Modul § 35a wählen</span>
                : <button className="zweit" onClick={() => uebernimm([z.feld])}>Übernehmen</button>}</td>
            </tr>
          ))}
        </tbody></table>
      ) : <p className="klein">Im Text wurde nichts Brauchbares gefunden. Bitte von Hand eintragen.</p>}
      {offen.length > 1 && <button onClick={() => uebernimm(offen.map((z) => z.feld))}>Alle übernehmen</button>}
      {v.betragZeile && <p className="klein">Betrag aus der Zeile: „{v.betragZeile}“</p>}
      {(v.arbeitskosten_ct !== null || v.material_ct !== null) && e.modul !== '35A' && (
        <p className="klein">Lohn-/Materialanteil erkannt. Falls es eine Handwerker- oder Haushaltsrechnung ist: Modul „§ 35a“ wählen (prüfen).</p>
      )}
      <details>
        <summary className="klein">Erkannten Text anzeigen</summary>
        <pre className="ocr-text">{ocr.text.trim() || '(kein Text)'}</pre>
      </details>
      {neuErkennen && <button className="zweit" style={{ marginTop: 6 }} onClick={neuErkennen}>Text neu erkennen (z. B. nach Zuschneiden)</button>}
    </div>
  )
}

export function AusstellerVorschlag({ z, stamm, uebernimm }: { z: Zuordnung & { aussteller: string; anzahl: number }; stamm: Stamm; uebernimm: () => void }) {
  const modul = konfig.module.find((m) => m.id === z.modul)
  const kat = modul?.kategorien.find((k) => k.schluessel === z.kategorie)?.name
  const obj = z.objekt_id ? stamm.objekte.find((o) => o.id === z.objekt_id)?.bezeichnung : ''
  const kind = z.kind_id ? stamm.kinder.find((k) => k.id === z.kind_id)?.name : ''
  const person = konfig.personen.find((p) => p.id === z.person)?.name ?? (z.person === 'gemeinsam' ? 'gemeinsam' : z.person)
  return (
    <div className="karte vorschlag">
      <span className="klein">Bei „{z.aussteller}“ zuletzt ({z.anzahl} Beleg{z.anzahl === 1 ? '' : 'e'}):</span>{' '}
      <strong>{[modul?.name.split(' – ')[0] ?? z.modul, kat, obj, kind, person].filter(Boolean).join(' › ')}</strong>{' '}
      <button className="zweit" onClick={uebernimm}>Übernehmen</button>
    </div>
  )
}
