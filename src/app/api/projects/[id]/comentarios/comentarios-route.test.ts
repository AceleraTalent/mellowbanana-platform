import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  return { db: await makeTestDb() }
})

import { GET, POST } from './route'
import { db } from '@/lib/db/client'
import { cookieDeSesion } from '@/lib/admin/sesion-de-prueba'
import { findOrCreateProject } from '@/lib/db/store'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const pedir = (id: string, init: RequestInit = {}, conCookie = true) => new Request(`http://localhost/api/projects/${id}/comentarios`, {
  ...init, headers: { 'content-type': 'application/json', ...(conCookie ? cookieDeSesion() : {}) },
})

describe('/api/projects/[id]/comentarios', () => {
  it('sin sesión no se lee ni se comenta', async () => {
    const p = await findOrCreateProject(db, 'Viajero')
    expect((await GET(pedir(p.id, {}, false), params(p.id))).status).toBe(401)
    expect((await POST(pedir(p.id, { method: 'POST', body: JSON.stringify({ texto: 'x' }) }, false), params(p.id))).status).toBe(401)
  })

  it('comentar firma con quien entró, y el comentario aparece al leer', async () => {
    const p = await findOrCreateProject(db, 'Petfly')
    const res = await POST(pedir(p.id, { method: 'POST', body: JSON.stringify({ texto: 'Aprobaron el empaque' }) }), params(p.id))
    expect(res.status).toBe(201)
    expect((await res.json()).comentario).toMatchObject({ autor: 'Equipo M&B', texto: 'Aprobaron el empaque', desde: 'panel' })
    const { comentarios } = await (await GET(pedir(p.id), params(p.id))).json()
    expect(comentarios.map((c: { texto: string }) => c.texto)).toEqual(['Aprobaron el empaque'])
  })

  it('un comentario vacío es un 400', async () => {
    const p = await findOrCreateProject(db, 'Arbo')
    expect((await POST(pedir(p.id, { method: 'POST', body: JSON.stringify({ texto: ' ' }) }), params(p.id))).status).toBe(400)
  })
})
