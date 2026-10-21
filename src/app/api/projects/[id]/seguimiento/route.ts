import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { ErrorDeValidacion, ErrorNoEncontrado } from '@/lib/db/store'
import { actualizarSeguimiento, validarCambios } from '@/lib/db/seguimiento-store'
import { esUuidValido } from '@/lib/landscape/ids'

/** El equipo edita el seguimiento de un proyecto desde la tabla del inicio. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sesionDe(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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

  try {
    return NextResponse.json(await actualizarSeguimiento(db, id, validarCambios(body as Record<string, unknown>)))
  } catch (e) {
    if (e instanceof ErrorNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('Error inesperado al actualizar el seguimiento:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
