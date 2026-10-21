import { describe, it, expect } from 'vitest'
import { makeTestDb } from '@/lib/db/testdb'
import { assignSessionToProject, completeSession, createSession, findOrCreateProject } from '@/lib/db/store'
import { avisosRecientes, cuantosNuevos } from './avisos'

describe('avisos', () => {
  it('cada entrevista completa es un aviso, lo más nuevo arriba, con su cliente y su link', async () => {
    const db = await makeTestDb()
    const p = await findOrCreateProject(db, 'Heroica')
    const a = await createSession(db, { name: 'Diana', company: 'Heroica' })
    await assignSessionToProject(db, a.id, p.id)
    await completeSession(db, a.id)
    await createSession(db, { name: 'Sin terminar', company: 'Heroica' })

    const avisos = await avisosRecientes(db)
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatchObject({ texto: 'Diana completó su entrevista', detalle: 'Heroica', href: `/admin/${a.id}` })
  })

  it('lo nuevo es lo que llegó después de la última vez que la persona miró', () => {
    const aviso = (iso: string) => ({ id: iso, texto: 't', href: '/', cuando: new Date(iso) })
    const avisos = [aviso('2026-10-21T12:00:00Z'), aviso('2026-10-20T12:00:00Z')]
    expect(cuantosNuevos(avisos, new Date('2026-10-21T00:00:00Z'))).toBe(1)
    expect(cuantosNuevos(avisos, new Date('2026-10-22T00:00:00Z'))).toBe(0)
    // La llave maestra no lleva la cuenta.
    expect(cuantosNuevos(avisos, null)).toBe(0)
  })
})
