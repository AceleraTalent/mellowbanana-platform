'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FaseSistema } from '@/lib/seguimiento/sistema'
import type { Tarea } from '@/lib/seguimiento/tareas'
import { Modal, CerrarModal } from '@/components/Modal'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/components/paso/piezas'
import { guardar } from '@/components/sistema/TablaSistema'
import { diasHasta, fechaCorta } from '@/components/sistema/cliente'
import { Avatar, FASE_ESTILO } from '@/components/sistema/fase'

const CAMPO = 'w-full rounded-[10px] border border-[var(--line)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--rotulo)] hover:border-[var(--apagado)] focus:border-[var(--primario)]'
const ETIQUETA = 'text-[13px] font-medium text-[var(--secundario)]'

/** El cuadro de la tarea: hecho (en el color de la etapa), por revisar o pendiente. */
function Marca({ tarea, fase }: { tarea: Tarea; fase: FaseSistema }) {
  if (tarea.hecha)
    return (
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-transparent text-white ${FASE_ESTILO[fase].barra}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    )
  if (tarea.porRevisar) return <span className="block h-5 w-5 shrink-0 rounded-md border-2 border-amber-400 bg-amber-50" />
  return <span className="block h-5 w-5 shrink-0 rounded-md border-2 border-slate-300" />
}

/** Responsable y fecha de una tarea, en un modal con su “Guardar”. */
function EditorTarea({ projectId, tarea, encargados, onCerrar }: { projectId: string; tarea: Tarea; encargados: string[]; onCerrar: () => void }) {
  const router = useRouter()
  const [responsable, setResponsable] = useState(tarea.responsable ?? '')
  const [fecha, setFecha] = useState(tarea.fecha ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idLista = useId()

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true); setError(null)
    try {
      await guardar(projectId, { tareas: { tipo: 'asignar', id: tarea.id, responsable: responsable.trim() || null, fecha: fecha || null } })
      router.refresh()
      onCerrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Asignar ${tarea.titulo}`} onCerrar={onCerrar} ancho={480}>
      <form onSubmit={enviar} className="flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <p className="rotulo">Tarea</p>
            <h2 className="mt-1 text-[20px] font-bold leading-snug text-[var(--ink)]">{tarea.titulo}</h2>
          </div>
          <CerrarModal onCerrar={onCerrar} />
        </div>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_180px] sm:px-7">
          <label className="flex flex-col gap-2">
            <span className={ETIQUETA}>Responsable</span>
            <input autoFocus value={responsable} onChange={e => setResponsable(e.target.value)} list={idLista} maxLength={80} placeholder="Quién la lleva" className={CAMPO} />
            <datalist id={idLista}>{encargados.map(n => <option key={n} value={n} />)}</datalist>
          </label>
          <label className="flex flex-col gap-2">
            <span className={ETIQUETA}>Fecha</span>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={CAMPO} />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--superficie)] px-5 py-4 sm:px-7">
          {error && <p role="alert" className="mr-auto text-[13px] text-[var(--error)]">{error}</p>}
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>Cancelar</button>
          <button disabled={guardando} className={`${BOTON_PRIMARIO} disabled:opacity-50`}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  )
}

/** La lista de una fase que se lleva a mano: una tarea por renglón. */
function EditorLista({ projectId, fase, nombreFase, tareas, onCerrar }: { projectId: string; fase: FaseSistema; nombreFase: string; tareas: Tarea[]; onCerrar: () => void }) {
  const router = useRouter()
  const [texto, setTexto] = useState(tareas.map(t => t.titulo).join('\n'))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    // Un renglón que ya estaba conserva su tarea (lo marcado y lo asignado); uno nuevo es una tarea nueva.
    const libres = [...tareas]
    const titulos = texto.split('\n').map(l => l.trim()).filter(Boolean).map(titulo => {
      const i = libres.findIndex(t => t.titulo === titulo)
      return i >= 0 ? { id: libres.splice(i, 1)[0].id, titulo } : { titulo }
    })
    setGuardando(true); setError(null)
    try {
      await guardar(projectId, { tareas: { tipo: 'lista', fase, titulos } })
      router.refresh()
      onCerrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Editar las tareas de ${nombreFase}`} onCerrar={onCerrar} ancho={520}>
      <form onSubmit={enviar} className="flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <p className="rotulo">{nombreFase}</p>
            <h2 className="mt-1 text-[20px] font-bold leading-snug text-[var(--ink)]">Tareas de la etapa</h2>
          </div>
          <CerrarModal onCerrar={onCerrar} />
        </div>
        <label className="flex flex-col gap-2 px-5 py-5 sm:px-7">
          <span className={ETIQUETA}>Una tarea por renglón, en el orden en que se hacen</span>
          <textarea autoFocus value={texto} onChange={e => setTexto(e.target.value)} rows={Math.max(6, tareas.length + 2)} className={`${CAMPO} resize-y leading-[1.7]`} />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--superficie)] px-5 py-4 sm:px-7">
          {error && <p role="alert" className="mr-auto text-[13px] text-[var(--error)]">{error}</p>}
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>Cancelar</button>
          <button disabled={guardando} className={`${BOTON_PRIMARIO} disabled:opacity-50`}>{guardando ? 'Guardando…' : 'Guardar lista'}</button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Las tareas de una etapa del proyecto. Las que son pasos de la plataforma se marcan solas
 * y llevan a donde se trabajan; las que el equipo lleva a mano se marcan con un clic en el
 * círculo. A cualquiera se le pone responsable y fecha.
 */
