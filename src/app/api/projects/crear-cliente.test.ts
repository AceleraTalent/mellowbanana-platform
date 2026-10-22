import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  return { db: await makeTestDb() }
})

import { POST } from './route'
import { db } from '@/lib/db/client'
import { cookieDeSesion } from '@/lib/admin/sesion-de-prueba'
import { getProject } from '@/lib/db/store'
import { seguimientosPorProyecto } from '@/lib/db/seguimiento-store'

const crear = (body: unknown, conCookie = true) => POST(new Request('http://localhost/api/projects', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(conCookie ? cookieDeSesion() : {}) },
  body: JSON.stringify(body),
}))

describe('POST /api/projects · un cliente nuevo desde el panel', () => {
  it('sin sesión no se crea nada', async () => {
    expect((await crear({ nombre: 'Viajero' }, false)).status).toBe(401)
  })

  it('por fuera, nace en la fase que dijo el equipo y con su encargado', async () => {
    const res = await crear({ nombre: 'Viajero', fase: 'diseno', encargado: 'Lina' })
    expect(res.status).toBe(201)
    const { id } = await res.json()
    expect((await getProject(db, id))?.name).toBe('Viajero')
    expect((await seguimientosPorProyecto(db)).get(id)).toMatchObject({
      porFuera: true, encargado: 'Lina', fases: { estrategia: 'completa', naming: 'completa', diseno: 'en_curso' },
    })
  })

  it('en la plataforma, no se le marca ninguna fase: la plataforma la calcula', async () => {
    const { id } = await (await crear({ nombre: 'Café Norte', porFuera: false })).json()
    expect((await seguimientosPorProyecto(db)).get(id)).toMatchObject({ porFuera: false, fases: {} })
  })

  it('un nombre repetido o vacío no crea otra fila', async () => {
    await crear({ nombre: 'Glas' })
    const repetido = await crear({ nombre: '  glas ' })
    expect(repetido.status).toBe(400)
    expect((await repetido.json()).error).toMatch(/Ya hay un cliente/)
    expect((await crear({ nombre: '   ' })).status).toBe(400)
    expect((await crear({ nombre: 'Arbo', fase: 'artes' })).status).toBe(400)
  })
})
