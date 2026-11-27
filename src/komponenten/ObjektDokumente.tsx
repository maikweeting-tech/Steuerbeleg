// Verträge und Dokumente eines Objekts (aus der Dokumentenablage).
import { Link } from 'react-router-dom'
import { useDokumente } from './useDokumente'
import { driveDateiLink, gueltigImJahr, zuordnungObjekt } from '../fachlich/dokumente'
import { formatDatum } from '../fachlich/format'
import { AKTUELLES_JAHR } from '../konfig'

export default function ObjektDokumente({ objektId }: { objektId: string }) {
  const { liste, laedt, fehler } = useDokumente()
  const z = zuordnungObjekt(objektId)
  const l = liste.filter((d) => d.zuordnung === z)
  return (
    <div className="karte">
      <h2>Verträge und Dokumente</h2>
      {laedt && <p className="klein">Lade …</p>}
      {fehler && <p className="fehler klein">{fehler}</p>}
      {!laedt && !l.length && <p className="klein">Noch keine Dokumente zu diesem Objekt.</p>}
      <ul className="liste">{l.map((d) => (
        <li key={d.id}>
          <a href={driveDateiLink(d.datei_id)} target="_blank" rel="noreferrer">{d.art}: {d.titel}</a>
          {d.gueltig_von && <span className="klein"> · ab {formatDatum(d.gueltig_von)}</span>}
          {d.gueltig_bis && <span className="klein"> · bis {formatDatum(d.gueltig_bis)}</span>}
          {!gueltigImJahr(d, AKTUELLES_JAHR) && <span className="klein"> (nicht gültig {AKTUELLES_JAHR})</span>}
        </li>
      ))}</ul>
      <Link to={`/dokumente?zuordnung=${encodeURIComponent(z)}`}>Dokument hinzufügen</Link>
    </div>
  )
}
