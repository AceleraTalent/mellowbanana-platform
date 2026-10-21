import { eq } from 'drizzle-orm'
import { projectSeguimiento } from './schema'
import { existeProyecto, ErrorDeValidacion, ErrorNoEncontrado, type AnyDb } from './store'
import {
  ESTADOS_FASE, ESTADOS_MANUALES, FASES_MANUALES,
  type EstadoFase, type EstadoManual, type FaseSistema,
} from '@/lib/seguimiento/sistema'

export interface Seguimiento {
  encargado: string | null
  notas: string | null
  fechaEntrega: string | null
  estadoManual: EstadoManual | null
  fases: Partial<Record<FaseSistema, EstadoFase>>
}

export const SEGUIMIENTO_VACIO: Seguimiento = { encargado: null, notas: null, fechaEntrega: null, estadoManual: null, fases: {} }

type Fila = typeof projectSeguimiento.$inferSelect

function desdeFila(f: Fila): Seguimiento {
  return {
    encargado: f.encargado,
    notas: f.notas,
    fechaEntrega: f.fechaEntrega,
    estadoManual: (f.estadoManual as EstadoManual | null) ?? null,
    fases: (f.fases ?? {}) as Seguimiento['fases'],
  }
}

/** El seguimiento de todos los proyectos que lo tienen, por id. Los que no, no aparecen. */
export async function seguimientosPorProyecto(db: AnyDb): Promise<Map<string, Seguimiento>> {
  const filas = (await db.select().from(projectSeguimiento)) as Fila[]
  return new Map(filas.map(f => [f.projectId, desdeFila(f)]))
}

export interface CambiosSeguimiento {
  encargado?: string | null
  notas?: string | null
  fechaEntrega?: string | null
  estadoManual?: EstadoManual | null
  fase?: { key: FaseSistema; estado: EstadoFase }
}

const LARGO_MAXIMO = { encargado: 80, notas: 2000 }

/** Texto recortado; vacío es `null`, para que borrar un campo lo deje sin valor y no con "". */
function texto(v: unknown, campo: keyof typeof LARGO_MAXIMO): string | null {
  if (v === null) return null
  if (typeof v !== 'string') throw new ErrorDeValidacion(`${campo} tiene que ser texto`)
  const t = v.trim()
  if (t.length > LARGO_MAXIMO[campo]) throw new ErrorDeValidacion(`${campo} no puede pasar de ${LARGO_MAXIMO[campo]} caracteres`)
  return t || null
}

/**
 * Valida un pedido que llega de afuera y lo deja en `CambiosSeguimiento`. Solo pasa lo que
 * vino: un campo ausente no se toca; uno en `null` se borra.
 */
export function validarCambios(body: Record<string, unknown>): CambiosSeguimiento {
  const c: CambiosSeguimiento = {}
  if ('encargado' in body) c.encargado = texto(body.encargado, 'encargado')
  if ('notas' in body) c.notas = texto(body.notas, 'notas')
  if ('fechaEntrega' in body) {
    const f = body.fechaEntrega
    if (f !== null && (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)))
      throw new ErrorDeValidacion('fechaEntrega tiene que ser una fecha AAAA-MM-DD, o null')
    c.fechaEntrega = (f as string | null) || null
  }
  if ('estadoManual' in body) {
    const e = body.estadoManual
    if (e !== null && !ESTADOS_MANUALES.includes(e as EstadoManual))
      throw new ErrorDeValidacion(`estadoManual tiene que ser ${ESTADOS_MANUALES.join(', ')} o null`)
    c.estadoManual = e as EstadoManual | null
  }
  if ('fase' in body) {
    const f = body.fase as { key?: unknown; estado?: unknown } | null
    if (!f || !FASES_MANUALES.includes(f.key as FaseSistema) || !ESTADOS_FASE.includes(f.estado as EstadoFase))
      throw new ErrorDeValidacion(`fase tiene que ser { key: ${FASES_MANUALES.join(' | ')}, estado: ${ESTADOS_FASE.join(' | ')} }`)
    c.fase = { key: f.key as FaseSistema, estado: f.estado as EstadoFase }
  }
  return c
}

/** Aplica los cambios sobre lo que ya había y devuelve cómo quedó. */
export async function actualizarSeguimiento(db: AnyDb, projectId: string, cambios: CambiosSeguimiento): Promise<Seguimiento> {
  if (!(await existeProyecto(db, projectId))) throw new ErrorNoEncontrado(`No existe el proyecto ${projectId}`)

  const [fila] = (await db.select().from(projectSeguimiento).where(eq(projectSeguimiento.projectId, projectId))) as Fila[]
  const previo = fila ? desdeFila(fila) : SEGUIMIENTO_VACIO
  const { fase, ...resto } = cambios
  const nuevo: Seguimiento = {
    ...previo,
    ...resto,
    fases: fase ? { ...previo.fases, [fase.key]: fase.estado } : previo.fases,
  }

  const valores = { ...nuevo, updatedAt: new Date() }
  await db.insert(projectSeguimiento).values({ projectId, ...valores })
    .onConflictDoUpdate({ target: projectSeguimiento.projectId, set: valores })
  return nuevo
}
