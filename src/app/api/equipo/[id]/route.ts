import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { ErrorDeValidacion, ErrorNoEncontrado } from '@/lib/db/store'
import { actualizarUsuario, cambiarClave, claveEsLaDe } from '@/lib/db/usuarios-store'

/**
 * Cambios sobre una cuenta. La clave propia se cambia sabiendo la de ahora; la de otra
 * persona, el nombre ajeno, activar o desactivar y dar o quitar administración, sólo quien
 * administra.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await sesionDe(req)
  if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const propia = quien.id === id

  let body: Record<string, unknown> = {}
  try { body = (await req.json()) ?? {} } catch { /* sin cambios */ }

  try {
    if (typeof body.clave === 'string') {
      if (!quien.esAdmin) {
        if (!propia) return NextResponse.json({ error: 'Sólo puedes cambiar tu propia clave' }, { status: 403 })
        const actual = typeof body.claveActual === 'string' ? body.claveActual : ''
        if (!(await claveEsLaDe(db, id, actual)))
          return NextResponse.json({ error: 'Tu clave actual no coincide' }, { status: 400 })
      }
      await cambiarClave(db, id, body.clave)
    }

    const cambios: { nombre?: string; esAdmin?: boolean; activo?: boolean } = {}
    if (typeof body.nombre === 'string') cambios.nombre = body.nombre
    if (typeof body.esAdmin === 'boolean') cambios.esAdmin = body.esAdmin
    if (typeof body.activo === 'boolean') cambios.activo = body.activo
    const tocaAjeno = cambios.esAdmin !== undefined || cambios.activo !== undefined || (cambios.nombre !== undefined && !propia)
    if (tocaAjeno && !quien.esAdmin)
      return NextResponse.json({ error: 'Sólo quien administra el equipo puede hacer eso' }, { status: 403 })
    if (propia && cambios.activo === false)
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 })

    return NextResponse.json(await actualizarUsuario(db, id, cambios))
  } catch (e) {
    if (e instanceof ErrorNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
