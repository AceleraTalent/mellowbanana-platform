'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FASES, FASE_LABEL, ESTADO_CLIENTE_LABEL, estadoDelCliente,
  type EstadoCliente, type FaseSistema,
} from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CHIP, MARCA } from './chips'
import { guardar } from './TablaSistema'
import { EditorCliente } from './EditorCliente'
import { cuandoVence, encargadosConocidos, fechaCorta, personas } from './cliente'

/**
 * El Sistema M&B como tablero, igual que el Tráfico en Notion pero de arriba abajo: un
 * carril por fase, en el orden del proceso. Los carriles crecen hacia abajo, así una fase
 * con veinte clientes no aplasta a la que tiene cuatro ni obliga a desplazarse de lado.
 * Las tarjetas de los clientes por fuera se arrastran de un carril a otro; un clic abre el
 * cliente para editarlo. Los que hacen su proceso en la plataforma están en el carril que
 * les toca y no se arrastran: su fase sale de lo que de verdad se aprobó.
 */

type Carril = FaseSistema | 'terminado'
const CARRILES: Carril[] = [...FASES, 'terminado']
const TITULO: Record<Carril, string> = { ...FASE_LABEL, terminado: 'Terminado' }

const carrilDe = (f: FilaSistema): Carril => (f.sigue.quien === 'listo' ? 'terminado' : f.actual)
const estadoDe = (f: FilaSistema): EstadoCliente => estadoDelCliente(f.fases, f.actual, f.seguimiento.estadoManual)

/** Primero lo que espera al equipo y lo que está andando; lo quieto y lo terminado, al final. */
function prioridad(f: FilaSistema): number {
  if (!f.seguimiento.porFuera)
    return f.sigue.quien === 'revisar' || f.sigue.quien === 'equipo' ? 0 : f.sigue.quien === 'claude' ? 2 : f.sigue.quien === 'listo' ? 6 : 3
  return { en_curso: 1, cliente: 3, pausa: 4, sin_empezar: 5 }[estadoDe(f)]
}

function ordenar(a: FilaSistema, b: FilaSistema): number {
  const fa = a.seguimiento.fechaEntrega ?? '9999', fb = b.seguimiento.fechaEntrega ?? '9999'
  return prioridad(a) - prioridad(b) || fa.localeCompare(fb) || a.nombre.localeCompare(b.nombre)
}

function Estado({ fila }: { fila: FilaSistema }) {
  if (!fila.seguimiento.porFuera) {
    return (
      <span className="mt-2 flex min-w-0 items-baseline gap-2">
        <span className={`inline-flex flex-none rounded-[3px] px-[6px] py-[1px] text-[11.5px] font-semibold ${CHIP[fila.sigue.quien]}`}>{MARCA[fila.sigue.quien]}{fila.sigue.texto}</span>
        {fila.sigue.detalle && <span className="truncate text-[12.5px] text-[var(--secundario)]">{fila.sigue.detalle}</span>}
      </span>
    )
  }
  const e = estadoDe(fila)
  if (e === 'en_curso' || fila.sigue.quien === 'listo') return null
  const marca = {
    sin_empezar: <span className="h-[9px] w-[9px] rounded-full border border-dashed border-[var(--rotulo)]" />,
    cliente: <span className="h-[9px] w-[9px] rounded-full border-[1.5px] border-[var(--secundario)]" />,
    pausa: <span className="flex gap-[2px]"><span className="h-[9px] w-[2.5px] rounded-[1px] bg-[var(--secundario)]" /><span className="h-[9px] w-[2.5px] rounded-[1px] bg-[var(--secundario)]" /></span>,
  }[e]
  return <span className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[var(--secundario)]">{marca}{ESTADO_CLIENTE_LABEL[e]}</span>
}

function Personas({ encargado }: { encargado: string | null }) {
  const gente = personas(encargado)
  if (!gente.length) return <span className="text-[12px] text-[var(--rotulo)]">Sin asignar</span>
  const visibles = gente.slice(0, 3)
  return (
    <span className="flex items-center gap-1" title={gente.map(p => p.nombre).join(', ')}>
      <span className="sr-only">{gente.map(p => p.nombre).join(', ')}</span>
      {visibles.map(p => (
        <span key={p.nombre} aria-hidden="true"
          className="grid h-[24px] w-[24px] place-items-center rounded-full bg-[var(--papel-hondo)] text-[10px] font-semibold tracking-[.02em] text-[var(--ink)]">
          {p.iniciales}
        </span>
      ))}
      {gente.length > 3 && <span aria-hidden="true" className="ml-1 text-[11.5px] text-[var(--secundario)]">+{gente.length - 3}</span>}
    </span>
  )
}

