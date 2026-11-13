import { describe, expect, it } from 'vitest'
import { aplicarCambioDeTareas, cuentaDeTareas, listaDe, tareasDeFase, validarCambioDeTareas, type TareasGuardadas } from './tareas'

describe('tareasDeFase', () => {
  it('con pasos de la plataforma, las tareas son esos pasos y suman lo que anotó el equipo', () => {
    const guardadas: TareasGuardadas = { asignadas: { 'landscape:2.2': { responsable: 'Lina Buenahora', fecha: '2026-11-20' } } }
    const tareas = tareasDeFase('landscape', guardadas, [
      { id: 'landscape:2.1', titulo: 'Fuentes del sector', hecha: true, href: '/x' },
      { id: 'landscape:2.2', titulo: 'Contexto del sector', hecha: false, porRevisar: true },
    ])
    expect(tareas.map(t => [t.id, t.hecha, t.manual, t.responsable, t.fecha])).toEqual([
      ['landscape:2.1', true, false, null, null],
      ['landscape:2.2', false, false, 'Lina Buenahora', '2026-11-20'],
    ])
    expect(cuentaDeTareas(tareas)).toBe('1/2')
  })

  it('sin pasos (Naming, Diseño, un cliente por fuera) usa la lista a mano, con lo marcado', () => {
    const tareas = tareasDeFase('naming', { hechas: { 'naming:m1': true } })
    expect(tareas[0]).toMatchObject({ id: 'naming:m1', titulo: 'Brief de naming', hecha: true, manual: true })
    expect(tareas.slice(1).every(t => !t.hecha && t.manual)).toBe(true)
  })
})

describe('aplicarCambioDeTareas', () => {
  it('asignar toca sólo lo que llega, y una tarea sin responsable ni fecha no deja rastro', () => {
    let g = aplicarCambioDeTareas({}, { tipo: 'asignar', id: 'diseno:m1', responsable: 'Isa', fecha: '2026-12-01' })
    g = aplicarCambioDeTareas(g, { tipo: 'asignar', id: 'diseno:m1', fecha: null })
    expect(g.asignadas).toEqual({ 'diseno:m1': { responsable: 'Isa', fecha: null } })
    g = aplicarCambioDeTareas(g, { tipo: 'asignar', id: 'diseno:m1', responsable: null })
    expect(g.asignadas).toEqual({})
  })

  it('marcar y desmarcar', () => {
    const g = aplicarCambioDeTareas({}, { tipo: 'marcar', id: 'diseno:m2', hecha: true })
    expect(g.hechas).toEqual({ 'diseno:m2': true })
    expect(aplicarCambioDeTareas(g, { tipo: 'marcar', id: 'diseno:m2', hecha: false }).hechas).toEqual({})
  })

  it('reescribir la lista conserva las tareas que siguen y da ids nuevos, sin chocar, a las nuevas', () => {
    const previo: TareasGuardadas = { hechas: { 'naming:m2': true } }
    const g = aplicarCambioDeTareas(previo, {
      tipo: 'lista', fase: 'naming',
      titulos: [{ id: 'naming:m2', titulo: 'Exploración de nombres' }, { titulo: 'Registro de marca' }],
    })
    const lista = listaDe('naming', g)
    expect(lista.map(t => t.titulo)).toEqual(['Exploración de nombres', 'Registro de marca'])
    expect(lista[0].id).toBe('naming:m2')
    expect(['naming:m1', 'naming:m2', 'naming:m3', 'naming:m4', 'naming:m5']).not.toContain(lista[1].id)
    expect(tareasDeFase('naming', g).map(t => t.hecha)).toEqual([true, false])
  })
})

describe('validarCambioDeTareas', () => {
  it('acepta los tres cambios y limpia el texto', () => {
    expect(validarCambioDeTareas({ tipo: 'asignar', id: 'estrategia:onlyness', responsable: '  Isa ' })).toEqual({ tipo: 'asignar', id: 'estrategia:onlyness', responsable: 'Isa' })
    expect(validarCambioDeTareas({ tipo: 'marcar', id: 'diseno:m1', hecha: true })).toEqual({ tipo: 'marcar', id: 'diseno:m1', hecha: true })
    expect(validarCambioDeTareas({ tipo: 'lista', fase: 'diseno', titulos: [{ titulo: ' Brandbook ' }] })).toEqual({ tipo: 'lista', fase: 'diseno', titulos: [{ id: undefined, titulo: 'Brandbook' }] })
  })

  it('rechaza lo que no entiende', () => {
    expect(() => validarCambioDeTareas({ tipo: 'borrar', id: 'x:1' })).toThrow(/tipo/)
    expect(() => validarCambioDeTareas({ tipo: 'asignar', id: 'sin dos puntos' })).toThrow(/id/)
    expect(() => validarCambioDeTareas({ tipo: 'asignar', id: 'diseno:m1', fecha: '12/01/2026' })).toThrow(/fecha/)
    expect(() => validarCambioDeTareas({ tipo: 'lista', fase: 'ventas', titulos: [] })).toThrow(/fase/)
    expect(() => validarCambioDeTareas({ tipo: 'lista', fase: 'diseno', titulos: [{ titulo: '' }] })).toThrow(/título/)
  })
})
