import type { AnyDb } from '@/lib/db/store'
import { getProjectWithSessions, getDeliverable, landscapeState, summarizeLandscape } from '@/lib/db/store'
import { strategyState, summarizeStrategy } from '@/lib/db/strategy-store'
import { tallerDelProyecto } from '@/lib/db/seguimiento-store'
import { buildStages } from '@/lib/landscape/stages'
import { buildEtapasEstrategia } from '@/lib/estrategia/stages'
import { deriveFases, derivePantallas, pantallaActual } from './phases'
import { construirIndice, esperanDecision, type FaseIndice } from './indice'
import { projectSignals } from './signals'

/**
 * Lo que necesita el menú de un proyecto (`ProjectIndex`) en una pantalla que no arma el
 * suyo con lo que ya consultó: el índice con la entrada activa y el subtítulo. Sin
 * proyecto, `null`.
 */
export async function menuDelProyecto(db: AnyDb, id: string, etapaActiva: string): Promise<{
  nombre: string
  indice: FaseIndice[]
  subtitulo: string
} | null> {
  const project = await getProjectWithSessions(db, id)
  if (!project) return null
  const [deliverable, estadoLandscape, estrategiaEstado, taller] = await Promise.all([
    getDeliverable(db, id), landscapeState(db, id), strategyState(db, id), tallerDelProyecto(db, id),
  ])
  const señales = projectSignals({
    tienePostTaller: !!taller.conclusiones,
    tallerHecho: taller.hecho,
    sessions: project.sessions as { status?: string | null }[],
    tieneEntregable: !!deliverable,
    landscape: summarizeLandscape(estadoLandscape),
    estrategia: summarizeStrategy(estrategiaEstado),
  })
  const fases = deriveFases(id, señales)
  const pantallas = derivePantallas(id, señales)
  const actual = pantallaActual(fases, pantallas)
  return {
    nombre: project.name,
    subtitulo: `${actual.label} · ${actual.detalle}`,
    indice: construirIndice({
      projectId: id,
      fases,
      pantallas,
      etapaActiva,
      stagesLandscape: buildStages(estadoLandscape),
      etapasEstrategia: buildEtapasEstrategia(estrategiaEstado),
      esperanDecision: [
        ...esperanDecision('landscape', estadoLandscape),
        ...esperanDecision('estrategia', estrategiaEstado),
      ],
    }),
  }
}
