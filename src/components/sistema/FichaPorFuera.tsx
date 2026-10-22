'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EstadoManual } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { Editable, Entrega, FaseActualPorFuera, guardar, opcion } from './TablaSistema'

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] py-5 sm:grid sm:grid-cols-[160px_1fr] sm:gap-6">
      <h2 className="pb-2 font-mono text-[11px] font-bold uppercase tracking-[.14em] text-[var(--rotulo)] sm:pt-1.5">{titulo}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/**
 * La ficha de un cliente que lleva su proceso por fuera: lo mismo que su tarjeta en el
 * tablero, abierto y editable. No hay entrevistas, Landscape ni Estrategia que mostrar;
 * lo que el equipo necesita es en qué va, quién lo lleva, para cuándo y qué falta.
 */
export function FichaPorFuera({ fila }: { fila: FilaSistema }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const refrescar = () => router.refresh()

  async function cambiar(cambios: Record<string, unknown>) {
    try {
      await guardar(fila.id, cambios)
      setError(null)
      refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  return (
    <div className="mt-8">
      {error && <p role="alert" className="mb-4 text-[13.5px] text-[var(--error)]">{error}</p>}
      <Campo titulo="En qué va">
        <div className="max-w-[420px]"><FaseActualPorFuera fila={fila} cambiar={cambiar} /></div>
      </Campo>
      <Campo titulo="¿Está frenado?">
        <div className="flex max-w-[420px] gap-1" role="radiogroup" aria-label="Frenado">
          {([[null, 'No'], ['cliente', 'Esperando al cliente'], ['pausa', 'En pausa']] as const).map(([v, l]) => (
            <button key={l} type="button" role="radio" aria-checked={fila.seguimiento.estadoManual === v}
              onClick={() => cambiar({ estadoManual: v as EstadoManual | null })} className={opcion(fila.seguimiento.estadoManual === v)}>
              {l}
            </button>
          ))}
        </div>
      </Campo>
      <Campo titulo="Encargado">
        <div className="-mx-2 max-w-[420px]">
          <Editable etiqueta={`Encargado de ${fila.nombre}`} valor={fila.seguimiento.encargado} placeholder="Asignar"
            onGuardar={async v => { await guardar(fila.id, { encargado: v }); refrescar() }} />
        </div>
      </Campo>
      <Campo titulo="Entrega">
        <div className="-mx-2 max-w-[220px]"><Entrega fila={fila} onCambio={refrescar} /></div>
      </Campo>
      <Campo titulo="Notas">
        <div className="-mx-2">
          <Editable etiqueta={`Notas de ${fila.nombre}`} valor={fila.seguimiento.notas} placeholder="Qué falta, qué se acordó" multilinea
            onGuardar={async v => { await guardar(fila.id, { notas: v }); refrescar() }} />
        </div>
      </Campo>
      <Campo titulo="Proceso">
        <p className="text-[14.5px] leading-[1.55] text-[var(--cuerpo)]">
          Lleva su proceso por fuera de la plataforma: sus fases se mueven a mano, como en Notion.
        </p>
        <button type="button" onClick={() => cambiar({ porFuera: false })}
          className="mt-2 text-[13.5px] text-[var(--secundario)] underline underline-offset-2 hover:text-[var(--ink)]">
          Pasarlo a la plataforma (entrevistas, Landscape y Estrategia con Claude)
        </button>
      </Campo>
    </div>
  )
}