function Tarjeta({ fila, onAbrir, onArrastrar }: { fila: FilaSistema; onAbrir: () => void; onArrastrar: (id: string | null) => void }) {
  const movible = fila.seguimiento.porFuera
  const fecha = fila.seguimiento.fechaEntrega
  const vence = fecha ? cuandoVence(fecha) : null
  return (
    <li
      draggable={movible}
      onDragStart={e => { e.dataTransfer.setData('text/plain', fila.id); e.dataTransfer.effectAllowed = 'move'; onArrastrar(fila.id) }}
      onDragEnd={() => onArrastrar(null)}
      aria-label={fila.nombre}
      className={movible ? 'cursor-grab active:cursor-grabbing' : ''}
    >
      <button type="button" onClick={onAbrir}
        className="flex h-full w-full flex-col rounded-[12px] border border-[var(--line)] bg-white p-3.5 text-left transition-[border-color,box-shadow] duration-150 hover:border-[#CFC9BB] hover:shadow-[0_3px_12px_rgba(21,18,12,.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]">
        <span className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{fila.nombre}</span>
        <Estado fila={fila} />
        {fila.seguimiento.notas && (
          <span className="mt-1.5 line-clamp-2 whitespace-pre-line text-[13px] leading-[1.45] text-[var(--secundario)]">{fila.seguimiento.notas}</span>
        )}
        <span className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Personas encargado={fila.seguimiento.encargado} />
          {fecha && vence && (
            <span title={vence.texto} className={`text-[12px] tabular-nums ${vence.vencida ? 'text-[var(--error)]' : 'text-[var(--secundario)]'}`}>
              {fechaCorta(fecha)}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

/** “12 en curso, 10 sin empezar, 1 esperando”: de un vistazo, cuánto se mueve en el carril. */
function desglose(filas: FilaSistema[]): string {
  const cuenta = new Map<string, number>()
  for (const f of filas) {
    const clave = !f.seguimiento.porFuera ? 'en la plataforma'
      : { en_curso: 'en curso', sin_empezar: 'sin empezar', cliente: 'esperando', pausa: 'en pausa' }[estadoDe(f)]
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
  }
  return ['en curso', 'en la plataforma', 'esperando', 'en pausa', 'sin empezar']
    .filter(k => cuenta.get(k)).map(k => `${cuenta.get(k)} ${k}`).join(', ')
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
    if (!fila?.seguimiento.porFuera || carril(fila) === a) return
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

  const arrastraMovible = !!arrastrado && !!porId.get(arrastrado)?.seguimiento.porFuera
  const filaAbierta = abierto ? porId.get(abierto) : undefined

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="text-[13.5px] text-[var(--error)]">{error}</p>}
      {CARRILES.map(c => {
        const tarjetas = filas.filter(f => carril(f) === c).sort(ordenar)
        const plegado = c === 'terminado' && !verTerminados && !arrastraMovible
        const destino = arrastraMovible && sobre === c
        return (
          <section key={c} aria-label={TITULO[c]}
            onDragOver={e => { if (!arrastraMovible) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setSobre(c) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(s => (s === c ? null : s)) }}
            onDrop={e => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); if (id) mover(id, c) }}
            className={`rounded-[18px] p-3 outline-offset-[-1px] transition-colors sm:p-4 lg:grid lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-5 ${
              destino ? 'bg-[var(--superficie)] outline-[1.5px] outline-dashed outline-[var(--ink)]' : 'bg-[#EFECE4]/70'
            }`}
          >
            <header className="flex items-baseline justify-between gap-3 px-1 pb-3 lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:pb-0 lg:pt-1">
              <h2 className="flex items-baseline gap-2">
                <span className="font-serif text-[19px] tracking-[-.01em] text-[var(--ink)]">{TITULO[c]}</span>
                <span className="text-[14px] tabular-nums text-[var(--rotulo)]">{tarjetas.length}</span>
              </h2>
              {tarjetas.length > 0 && !plegado && <p className="text-right text-[12.5px] leading-[1.45] text-[var(--secundario)] lg:text-left">{desglose(tarjetas)}</p>}
              {c === 'terminado' && tarjetas.length > 0 && (
                <button type="button" onClick={() => setVerTerminados(v => !v)}
                  className="text-[13px] text-[var(--secundario)] underline decoration-[var(--line)] underline-offset-[3px] hover:text-[var(--ink)] hover:decoration-[var(--ink)]">
                  {plegado ? 'Mostrar' : 'Ocultar'}
                </button>
              )}
            </header>

            {plegado ? null : tarjetas.length === 0 ? (
              <p className="grid min-h-[64px] place-items-center rounded-[12px] border border-dashed border-[#D6D1C4] px-4 text-center text-[13px] text-[var(--rotulo)]">
                {arrastraMovible ? `Suelta aquí para pasarlo a ${TITULO[c]}` : `Nadie en ${TITULO[c]}`}
              </p>
            ) : (
              <ul className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(196px,1fr))]">
                {tarjetas.map(f => <Tarjeta key={f.id} fila={f} onAbrir={() => setAbierto(f.id)} onArrastrar={setArrastrado} />)}
              </ul>
            )}
          </section>
        )
      })}
      {filaAbierta && <EditorCliente fila={filaAbierta} encargados={encargados} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}
