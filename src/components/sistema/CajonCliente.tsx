'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { useCerrarConEscape } from '@/components/PanelMovil'
import { EditorCliente } from './EditorCliente'
import { bajadaDe, estadoDe, guardar } from './TablaSistema'
import { cuandoVence, fechaLarga, personas, valorCorto } from './cliente'
import { Avatar, Avatares, ChipEstado, ChipFase, FASE_ESTILO } from './fase'

type Destino = FaseSistema | 'terminado'
const LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'

/**
 * El resumen de un cliente, en un panel que entra por la derecha: se abre con un clic en
 * su tarjeta, su fila o su barra, sin salir del Pipeline. Desde acá se lo mueve de etapa,
 * se lo edita o se va a su proyecto completo.
 */
export function CajonCliente({ fila, encargados, onCerrar }: { fila: FilaSistema; encargados: string[]; onCerrar: () => void }) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useCerrarConEscape(onCerrar, !editando)

  const s = fila.seguimiento
  const terminado = fila.sigue.quien === 'listo'
  const destino: Destino = terminado ? 'terminado' : fila.actual
  const estado = estadoDe(fila)
  const gente = personas(s.encargado).map(p => p.nombre)
  const vence = s.fechaEntrega ? cuandoVence(s.fechaEntrega) : null
  const tareas = fila.tareas[fila.actual]
  const proximas = tareas.filter(t => !t.hecha).slice(0, 3)
  const hechas = tareas.filter(t => t.hecha).length

  async function mover(a: Destino) {
    if (a === destino) return
    setMoviendo(true); setError(null)
    try {
      await guardar(fila.id, { moverA: a })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mover')
    } finally {
      setMoviendo(false)
    }
  }

  const datos: { rotulo: string; valor: string; pie?: string; alerta?: boolean; icono: React.ReactNode }[] = [
    ...(fila.valorOculto ? [] : [{ rotulo: 'Valor', valor: s.valor !== null ? valorCorto(s.valor) : 'Sin anotar', icono: <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></> }]),
    { rotulo: 'Entrega', valor: s.fechaEntrega ? fechaLarga(s.fechaEntrega) : 'Sin fecha', pie: terminado ? undefined : vence?.texto, alerta: !terminado && vence?.vencida, icono: <><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></> },
    { rotulo: 'Inicio', valor: fechaLarga(fila.inicioIso), pie: s.fechaInicio ? undefined : 'Alta en la plataforma', icono: <><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></> },
    { rotulo: 'Tareas de la etapa', valor: tareas.length ? `${hechas} / ${tareas.length}` : '—', icono: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
  ]

  return (
    <>
      <div aria-hidden="true" onClick={onCerrar} className="animate-fade fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" />
      <aside role="dialog" aria-modal="true" aria-label={fila.nombre}
        className="panel animate-cajon fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l bg-white shadow-2xl sm:max-w-[460px]">
        <button type="button" onClick={onCerrar} aria-label="Cerrar"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="border-b px-7 pb-6 pt-7">
          <div className="flex items-center gap-3 pr-8">
            <Avatar nombre={fila.nombre} size={48} cuadrado />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight">{fila.nombre}</h2>
              <p className="line-clamp-2 text-sm text-muted-foreground">{bajadaDe(fila)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ChipFase fase={destino}>{terminado ? 'Terminado' : FASE_LABEL[fila.actual]}</ChipFase>
            <ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado>
            <span className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{s.porFuera ? 'Por fuera' : 'En la plataforma'}</span>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6 scroll-thin">
          <div>
            <div className="mb-2 flex items-baseline justify-between"><p className={LABEL}>Avance general</p><span className="tabular text-2xl font-extrabold">{terminado ? 100 : fila.avance}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all duration-700 ${FASE_ESTILO[destino].barra}`} style={{ width: `${terminado ? 100 : fila.avance}%` }} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {datos.map(d => (
              <div key={d.rotulo} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5">{d.icono}</svg>
                  <p className={LABEL}>{d.rotulo}</p>
                </div>
                <p className="mt-1 text-sm font-bold">{d.valor}</p>
                {d.pie && <p className={`text-xs ${d.alerta ? 'font-semibold text-rose-600' : 'text-muted-foreground'}`}>{d.pie}</p>}
              </div>
            ))}
          </div>

          <div>
            <p className={`${LABEL} mb-2`}>Responsable y equipo</p>
            {gente.length ? (
              <div className="flex items-center gap-3"><Avatares nombres={gente} size={28} /><span className="text-sm font-semibold">{gente.join(', ')}</span></div>
            ) : <p className="text-sm text-muted-foreground">Sin asignar</p>}
          </div>

          <div>
            <label htmlFor="cajon-mover" className={`${LABEL} mb-2 block`}>Mover de etapa</label>
            <select id="cajon-mover" value={destino} disabled={moviendo} onChange={e => mover(e.target.value as Destino)}
              className="h-10 w-full cursor-pointer rounded-lg border bg-white px-3 text-sm font-medium shadow-soft outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:cursor-wait disabled:opacity-60">
              {FASES.map((f, i) => <option key={f} value={f}>{String(i + 1).padStart(2, '0')} · {FASE_LABEL[f]}</option>)}
              <option value="terminado">{String(FASES.length + 1).padStart(2, '0')} · Terminado</option>
            </select>
            {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>

          <div>
            <p className={`${LABEL} mb-2`}>Próximas tareas</p>
            {proximas.length ? (
              <ul className="space-y-2">
                {proximas.map(t => <li key={t.id} className="flex items-center gap-2.5 text-sm"><span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full bg-primary/60" />{t.titulo}</li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{tareas.length ? 'Todas las tareas de esta etapa están hechas.' : 'Esta etapa todavía no tiene tareas.'}</p>}
          </div>

          {s.notas && (
            <div>
              <p className={`${LABEL} mb-2`}>Notas</p>
              <p className="whitespace-pre-line text-sm leading-relaxed">{s.notas}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 border-t p-5">
          <button type="button" onClick={() => setEditando(true)} className="inline-flex h-11 flex-none items-center justify-center rounded-lg border bg-white px-4 text-sm font-semibold shadow-soft transition hover:bg-muted">Editar</button>
          <Link href={fila.href} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-125">
            Ver proyecto completo
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </aside>
      {editando && <EditorCliente fila={fila} encargados={encargados} onCerrar={() => setEditando(false)} />}
    </>
  )
}
