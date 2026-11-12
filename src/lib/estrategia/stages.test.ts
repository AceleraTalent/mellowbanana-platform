import { describe, expect, it } from 'vitest'
import { BLOQUES, ETAPA_ORDER, ETAPA_LABEL, ETAPA_HINT, ESENCIA, PUEDEN_NO_APLICAR_ESTRATEGIA, buildEtapasEstrategia } from './stages'

describe('etapas de estrategia', () => {
  it('son 18, arrancan en diagnóstico y cierran en naming y copies', () => {
    expect(ETAPA_ORDER).toHaveLength(18)
    expect(ETAPA_ORDER[0]).toBe('diagnostico')
    expect(ETAPA_ORDER.slice(15)).toEqual(['cuadros', 'naming', 'copies'])
  })

  it('la esencia son las 13 etapas entre consumidor y cuadros', () => {
    expect(ESENCIA).toEqual([
      'objetivo', 'rtbs', 'concepto', 'beneficios', 'arquetipo', 'personalidad', 'valores',
      'territorio', 'brand_ideal', 'ingredients', 'onlyness', 'tagline', 'manifiesto',
    ])
  })

  it('toda etapa tiene label, y cuadros tiene su hint', () => {
    for (const k of ETAPA_ORDER) expect(ETAPA_LABEL[k]).toBeTruthy()
    expect(ETAPA_HINT.cuadros).toBe('se llena desde lo aprobado')
  })

  it('buildEtapasEstrategia devuelve las 18 aunque no haya filas', () => {
    const etapas = buildEtapasEstrategia([])
    expect(etapas).toHaveLength(18)
    expect(etapas.every(e => e.status === 'pendiente')).toBe(true)
  })

  it('cada etapa está en un bloque y sólo en uno, en el orden del proceso', () => {
    expect(BLOQUES.flatMap(b => b.etapas)).toEqual(ETAPA_ORDER)
    expect(BLOQUES.map(b => b.titulo)).toEqual([
      'Diagnóstico y consumidor', 'Esencia de marca', 'Narrativa y presentación', 'Naming y copies',
    ])
  })

  it('sólo el naming puede no aplicar', () => {
    expect(PUEDEN_NO_APLICAR_ESTRATEGIA).toEqual(['naming'])
    expect(ETAPA_HINT.naming).toBe('si aplica')
  })

  it('buildEtapasEstrategia respeta el estado guardado', () => {
    const etapas = buildEtapasEstrategia([{ stage: 'concepto', status: 'aprobada' }])
    expect(etapas.find(e => e.key === 'concepto')?.status).toBe('aprobada')
  })
})
