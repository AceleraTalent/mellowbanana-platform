import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  return { db: await makeTestDb() }
})

import { GET, POST } from './route'
import { PATCH } from './[id]/route'
import { POST as login } from '../admin/login/route'
import { db } from '@/lib/db/client'
import { makeTestDb } from '@/lib/db/testdb'
import { cookieDeSesion, CLAVE_DE_PRUEBA } from '@/lib/admin/sesion-de-prueba'
import { COOKIE_SESION, leerSesion } from '@/lib/admin/sesion'
import { crearUsuario, verificarCredenciales } from '@/lib/db/usuarios-store'

const json = (body: unknown, cookie?: { cookie: string }) => ({
  method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ?? {}) }, body: JSON.stringify(body),
})
const crear = (body: unknown, cookie?: { cookie: string }) => POST(new Request('http://localhost/api/equipo', json(body, cookie)))
const cambiar = (id: string, body: unknown, cookie?: { cookie: string }) =>
  PATCH(new Request(`http://localhost/api/equipo/${id}`, { ...json(body, cookie), method: 'PATCH' }), { params: Promise.resolve({ id }) })
const entrar = (body: unknown) => login(new Request('http://localhost/api/admin/login', json(body)))

beforeEach(async () => { await makeTestDb(); cookieDeSesion() })

describe('entrar al panel', () => {
  it('con usuario y clave entra esa persona, con una sesión firmada', async () => {
    const ana = await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    const res = await entrar({ usuario: 'Ana', clave: 'una-clave-larga' })
    expect(res.status).toBe(200)
    const valor = res.cookies.get(COOKIE_SESION)!.value
    expect(await leerSesion(valor)).toMatchObject({ uid: ana.id })
  })

  it('la clave del equipo entra siempre, con o sin usuario', async () => {
    await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    for (const body of [{ clave: CLAVE_DE_PRUEBA }, { usuario: 'ana', clave: CLAVE_DE_PRUEBA }, { usuario: 'isa', clave: CLAVE_DE_PRUEBA }]) {
      const res = await entrar(body)
      expect(res.status).toBe(200)
      expect(await leerSesion(res.cookies.get(COOKIE_SESION)!.value)).toMatchObject({ uid: 'maestra' })
    }
  })

  it('con algo que no coincide no entra y no deja cookie', async () => {
    await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    for (const body of [{ usuario: 'ana', clave: 'otra-cosa' }, { clave: 'otra-cosa' }, { usuario: 'isa', clave: 'una-clave-larga' }, {}]) {
      const res = await entrar(body)
      expect(res.status).toBe(401)
      expect(res.cookies.get(COOKIE_SESION)).toBeUndefined()
    }
  })
})

describe('el equipo', () => {
  it('sin sesión no se ve ni se crea nada', async () => {
    expect((await GET(new Request('http://localhost/api/equipo'))).status).toBe(401)
    expect((await crear({ nombre: 'Beto', usuario: 'beto', clave: 'una-clave-larga' })).status).toBe(401)
  })

  it('quien administra crea cuentas; quien no, no', async () => {
    expect((await crear({ nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' }, cookieDeSesion())).status).toBe(201)
    const ana = (await verificarCredenciales(db, 'ana', 'una-clave-larga'))!
    const res = await crear({ nombre: 'Beto', usuario: 'beto', clave: 'una-clave-larga' }, cookieDeSesion(ana.id))
    expect(res.status).toBe(403)
  })

  it('cada quien cambia su clave sabiendo la de ahora', async () => {
    const ana = await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    const suya = cookieDeSesion(ana.id)
    expect((await cambiar(ana.id, { clave: 'la-clave-nueva', claveActual: 'equivocada' }, suya)).status).toBe(400)
    expect((await cambiar(ana.id, { clave: 'la-clave-nueva', claveActual: 'una-clave-larga' }, suya)).status).toBe(200)
    expect(await verificarCredenciales(db, 'ana', 'la-clave-nueva')).not.toBeNull()
  })

  it('nadie sin administración toca la cuenta de otro', async () => {
    const ana = await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    const beto = await crearUsuario(db, { nombre: 'Beto', usuario: 'beto', clave: 'una-clave-larga' })
    const deAna = cookieDeSesion(ana.id)
    expect((await cambiar(beto.id, { clave: 'la-clave-nueva' }, deAna)).status).toBe(403)
    expect((await cambiar(beto.id, { activo: false }, deAna)).status).toBe(403)
    expect((await cambiar(ana.id, { esAdmin: true }, deAna)).status).toBe(403)
  })

  it('quien administra resetea claves y desactiva, pero no se desactiva a sí mismo', async () => {
    const jefa = await crearUsuario(db, { nombre: 'Jefa', usuario: 'jefa', clave: 'una-clave-larga', esAdmin: true })
    const beto = await crearUsuario(db, { nombre: 'Beto', usuario: 'beto', clave: 'una-clave-larga' })
    const deJefa = cookieDeSesion(jefa.id)
    expect((await cambiar(beto.id, { clave: 'la-clave-nueva' }, deJefa)).status).toBe(200)
    expect((await cambiar(beto.id, { activo: false }, deJefa)).status).toBe(200)
    expect(await verificarCredenciales(db, 'beto', 'la-clave-nueva')).toBeNull()
    expect((await cambiar(jefa.id, { activo: false }, deJefa)).status).toBe(400)
  })
})
