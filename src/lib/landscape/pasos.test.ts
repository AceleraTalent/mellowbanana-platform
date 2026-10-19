import { describe, expect, it } from 'vitest'
import {
  PASOS, estadoDePasos, instruccionParaClaude, pasoInicial, pasoPorId, siguientePendiente,
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
  it('sigue el documento del estudio: 15 pasos, ids únicos, en orden de etapa', () => {
    expect(PASOS).toHaveLength(15)
    expect(new Set(PASOS.map(p => p.id)).size).toBe(15)
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

describe('pasoInicial y siguientePendiente', () => {
  it('al entrar a una etapa se abre el primer paso que falta', () => {
    const etapas = con({ setup: { status: 'aprobada', contenido: { nombre: 'x' }, cerrada: true } })
    const pasos = estadoDePasos(etapas, new Set(['1.1']))
    expect(pasoInicial(pasos, 'setup')!.id).toBe('1.2')
  })

  it('con todo hecho, se abre el último paso de la etapa', () => {
    const etapas = con({ setup: { status: 'aprobada', contenido: { nombre: 'x' }, cerrada: true } })
    const pasos = estadoDePasos(etapas, new Set(['1.1', '1.2']))
    expect(pasoInicial(pasos, 'setup')!.id).toBe('1.2')
  })

  it('lo que sigue salta los pasos que ya están hechos', () => {
    const pasos = estadoDePasos(vacias(), new Set(['1.2']))
    expect(siguientePendiente(pasos, '1.1')!.id).toBe('2.1')
  })
})

describe('instruccionParaClaude', () => {
  it('nombra el paso y el proyecto, y le dice a Claude dónde guardar', () => {
    const texto = instruccionParaClaude(pasoPorId('2.2')!, 'Grupo Heroica')
    expect(texto.split('\n')[0]).toBe('Trabajemos el paso 2.2 · Contexto del sector, del Landscape de Grupo Heroica.')
    expect(texto).toContain('guardar_etapa en la etapa "contexto"')
  })

  it('en un paso de chat no le pide guardar en la plataforma', () => {
    const texto = instruccionParaClaude(pasoPorId('3.4')!, 'Grupo Heroica')
    expect(texto).not.toContain('guardar_etapa')
    expect(texto).toContain('entrégalo acá en el chat')
  })
})
