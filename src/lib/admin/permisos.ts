import type { FilaSistema } from '@/lib/seguimiento/cargar'
import type { Quien } from './auth'

/**
 * Los dos accesos del panel. Dirección ve y hace todo. El equipo ve a todos los clientes y
 * trabaja sus tareas, pero no ve el valor de los proyectos, no borra clientes y no maneja
 * cuentas. “Dirección” es quien tiene `esAdmin` (y la llave maestra).
 */
export const esDireccion = (q: Pick<Quien, 'esAdmin'> | null | undefined): boolean => !!q?.esAdmin

/**
 * El Sistema M&B tal como lo puede ver esa persona. Para el equipo el valor sale del
 * servidor ya borrado: las filas viajan enteras al navegador, así que esconder el campo
 * en la pantalla no alcanza.
 */
export function paraQuien(filas: FilaSistema[], q: Pick<Quien, 'esAdmin'> | null | undefined): FilaSistema[] {
  if (esDireccion(q)) return filas
  return filas.map(f => ({ ...f, valorOculto: true, seguimiento: { ...f.seguimiento, valor: null } }))
}
