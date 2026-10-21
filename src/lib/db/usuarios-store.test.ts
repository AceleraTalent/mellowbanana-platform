import { describe, it, expect } from 'vitest'
import { makeTestDb } from './testdb'
import { ErrorDeValidacion } from './store'
import { usuarios } from './schema'
import {
  actualizarUsuario, cambiarClave, claveEsLaDe, crearUsuario, listarUsuarios, verificarCredenciales,
} from './usuarios-store'

describe('cuentas del equipo', () => {
  it('se crean con usuario en minúsculas, y la clave nunca se guarda tal cual', async () => {
    const db = await makeTestDb()
    const ana = await crearUsuario(db, { nombre: ' Ana ', usuario: ' Ana.Gomez ', clave: 'una-clave-larga' })
    expect(ana).toMatchObject({ nombre: 'Ana', usuario: 'ana.gomez', esAdmin: false, activo: true })
    expect(ana).not.toHaveProperty('claveHash')
    const [{ hash }] = await db.select({ hash: usuarios.claveHash }).from(usuarios)
    expect(hash).toMatch(/^scrypt:/)
    expect(hash).not.toContain('una-clave-larga')
  })

  it('entra con su usuario y su clave, escritos como sea; con otra clave no', async () => {
    const db = await makeTestDb()
    await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    expect(await verificarCredenciales(db, ' ANA ', 'una-clave-larga')).toMatchObject({ nombre: 'Ana' })
    expect(await verificarCredenciales(db, 'ana', 'otra-clave-larga')).toBeNull()
    expect(await verificarCredenciales(db, 'nadie', 'una-clave-larga')).toBeNull()
  })

  it('una cuenta desactivada no entra aunque la clave sea buena', async () => {
    const db = await makeTestDb()
    const ana = await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    await actualizarUsuario(db, ana.id, { activo: false })
    expect(await verificarCredenciales(db, 'ana', 'una-clave-larga')).toBeNull()
  })

  it('no se repiten usuarios, y la clave tiene un mínimo', async () => {
    const db = await makeTestDb()
    await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    await expect(crearUsuario(db, { nombre: 'Otra Ana', usuario: 'ANA', clave: 'una-clave-larga' })).rejects.toBeInstanceOf(ErrorDeValidacion)
    await expect(crearUsuario(db, { nombre: 'Beto', usuario: 'beto', clave: 'corta' })).rejects.toBeInstanceOf(ErrorDeValidacion)
    await expect(crearUsuario(db, { nombre: 'Beto', usuario: 'con espacio', clave: 'una-clave-larga' })).rejects.toBeInstanceOf(ErrorDeValidacion)
    expect(await listarUsuarios(db)).toHaveLength(1)
  })

  it('cambiar la clave deja entrar con la nueva y no con la vieja', async () => {
    const db = await makeTestDb()
    const ana = await crearUsuario(db, { nombre: 'Ana', usuario: 'ana', clave: 'una-clave-larga' })
    await cambiarClave(db, ana.id, 'la-clave-nueva')
    expect(await claveEsLaDe(db, ana.id, 'la-clave-nueva')).toBe(true)
    expect(await verificarCredenciales(db, 'ana', 'una-clave-larga')).toBeNull()
  })
})
