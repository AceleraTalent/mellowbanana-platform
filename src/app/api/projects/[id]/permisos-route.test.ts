import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  return { db: await makeTestDb() }
})

import { DELETE } from './route'
import { PATCH } from './seguimiento/route'
import { db } from '@/lib/db/client'
import { cookieDeSesion } from '@/lib/admin/sesion-de-prueba'
import { findOrCreateProject, getProject } from '@/lib/db/store'
import { crearUsuario } from '@/lib/db/usuarios-store'
import { seguimientosPorProyecto } from '@/lib/db/seguimiento-store'
import { paraQuien } from '@/lib/admin/permisos'
import { cargarSistema } from '@/lib/seguimiento/cargar'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const seguir = (id: string, body: unknown, cookie: { cookie: string }) =>
  PATCH(new Request(`http://localhost/api/projects/${id}/seguimiento`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', ...cookie }, body: JSON.stringify(body),
  }), params(id))

/** Una persona del equipo (sin dirección) y otra de dirección, con sus cookies. */
async function gente(sufijo: string) {
  const equipo = await crearUsuario(db, { nombre: 'Vale', usuario: `vale${sufijo}`, clave: 'una-clave-larga' })
  const direccion = await crearUsuario(db, { nombre: 'Lu', usuario: `lu${sufijo}`, clave: 'una-clave-larga', esAdmin: true })
  return { equipo: cookieDeSesion(equipo.id), direccion: cookieDeSesion(direccion.id) }
}

describe('lo que es sólo de dirección', () => {
  it('el equipo no cambia el valor del proyecto; dirección sí', async () => {
    const g = await gente('a')
    const p = await findOrCreateProject(db, 'Con valor')

    const negado = await seguir(p.id, { valor: 5_000_000 }, g.equipo)
    expect(negado.status).toBe(403)
    expect((await seguimientosPorProyecto(db)).get(p.id)?.valor ?? null).toBeNull()

    const hecho = await seguir(p.id, { valor: 5_000_000 }, g.direccion)
    expect(hecho.status).toBe(200)
    expect((await hecho.json()).valor).toBe(5_000_000)
  })

  it('el equipo edita lo demás y no recibe el valor de vuelta', async () => {
    const g = await gente('b')
    const p = await findOrCreateProject(db, 'Con nota')
    await seguir(p.id, { valor: 9_000_000 }, g.direccion)

    const res = await seguir(p.id, { notas: 'Llamar el lunes' }, g.equipo)
    expect(res.status).toBe(200)
    const cuerpo = await res.json()
    expect(cuerpo.notas).toBe('Llamar el lunes')
    expect(cuerpo.valor).toBeNull()
    expect((await seguimientosPorProyecto(db)).get(p.id)?.valor).toBe(9_000_000)
  })

  it('el Sistema que ve el equipo no trae valores', async () => {
    const p = await findOrCreateProject(db, 'Reservado')
    const g = await gente('c')
    await seguir(p.id, { valor: 7_000_000 }, g.direccion)
    const filas = await cargarSistema(db)

    const delEquipo = paraQuien(filas, { esAdmin: false }).find(f => f.id === p.id)!
    expect(delEquipo.seguimiento.valor).toBeNull()
    expect(delEquipo.valorOculto).toBe(true)
    expect(paraQuien(filas, { esAdmin: true }).find(f => f.id === p.id)!.seguimiento.valor).toBe(7_000_000)
    expect(paraQuien(filas, null).find(f => f.id === p.id)!.seguimiento.valor).toBeNull()
  })

  it('el equipo no borra clientes; dirección sí', async () => {
    const g = await gente('d')
    const p = await findOrCreateProject(db, 'Intocable')
    const borrar = (cookie: { cookie: string }) =>
      DELETE(new Request(`http://localhost/api/projects/${p.id}`, { method: 'DELETE', headers: cookie }), params(p.id))

    expect((await borrar(g.equipo)).status).toBe(403)
    expect(await getProject(db, p.id)).not.toBeNull()
    expect((await borrar(g.direccion)).status).toBe(200)
    expect(await getProject(db, p.id)).toBeNull()
  })
})
