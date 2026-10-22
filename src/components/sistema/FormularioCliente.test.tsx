// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { estadoDeFases, faseActual, fasesAlMover, queSigue, type SenalesProyecto } from '@/lib/seguimiento/sistema'
import { SEGUIMIENTO_VACIO } from '@/lib/db/seguimiento-store'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { FormularioCliente } from './FormularioCliente'

afterEach(() => vi.unstubAllGlobals())

function fila(s: Partial<SenalesProyecto>, seguimiento: Partial<FilaSistema['seguimiento']> = {}): FilaSistema {
  const senales: SenalesProyecto = {
    projectId: 'p1', sesionesTotal: 0, sesionesCompletas: 0, tienePropuesta: false, pasos: [], estrategia: [], manual: {}, ...s,
  }
  const fases = estadoDeFases(senales)
  return {
    id: 'p1', nombre: 'Viajero', href: '/admin/projects/p1', inicio: '1 oct', fases, actual: faseActual(fases),
    sigue: queSigue(senales, fases), pasos: [],
    seguimiento: { ...SEGUIMIENTO_VACIO, fases: senales.manual, porFuera: !!senales.porFuera, ...seguimiento },
  }
}

const fetchOk = () => {
  const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', f)
  return f
}
// Sólo los guardados: el formulario también pide los comentarios del cliente al abrirse.
const guardados = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter(c => (c[1] as RequestInit | undefined)?.method === 'PATCH')
const cuerpos = (f: ReturnType<typeof vi.fn>) => guardados(f).map(c => JSON.parse((c[1] as RequestInit).body as string))

describe('FormularioCliente · un cliente por fuera', () => {
  const porFuera = () => fila({ porFuera: true, manual: fasesAlMover('diseno') }, { encargado: 'Lina', notas: 'Piezas nuevas' })

  it('la fase se elige en el recorrido; moverlo y dejarlo sin empezar va en un solo guardado', async () => {
    const f = fetchOk()
    const onListo = vi.fn()
    render(<FormularioCliente enModal fila={porFuera()} onListo={onListo} onCancelar={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Diseño' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: 'Naming' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Sin empezar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onListo).toHaveBeenCalled())
    expect(cuerpos(f)).toEqual([{ moverA: 'naming', fase: { key: 'naming', estado: 'pendiente' } }])
  })

  it('esperando al cliente queda como frenado sin mover la fase; la fecha se manda sólo si cambió', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={porFuera()} onListo={() => {}} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Esperando al cliente' }))
    fireEvent.change(screen.getByLabelText('Entrega'), { target: { value: '2026-11-07' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardados(f)).toHaveLength(1))
    expect(cuerpos(f)[0]).toEqual({ estadoManual: 'cliente', fechaEntrega: '2026-11-07' })
  })

  it('sin cambios, guardar no toca el servidor', async () => {
    const f = fetchOk()
    const onListo = vi.fn()
    render(<FormularioCliente enModal fila={porFuera()} onListo={onListo} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onListo).toHaveBeenCalled())
    expect(guardados(f)).toHaveLength(0)
  })

  it('si el servidor dice que no, lo muestra y no cierra', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'fechaEntrega tiene que ser una fecha' }) }))
    const onListo = vi.fn()
    render(<FormularioCliente enModal fila={porFuera()} onListo={onListo} onCancelar={() => {}} />)
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Otra cosa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'fechaEntrega tiene que ser una fecha')
    expect(onListo).not.toHaveBeenCalled()
  })
})

describe('FormularioCliente · un cliente de la plataforma', () => {
  const deLaPlataforma = (faseAMano = false) =>
    fila({ sesionesTotal: 4, sesionesCompletas: 4, tienePropuesta: true, faseAMano, ...(faseAMano ? { manual: fasesAlMover('naming') } : {}) }, { faseAMano })

  it('se mueve como cualquier cliente: la fase queda a mano', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={deLaPlataforma()} onListo={() => {}} onCancelar={() => {}} />)
    expect(screen.getByText(/Se calcula sola con lo que se aprueba/)).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Diseño' }))
    expect(screen.getByText(/La fase la pone el equipo/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardados(f)).toHaveLength(1))
    expect(cuerpos(f)).toEqual([{ moverA: 'diseno' }])
  })

  it('con la fase puesta a mano, se puede volver a calcularla sola', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={deLaPlataforma(true)} onListo={() => {}} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calcularla sola' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardados(f)).toHaveLength(1))
    expect(cuerpos(f)).toEqual([{ calcular: true }])
  })

  it('pasarlo a por fuera arranca en la fase en la que va', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={fila({ sesionesTotal: 4, sesionesCompletas: 4, tienePropuesta: true })} onListo={() => {}} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Lleva su proceso por fuera' }))
    expect(screen.getByRole('radio', { name: 'Taller' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardados(f)).toHaveLength(1))
    expect(cuerpos(f)[0]).toEqual({ porFuera: true, moverA: 'taller' })
  })
})

describe('FormularioCliente · comentarios', () => {
  it('muestra la bitácora del cliente y publica un comentario sin esperar al Guardar', async () => {
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({ comentario: { id: 'c2', autor: 'Equipo M&B', texto: 'Aprobó la paleta', desde: 'panel', cuando: new Date().toISOString() } }) }
      return { ok: true, json: async () => ({ comentarios: [{ id: 'c1', autor: 'Lina (vía Claude)', texto: 'Pidió mover la entrega', desde: 'claude', cuando: new Date().toISOString() }] }) }
    })
    vi.stubGlobal('fetch', f)
    render(<FormularioCliente enModal fila={fila({ porFuera: true, manual: fasesAlMover('diseno') })} onListo={() => {}} onCancelar={() => {}} />)
    expect(await screen.findByText('Pidió mover la entrega')).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Nuevo comentario' }), { target: { value: 'Aprobó la paleta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comentar' }))
    expect(await screen.findByText('Aprobó la paleta')).toBeTruthy()
    expect(f).toHaveBeenCalledWith('/api/projects/p1/comentarios', expect.objectContaining({ method: 'POST', body: JSON.stringify({ texto: 'Aprobó la paleta' }) }))
  })
})
