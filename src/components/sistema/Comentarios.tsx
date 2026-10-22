'use client'

import { useEffect, useState } from 'react'
import { haceCuanto } from '@/lib/landscape/stages'
import { BOTON_SECUNDARIO } from '@/components/paso/piezas'
import { personas } from './cliente'

interface Comentario {
  id: string
  autor: string
  texto: string
  desde: 'panel' | 'claude'
  cuando: string | Date
}

const VISIBLES = 4

/**
 * La bitácora del cliente: lo que fue pasando, con quién lo dijo y cuándo. Se comenta acá o
 * desde Claude (comentar_cliente), y los dos lados ven lo mismo. Comentar no espera al
 * "Guardar" del formulario: un comentario se publica cuando se escribe, como en Notion.
 */
export function Comentarios({ projectId }: { projectId: string }) {
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [todos, setTodos] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/projects/${projectId}/comentarios`)
      .then(r => (r.ok ? r.json() : { comentarios: [] }))
      .then((d: { comentarios: Comentario[] }) => { if (vivo) setComentarios(d.comentarios) })
      .catch(() => { if (vivo) setComentarios([]) })
    return () => { vivo = false }
  }, [projectId])

  async function comentar() {
    if (!texto.trim()) return
    setEnviando(true); setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'No se pudo comentar')
      setComentarios(c => [d.comentario as Comentario, ...(c ?? [])])
      setTexto('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo comentar')
    } finally {
      setEnviando(false)
    }
  }

  const lista = comentarios ?? []
  const visibles = todos ? lista : lista.slice(0, VISIBLES)
  const ahora = new Date()

  return (
    <section aria-label="Comentarios" className="flex flex-col gap-3">
      <h3 className="flex items-baseline gap-2 text-[13px] font-medium text-[var(--secundario)]">
        Comentarios {lista.length > 0 && <span className="tabular-nums text-[var(--rotulo)]">{lista.length}</span>}
      </h3>

      <div className="flex items-end gap-2">
        <textarea
          aria-label="Nuevo comentario"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); comentar() } }}
          rows={1}
          maxLength={2000}
          placeholder="Qué pasó, qué se decidió, qué dijo el cliente"
          className="min-h-[44px] w-full resize-none rounded-[10px] border border-[var(--line)] bg-white px-3.5 py-2.5 text-[14.5px] leading-[1.45] text-[var(--ink)] outline-none transition-colors [field-sizing:content] placeholder:text-[var(--rotulo)] hover:border-[#CFC9BB] focus:border-[var(--ink)]"
        />
        <button type="button" onClick={comentar} disabled={enviando || !texto.trim()} className={`${BOTON_SECUNDARIO} flex-none disabled:opacity-40`}>
          {enviando ? 'Publicando…' : 'Comentar'}
        </button>
      </div>
      {error && <p role="alert" className="text-[13px] text-[var(--error)]">{error}</p>}

      {comentarios === null ? null : lista.length === 0 ? (
        <p className="text-[13px] text-[var(--rotulo)]">Todavía no hay comentarios. Desde Claude también se pueden dejar.</p>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {visibles.map(c => {
            const iniciales = personas(c.autor.replace(/\s*\(vía Claude\)$/, ''))[0]?.iniciales ?? '·'
            return (
              <li key={c.id} className="flex gap-3">
                <span aria-hidden="true"
                  className={`mt-0.5 grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[10px] font-semibold ${
                    c.desde === 'claude' && c.autor === 'Claude' ? 'bg-[var(--ink)] text-white' : 'bg-[var(--papel-hondo)] text-[var(--ink)]'
                  }`}>
                  {c.autor === 'Claude' ? 'C' : iniciales}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--secundario)]">
                    <span className="font-semibold text-[var(--ink)]">{c.autor}</span>{' '}
                    <span className="text-[var(--rotulo)]">{haceCuanto(new Date(c.cuando), ahora)}</span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-[14.5px] leading-[1.5] text-[var(--cuerpo)]">{c.texto}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {lista.length > VISIBLES && (
        <button type="button" onClick={() => setTodos(t => !t)}
          className="self-start text-[13px] text-[var(--secundario)] underline decoration-[var(--line)] underline-offset-[3px] hover:text-[var(--ink)] hover:decoration-[var(--ink)]">
          {todos ? 'Ver menos' : `Ver los ${lista.length} comentarios`}
        </button>
      )}
    </section>
  )
}
