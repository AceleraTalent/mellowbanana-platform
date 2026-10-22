import { eq } from 'drizzle-orm'
import { projectSeguimiento } from './schema'
import { existeProyecto, ErrorDeValidacion, ErrorNoEncontrado, type AnyDb } from './store'
import {
  ESTADOS_FASE, ESTADOS_MANUALES, FASES, FASES_MANUALES, fasesAlMover,
  type EstadoFase, type EstadoManual, type FaseSistema,
} from '@/lib/seguimiento/sistema'

export interface Seguimiento {
  encargado: string | null
  notas: string | null
  fechaEntrega: string | null
  estadoManual: EstadoManual | null
  fases: Partial<Record<FaseSistema, EstadoFase>>
  /**
   * Lo que volvió del taller en Miro (los 4 competidores, la propuesta refinada), si alguien
   * lo pegó en el panel o Claude lo guardó desde el chat. Es opcional: sin esto se trabaja
   * igual, y Claude lo pide cuando hace falta.
   */
  conclusionesTaller: string | null
  /** Lleva su proceso fuera de la plataforma: sus fases se mueven a mano, como en Notion. */
  porFuera: boolean
  /** Hace su proceso en la plataforma, pero el equipo puso la fase a mano: manda lo que dijo. */
  faseAMano: boolean
}

export const SEGUIMIENTO_VACIO: Seguimiento = { encargado: null, notas: null, fechaEntrega: null, estadoManual: null, fases: {}, conclusionesTaller: null, porFuera: false, faseAMano: false }

type Fila = typeof projectSeguimiento.$inferSelect

function desdeFila(f: Fila): Seguimiento {
  return {
    encargado: f.encargado,
    notas: f.notas,
    fechaEntrega: f.fechaEntrega,
    estadoManual: (f.estadoManual as EstadoManual | null) ?? null,
    fases: (f.fases ?? {}) as Seguimiento['fases'],
    conclusionesTaller: f.conclusionesTaller ?? null,
    porFuera: !!f.porFuera,
    faseAMano: !!f.faseAMano,
  }
}

/**
 * Lo del taller de un proyecto: las conclusiones, si alguien las cargó, y si el equipo lo
 * marcó como hecho. Son dos cosas distintas: cargar conclusiones no cierra el taller.
 */
export async function tallerDelProyecto(db: AnyDb, projectId: string): Promise<{ conclusiones: string | null; hecho: boolean }> {
  const [f] = (await db.select().from(projectSeguimiento).where(eq(projectSeguimiento.projectId, projectId))) as Fila[]
  return { conclusiones: f?.conclusionesTaller ?? null, hecho: (f?.fases as Seguimiento['fases'] | undefined)?.taller === 'completa' }
}

/** Las conclusiones del taller de un proyecto, si hay. */
export async function conclusionesDelTaller(db: AnyDb, projectId: string): Promise<string | null> {
  const [f] = (await db.select({ c: projectSeguimiento.conclusionesTaller }).from(projectSeguimiento)
    .where(eq(projectSeguimiento.projectId, projectId))) as { c: string | null }[]
  return f?.c ?? null
}

/** El seguimiento de un proyecto, o el vacío si nadie lo tocó todavía. */
export async function seguimientoDe(db: AnyDb, projectId: string): Promise<Seguimiento> {
  const [f] = (await db.select().from(projectSeguimiento).where(eq(projectSeguimiento.projectId, projectId))) as Fila[]
  return f ? desdeFila(f) : SEGUIMIENTO_VACIO
}

/** El seguimiento de todos los proyectos que lo tienen, por id. Los que no, no aparecen. */
export async function seguimientosPorProyecto(db: AnyDb): Promise<Map<string, Seguimiento>> {
  const filas = (await db.select().from(projectSeguimiento)) as Fila[]
  return new Map(filas.map(f => [f.projectId, desdeFila(f)]))
}

/** Cuándo se tocó por última vez el seguimiento de cada proyecto: mover, anotar, asignar. */
export async function ultimosCambiosDeSeguimiento(db: AnyDb): Promise<Map<string, Date>> {
  const filas = (await db.select({ id: projectSeguimiento.projectId, cuando: projectSeguimiento.updatedAt }).from(projectSeguimiento)) as { id: string; cuando: Date | string }[]
  return new Map(filas.map(f => [f.id, new Date(f.cuando)]))
}

