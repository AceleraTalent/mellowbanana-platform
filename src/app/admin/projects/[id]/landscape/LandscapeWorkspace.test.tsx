// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MIN_TENDENCIAS, MAX_TENDENCIAS, STAGE_ORDER, type StageKey, type TendenciaCandidata } from '@/lib/landscape/stages'
import { estadoDePasos, type EtapaParaPasos } from '@/lib/landscape/pasos'
import { LandscapeWorkspace, type ContenidoEtapaVista } from './LandscapeWorkspace'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

/** El contexto aprobado y, si se pide, un borrador que Claude escribió después. */
function contexto({ conBorrador, aprobada = true }: { conBorrador: boolean; aprobada?: boolean }): ContenidoEtapaVista {
  return {
    id: 'v1',
    content: { hallazgo: 'lo aprobado' },
    aprobada,
    procedencia: aprobada ? 'Escrito por Claude · hace 3 días · aprobada' : 'Escrito por Claude · hace 2 h · sin aprobar',
    cuando: 'hace 3 días',
    borradorNuevo: conBorrador
      ? { id: 'v2', content: { hallazgo: 'lo nuevo' }, cuando: 'hace 2 h', autor: 'Claude' }
      : null,
  }
}

function montar(opciones: {
  etapa: StageKey
  foco?: string
  conBorrador?: boolean
  aprobada?: boolean
  tendencias?: TendenciaCandidata[]
  seleccion?: string[]
  marcados?: string[]
  dependencia?: string
}) {
  const { conBorrador = false, aprobada = true, tendencias = [], seleccion = [], marcados = [] } = opciones
  const etapas: EtapaParaPasos[] = STAGE_ORDER.map(stage => ({ stage, status: 'pendiente', contenido: null, cerrada: false }))
  const ctx = etapas.find(e => e.stage === 'contexto')!
  Object.assign(ctx, { status: aprobada ? 'aprobada' : 'en_curso', contenido: { hallazgo: 'lo aprobado' }, cerrada: aprobada && !conBorrador })
  if (tendencias.length)
    Object.assign(etapas.find(e => e.stage === 'tendencias')!, {
      status: seleccion.length ? 'aprobada' : 'en_curso',
      contenido: { candidatas: tendencias, seleccionadas: seleccion },
      cerrada: seleccion.length > 0,
    })
  const pasos = estadoDePasos(etapas, new Set(marcados))
  const props = {
    projectId: 'p1',
    proyecto: 'Grupo Heroica',
    pasos,
    tendencias,
    seleccionAprobada: seleccion,
    tendenciasAprobadas: seleccion.length > 0,
    contenidoPorEtapa: {
      contexto: contexto({ conBorrador, aprobada }),
      tendencias: seleccion.length
        ? { id: 'vt', content: { candidatas: tendencias, seleccionadas: seleccion }, aprobada: true, procedencia: 'Escrito por Claude · hace 1 día · aprobada', cuando: 'hace 1 día', borradorNuevo: null }
        : null,
    } as Record<string, ContenidoEtapaVista>,
    actividad: [],
    dependencia: opciones.dependencia,
  }
  const r = render(<LandscapeWorkspace {...props} etapa={opciones.etapa} foco={opciones.foco} />)
  return { ...r, props, pasos }
}

/** El renglón de un paso en la lista de la etapa. */
const renglon = (id: string) => within(document.getElementById(`paso-${id}`)!)

