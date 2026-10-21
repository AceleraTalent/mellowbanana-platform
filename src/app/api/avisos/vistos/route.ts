import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sesionDe } from '@/lib/admin/auth'
import { marcarAvisosVistos } from '@/lib/db/usuarios-store'

/** Quien abrió los avisos ya los vio. La llave maestra no lleva la cuenta. */
export async function POST(req: Request) {
  const quien = await sesionDe(req)
  if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!quien.maestra) await marcarAvisosVistos(db, quien.id)
  return NextResponse.json({ ok: true })
}
