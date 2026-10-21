import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_SESION, leerSesion } from '@/lib/admin/sesion'

/**
 * Las páginas del panel piden una sesión firmada y vigente. Si la persona sigue activa lo
 * confirma cada acción contra la base (`sesionDe`); acá sólo se abre la puerta.
 */
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
    if (!(await leerSesion(req.cookies.get(COOKIE_SESION)?.value))) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }
  return NextResponse.next()
}
export const config = { matcher: ['/admin/:path*'] }
