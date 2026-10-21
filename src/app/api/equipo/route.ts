import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { ErrorDeValidacion } from '@/lib/db/store'
import { crearUsuario, listarUsuarios } from '@/lib/db/usuarios-store'

/** Quiénes son del equipo. Lo ve cualquiera que entró. */
export async function GET(req: Request) {
  if (!(await sesionDe(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json(await listarUsuarios(db))
}

/** Crear una cuenta: sólo quien administra (o la llave maestra). */
export async function POST(req: Request) {
  const quien = await sesionDe(req)
  if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!quien.esAdmin) return NextResponse.json({ error: 'Sólo quien administra el equipo puede crear cuentas' }, { status: 403 })

  let body: Record<string, unknown> = {}
  try { body = (await req.json()) ?? {} } catch { /* cae a la validación */ }
  const texto = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '')
  try {
    const nuevo = await crearUsuario(db, {
      nombre: texto('nombre'), usuario: texto('usuario'), clave: texto('clave'), esAdmin: body.esAdmin === true,
    })
    return NextResponse.json(nuevo, { status: 201 })
  } catch (e) {
    if (e instanceof ErrorDeValidacion) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
