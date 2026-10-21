/**
 * La sesión que usan las pruebas de las rutas protegidas: deja configurada la clave del
 * panel y devuelve la cabecera `cookie` de alguien que ya entró. Las pruebas no saben cómo
 * es la cookie por dentro, así que cambiar el mecanismo de sesión toca sólo este archivo.
 */
export const CLAVE_DE_PRUEBA = 'secreta'

export function cookieDeSesion(): { cookie: string } {
  process.env.ADMIN_PASSWORD = CLAVE_DE_PRUEBA
  return { cookie: `admin=${CLAVE_DE_PRUEBA}` }
}
