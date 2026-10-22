import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { crearProyecto, ErrorDeValidacion } from '@/lib/db/store'
import { actualizarSeguimiento, validarCambios } from '@/lib/db/seguimiento-store'
import { FASES, type FaseSistema } from '@/lib/seguimiento/sistema'

/**
 * Un cliente nuevo desde el panel, sin esperar a que alguien complete una entrevista. Lo
 * normal es que lleve su proceso por fuera: nace en la fase que diga el equipo, con su
 * encargado, como una tarjeta nueva en Notion.
 */
export async function POST(req: Request) {
  if (!(await sesionDe(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    const b = await req.json()
    if (typeof b !== 'object' || b === null || Array.isArray(b)) throw new Error()
    body = b
  } catch {
    return NextResponse.json({ error: 'El body tiene que ser un objeto JSON' }, { status: 400 })
  }

  const porFuera = body.porFuera !== false
  const fase = (body.fase ?? 'taller') as FaseSistema
  try {
    if (porFuera && !FASES.includes(fase)) throw new ErrorDeValidacion(`fase tiene que ser ${FASES.join(', ')}`)
    // Se valida todo antes de crear: un encargado demasiado largo no deja un cliente a medias.
    const cambios = validarCambios({ ...(body.encargado !== undefined ? { encargado: body.encargado } : {}), porFuera })
    const proyecto = await crearProyecto(db, typeof body.nombre === 'string' ? body.nombre : '')
    await actualizarSeguimiento(db, proyecto.id, porFuera ? { ...cambios, moverA: fase } : cambios)
    return NextResponse.json({ id: proyecto.id, nombre: proyecto.name }, { status: 201 })
  } catch (e) {
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('Error inesperado al crear un cliente:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
