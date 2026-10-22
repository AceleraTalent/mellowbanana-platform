import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { ErrorDeValidacion, ErrorNoEncontrado } from '@/lib/db/store'
import { agregarComentario, comentariosDe } from '@/lib/db/comentarios-store'
import { esUuidValido } from '@/lib/landscape/ids'

/** Los comentarios de un cliente, para el modal del tablero. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sesionDe(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  if (!esUuidValido(id)) return NextResponse.json({ error: `Id de proyecto inválido: ${id}` }, { status: 400 })
  return NextResponse.json({ comentarios: await comentariosDe(db, id) })
}

/** Comentar desde el panel: firma quien entró. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await sesionDe(req)
  if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  if (!esUuidValido(id)) return NextResponse.json({ error: `Id de proyecto inválido: ${id}` }, { status: 400 })
  let texto: unknown
  try { texto = ((await req.json()) as { texto?: unknown })?.texto } catch { /* cae al 400 */ }
  if (typeof texto !== 'string') return NextResponse.json({ error: 'Falta el texto del comentario' }, { status: 400 })
  try {
    const comentario = await agregarComentario(db, id, { autor: quien.nombre, texto, desde: 'panel' })
    return NextResponse.json({ comentario }, { status: 201 })
  } catch (e) {
    if (e instanceof ErrorNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('Error inesperado al comentar:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
