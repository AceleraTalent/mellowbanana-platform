// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MIN_TENDENCIAS, MAX_TENDENCIAS, STAGE_ORDER, type StageKey, type TendenciaCandidata } from '@/lib/landscape/stages'
import { estadoDePasos, type EtapaParaPasos } from '@/lib/landscape/pasos'
import type { PiezaKey } from '@/lib/landscape/piezas'
import { LandscapeWorkspace, type ContenidoEtapaVista } from './LandscapeWorkspace'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

// jsdom no hace scroll: basta con saber que se pidió.
const scrollIntoView = vi.fn()
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** El contexto con sus fuentes: así sus dos pasos están hechos cuando se aprueba. */
const CONTENIDO_CONTEXTO = { hallazgo: 'lo aprobado', fuentes: [{ titulo: 'Informe del sector', url: 'https://informe.example.com' }] }

/** El contexto aprobado y, si se pide, un borrador que Claude escribió después. */
function contexto({ conBorrador, aprobada = true }: { conBorrador: boolean; aprobada?: boolean }): ContenidoEtapaVista {
  return {
    id: 'v1',
    content: CONTENIDO_CONTEXTO,
    aprobada,
    procedencia: aprobada ? 'Escrito por Claude · hace 3 días · aprobada' : 'Escrito por Claude · hace 2 h · sin aprobar',
    cuando: 'hace 3 días',
    borradorNuevo: conBorrador
      ? { id: 'v2', content: { hallazgo: 'lo nuevo' }, cuando: 'hace 2 h', autor: 'Claude' }
      : null,
  }
}

function montar(opciones: {
  /** La sección que pide el link. */
  irA?: StageKey
  /** El enfoque ya aprobado: así lo que sigue deja de ser de Claude en el Enfoque. */
  conEnfoque?: boolean
  conBorrador?: boolean
  aprobada?: boolean
  tendencias?: TendenciaCandidata[]
  seleccion?: string[]
  marcados?: string[]
  dependencia?: string
  /** Lo que Claude dejó en la Entrega, sin aprobar. */
  entrega?: Record<string, unknown>
  diagnosticoNoAplica?: boolean
  /** Piezas que Claude guardó, sin aprobar. */
  piezas?: Partial<Record<string, Record<string, unknown>>>
}) {
  const { conBorrador = false, aprobada = true, tendencias = [], seleccion = [], marcados = [] } = opciones
  const etapas: EtapaParaPasos[] = STAGE_ORDER.map(stage => ({ stage, status: 'pendiente', contenido: null, cerrada: false }))
  if (opciones.entrega)
    Object.assign(etapas.find(e => e.stage === 'entrega')!, { status: 'en_curso', contenido: opciones.entrega })
  if (opciones.diagnosticoNoAplica)
    Object.assign(etapas.find(e => e.stage === 'diagnostico')!, { status: 'no_aplica' })
  if (opciones.conEnfoque)
    Object.assign(etapas.find(e => e.stage === 'setup')!, { status: 'aprobada', contenido: { nombre: 'el enfoque' }, cerrada: true })
  const ctx = etapas.find(e => e.stage === 'contexto')!
  Object.assign(ctx, { status: aprobada ? 'aprobada' : 'en_curso', contenido: CONTENIDO_CONTEXTO, cerrada: aprobada && !conBorrador })
  if (tendencias.length)
    Object.assign(etapas.find(e => e.stage === 'tendencias')!, {
      status: seleccion.length ? 'aprobada' : 'en_curso',
      contenido: { candidatas: tendencias, seleccionadas: seleccion },
      cerrada: seleccion.length > 0,
    })
  const piezas = Object.entries(opciones.piezas ?? {}).map(([pieza, contenido]) => ({ pieza: pieza as PiezaKey, contenido, cerrada: false }))
  const pasos = estadoDePasos(etapas, new Set(marcados), piezas)
  const props = {
    projectId: 'p1',
    proyecto: 'Grupo Heroica',
    pasos,
    tendencias,
    seleccionAprobada: seleccion,
    tendenciasAprobadas: seleccion.length > 0,
    contenidoPorEtapa: {
      setup: opciones.conEnfoque
        ? { id: 've', content: { nombre: 'el enfoque' }, aprobada: true, procedencia: 'Escrito por Claude · hace 6 días · aprobada', cuando: 'hace 6 días', borradorNuevo: null }
        : null,
      contexto: contexto({ conBorrador, aprobada }),
      ...Object.fromEntries(Object.entries(opciones.piezas ?? {}).map(([k, content]) => [k,
        { id: `v-${k}`, content, aprobada: false, procedencia: 'Escrito por Claude · recién · sin aprobar', cuando: 'recién', borradorNuevo: null }])),
      entrega: opciones.entrega
        ? { id: 'ventrega', content: opciones.entrega, aprobada: false, procedencia: 'Escrito por Claude · hace 1 h · sin aprobar', cuando: 'hace 1 h', borradorNuevo: null }
        : null,
      tendencias: seleccion.length
        ? { id: 'vt', content: { candidatas: tendencias, seleccionadas: seleccion }, aprobada: true, procedencia: 'Escrito por Claude · hace 1 día · aprobada', cuando: 'hace 1 día', borradorNuevo: null }
        : null,
    } as Record<string, ContenidoEtapaVista>,
    actividad: [],
    dependencia: opciones.dependencia,
  }
  const r = render(<LandscapeWorkspace {...props} irA={opciones.irA} />)
  return { ...r, props, pasos }
}

