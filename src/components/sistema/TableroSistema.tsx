'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CHIP, MARCA } from './chips'
import { URGENCIA, faltan, guardar } from './TablaSistema'

/**
 * El Sistema M&B como tablero, igual que el Tráfico en Notion: una columna por fase y una
 * tarjeta por cliente. Las tarjetas de los clientes por fuera se arrastran de una fase a
 * otra (o se mueven con su menú, en el celular o con teclado). Las de los clientes que
 * hacen su proceso en la plataforma están en la columna que les toca y no se arrastran:
 * su fase sale de lo que de verdad pasó.
 */

type Columna = FaseSistema | 'terminado'
const COLUMNAS: Columna[] = [...FASES, 'terminado']
const TITULO: Record<Columna, string> = { ...FASE_LABEL, terminado: 'Terminado' }

const columnaDe = (f: FilaSistema): Columna => (f.sigue.quien === 'listo' ? 'terminado' : f.actual)

function Tarjeta({ fila, columna, onMover, arrastrando }: {
  fila: FilaSistema
  columna: Columna
  onMover: (id: string, a: Columna) => void
  arrastrando: (id: string | null) => void
}) {
  const movible = fila.seguimiento.porFuera
  const entrega = fila.seguimiento.fechaEntrega ? faltan(fila.seguimiento.fechaEntrega, new Date()) : null
  // Por fuera, la columna ya dice la fase: el chip sólo aparece si hay algo que decir,
  // como el Status de Notion (sin empezar, esperando al cliente, en pausa).
  const sinEmpezar = fila.fases.find(f => f.key === fila.actual)?.estado === 'pendiente'
  const chip = !movible ? { quien: fila.sigue.quien, texto: fila.sigue.texto }
    : fila.sigue.quien === 'fuera' ? (sinEmpezar ? { quien: 'pausa' as const, texto: 'Sin empezar' } : null)
    : columna === 'terminado' ? null
    : { quien: fila.sigue.quien, texto: fila.sigue.texto }
  return (
    <li
      draggable={movible}
      onDragStart={e => { e.dataTransfer.setData('text/plain', fila.id); e.dataTransfer.effectAllowed = 'move'; arrastrando(fila.id) }}
      onDragEnd={() => arrastrando(null)}
      aria-label={fila.nombre}
      className={`rounded-[10px] border border-[var(--line)] bg-white p-3.5 ${movible ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <Link href={fila.href} className="font-serif text-[16px] leading-tight tracking-[-.01em] text-[var(--ink)] hover:underline">{fila.nombre}</Link>
      {chip && (
        <p className="mt-2">
          <span className={`inline-flex rounded-[3px] px-[6px] py-[1px] text-[11.5px] font-semibold ${CHIP[chip.quien]}`}>{chip.texto === 'Sin empezar' ? '' : MARCA[chip.quien]}{chip.texto}</span>
        </p>
      )}
      {!movible && fila.sigue.detalle && <p className="mt-1.5 text-[13px] leading-[1.4] text-[var(--cuerpo)]">{fila.sigue.detalle}</p>}
      {fila.seguimiento.notas && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[13px] leading-[1.45] text-[var(--cuerpo)]">{fila.seguimiento.notas}</p>}
      {(fila.seguimiento.encargado || entrega) && (
        <p className="mt-2.5 flex flex-wrap gap-x-2.5 text-[12px] text-[var(--secundario)]">
          {fila.seguimiento.encargado && <span>{fila.seguimiento.encargado}</span>}
          {entrega && <span className={entrega.vencida ? 'text-[var(--error)]' : ''}>{entrega.texto}</span>}
        </p>
      )}
      {movible && (
        <label className="mt-3 flex items-center gap-1.5 border-t border-[var(--line)] pt-2.5 text-[11.5px] text-[var(--rotulo)]">
          Mover a
          <select
            aria-label={`Mover ${fila.nombre} a otra fase`}
            value={columna}
            onChange={e => onMover(fila.id, e.target.value as Columna)}
            className="min-w-0 flex-1 rounded-[6px] border border-transparent bg-transparent py-0.5 text-[12px] text-[var(--ink)] hover:border-[var(--line)] focus:border-[var(--ink)] focus:outline-none"
          >
            {COLUMNAS.map(c => <option key={c} value={c}>{TITULO[c]}</option>)}
          </select>
        </label>
      )}
    </li>
  )
}

export function TableroSistema({ filas }: { filas: FilaSistema[] }) {
  const router = useRouter()
  // Lo movido se ve en su columna nueva al soltarlo, sin esperar al servidor.
  const [movidos, setMovidos] = useState<Record<string, Columna>>({})
  const [arrastrado, setArrastrado] = useState<string | null>(null)
  const [sobre, setSobre] = useState<Columna | null>(null)
  const [error, setError] = useState<string | null>(null)

  const columna = (f: FilaSistema) => movidos[f.id] ?? columnaDe(f)
  const porId = new Map(filas.map(f => [f.id, f]))

  async function mover(id: string, a: Columna) {
    const fila = porId.get(id)
    if (!fila?.seguimiento.porFuera || columna(fila) === a) return
    setMovidos(m => ({ ...m, [id]: a }))
    setError(null)
    try {
      await guardar(id, { moverA: a })
      router.refresh()
    } catch (e) {
      setMovidos(m => { const { [id]: _, ...resto } = m; return resto })
      setError(`No se pudo mover ${fila.nombre}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  const movibleArrastrado = arrastrado ? porId.get(arrastrado)?.seguimiento.porFuera : false

  return (
    <div>
      {error && <p role="alert" className="mb-4 text-[13.5px] text-[var(--error)]">{error}</p>}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        <div className="grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-4">
          {COLUMNAS.map(c => {
            const tarjetas = filas.filter(f => columna(f) === c)
              .sort((a, b) => URGENCIA[a.sigue.quien] - URGENCIA[b.sigue.quien] || a.nombre.localeCompare(b.nombre))
            const destino = movibleArrastrado && sobre === c
            return (
              <section key={c} aria-label={TITULO[c]}
                onDragOver={e => { if (!movibleArrastrado) return; e.preventDefault(); setSobre(c) }}
                onDragLeave={() => setSobre(s => (s === c ? null : s))}
                onDrop={e => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); if (id) mover(id, c) }}
                className={`flex min-h-[220px] flex-col rounded-[12px] border p-2.5 transition-colors ${
                  destino ? 'border-dashed border-[var(--ink)] bg-[var(--superficie)]' : 'border-transparent bg-[var(--papel-hondo)]'
                }`}
              >
                <h2 className="flex items-baseline justify-between px-1.5 pb-2.5 pt-1 font-mono text-[11.5px] uppercase tracking-[.12em] text-[var(--rotulo)]">
                  {TITULO[c]} <span className="tabular-nums">{tarjetas.length}</span>
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {tarjetas.map(f => <Tarjeta key={f.id} fila={f} columna={c} onMover={mover} arrastrando={setArrastrado} />)}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
