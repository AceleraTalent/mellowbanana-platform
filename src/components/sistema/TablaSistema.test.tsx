// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TablaSistema } from './TablaSistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { FASES, FASE_LABEL, type FaseSistema, type Quien } from '@/lib/seguimiento/sistema'
import { SEGUIMIENTO_VACIO } from '@/lib/db/seguimiento-store'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

afterEach(() => vi.unstubAllGlobals())
// jsdom no implementa el modal nativo.
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') } })

function fila(id: string, actual: FaseSistema, quien: Quien, texto: string): FilaSistema {
  return {
    id,
    nombre: `Cliente ${id}`,
    href: `/admin/projects/${id}`,
    inicio: '14 oct',
    fases: FASES.map(key => ({ key, label: FASE_LABEL[key], estado: key === actual ? 'en_curso' : 'pendiente', detalle: 'detalle' })),
    actual,
    sigue: { quien, texto },
    seguimiento: SEGUIMIENTO_VACIO,
    pasos: [],
  }
}

const filas = [
  fila('a', 'landscape', 'claude', 'Le toca a Claude'),
  fila('b', 'taller', 'cliente', 'Esperando entrevistas'),
  fila('c', 'landscape', 'revisar', 'Por revisar'),
]

const nombres = () => within(screen.getByRole('list', { name: 'Clientes' })).getAllByRole('link').map(l => l.textContent).filter(t => t?.startsWith('Cliente'))

describe('TablaSistema', () => {
  it('lo que espera al equipo va primero', () => {
    render(<TablaSistema filas={filas} />)
    expect(nombres()).toEqual(['Cliente c', 'Cliente a', 'Cliente b'])
    expect(screen.getByText('1 cliente espera al equipo')).toBeTruthy()
  })

  it('las pestañas cuentan clientes por fase y filtran', () => {
    render(<TablaSistema filas={filas} />)
    fireEvent.click(screen.getByRole('button', { name: /^Landscape 2$/ }))
    expect(nombres()).toEqual(['Cliente c', 'Cliente a'])
    fireEvent.click(screen.getByRole('button', { name: /^Naming 0$/ }))
    expect(screen.getByText('No hay clientes en Naming.')).toBeTruthy()
  })

  it('el encargado se guarda al salir del campo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TablaSistema filas={filas} />)
    const campo = screen.getByRole('textbox', { name: 'Encargado de Cliente a' })
    fireEvent.change(campo, { target: { value: '  Isa ' } })
    fireEvent.blur(campo)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/a/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encargado: 'Isa' }),
    })
  })

  it('un clic en la fase abre el cliente en el modal; lo que calcula la plataforma no se mueve a mano', () => {
    render(<TablaSistema filas={filas} />)
    fireEvent.click(screen.getByRole('button', { name: /Fase de Cliente a/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar Cliente a' })
    expect(within(dialogo).queryByRole('radiogroup', { name: 'Fase' })).toBeNull()
    expect(within(dialogo).getByRole('radiogroup', { name: 'Naming' })).toBeTruthy()
  })
})