export function TareasDeEtapa({ projectId, fase, nombreFase, tareas, encargados }: {
  projectId: string
  fase: FaseSistema
  nombreFase: string
  tareas: Tarea[]
  encargados: string[]
}) {
  const router = useRouter()
  const [asignando, setAsignando] = useState<string | null>(null)
  const [editandoLista, setEditandoLista] = useState(false)
  // Lo marcado se ve al instante, sin esperar al servidor.
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const aMano = tareas.length === 0 || tareas.some(t => t.manual)
  const abierta = tareas.find(t => t.id === asignando)

  async function marcar(t: Tarea, hecha: boolean) {
    setMarcadas(m => ({ ...m, [t.id]: hecha })); setError(null)
    try {
      await guardar(projectId, { tareas: { tipo: 'marcar', id: t.id, hecha } })
      router.refresh()
    } catch (e) {
      setMarcadas(m => ({ ...m, [t.id]: !hecha }))
      setError(`No se pudo marcar “${t.titulo}”: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tareas</p>
        {aMano && (
          <button type="button" onClick={() => setEditandoLista(true)} className="text-[13px] font-medium text-[var(--primario)] hover:underline">Editar lista</button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] text-[var(--error)]">{error}</p>}

      {tareas.length === 0 ? (
        <p className="mt-3 rounded-[12px] border border-dashed border-[var(--apagado)] px-4 py-6 text-center text-[13.5px] text-[var(--secundario)]">Esta etapa no tiene tareas. Agrégalas con “Editar lista”.</p>
      ) : (
        <ul className="mt-2">
          {tareas.map(t => {
            const hecha = marcadas[t.id] ?? t.hecha
            const vista = { ...t, hecha }
            const atrasada = !hecha && t.fecha !== null && diasHasta(t.fecha) < 0
            return (
              <li key={t.id} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/60">
                {t.manual ? (
                  <button type="button" role="checkbox" aria-checked={hecha} aria-label={t.titulo} onClick={() => marcar(t, !hecha)}
                    className="flex-none rounded-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <Marca tarea={vista} fase={fase} />
                  </button>
                ) : (
                  <span className="flex-none" title={hecha ? 'Hecha' : t.porRevisar ? 'Por revisar' : 'Pendiente'}><Marca tarea={vista} fase={fase} /></span>
                )}
                <span className={`min-w-0 flex-1 text-sm font-medium ${hecha ? 'text-muted-foreground line-through' : ''}`}>
                  {t.href ? <Link href={t.href} className="hover:text-primary">{t.titulo}</Link> : t.titulo}
                  {t.porRevisar && !hecha && <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-px text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10">Por revisar</span>}
                </span>
                <button type="button" onClick={() => setAsignando(t.id)} aria-label={`Asignar ${t.titulo}`}
                  className="-my-1 flex flex-none items-center gap-3 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white">
                  {t.responsable ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Avatar nombre={t.responsable} size={20} />{t.responsable.split(' ')[0]}</span>
                  ) : !t.fecha && <span className="text-muted-foreground/70">Asignar</span>}
                  {t.fecha && <span className={`tabular w-14 text-right font-semibold ${atrasada ? 'text-rose-600' : 'text-muted-foreground'}`}>{fechaCorta(t.fecha)}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {abierta && <EditorTarea projectId={projectId} tarea={abierta} encargados={encargados} onCerrar={() => setAsignando(null)} />}
      {editandoLista && <EditorLista projectId={projectId} fase={fase} nombreFase={nombreFase} tareas={tareas.filter(t => t.manual)} onCerrar={() => setEditandoLista(false)} />}
    </div>
  )
}
