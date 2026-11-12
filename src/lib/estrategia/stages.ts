/**
 * Modelo de las etapas del Proceso de Estrategia (fase 3).
 * Ver valkyria/specs/2026-08-11-fase3-pipeline-estrategia-design.md,
 * docs/fase3/Procesos Estrategia y Naming.pdf (bloques 1–5) y el listado de entregables
 * del estudio (valkyria/specs/2026-11-12-checklists-landscape-estrategia-design.md).
 */
import type { StageStatus } from '@/lib/landscape/stages'

export type EstrategiaKey =
  | 'diagnostico' | 'consumidor'
  | 'objetivo' | 'rtbs' | 'concepto' | 'beneficios' | 'arquetipo' | 'personalidad' | 'valores'
  | 'territorio' | 'brand_ideal' | 'ingredients' | 'onlyness' | 'tagline' | 'manifiesto'
  | 'cuadros'
  | 'naming' | 'copies'

/**
 * El orden es de referencia, como en el PDF: la plataforma muestra estado pero no
 * encadena etapas — la esencia se trabaja en el orden que pida el proyecto.
 */
export const ETAPA_ORDER: EstrategiaKey[] = [
  'diagnostico', 'consumidor',
  'objetivo', 'rtbs', 'concepto', 'beneficios', 'arquetipo', 'personalidad', 'valores',
  'territorio', 'brand_ideal', 'ingredients', 'onlyness', 'tagline', 'manifiesto',
  'cuadros',
  'naming', 'copies',
]

/** Las etapas del bloque 3 (esencia): las que `cuadros` resume y de las que avisa. */
export const ESENCIA: EstrategiaKey[] = [
  'objetivo', 'rtbs', 'concepto', 'beneficios', 'arquetipo', 'personalidad', 'valores',
  'territorio', 'brand_ideal', 'ingredients', 'onlyness', 'tagline', 'manifiesto',
]

/** El bloque 5: el naming (si el proyecto lo pide) y los copies de cada entregable. */
export const NAMING_Y_COPIES: EstrategiaKey[] = ['naming', 'copies']

/** Las etapas que el equipo puede marcar como que no aplican: hoy, sólo el Naming. */
export const PUEDEN_NO_APLICAR_ESTRATEGIA: readonly EstrategiaKey[] = ['naming']

/**
 * Los bloques del proceso, con los nombres del listado de entregables del estudio. El
 * índice del proyecto los usa como sub-rótulo dentro de la fase Estrategia: 18 etapas
 * planas no se leen.
 */
export interface Bloque {
  titulo: string
  etapas: EstrategiaKey[]
}

export const BLOQUES: Bloque[] = [
  { titulo: 'Diagnóstico y consumidor', etapas: ['diagnostico', 'consumidor'] },
  { titulo: 'Esencia de marca', etapas: ESENCIA },
  { titulo: 'Narrativa y presentación', etapas: ['cuadros'] },
  { titulo: 'Naming y copies', etapas: NAMING_Y_COPIES },
]

export const ETAPA_LABEL: Record<EstrategiaKey, string> = {
  diagnostico: 'Diagnóstico',
  consumidor: 'Consumidor',
  objetivo: 'Objetivo de marca',
  rtbs: 'RTBs',
  concepto: 'Concepto estratégico',
  beneficios: 'Beneficios',
  arquetipo: 'Arquetipo',
  personalidad: 'Personalidad',
  valores: 'Valores',
  territorio: 'Territorio',
  brand_ideal: 'Brand Ideal',
  ingredients: 'Brand ingredients',
  onlyness: 'Onlyness',
  tagline: 'Tagline / CCI',
  manifiesto: 'Manifiesto',
  cuadros: 'Cuadros finales',
  // Como en el listado del estudio. “Naming” a secas ya es la fase 4 del menú.
  naming: 'Propuesta de naming',
  copies: 'Entregables y copies',
}

export const ETAPA_HINT: Partial<Record<EstrategiaKey, string>> = {
  cuadros: 'se llena desde lo aprobado',
  naming: 'si aplica',
}

export interface EtapaEstrategia {
  key: EstrategiaKey
  label: string
  hint?: string
  status: StageStatus
}

/** Todas las etapas siempre, aunque el proyecto todavía no tenga ninguna fila. */
export function buildEtapasEstrategia(estado: { stage: EstrategiaKey; status: StageStatus }[]): EtapaEstrategia[] {
  const porEtapa = new Map(estado.map(e => [e.stage, e.status]))
  return ETAPA_ORDER.map(key => ({
    key,
    label: ETAPA_LABEL[key],
    hint: ETAPA_HINT[key],
    status: porEtapa.get(key) ?? 'pendiente',
  }))
}
