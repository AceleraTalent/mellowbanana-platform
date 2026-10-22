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
const cuerpos = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map(c => JSON.parse((c[1] as RequestInit).body as string))

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

  it('esperando al cliente queda como frenado; las notas y la fecha se mandan sólo si cambiaron', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={porFuera()} onListo={() => {}} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Esperando al cliente' }))
    fireEvent.change(screen.getByLabelText('Entrega'), { target: { value: '2026-11-07' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1))
    expect(cuerpos(f)[0]).toEqual({ moverA: 'diseno', estadoManual: 'cliente', fechaEntrega: '2026-11-07' })
  })

  it('sin cambios, guardar no toca el servidor', async () => {
    const f = fetchOk()
    const onListo = vi.fn()
    render(<FormularioCliente enModal fila={porFuera()} onListo={onListo} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onListo).toHaveBeenCalled())
    expect(f).not.toHaveBeenCalled()
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
  it('el recorrido es para mirar; a mano van el taller, el Naming y el Diseño', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={fila({ sesionesTotal: 4, sesionesCompletas: 4, tienePropuesta: true })} onListo={() => {}} onCancelar={() => {}} />)
    expect(screen.queryByRole('radiogroup', { name: 'Fase' })).toBeNull()
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Naming' })).getByRole('radio', { name: 'En curso' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f).toHaveBeenCalled())
    expect(cuerpos(f)).toEqual([{ fase: { key: 'naming', estado: 'en_curso' } }])
  })

  it('pasarlo a por fuera arranca en la fase en la que va', async () => {
    const f = fetchOk()
    render(<FormularioCliente enModal fila={fila({ sesionesTotal: 4, sesionesCompletas: 4, tienePropuesta: true })} onListo={() => {}} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Lleva su proceso por fuera' }))
    expect(screen.getByRole('radio', { name: 'Taller' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f).toHaveBeenCalled())
    expect(cuerpos(f)[0]).toMatchObject({ porFuera: true, moverA: 'taller', estadoManual: null })
  })
})
