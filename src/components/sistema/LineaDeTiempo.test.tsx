// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { estadoDeFases, faseActual, queSigue, type SenalesProyecto } from '@/lib/seguimiento/sistema'
import { SEGUIMIENTO_VACIO } from '@/lib/db/seguimiento-store'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { LineaDeTiempo } from './LineaDeTiempo'

function fila(nombre: string, inicioIso: string, fechaEntrega: string | null, manual: SenalesProyecto['manual'] = {}): FilaSistema {
  const senales: SenalesProyecto = { projectId: nombre, sesionesTotal: 0, sesionesCompletas: 0, tienePropuesta: false, pasos: [], estrategia: [], manual, porFuera: true }
  const fases = estadoDeFases(senales)
  return {
    id: nombre, nombre, href: `/admin/projects/${nombre}`, inicio: '1 sep', inicioIso, avance: 0,
    tareas: { taller: [], landscape: [], estrategia: [], naming: [], diseno: [] }, fases, actual: faseActual(fases),
    sigue: queSigue(senales, fases), pasos: [], seguimiento: { ...SEGUIMIENTO_VACIO, porFuera: true, fases: manual, fechaEntrega },
  }
}

const hoy = new Date('2026-11-13T15:00:00Z')
const renglon = (nombre: string) => within(screen.getByRole('link', { name: new RegExp(nombre) }).closest('li')!)

describe('LineaDeTiempo', () => {
  it('con inicio y entrega dibuja la barra partida en las cinco fases', () => {
    render(<LineaDeTiempo hoy={hoy} filas={[fila('Arbo', '2026-09-01', '2026-12-15', { taller: 'completa', landscape: 'en_curso' })]} />)
    const barra = renglon('Arbo').getByTitle(/Arbo: del 1 sep al 15 dic/)
    expect(barra.children).toHaveLength(5)
    // Lo hecho y lo que está andando va en el color de la fase; lo que falta, apagado.
    expect([...barra.children].map(c => c.className.includes('bg-[var(--f)]'))).toEqual([true, true, false, false, false])
  })

  it('si la entrega es anterior al inicio muestra sólo el día de entrega, y lo explica', () => {
    render(<LineaDeTiempo hoy={hoy} filas={[fila('Glas', '2026-10-21', '2026-06-01')]} />)
    expect(renglon('Glas').getByText('Entrega 1 jun')).toBeTruthy()
    expect(screen.getByText(/1 cliente muestra sólo el día de entrega/)).toBeTruthy()
  })

  it('sin fecha de entrega lo dice en el renglón y al pie', () => {
    render(<LineaDeTiempo hoy={hoy} filas={[fila('Luciano', '2026-10-21', null)]} />)
    expect(renglon('Luciano').getByText('Sin fecha de entrega')).toBeTruthy()
    expect(screen.getByText(/1 cliente no tiene fecha de entrega/)).toBeTruthy()
  })
})