/** Una sección de la página, por su etapa. */
const seccion = (etapa: StageKey) => within(document.getElementById(etapa)!)
const encabezado = (etapa: StageKey) => seccion(etapa).getByRole('button', { expanded: undefined, name: new RegExp(`^0\\d`) })

describe('LandscapeWorkspace · todo el Landscape en una página', () => {
  it('las seis etapas son secciones de la misma página, en orden', () => {
    montar({})
    expect(screen.getByRole('heading', { level: 1, name: 'Landscape' })).toBeTruthy()
    const secciones = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
    expect(secciones.map(t => t!.replace(/^\d+/, '').replace(/(Listo|Por revisar|Te toca|Le toca a Claude|Más adelante|No aplica)▾$/, '')))
      .toEqual(['Enfoque', 'Contexto del sector', 'Tendencias', 'Panorama de categoría', 'Diagnóstico', 'Entrega'])
  })

  it('abre sólo la sección donde hay trabajo; las demás se leen por su estado', () => {
    montar({})
    // Lo que sigue es el enfoque (le toca a Claude): esa sección está abierta.
    expect(encabezado('setup').getAttribute('aria-expanded')).toBe('true')
    expect(encabezado('contexto').getAttribute('aria-expanded')).toBe('false')
    expect(seccion('contexto').getByText('Listo')).toBeTruthy()
    expect(seccion('panorama').getByText('Más adelante')).toBeTruthy()
    expect(screen.queryByText('lo aprobado')).toBeNull()
  })

  it('una sección cerrada se abre con un clic, y se lee lo aprobado sin botón de aprobar', () => {
    montar({})
    fireEvent.click(encabezado('contexto'))
    expect(encabezado('contexto').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('lo aprobado')).toBeTruthy()
    expect(screen.getByText(/Escrito por Claude/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull()
  })

  it('el link que nombra una sección la abre y baja hasta ella', () => {
    montar({ irA: 'contexto' })
    expect(encabezado('contexto').getAttribute('aria-expanded')).toBe('true')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('lo de afuera se marca con una casilla dentro de su sección', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ irA: 'entrega' })

    fireEvent.click(seccion('entrega').getByRole('checkbox', { name: /Presentación al cliente/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/pasos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paso: '6.1', hecho: true }),
    })
  })

  it('una casilla marcada se desmarca igual', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ irA: 'setup', marcados: ['1.1'] })

    const casilla = seccion('setup').getByRole('checkbox', { name: /Carpeta y deck en Dropbox/ }) as HTMLInputElement
    expect(casilla.checked).toBe(true)
    fireEvent.click(casilla)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ paso: '1.1', hecho: false }))
  })
})

