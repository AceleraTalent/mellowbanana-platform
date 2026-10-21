import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  return { db: await makeTestDb() }
})

import { db } from '@/lib/db/client'
import { sesionDe, firmaDe } from './auth'
import { firmarSesion, leerSesion, COOKIE_SESION, DURACION_SESION_MS } from './sesion'
import { cookieDeSesion } from './sesion-de-prueba'
import { crearUsuario, actualizarUsuario } from '@/lib/db/usuarios-store'

const pedidoCon = (cookie?: string) => new Request('http://localhost/x', { headers: cookie ? { cookie } : {} })

beforeEach(() => { process.env.ADMIN_PASSWORD = 'secreta'; delete process.env.SESSION_SECRET })

describe('sesión firmada', () => {
  it('lo que se firma se lee, y vence', async () => {
    const ahora = Date.now()
    const valor = await firmarSesion('abc', ahora)
    expect(await leerSesion(valor, ahora)).toMatchObject({ uid: 'abc' })
    expect(await leerSesion(valor, ahora + DURACION_SESION_MS + 1)).toBeNull()
  })

  it('una cookie tocada a mano no vale', async () => {
    const [uid, vence, firma] = (await firmarSesion('abc')).split('.')
    expect(await leerSesion(`otro.${vence}.${firma}`)).toBeNull()
    expect(await leerSesion(`${uid}.${Number(vence) + 1}.${firma}`)).toBeNull()
    expect(await leerSesion('secreta')).toBeNull()
  })

  it('cambiar la llave maestra cierra todas las sesiones', async () => {
    const valor = await firmarSesion('abc')
    process.env.ADMIN_PASSWORD = 'otra'
    expect(await leerSesion(valor)).toBeNull()
  })

  it('la cookie de las pruebas firma igual que la de verdad', async () => {
    const valor = cookieDeSesion('abc').cookie.slice(COOKIE_SESION.length + 1)
    expect(await leerSesion(valor)).toMatchObject({ uid: 'abc' })
  })
})

describe('sesionDe', () => {
  it('la cookie vieja (la clave tal cual) ya no abre nada', async () => {
    expect(await sesionDe(pedidoCon('admin=secreta'))).toBeNull()
  })

  it('con la llave maestra entra como administración, sin nombre para firmar', async () => {
    const quien = await sesionDe(pedidoCon(cookieDeSesion().cookie))
    expect(quien).toMatchObject({ esAdmin: true, maestra: true })
    expect(firmaDe(quien!)).toBeUndefined()
  })

  it('una persona del equipo entra con su nombre, y desactivarla le cierra la puerta', async () => {
    const ana = await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    const cookie = cookieDeSesion(ana.id).cookie
    const quien = await sesionDe(pedidoCon(cookie))
    expect(quien).toMatchObject({ nombre: 'Ana', esAdmin: false, maestra: false })
    expect(firmaDe(quien!)).toBe('Ana')

    await actualizarUsuario(db, ana.id, { activo: false })
    expect(await sesionDe(pedidoCon(cookie))).toBeNull()
  })
})
