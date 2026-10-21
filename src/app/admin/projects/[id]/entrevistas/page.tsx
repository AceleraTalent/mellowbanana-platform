import { db } from '@/lib/db/client'
import { tallerDelProyecto } from '@/lib/db/seguimiento-store'
import {
  getProjectWithSessions, getDeliverable, listProjects, answerCountsByProject,
  landscapeState, summarizeLandscape,
} from '@/lib/db/store'
import { strategyState, summarizeStrategy } from '@/lib/db/strategy-store'
import { deriveFases, derivePantallas, pantallaActual } from '@/lib/pipeline/phases'
import { construirIndice, esperanDecision } from '@/lib/pipeline/indice'
import { projectSignals } from '@/lib/pipeline/signals'
import { AdminShell } from '@/components/AdminShell'
import { ProjectIndex } from '@/components/ProjectIndex'
import { buildStages } from '@/lib/landscape/stages'
import { buildEtapasEstrategia } from '@/lib/estrategia/stages'
import { RespondentsList, type Respondent } from './RespondentsList'
import { CopiarLinkEntrevista } from './CopiarLinkEntrevista'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'

export const dynamic = 'force-dynamic'

type SessionRow = {
  id: string
  name?: string | null
  role?: string | null
  company?: string | null
  status?: string | null
  createdAt?: Date | string | null
  completedAt?: Date | string | null
}

const fmt = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default async function EntrevistasView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProjectWithSessions(db, id)
  if (!project) return (
    <AdminShell activeProjectId={id}>
      <p className="pt-16 text-center text-[15px] text-[var(--secundario)]">Proyecto no encontrado.</p>
    </AdminShell>
  )

  const deliverable = await getDeliverable(db, id)
  const allProjects = await listProjects(db) as { id: string; name: string }[]
  const counts = await answerCountsByProject(db, id)
  const rawSessions = project.sessions as SessionRow[]
  const estadoLandscape = await landscapeState(db, id)
  const estrategiaEstado = await strategyState(db, id)
  const señales = projectSignals({
    ...(await tallerDelProyecto(db, id).then(t => ({ tienePostTaller: !!t.conclusiones, tallerHecho: t.hecho }))),
    sessions: rawSessions,
    tieneEntregable: !!deliverable,
    landscape: summarizeLandscape(estadoLandscape),
    estrategia: summarizeStrategy(estrategiaEstado),
  })

  // Esta pantalla no tiene etapas propias, así que no lee `?etapa=`: es una entrada sola
  // del índice, y su key va sin namespace.
  const fases = deriveFases(id, señales)
  const pantallas = derivePantallas(id, señales)
  const indice = construirIndice({
    projectId: id,
    fases,
    pantallas,
    etapaActiva: 'entrevistas',
    stagesLandscape: buildStages(estadoLandscape),
    etapasEstrategia: buildEtapasEstrategia(estrategiaEstado),
    esperanDecision: [
      ...esperanDecision('landscape', estadoLandscape),
      ...esperanDecision('estrategia', estrategiaEstado),
    ],
  })
  const actual = pantallaActual(fases, pantallas)

  const respondents: Respondent[] = rawSessions.map(s => ({
    id: s.id,
    name: s.name ?? 'Sin nombre',
    role: s.role ?? '—',
    company: s.company ?? '',
    completa: s.status === 'completed',
    fecha: fmt(s.completedAt ?? s.createdAt),
    respuestas: counts[s.id] ?? 0,
  }))

  const completas = respondents.filter(r => r.completa).length

  return (
    <AdminShell
      activeProjectId={id}
      indice={
        <ProjectIndex
          projectId={id}
          nombre={project.name}
          subtitulo={`${actual.label} · ${actual.detalle}`}
          fases={indice}
        />
      }
    >
      <section className="max-w-[960px]">
        <EncabezadoPagina
          rotulo={respondents.length > 0 ? `Taller · ${completas} de ${respondents.length} completas` : 'Taller'}
          titulo="Entrevistas"
          bajada="Lo que dijo cada persona, en sus palabras. Es la materia prima de todo lo que viene después."
        >
          <CopiarLinkEntrevista projectId={id} />
        </EncabezadoPagina>

        <div className="mt-10">
          <RespondentsList projectId={id} respondents={respondents} projects={allProjects} />
        </div>
      </section>
    </AdminShell>
  )
}
