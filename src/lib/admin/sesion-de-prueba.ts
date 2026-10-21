import { createHmac } from 'node:crypto'
import { COOKIE_SESION, DURACION_SESION_MS, MAESTRA } from './sesion'

/**
 * La sesión que usan las pruebas de las rutas protegidas: deja configurada la llave
 * maestra y devuelve la cabecera `cookie` de alguien que ya entró. Firma igual que
 * `firmarSesion` (HMAC-SHA256 en base64url), pero sin esperar: las pruebas arman los
 * pedidos de forma síncrona. Las pruebas no saben cómo es la cookie por dentro.
 */
export const CLAVE_DE_PRUEBA = 'secreta'

/** El valor de la cookie de sesión de `uid` (por defecto, la llave maestra). */
export function valorDeSesion(uid: string = MAESTRA): string {
  process.env.ADMIN_PASSWORD = CLAVE_DE_PRUEBA
  delete process.env.SESSION_SECRET
  const vence = Date.now() + DURACION_SESION_MS
  const firma = createHmac('sha256', `mb-sesion:${CLAVE_DE_PRUEBA}`).update(`${uid}.${vence}`).digest('base64url')
  return `${uid}.${vence}.${firma}`
}

export function cookieDeSesion(uid: string = MAESTRA): { cookie: string } {
  return { cookie: `${COOKIE_SESION}=${valorDeSesion(uid)}` }
}
