'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { EstadoFase } from '@/lib/seguimiento/sistema'

// “Listo” y no “Terminado”: es lo que dice el menú a la derecha de una fase cerrada.
const ETIQUETA: Record<EstadoFase, string> = { pendiente: 'Sin empezar', en_curso: 'En curso', completa: 'Listo' }

/**
 * Lo que la plataforma no ve y el equipo marca a mano: en qué va el Naming o el Diseño, o
 * si el taller en Miro ya se hizo. Guarda en el mismo seguimiento que edita el inicio, así
 * que lo que se marca acá aparece en el Sistema M&B y al revés.
 */
export function FaseManual({ projectId, fase, label, estado }: {
  projectId: string
  fase: 'taller' | 'naming' | 'diseno'
  label: string
  estado: EstadoFase
}) {
  const router = useRouter()
  // El taller se calcula solo hasta el final: lo único manual es cerrarlo.
  const opciones: EstadoFase[] = fase === 'taller' ? ['en_curso', 'completa'] : ['pendiente', 'en_curso', 'completa']
  const [valor, setValor] = useState<EstadoFase>(fase === 'taller' && estado !== 'completa' ? 'en_curso' : estado)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function elegir(nuevo: EstadoFase) {
    if (nuevo === valor || ocupado) return
    const antes = valor
    setValor(nuevo)
    setOcupado(true)
    const res = await fetch(`/api/projects/${projectId}/seguimiento`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fase: { key: fase, estado: nuevo } }),
    }).catch(() => null)
    setOcupado(false)
    if (!res?.ok) {
      setValor(antes)
      setError('No se pudo guardar. Prueba de nuevo.')
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label={`En qué va ${label}`}>
        {opciones.map(o => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={valor === o}
            disabled={ocupado}
            onClick={() => void elegir(o)}
            className={`flex-auto whitespace-nowrap rounded-[7px] border px-2 py-1 text-[12px] transition-colors duration-150 disabled:cursor-wait ${
              valor === o
                ? 'border-[var(--ink)] bg-[var(--primario)] text-white'
                : 'border-[var(--line)] bg-white text-[var(--secundario)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
            }`}
          >
            {fase === 'taller' ? (o === 'completa' ? 'Taller hecho' : 'Todavía no') : ETIQUETA[o]}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[12px] leading-snug text-[var(--error)]">{error}</p>}
    </div>
  )
}
