import { and, eq } from 'drizzle-orm'
import { landscapePasos } from './schema'
import { existeProyecto, ErrorDeValidacion, ErrorNoEncontrado, type AnyDb } from './store'
import { pasoPorId } from '@/lib/landscape/pasos'

/** Los pasos que el equipo marcó como hechos en este proyecto. */
export async function pasosMarcados(db: AnyDb, projectId: string): Promise<Set<string>> {
  const filas = await db.select({ paso: landscapePasos.paso }).from(landscapePasos)
    .where(eq(landscapePasos.projectId, projectId))
  return new Set((filas as { paso: string }[]).map(f => f.paso))
}

/**
 * Marca o desmarca un paso. Solo se marcan a mano los pasos que no se resuelven en la
 * plataforma: los otros se cierran solos cuando el equipo aprueba lo que guardó Claude, y
 * dejar marcarlos haría que el paso a paso diga “hecho” sobre algo que nadie aprobó.
 */
export async function marcarPaso(
  db: AnyDb, projectId: string, pasoId: string, hecho: boolean, quien?: string,
): Promise<void> {
  const paso = pasoPorId(pasoId)
  if (!paso) throw new ErrorDeValidacion(`Paso desconocido: ${pasoId}`)
  if (paso.donde === 'plataforma')
    throw new ErrorDeValidacion(`El paso ${pasoId} se cierra aprobando en la plataforma, no se marca a mano`)
  if (!(await existeProyecto(db, projectId))) throw new ErrorNoEncontrado(`No existe el proyecto ${projectId}`)

  if (hecho)
    await db.insert(landscapePasos).values({ projectId, paso: pasoId, hechoPor: quien ?? null }).onConflictDoNothing()
  else
    await db.delete(landscapePasos).where(and(eq(landscapePasos.projectId, projectId), eq(landscapePasos.paso, pasoId)))
}
