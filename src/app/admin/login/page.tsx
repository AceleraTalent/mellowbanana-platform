'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LogoBlock } from '@/components/Brand'

/**
 * Solo destinos internos: comparar orígenes en vez de filtrar por prefijos de texto.
 * `crudo.startsWith('/') && !crudo.startsWith('//')` deja pasar `/\evil.com` — los
 * navegadores normalizan la barra invertida a barra normal en esquemas especiales, así
 * que `location.href` termina navegando a otro dominio igual. Resolver contra el origen
 * actual y comparar orígenes cierra ese agujero, y de paso también `javascript:` y
 * cualquier esquema que no sea el de esta app.
 */
export function destinoSeguro(crudo: string, origin: string): string {
  // Sin `next` (el caso normal: entrar al panel sin venir de /authorize), `new URL('', origin)`
  // resuelve igual — a la raíz del origen, no a /admin — así que hay que cortar antes.
  if (!crudo) return '/admin'
  try {
    const u = new URL(crudo, origin)
    if (u.origin === origin) return u.pathname + u.search + u.hash
  } catch { /* URL inválida: cae a /admin */ }
  return '/admin'
}

const CAMPO = 'rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  // La llave maestra es para quien administra: recuperar el acceso y crear las cuentas.
  const [maestra, setMaestra] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const params = useSearchParams()
  const crudo = params.get('next') ?? ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(false)
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(maestra ? { clave } : { usuario, clave }),
      headers: { 'content-type': 'application/json' },
    })
    // `window` no existe durante el render del servidor: el origen se calcula acá, no
    // en el cuerpo del componente.
    if (r.ok) { location.href = destinoSeguro(crudo, window.location.origin); return }
    setBusy(false); setError(true)
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-[var(--papel)] md:items-center md:p-8">
      <div className="flex w-full max-w-md flex-col items-center bg-white px-7 py-10 text-center md:rounded-[14px] md:border md:border-[var(--line)] md:px-12 md:py-12">
        <LogoBlock />
        <p className="mt-7 font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">
          Panel interno
        </p>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.1] tracking-[-.025em] text-[var(--ink)]">
          Hola de <span className="underline-banana">nuevo</span>
        </h1>
        <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-3 text-left">
          {!maestra && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario" className="text-[12px] font-medium text-[var(--secundario)]">Usuario</label>
              <input id="usuario" required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false}
                value={usuario} onChange={e => setUsuario(e.target.value)} className={CAMPO} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clave" className="text-[12px] font-medium text-[var(--secundario)]">{maestra ? 'Llave maestra' : 'Clave'}</label>
            <input id="clave" type="password" required autoFocus={maestra} autoComplete="current-password"
              value={clave} onChange={e => setClave(e.target.value)} className={CAMPO} />
          </div>
          {error && (
            <p role="alert" className="animate-fade text-[13.5px] text-[var(--error)]">
              {maestra ? 'Esa no es la llave maestra.' : 'El usuario o la clave no coinciden.'}
            </p>
          )}
          <button disabled={busy}
            className="mt-3 rounded-[8px] bg-[var(--ink)] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#2b2720] disabled:opacity-50">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <button type="button" onClick={() => { setMaestra(!maestra); setError(false); setClave('') }}
          className="mt-6 text-[13px] text-[var(--secundario)] underline underline-offset-2 hover:text-[var(--ink)]">
          {maestra ? 'Entrar con mi usuario' : 'Entrar con la llave maestra'}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  )
}
