import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { esAdminRequest } from '@/lib/admin/auth'
import { ErrorDeValidacion, ErrorNoEncontrado } from '@/lib/db/store'
import { marcarPaso } from '@/lib/db/pasos-store'
import { esUuidValido } from '@/lib/landscape/ids'

/** El equipo marca o desmarca un paso que se resuelve fuera de la plataforma. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!esAdminRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  if (!esUuidValido(id))
    return NextResponse.json({ error: `Id de proyecto inválido: ${id}` }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'El body tiene que ser JSON' }, { status: 400 })
  }
  const { paso, hecho, autor } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (typeof paso !== 'string' || typeof hecho !== 'boolean')
    return NextResponse.json({ error: 'Faltan paso (texto) y hecho (true o false)' }, { status: 400 })

  try {
    await marcarPaso(db, id, paso, hecho, typeof autor === 'string' ? autor : undefined)
    return NextResponse.json({ paso, hecho })
  } catch (e) {
    if (e instanceof ErrorNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('Error inesperado al marcar un paso:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
