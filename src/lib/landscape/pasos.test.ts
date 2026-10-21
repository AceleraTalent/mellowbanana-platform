import { describe, expect, it } from 'vitest'
import {
  PASOS, estadoDePasos, mensajeParaSeguir, pasoPorId, pasoQueSigue, queSigueParaClaude,
  type EtapaParaPasos,
} from './pasos'
import { STAGE_ORDER } from './stages'

const vacias = (): EtapaParaPasos[] =>
  STAGE_ORDER.map(stage => ({ stage, status: 'pendiente', contenido: null, cerrada: false }))

function con(cambios: Partial<Record<string, Partial<EtapaParaPasos>>>): EtapaParaPasos[] {
  return vacias().map(e => ({ ...e, ...cambios[e.stage] }))
}

const estado = (etapas: EtapaParaPasos[], id: string, marcados: string[] = []) =>
  estadoDePasos(etapas, new Set(marcados)).find(p => p.id === id)!

describe('PASOS', () => {
  it('sigue el documento del estudio, sin los trámites que no son un paso: 13, ids únicos, en orden de etapa', () => {
    expect(PASOS).toHaveLength(13)
    expect(new Set(PASOS.map(p => p.id)).size).toBe(13)
    // Las entregas anteriores son insumo de la lista larga, no un paso aparte; la carpeta y
    // el template son un solo trámite.
    expect(pasoPorId('3.2')).toBeUndefined()
    expect(pasoPorId('1.2')).toBeUndefined()
    expect(pasoPorId('3.1')!.queEs).toContain('landscapes que el estudio ya hizo')
    const ordenEtapas = PASOS.map(p => STAGE_ORDER.indexOf(p.etapa))
    expect(ordenEtapas).toEqual([...ordenEtapas].sort((a, b) => a - b))
  })
})

describe('estadoDePasos', () => {
  it('sin nada guardado, todo está pendiente y el turno sale de quién hace el paso', () => {
    const pasos = estadoDePasos(vacias(), new Set())
    expect(pasos.every(p => p.estado === 'pendiente')).toBe(true)
    expect(pasos.find(p => p.id === '2.2')!.turno).toBe('claude')
    expect(pasos.find(p => p.id === '1.1')!.turno).toBe('equipo')
    expect(pasos.find(p => p.id === '3.3')!.turno).toBe('equipo')
  })

  it('un borrador sin aprobar deja sus pasos en revisar', () => {
    const etapas = con({ contexto: { status: 'en_curso', contenido: { fuentes: [{ url: 'x' }], resumen: 'r' } } })
    expect(estado(etapas, '2.1').estado).toBe('revisar')
    expect(estado(etapas, '2.2').turno).toBe('revisar')
  })

  it('aprobada y sin nada nuevo encima, el paso está hecho', () => {
    const etapas = con({ contexto: { status: 'aprobada', contenido: { fuentes: [{ url: 'x' }], resumen: 'r' }, cerrada: true } })
    expect(estado(etapas, '2.1').estado).toBe('hecho')
    expect(estado(etapas, '2.2').turno).toBe('listo')
  })

  it('cada paso mira su parte de la etapa: sin fuentes, 2.1 sigue pendiente aunque 2.2 esté escrito', () => {
    const etapas = con({ contexto: { status: 'aprobada', contenido: { resumen: 'r' }, cerrada: true } })
    expect(estado(etapas, '2.1').estado).toBe('pendiente')
    expect(estado(etapas, '2.2').estado).toBe('hecho')
  })

  it('la lista larga se da por hecha apenas existe; elegir es del equipo hasta que haya selección', () => {
    const etapas = con({ tendencias: { status: 'en_curso', contenido: { candidatas: [{ id: 'a' }] } } })
    expect(estado(etapas, '3.1').estado).toBe('hecho')
    expect(estado(etapas, '3.3').turno).toBe('equipo')
  })

  it('los pasos de chat y de afuera se cierran solo con la marca del equipo', () => {
    expect(estado(vacias(), '1.1').estado).toBe('pendiente')
    expect(estado(vacias(), '1.1', ['1.1']).estado).toBe('hecho')
    expect(estado(vacias(), '3.4', ['3.4']).turno).toBe('listo')
  })

  it('si la etapa no aplica, sus pasos tampoco', () => {
    const etapas = con({ diagnostico: { status: 'no_aplica' } })
    expect(estado(etapas, '5.1').estado).toBe('no_aplica')
  })
})

describe('pasoQueSigue', () => {
  it('lo que espera revisión va antes que lo pendiente', () => {
    const etapas = con({ contexto: { status: 'en_curso', contenido: { fuentes: [{ url: 'x' }], resumen: 'r' } } })
    expect(pasoQueSigue(estadoDePasos(etapas, new Set()))!.id).toBe('2.1')
  })

  it('un trámite de afuera no frena el trabajo: sigue lo de Claude', () => {
    const etapas = con({ setup: { status: 'aprobada', contenido: { nombre: 'x' }, cerrada: true } })
    expect(pasoQueSigue(estadoDePasos(etapas, new Set()))!.id).toBe('2.1')
  })

  it('cuando sólo quedan trámites de afuera, son lo que sigue', () => {
    const todas = vacias().map(e => ({ ...e, status: 'aprobada', contenido: { x: 1, fuentes: [1], candidatas: [1], seleccionadas: [1] }, cerrada: true }))
    const pasos = estadoDePasos(todas, new Set(['3.4', '4.2', '4.3']))
    expect(pasoQueSigue(pasos)!.id).toBe('1.1')
  })

  it('con todo hecho no sigue nada', () => {
    const todas = vacias().map(e => ({ ...e, status: 'aprobada', contenido: { x: 1, fuentes: [1], candidatas: [1], seleccionadas: [1] }, cerrada: true }))
    expect(pasoQueSigue(estadoDePasos(todas, new Set(PASOS.map(p => p.id))))).toBeUndefined()
  })
})

describe('mensajeParaSeguir', () => {
  it('es un mensaje para el chat de siempre: el proyecto, qué toca y dónde dejarlo', () => {
    const texto = mensajeParaSeguir(pasoPorId('2.2')!, 'Grupo Heroica')
    expect(texto).toMatch(/^Sigamos con el Landscape de Grupo Heroica\. Lo que sigue: contexto del sector\./)
    expect(texto).toContain('guárdalo en la plataforma')
  })

  it('lo que va al deck se queda en el chat', () => {
    const texto = mensajeParaSeguir(pasoPorId('3.4')!, 'Grupo Heroica')
    expect(texto).not.toContain('guárdalo en la plataforma')
    expect(texto).toContain('acá en el chat')
  })
})

describe('queSigueParaClaude', () => {
  it('le dice a Claude qué hacer y en qué etapa guardarlo', () => {
    expect(queSigueParaClaude(estadoDePasos(vacias(), new Set()))).toContain('guardar_etapa en la etapa "setup"')
  })

  it('si el equipo tiene que revisar, Claude espera', () => {
    const etapas = con({ contexto: { status: 'en_curso', contenido: { fuentes: [{ url: 'x' }], resumen: 'r' } } })
    expect(queSigueParaClaude(estadoDePasos(etapas, new Set()))).toMatch(/^El equipo tiene que revisar y aprobar Contexto del sector/)
  })
})
