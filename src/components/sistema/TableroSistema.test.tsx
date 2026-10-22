// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { estadoDeFases, faseActual, fasesAlMover, queSigue, type SenalesProyecto } from '@/lib/seguimiento/sistema'
import { SEGUIMIENTO_VACIO } from '@/lib/db/seguimiento-store'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { TableroSistema } from './TableroSistema'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
afterEach(() => { vi.unstubAllGlobals(); refresh.mockClear() })

function fila(id: string, nombre: string, s: Partial<SenalesProyecto>, seguimiento: Partial<FilaSistema['seguimiento']> = {}): FilaSistema {
  const senales: SenalesProyecto = {
    projectId: id, sesionesTotal: 0, sesionesCompletas: 0, tienePropuesta: false, pasos: [], estrategia: [], manual: {}, ...s,
  }
  const fases = estadoDeFases(senales)
  return {
    id, nombre, href: `/admin/projects/${id}`, inicio: '1 oct', fases, actual: faseActual(fases),
    sigue: queSigue(senales, fases), pasos: [],
    seguimiento: { ...SEGUIMIENTO_VACIO, fases: senales.manual, porFuera: !!senales.porFuera, ...seguimiento },
  }
}

const columna = (nombre: string) => within(screen.getByRole('region', { name: nombre }))

describe('TableroSistema', () => {
  const filas = [
    fila('a', 'Viajero', { porFuera: true, manual: fasesAlMover('diseno') }, { encargado: 'Lina', notas: 'Piezas nuevas' }),
    fila('b', 'Glas', { porFuera: true, manual: fasesAlMover('terminado') }),
    fila('c', 'Grupo Heroica', { sesionesTotal: 4, sesionesCompletas: 4, tienePropuesta: true }),
  ]

  it('una columna por fase, y cada cliente en la suya', () => {
    render(<TableroSistema filas={filas} />)
    expect(screen.getAllByRole('region').map(r => r.getAttribute('aria-label')))
      .toEqual(['Taller', 'Landscape', 'Estrategia', 'Naming', 'Diseño', 'Terminado'])
    expect(columna('Diseño').getByText('Viajero')).toBeTruthy()
    expect(columna('Diseño').getByText('Piezas nuevas')).toBeTruthy()
    expect(columna('Terminado').getByText('Glas')).toBeTruthy()
    expect(columna('Taller').getByText('Grupo Heroica')).toBeTruthy()
  })

  it('un cliente por fuera se mueve de fase y se ve en la nueva sin esperar al servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TableroSistema filas={filas} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Viajero a otra fase' }), { target: { value: 'terminado' } })
    expect(columna('Terminado').getByText('Viajero')).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/a/seguimiento', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ moverA: 'terminado' }),
    })))
    expect(refresh).toHaveBeenCalled()
  })

  it('si no se pudo guardar, vuelve a su columna y lo dice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Sin conexión' }) }))
    render(<TableroSistema filas={filas} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Viajero a otra fase' }), { target: { value: 'naming' } })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No se pudo mover Viajero: Sin conexión')
    expect(columna('Diseño').getByText('Viajero')).toBeTruthy()
  })

  it('un cliente que hace su proceso en la plataforma no se arrastra ni se mueve a mano', () => {
    render(<TableroSistema filas={filas} />)
    expect(screen.queryByRole('combobox', { name: 'Mover Grupo Heroica a otra fase' })).toBeNull()
    expect(columna('Taller').getByRole('listitem', { name: 'Grupo Heroica' }).getAttribute('draggable')).toBe('false')
  })
})
