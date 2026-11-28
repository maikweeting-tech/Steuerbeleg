// Dokumentenliste aus Drive laden (nur angemeldet und online).
import { useCallback, useEffect, useState } from 'react'
import { ladeDokumente } from '../daten/dokumentablage'
import type { Dokument } from '../fachlich/dokumente'
import { istAngemeldet } from '../google/auth'

export function useDokumente() {
  const [liste, setListe] = useState<Dokument[]>([])
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')
  const neuLaden = useCallback(async () => {
    if (!istAngemeldet() || !navigator.onLine) return
    setLaedt(true); setFehler('')
    try { setListe(await ladeDokumente()) } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setLaedt(false) }
  }, [])
  useEffect(() => { void neuLaden() }, [neuLaden])
  return { liste, laedt, fehler, neuLaden }
}