describe('LandscapeWorkspace · lo que sigue, arriba', () => {
  it('si le toca a Claude, un botón copia el mensaje para el chat y abre claude.ai', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const open = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('open', open)
    montar({})

    expect(screen.getByText(/Lo que sigue · Le toca a Claude/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Seguir en Claude/ }))

    await waitFor(() => expect(open).toHaveBeenCalledWith('https://claude.ai/projects', '_blank', 'noopener'))
    expect(writeText.mock.calls[0][0]).toMatch(/^Sigamos con el Landscape de Grupo Heroica\. Lo que sigue: enfoque del estudio\./)
    expect(await screen.findByText(/Mensaje copiado/)).toBeTruthy()
  })

  it('un trámite de afuera no tapa el trabajo: sigue lo de Claude y el trámite queda en su sección', () => {
    montar({ conEnfoque: true, aprobada: false })
    // El enfoque está aprobado y falta la carpeta: lo que sigue es revisar el contexto.
    expect(screen.getByText(/Lo que sigue · Te toca revisar/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Revisar/ }).getAttribute('href')).toBe('#contexto')
    expect(seccion('setup').getByText('Te toca')).toBeTruthy()
  })

  it('después de elegir, lo que sigue es que Claude desarrolle las tendencias, y su lugar ya está en la sección', () => {
    montar({ conEnfoque: true, marcados: ['1.1'], tendencias: candidatas(6), seleccion: ['t1', 't2', 't3', 't4'] })

    expect(screen.getByText('Desarrollo de las tendencias', { selector: 'p.font-serif' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Seguir en Claude/ })).toBeTruthy()
    expect(document.getElementById('tendencias-desarrollo')).toBeTruthy()
    expect(document.getElementById('tendencias-casos')).toBeTruthy()
  })

  it('una pieza que guardó Claude se lee y se aprueba en su bloque', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({
      conEnfoque: true, marcados: ['1.1'], tendencias: candidatas(6), seleccion: ['t1', 't2', 't3', 't4'],
      piezas: { 'tendencias-casos': { tendencias: [{ titulo: 'Tendencia t1', casos: [{ marca: 'Marca X', descripcion: 'La aplica así.' }] }] } },
    })

    const bloque = within(document.getElementById('tendencias-casos')!)
    expect(bloque.getByText('La aplica así.')).toBeTruthy()
    fireEvent.click(bloque.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/p1/landscape/tendencias-casos')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'aprobar', versionId: 'v-tendencias-casos' }))
  })

  it('elegir tendencias lleva a la sección, no a otra página', () => {
    montar({ conEnfoque: true, marcados: ['1.1'], tendencias: candidatas(6) })
    expect(screen.getByText(/Lo que sigue · Te toca/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Elegir/ }).getAttribute('href')).toBe('#tendencias')
    expect(encabezado('tendencias').getAttribute('aria-expanded')).toBe('true')
  })
})

describe('LandscapeWorkspace · lo que Claude entregó se aprueba en su sección', () => {
  it('la sección por revisar está abierta, y “Aprobar” manda su versionId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ aprobada: false })

    expect(seccion('contexto').getByText('Por revisar', { selector: 'span' })).toBeTruthy()
    fireEvent.click(seccion('contexto').getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/contexto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar', versionId: 'v1' }),
    })
  })

  it('pedir cambios copia un pedido que nombra la sección', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    montar({ aprobada: false })

    fireEvent.click(screen.getByRole('button', { name: 'Pedir cambios' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toMatch(/^Ajustemos Contexto del sector, del Landscape de Grupo Heroica\./)
  })
})

describe('LandscapeWorkspace · borrador nuevo sobre una etapa aprobada', () => {
  it('sin borrador nuevo no aparece el comparador', () => {
    montar({ irA: 'contexto' })
    expect(screen.queryByRole('button', { name: 'Ver sólo la aprobada' })).toBeNull()
  })

  it('muestra las dos versiones a la vez y dice que lo aprobado sigue vigente', () => {
    montar({ conBorrador: true })
    expect(screen.getByText('lo aprobado')).toBeTruthy()
    expect(screen.getByText('lo nuevo')).toBeTruthy()
    expect(screen.getByText(/sigue vigente hasta que decidas/)).toBeTruthy()
  })

  it('“Aprobar la nueva” manda el versionId del borrador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar la nueva' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/contexto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar', versionId: 'v2' }),
    })
  })

  it('“Mantener esta versión” ratifica la aprobada, y si falla lo dice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No existe el proyecto' }) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Mantener esta versión' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'reafirmar' }))
    expect(await screen.findByText('No existe el proyecto')).toBeTruthy()
  })

  it('mirar sólo la aprobada no toca el servidor y se vuelve a un clic', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    montar({ conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ver sólo la aprobada' }))

    expect(screen.queryByText('lo nuevo')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver la versión nueva' }))
    expect(screen.getByText('lo nuevo')).toBeTruthy()
  })
})

