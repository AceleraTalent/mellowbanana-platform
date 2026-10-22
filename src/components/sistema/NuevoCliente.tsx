'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/components/paso/piezas'

const CAMPO = 'w-full rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-[14.5px] text-[var(--ink)] outline-none focus:border-[var(--ink)]'

/**
 * Agregar un cliente desde el panel, como una tarjeta nueva en Notion. Lo normal es que
 * lleve su proceso por fuera; si va a hacer entrevistas, Landscape y Estrategia acá, se
 * marca y la plataforma lo sigue sola.
 */
export function NuevoCliente() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fase, setFase] = useState<FaseSistema>('taller')
  const [encargado, setEncargado] = useState('')
  const [enPlataforma, setEnPlataforma] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, porFuera: !enPlataforma, fase, ...(encargado.trim() ? { encargado } : {}) }),
    })
    setBusy(false)
    if (!res.ok) { setError(((await res.json()) as { error?: string }).error ?? 'No se pudo crear'); return }
    setAbierto(false); setNombre(''); setEncargado(''); setFase('taller'); setEnPlataforma(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto(true)} className={BOTON_PRIMARIO}>+ Nuevo cliente</button>
      {abierto && (
        <>
          <button type="button" aria-label="Cerrar" className="fixed inset-0 z-20 cursor-default bg-[rgba(21,18,12,.12)]" onClick={() => setAbierto(false)} />
          <form role="dialog" aria-label="Nuevo cliente" onSubmit={crear}
            className="fixed inset-x-4 top-24 z-30 mx-auto flex max-w-[400px] flex-col gap-3.5 rounded-[14px] border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(21,18,12,.14)] md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-[380px]">
            <p className="font-serif text-[20px] text-[var(--ink)]">Nuevo cliente</p>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-[var(--secundario)]">
              Nombre
              <input required autoFocus value={nombre} onChange={e => setNombre(e.target.value)} className={CAMPO} placeholder="Ej. Viajero" />
            </label>
            {!enPlataforma && (
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-[var(--secundario)]">
                ¿En qué fase va?
                <select value={fase} onChange={e => setFase(e.target.value as FaseSistema)} className={CAMPO}>
                  {FASES.map(f => <option key={f} value={f}>{FASE_LABEL[f]}</option>)}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-[var(--secundario)]">
              Encargado <span className="sr-only">(opcional)</span>
              <input value={encargado} onChange={e => setEncargado(e.target.value)} className={CAMPO} placeholder="Opcional" />
            </label>
            <label className="flex items-start gap-2.5 rounded-[8px] bg-[var(--papel)] p-3 text-[13px] leading-[1.45] text-[var(--cuerpo)]">
              <input type="checkbox" checked={enPlataforma} onChange={e => setEnPlataforma(e.target.checked)} className="mt-0.5 accent-[var(--ink)]" />
              <span>
                <span className="font-medium text-[var(--ink)]">Hace su proceso en la plataforma</span>
                <span className="block text-[12.5px] text-[var(--secundario)]">Entrevistas, Landscape y Estrategia con Claude. Si no, se lleva a mano, como en Notion.</span>
              </span>
            </label>
            {error && <p role="alert" className="text-[13px] text-[var(--error)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAbierto(false)} className={BOTON_SECUNDARIO}>Cancelar</button>
              <button disabled={busy} className={`${BOTON_PRIMARIO} disabled:opacity-50`}>{busy ? 'Creando…' : 'Crear cliente'}</button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
