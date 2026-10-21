'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BOTON_PRIMARIO } from '@/components/paso/piezas'

/**
 * Lo que volvió del taller en Miro, pegado tal cual. Es opcional: si está, Claude lo lee
 * al trabajar el Landscape y la Estrategia; si no, Claude lo pide en el chat cuando hace
 * falta. También lo puede guardar Claude, si el equipo le pasa el documento del taller.
 */
export function ConclusionesTaller({ projectId, inicial }: { projectId: string; inicial: string | null }) {
  const router = useRouter()
  const [texto, setTexto] = useState(inicial ?? '')
  const [guardado, setGuardado] = useState(inicial ?? '')
  const [estado, setEstado] = useState<'quieto' | 'guardando' | 'listo' | 'error'>('quieto')
  const cambio = texto.trim() !== guardado.trim()

  async function guardar() {
    setEstado('guardando')
    const res = await fetch(`/api/projects/${projectId}/seguimiento`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conclusionesTaller: texto }),
    }).catch(() => null)
    if (!res?.ok) { setEstado('error'); return }
    setGuardado(texto)
    setEstado('listo')
    router.refresh()
  }

  return (
    <div className="mt-8 max-w-[680px] border-t border-[var(--line)] pt-5">
      <label htmlFor="conclusiones" className="text-[14px] font-semibold text-[var(--ink)]">
        Conclusiones del taller <span className="font-normal text-[var(--secundario)]">(opcional)</span>
      </label>
      <p className="mt-1 text-[13px] leading-[1.55] text-[var(--secundario)]">
        Pega lo que salió del Miro: los 4 competidores principales, la propuesta ajustada, lo que haya quedado
        decidido. Claude lo tiene en cuenta en el Landscape y la Estrategia. Si no lo pegas, Claude lo pide en el
        chat cuando lo necesite, o se lo puedes pasar ahí mismo para que lo guarde.
      </p>
      <textarea
        id="conclusiones"
        value={texto}
        onChange={e => { setTexto(e.target.value); setEstado('quieto') }}
        rows={8}
        className="mt-3 w-full rounded-[10px] border border-[var(--line)] bg-white px-4 py-3 text-[14px] leading-[1.6] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
        placeholder={'Competidores principales: …\nPropuesta de valor ajustada: …'}
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={!cambio || estado === 'guardando'} className={`${BOTON_PRIMARIO} disabled:cursor-not-allowed`}>
          {estado === 'guardando' ? 'Guardando…' : 'Guardar'}
        </button>
        <p role="status" className="text-[13px] text-[var(--secundario)]">
          {estado === 'listo' ? '✓ Guardado. Claude ya lo puede leer.' : estado === 'error' ? 'No se pudo guardar. Prueba de nuevo.' : cambio ? 'Sin guardar.' : ''}
        </p>
      </div>
    </div>
  )
}
