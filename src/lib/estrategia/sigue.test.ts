import { describe, it, expect } from 'vitest'
import { ETAPA_ORDER, type EstrategiaKey } from './stages'
import { queSigueEstrategia, queSigueEstrategiaParaClaude } from './sigue'

const etapas = (aprobadas: EstrategiaKey[], esperando: EstrategiaKey[] = []) =>
  ETAPA_ORDER.map(key => ({ key, status: aprobadas.includes(key) ? 'aprobada' : 'pendiente', esperando: esperando.includes(key) }))

describe('qué sigue en la Estrategia', () => {
  it('lo que espera revisión va antes que lo pendiente, aunque esté más abajo', () => {
    expect(queSigueEstrategia(etapas([], ['personalidad']))).toEqual({ key: 'personalidad', turno: 'revisar' })
  })

  it('sin nada por revisar, la primera sin aprobar le toca a Claude; los cuadros, al final', () => {
    expect(queSigueEstrategia(etapas(['diagnostico']))).toEqual({ key: 'consumidor', turno: 'claude' })
    const todoMenosCuadros = ETAPA_ORDER.filter(k => k !== 'cuadros')
    expect(queSigueEstrategia(etapas(todoMenosCuadros))).toEqual({ key: 'cuadros', turno: 'claude' })
    expect(queSigueEstrategia(etapas([...ETAPA_ORDER]))).toBeUndefined()
  })

  it('a Claude le dice qué etapa trabajar y dónde guardarla', () => {
    const texto = queSigueEstrategiaParaClaude({ key: 'rtbs', turno: 'claude' }, 11)
    expect(texto).toContain('guardar_etapa, fase "estrategia", etapa "rtbs"')
    expect(texto).toContain('Quedan 11 etapas de esencia')
    expect(queSigueEstrategiaParaClaude({ key: 'concepto', turno: 'revisar' }, 10)).toMatch(/^El equipo tiene que revisar/)
  })
})
