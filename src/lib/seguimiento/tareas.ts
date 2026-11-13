/**
 * Las tareas de cada fase de un proyecto, como se ven en su detalle.
 *
 * En un cliente que hace su proceso en la plataforma, las tareas de Taller, Landscape y
 * Estrategia son los pasos reales: se marcan solas cuando el paso se aprueba, y el link
 * lleva a donde se trabaja. Naming y Diseño pasan fuera de la plataforma, así que llevan
 * una lista que el equipo marca a mano. En un cliente por fuera, las cinco fases son listas
 * a mano.
 *
 * A cualquier tarea se le puede poner responsable y fecha. Eso, lo marcado a mano y las
 * listas que el equipo reescribió es lo único que se guarda (`TareasGuardadas`); el resto
 * se calcula.
 */

import { FASES, type FaseSistema } from './sistema'

export interface TareasGuardadas {
  /** Responsable y fecha por tarea, por id. */
  asignadas?: Record<string, { responsable?: string | null; fecha?: string | null }>
  /** Las tareas a mano que el equipo marcó como hechas. */
  hechas?: Record<string, true>
  /** La lista de una fase, si el equipo la reescribió. Sin esto vale la lista de siempre. */
  listas?: Partial<Record<FaseSistema, { id: string; titulo: string }[]>>
}

export interface Tarea {
  id: string
  titulo: string
  hecha: boolean
  /** Hay algo esperando la revisión del equipo en esta tarea. */
  porRevisar?: boolean
  /** Dónde se trabaja, si la tarea es un paso de la plataforma. */
  href?: string
  /** La marca el equipo a mano (no se calcula con lo aprobado). */
  manual: boolean
  responsable: string | null
  fecha: string | null
}

/** Una tarea calculada por la plataforma, antes de sumarle lo que anotó el equipo. */
export interface TareaCalculada {
  id: string
  titulo: string
  hecha: boolean
  porRevisar?: boolean
  href?: string
}

/**
 * Las listas con las que arrancan las fases que se marcan a mano. Son un punto de partida:
 * el equipo las reescribe en cada proyecto.
 */
export const LISTA_DE_SIEMPRE: Record<FaseSistema, string[]> = {
  taller: ['Entrevistas a los respondientes', 'Propuesta de valor', 'Taller con el cliente'],
  landscape: ['Reunión de arranque', 'Contexto del sector', 'Benchmarking', 'Brand assets', 'Tendencias', 'Presentación del Landscape'],
  estrategia: ['Diagnóstico y consumidor', 'Esencia de marca', 'Narrativa y presentación', 'Entregables y copies'],
  naming: ['Brief de naming', 'Exploración de nombres', 'Revisión de disponibilidad', 'Presentación al cliente', 'Nombre aprobado'],
  diseno: ['Dirección visual', 'Propuesta de identidad', 'Ajustes con el cliente', 'Brandbook', 'Entrega de archivos finales'],
}

const idDeLista = (fase: FaseSistema, i: number) => `${fase}:m${i + 1}`

/** La lista a mano de una fase: la que reescribió el equipo o la de siempre. */
export function listaDe(fase: FaseSistema, guardadas: TareasGuardadas): { id: string; titulo: string }[] {
  return guardadas.listas?.[fase] ?? LISTA_DE_SIEMPRE[fase].map((titulo, i) => ({ id: idDeLista(fase, i), titulo }))
}

/**
 * Las tareas de una fase. `calculadas` son los pasos reales de la plataforma; si no vienen
 * (Naming, Diseño o un cliente por fuera), la fase usa su lista a mano.
 */
export function tareasDeFase(fase: FaseSistema, guardadas: TareasGuardadas, calculadas?: TareaCalculada[]): Tarea[] {
  const con = (id: string) => ({
    responsable: guardadas.asignadas?.[id]?.responsable ?? null,
    fecha: guardadas.asignadas?.[id]?.fecha ?? null,
  })
  if (calculadas) return calculadas.map(t => ({ ...t, manual: false, ...con(t.id) }))
  return listaDe(fase, guardadas).map(t => ({ ...t, hecha: !!guardadas.hechas?.[t.id], manual: true, ...con(t.id) }))
}

/** Lo que el panel puede pedir sobre las tareas. Un cambio por pedido. */
export type CambioDeTareas =
  | { tipo: 'asignar'; id: string; responsable?: string | null; fecha?: string | null }
  | { tipo: 'marcar'; id: string; hecha: boolean }
  | { tipo: 'lista'; fase: FaseSistema; titulos: { id?: string; titulo: string }[] }

