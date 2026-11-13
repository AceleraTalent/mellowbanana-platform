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
  // La primera vez que alguien entra, su cuenta todavía no tiene clave: entra con la del
  // equipo y acá elige la suya. `primera` guarda el nombre para saludarlo.
  const [primera, setPrimera] = useState<string | null>(null)
  const [nueva, setNueva] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const params = useSearchParams()
  const crudo = params.get('next') ?? ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(primera === null ? { usuario, clave } : { usuario, clave, nueva }),
      headers: { 'content-type': 'application/json' },
    }).catch(() => null)
    // `window` no existe durante el render del servidor: el origen se calcula acá, no
    // en el cuerpo del componente.
    if (r?.ok) { location.href = destinoSeguro(crudo, window.location.origin); return }
    const cuerpo = (await r?.json().catch(() => null)) as { primeraVez?: boolean; nombre?: string; error?: string } | null
    setBusy(false)
    if (r?.status === 409 && cuerpo?.primeraVez) { setPrimera(cuerpo.nombre ?? ''); return }
    setError(cuerpo?.error ?? 'No se pudo entrar. Prueba de nuevo.')
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-[var(--papel)] md:items-center md:p-8">
      <div className="flex w-full max-w-md flex-col items-center bg-white px-7 py-10 text-center md:rounded-[14px] md:border md:border-[var(--line)] md:px-12 md:py-12">
        <LogoBlock />
        <p className="mt-7 font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">
          Panel interno
        </p>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.1] tracking-[-.025em] text-[var(--ink)]">
          {primera === null ? <>Hola de <span className="underline-banana">nuevo</span></> : <>Elige tu <span className="underline-banana">clave</span></>}
        </h1>
        {primera !== null && (
          <p className="mt-3 text-[14.5px] leading-[1.5] text-[var(--secundario)]">
            {primera ? `${primera.split(' ')[0]}, es` : 'Es'} tu primera vez. Desde ahora entras con tu usuario y esta clave.
          </p>
        )}
        <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-3 text-left">
          {primera === null ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="usuario" className="text-[12px] font-medium text-[var(--secundario)]">Usuario</label>
                <input id="usuario" required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false}
                  value={usuario} onChange={e => setUsuario(e.target.value)} className={CAMPO} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="clave" className="text-[12px] font-medium text-[var(--secundario)]">Clave</label>
                <input id="clave" type="password" required autoComplete="current-password"
                  value={clave} onChange={e => setClave(e.target.value)} className={CAMPO} />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nueva" className="text-[12px] font-medium text-[var(--secundario)]">Tu clave nueva</label>
              <input id="nueva" type="password" required autoFocus minLength={8} autoComplete="new-password"
                value={nueva} onChange={e => setNueva(e.target.value)} className={CAMPO} />
              <span className="text-[12.5px] text-[var(--secundario)]">8 caracteres o más.</span>
            </div>
          )}
          {error && <p role="alert" className="animate-fade text-[13.5px] text-[var(--error)]">{error}</p>}
          <button disabled={busy}
            className="mt-3 rounded-[8px] bg-[var(--primario)] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#2b2720] disabled:opacity-50">
            {busy ? 'Entrando…' : primera === null ? 'Entrar' : 'Guardar y entrar'}
          </button>
        </form>
        {primera === null && (
          <p className="mt-6 text-[13px] leading-[1.5] text-[var(--secundario)]">
            ¿Primera vez? Entra con tu usuario y la clave del equipo de siempre; ahí eliges la tuya.
          </p>
        )}
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
