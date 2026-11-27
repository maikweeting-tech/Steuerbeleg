// Hinweis „Jahr anlegen“ erscheint nur, wenn das Jahr in Drive fehlt, und legt es auf Knopfdruck an.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const d = vi.hoisted(() => ({ jahrAngelegt: vi.fn(), legeJahrAn: vi.fn() }))
vi.mock('../src/daten/dienste', () => d)
import JahrAnlegen from '../src/komponenten/JahrAnlegen'

describe('Jahr anlegen', () => {
  afterEach(() => { cleanup(); vi.resetAllMocks() })
  it('fehlendes Jahr: Hinweis und Knopf, nach Anlegen verschwindet er', async () => {
    d.jahrAngelegt.mockResolvedValue(false)
    d.legeJahrAn.mockResolvedValue({})
    render(<JahrAnlegen />)
    const knopf = await screen.findByRole('button', { name: /Jahr \d{4} anlegen/ })
    fireEvent.click(knopf)
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull())
    expect(d.legeJahrAn).toHaveBeenCalledTimes(1)
  })
  it.each([true, null])('Jahr vorhanden bzw. unbekannt (%s): kein Hinweis', async (x) => {
    d.jahrAngelegt.mockResolvedValue(x)
    const { container } = render(<JahrAnlegen />)
    await waitFor(() => expect(d.jahrAngelegt).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})
