import { cookies } from 'next/headers'
import { db } from '@/lib/db/client'
import { usuarioPorId } from '@/lib/db/usuarios-store'
import { COOKIE_SESION, MAESTRA, leerSesion } from './sesion'

/** Quién está del otro lado de un pedido del panel. */
export interface Quien {
  id: string
  nombre: string
  /** Puede manejar el equipo: crear cuentas, cambiar claves ajenas, desactivar. */
  esAdmin: boolean
  /** Entró con la llave maestra, no con una cuenta: no hay a quién atribuirle nada. */
  maestra: boolean
  /** Hasta cuándo vio los avisos. La llave maestra no lleva la cuenta: `null`. */
  avisosVistosHasta: Date | null
}

const LLAVE_MAESTRA: Quien = { id: MAESTRA, nombre: 'Llave maestra', esAdmin: true, maestra: true, avisosVistosHasta: null }

/**
 * La cookie firmada dice quién entró; acá se confirma que esa persona sigue activa. Así,
 * desactivar a alguien le cierra la puerta en la próxima acción, no cuando venza la cookie.
 */
async function quienEs(valor?: string): Promise<Quien | null> {
  const s = await leerSesion(valor)
  if (!s) return null
  if (s.uid === MAESTRA) return LLAVE_MAESTRA
  const u = await usuarioPorId(db, s.uid)
  return u?.activo
    ? { id: u.id, nombre: u.nombre, esAdmin: u.esAdmin, maestra: false, avisosVistosHasta: u.avisosVistosHasta }
    : null
}

/** Una cookie leída de un `Request` pelado, para que las rutas se puedan testear a mano. */
export function cookieDe(req: Request, nombre: string): string | undefined {
  const par = (req.headers.get('cookie') ?? '').split(/;\s*/).find(c => c.startsWith(`${nombre}=`))
  return par === undefined ? undefined : decodeURIComponent(par.slice(nombre.length + 1))
}

/** La sesión de un pedido a la API. Sin sesión válida, `null`: la ruta responde 401. */
export function sesionDe(req: Request): Promise<Quien | null> {
  return quienEs(cookieDe(req, COOKIE_SESION))
}

/** La sesión de quien mira una página del panel (componentes de servidor). */
export async function quienEntro(): Promise<Quien | null> {
  return quienEs((await cookies()).get(COOKIE_SESION)?.value)
}

/** El nombre que se guarda como autor de una decisión: nadie, si entró con la llave maestra. */
export const firmaDe = (q: Quien): string | undefined => (q.maestra ? undefined : q.nombre)
