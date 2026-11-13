'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FASES, FASE_LABEL, ESTADO_CLIENTE_LABEL, estadoDelCliente,
  type EstadoCliente, type FaseSistema,
} from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { estadoDe, guardar } from './TablaSistema'
import { EditorCliente } from './EditorCliente'
import { diasHasta, encargadosConocidos, fechaCorta, personas, valorCorto } from './cliente'
import { Avatar, Avatares, ChipEstado, FASE_ESTILO, SelloFase } from './fase'

/**
 * El Pipeline como Kanban: una columna por fase, en el orden del proceso, y al final lo
 * terminado. Cualquier tarjeta se arrastra de una columna a otra, y un clic abre el
 * cliente para editarlo. En un cliente que hace su proceso en la plataforma, moverlo deja
 * la fase a mano (manda lo que dijo el equipo); desde el editor se vuelve a calcular con
 * lo aprobado.
 */

type Carril = FaseSistema | 'terminado'
const CARRILES: Carril[] = [...FASES, 'terminado']
const TITULO: Record<Carril, string> = { ...FASE_LABEL, terminado: 'Terminado' }

const carrilDe = (f: FilaSistema): Carril => (f.sigue.quien === 'listo' ? 'terminado' : f.actual)
const estadoCliente = (f: FilaSistema): EstadoCliente => estadoDelCliente(f.fases, f.actual, f.seguimiento.estadoManual)

/** Primero lo que espera al equipo y lo que está andando; lo quieto y lo terminado, al final. */
function prioridad(f: FilaSistema): number {
  if (!f.seguimiento.porFuera)
    return f.sigue.quien === 'revisar' || f.sigue.quien === 'equipo' ? 0 : f.sigue.quien === 'claude' ? 2 : f.sigue.quien === 'listo' ? 6 : 3
  return { en_curso: 1, cliente: 3, pausa: 4, sin_empezar: 5 }[estadoCliente(f)]
}

function ordenar(a: FilaSistema, b: FilaSistema): number {
  const fa = a.seguimiento.fechaEntrega ?? '9999', fb = b.seguimiento.fechaEntrega ?? '9999'
  return prioridad(a) - prioridad(b) || fa.localeCompare(fb) || a.nombre.localeCompare(b.nombre)
}

