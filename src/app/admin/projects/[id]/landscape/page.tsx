import { db } from '@/lib/db/client'
import { tallerDelProyecto } from '@/lib/db/seguimiento-store'
import {
  getProjectWithSessions, getDeliverable,
  landscapeState, listLandscapeActivity, summarizeLandscape, piezasState, piezasParaPasos, type TendenciasContent,
} from '@/lib/db/store'
import { strategyState, summarizeStrategy } from '@/lib/db/strategy-store'
import { deriveFases, derivePantallas, pantallaActual } from '@/lib/pipeline/phases'
import { construirIndice, esperanDecision } from '@/lib/pipeline/indice'
import { procedenciaDeVersion, autorDeVersion } from '@/lib/pipeline/procedencia'
import { projectSignals } from '@/lib/pipeline/signals'
import { AdminShell } from '@/components/AdminShell'
import { ProjectIndex } from '@/components/ProjectIndex'
import { buildStages, haceCuanto, textoActividad, STAGE_ORDER, type StageKey } from '@/lib/landscape/stages'
import { buildEtapasEstrategia } from '@/lib/estrategia/stages'
import { estadoDePasos, pasoPorId, pasoQueSigue } from '@/lib/landscape/pasos'
import { pasosMarcados } from '@/lib/db/pasos-store'
import { LandscapeWorkspace } from './LandscapeWorkspace'

export const dynamic = 'force-dynamic'

export default async function LandscapeView({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ etapa?: string; paso?: string }>
}) {
  const { id } = await params
  const { etapa, paso: pasoQuery } = await searchParams
  const project = await getProjectWithSessions(db, id)
  if (!project) return (
    <AdminShell activeProjectId={id}>
      <p className="pt-16 text-center text-[15px] text-[var(--secundario)]">Proyecto no encontrado.</p>
    </AdminShell>
  )

  const deliverable = await getDeliverable(db, id)
  const rawSessions = project.sessions as { status?: string | null }[]
  const estado = await landscapeState(db, id)
  const estrategiaEstado = await strategyState(db, id)
  const señales = projectSignals({
    ...(await tallerDelProyecto(db, id).then(t => ({ tienePostTaller: !!t.conclusiones, tallerHecho: t.hecho }))),
    sessions: rawSessions,
    tieneEntregable: !!deliverable,
    landscape: summarizeLandscape(estado),
    estrategia: summarizeStrategy(estrategiaEstado),
  })

  const stages = buildStages(estado)

  // Los pasos que el equipo marcó a mano. Si la tabla todavía no existe en la base (el
  // deploy llegó antes que `db:push`), el paso a paso se ve igual, sin esas marcas, en vez
  // de tumbar la pantalla entera del Landscape.
  let marcados = new Set<string>()
  try {
    marcados = await pasosMarcados(db, id)
  } catch (e) {
    console.error('No se pudieron leer los pasos marcados del Landscape:', e)
  }
  const piezas = await piezasState(db, id)
  const pasos = estadoDePasos(
    estado.map(e => ({
      stage: e.stage,
      status: e.status,
      contenido: e.actual?.content ?? null,
      cerrada: !!e.actual?.approvedAt && !e.borradorNuevo,
    })),
    marcados,
    piezasParaPasos(piezas),
  )

  // Toda la fase es una página; el link puede nombrar una sección (`?etapa=`) o un paso
  // (`?paso=`, lo que usan el buscador y “lo que sigue”), y la página baja hasta ella. Una
  // query inventada no rompe nada: se queda arriba. Sin query, el menú marca la sección
  // donde está lo que sigue.
  const pedida: StageKey | undefined = pasoQuery
    ? pasoPorId(pasoQuery)?.etapa
    : etapa && (STAGE_ORDER as string[]).includes(etapa) ? etapa as StageKey : undefined
  const etapaActiva: StageKey = pedida ?? pasoQueSigue(pasos)?.etapa ?? STAGE_ORDER[STAGE_ORDER.length - 1]

  const fases = deriveFases(id, señales)
  const pantallas = derivePantallas(id, señales)
  const indice = construirIndice({
    projectId: id,
    fases,
    pantallas,
    etapaActiva: `landscape:${etapaActiva}`,
    stagesLandscape: stages,
    etapasEstrategia: buildEtapasEstrategia(estrategiaEstado),
    esperanDecision: [
      ...esperanDecision('landscape', estado),
      ...esperanDecision('estrategia', estrategiaEstado),
    ],
  })
  const actual = pantallaActual(fases, pantallas)
  // Lo que la fase necesita de otra y todavía no llegó. Lo rendía `ProjectHeader`; ahora
  // vive en el área de trabajo, que es donde el equipo se pregunta por qué no puede avanzar.
  const dependencia = fases.find(f => f.key === 'landscape')?.dependencia

  const etapaTendencias = estado.find(e => e.stage === 'tendencias')!
  // La long list se toma de la versión más nueva, igual criterio que el gate en
  // `selectTendencias`: si Claude amplió la lista después de una selección aprobada, el
  // equipo tiene que ver la lista ampliada para poder re-elegir sobre ella.
  const versionLongList = etapaTendencias.borradorNuevo ?? etapaTendencias.actual
  const tendenciasContent = versionLongList?.content as TendenciasContent | undefined
  // La selección marcada, en cambio, es la que el equipo aprobó — no la que venga en un
  // borrador que todavía nadie decidió.
  const seleccionAprobada = (etapaTendencias.actual?.content as TendenciasContent | undefined)?.seleccionadas ?? []

  // Se formatea el tiempo en el servidor para que no baile entre servidor y cliente.
  const ahora = new Date()
  const actividad = (await listLandscapeActivity(db, id)).map(e => ({
    id: e.id,
    autor: e.autor,
    quien: e.quien,
    texto: textoActividad(e),
    cuando: haceCuanto(e.cuando, ahora),
  }))

  const contenidoPorEtapa = Object.fromEntries(
    [...estado.map(e => ({ ...e, clave: e.stage as string })), ...piezas.map(p => ({ ...p, clave: p.pieza as string }))].map(e => [
      e.clave,
      e.actual
        ? {
            id: e.actual.id,
            content: e.actual.content,
            aprobada: !!e.actual.approvedAt,
            // Con `origen`: si la vigente ratifica una anterior —el equipo mantuvo lo
            // aprobado—, quién escribió y cuándo salen de la copiada. Sin eso, la fila
            // nueva haría parecer recién escrito algo de hace días.
            procedencia: procedenciaDeVersion(e.actual, ahora, e.origen),
            // Misma razón en la cabecera de la columna vigente del comparador.
            cuando: haceCuanto((e.origen ?? e.actual).createdAt, ahora),
            // Lo que Claude escribió después de la aprobación: no desplaza a lo aprobado,
            // pero el panel lo tiene que poder mostrar y ofrecer al gate humano.
            borradorNuevo: e.borradorNuevo
              ? {
                  id: e.borradorNuevo.id,
                  content: e.borradorNuevo.content,
                  cuando: haceCuanto(e.borradorNuevo.createdAt, ahora),
                  autor: autorDeVersion(e.borradorNuevo),
                }
              : null,
          }
        : null,
    ]),
  )

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
      <LandscapeWorkspace
        projectId={id}
        proyecto={project.name}
        irA={pedida}
        pasos={pasos}
        tendencias={tendenciasContent?.candidatas ?? []}
        seleccionAprobada={seleccionAprobada}
        tendenciasAprobadas={etapaTendencias.aprobada}
        contenidoPorEtapa={contenidoPorEtapa}
        actividad={actividad}
        dependencia={dependencia}
      />
    </AdminShell>
  )
}
