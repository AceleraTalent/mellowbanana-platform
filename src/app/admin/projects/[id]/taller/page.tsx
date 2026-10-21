import { db } from '@/lib/db/client'
import { tallerDelProyecto } from '@/lib/db/seguimiento-store'
import { getProjectWithSessions, getDeliverable, landscapeState, summarizeLandscape } from '@/lib/db/store'
import { strategyState, summarizeStrategy } from '@/lib/db/strategy-store'
import { deriveFases, derivePantallas, pantallaActual } from '@/lib/pipeline/phases'
import { construirIndice, esperanDecision } from '@/lib/pipeline/indice'
import { projectSignals } from '@/lib/pipeline/signals'
import { AdminShell } from '@/components/AdminShell'
import { ProjectIndex } from '@/components/ProjectIndex'
import { PhaseNote } from '@/components/PhaseNote'
import { FaseManual } from '@/components/FaseManual'
import { ConclusionesTaller } from './ConclusionesTaller'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { buildStages } from '@/lib/landscape/stages'
import { buildEtapasEstrategia } from '@/lib/estrategia/stages'

export const dynamic = 'force-dynamic'

export default async function TallerView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProjectWithSessions(db, id)
  if (!project) return (
    <AdminShell activeProjectId={id}>
      <p className="pt-16 text-center text-[15px] text-[var(--secundario)]">Proyecto no encontrado.</p>
    </AdminShell>
  )

  const deliverable = await getDeliverable(db, id)
  const { conclusiones, hecho: tallerHecho } = await tallerDelProyecto(db, id)
  const rawSessions = project.sessions as { status?: string | null }[]
  const estadoLandscape = await landscapeState(db, id)
  const estrategiaEstado = await strategyState(db, id)
  const señales = projectSignals({
    tienePostTaller: !!conclusiones,
    tallerHecho,
    sessions: rawSessions,
    tieneEntregable: !!deliverable,
    landscape: summarizeLandscape(estadoLandscape),
    estrategia: summarizeStrategy(estrategiaEstado),
  })
  const fases = deriveFases(id, señales)
  const pantallas = derivePantallas(id, señales)
  const taller = pantallas.taller

  // Esta pantalla no tiene etapas propias, así que no lee `?etapa=`: es una entrada sola
  // del índice, y su key va sin namespace.
  const indice = construirIndice({
    projectId: id,
    fases,
    pantallas,
    etapaActiva: 'taller',
    stagesLandscape: buildStages(estadoLandscape),
    etapasEstrategia: buildEtapasEstrategia(estrategiaEstado),
    esperanDecision: [
      ...esperanDecision('landscape', estadoLandscape),
      ...esperanDecision('estrategia', estrategiaEstado),
    ],
  })
  const actual = pantallaActual(fases, pantallas)
  // Cerrar el taller es lo único que la plataforma no ve: lo marca el equipo, y vale lo
  // mismo que marcarlo desde el inicio.
  const sistema = await cargarSistema(db)
  const faseTaller = sistema.find(p => p.id === id)?.fases.find(f => f.key === 'taller')
  const hecho = faseTaller?.estado === 'completa'

  return (
    <AdminShell
      activeProjectId={id}
      sistema={sistema}
      indice={
        <ProjectIndex
          projectId={id}
          nombre={project.name}
          subtitulo={`${actual.label} · ${actual.detalle}`}
          fases={indice}
        />
      }
    >
      <PhaseNote
        titulo="Taller en Miro"
        estado={hecho ? 'completa' : taller.status}
        bajada={hecho ? 'El equipo lo marcó como hecho.' : taller.detalle}
      >
        <p className="mt-4 max-w-[60ch] text-[14px] leading-[1.66] text-[var(--secundario)]">
          El taller se hace en Miro, con el equipo y el cliente en la misma mesa. De esa sesión vuelven la
          propuesta de valor refinada y los cuatro competidores principales, que Claude usa en el panorama de
          categoría del Landscape.
        </p>
        <ConclusionesTaller projectId={id} inicial={conclusiones} />
        {faseTaller && (
          <div className="mt-8 max-w-[360px] border-t border-[var(--line)] pt-5">
            <p className="text-[14px] font-semibold text-[var(--ink)]">¿Ya se hizo el taller?</p>
            <p className="mt-1 text-[13px] leading-snug text-[var(--secundario)]">
              Al marcarlo, el Sistema M&amp;B da el Taller por terminado.
            </p>
            <div className="mt-3">
              <FaseManual projectId={id} fase="taller" label="el taller" estado={faseTaller.estado} />
            </div>
          </div>
        )}
      </PhaseNote>
    </AdminShell>
  )
}
