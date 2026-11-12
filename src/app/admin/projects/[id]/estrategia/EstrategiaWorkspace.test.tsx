// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { buildEtapasEstrategia, ETAPA_LABEL, ETAPA_ORDER, type EstrategiaKey } from '@/lib/estrategia/stages'
import { queSigueEstrategia } from '@/lib/estrategia/sigue'
import { EstrategiaWorkspace, type ContenidoEstrategiaVista } from './EstrategiaWorkspace'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

const scrollIntoView = vi.fn()
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function version(id: string, texto: string, aprobada: boolean, borrador?: string): ContenidoEstrategiaVista {
  return {
    id,
    content: { hallazgo: texto },
    aprobada,
    procedencia: aprobada ? 'Escrito por Claude · hace 3 días · aprobada' : 'Escrito por Claude · hace 2 h · sin aprobar',
    cuando: 'hace 3 días',
    borradorNuevo: borrador ? { id: `${id}-nuevo`, content: { hallazgo: borrador }, cuando: 'hace 2 h', autor: 'Claude' } : null,
  }
}

/**
 * Un proyecto con el Diagnóstico aprobado, el Consumidor esperando revisión y el resto sin
 * empezar, salvo lo que pida cada prueba.
 */
function montar(opciones: { irA?: EstrategiaKey; contenido?: Partial<Record<EstrategiaKey, ContenidoEstrategiaVista>>; aprobadas?: EstrategiaKey[] } = {}) {
  const contenido: Partial<Record<EstrategiaKey, ContenidoEstrategiaVista>> = {
    diagnostico: version('vd', 'el diagnóstico', true),
    consumidor: version('vc', 'el consumidor', false),
    ...opciones.contenido,
  }
  const aprobadas = new Set<EstrategiaKey>(['diagnostico', ...(opciones.aprobadas ?? [])])
  const estado = ETAPA_ORDER.map(stage => ({
    stage,
    status: aprobadas.has(stage) ? 'aprobada' as const : contenido[stage] ? 'en_curso' as const : 'pendiente' as const,
  }))
  const sigue = queSigueEstrategia(estado.map(e => {
    const c = contenido[e.stage]
    return { key: e.stage, status: e.status, esperando: !!c && (!c.aprobada || !!c.borradorNuevo) }
  }))
  render(
    <EstrategiaWorkspace
      projectId="p1"
      proyecto="Grupo Heroica"
      irA={opciones.irA}
      etapas={buildEtapasEstrategia(estado)}
      contenidoPorEtapa={contenido as Record<string, ContenidoEstrategiaVista>}
      sigue={sigue}
    />,
  )
}

const seccion = (k: EstrategiaKey) => within(document.getElementById(k)!)
const encabezado = (k: EstrategiaKey) => seccion(k).getByRole('button', { name: new RegExp(`^\\d+${ETAPA_LABEL[k]}`) })

describe('EstrategiaWorkspace · toda la Estrategia en una página', () => {
  it('las dieciocho etapas son secciones, agrupadas en los bloques del proceso', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Estrategia' })).toBeTruthy()
    expect(document.querySelectorAll('section[aria-labelledby^="titulo-"]')).toHaveLength(18)
    expect(screen.getByText('Esencia de marca')).toBeTruthy()
    expect(screen.getByText('Naming y copies')).toBeTruthy()
  })

  it('abre sólo lo que sigue; lo aprobado se abre con un clic y no tiene botón de aprobar', () => {
    montar()
    expect(encabezado('consumidor').getAttribute('aria-expanded')).toBe('true')
    expect(encabezado('diagnostico').getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(encabezado('diagnostico'))
    expect(seccion('diagnostico').getByText('el diagnóstico')).toBeTruthy()
    expect(seccion('diagnostico').queryByRole('button', { name: 'Aprobar' })).toBeNull()
  })

  it('el link que nombra una etapa la abre y baja hasta ella', () => {
    montar({ irA: 'territorio' })
    expect(encabezado('territorio').getAttribute('aria-expanded')).toBe('true')
    expect(seccion('territorio').getByText(/Claude escribe acá Territorio/)).toBeTruthy()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
})

describe('EstrategiaWorkspace · lo que sigue', () => {
  it('lo que espera revisión va primero, y se aprueba en su sección', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar()

    expect(screen.getByText(/Lo que sigue · Te toca revisar/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Revisar/ }).getAttribute('href')).toBe('#consumidor')
    fireEvent.click(seccion('consumidor').getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/estrategia/consumidor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar', versionId: 'vc' }),
    })
  })

  it('sin nada por revisar, le toca a Claude la primera sin aprobar, y el botón lleva al chat', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const open = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('open', open)
    montar({ contenido: { consumidor: version('vc', 'el consumidor', true) }, aprobadas: ['consumidor'] })

    expect(screen.getByText(/Lo que sigue · Le toca a Claude/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Seguir en Claude/ }))
    await waitFor(() => expect(open).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toMatch(/^Sigamos con la Estrategia de Grupo Heroica\. Lo que sigue: objetivo de marca\./)
  })

  it('pedir cambios copia un pedido que nombra la etapa', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    montar()
    fireEvent.click(seccion('consumidor').getByRole('button', { name: 'Pedir cambios' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toMatch(/^Ajustemos Consumidor, de la Estrategia de Grupo Heroica\./)
  })
})

describe('EstrategiaWorkspace · el naming, si aplica', () => {
  it('el equipo lo marca como que no aplica desde su sección, y sólo ahí', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ irA: 'naming' })
    expect(screen.getAllByRole('button', { name: 'Marcar que no aplica' })).toHaveLength(1)
    fireEvent.click(seccion('naming').getByRole('button', { name: 'Marcar que no aplica' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/p1/estrategia/naming')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'no-aplica', noAplica: true }))
  })
})

describe('EstrategiaWorkspace · borrador nuevo sobre una etapa aprobada', () => {
  const conConflicto = () => montar({ contenido: { consumidor: version('vc', 'lo aprobado', true, 'lo nuevo') }, aprobadas: ['consumidor'] })

  it('muestra las dos versiones y “Aprobar la nueva” manda el borrador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    conConflicto()
    expect(seccion('consumidor').getByText('lo aprobado')).toBeTruthy()
    expect(seccion('consumidor').getByText('lo nuevo')).toBeTruthy()
    fireEvent.click(seccion('consumidor').getByRole('button', { name: 'Aprobar la nueva' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'aprobar', versionId: 'vc-nuevo' }))
  })

  it('“Mantener esta versión” ratifica la aprobada, y si falla lo dice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No existe el proyecto' }) })
    vi.stubGlobal('fetch', fetchMock)
    conConflicto()
    fireEvent.click(seccion('consumidor').getByRole('button', { name: 'Mantener esta versión' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'reafirmar' }))
    expect(await screen.findByText('No existe el proyecto')).toBeTruthy()
  })

  it('mirar sólo la aprobada no toca el servidor y se vuelve a un clic', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    conConflicto()
    fireEvent.click(seccion('consumidor').getByRole('button', { name: 'Ver sólo la aprobada' }))
    expect(seccion('consumidor').queryByText('lo nuevo')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(seccion('consumidor').getByRole('button', { name: 'Ver la versión nueva' }))
    expect(seccion('consumidor').getByText('lo nuevo')).toBeTruthy()
  })
})
