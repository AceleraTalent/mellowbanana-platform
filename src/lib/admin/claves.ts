import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * Las claves de las personas del equipo se guardan derivadas con scrypt y una sal propia,
 * nunca tal cual: si alguien lee la base, no se lleva las claves. El formato guarda los
 * parámetros para poder subirlos más adelante sin romper las claves que ya existen.
 */

const N = 16384, R = 8, P = 1, LARGO = 64

/** Lo mínimo para que una clave no se adivine en un rato: 8 caracteres. */
export const CLAVE_MINIMA = 8

function derivar(clave: string, sal: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((ok, mal) =>
    scrypt(clave, sal, LARGO, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? mal(e) : ok(k))))
}

export async function hashDeClave(clave: string): Promise<string> {
  const sal = randomBytes(16)
  const hash = await derivar(clave, sal, N, R, P)
  return `scrypt:${N}:${R}:${P}:${sal.toString('base64')}:${hash.toString('base64')}`
}

export async function claveCoincide(clave: string, guardado: string): Promise<boolean> {
  const [algo, n, r, p, sal, hash] = guardado.split(':')
  if (algo !== 'scrypt' || !sal || !hash) return false
  const esperado = Buffer.from(hash, 'base64')
  const calculado = await derivar(clave, Buffer.from(sal, 'base64'), Number(n), Number(r), Number(p))
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}
