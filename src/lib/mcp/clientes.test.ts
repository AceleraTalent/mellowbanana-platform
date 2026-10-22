import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestDb, type TestDb } from '@/lib/db/testdb'
import { findOrCreateProject } from '@/lib/db/store'
import { seguimientoDe } from '@/lib/db/seguimiento-store'
import { actualizarCliente } from './clientes'
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

  it('a un cliente de la plataforma sólo se le marcan Naming y Diseño a mano', async () => {
    const p = await findOrCreateProject(db, 'Grupo Heroica')
    await expect(actualizarCliente(db, { cliente: 'Grupo Heroica', fase: 'landscape' })).rejects.toThrow(ErrorDeHerramienta)
    await actualizarCliente(db, { cliente: 'Grupo Heroica', fase: 'naming' })
    expect((await seguimientoDe(db, p.id)).fases).toEqual({ naming: 'en_curso' })
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