describe('LandscapeWorkspace · dependencia de la fase', () => {
  const texto = 'El panorama de categoría necesita los competidores del taller'

  it('se explica en el Panorama', () => {
    montar({ irA: 'panorama', dependencia: texto })
    expect(seccion('panorama').getByText(texto)).toBeTruthy()
  })

  it('no se muestra mientras el Panorama está cerrado', () => {
    montar({ dependencia: texto })
    expect(screen.queryByText(texto)).toBeNull()
  })
})

/**
 * El gate de tendencias: la selección *es* la decisión del paso 3.3, y se hace en la etapa. La regla —entre 4 y 5,
 * y las elige el equipo— no se movió.
 */
function candidata(id: string): TendenciaCandidata {
  return {
    id,
    eje: 'Marca',
    titulo: `Tendencia ${id}`,
    descripcion: 'Descripción de la candidata.',
    fuentes: [{ doc: 'Archivo del estudio', pagina: 3 }],
  }
}

const candidatas = (cuantas: number) => Array.from({ length: cuantas }, (_, i) => candidata(`t${i + 1}`))
const elegir = (cuantas: number) => montar({ irA: 'tendencias', tendencias: candidatas(cuantas) })

describe('LandscapeWorkspace · gate de tendencias', () => {
  it('no deja confirmar con menos del mínimo', () => {
    elegir(6)
    for (let i = 1; i < MIN_TENDENCIAS; i++)
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Tendencia t${i}`) }))
    expect(screen.getByRole('button', { name: 'Confirmar selección' }).hasAttribute('disabled')).toBe(true)
  })

  it('con el mínimo elegido manda la selección al endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    elegir(6)
    for (let i = 1; i <= MIN_TENDENCIAS; i++)
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Tendencia t${i}`) }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar selección' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/tendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'seleccionar-tendencias',
        seleccionadas: Array.from({ length: MIN_TENDENCIAS }, (_, i) => `t${i + 1}`),
      }),
    })
  })

  it('no deja pasar del máximo', () => {
    elegir(8)
    for (let i = 1; i <= MAX_TENDENCIAS + 2; i++)
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Tendencia t${i}`) }))
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(MAX_TENDENCIAS)
    expect(screen.getByText(/Llegaste al máximo/)).toBeTruthy()
  })
})

describe('LandscapeWorkspace · con la selección ya confirmada', () => {
  it('se leen las elegidas, la lista entera queda a un clic, y cambiarla es pedirlo', () => {
    montar({ irA: 'tendencias', tendencias: candidatas(6), seleccion: ['t1', 't2', 't3', 't4'] })
    expect(screen.queryByRole('button', { name: 'Actualizar selección' })).toBeNull()
    expect(screen.getByText('Las 4 elegidas')).toBeTruthy()
    expect(screen.getByText(/Ver las otras 2 de la lista larga/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la selección' }))
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Actualizar selección' })).toBeTruthy()
  })
})

describe('LandscapeWorkspace · lo que Claude deja en cualquier sección se ve', () => {
  it('el material de entrega aparece por revisar y se aprueba ahí', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ entrega: { resumen: 'para presentar al cliente' } })

    expect(seccion('entrega').getByText('Por revisar', { selector: 'span' })).toBeTruthy()
    expect(seccion('entrega').getByText(/para presentar al cliente/)).toBeTruthy()
    fireEvent.click(seccion('entrega').getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/p1/landscape/entrega')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'aprobar', versionId: 'ventrega' }))
  })
})

describe('LandscapeWorkspace · el Diagnóstico sólo aplica en rebranding', () => {
  it('se marca que no aplica desde su sección', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ irA: 'diagnostico' })

    fireEvent.click(seccion('diagnostico').getByRole('button', { name: 'Marcar que no aplica' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/p1/landscape/diagnostico')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'no-aplica', noAplica: true }))
  })

  it('marcado, lo dice y se puede volver a activar', () => {
    montar({ irA: 'diagnostico', diagnosticoNoAplica: true })
    expect(seccion('diagnostico').getAllByText('No aplica').length).toBeGreaterThan(0)
    expect(seccion('diagnostico').getByRole('button', { name: 'Volver a activarlo' })).toBeTruthy()
  })

  it('las otras secciones no se pueden marcar', () => {
    montar({ irA: 'contexto' })
    expect(seccion('contexto').queryByRole('button', { name: 'Marcar que no aplica' })).toBeNull()
  })
})
