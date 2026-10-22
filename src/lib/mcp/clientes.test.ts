import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestDb, type TestDb } from '@/lib/db/testdb'
import { findOrCreateProject } from '@/lib/db/store'
import { seguimientoDe } from '@/lib/db/seguimiento-store'
import { actualizarCliente, comentarCliente, verCliente } from './clientes'
import { listarProyectos } from './tools'
import { ErrorDeHerramienta } from './errores'

let db: TestDb
beforeEach(async () => { db = await makeTestDb() })

describe('actualizar_cliente · el tablero desde el chat', () => {
  it('con crear, un cliente nuevo nace por fuera, en su fase y con lo que dijo el equipo', async () => {
    const r = await actualizarCliente(db, {
      cliente: 'Viajero', crear: true, fase: 'diseno', encargado: 'Lina', fechaEntrega: '2026-11-07', notas: 'Piezas nuevas',
    })
    expect(r).toMatchObject({
      cliente: 'Viajero', creado: true, porFuera: true, fase: 'Diseño (en curso)', encargado: 'Lina', entrega: '2026-11-07', notas: 'Piezas nuevas',
    })
    expect(r.verEnElPanel).toMatch(/\/admin\/projects\/[0-9a-f-]{36}$/)
  })

  it('sin crear, un nombre que no existe es un error que lista los que hay', async () => {
    await findOrCreateProject(db, 'Glas')
    await expect(actualizarCliente(db, { cliente: 'Glass', fase: 'diseno' })).rejects.toThrow(/Los que hay son: Glas/)
  })

  it('manda sólo lo que cambia: lo demás queda, null borra, y sin empezar se respeta', async () => {
    await actualizarCliente(db, { cliente: 'Arbo', crear: true, fase: 'diseno', encargado: 'Victor', notas: 'Reunión' })
    const r = await actualizarCliente(db, { cliente: 'arbo', fase: 'naming', sinEmpezar: true, notas: null, frenado: 'cliente' })
    expect(r).toMatchObject({ creado: false, fase: 'Naming (sin empezar)', encargado: 'Victor', notas: null, queSigue: 'Esperando al cliente' })
  })

  it('a un cliente de la plataforma también se lo mueve: la fase queda a mano, y se puede volver a calcular', async () => {
    const p = await findOrCreateProject(db, 'Grupo Heroica')
    expect(await actualizarCliente(db, { cliente: 'Grupo Heroica', fase: 'diseno' })).toMatchObject({ porFuera: false, fase: 'Diseño (en curso)' })
    expect((await seguimientoDe(db, p.id)).faseAMano).toBe(true)
    await actualizarCliente(db, { cliente: 'Grupo Heroica', calcularSola: true })
    expect(await seguimientoDe(db, p.id)).toMatchObject({ faseAMano: false, fases: {} })
  })

  it('una fecha mal escrita no guarda nada y lo dice', async () => {
    await expect(actualizarCliente(db, { cliente: 'Petfly', crear: true, fechaEntrega: '8 de sept' })).rejects.toThrow(/AAAA-MM-DD/)
    expect(await listarProyectos(db)).toHaveLength(0)
  })

  it('listar_proyectos trae el tablero: fase, encargado y si va por fuera', async () => {
    await actualizarCliente(db, { cliente: 'Píntala', crear: true, fase: 'diseno', encargado: 'Victor, Mathew' })
    expect((await listarProyectos(db))[0]).toMatchObject({ nombre: 'Píntala', porFuera: true, fase: 'Diseño (en curso)', encargado: 'Victor, Mathew' })
  })
})

describe('ver_cliente y comentar_cliente · la ficha desde el chat', () => {
  it('ver_cliente trae la ficha y los últimos comentarios, del más nuevo al más viejo', async () => {
    await actualizarCliente(db, { cliente: 'Viajero', crear: true, fase: 'diseno', encargado: 'Lina', notas: 'Piezas nuevas' })
    await comentarCliente(db, { cliente: 'viajero', comentario: 'Arrancamos las piezas', autor: 'Lina' })
    await new Promise(r => setTimeout(r, 5))
    await comentarCliente(db, { cliente: 'Viajero', comentario: 'El cliente aprobó la paleta' })
    const ficha = await verCliente(db, 'Viajero')
    expect(ficha).toMatchObject({ cliente: 'Viajero', fase: 'Diseño (en curso)', encargado: 'Lina', notas: 'Piezas nuevas' })
    expect(ficha.comentarios.map(c => [c.autor, c.texto])).toEqual([
      ['Claude', 'El cliente aprobó la paleta'], ['Lina (vía Claude)', 'Arrancamos las piezas'],
    ])
    expect(ficha.verEnElPanel).toMatch(/\/admin\/projects\//)
  })

  it('un comentario vacío o de un cliente que no existe es un error que Claude puede leer', async () => {
    await actualizarCliente(db, { cliente: 'Glas', crear: true })
    await expect(comentarCliente(db, { cliente: 'Glas', comentario: '  ' })).rejects.toThrow(ErrorDeHerramienta)
    await expect(comentarCliente(db, { cliente: 'Glass', comentario: 'hola' })).rejects.toThrow(/Los que hay son: Glas/)
  })
})

describe('actualizar_cliente · nombre y proceso', () => {
  it('cambia el nombre; si choca con otro cliente, no toca nada', async () => {
    await actualizarCliente(db, { cliente: 'Bogota Eats', crear: true, fase: 'diseno' })
    await actualizarCliente(db, { cliente: 'Arbo', crear: true })
    expect(await actualizarCliente(db, { cliente: 'Bogota Eats', nombre: 'Bogotá Eats' })).toMatchObject({ cliente: 'Bogotá Eats' })
    await expect(actualizarCliente(db, { cliente: 'Bogotá Eats', nombre: 'arbo', notas: 'x' })).rejects.toThrow(/Ya hay otro/)
    expect((await verCliente(db, 'Bogotá Eats')).notas).toBeNull()
  })

  it('pasarlo a por fuera arranca en la fase en la que va, no desde cero', async () => {
    const p = await findOrCreateProject(db, 'Grupo Heroica')
    await actualizarCliente(db, { cliente: 'Grupo Heroica', fase: 'naming' })
    const r = await actualizarCliente(db, { cliente: p.name, porFuera: true })
    // Naming estaba en curso: ahí sigue, y lo anterior queda terminado.
    expect(r).toMatchObject({ porFuera: true, fase: 'Naming (en curso)' })
  })

  it('un pedido contradictorio no se cumple, y tampoco se cambia el nombre', async () => {
    await findOrCreateProject(db, 'Cafe Lunar')
    await expect(actualizarCliente(db, { cliente: 'Cafe Lunar', fase: 'estrategia', calcularSola: true, nombre: 'Café Lunar' })).rejects.toThrow(ErrorDeHerramienta)
    expect((await listarProyectos(db)).map(p => p.nombre)).toEqual(['Cafe Lunar'])
  })
})
