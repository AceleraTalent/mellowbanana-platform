import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestDb, type TestDb } from './testdb'
import { deleteProject, findOrCreateProject, ErrorDeValidacion, ErrorNoEncontrado } from './store'
import { agregarComentario, comentariosDe } from './comentarios-store'

let db: TestDb
beforeEach(async () => { db = await makeTestDb() })

describe('comentarios de un cliente', () => {
  it('se agregan con autor y se leen del más nuevo al más viejo', async () => {
    const p = await findOrCreateProject(db, 'Viajero')
    await agregarComentario(db, p.id, { autor: 'Lina', texto: 'Arrancamos piezas', desde: 'panel' })
    await new Promise(r => setTimeout(r, 5))
    await agregarComentario(db, p.id, { autor: '', texto: '  Aprobó la paleta  ', desde: 'claude' })
    const lista = await comentariosDe(db, p.id)
    expect(lista.map(c => [c.autor, c.texto, c.desde])).toEqual([['Claude', 'Aprobó la paleta', 'claude'], ['Lina', 'Arrancamos piezas', 'panel']])
  })

  it('vacío o de un cliente que no existe, no se guarda', async () => {
    const p = await findOrCreateProject(db, 'Glas')
    await expect(agregarComentario(db, p.id, { autor: 'Lina', texto: '   ', desde: 'panel' })).rejects.toThrow(ErrorDeValidacion)
    await expect(agregarComentario(db, '00000000-0000-4000-8000-000000000000', { autor: 'Lina', texto: 'hola', desde: 'panel' })).rejects.toThrow(ErrorNoEncontrado)
  })

  it('borrar el cliente borra su bitácora', async () => {
    const p = await findOrCreateProject(db, 'Arbo')
    await agregarComentario(db, p.id, { autor: 'Lina', texto: 'Reunión el jueves', desde: 'panel' })
    await deleteProject(db, p.id)
    expect(await comentariosDe(db, p.id)).toEqual([])
  })
})
