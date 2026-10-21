'use client'

import Link from 'next/link'
import { BOTON_SECUNDARIO } from '@/components/paso/piezas'

export interface Respondent {
  id: string
  name: string
  role: string
  company: string
  completa: boolean
  fecha: string
  respuestas: number
}

function Estado({ completa }: { completa: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium
      ${completa ? 'bg-[var(--aprobado)] text-[var(--ink)]' : 'bg-[var(--superficie)] text-[var(--secundario)]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${completa ? 'bg-[var(--banana)]' : 'border border-[var(--apagado)]'}`} aria-hidden="true" />
      {completa ? 'Completa' : 'En curso'}
    </span>
  )
}

/**
 * La lista de entrevistas del proyecto. Cada una se abre para leerla entera:
 * es el lugar donde vive lo que dijo cada persona, separado del documento que se
 * genera después.
 */
export function RespondentsList({ projectId, respondents, projects }: {
  projectId: string
  respondents: Respondent[]
  projects: { id: string; name: string }[]
}) {
  async function reassign(sessionId: string, newProjectId: string) {
    if (!newProjectId || newProjectId === projectId) return
    // El reload solo cuando el servidor confirmó la escritura: recargar tras un fallo
    // silencioso mostraba la lista vieja como si el movimiento hubiera pasado.
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: newProjectId }),
    }).catch(() => null)
    if (!res?.ok) {
      alert('No se pudo mover la entrevista. Prueba de nuevo.')
      return
    }
    location.reload()
  }

  if (respondents.length === 0) {
    return (
      <section className="p-10 text-center">
        <p className="text-[15px] text-[var(--secundario)]">
          Todavía no hay entrevistas en este proyecto. Cuando alguien responda, aparece acá para leerla.
        </p>
      </section>
    )
  }

  return (
    <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {respondents.map(r => (
        <li key={r.id}>
          <div className="group flex flex-wrap items-center gap-x-4 gap-y-3 py-4 transition-colors duration-200 hover:bg-[var(--superficie)]">
            <Link href={`/admin/${r.id}`} className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-[15px] font-semibold text-[var(--ink)]">{r.name}</span>
                <Estado completa={r.completa} />
              </span>
              <span className="mt-1 block text-[13px] text-[var(--secundario)]">
                {r.role}
                {r.company ? ` · ${r.company}` : ''}
                <span className="text-[var(--apagado)]"> · </span>
                {r.respuestas} {r.respuestas === 1 ? 'respuesta' : 'respuestas'}
                {r.fecha ? <span className="text-[var(--rotulo)]"> · {r.fecha}</span> : null}
              </span>
            </Link>

            <div className="flex flex-none items-center gap-2">
              <Link
                href={`/admin/${r.id}`}
                className={BOTON_SECUNDARIO}
              >
                Leer
              </Link>
              <a
                href={`/api/sessions/${r.id}/pdf`}
                target="_blank"
                rel="noopener"
                title="Descargar PDF"
                aria-label={`Descargar el PDF de la entrevista de ${r.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[var(--line)] bg-white text-[var(--secundario)] transition-colors duration-200 hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                </svg>
              </a>
              <select
                defaultValue=""
                onChange={e => reassign(r.id, e.target.value)}
                aria-label={`Mover la entrevista de ${r.name} a otro proyecto`}
                className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1.5 text-[12.5px] text-[var(--secundario)] outline-none transition focus:border-[var(--ink)]"
              >
                <option value="">mover a…</option>
                {projects.filter(p => p.id !== projectId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
