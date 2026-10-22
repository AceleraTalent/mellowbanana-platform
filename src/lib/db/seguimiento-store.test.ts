import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestDb, type TestDb } from './testdb'
import { findOrCreateProject, ErrorDeValidacion, ErrorNoEncontrado } from './store'
import { actualizarSeguimiento, seguimientosPorProyecto, validarCambios } from './seguimiento-store'

let db: TestDb
let projectId: string

beforeEach(async () => {
  db = await makeTestDb()
  projectId = (await findOrCreateProject(db, 'Grupo Heroica')).id
})

describe('actualizarSeguimiento', () => {
  it('crea el seguimiento la primera vez y después solo toca lo que llega', async () => {
    await actualizarSeguimiento(db, projectId, { encargado: 'Isa' })
    await actualizarSeguimiento(db, projectId, { notas: 'El cliente pidió mover la entrega' })
    expect((await seguimientosPorProyecto(db)).get(projectId)).toMatchObject({
      encargado: 'Isa', notas: 'El cliente pidió mover la entrega', fechaEntrega: null, estadoManual: null,
    })
  })

  it('las fases manuales se suman sin pisarse', async () => {
    await actualizarSeguimiento(db, projectId, { fase: { key: 'naming', estado: 'en_curso' } })
    await actualizarSeguimiento(db, projectId, { fase: { key: 'taller', estado: 'completa' } })
    expect((await seguimientosPorProyecto(db)).get(projectId)!.fases).toEqual({ naming: 'en_curso', taller: 'completa' })
  })

  it('un proyecto que no existe es un 404, no un seguimiento huérfano', async () => {
    await expect(actualizarSeguimiento(db, '00000000-0000-4000-8000-000000000000', { encargado: 'Isa' }))
      .rejects.toBeInstanceOf(ErrorNoEncontrado)
  })
})

describe('clientes por fuera', () => {
  it('Landscape y Estrategia sólo se marcan a mano si el cliente lleva su proceso por fuera', async () => {
    const p = await findOrCreateProject(db, 'Viajero')
    await expect(actualizarSeguimiento(db, p.id, { fase: { key: 'landscape', estado: 'completa' } })).rejects.toThrow(ErrorDeValidacion)
    const s = await actualizarSeguimiento(db, p.id, { porFuera: true, fase: { key: 'landscape', estado: 'completa' } })
    expect(s).toMatchObject({ porFuera: true, fases: { landscape: 'completa' } })
  })

  it('moverlo a una fase deja lo anterior terminado y lo siguiente sin empezar, como en Notion', async () => {
    const p = await findOrCreateProject(db, 'Píntala')
    await expect(actualizarSeguimiento(db, p.id, { moverA: 'diseno' })).rejects.toThrow(ErrorDeValidacion)
    await actualizarSeguimiento(db, p.id, { porFuera: true })
    expect((await actualizarSeguimiento(db, p.id, { moverA: 'naming' })).fases)
      .toEqual({ taller: 'completa', landscape: 'completa', estrategia: 'completa', naming: 'en_curso', diseno: 'pendiente' })
    expect(Object.values((await actualizarSeguimiento(db, p.id, { moverA: 'terminado' })).fases)).toEqual(Array(5).fill('completa'))
    expect((await seguimientosPorProyecto(db)).get(p.id)?.porFuera).toBe(true)
  })
})

describe('validarCambios', () => {
  it('recorta, y lo vacío se guarda como sin valor', () => {
    expect(validarCambios({ encargado: '  Isa  ', notas: '   ' })).toEqual({ encargado: 'Isa', notas: null })
  })

  it('rechaza fechas, estados y fases que no existen', () => {
    expect(() => validarCambios({ fechaEntrega: '20/10/2026' })).toThrow(ErrorDeValidacion)
    expect(() => validarCambios({ estadoManual: 'archivado' })).toThrow(ErrorDeValidacion)
    expect(() => validarCambios({ fase: { key: 'artes', estado: 'completa' } })).toThrow(ErrorDeValidacion)
    expect(() => validarCambios({ moverA: 'artes' })).toThrow(ErrorDeValidacion)
    expect(() => validarCambios({ porFuera: 'si' })).toThrow(ErrorDeValidacion)
  })

  it('lo que no vino no aparece, para no borrarlo', () => {
    expect(validarCambios({ fechaEntrega: '2026-11-30' })).toEqual({ fechaEntrega: '2026-11-30' })
  })
})
