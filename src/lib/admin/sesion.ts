/**
 * La sesión del panel, en una cookie firmada: `<quién>.<vence>.<firma>`. La firma es un
 * HMAC-SHA256 con una llave que sale de SESSION_SECRET o, si no está, de la llave maestra
 * (ADMIN_PASSWORD): cambiar la llave maestra cierra todas las sesiones, que es lo que se
 * quiere si se filtró. Usa Web Crypto para poder leerse también en el proxy.
 *
 * La cookie dice quién entró, no si esa persona sigue activa: eso lo mira `sesionDe`
 * contra la base en cada acción. El proxy sólo abre la puerta de las páginas.
 */

export const COOKIE_SESION = 'mb_sesion'
/** Quien entró con la llave maestra, no con una cuenta. */
export const MAESTRA = 'maestra'
export const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000

export interface SesionFirmada {
  uid: string
  vence: number
}

function secreto(): string {
  const base = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
  // El “2” cerró todas las sesiones abiertas con la clave compartida del equipo, cuando
  // el panel pasó a entrar sólo con cuenta propia.
  return base ? `mb-sesion-2:${base}` : ''
}

function base64url(bytes: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function firmar(texto: string, llave: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(llave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return base64url(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(texto)))
}

/** Compara sin cortar en la primera diferencia, para no dar pistas por el tiempo. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return dif === 0
}

export async function firmarSesion(uid: string, ahora = Date.now()): Promise<string> {
  const llave = secreto()
  if (!llave) throw new Error('No hay llave para firmar sesiones: falta ADMIN_PASSWORD')
  const vence = ahora + DURACION_SESION_MS
  return `${uid}.${vence}.${await firmar(`${uid}.${vence}`, llave)}`
}

/** Lo que dice la cookie, si la firma es buena y no venció. */
export async function leerSesion(valor: string | undefined, ahora = Date.now()): Promise<SesionFirmada | null> {
  const llave = secreto()
  if (!valor || !llave) return null
  const [uid, venceTexto, firma, ...resto] = valor.split('.')
  if (!uid || !venceTexto || !firma || resto.length) return null
  const vence = Number(venceTexto)
  if (!Number.isFinite(vence) || vence <= ahora) return null
  return iguales(firma, await firmar(`${uid}.${venceTexto}`, llave)) ? { uid, vence } : null
}
