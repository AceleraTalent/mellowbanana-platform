import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { verificarCredenciales } from '@/lib/db/usuarios-store'
import { COOKIE_SESION, DURACION_SESION_MS, MAESTRA, firmarSesion } from '@/lib/admin/sesion'

/**
 * Entrar al panel. La clave del equipo (ADMIN_PASSWORD, la de siempre) entra siempre,
 * venga con usuario o sin él: nadie del estudio se queda afuera por no tener cuenta o por
 * escribir su nombre en el campo equivocado. Con usuario y su propia clave, entra esa
 * persona y lo que apruebe queda con su nombre. Un fallo tarda un poco a propósito:
 * probar claves a ciegas cuesta más.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try { body = (await req.json()) ?? {} } catch { /* body vacío: cae a credenciales inválidas */ }
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim() : ''
  // `pw` es el nombre que usaba el formulario anterior: una pestaña vieja abierta sigue entrando.
  const clave = typeof body.clave === 'string' ? body.clave : typeof body.pw === 'string' ? body.pw : ''

  let uid: string | null = null
  if (usuario) uid = (await verificarCredenciales(db, usuario, clave))?.id ?? null
  if (!uid && clave && process.env.ADMIN_PASSWORD && clave === process.env.ADMIN_PASSWORD) uid = MAESTRA

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
