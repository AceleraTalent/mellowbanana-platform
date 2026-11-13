import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { esDireccion } from '@/lib/admin/permisos'
import { ErrorDeValidacion, ErrorNoEncontrado } from '@/lib/db/store'
import { actualizarSeguimiento, validarCambios } from '@/lib/db/seguimiento-store'
import { esUuidValido } from '@/lib/landscape/ids'

/** El equipo edita el seguimiento de un proyecto desde la tabla del inicio. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await sesionDe(req)
  if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  if (!esUuidValido(id)) return NextResponse.json({ error: `Id de proyecto inválido: ${id}` }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'El body tiene que ser JSON' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return NextResponse.json({ error: 'El body tiene que ser un objeto JSON' }, { status: 400 })

  // El valor del proyecto es de dirección: el equipo no lo cambia ni lo recibe de vuelta.
  const direccion = esDireccion(quien)
  if (!direccion && 'valor' in body)
    return NextResponse.json({ error: 'Sólo dirección puede cambiar el valor del proyecto' }, { status: 403 })

  try {
    const guardado = await actualizarSeguimiento(db, id, validarCambios(body as Record<string, unknown>))
    return NextResponse.json(direccion ? guardado : { ...guardado, valor: null })
  } catch (e) {
    if (e instanceof ErrorNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('Error inesperado al actualizar el seguimiento:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
