// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { TablaSistema, estadoDe } from './TablaSistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { FASES, FASE_LABEL, type FaseSistema, type Quien } from '@/lib/seguimiento/sistema'
import { SEGUIMIENTO_VACIO } from '@/lib/db/seguimiento-store'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }))

afterEach(() => cleanup())

function fila(id: string, actual: FaseSistema, quien: Quien, texto: string): FilaSistema {
  return {
    id,
    nombre: `Cliente ${id}`,
    href: `/admin/projects/${id}`,
    inicio: '14 oct', inicioIso: '2026-10-14', avance: 0, tareas: { taller: [], landscape: [], estrategia: [], naming: [], diseno: [] },
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

const nombres = () => within(screen.getByRole('table', { name: 'Clientes' })).getAllByRole('button').map(l => l.textContent)

describe('TablaSistema', () => {
  it('lo que espera al equipo va primero, y cuenta los proyectos', () => {
    render(<TablaSistema filas={filas} />)
    expect(nombres()).toEqual(['Cliente c', 'Cliente a', 'Cliente b'])
    expect(screen.getByText('3 proyectos')).toBeTruthy()
  })

  it('con una fase elegida en el menú muestra sólo esa', () => {
    render(<TablaSistema filas={filas} fase="landscape" />)
    expect(screen.getByRole('heading', { name: 'Proyectos en Landscape' })).toBeTruthy()
    expect(nombres()).toEqual(['Cliente c', 'Cliente a'])
  })

  it('una fase sin clientes lo dice', () => {
    render(<TablaSistema filas={filas} fase="naming" />)
    expect(screen.getByText('No hay clientes en Naming.')).toBeTruthy()
  })

  it('el valor es una columna sólo para dirección', () => {
    const { unmount } = render(<TablaSistema filas={filas.map(f => ({ ...f, seguimiento: { ...f.seguimiento, valor: 46_000_000 } }))} />)
    expect(screen.getByRole('columnheader', { name: 'Valor' })).toBeTruthy()
    expect(screen.getAllByText('$46M')).toHaveLength(3)
    unmount()
    render(<TablaSistema filas={filas.map(f => ({ ...f, valorOculto: true }))} />)
    expect(screen.queryByRole('columnheader', { name: 'Valor' })).toBeNull()
  })

  it('el estado sale de la fecha de entrega', () => {
    const hoy = new Date('2026-11-13T15:00:00Z')
    const con = (fechaEntrega: string | null, avance = 0) => ({ ...filas[0], avance, seguimiento: { ...filas[0].seguimiento, fechaEntrega } })
    expect(estadoDe(con(null), hoy).texto).toBe('Sin fecha')
    expect(estadoDe(con('2026-10-01'), hoy).texto).toBe('Atrasado')
    expect(estadoDe(con('2026-11-20', 30), hoy).texto).toBe('En riesgo')
    expect(estadoDe(con('2026-11-20', 90), hoy).texto).toBe('En tiempo')
    expect(estadoDe(con('2027-02-01'), hoy).texto).toBe('En tiempo')
  })
})
