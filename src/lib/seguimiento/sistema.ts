/**
 * El Sistema M&B: el seguimiento por cliente que el estudio llevaba en Notion (cliente,
 * fase actual, notas, encargado, fechas y status), ahora dentro de la plataforma.
 *
 * Las cinco fases son las del estudio. Tres las ve la plataforma y se calculan solas con lo
 * que el equipo y Claude van haciendo (Landscape, Estrategia y casi todo el Taller); las
 * otras dos (Naming y Diseño) pasan fuera, así que el equipo dice en qué van. El Taller es
 * mixto: entrevistas y propuesta de valor viven acá, pero el taller en sí es en Miro y el
 * equipo lo marca como hecho.
 */

import type { PasoConEstado } from '@/lib/landscape/pasos'

export type FaseSistema = 'taller' | 'landscape' | 'naming' | 'estrategia' | 'diseno'

export const FASES: FaseSistema[] = ['taller', 'landscape', 'naming', 'estrategia', 'diseno']

export const FASE_LABEL: Record<FaseSistema, string> = {
  taller: 'Taller',
  landscape: 'Landscape',
  naming: 'Naming',
  estrategia: 'Estrategia',
  diseno: 'Diseño',
}

export type EstadoFase = 'pendiente' | 'en_curso' | 'completa'
export const ESTADOS_FASE: EstadoFase[] = ['pendiente', 'en_curso', 'completa']

/** Las fases en las que el equipo dice a mano en qué van. */
export const FASES_MANUALES: FaseSistema[] = ['taller', 'naming', 'diseno']

/** Lo que la plataforma no puede saber sola y el equipo marca: el proyecto está frenado. */
export type EstadoManual = 'pausa' | 'cliente'
export const ESTADOS_MANUALES: EstadoManual[] = ['pausa', 'cliente']

export interface EtapaEstrategiaResumen {
  key: string
  label: string
  aprobada: boolean
  /** Hay un borrador esperando la decisión del equipo. */
  esperaDecision: boolean
  /** Alguien la trabajó (Claude o el equipo), no la sincronización automática. */
  trabajada: boolean
}

export interface SenalesProyecto {
  projectId: string
  sesionesTotal: number
  sesionesCompletas: number
  tienePropuesta: boolean
  pasos: PasoConEstado[]
  estrategia: EtapaEstrategiaResumen[]
  /** Lo que el equipo marcó a mano para las fases manuales. */
  manual: Partial<Record<FaseSistema, EstadoFase>>
  estadoManual?: EstadoManual | null
}

export interface FaseConEstado {
  key: FaseSistema
  label: string
  estado: EstadoFase
  detalle: string
}

function taller(s: SenalesProyecto): Omit<FaseConEstado, 'key' | 'label'> {
  if (s.manual.taller === 'completa') return { estado: 'completa', detalle: 'Taller hecho' }
  if (s.sesionesTotal === 0) return { estado: 'pendiente', detalle: 'Sin entrevistas' }
  if (s.sesionesCompletas < s.sesionesTotal)
    return { estado: 'en_curso', detalle: `Entrevistas: ${s.sesionesCompletas} de ${s.sesionesTotal}` }
  if (!s.tienePropuesta) return { estado: 'en_curso', detalle: 'Falta generar la propuesta de valor' }
  return { estado: 'en_curso', detalle: 'Taller en Miro, falta marcarlo hecho' }
}

function landscape(s: SenalesProyecto): Omit<FaseConEstado, 'key' | 'label'> {
  const aplicables = s.pasos.filter(p => p.estado !== 'no_aplica')
  const hechos = aplicables.filter(p => p.estado === 'hecho').length
  if (aplicables.length && hechos === aplicables.length) return { estado: 'completa', detalle: `Los ${hechos} pasos listos` }
  if (hechos > 0 || aplicables.some(p => p.estado === 'revisar'))
    return { estado: 'en_curso', detalle: `${hechos} de ${aplicables.length} pasos` }
  return { estado: 'pendiente', detalle: 'Sin empezar' }
}

function estrategia(s: SenalesProyecto): Omit<FaseConEstado, 'key' | 'label'> {
  const total = s.estrategia.length
  const aprobadas = s.estrategia.filter(e => e.aprobada).length
  if (total && aprobadas === total) return { estado: 'completa', detalle: `Las ${total} etapas aprobadas` }
  if (aprobadas > 0 || s.estrategia.some(e => e.trabajada))
    return { estado: 'en_curso', detalle: `${aprobadas} de ${total} etapas aprobadas` }
  return { estado: 'pendiente', detalle: 'Sin empezar' }
}

function manual(estado: EstadoFase | undefined): Omit<FaseConEstado, 'key' | 'label'> {
  if (estado === 'completa') return { estado, detalle: 'Terminado' }
  if (estado === 'en_curso') return { estado, detalle: 'En curso, fuera de la plataforma' }
  return { estado: 'pendiente', detalle: 'Sin empezar' }
}