describe('LandscapeWorkspace · la etapa es la pantalla', () => {
  it('el título es el de la etapa, y sus pasos van en una lista', () => {
    montar({ etapa: 'contexto' })
    expect(screen.getByRole('heading', { level: 1, name: 'Contexto del sector' })).toBeTruthy()
    const lista = screen.getByRole('list', { name: 'Pasos de la etapa' })
    expect(within(lista).getAllByRole('listitem').map(li => li.id)).toEqual(['paso-2.1', 'paso-2.2'])
  })

  it('rinde lo aprobado como documento, con su procedencia, y sin botón de aprobar', () => {
    montar({ etapa: 'contexto' })
    expect(screen.getByText('lo aprobado')).toBeTruthy()
    expect(screen.getByText(/Escrito por Claude/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull()
  })

  it('el pie lleva a la etapa anterior y a la siguiente', () => {
    montar({ etapa: 'contexto' })
    expect(screen.getByRole('link', { name: /Setup/ }).getAttribute('href')).toBe('/admin/projects/p1/landscape?etapa=setup')
    expect(screen.getByRole('link', { name: /Tendencias/ }).getAttribute('href')).toBe('/admin/projects/p1/landscape?etapa=tendencias')
  })

  it('resalta el paso en foco, y sólo ese', () => {
    montar({ etapa: 'setup', foco: '1.1' })
    const enFoco = document.querySelectorAll('[aria-current="step"]')
    expect(enFoco).toHaveLength(1)
    expect(enFoco[0].id).toBe('paso-1.1')
  })

  it('una etapa sin pasos de la plataforma no tiene documento', () => {
    montar({ etapa: 'entrega' })
    expect(document.getElementById('documento')).toBeNull()
  })
})

describe('LandscapeWorkspace · cada paso trae su acción en el renglón', () => {
  it('si le toca a Claude, copia una instrucción que nombra el paso y el proyecto', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    montar({ etapa: 'tendencias' })

    fireEvent.click(renglon('3.1').getByRole('button', { name: 'Copiar instrucción' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toMatch(/^Trabajemos el paso 3\.1 · Lista larga de tendencias, del Landscape de Grupo Heroica\./)
    expect(await renglon('3.1').findByRole('button', { name: '✓ Copiada' })).toBeTruthy()
    // Después de copiar, queda a mano adónde pegarla.
    expect(renglon('3.1').getByRole('link', { name: /claude\.ai/ }).getAttribute('href')).toBe('https://claude.ai/projects')
  })

  it('un paso de afuera se marca como hecho desde su renglón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ etapa: 'setup' })

    fireEvent.click(renglon('1.1').getByRole('button', { name: 'Marcar hecho' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/pasos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paso: '1.1', hecho: true }),
    })
  })

  it('un paso de afuera ya hecho se puede deshacer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ etapa: 'setup', marcados: ['1.1'] })

    fireEvent.click(renglon('1.1').getByRole('button', { name: 'Deshacer' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ paso: '1.1', hecho: false }))
  })

  it('un paso de chat se copia para Claude y se marca hecho cuando está en el deck', () => {
    montar({ etapa: 'tendencias' })
    expect(renglon('3.4').getByRole('button', { name: 'Copiar instrucción' })).toBeTruthy()
    expect(renglon('3.4').getByRole('button', { name: 'Marcar hecho' })).toBeTruthy()
  })

  it('un paso hecho en la plataforma lleva a su parte del documento', () => {
    montar({ etapa: 'contexto' })
    expect(renglon('2.2').getByRole('link', { name: /Ver/ }).getAttribute('href')).toBe('#paso-doc-2.2')
    expect(document.getElementById('paso-doc-2.2')).toBeTruthy()
  })
})

describe('LandscapeWorkspace · lo que Claude entregó se aprueba junto al documento', () => {
  it('el renglón por revisar apunta al documento, y “Aprobar” manda su versionId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ etapa: 'contexto', aprobada: false })

    expect(renglon('2.2').getByRole('link', { name: /Por revisar/ }).getAttribute('href')).toBe('#documento')
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/contexto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar', versionId: 'v1' }),
    })
  })

  it('pedir cambios copia un pedido que nombra la etapa', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    montar({ etapa: 'contexto', aprobada: false })

    fireEvent.click(screen.getByRole('button', { name: 'Pedir cambios' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toMatch(/^Ajustemos la etapa Contexto del sector \(pasos 2\.2\), del Landscape de Grupo Heroica\./)
  })
})

describe('LandscapeWorkspace · borrador nuevo sobre una etapa aprobada', () => {
  it('sin borrador nuevo no aparece el comparador', () => {
    montar({ etapa: 'contexto' })
    expect(screen.queryByRole('button', { name: 'Ver sólo la aprobada' })).toBeNull()
  })

  it('muestra las dos versiones a la vez y dice que lo aprobado sigue vigente', () => {
    montar({ etapa: 'contexto', conBorrador: true })
    expect(screen.getByText('lo aprobado')).toBeTruthy()
    expect(screen.getByText('lo nuevo')).toBeTruthy()
    expect(screen.getByText(/sigue vigente hasta que decidas/)).toBeTruthy()
  })

  it('“Aprobar la nueva” manda el versionId del borrador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ etapa: 'contexto', conBorrador: true })
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
    montar({ etapa: 'contexto', conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Mantener esta versión' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'reafirmar' }))
    expect(await screen.findByText('No existe el proyecto')).toBeTruthy()
  })

  it('mirar sólo la aprobada no toca el servidor y se vuelve a un clic', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    montar({ etapa: 'contexto', conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ver sólo la aprobada' }))

    expect(screen.queryByText('lo nuevo')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver la versión nueva' }))
    expect(screen.getByText('lo nuevo')).toBeTruthy()
  })

  it('cambiar de etapa no deja pegada la vista de una sola versión', () => {
    const { rerender, props } = montar({ etapa: 'contexto', conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ver sólo la aprobada' }))
    rerender(<LandscapeWorkspace {...props} etapa="setup" />)
    rerender(<LandscapeWorkspace {...props} etapa="contexto" />)

    expect(screen.getByRole('button', { name: 'Ver sólo la aprobada' })).toBeTruthy()
    expect(screen.getByText('lo nuevo')).toBeTruthy()
  })
})

describe('LandscapeWorkspace · dependencia de la fase', () => {
  const texto = 'El panorama de categoría necesita los competidores del taller'

  it('se explica en el Panorama', () => {
    montar({ etapa: 'panorama', dependencia: texto })
    expect(screen.getByText(texto)).toBeTruthy()
  })

  it('no se muestra en otras etapas, donde confunde', () => {
    montar({ etapa: 'contexto', dependencia: texto })
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
const elegir = (cuantas: number) => montar({ etapa: 'tendencias', tendencias: candidatas(cuantas) })

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
  it('se lee la lista con las elegidas marcadas, y cambiarla es pedirlo', () => {
    montar({ etapa: 'tendencias', tendencias: candidatas(6), seleccion: ['t1', 't2', 't3', 't4'] })
    expect(screen.queryByRole('button', { name: 'Actualizar selección' })).toBeNull()
    expect(screen.getAllByText('Elegida')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la selección' }))
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Actualizar selección' })).toBeTruthy()
  })
})
