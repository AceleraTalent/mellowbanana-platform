import { describe, it, expect } from 'vitest'
import { validarContenidoEstrategia } from './validar-estrategia'
import { ErrorDeHerramienta } from './errores'
import { ETAPA_ORDER } from '@/lib/estrategia/stages'

const validos: Record<string, unknown> = {
  diagnostico: { problema: 'p', insight: 'i', ventaja: 'v', diferenciales: ['d1'], rumbo: 'r' },
  consumidor: { metodologia: 'm', perfil: 'p', motivaciones: ['m1'], tensiones: ['t1'], pertenencia: 'g', frases: ['f1'] },
  objetivo: { texto: 't' },
  onlyness: { texto: 't' },
  naming: { propuestas: [{ nombre: 'Alba', racional: 'r' }] },
  copies: { entregables: [{ entregable: 'Empaque', especificaciones: 'Cara frontal', copies: ['c1'] }] },
  rtbs: { items: ['r1'] },
  concepto: { concepto: 'c', racional: 'r' },
  beneficios: { funcionales: ['f'], emocionales: ['e'] },
  arquetipo: { arquetipo: 'a', justificacion: 'j' },
  personalidad: { rasgos: ['r'] },
  valores: { items: [{ valor: 'v', validacion: 'ok' }] },
  territorio: { texto: 't' },
  brand_ideal: { texto: 't' },
  ingredients: { items: ['i'] },
  tagline: { texto: 't' },
  manifiesto: { texto: 't' },
  cuadros: { brandEssence: { proposito: 'p' }, consumidor: { jtbd: 'j' } },
}

const invalidos: Record<string, unknown> = {
  diagnostico: { problema: 'p', insight: 'i', ventaja: 'v', diferenciales: [] },
  consumidor: { metodologia: '', frases: ['f'] },
  objetivo: {},
  onlyness: { texto: ' ' },
  naming: { propuestas: [{ nombre: 'Alba' }] },
  copies: { entregables: [{ entregable: 'Empaque', especificaciones: 'Cara frontal', copies: [] }] },
  rtbs: { items: [] },
  concepto: { concepto: 'c' },
  beneficios: { funcionales: ['f'], emocionales: [] },
  arquetipo: { arquetipo: '  ', justificacion: 'j' },
  personalidad: {},
  valores: { items: [{ valor: 'v' }] },
  territorio: { texto: '' },
  brand_ideal: {},
  ingredients: { items: [''] },
  tagline: { texto: '   ' },
  manifiesto: { otroCampo: 'x' },
  cuadros: { brandEssence: {}, consumidor: { jtbd: 'j' } },
}

describe('validarContenidoEstrategia', () => {
  it('el diagnóstico sin “hacia dónde vamos” se rechaza diciendo qué falta', () => {
    expect(() => validarContenidoEstrategia('diagnostico', { problema: 'p', insight: 'i', ventaja: 'v', diferenciales: ['d'] }))
      .toThrow(/rumbo/)
  })

  it('el consumidor pide cada parte del listado de entregables', () => {
    const completo = validos.consumidor as Record<string, unknown>
    for (const campo of ['perfil', 'motivaciones', 'tensiones', 'pertenencia']) {
      const sinCampo = Object.fromEntries(Object.entries(completo).filter(([k]) => k !== campo))
      expect(() => validarContenidoEstrategia('consumidor', sinCampo)).toThrow(new RegExp(campo))
    }
  })

  it('todas las etapas del proceso tienen un caso válido y uno inválido acá', () => {
    expect(Object.keys(validos).sort()).toEqual([...ETAPA_ORDER].sort())
    expect(Object.keys(invalidos).sort()).toEqual([...ETAPA_ORDER].sort())
  })

  it('rechaza lo que no es objeto', () => {
    expect(() => validarContenidoEstrategia('concepto', null)).toThrow(ErrorDeHerramienta)
    expect(() => validarContenidoEstrategia('concepto', ['lista'])).toThrow(ErrorDeHerramienta)
  })

  for (const [etapa, contenido] of Object.entries(validos))
    it(`acepta un ${etapa} bien formado`, () => {
      expect(() => validarContenidoEstrategia(etapa as never, contenido)).not.toThrow()
    })

  for (const [etapa, contenido] of Object.entries(invalidos))
    it(`rechaza un ${etapa} mal formado con mensaje accionable`, () => {
      expect(() => validarContenidoEstrategia(etapa as never, contenido)).toThrow(ErrorDeHerramienta)
    })
})
