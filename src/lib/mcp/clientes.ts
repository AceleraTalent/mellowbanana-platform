import { crearProyecto, ErrorDeValidacion, type AnyDb } from '@/lib/db/store'
import { actualizarSeguimiento, seguimientoDe, validarCambios, type CambiosSeguimiento } from '@/lib/db/seguimiento-store'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { FASE_LABEL, FASES_MANUALES, type FaseSistema } from '@/lib/seguimiento/sistema'
import { ErrorDeHerramienta } from './errores'
import { resolverProyecto } from './resolver'

/** La ficha del cliente en el panel, absoluta para que Claude la dé como link. */
export function linkAlCliente(projectId: string): string {
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return `${dominio ? `https://${dominio}` : ''}/admin/projects/${projectId}`
}

export interface PedidoCliente {
  cliente: string
  /** Si no existe, crearlo como cliente por fuera. Sin esto, un nombre mal escrito es un error. */
  crear?: boolean
  fase?: FaseSistema | 'terminado'
  /** La fase a la que se mueve todavía no arrancó (el "Not started" de Notion). */
  sinEmpezar?: boolean
  frenado?: 'no' | 'cliente' | 'pausa'
  encargado?: string | null
  fechaEntrega?: string | null
  notas?: string | null
}

/**
 * Lo que Claude puede hacer con el tablero del estudio, igual que el equipo en el panel:
 * crear un cliente por fuera, moverlo de fase, asignarlo, ponerle fecha, anotar y marcarlo
 * frenado. Lo que la plataforma calcula sola (Landscape y Estrategia de un cliente que hace
 * su proceso acá) no se toca: avanza con lo que el equipo aprueba.
 */
export async function actualizarCliente(db: AnyDb, d: PedidoCliente) {
  // Se valida antes de buscar o crear: una fecha mal escrita no deja un cliente a medias.
  let cambios: CambiosSeguimiento
  try {
    cambios = validarCambios({
      ...(d.encargado !== undefined ? { encargado: d.encargado } : {}),
      ...(d.notas !== undefined ? { notas: d.notas } : {}),
      ...(d.fechaEntrega !== undefined ? { fechaEntrega: d.fechaEntrega } : {}),
      ...(d.frenado !== undefined ? { estadoManual: d.frenado === 'no' ? null : d.frenado } : {}),
    })
  } catch (e) {
    if (e instanceof ErrorDeValidacion) throw new ErrorDeHerramienta(e.message)
    throw e
  }

  let cliente: { id: string; name: string }
  let creado = false
  try {
    cliente = await resolverProyecto(db, d.cliente)
  } catch (e) {
    if (!d.crear || !(e instanceof ErrorDeHerramienta)) throw e
    try {
      const p = await crearProyecto(db, d.cliente)
      cliente = { id: p.id, name: p.name }
    } catch (v) {
      if (v instanceof ErrorDeValidacion) throw new ErrorDeHerramienta(v.message)
      throw v
    }
    await actualizarSeguimiento(db, cliente.id, { porFuera: true })
    creado = true
  }

  const { porFuera } = await seguimientoDe(db, cliente.id)

  if (d.fase) {
    if (porFuera) cambios.moverA = d.fase
    else if (d.fase !== 'terminado' && FASES_MANUALES.includes(d.fase) && d.fase !== 'taller')
      cambios.fase = { key: d.fase, estado: d.sinEmpezar ? 'pendiente' : 'en_curso' }
    else
      throw new ErrorDeHerramienta(
        `${cliente.name} hace su proceso en la plataforma: su ${d.fase === 'terminado' ? 'avance' : FASE_LABEL[d.fase]} se mueve solo ` +
        'con lo que el equipo aprueba en el panel. A mano sólo se marcan Naming y Diseño, o cualquier fase de un cliente por fuera.')
  }
  await actualizarSeguimiento(db, cliente.id, cambios)
  if (porFuera && d.fase && d.fase !== 'terminado' && d.sinEmpezar)
    await actualizarSeguimiento(db, cliente.id, { fase: { key: d.fase, estado: 'pendiente' } })

  const fila = (await cargarSistema(db)).find(f => f.id === cliente.id)!
  return { ...resumen(fila), creado, verEnElPanel: linkAlCliente(cliente.id) }
}

/** Una fila del tablero dicha para Claude: lo mismo que ve el equipo en el inicio. */
export function resumen(f: Awaited<ReturnType<typeof cargarSistema>>[number]) {
  const fase = f.fases.find(x => x.key === f.actual)!
  return {
    cliente: f.nombre,
    porFuera: f.seguimiento.porFuera,
    fase: f.sigue.quien === 'listo' ? 'Terminado' : `${fase.label} (${fase.detalle.toLowerCase()})`,
    queSigue: f.sigue.detalle ? `${f.sigue.texto}: ${f.sigue.detalle}` : f.sigue.texto,
    encargado: f.seguimiento.encargado,
    entrega: f.seguimiento.fechaEntrega,
    notas: f.seguimiento.notas,
  }
}
