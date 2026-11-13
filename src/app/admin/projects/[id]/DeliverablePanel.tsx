'use client'
import { useState } from 'react'
import type { Deliverable, PartKey } from '@/lib/deliverable/schema'
import type { DeckView } from '@/lib/deck/view-model'
import { DeliverableDocument } from './DeliverableDocument'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/components/paso/piezas'

// El entregable se arma en 5 pasos encadenados (cada uno es 1 llamada al modelo, bajo el
// tope de tiempo del plan). El cliente los dispara en orden de dependencia; cada paso se
// guarda en el server, así el siguiente lee lo previo. Para el usuario es "un solo botón".
const STEPS: { key: PartKey; label: string }[] = [
  { key: 'personalidad', label: 'Personalidad' },
  { key: 'problema', label: 'Problema' },
  { key: 'competencia', label: 'Competencia' },
  { key: 'perfil', label: 'Perfil de usuario' },
  { key: 'propuestaValor', label: 'Propuesta de valor' },
]

export function DeliverablePanel({ projectId, view, deliverable, sessionsCount }: {
  projectId: string
  view: DeckView | null
  /** El contenido crudo del entregable: el editor trabaja sobre esto, no sobre el view. */
  deliverable: Deliverable | null
  /** Cuántas entrevistas alimentan el documento. La lista vive en la fase Entrevistas. */
  sessionsCount: number
}) {
  const [busy, setBusy] = useState<PartKey | 'full' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; label: string } | null>(null)

  async function postPart(part: PartKey) {
    const res = await fetch(`/api/projects/${projectId}/deliverable?part=${part}`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'error')
  }

  // Regenerar pisa lo que el equipo corrigió a mano: eso no puede pasar en silencio.
  const editadas = (parts: PartKey[]) => parts.filter(p => deliverable?.[p]?.meta?.editedAt)
  function confirmaPisarEdiciones(parts: PartKey[]): boolean {
    const conEdicion = editadas(parts)
    if (!conEdicion.length) return true
    return confirm('Hay ediciones hechas a mano en esta parte del documento. Regenerar las reemplaza por lo que escriba el modelo. ¿Seguir?')
  }

  // Regeneración de UNA parte (botón chico de la sección).
  async function generateOne(part: PartKey) {
    if (!confirmaPisarEdiciones([part])) return
    setBusy(part); setError(null)
    try { await postPart(part); location.reload() }
    catch (e) { setError(String(e)); setBusy(null) }
  }

  // Generar / Regenerar TODO: los 5 pasos en cadena con barra de progreso. Si uno falla,
  // lo ya generado queda guardado y el documento lo muestra con sus botones de reintento.
  async function generateAll() {
    if (!confirmaPisarEdiciones(STEPS.map(s => s.key))) return
    setBusy('full'); setError(null); setProgress({ done: 0, label: STEPS[0].label })
    try {
      for (let i = 0; i < STEPS.length; i++) {
        setProgress({ done: i, label: STEPS[i].label })
        await postPart(STEPS[i].key)
      }
      setProgress({ done: STEPS.length, label: 'Listo' })
    } finally {
      // El view-model se rearma en el server (corpus + citas verificadas): recargamos.
      location.reload()
    }
  }

  return <div className="max-w-[960px]">
    <EncabezadoPagina
      rotulo="Taller · Propuesta de valor"
      titulo="Propuesta de valor"
      bajada={sessionsCount === 0
        ? 'Todavía no hay entrevistas que la alimenten.'
        : `Se arma con ${sessionsCount} ${sessionsCount === 1 ? 'entrevista' : 'entrevistas'} del proyecto. Es lo que se lleva al taller.`}
    >
      {!!view && (
        <a href={`/api/projects/${projectId}/deck`} className={BOTON_SECUNDARIO}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
          PDF del taller
        </a>
      )}
      <button type="button" onClick={generateAll} disabled={busy !== null} className={`${BOTON_PRIMARIO} disabled:cursor-not-allowed`}>
        {busy === 'full' ? 'Generando…' : view ? 'Regenerar todo' : 'Generar la propuesta'}
      </button>
    </EncabezadoPagina>

    {busy === 'full' && progress && (
      <div className="mt-6 animate-fade" aria-live="polite">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-[var(--ink)]">Generando… <span className="font-normal text-[var(--secundario)]">{progress.label}</span></span>
          <span className="font-mono tabular-nums text-[var(--rotulo)]">{progress.done}/{STEPS.length}</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full bg-[var(--primario)] transition-[width] duration-500 ease-out"
            style={{ width: `${(progress.done / STEPS.length) * 100}%` }} />
        </div>
      </div>
    )}

    {error && (
      <p role="alert" ref={el => el?.scrollIntoView({ block: 'nearest' })}
        className="mt-6 animate-fade border-l-[1.5px] border-[var(--error)] pl-3 text-[14px] text-[var(--error)]">{error}</p>
    )}

    <div className="mt-14">
      {view
        ? <DeliverableDocument view={view} busy={busy} deliverable={deliverable} projectId={projectId} onRegenerate={generateOne} />
        : (
          <p className="rounded-[12px] border border-dashed border-[#CFC9BA] px-6 py-6 text-[14px] leading-[1.6] text-[var(--secundario)]">
            Todavía no hay propuesta. Genérala cuando las entrevistas estén completas.
          </p>
        )}
    </div>

    {/* La personalidad generada ya no se muestra acá: vive como borrador de Claude en la
        etapa Personalidad de Estrategia, con su circuito de aprobación. */}
  </div>
}
