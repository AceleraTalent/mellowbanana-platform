'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/components/paso/piezas'

export interface PersonaVista {
  id: string
  nombre: string
  usuario: string
  esAdmin: boolean
  activo: boolean
}

const CAMPO = 'w-full rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink)]'
const ETIQUETA = 'mb-1 block text-[12.5px] font-medium text-[var(--secundario)]'
const DISCRETO = 'text-[13px] text-[var(--secundario)] underline-offset-2 hover:text-[var(--ink)] hover:underline disabled:cursor-wait disabled:opacity-60'

async function pedir(url: string, method: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
  if (res?.ok) return null
  return ((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? 'No se pudo guardar. Prueba de nuevo.'
}

/** Crear una cuenta. Al terminar dice qué pasarle a la persona. */
function NuevaPersona({ onCreada }: { onCreada: (aviso: string) => void }) {
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const fallo = await pedir('/api/equipo', 'POST', { nombre, usuario, clave, esAdmin })
    setGuardando(false)
    if (fallo) { setError(fallo); return }
    onCreada(`Listo. Pásale a ${nombre.trim()} su usuario, “${usuario.trim().toLowerCase()}”, y la clave que pusiste. La puede cambiar al entrar.`)
    setNombre(''); setUsuario(''); setClave(''); setEsAdmin(false); setError(null)
  }

  return (
    <form onSubmit={crear} aria-label="Nueva persona" className="rounded-[12px] border border-[var(--line)] bg-white p-5">
      <p className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">Nueva persona</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="nueva-nombre" className={ETIQUETA}>Nombre</label>
          <input id="nueva-nombre" required value={nombre} onChange={e => setNombre(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label htmlFor="nueva-usuario" className={ETIQUETA}>Usuario</label>
          <input id="nueva-usuario" required autoCapitalize="none" spellCheck={false} value={usuario}
            onChange={e => setUsuario(e.target.value)} className={CAMPO} placeholder="ana" />
        </div>
        <div>
          <label htmlFor="nueva-clave" className={ETIQUETA}>Clave para empezar</label>
          <input id="nueva-clave" required minLength={8} value={clave} onChange={e => setClave(e.target.value)} className={CAMPO}
            placeholder="8 caracteres o más" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[13.5px] text-[var(--cuerpo)]">
          <input type="checkbox" checked={esAdmin} onChange={e => setEsAdmin(e.target.checked)} className="accent-[var(--ink)]" />
          Puede administrar el equipo
        </label>
        <button type="submit" disabled={guardando} className={`${BOTON_PRIMARIO} px-4 py-2`}>
          {guardando ? 'Creando…' : 'Crear cuenta'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] text-[var(--error)]">{error}</p>}
    </form>
  )
}

/** Cambiar una clave: la propia pide la de ahora; la de otro, sólo quien administra. */
function CambiarClave({ persona, propia, onListo }: { persona: PersonaVista; propia: boolean; onListo: (aviso: string) => void }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const fallo = await pedir(`/api/equipo/${persona.id}`, 'PATCH', propia ? { clave: nueva, claveActual: actual } : { clave: nueva })
    setGuardando(false)
    if (fallo) { setError(fallo); return }
    onListo(propia ? 'Tu clave quedó cambiada.' : `La clave de ${persona.nombre} quedó cambiada. Pásasela.`)
  }

  return (
    <form onSubmit={guardar} aria-label={propia ? 'Cambiar mi clave' : `Nueva clave para ${persona.nombre}`}
      className="mt-3 flex flex-wrap items-end gap-3">
      {propia && (
        <div>
          <label htmlFor={`actual-${persona.id}`} className={ETIQUETA}>Clave de ahora</label>
          <input id={`actual-${persona.id}`} type="password" required autoComplete="current-password" value={actual}
            onChange={e => setActual(e.target.value)} className={CAMPO} />
        </div>
      )}
      <div>
        <label htmlFor={`nueva-${persona.id}`} className={ETIQUETA}>Clave nueva</label>
        <input id={`nueva-${persona.id}`} type="password" required minLength={8} autoComplete="new-password" value={nueva}
          onChange={e => setNueva(e.target.value)} className={CAMPO} placeholder="8 caracteres o más" />
      </div>
      <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>{guardando ? 'Guardando…' : 'Guardar clave'}</button>
      {error && <p role="alert" className="basis-full text-[13px] text-[var(--error)]">{error}</p>}
    </form>
  )
}

export function PanelEquipo({ personas, yo }: {
  personas: PersonaVista[]
  yo: { id: string; esAdmin: boolean; maestra: boolean } | null
}) {
  const router = useRouter()
  const [aviso, setAviso] = useState<string | null>(null)
  const [cambiando, setCambiando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; texto: string } | null>(null)
  const admin = !!yo?.esAdmin

  const listo = (texto: string) => { setAviso(texto); setCambiando(null); router.refresh() }

  async function cambiar(p: PersonaVista, cambios: { activo?: boolean; esAdmin?: boolean }) {
    setGuardando(p.id)
    const fallo = await pedir(`/api/equipo/${p.id}`, 'PATCH', cambios)
    setGuardando(null)
    if (fallo) { setError({ id: p.id, texto: fallo }); return }
    setError(null)
    router.refresh()
  }

  return (
    <div className="mt-10 max-w-[860px] space-y-8">
      {yo?.maestra && (
        <p className="max-w-[62ch] border-l-[1.5px] border-[var(--ink)] pl-3 text-[14px] leading-[1.6] text-[var(--secundario)]">
          Entraste con la llave maestra. Crea una cuenta para cada persona del equipo; después cada quien entra con la suya y
          el historial dice quién aprobó qué.
        </p>
      )}

      {aviso && <p role="status" className="rounded-[10px] bg-[var(--aprobado)] px-4 py-3 text-[14px] text-[var(--ink)]">{aviso}</p>}

      {admin && <NuevaPersona onCreada={listo} />}

      {personas.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-[#CFC9BA] px-6 py-6 text-[14px] text-[var(--secundario)]">
          Todavía no hay cuentas.{admin ? ' Crea la primera arriba.' : ''}
        </p>
      ) : (
        <ul aria-label="Personas del equipo" className="divide-y divide-[var(--line)] rounded-[12px] border border-[var(--line)] bg-white">
          {personas.map(p => {
            const propia = yo?.id === p.id
            return (
              <li key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <p className="min-w-0">
                    <span className={`text-[15px] font-semibold ${p.activo ? 'text-[var(--ink)]' : 'text-[var(--apagado)] line-through'}`}>{p.nombre}</span>
                    <span className="ml-2 font-mono text-[12.5px] text-[var(--rotulo)]">{p.usuario}</span>
                    {propia && <span className="ml-2 text-[12.5px] text-[var(--secundario)]">(tú)</span>}
                    {p.esAdmin && <span className="ml-2 rounded-full bg-[var(--banana)] px-2 py-[2px] text-[11.5px] font-semibold text-[var(--ink)]">Administra</span>}
                    {!p.activo && <span className="ml-2 text-[12.5px] text-[var(--secundario)]">Desactivada</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {(propia || admin) && (
                      <button type="button" onClick={() => setCambiando(cambiando === p.id ? null : p.id)} className={DISCRETO}>
                        {cambiando === p.id ? 'Cancelar' : propia ? 'Cambiar mi clave' : 'Nueva clave'}
                      </button>
                    )}
                    {admin && !propia && (
                      <>
                        <button type="button" disabled={guardando === p.id} onClick={() => cambiar(p, { esAdmin: !p.esAdmin })} className={DISCRETO}>
                          {p.esAdmin ? 'Quitar administración' : 'Dar administración'}
                        </button>
                        <button type="button" disabled={guardando === p.id} onClick={() => cambiar(p, { activo: !p.activo })}
                          className={p.activo ? DISCRETO : BOTON_SECUNDARIO}>
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {cambiando === p.id && <CambiarClave persona={p} propia={propia} onListo={listo} />}
                {error?.id === p.id && <p role="alert" className="mt-2 text-[13px] text-[var(--error)]">{error.texto}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
