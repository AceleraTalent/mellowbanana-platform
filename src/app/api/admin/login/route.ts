import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { ErrorDeValidacion } from '@/lib/db/store'
import { cambiarClave, cuentaSinEstrenar, verificarCredenciales } from '@/lib/db/usuarios-store'
import { COOKIE_SESION, DURACION_SESION_MS, firmarSesion } from '@/lib/admin/sesion'

/**
 * Entrar al panel: cada persona con su usuario y su clave. La clave del equipo (la que
 * antes abría todo) ya no entra sola: sólo sirve para estrenar una cuenta que el estudio
 * dejó creada sin clave. Ahí la persona elige la suya y la del equipo deja de servirle.
 * Un fallo tarda un poco a propósito: probar claves a ciegas cuesta más.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try { body = (await req.json()) ?? {} } catch { /* body vacío: cae a credenciales inválidas */ }
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim() : ''
  const clave = typeof body.clave === 'string' ? body.clave : ''
  const nueva = typeof body.nueva === 'string' ? body.nueva : ''

  let uid: string | null = null
  if (usuario && clave) {
    uid = (await verificarCredenciales(db, usuario, clave))?.id ?? null
    if (!uid && process.env.ADMIN_PASSWORD && clave === process.env.ADMIN_PASSWORD) {
      const sinEstrenar = await cuentaSinEstrenar(db, usuario)
      if (sinEstrenar) {
        // Primera vez: falta que elija su clave. Sin ella no hay sesión todavía.
        if (!nueva) return NextResponse.json({ primeraVez: true, nombre: sinEstrenar.nombre }, { status: 409 })
        try {
          await cambiarClave(db, sinEstrenar.id, nueva)
        } catch (e) {
          if (e instanceof ErrorDeValidacion) return NextResponse.json({ primeraVez: true, error: e.message }, { status: 400 })
          throw e
        }
        uid = sinEstrenar.id
      }
    }
  }

  if (!uid) {
    await new Promise(r => setTimeout(r, 400))
    return NextResponse.json({ error: 'El usuario o la clave no coinciden' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESION, await firmarSesion(uid), {
    httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
    maxAge: DURACION_SESION_MS / 1000,
  })
  // La cookie de antes guardaba la clave tal cual: se borra al entrar.
  res.cookies.delete('admin')
  return res
}
