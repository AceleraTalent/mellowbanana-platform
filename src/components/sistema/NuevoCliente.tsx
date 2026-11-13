'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/components/paso/piezas'
import { CerrarModal, Modal } from '@/components/Modal'

const CAMPO = 'w-full rounded-[10px] border border-[var(--line)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--rotulo)] hover:border-[var(--apagado)] focus:border-[var(--ink)]'
const ETIQUETA = 'text-[13px] font-medium text-[var(--secundario)]'

/**
 * Agregar un cliente desde el panel, como una tarjeta nueva en Notion. Lo normal es que
 * lleve su proceso por fuera; si va a hacer entrevistas, Landscape y Estrategia acá, se
 * marca y la plataforma lo sigue sola.
 */
export function NuevoCliente({ encargados = [] }: { encargados?: string[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fase, setFase] = useState<FaseSistema>('taller')
  const [encargado, setEncargado] = useState('')
  const [enPlataforma, setEnPlataforma] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cerrar() {
    setAbierto(false); setError(null)
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, porFuera: !enPlataforma, fase, ...(encargado.trim() ? { encargado } : {}) }),
    })
    setBusy(false)
    if (!res.ok) { setError(((await res.json()) as { error?: string }).error ?? 'No se pudo crear el cliente'); return }
    setNombre(''); setEncargado(''); setFase('taller'); setEnPlataforma(false)
    cerrar()
    router.refresh()
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={BOTON_PRIMARIO}>Nuevo cliente</button>
      {abierto && (
        <Modal titulo="Nuevo cliente" onCerrar={cerrar} ancho={480}>
          <form onSubmit={crear} className="flex flex-col">
            <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
              <h2 className="font-serif text-[26px] leading-[1.15] tracking-[-.02em] text-[var(--ink)]">Nuevo cliente</h2>
              <CerrarModal onCerrar={cerrar} />
            </div>
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-7">
              <label className="flex flex-col gap-2">
                <span className={ETIQUETA}>Nombre</span>
                <input required autoFocus value={nombre} onChange={e => setNombre(e.target.value)} maxLength={120} className={CAMPO} placeholder="Como lo llama el estudio" />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={ETIQUETA}>Fase en la que va</span>
                  <select value={fase} onChange={e => setFase(e.target.value as FaseSistema)} disabled={enPlataforma} className={`${CAMPO} disabled:opacity-50`}>
                    {FASES.map(f => <option key={f} value={f}>{FASE_LABEL[f]}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className={ETIQUETA}>Encargado</span>
                  <input value={encargado} onChange={e => setEncargado(e.target.value)} list="encargados-nuevo" maxLength={80} className={CAMPO} placeholder="Opcional" />
                  <datalist id="encargados-nuevo">{encargados.map(n => <option key={n} value={n} />)}</datalist>
                </label>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--line)] p-3.5 transition-colors hover:border-[var(--apagado)]">
                <input type="checkbox" checked={enPlataforma} onChange={e => setEnPlataforma(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--ink)]" />
                <span>
                  <span className="block text-[14px] font-medium text-[var(--ink)]">Hace su proceso en la plataforma</span>
                  <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--secundario)]">
                    Entrevistas, Landscape y Estrategia con Claude, y la fase avanza sola. Si no, se lleva a mano, como en Notion.
                  </span>
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--superficie)] px-5 py-4 sm:px-7">
              {error && <p role="alert" className="mr-auto text-[13px] text-[var(--error)]">{error}</p>}
              <button type="button" onClick={cerrar} className={BOTON_SECUNDARIO}>Cancelar</button>
              <button disabled={busy} className={`${BOTON_PRIMARIO} disabled:opacity-50`}>{busy ? 'Creando…' : 'Crear cliente'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
