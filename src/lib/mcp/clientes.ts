import { crearProyecto, renameProject, ErrorDeValidacion, type AnyDb } from '@/lib/db/store'
import { actualizarSeguimiento, seguimientoDe, validarCambios, type CambiosSeguimiento } from '@/lib/db/seguimiento-store'
import { agregarComentario, comentariosDe } from '@/lib/db/comentarios-store'
import { haceCuanto } from '@/lib/landscape/stages'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import type { FaseSistema } from '@/lib/seguimiento/sistema'
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
  /** Cambiarle el nombre, como lo llama el estudio. */
  nombre?: string
  /** true: lleva su proceso por fuera (se mueve a mano); false: lo hace en la plataforma. */
  porFuera?: boolean
  /** En la plataforma: que la fase vuelva a salir de lo aprobado, no de lo que se movió a mano. */
  calcularSola?: boolean
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

  const antes = await seguimientoDe(db, cliente.id)
  const porFuera = d.porFuera ?? antes.porFuera
  if (d.porFuera !== undefined && d.porFuera !== antes.porFuera) cambios.porFuera = d.porFuera

  // Todo lo que puede fallar se decide antes de escribir: un pedido que no se puede cumplir
  // no deja el nombre cambiado y la fase a medias.
  if (d.fase && d.calcularSola) throw new ErrorDeHerramienta('Mandá fase o calcularSola, no las dos: una pone la fase a mano y la otra la devuelve a lo aprobado.')
  if (d.calcularSola) {
    if (porFuera) throw new ErrorDeHerramienta(`${cliente.name} lleva su proceso por fuera: no hay nada aprobado en la plataforma de donde calcular su fase.`)
    cambios.calcular = true
  } else if (d.fase) {
    // Cualquier cliente se mueve de fase. En uno de la plataforma, la fase queda a mano.
    cambios.moverA = d.fase
    if (d.fase !== 'terminado' && d.sinEmpezar) cambios.fase = { key: d.fase, estado: 'pendiente' }
  } else if (cambios.porFuera === true) {
    // Pasa a llevarse a mano: arranca en la fase en la que va hoy, no desde cero.
    const hoy = (await cargarSistema(db)).find(f => f.id === cliente.id)!
    cambios.moverA = hoy.sigue.quien === 'listo' ? 'terminado' : hoy.actual
  }

  if (d.nombre !== undefined && d.nombre.trim() !== cliente.name) {
    try {
      cliente = { id: cliente.id, name: (await renameProject(db, cliente.id, d.nombre)).name }
    } catch (e) {
      if (e instanceof ErrorDeValidacion) throw new ErrorDeHerramienta(e.message)
      throw e
    }
  }
  if (Object.keys(cambios).length) await actualizarSeguimiento(db, cliente.id, cambios)

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

/**
 * La ficha de un cliente para el chat: lo mismo que ve el equipo al abrirlo en el panel,
 * más los últimos comentarios. Es lo que Claude lee antes de contestar "¿cómo va Viajero?".
 */
export async function verCliente(db: AnyDb, ref: string) {
  const { id } = await resolverProyecto(db, ref)
  const fila = (await cargarSistema(db)).find(f => f.id === id)!
  const ahora = new Date()
  return {
    ...resumen(fila),
    ultimoMovimiento: fila.ultimo ? `${fila.ultimo.texto} (${fila.ultimo.cuando})` : null,
    comentarios: (await comentariosDe(db, id, 15)).map(c => ({
      autor: c.autor, texto: c.texto, cuando: haceCuanto(c.cuando, ahora), fecha: c.cuando.toISOString().slice(0, 10),
    })),
    verEnElPanel: linkAlCliente(id),
  }
}

/** Deja un comentario en la bitácora del cliente, firmado por quien lo dijo en el chat. */
export async function comentarCliente(db: AnyDb, d: { cliente: string; comentario: string; autor?: string }) {
  const { id, name } = await resolverProyecto(db, d.cliente)
  try {
    const c = await agregarComentario(db, id, {
      autor: d.autor?.trim() ? `${d.autor.trim()} (vía Claude)` : 'Claude', texto: d.comentario, desde: 'claude',
    })
    return { cliente: name, comentario: { autor: c.autor, texto: c.texto }, verEnElPanel: linkAlCliente(id) }
  } catch (e) {
    if (e instanceof ErrorDeValidacion) throw new ErrorDeHerramienta(e.message)
    throw e
  }
}
