import { asc, eq } from 'drizzle-orm'
import { usuarios } from './schema'
import { ErrorDeValidacion, ErrorNoEncontrado, type AnyDb } from './store'
import { CLAVE_MINIMA, claveCoincide, hashDeClave } from '@/lib/admin/claves'
import { esUuidValido } from '@/lib/landscape/ids'

/** Una persona del equipo, sin su clave: lo único que sale de este archivo. */
export interface Usuario {
  id: string
  nombre: string
  usuario: string
  esAdmin: boolean
  activo: boolean
  avisosVistosHasta: Date | null
}

type Fila = typeof usuarios.$inferSelect

function sinClave(f: Fila): Usuario {
  return {
    id: f.id, nombre: f.nombre, usuario: f.usuario, esAdmin: f.esAdmin, activo: f.activo,
    avisosVistosHasta: f.avisosVistosHasta ? new Date(f.avisosVistosHasta) : null,
  }
}

/** El usuario se escribe como sea; se guarda y se compara en minúsculas y sin espacios. */
export const normalizarUsuario = (u: string) => u.trim().toLowerCase()
const USUARIO_VALIDO = /^[a-z0-9._-]{2,30}$/

function validarClave(clave: string) {
  if (clave.length < CLAVE_MINIMA)
    throw new ErrorDeValidacion(`La clave tiene que tener al menos ${CLAVE_MINIMA} caracteres`)
}

export async function listarUsuarios(db: AnyDb): Promise<Usuario[]> {
  return ((await db.select().from(usuarios).orderBy(asc(usuarios.nombre))) as Fila[]).map(sinClave)
}

export async function usuarioPorId(db: AnyDb, id: string): Promise<Usuario | null> {
  if (!esUuidValido(id)) return null
  const [f] = (await db.select().from(usuarios).where(eq(usuarios.id, id))) as Fila[]
  return f ? sinClave(f) : null
}

export async function crearUsuario(db: AnyDb, d: { nombre: string; usuario: string; clave: string; esAdmin?: boolean }): Promise<Usuario> {
  const nombre = d.nombre.trim()
  const usuario = normalizarUsuario(d.usuario)
  if (!nombre) throw new ErrorDeValidacion('Falta el nombre')
  if (!USUARIO_VALIDO.test(usuario))
    throw new ErrorDeValidacion('El usuario va en minúsculas, sin espacios: letras, números, punto, guion o guion bajo')
  validarClave(d.clave)
  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.usuario, usuario))
  if (existe) throw new ErrorDeValidacion(`Ya hay alguien con el usuario “${usuario}”`)

  const [f] = (await db.insert(usuarios).values({
    nombre, usuario, claveHash: await hashDeClave(d.clave), esAdmin: !!d.esAdmin,
  }).returning()) as Fila[]
  return sinClave(f)
}

/**
 * Quién es, si el usuario y la clave coinciden y la cuenta está activa. Una cuenta
 * desactivada no entra aunque la clave sea buena.
 */
export async function verificarCredenciales(db: AnyDb, usuario: string, clave: string): Promise<Usuario | null> {
  const [f] = (await db.select().from(usuarios).where(eq(usuarios.usuario, normalizarUsuario(usuario)))) as Fila[]
  if (!f || !f.activo) return null
  return (await claveCoincide(clave, f.claveHash)) ? sinClave(f) : null
}

/** Si la clave es la de esa persona: para cambiar la propia hay que saber la de ahora. */
export async function claveEsLaDe(db: AnyDb, id: string, clave: string): Promise<boolean> {
  if (!esUuidValido(id)) return false
  const [f] = (await db.select().from(usuarios).where(eq(usuarios.id, id))) as Fila[]
  return !!f && (await claveCoincide(clave, f.claveHash))
}

export async function cambiarClave(db: AnyDb, id: string, clave: string): Promise<void> {
  validarClave(clave)
  if (!(await usuarioPorId(db, id))) throw new ErrorNoEncontrado('No existe esa persona')
  await db.update(usuarios).set({ claveHash: await hashDeClave(clave) }).where(eq(usuarios.id, id))
}

export async function actualizarUsuario(db: AnyDb, id: string, cambios: { nombre?: string; esAdmin?: boolean; activo?: boolean }): Promise<Usuario> {
  if (!(await usuarioPorId(db, id))) throw new ErrorNoEncontrado('No existe esa persona')
  const set: Partial<Fila> = {}
  if (cambios.nombre !== undefined) {
    if (!cambios.nombre.trim()) throw new ErrorDeValidacion('Falta el nombre')
    set.nombre = cambios.nombre.trim()
  }
  if (cambios.esAdmin !== undefined) set.esAdmin = cambios.esAdmin
  if (cambios.activo !== undefined) set.activo = cambios.activo
  if (!Object.keys(set).length) return (await usuarioPorId(db, id))!
  const [f] = (await db.update(usuarios).set(set).where(eq(usuarios.id, id)).returning()) as Fila[]
  return sinClave(f)
}

/** Hasta cuándo vio los avisos: lo que llegó después es lo nuevo para esa persona. */
export async function marcarAvisosVistos(db: AnyDb, id: string, hasta = new Date()): Promise<void> {
  if (!esUuidValido(id)) return
  await db.update(usuarios).set({ avisosVistosHasta: hasta }).where(eq(usuarios.id, id))
}
