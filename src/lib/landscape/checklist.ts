/**
 * El checklist de investigación del estudio para el contexto del sector (punto 1): los
 * bloques que el Landscape tiene que cubrir. Claude marca cada sección del contexto con
 * su `bloque`; con eso el panel y el conector dicen qué falta, sin leer el texto.
 * Ver valkyria/specs/2026-11-12-checklists-landscape-estrategia-design.md
 */

export const BLOQUES_CONTEXTO = [
  { key: 'cifras', label: 'Cifras del sector, global y Colombia (tamaño, crecimiento, jugadores clave)' },
  { key: 'drivers', label: 'Drivers de cambio del sector' },
  { key: 'consumidor', label: 'Cambios y evolución del consumidor' },
  { key: 'retos', label: 'Retos del sector' },
  { key: 'oportunidades', label: 'Oportunidades del sector' },
  { key: 'oportunidad_marca', label: 'Oportunidad de marca' },
  { key: 'conclusion', label: 'Qué buscan los clientes del segmento (conclusión)' },
] as const

export type BloqueContexto = (typeof BLOQUES_CONTEXTO)[number]['key']

const CLAVES = new Set<string>(BLOQUES_CONTEXTO.map(b => b.key))

/** “Oportunidad de marca”, “oportunidadMarca” y “oportunidad_marca” son el mismo bloque. */
function normalizar(v: unknown): string {
  return typeof v === 'string'
    ? v.trim().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\bde\b/g, ' ').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '')
    : ''
}

/**
 * Qué bloques del checklist cubre un contexto y cuáles le faltan. `marcado` dice si
 * alguna sección declara su bloque: un contexto escrito antes del checklist no declara
 * ninguno, y de ése no se puede decir que le falte nada.
 */
export function coberturaDelContexto(contenido: unknown): { marcado: boolean; cubiertos: BloqueContexto[]; faltan: string[] } {
  const c = contenido && typeof contenido === 'object' && !Array.isArray(contenido) ? contenido as Record<string, unknown> : {}
  const secciones = Array.isArray(c.secciones) ? c.secciones : []
  const declarados = new Set(
    secciones
      .map(s => normalizar(s && typeof s === 'object' ? (s as Record<string, unknown>).bloque : undefined))
      .filter(k => CLAVES.has(k)),
  )
  return {
    marcado: declarados.size > 0,
    cubiertos: BLOQUES_CONTEXTO.filter(b => declarados.has(b.key)).map(b => b.key),
    faltan: BLOQUES_CONTEXTO.filter(b => !declarados.has(b.key)).map(b => b.label),
  }
}
