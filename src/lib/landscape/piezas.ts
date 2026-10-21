import type { StageKey } from './stages'

/**
 * Las partes del deck que no son una etapa entera pero que el estudio arma igual: el
 * desarrollo de las tendencias elegidas, sus casos, el cuadro de brand assets y el círculo
 * cromático. Antes quedaban sólo en el chat; ahora Claude las guarda como cualquier etapa
 * (mismo historial de versiones, misma aprobación) y se leen en su sección.
 */
export const PIEZAS = [
  { key: 'tendencias-desarrollo', etapa: 'tendencias', paso: '3.5', titulo: 'Desarrollo de las tendencias' },
  { key: 'tendencias-casos', etapa: 'tendencias', paso: '3.4', titulo: 'Casos por tendencia' },
  { key: 'panorama-brand-assets', etapa: 'panorama', paso: '4.2', titulo: 'Brand assets' },
  { key: 'panorama-circulo', etapa: 'panorama', paso: '4.3', titulo: 'Círculo cromático' },
] as const satisfies readonly { key: string; etapa: StageKey; paso: string; titulo: string }[]

export type PiezaKey = (typeof PIEZAS)[number]['key']
export const PIEZA_KEYS: readonly PiezaKey[] = PIEZAS.map(p => p.key)
export const PIEZA_LABEL = Object.fromEntries(PIEZAS.map(p => [p.key, p.titulo])) as Record<PiezaKey, string>

export const esPieza = (k: string): k is PiezaKey => (PIEZA_KEYS as readonly string[]).includes(k)
export const piezaDePaso = (pasoId: string) => PIEZAS.find(p => p.paso === pasoId)
export const etapaDePieza = (k: PiezaKey): StageKey => PIEZAS.find(p => p.key === k)!.etapa
