import { useEffect, useState } from 'react'
import { beiAenderung, belegCache, warteschlange, type Wartend } from '../daten/speicher'
import { stammCache, syncStatus } from '../daten/dienste'
import { LEER, type Stamm } from '../daten/stamm'
import type { Beleg } from '../fachlich/beleg'

/** Warteschlange, Belegindex-Kopie und Sync-Status; aktualisiert sich bei jeder Änderung. */
export function useDaten(jahr: number) {
  const [wartend, setWartend] = useState<Wartend[]>([])
  const [belege, setBelege] = useState<Beleg[]>([])
  const [laeuft, setLaeuft] = useState(false)
  useEffect(() => {
    let aktiv = true
    const lade = async () => {
      const [w, b] = await Promise.all([warteschlange.alle(), belegCache.lies(jahr)])
      if (!aktiv) return
      setWartend(w)
      setBelege(b)
      setLaeuft(syncStatus.laeuft)
    }
    void lade()
    const ab = beiAenderung(() => void lade())
    return () => { aktiv = false; ab() }
  }, [jahr])
  return { wartend, belege, laeuft }
}

/** Stammdaten (Objekte, Einheiten, Einnahmen, Aufteilung) aus der lokalen Kopie. */
export function useStamm(jahr: number) {
  const [stamm, setStamm] = useState<Stamm>(LEER)
  useEffect(() => {
    let aktiv = true
    const lade = async () => { const s = await stammCache.lies(jahr); if (aktiv) setStamm(s) }
    void lade()
    const ab = beiAenderung(() => void lade())
    return () => { aktiv = false; ab() }
  }, [jahr])
  return stamm
}