const ID = /^[a-z]+:[\w.-]{1,60}$/
const MAX_TAREAS = 30

export function validarCambioDeTareas(v: unknown): CambioDeTareas {
  const c = v as Record<string, unknown> | null
  if (!c || typeof c !== 'object') throw new Error('tareas tiene que ser un objeto')
  if (c.tipo === 'asignar' || c.tipo === 'marcar') {
    if (typeof c.id !== 'string' || !ID.test(c.id)) throw new Error('tareas.id no es una tarea válida')
    if (c.tipo === 'marcar') {
      if (typeof c.hecha !== 'boolean') throw new Error('tareas.hecha tiene que ser true o false')
      return { tipo: 'marcar', id: c.id, hecha: c.hecha }
    }
    const cambio: CambioDeTareas = { tipo: 'asignar', id: c.id }
    if ('responsable' in c) {
      if (c.responsable !== null && (typeof c.responsable !== 'string' || c.responsable.length > 80)) throw new Error('tareas.responsable tiene que ser un texto corto, o null')
      cambio.responsable = (c.responsable as string | null)?.trim() || null
    }
    if ('fecha' in c) {
      if (c.fecha !== null && (typeof c.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha))) throw new Error('tareas.fecha tiene que ser AAAA-MM-DD, o null')
      cambio.fecha = (c.fecha as string | null) || null
    }
    return cambio
  }
  if (c.tipo === 'lista') {
    if (!FASES.includes(c.fase as FaseSistema)) throw new Error(`tareas.fase tiene que ser ${FASES.join(', ')}`)
    if (!Array.isArray(c.titulos) || c.titulos.length > MAX_TAREAS) throw new Error(`tareas.titulos tiene que ser una lista de hasta ${MAX_TAREAS} tareas`)
    const titulos = c.titulos.map((t: unknown) => {
      const x = t as { id?: unknown; titulo?: unknown }
      if (typeof x?.titulo !== 'string' || !x.titulo.trim() || x.titulo.length > 140) throw new Error('Cada tarea necesita un título de hasta 140 caracteres')
      if (x.id !== undefined && (typeof x.id !== 'string' || !ID.test(x.id))) throw new Error('tareas.titulos trae un id inválido')
      return { id: x.id as string | undefined, titulo: x.titulo.trim() }
    })
    return { tipo: 'lista', fase: c.fase as FaseSistema, titulos }
  }
  throw new Error('tareas.tipo tiene que ser asignar, marcar o lista')
}

/** Aplica un cambio sobre lo guardado y devuelve cómo queda. No toca lo que no nombra. */
export function aplicarCambioDeTareas(previo: TareasGuardadas, c: CambioDeTareas): TareasGuardadas {
  if (c.tipo === 'asignar') {
    const actual = { ...previo.asignadas?.[c.id] }
    if ('responsable' in c) actual.responsable = c.responsable ?? null
    if ('fecha' in c) actual.fecha = c.fecha ?? null
    const asignadas = { ...previo.asignadas, [c.id]: actual }
    if (!actual.responsable && !actual.fecha) delete asignadas[c.id]
    return { ...previo, asignadas }
  }
  if (c.tipo === 'marcar') {
    const hechas = { ...previo.hechas }
    if (c.hecha) hechas[c.id] = true
    else delete hechas[c.id]
    return { ...previo, hechas }
  }
  // Reescribir la lista: las tareas que siguen conservan su id (y con él lo marcado y lo
  // asignado); las nuevas reciben uno que no choque con ninguno anterior.
  const usados = new Set([...listaDe(c.fase, previo).map(t => t.id), ...c.titulos.map(t => t.id).filter(Boolean) as string[]])
  let n = usados.size
  const lista = c.titulos.map(t => {
    if (t.id) return { id: t.id, titulo: t.titulo }
    let id: string
    do id = idDeLista(c.fase, n++); while (usados.has(id))
    usados.add(id)
    return { id, titulo: t.titulo }
  })
  return { ...previo, listas: { ...previo.listas, [c.fase]: lista } }
}

/** “3/5”: cuántas tareas de la fase están hechas. */
export const cuentaDeTareas = (tareas: Tarea[]) => `${tareas.filter(t => t.hecha).length}/${tareas.length}`
