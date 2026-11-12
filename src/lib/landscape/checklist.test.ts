import { describe, expect, it } from 'vitest'
import { BLOQUES_CONTEXTO, coberturaDelContexto } from './checklist'

describe('checklist de investigación · contexto del sector', () => {
  it('son los siete bloques del checklist del estudio', () => {
    expect(BLOQUES_CONTEXTO.map(b => b.key)).toEqual([
      'cifras', 'drivers', 'consumidor', 'retos', 'oportunidades', 'oportunidad_marca', 'conclusion',
    ])
  })

  it('un contexto que marca todos sus bloques no tiene faltantes', () => {
    const r = coberturaDelContexto({ secciones: BLOQUES_CONTEXTO.map(b => ({ titulo: b.label, bloque: b.key })) })
    expect(r).toMatchObject({ marcado: true, faltan: [] })
    expect(r.cubiertos).toHaveLength(7)
  })

  it('dice qué falta, con el nombre que usa el estudio', () => {
    const r = coberturaDelContexto({ secciones: [{ bloque: 'cifras' }, { bloque: 'drivers' }] })
    expect(r.cubiertos).toEqual(['cifras', 'drivers'])
    expect(r.faltan).toContain('Oportunidad de marca')
    expect(r.faltan).toHaveLength(5)
  })

  it('reconoce el bloque como lo escriba Claude', () => {
    const r = coberturaDelContexto({ secciones: [{ bloque: 'oportunidadMarca' }, { bloque: 'Oportunidad de marca' }, { bloque: ' Conclusión ' }] })
    expect(r.cubiertos).toEqual(['oportunidad_marca', 'conclusion'])
  })

  it('un contexto de antes del checklist no declara nada: no se le reclama', () => {
    expect(coberturaDelContexto({ secciones: [{ titulo: 'Mercado', texto: 'x' }] }).marcado).toBe(false)
    expect(coberturaDelContexto(null).marcado).toBe(false)
  })
})
