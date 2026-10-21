import { desc, eq, isNotNull } from 'drizzle-orm'
import { projects, sessions } from '@/lib/db/schema'
import type { AnyDb } from '@/lib/db/store'

/**
 * Los avisos del panel. Hoy el equipo pidió uno solo: que alguien terminó su entrevista.
 * No tienen tabla propia: salen de las entrevistas completadas, y lo nuevo para cada
 * persona es lo que llegó después de la última vez que miró (`avisosVistosHasta`).
 */
export interface Aviso {
  id: string
  texto: string
  /** El cliente, si se sabe. */
  detalle?: string
  href: string
  cuando: Date
}

export async function avisosRecientes(db: AnyDb, limite = 30): Promise<Aviso[]> {
  const filas = (await db
    .select({
      id: sessions.id, nombre: sessions.name, empresa: sessions.company,
      completedAt: sessions.completedAt, proyecto: projects.name,
    })
    .from(sessions)
    .leftJoin(projects, eq(sessions.projectId, projects.id))
    .where(isNotNull(sessions.completedAt))
    .orderBy(desc(sessions.completedAt))
    .limit(limite)) as { id: string; nombre: string | null; empresa: string | null; completedAt: Date | string; proyecto: string | null }[]

  return filas.map(f => ({
    id: f.id,
    texto: `${f.nombre?.trim() || 'Alguien'} completó su entrevista`,
    detalle: f.proyecto ?? f.empresa?.trim() ?? undefined,
    href: `/admin/${f.id}`,
    cuando: new Date(f.completedAt),
  }))
}

/** Cuántos llegaron después de `vistosHasta`. Sin marca (la llave maestra), ninguno es nuevo. */
export function cuantosNuevos(avisos: Aviso[], vistosHasta: Date | null): number {
  if (!vistosHasta) return 0
  return avisos.filter(a => a.cuando > vistosHasta).length
}
