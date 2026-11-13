/** Lo que muestran las tarjetas y el editor de un cliente, dicho corto. */

/** “Victor Gonzalez, Valentina Amaya” → [{ iniciales: 'VG', nombre: 'Victor Gonzalez' }, …] */
export function personas(encargado: string | null): { iniciales: string; nombre: string }[] {
  if (!encargado) return []
  return encargado.split(/,| y /).map(n => n.trim()).filter(Boolean).map(nombre => ({
    nombre,
    iniciales: nombre.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join(''),
  }))
}

/** Todos los encargados que ya aparecen en el tablero, para sugerirlos al escribir. */
export function encargadosConocidos(encargados: (string | null)[]): string[] {
  return [...new Set(encargados.flatMap(e => personas(e).map(p => p.nombre)))].sort((a, b) => a.localeCompare(b))
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Días desde hoy hasta la fecha (negativo si ya pasó). */
export function diasHasta(fecha: string, hoy = new Date()): number {
  const [a, m, d] = fecha.split('-').map(Number)
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86_400_000)
}

/** “28 ago”, o “28 ago 2025” si no es de este año. */
export function fechaCorta(fecha: string, hoy = new Date()): string {
  const [a, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES[m - 1]}${a !== hoy.getFullYear() ? ` ${a}` : ''}`
}

/** El valor del proyecto, corto: “$118M”, “$850.000”. */
export function valorCorto(pesos: number): string {
  if (pesos >= 1_000_000) return `$${(pesos / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  return `$${pesos.toLocaleString('es-CO')}`
}

/** Lo que se escribió en el campo de valor, en pesos: cuentan sólo los dígitos. */
export function pesosDe(texto: string): number | null {
  const digitos = texto.replace(/[^0-9]/g, '')
  return digitos ? Number(digitos) : null
}

/** “15 oct 2026”: la fecha con el año siempre, para la cabecera del proyecto. */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES[m - 1]} ${a}`
}

/** Para el lado de la fecha: cuánto falta, en palabras. */
export function cuandoVence(fecha: string, hoy = new Date()): { texto: string; vencida: boolean } {
  const dias = diasHasta(fecha, hoy)
  if (dias === 0) return { texto: 'Vence hoy', vencida: false }
  if (dias === 1) return { texto: 'Vence mañana', vencida: false }
  if (dias < 0) return { texto: dias === -1 ? 'Venció ayer' : `Venció hace ${-dias} días`, vencida: true }
  return { texto: `En ${dias} días`, vencida: false }
}