/** Las cinco fases del proyecto, cada una con su estado y una línea que lo explica. */
export function estadoDeFases(s: SenalesProyecto): FaseConEstado[] {
  const por: Record<FaseSistema, Omit<FaseConEstado, 'key' | 'label'>> = {
    taller: taller(s),
    landscape: landscape(s),
    naming: manual(s.manual.naming),
    estrategia: estrategia(s),
    diseno: manual(s.manual.diseno),
  }
  return FASES.map(key => ({ key, label: FASE_LABEL[key], ...por[key] }))
}

/**
 * Dónde está parado el proyecto: la fase más avanzada que ya arrancó. Las fases se pisan
 * en la práctica (el Landscape avanza mientras el taller espera sus conclusiones), así que
 * no es “la primera sin terminar” sino lo más lejos que llegó el trabajo. Si esa fase ya
 * terminó, lo que toca es la siguiente.
 */
export function faseActual(fases: FaseConEstado[]): FaseSistema {
  const i = fases.map(f => f.estado !== 'pendiente').lastIndexOf(true)
  if (i < 0) return fases[0].key
  if (fases[i].estado === 'completa' && i < fases.length - 1) return fases[i + 1].key
  return fases[i].key
}

/** De quién es la pelota en este proyecto. Es el “status” de la tabla. */
export type Quien = 'equipo' | 'revisar' | 'claude' | 'cliente' | 'pausa' | 'listo'

export interface QueSigue {
  quien: Quien
  /** Corto, para el chip: “Por revisar”, “Le toca a Claude”. */
  texto: string
  /** Qué, puntualmente: “2.2 Contexto del sector”. */
  detalle?: string
  /** Dónde se hace. */
  href?: string
}

export function queSigue(s: SenalesProyecto, fases: FaseConEstado[]): QueSigue {
  if (s.estadoManual === 'pausa') return { quien: 'pausa', texto: 'En pausa' }
  if (s.estadoManual === 'cliente') return { quien: 'cliente', texto: 'Esperando al cliente' }

  const base = `/admin/projects/${s.projectId}`
  const actual = faseActual(fases)
  const fase = fases.find(f => f.key === actual)!
  if (fase.estado === 'completa') return { quien: 'listo', texto: 'Terminado' }

  switch (actual) {
    case 'taller': {
      if (s.sesionesTotal === 0)
        return { quien: 'cliente', texto: 'Esperando entrevistas', detalle: 'Nadie respondió todavía', href: `${base}/entrevistas` }
      if (s.sesionesCompletas < s.sesionesTotal)
        return { quien: 'cliente', texto: 'Esperando entrevistas', detalle: `${s.sesionesCompletas} de ${s.sesionesTotal} respondidas`, href: `${base}/entrevistas` }
      if (!s.tienePropuesta)
        return { quien: 'equipo', texto: 'Te toca', detalle: 'Generar la propuesta de valor', href: `${base}/propuesta` }
      return { quien: 'equipo', texto: 'Te toca', detalle: 'Hacer el taller y marcarlo hecho', href: `${base}/taller` }
    }
    case 'landscape': {
      const href = (id: string) => `${base}/landscape?paso=${id}`
      const revisar = s.pasos.find(p => p.estado === 'revisar')
      if (revisar) return { quien: 'revisar', texto: 'Por revisar', detalle: `${revisar.id} ${revisar.titulo}`, href: href(revisar.id) }
      const pendiente = s.pasos.find(p => p.estado === 'pendiente')
      if (pendiente)
        return pendiente.turno === 'claude'
          ? { quien: 'claude', texto: 'Le toca a Claude', detalle: `${pendiente.id} ${pendiente.titulo}`, href: href(pendiente.id) }
          : { quien: 'equipo', texto: 'Te toca', detalle: `${pendiente.id} ${pendiente.titulo}`, href: href(pendiente.id) }
      return { quien: 'listo', texto: 'Terminado' }
    }
    case 'estrategia': {
      const href = (key: string) => `${base}/estrategia?etapa=${key}`
      const espera = s.estrategia.find(e => e.esperaDecision)
      if (espera) return { quien: 'revisar', texto: 'Por revisar', detalle: espera.label, href: href(espera.key) }
      const falta = s.estrategia.find(e => !e.aprobada)
      if (falta) return { quien: 'claude', texto: 'Le toca a Claude', detalle: falta.label, href: href(falta.key) }
      return { quien: 'listo', texto: 'Terminado' }
    }
    default:
      return { quien: 'equipo', texto: 'Te toca', detalle: `${FASE_LABEL[actual]}, fuera de la plataforma` }
  }
}
