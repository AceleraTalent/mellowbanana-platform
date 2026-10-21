import { db } from '@/lib/db/client'
import { getSessionWithAnswers } from '@/lib/db/store'
import { ensureNormalized } from '@/lib/normalize/service'
import { menuDelProyecto } from '@/lib/pipeline/menu-proyecto'
import { SCRIPT } from '@/lib/script/questions'
import { AdminShell } from '@/components/AdminShell'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'
import { ProjectIndex } from '@/components/ProjectIndex'
import { BOTON_SECUNDARIO } from '@/components/paso/piezas'

export const dynamic = 'force-dynamic'
const promptOf = (qid: string) => SCRIPT.flatMap(s => s.questions).find(q => q.id === qid)?.prompt ?? qid

type Answer = { id: string; questionId: string; rawText: string; normalizedText?: string | null; imageChoice?: string | null }

/** Lo que respondió una persona, pregunta por pregunta. Se abre desde Entrevistas. */
export default async function Detail({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const full = await getSessionWithAnswers(db, sessionId)
  if (!full) return (
    <AdminShell>
      <p className="pt-16 text-center text-[15px] text-[var(--secundario)]">No encontrado.</p>
    </AdminShell>
  )
  await ensureNormalized(db, sessionId)
  const fresh = await getSessionWithAnswers(db, sessionId)
  // Con proyecto, el menú es el del proyecto, parado en Entrevistas: de ahí se llegó.
  const menu = full.projectId ? await menuDelProyecto(db, full.projectId, 'entrevistas') : null

  return (
    <AdminShell
      activeProjectId={full.projectId ?? undefined}
      indice={menu && full.projectId
        ? <ProjectIndex projectId={full.projectId} nombre={menu.nombre} subtitulo={menu.subtitulo} fases={menu.indice} />
        : undefined}
    >
      <div className="max-w-[860px]">
        <EncabezadoPagina
          rotulo={full.projectId
            ? <a href={`/admin/projects/${full.projectId}/entrevistas`} className="hover:text-[var(--ink)] hover:underline">← Entrevistas</a>
            : 'Entrevista'}
          titulo={full.name ?? 'Sin nombre'}
          bajada={[full.role, full.company].filter(Boolean).join(' · ') || undefined}
        >
          <a href={`/api/sessions/${sessionId}/pdf`} className={BOTON_SECUNDARIO}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Descargar PDF
          </a>
        </EncabezadoPagina>

        <dl className="mt-10 divide-y divide-[var(--line)] border-t border-[var(--ink)]">
          {(fresh!.answers as Answer[]).map(a => (
            <div key={a.id} className="py-4">
              <dt className="font-mono text-[11px] uppercase tracking-[.1em] text-[var(--rotulo)]">{promptOf(a.questionId)}</dt>
              <dd className="mt-1.5 text-[15.5px] leading-[1.6] text-[var(--cuerpo)]">
                {a.normalizedText ?? a.rawText}{a.imageChoice ? ` (${a.imageChoice})` : ''}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </AdminShell>
  )
}