/** Cuánto falta para la entrega, corto: “38 d”, “Hoy”, “-4 d”. */
function Plazo({ fecha }: { fecha: string }) {
  const dias = diasHasta(fecha)
  return (
    <span title={`Entrega: ${fechaCorta(fecha)}${dias < 0 ? ` · ${-dias} días de retraso` : ''}`} className={`flex items-center gap-1 text-xs font-semibold ${dias < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5"><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></svg>
      {dias === 0 ? 'Hoy' : `${dias} d`}
    </span>
  )
}

function Tarjeta({ fila, carril, onAbrir, onArrastrar }: { fila: FilaSistema; carril: Carril; onAbrir: () => void; onArrastrar: (id: string | null) => void }) {
  const fecha = fila.seguimiento.fechaEntrega
  const gente = personas(fila.seguimiento.encargado).map(p => p.nombre)
  const fase = fila.fases.find(f => f.key === fila.actual)
  // Bajo el nombre, en qué anda: la nota del equipo o, en la plataforma, lo que sigue.
  const bajada = fila.seguimiento.notas ?? fila.sigue.detalle ?? (fila.seguimiento.porFuera || fila.sigue.quien === 'listo' ? undefined : fase?.detalle)
  const estado = estadoDe(fila)
  const e = estadoCliente(fila)
  // El chip de abajo: lo que espera a alguien. Por fuera y andando no hay nada que decir.
  const sigue = !fila.seguimiento.porFuera ? fila.sigue.texto
    : e === 'en_curso' || fila.sigue.quien === 'listo' ? null : ESTADO_CLIENTE_LABEL[e]
  return (
    <li
      draggable
      onDragStart={ev => { ev.dataTransfer.setData('text/plain', fila.id); ev.dataTransfer.effectAllowed = 'move'; onArrastrar(fila.id) }}
      onDragEnd={() => onArrastrar(null)}
      aria-label={fila.nombre}
    >
      <button type="button" onClick={onAbrir}
        className="block w-full cursor-grab rounded-2xl border border-border/70 bg-card p-3.5 text-left text-card-foreground shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift active:cursor-grabbing">
        <span className="flex items-start gap-2.5">
          <Avatar nombre={fila.nombre} size={32} cuadrado />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold leading-tight">{fila.nombre}</span>
            {bajada && <span className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs leading-snug text-muted-foreground">{bajada}</span>}
          </span>
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{fila.seguimiento.porFuera ? 'Por fuera' : 'En la plataforma'}</span>
          <ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado>
        </span>
        <span className="mt-3 flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className={`block h-full rounded-full transition-all duration-700 ${FASE_ESTILO[carril].barra}`} style={{ width: `${fila.avance}%` }} />
          </span>
          <span className="tabular text-xs font-semibold text-muted-foreground">{fila.avance}%</span>
        </span>
        <span className="mt-3 flex min-h-6 items-center justify-between">
          {gente.length ? <Avatares nombres={gente} size={24} /> : <span className="text-xs text-muted-foreground">Sin asignar</span>}
          {fecha ? <Plazo fecha={fecha} /> : <span className="text-xs text-muted-foreground">Sin fecha</span>}
        </span>
        {(sigue || (!fila.valorOculto && fila.seguimiento.valor !== null)) && (
          <span className="mt-3 flex items-center justify-between gap-2 border-t border-dashed pt-2.5">
            <span className="flex min-w-0 flex-wrap gap-1">
              {sigue && <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">{sigue}</span>}
            </span>
            {!fila.valorOculto && fila.seguimiento.valor !== null && <span className="tabular flex-none text-xs font-bold">{valorCorto(fila.seguimiento.valor)}</span>}
          </span>
        )}
      </button>
    </li>
  )
}

export function TableroSistema({ filas }: { filas: FilaSistema[] }) {
  const router = useRouter()
  // Lo movido se ve en su carril nuevo al soltarlo, sin esperar al servidor.
  const [movidos, setMovidos] = useState<Record<string, Carril>>({})
  const [arrastrado, setArrastrado] = useState<string | null>(null)
  const [sobre, setSobre] = useState<Carril | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [verTerminados, setVerTerminados] = useState(false)

  const porId = useMemo(() => new Map(filas.map(f => [f.id, f])), [filas])
  const encargados = useMemo(() => encargadosConocidos(filas.map(f => f.seguimiento.encargado)), [filas])
  const carril = (f: FilaSistema) => movidos[f.id] ?? carrilDe(f)

  async function mover(id: string, a: Carril) {
    const fila = porId.get(id)
    if (!fila || carril(fila) === a) return
    setMovidos(m => ({ ...m, [id]: a }))
    setError(null)
    try {
      await guardar(id, { moverA: a })
      router.refresh()
    } catch (e) {
      setMovidos(m => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id)))
      setError(`No se pudo mover ${fila.nombre}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  const arrastraMovible = !!arrastrado
  const filaAbierta = abierto ? porId.get(abierto) : undefined

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-[13.5px] text-[var(--error)]">{error}</p>}
      {/* `relative`: lo que va oculto para el lector de pantalla es absoluto, y sin esto se escapa del carril y ensancha la página. */}
      <div className="relative -mx-1 grid auto-cols-[minmax(256px,1fr)] grid-flow-col gap-4 overflow-x-auto px-1 pb-4 scroll-thin">
        {CARRILES.map((c, i) => {
          const tarjetas = filas.filter(f => carril(f) === c).sort(ordenar)
          const plegado = c === 'terminado' && !verTerminados && !arrastraMovible
          const destino = arrastraMovible && sobre === c
          return (
            <section key={c} aria-label={TITULO[c]}
              onDragOver={e => { if (!arrastraMovible) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setSobre(c) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(s => (s === c ? null : s)) }}
              onDrop={e => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); if (id) mover(id, c) }}
              className={`flex min-h-[520px] flex-col rounded-2xl border p-2.5 transition-colors ${destino ? 'border-primary/50 bg-primary-soft' : 'border-border/60 bg-slate-100/60'}`}
            >
              <header className="mb-2.5 flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                <SelloFase fase={c} />
                <h2 className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{TITULO[c]}</span>
                  <span aria-hidden="true" className="block font-mono text-[10px] font-semibold text-muted-foreground/70">{String(i + 1).padStart(2, '0')}</span>
                </h2>
                {c === 'terminado' && tarjetas.length > 0 && (
                  <button type="button" onClick={() => setVerTerminados(v => !v)} className="text-xs font-semibold text-primary hover:underline">{plegado ? 'Mostrar' : 'Ocultar'}</button>
                )}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold shadow-soft">{tarjetas.length}</span>
              </header>

              {plegado ? null : tarjetas.length === 0 ? (
                <p className="grid min-h-[84px] place-items-center rounded-xl border border-dashed px-4 text-center text-xs text-muted-foreground">
                  {arrastraMovible ? `Suelta aquí para pasarlo a ${TITULO[c]}` : `Nadie en ${TITULO[c]}`}
                </p>
              ) : (
                <ul className="flex flex-1 flex-col gap-2.5">
                  {tarjetas.map(f => <Tarjeta key={f.id} fila={f} carril={c} onAbrir={() => setAbierto(f.id)} onArrastrar={setArrastrado} />)}
                </ul>
              )}
            </section>
          )
        })}
      </div>
      {filaAbierta && <EditorCliente fila={filaAbierta} encargados={encargados} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}
