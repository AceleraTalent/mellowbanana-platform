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
import { diasHasta, encargadosConocidos, fechaCorta, personas } from './cliente'
import { Avatar, Avatares, FASE_CLASE, SelloFase } from './fase'

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
    return <span className={`inline-flex flex-none self-start rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${CHIP[fila.sigue.quien]}`}>{MARCA[fila.sigue.quien]}{fila.sigue.texto}</span>
  }
  const e = estadoDe(fila)
  if (e === 'en_curso' || fila.sigue.quien === 'listo') return null
  return (
    <span className={`inline-flex flex-none self-start rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${e === 'pausa' ? CHIP.pausa : CHIP.cliente}`}>
      {e === 'pausa' ? MARCA.pausa : e === 'cliente' ? MARCA.cliente : ''}{ESTADO_CLIENTE_LABEL[e]}
    </span>
  )
}

/** Cuánto falta para la entrega, corto: “38 d”, “Hoy”, “4 d de retraso”. */
function Plazo({ fecha }: { fecha: string }) {
  const dias = diasHasta(fecha)
  const texto = dias === 0 ? 'Hoy' : dias > 0 ? `${dias} d` : `${-dias} d de retraso`
  return (
    <span title={`Entrega: ${fechaCorta(fecha)}`} className={`flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums ${dias < 0 ? 'text-[var(--error)]' : 'text-[var(--secundario)]'}`}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      {texto}
    </span>
  )
}

function Tarjeta({ fila, carril, onAbrir, onArrastrar }: { fila: FilaSistema; carril: Carril; onAbrir: () => void; onArrastrar: (id: string | null) => void }) {
  const fecha = fila.seguimiento.fechaEntrega
  const gente = personas(fila.seguimiento.encargado).map(p => p.nombre)
  const fase = fila.fases.find(f => f.key === fila.actual)
  // En la plataforma, la línea de abajo dice qué sigue puntualmente. Por fuera no hay nada
  // que agregar: “En curso” repetido en cada tarjeta es ruido.
  const bajada = fila.sigue.detalle ?? (fila.seguimiento.porFuera || fila.sigue.quien === 'listo' ? undefined : fase?.detalle)
  return (
    <li
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', fila.id); e.dataTransfer.effectAllowed = 'move'; onArrastrar(fila.id) }}
      onDragEnd={() => onArrastrar(null)}
      aria-label={fila.nombre}
      className="cursor-grab active:cursor-grabbing"
    >
      <button type="button" onClick={onAbrir}
        className={`${FASE_CLASE[carril]} tarjeta flex w-full flex-col gap-3 p-4 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--f)_45%,var(--line))] hover:shadow-[0_8px_24px_rgba(16,24,40,.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primario)]`}>
        <span className="flex items-start gap-3">
          <Avatar nombre={fila.nombre} size={38} cuadrado />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold leading-snug text-[var(--ink)]">{fila.nombre}</span>
            {bajada && <span className="mt-0.5 line-clamp-2 text-[13px] leading-[1.4] text-[var(--secundario)]">{bajada}</span>}
          </span>
        </span>
        <Estado fila={fila} />
        <span className="flex items-center gap-3">
          <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--superficie)]">
            <span className="block h-full rounded-full bg-[var(--f)]" style={{ width: `${fila.avance}%` }} />
          </span>
          <span className="w-9 flex-none text-right text-[12.5px] font-medium tabular-nums text-[var(--secundario)]">{fila.avance}%</span>
        </span>
        <span className="flex min-h-[26px] items-center justify-between gap-2">
          {gente.length ? <Avatares nombres={gente} /> : <span className="text-[12.5px] text-[var(--rotulo)]">Sin asignar</span>}
          {fecha && <Plazo fecha={fecha} />}
        </span>
        {fila.seguimiento.notas && (
          <span className="line-clamp-2 whitespace-pre-line border-t border-dashed border-[var(--line)] pt-3 text-[13px] leading-[1.45] text-[var(--secundario)]">{fila.seguimiento.notas}</span>
        )}
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
      <div className="relative -mx-4 flex items-start gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        {CARRILES.map((c, i) => {
          const tarjetas = filas.filter(f => carril(f) === c).sort(ordenar)
          const plegado = c === 'terminado' && !verTerminados && !arrastraMovible
          const destino = arrastraMovible && sobre === c
          return (
            <section key={c} aria-label={TITULO[c]}
              onDragOver={e => { if (!arrastraMovible) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setSobre(c) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(s => (s === c ? null : s)) }}
              onDrop={e => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); if (id) mover(id, c) }}
              className={`${FASE_CLASE[c]} flex w-[292px] flex-none flex-col rounded-[20px] border p-3 transition-colors ${
                destino ? 'border-dashed border-[var(--f)] bg-[var(--f-suave)]' : 'border-[var(--line)] bg-white/60'
              }`}
            >
              <header className="px-1 pb-3 pt-1">
                <div className="flex items-center gap-3">
                  <SelloFase fase={c} />
                  <h2 className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[15px] font-bold text-[var(--ink)]">{TITULO[c]}</span>
                    <span aria-hidden="true" className="block text-[11px] font-semibold tabular-nums tracking-[.08em] text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>
                  </h2>
                  <span className="grid h-[26px] min-w-[26px] flex-none place-items-center rounded-full border border-[var(--line)] bg-white px-1.5 text-[12.5px] font-semibold tabular-nums text-[var(--ink)]">{tarjetas.length}</span>
                </div>
                {tarjetas.length > 0 && !plegado && <p className="mt-2.5 text-[12.5px] leading-[1.4] text-[var(--secundario)]">{desglose(tarjetas)}</p>}
                {c === 'terminado' && tarjetas.length > 0 && (
                  <button type="button" onClick={() => setVerTerminados(v => !v)}
                    className="mt-2 text-[13px] font-medium text-[var(--primario)] hover:underline">
                    {plegado ? 'Mostrar' : 'Ocultar'}
                  </button>
                )}
              </header>

              {plegado ? null : tarjetas.length === 0 ? (
                <p className="grid min-h-[84px] place-items-center rounded-[14px] border border-dashed border-[var(--apagado)] px-4 text-center text-[13px] text-[var(--rotulo)]">
                  {arrastraMovible ? `Suelta aquí para pasarlo a ${TITULO[c]}` : `Nadie en ${TITULO[c]}`}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
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
