import { NextResponse } from 'next/server'
import { COOKIE_SESION } from '@/lib/admin/sesion'

/** Salir: borra la sesión y vuelve al login. Es un POST para que un link ajeno no te saque. */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303)
  res.cookies.delete(COOKIE_SESION)
  return res
}
