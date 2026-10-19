import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestDb, type TestDb } from './testdb'
import { findOrCreateProject, ErrorDeValidacion, ErrorNoEncontrado } from './store'
import { marcarPaso, pasosMarcados } from './pasos-store'

let db: TestDb
let projectId: string

beforeEach(async () => {
  db = await makeTestDb()
  projectId = (await findOrCreateProject(db, 'Grupo Heroica')).id
})

describe('marcarPaso', () => {
  it('marca y desmarca un paso de afuera', async () => {
    await marcarPaso(db, projectId, '1.1', true, 'Isa')
    expect(await pasosMarcados(db, projectId)).toEqual(new Set(['1.1']))
    await marcarPaso(db, projectId, '1.1', false)
    expect(await pasosMarcados(db, projectId)).toEqual(new Set())
  })

  it('marcar dos veces no duplica ni falla', async () => {
    await marcarPaso(db, projectId, '3.4', true)
    await marcarPaso(db, projectId, '3.4', true)
    expect([...(await pasosMarcados(db, projectId))]).toEqual(['3.4'])
  })

  it('no deja marcar a mano un paso que se cierra aprobando', async () => {
    await expect(marcarPaso(db, projectId, '2.2', true)).rejects.toBeInstanceOf(ErrorDeValidacion)
  })

  it('rechaza un paso que no existe y un proyecto que no existe', async () => {
    await expect(marcarPaso(db, projectId, '9.9', true)).rejects.toBeInstanceOf(ErrorDeValidacion)
    await expect(marcarPaso(db, '00000000-0000-4000-8000-000000000000', '1.1', true)).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })
})
