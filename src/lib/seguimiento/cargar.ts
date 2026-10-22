import { listProjectsWithCounts, landscapeState, listLandscapeActivity, type AnyDb } from '@/lib/db/store'
import { strategyState, listStrategyActivity } from '@/lib/db/strategy-store'
import { pasosMarcados } from '@/lib/db/pasos-store'
import { seguimientosPorProyecto, ultimosCambiosDeSeguimiento, SEGUIMIENTO_VACIO, type Seguimiento } from '@/lib/db/seguimiento-store'
import { estadoDePasos } from '@/lib/landscape/pasos'
import { STAGE_LABEL, haceCuanto } from '@/lib/landscape/stages'
import { ETAPA_LABEL } from '@/lib/estrategia/stages'
import { AUTOR_SINCRONIZADO } from '@/lib/deliverable/sync-estrategia'
import {
  estadoDeFases, faseActual, queSigue,
  type FaseConEstado, type FaseSistema, type QueSigue, type SenalesProyecto,
} from './sistema'

/** Una fila del Sistema M&B, lista para mostrar: todo formateado en el servidor. */
export interface FilaSistema {
  id: string
  nombre: string
  href: string
  /** “14 oct”. */
  inicio: string
  fases: FaseConEstado[]
  actual: FaseSistema
  sigue: QueSigue
  seguimiento: Seguimiento
  ultimo?: { texto: string; cuando: string }
  /** Los pasos del Landscape, para el buscador. */
  pasos: { id: string; titulo: string; estado: string }[]
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fechaCorta = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', day: 'numeric', month: 'numeric' }).formatToParts(d)
  const v = (t: string) => Number(p.find(x => x.type === t)!.value)
  return `${v('day')} ${MESES[v('month') - 1]}`
}

/**
 * Lo que se lee cuando una tabla nueva todavía no existe en la base (el deploy llegó antes
 * que `db:push`): todo se ve igual, sin lo que el equipo escribió a mano.
 */
async function leerOVacio<T>(lectura: () => Promise<T>, vacio: T, que: string): Promise<T> {
  try {
    return await lectura()
  } catch (e) {
    console.error(`No se pudo leer ${que}:`, e)
    return vacio
  }
}

/**
 * Arma el Sistema M&B: una fila por cliente. Lo usan el inicio (la tabla) y la barra
 * lateral (lo que nos toca), así los dos dicen siempre lo mismo.
 */
export async function cargarSistema(db: AnyDb, ahora = new Date()): Promise<FilaSistema[]> {
  const rows = await listProjectsWithCounts(db)
  const seguimientos = await leerOVacio(() => seguimientosPorProyecto(db), new Map<string, Seguimiento>(), 'el seguimiento')
  const cambiosDeSeguimiento = await leerOVacio(() => ultimosCambiosDeSeguimiento(db), new Map<string, Date>(), 'el seguimiento')

  // Una lectura por proyecto: con la cantidad de clientes de un estudio, N+1 no pesa.
  return Promise.all(rows.map(async r => {
    const [landscape, estrategia, marcados, actLandscape, actEstrategia] = await Promise.all([
      landscapeState(db, r.id),
      strategyState(db, r.id),
      leerOVacio(() => pasosMarcados(db, r.id), new Set<string>(), 'los pasos marcados'),
      listLandscapeActivity(db, r.id, 1),
      listStrategyActivity(db, r.id, 1),
    ])
    const seguimiento = seguimientos.get(r.id) ?? SEGUIMIENTO_VACIO

    const senales: SenalesProyecto = {
      projectId: r.id,
      sesionesTotal: r.sessionsTotal,
      sesionesCompletas: r.sessionsCompleted,
      tienePropuesta: r.tieneEntregable,
      pasos: estadoDePasos(
        landscape.map(e => ({
          stage: e.stage,
          status: e.status,
          contenido: e.actual?.content ?? null,
          cerrada: !!e.actual?.approvedAt && !e.borradorNuevo,
        })),
        marcados,
      ),
      estrategia: estrategia.map(e => ({
        key: e.stage,
        label: ETAPA_LABEL[e.stage],
        aprobada: e.aprobada,
        esperaDecision: (!!e.actual && !e.actual.approvedAt) || !!e.borradorNuevo,
        // La personalidad que se sincroniza sola desde las entrevistas no es trabajo de nadie.
        trabajada: e.aprobada || (!!e.actual && e.actual.authorLabel !== AUTOR_SINCRONIZADO),
      })),
      manual: seguimiento.fases,
      estadoManual: seguimiento.estadoManual,
      porFuera: seguimiento.porFuera,
    }
    const fases = estadoDeFases(senales)

    // El último movimiento, venga de donde venga: Landscape, Estrategia o las entrevistas.
    const candidatos: { cuando: Date; texto: string }[] = []
    const quien = (autor: string, q?: string) => (autor === 'claude' ? 'Claude' : q ?? 'El equipo')
    for (const a of actLandscape)
      candidatos.push({ cuando: a.cuando, texto: `${quien(a.autor, a.quien)} ${a.tipo === 'aprobado' ? 'aprobó' : 'guardó'} ${STAGE_LABEL[a.stage]}` })
    for (const a of actEstrategia)
      candidatos.push({ cuando: a.cuando, texto: a.quien === AUTOR_SINCRONIZADO ? 'Se generó la personalidad desde las entrevistas' : `${quien(a.autor, a.quien)} ${a.tipo === 'aprobado' ? 'aprobó' : 'guardó'} ${ETAPA_LABEL[a.stage]}` })
    // Sin entrevistas ni propuesta, la fecha que trae es la de creación: no fue un movimiento.
    if (r.ultimaActividad && (r.sessionsTotal > 0 || r.tieneEntregable))
      candidatos.push({ cuando: r.ultimaActividad, texto: 'Movimiento en entrevistas o propuesta' })
    const tocado = cambiosDeSeguimiento.get(r.id)
    if (tocado) candidatos.push({ cuando: tocado, texto: 'Actualizado en el tablero' })
    const ultimo = candidatos.sort((a, b) => b.cuando.getTime() - a.cuando.getTime())[0]

    return {
      id: r.id,
      nombre: r.name,
      href: `/admin/projects/${r.id}`,
      inicio: fechaCorta(r.creadoEl),
      fases,
      actual: faseActual(fases),
      sigue: queSigue(senales, fases),
      seguimiento,
      ultimo: ultimo && { texto: ultimo.texto, cuando: haceCuanto(ultimo.cuando, ahora) },
      pasos: senales.pasos.map(p => ({ id: p.id, titulo: p.titulo, estado: p.estado })),
    }
  }))
}
