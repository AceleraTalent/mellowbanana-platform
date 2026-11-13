// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { estadoDeFases, faseActual, fasesAlMover, queSigue, type SenalesProyecto } from '@/lib/seguimiento/sistema'
import { SEGUIMIENTO_VACIO } from '@/lib/db/seguimiento-store'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { TableroSistema } from './TableroSistema'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
// jsdom no implementa el modal nativo.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { vi.unstubAllGlobals(); refresh.mockClear() })

function fila(id: string, nombre: string, s: Partial<SenalesProyecto>, seguimiento: Partial<FilaSistema['seguimiento']> = {}): FilaSistema {
  const senales: SenalesProyecto = {
    projectId: id, sesionesTotal: 0, sesionesCompletas: 0, tienePropuesta: false, pasos: [], estrategia: [], manual: {}, ...s,
  }
  const fases = estadoDeFases(senales)
  return {
    id, nombre, href: `/admin/projects/${id}`, inicio: '1 oct', inicioIso: '2026-10-01', avance: 0, tareas: { taller: [], landscape: [], estrategia: [], naming: [], diseno: [] }, fases, actual: faseActual(fases),
    sigue: queSigue(senales, fases), pasos: [],
    seguimiento: { ...SEGUIMIENTO_VACIO, fases: senales.manual, porFuera: !!senales.porFuera, ...seguimiento },
  }
}

const carril = (nombre: string) => within(screen.getByRole('region', { name: nombre }))
const arrastre = () => {
  const datos: Record<string, string> = {}
  return { setData: (k: string, v: string) => { datos[k] = v }, getData: (k: string) => datos[k] ?? '', effectAllowed: '', dropEffect: '' }
}

describe('TableroSistema · un carril por fase', () => {
  const filas = [
    fila('a', 'Viajero', { porFuera: true, manual: fasesAlMover('diseno') }, { encargado: 'Lina Buenahora', notas: 'Piezas nuevas', fechaEntrega: '2026-08-28' }),
    fila('d', 'Arbo', { porFuera: true, manual: { ...fasesAlMover('diseno'), diseno: 'pendiente' } }),
    fila('b', 'Glas', { porFuera: true, manual: fasesAlMover('terminado') }),
    fila('c', 'Grupo Heroica', { sesionesTotal: 4, sesionesCompletas: 4, tienePropuesta: true }),
  ]

  it('los carriles van en el orden del proceso, y cada cliente en el suyo', () => {
    render(<TableroSistema filas={filas} />)
    expect(screen.getAllByRole('region').map(r => r.getAttribute('aria-label')))
      .toEqual(['Taller', 'Landscape', 'Estrategia', 'Naming', 'Diseño', 'Terminado'])
    expect(carril('Diseño').getByText('Piezas nuevas')).toBeTruthy()
    expect(carril('Diseño').getByText('1 en curso, 1 sin empezar')).toBeTruthy()
    expect(carril('Taller').getByText('Grupo Heroica')).toBeTruthy()
    expect(carril('Estrategia').getByText('Nadie en Estrategia')).toBeTruthy()
  })

  it('la tarjeta dice el estado sólo si no está en curso, y quién lo lleva en iniciales', () => {
    render(<TableroSistema filas={filas} />)
    const viajero = within(carril('Diseño').getByRole('listitem', { name: 'Viajero' }))
    expect(viajero.queryByText('En curso')).toBeNull()
    expect(viajero.getByText('LB')).toBeTruthy()
    expect(within(carril('Diseño').getByRole('listitem', { name: 'Arbo' })).getByText('Sin empezar')).toBeTruthy()
  })

  it('lo terminado arranca plegado', () => {
    render(<TableroSistema filas={filas} />)
    expect(carril('Terminado').queryByText('Glas')).toBeNull()
    fireEvent.click(carril('Terminado').getByRole('button', { name: 'Mostrar' }))
    expect(carril('Terminado').getByText('Glas')).toBeTruthy()
  })

  it('arrastrar un cliente por fuera a otro carril lo mueve ahí sin esperar al servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TableroSistema filas={filas} />)
    const dt = arrastre()
    fireEvent.dragStart(carril('Diseño').getByRole('listitem', { name: 'Viajero' }), { dataTransfer: dt })
    fireEvent.dragOver(screen.getByRole('region', { name: 'Naming' }), { dataTransfer: dt })
    fireEvent.drop(screen.getByRole('region', { name: 'Naming' }), { dataTransfer: dt })
    expect(carril('Naming').getByText('Viajero')).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/a/seguimiento', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ moverA: 'naming' }),
    })))
    expect(refresh).toHaveBeenCalled()
  })

  it('si no se pudo guardar, vuelve a su carril y lo dice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Sin conexión' }) }))
    render(<TableroSistema filas={filas} />)
    const dt = arrastre()
    fireEvent.dragStart(carril('Diseño').getByRole('listitem', { name: 'Viajero' }), { dataTransfer: dt })
    fireEvent.drop(screen.getByRole('region', { name: 'Naming' }), { dataTransfer: dt })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No se pudo mover Viajero: Sin conexión')
    expect(carril('Diseño').getByText('Viajero')).toBeTruthy()
  })

  it('un cliente de la plataforma también se arrastra; un clic abre cualquier cliente para editarlo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TableroSistema filas={filas} />)
    const dt = arrastre()
    fireEvent.dragStart(carril('Taller').getByRole('listitem', { name: 'Grupo Heroica' }), { dataTransfer: dt })
    fireEvent.drop(screen.getByRole('region', { name: 'Diseño' }), { dataTransfer: dt })
    expect(carril('Diseño').getByText('Grupo Heroica')).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/c/seguimiento', expect.objectContaining({ body: JSON.stringify({ moverA: 'diseno' }) })))
    fireEvent.click(within(carril('Diseño').getByRole('listitem', { name: 'Viajero' })).getByRole('button'))
    expect(screen.getByRole('dialog', { name: 'Editar Viajero' })).toBeTruthy()
  })
})