export interface CambiosSeguimiento {
  encargado?: string | null
  notas?: string | null
  fechaEntrega?: string | null
  estadoManual?: EstadoManual | null
  fase?: { key: FaseSistema; estado: EstadoFase }
  conclusionesTaller?: string | null
  porFuera?: boolean
  /** Lleva el cliente a esa fase, como arrastrar la tarjeta en Notion. */
  moverA?: FaseSistema | 'terminado'
  /** En la plataforma: dejar de mandar a mano y que la fase vuelva a salir de lo aprobado. */
  calcular?: boolean
}

const LARGO_MAXIMO = { encargado: 80, notas: 2000, conclusionesTaller: 30000 }

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
  if ('conclusionesTaller' in body) c.conclusionesTaller = texto(body.conclusionesTaller, 'conclusionesTaller')
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
    if (!f || !FASES.includes(f.key as FaseSistema) || !ESTADOS_FASE.includes(f.estado as EstadoFase))
      throw new ErrorDeValidacion(`fase tiene que ser { key: ${FASES.join(' | ')}, estado: ${ESTADOS_FASE.join(' | ')} }`)
    c.fase = { key: f.key as FaseSistema, estado: f.estado as EstadoFase }
  }
  if ('porFuera' in body) {
    if (typeof body.porFuera !== 'boolean') throw new ErrorDeValidacion('porFuera tiene que ser true o false')
    c.porFuera = body.porFuera
  }
  if ('moverA' in body) {
    const m = body.moverA
    if (m !== 'terminado' && !FASES.includes(m as FaseSistema))
      throw new ErrorDeValidacion(`moverA tiene que ser ${FASES.join(', ')} o terminado`)
    c.moverA = m as FaseSistema | 'terminado'
  }
  if ('calcular' in body) {
    if (body.calcular !== true) throw new ErrorDeValidacion('calcular sólo puede ser true')
    c.calcular = true
  }
  return c
}

/** Aplica los cambios sobre lo que ya había y devuelve cómo quedó. */
export async function actualizarSeguimiento(db: AnyDb, projectId: string, cambios: CambiosSeguimiento): Promise<Seguimiento> {
  if (!(await existeProyecto(db, projectId))) throw new ErrorNoEncontrado(`No existe el proyecto ${projectId}`)

  const [fila] = (await db.select().from(projectSeguimiento).where(eq(projectSeguimiento.projectId, projectId))) as Fila[]
  const previo = fila ? desdeFila(fila) : SEGUIMIENTO_VACIO
  const { fase, moverA, calcular, ...resto } = cambios
  const porFuera = resto.porFuera ?? previo.porFuera
  // Cualquier cliente se mueve de fase a mano, como en Notion. En uno que hace su proceso
  // en la plataforma, moverlo deja la fase "a mano": manda lo que dijo el equipo hasta que
  // alguien pida volver a calcularla con lo aprobado.
  const faseAMano = porFuera ? false : calcular ? false : moverA ? true : previo.faseAMano
  if (fase && !porFuera && !faseAMano && !FASES_MANUALES.includes(fase.key))
    throw new ErrorDeValidacion(`${fase.key} se calcula sola en la plataforma; para ponerla a mano, mové el cliente de fase`)
  // Mover y marcar van juntos: "pasa a Diseño, pero todavía no arrancó" es un solo cambio.
  // Al volver a la plataforma o a calcular, las fases marcadas a mano se descartan.
  const base = (previo.porFuera && !porFuera) || calcular ? {} : moverA ? fasesAlMover(moverA) : previo.fases
  const nuevo: Seguimiento = {
    ...previo,
    ...resto,
    faseAMano,
    fases: fase ? { ...base, [fase.key]: fase.estado } : base,
  }

  const valores = { ...nuevo, updatedAt: new Date() }
  await db.insert(projectSeguimiento).values({ projectId, ...valores })
    .onConflictDoUpdate({ target: projectSeguimiento.projectId, set: valores })
  return nuevo
}
