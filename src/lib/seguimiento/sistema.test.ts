import { describe, expect, it } from 'vitest'
import { estadoDeFases, faseActual, queSigue, type SenalesProyecto } from './sistema'
import { estadoDePasos, type EtapaParaPasos } from '@/lib/landscape/pasos'
import { STAGE_ORDER } from '@/lib/landscape/stages'

function pasos(cambios: Partial<Record<string, Partial<EtapaParaPasos>>> = {}, marcados: string[] = []) {
  const etapas = STAGE_ORDER.map(stage => ({ stage, status: 'pendiente', contenido: null, cerrada: false, ...cambios[stage] }))
  return estadoDePasos(etapas, new Set(marcados))
}

const estrategia = (aprobadas: number, opciones: { trabajada?: boolean; espera?: boolean } = {}) =>
  Array.from({ length: 14 }, (_, i) => ({
    key: `e${i}`,
    label: `Etapa ${i}`,
    aprobada: i < aprobadas,
    esperaDecision: !!opciones.espera && i === aprobadas,
    trabajada: i < aprobadas || (!!opciones.trabajada && i === aprobadas),
  }))

function senales(cambios: Partial<SenalesProyecto> = {}): SenalesProyecto {
  return {
    projectId: 'p1',
    sesionesTotal: 4,
    sesionesCompletas: 4,
    tienePropuesta: true,
    pasos: pasos(),
    estrategia: estrategia(0),
    manual: {},
    ...cambios,
  }
}

const fase = (s: SenalesProyecto, key: string) => estadoDeFases(s).find(f => f.key === key)!

describe('estadoDeFases', () => {
  it('el taller avanza solo con entrevistas y propuesta, y se cierra cuando el equipo lo marca', () => {
    expect(fase(senales({ sesionesTotal: 0, sesionesCompletas: 0 }), 'taller').estado).toBe('pendiente')
    expect(fase(senales({ sesionesCompletas: 2 }), 'taller').detalle).toBe('Entrevistas: 2 de 4')
    expect(fase(senales(), 'taller').estado).toBe('en_curso')
    expect(fase(senales({ manual: { taller: 'completa' } }), 'taller').estado).toBe('completa')
  })

  it('el landscape cuenta pasos listos', () => {
    const s = senales({ pasos: pasos({}, ['1.1', '3.4']) })
    expect(fase(s, 'landscape')).toMatchObject({ estado: 'en_curso', detalle: '2 de 13 pasos' })
  })

  it('las fases que se cuentan traen su avance corto, el mismo para el inicio y el menú', () => {
    expect(fase(senales({ pasos: pasos({}, ['1.1', '3.4']) }), 'landscape').avance).toBe('2/13')
    expect(fase(senales({ estrategia: estrategia(3) }), 'estrategia').avance).toBe('3/14')
    // Las que no se cuentan no inventan un número.
    expect(fase(senales(), 'taller').avance).toBeUndefined()
    expect(fase(senales(), 'naming').avance).toBeUndefined()
  })

  it('la personalidad que se sincroniza sola no cuenta como estrategia empezada', () => {
    expect(fase(senales(), 'estrategia').estado).toBe('pendiente')
    expect(fase(senales({ estrategia: estrategia(0, { trabajada: true }) }), 'estrategia').estado).toBe('en_curso')
  })

  it('naming y diseño dicen lo que marcó el equipo', () => {
    expect(fase(senales(), 'naming').estado).toBe('pendiente')
    expect(fase(senales({ manual: { naming: 'en_curso' } }), 'naming').estado).toBe('en_curso')
    expect(fase(senales({ manual: { diseno: 'completa' } }), 'diseno').detalle).toBe('Terminado')
  })
})

describe('faseActual', () => {
  it('sin nada empezado, el proyecto está en Taller', () => {
    expect(faseActual(estadoDeFases(senales({ sesionesTotal: 0, sesionesCompletas: 0 })))).toBe('taller')
  })

  it('es la fase más avanzada que arrancó, aunque el taller siga abierto', () => {
    const s = senales({ pasos: pasos({}, ['1.1']) })
    expect(faseActual(estadoDeFases(s))).toBe('landscape')
  })

  it('si la más avanzada ya terminó, toca la siguiente', () => {
    expect(faseActual(estadoDeFases(senales({ manual: { taller: 'completa' } })))).toBe('landscape')
  })
})

describe('queSigue', () => {
  it('lo frenado a mano manda sobre lo calculado', () => {
    expect(queSigue(senales({ estadoManual: 'cliente' }), estadoDeFases(senales())).texto).toBe('Esperando al cliente')
  })

  it('en el taller, primero las entrevistas y después la propuesta', () => {
    const s = senales({ sesionesCompletas: 3 })
    expect(queSigue(s, estadoDeFases(s))).toMatchObject({ quien: 'cliente', detalle: '3 de 4 respondidas' })
    const sinPropuesta = senales({ tienePropuesta: false })
    expect(queSigue(sinPropuesta, estadoDeFases(sinPropuesta))).toMatchObject({ quien: 'equipo', detalle: 'Generar la propuesta de valor' })
  })

  it('en el landscape, lo que espera revisión va antes que lo pendiente', () => {
    const s = senales({
      pasos: pasos({ contexto: { status: 'en_curso', contenido: { fuentes: [{ url: 'x' }], resumen: 'r' } } }, ['1.1']),
    })
    expect(queSigue(s, estadoDeFases(s))).toMatchObject({
      quien: 'revisar', detalle: 'Fuentes del sector', href: '/admin/projects/p1/landscape?paso=2.1',
    })
  })

  it('en el landscape sin nada por revisar, dice de quién es el primer paso pendiente', () => {
    const s = senales({ pasos: pasos({}, ['1.1']) })
    expect(queSigue(s, estadoDeFases(s))).toMatchObject({ quien: 'claude', detalle: 'Enfoque del estudio' })
  })

  it('en estrategia, un borrador esperando decisión es lo primero', () => {
    const s = senales({ manual: { taller: 'completa', naming: 'completa' }, estrategia: estrategia(2, { espera: true }) })
    expect(queSigue(s, estadoDeFases(s))).toMatchObject({ quien: 'revisar', detalle: 'Etapa 2', href: '/admin/projects/p1/estrategia?etapa=e2' })
  })
})
