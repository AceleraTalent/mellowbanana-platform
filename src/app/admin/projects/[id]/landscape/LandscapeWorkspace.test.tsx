// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MIN_TENDENCIAS, MAX_TENDENCIAS, STAGE_ORDER, type TendenciaCandidata } from '@/lib/landscape/stages'
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
  paso: string
  conBorrador?: boolean
  aprobada?: boolean
  tendencias?: TendenciaCandidata[]
  marcados?: string[]
  dependencia?: string
}) {
  const { conBorrador = false, aprobada = true, tendencias = [], marcados = [] } = opciones
  const etapas: EtapaParaPasos[] = STAGE_ORDER.map(stage => ({ stage, status: 'pendiente', contenido: null, cerrada: false }))
  const ctx = etapas.find(e => e.stage === 'contexto')!
  Object.assign(ctx, { status: aprobada ? 'aprobada' : 'en_curso', contenido: { hallazgo: 'lo aprobado' }, cerrada: aprobada && !conBorrador })
  if (tendencias.length)
    Object.assign(etapas.find(e => e.stage === 'tendencias')!, { status: 'en_curso', contenido: { candidatas: tendencias } })
  const pasos = estadoDePasos(etapas, new Set(marcados))
  const props = {
    projectId: 'p1',
    proyecto: 'Grupo Heroica',
    pasos,
    tendencias,
    seleccionAprobada: [] as string[],
    tendenciasAprobadas: false,
    contenidoPorEtapa: { contexto: contexto({ conBorrador, aprobada }) },
    actividad: [],
    dependencia: opciones.dependencia,
  }
  const paso = pasos.find(p => p.id === opciones.paso)!
  const r = render(<LandscapeWorkspace {...props} paso={paso} />)
  return { ...r, props, pasos }
}

describe('LandscapeWorkspace · el paso que se muestra', () => {
  it('el título es el del paso, con su número', () => {
    montar({ paso: '2.2' })
    expect(screen.getByRole('heading', { level: 1, name: /2\.2\s*Contexto del sector/ })).toBeTruthy()
  })

  it('rinde el paso aprobado como documento, con su procedencia, y sin botón de aprobar', () => {
    montar({ paso: '2.2' })
    expect(screen.getByText('lo aprobado')).toBeTruthy()
    expect(screen.getByText(/Escrito por Claude/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull()
  })

  it('el pie lleva al paso anterior y al siguiente por la query', () => {
    montar({ paso: '2.2' })
    expect(screen.getByRole('link', { name: /2\.1 Fuentes del sector/ }).getAttribute('href'))
      .toBe('/admin/projects/p1/landscape?paso=2.1')
    expect(screen.getByRole('link', { name: /3\.1 Lista larga/ }).getAttribute('href'))
      .toBe('/admin/projects/p1/landscape?paso=3.1')
  })
})

describe('LandscapeWorkspace · el panel dice qué te toca', () => {
  it('si le toca a Claude, copia una instrucción que nombra el paso y el proyecto', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    montar({ paso: '3.1' })

    expect(screen.getByText('Le toca a Claude')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Copiar instrucción' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toMatch(/^Trabajemos el paso 3\.1 · Lista larga de tendencias, del Landscape de Grupo Heroica\./)
    expect(await screen.findByRole('button', { name: '✓ Copiada' })).toBeTruthy()
  })

  it('si hay un borrador por revisar, “Aprobar” manda su versionId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ paso: '2.2', aprobada: false })

    expect(screen.getByText('Te toca revisar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/contexto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar', versionId: 'v1' }),
    })
  })

  it('un paso de afuera se marca como hecho desde el panel', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ paso: '1.1' })

    expect(screen.getByText('Te toca a ti')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como hecho' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/landscape/pasos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paso: '1.1', hecho: true }),
    })
  })

  it('un paso listo dice qué sigue y lleva ahí', () => {
    montar({ paso: '1.1', marcados: ['1.1'] })
    expect(screen.getByText('Listo')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ir al paso/ }).getAttribute('href')).toBe('/admin/projects/p1/landscape?paso=1.2')
  })
})

describe('LandscapeWorkspace · borrador nuevo sobre un paso aprobado', () => {
  it('sin borrador nuevo no aparece el comparador', () => {
    montar({ paso: '2.2' })
    expect(screen.queryByRole('button', { name: 'Ver sólo la aprobada' })).toBeNull()
  })

  it('muestra las dos versiones a la vez y dice que lo aprobado sigue vigente', () => {
    montar({ paso: '2.2', conBorrador: true })
    expect(screen.getByText('lo aprobado')).toBeTruthy()
    expect(screen.getByText('lo nuevo')).toBeTruthy()
    expect(screen.getByText(/sigue vigente hasta que decidas/)).toBeTruthy()
  })

  it('“Aprobar la nueva” manda el versionId del borrador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    montar({ paso: '2.2', conBorrador: true })
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
    montar({ paso: '2.2', conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Mantener esta versión' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ accion: 'reafirmar' }))
    expect(await screen.findByText('No existe el proyecto')).toBeTruthy()
  })

  it('mirar sólo la aprobada no toca el servidor y se vuelve a un clic', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    montar({ paso: '2.2', conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ver sólo la aprobada' }))

    expect(screen.queryByText('lo nuevo')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver la versión nueva' }))
    expect(screen.getByText('lo nuevo')).toBeTruthy()
  })

  it('cambiar de paso no deja pegada la vista de una sola versión', () => {
    const { rerender, props, pasos } = montar({ paso: '2.2', conBorrador: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ver sólo la aprobada' }))
    rerender(<LandscapeWorkspace {...props} paso={pasos.find(p => p.id === '1.0')!} />)
    rerender(<LandscapeWorkspace {...props} paso={pasos.find(p => p.id === '2.2')!} />)

    expect(screen.getByRole('button', { name: 'Ver sólo la aprobada' })).toBeTruthy()
    expect(screen.getByText('lo nuevo')).toBeTruthy()
  })
})

describe('LandscapeWorkspace · dependencia de la fase', () => {
  const texto = 'El panorama de categoría necesita los competidores del taller'

  it('se explica en los pasos del Panorama', () => {
    montar({ paso: '4.2', dependencia: texto })
    expect(screen.getByText(texto)).toBeTruthy()
  })

  it('no se muestra en pasos de otras etapas, donde confunde', () => {
    montar({ paso: '2.2', dependencia: texto })
    expect(screen.queryByText(texto)).toBeNull()
  })
})

/**
 * El gate de tendencias: la selección *es* la decisión del paso 3.3. La regla —entre 4 y 5,
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

const elegir = (cuantas: number) => montar({ paso: '3.3', tendencias: Array.from({ length: cuantas }, (_, i) => candidata(`t${i + 1}`)) })

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
