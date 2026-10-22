'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseConEstado, type FaseSistema, type Quien } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CHIP, MARCA } from './chips'
import { EditorCliente } from './EditorCliente'
import { cuandoVence, encargadosConocidos } from './cliente'

/**
 * El Sistema M&B dentro de la plataforma: una fila por cliente con su fase, qué sigue,
 * quién lo lleva, la fecha de entrega y las notas del equipo. Lo calculado (fase, qué
 * sigue, último movimiento) no se edita; encargado, entrega y notas se editan ahí mismo, y
 * un clic en la fase abre el cliente entero en el modal, el mismo que usa el tablero.
 */

/** Lo que nos toca va primero; lo terminado, al final. */
export const URGENCIA: Record<Quien, number> = { revisar: 0, equipo: 1, claude: 2, fuera: 3, cliente: 4, pausa: 5, listo: 6 }

export async function guardar(id: string, cambios: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${id}/seguimiento`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  })
  if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'No se pudo guardar')
}

/** Los cinco tramos del recorrido. Amarillo lo terminado, tinta lo que está en curso. */
function Recorrido({ fases, actual }: { fases: FaseConEstado[]; actual: FaseSistema }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {fases.map(f => (
        <span
          key={f.key}
          title={`${f.label}: ${f.detalle}`}
          className={`h-[4px] w-[22px] rounded-[2px] ${
            f.estado === 'completa' ? 'bg-[var(--banana)] ring-1 ring-inset ring-[#d9cf2f]'
              : f.key === actual ? 'bg-[var(--ink)]'
              : f.estado === 'en_curso' ? 'bg-[#A39E91]'
              : 'bg-[var(--line)]'
          }`}
        />
      ))}
    </span>
  )
}

/** Texto editable que se ve como texto: se guarda al salir del campo. */
export function Editable({ valor, placeholder, multilinea, onGuardar, etiqueta }: {
  valor: string | null
  placeholder: string
  multilinea?: boolean
  onGuardar: (v: string | null) => Promise<void>
  etiqueta: string
}) {
  const [texto, setTexto] = useState(valor ?? '')
  const [estado, setEstado] = useState<'quieto' | 'guardando' | 'guardado' | 'error'>('quieto')
  async function salir() {
    const limpio = texto.trim()
    if (limpio === (valor ?? '')) return
    setEstado('guardando')
    try {
      await onGuardar(limpio || null)
      setEstado('guardado')
      setTimeout(() => setEstado('quieto'), 1500)
    } catch {
      setEstado('error')
    }
  }
  // `field-sizing: content`: el campo crece con lo que tiene, así un encargado con dos
  // nombres o una nota larga se leen enteros sin abrir nada.
  const clase = 'w-full resize-none rounded-[6px] border border-transparent bg-transparent px-2 py-1 text-[14.5px] leading-[1.5] text-[var(--ink)] [field-sizing:content] placeholder:text-[var(--rotulo)] hover:border-[var(--line)] focus:border-[var(--ink)] focus:bg-white focus:outline-none'
  return (
    <div className="relative">
      {multilinea ? (
        <textarea
          aria-label={etiqueta}
          rows={1}
          value={texto}
          placeholder={placeholder}
          onChange={e => setTexto(e.target.value)}
          onBlur={salir}
          className={clase}
        />
      ) : (
        <input
          aria-label={etiqueta}
          value={texto}
          placeholder={placeholder}
          onChange={e => setTexto(e.target.value)}
          onBlur={salir}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className={clase}
        />
      )}
      {estado !== 'quieto' && (
        <span className={`absolute -bottom-3.5 left-2 text-[10.5px] ${estado === 'error' ? 'text-[var(--error)]' : 'text-[var(--rotulo)]'}`}>
          {estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? '✓ Guardado' : 'No se guardó'}
        </span>
      )}
    </div>
  )
}

export function Entrega({ fila, onCambio }: { fila: FilaSistema; onCambio: () => void }) {
  const [fecha, setFecha] = useState(fila.seguimiento.fechaEntrega ?? '')
  const [error, setError] = useState(false)
  const resto = fecha ? cuandoVence(fecha) : null
  return (
    <div>
      <input
        type="date"
        aria-label={`Fecha de entrega de ${fila.nombre}`}
        value={fecha}
        onChange={async e => {
          const v = e.target.value
          setFecha(v)
          try {
            await guardar(fila.id, { fechaEntrega: v || null })
            setError(false)
            onCambio()
          } catch {
            setError(true)
          }
        }}
        className={`w-full rounded-[6px] border border-transparent bg-transparent px-2 py-1 text-[14.5px] hover:border-[var(--line)] focus:border-[var(--ink)] focus:outline-none ${fecha ? 'text-[var(--ink)]' : 'text-[var(--rotulo)]'}`}
      />
      {resto && <p className={`px-2 text-[12.5px] ${resto.vencida ? 'text-[var(--error)]' : 'text-[var(--secundario)]'}`}>{resto.texto}</p>}
      {error && <p className="px-2 text-[11.5px] text-[var(--error)]">No se guardó</p>}
    </div>
  )
}

function Fila({ fila, encargados, onCambio }: { fila: FilaSistema; encargados: string[]; onCambio: () => void }) {
  const [editando, setEditando] = useState(false)
  const fase = fila.fases.find(f => f.key === fila.actual)!
  const celda = 'min-w-0'
  const rotuloMovil = 'pb-1 text-[10.5px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)] lg:hidden'
  return (
    <li className="grid gap-x-7 gap-y-3 border-b border-[var(--line)] py-6 sm:grid-cols-2 lg:grid-cols-[minmax(170px,1.2fr)_minmax(140px,.95fr)_minmax(170px,1.15fr)_minmax(150px,1fr)_minmax(140px,.8fr)_minmax(170px,1.2fr)] lg:items-start">
      <div className={celda}>
        <Link href={fila.href} className="font-serif text-[20px] leading-tight tracking-[-.01em] text-[var(--ink)] hover:underline">{fila.nombre}</Link>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-[var(--rotulo)]">
          {fila.ultimo ? <>{fila.ultimo.texto} · {fila.ultimo.cuando}</> : `Inicio ${fila.inicio}`}
        </p>
      </div>

      <div className={`relative ${celda}`}>
        <p className={rotuloMovil}>Fase</p>
        <button type="button" onClick={() => setEditando(true)}
          className="-mx-2 -my-1 w-[calc(100%+16px)] rounded-[6px] px-2 py-1 text-left transition-colors hover:bg-[var(--superficie)]"
          aria-label={`Fase de ${fila.nombre}: ${fase.label}. Editar el cliente`}>
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-[var(--ink)]">{fase.label}</span>
            <span className="text-[11px] text-[var(--rotulo)]" aria-hidden="true">✎</span>
          </span>
          <span className="mt-2 block"><Recorrido fases={fila.fases} actual={fila.actual} /></span>
          <span className="mt-1.5 block truncate text-[13px] text-[var(--secundario)]">{fase.detalle}</span>
        </button>
        {editando && <EditorCliente fila={fila} encargados={encargados} onCerrar={() => setEditando(false)} />}
      </div>

      <div className={celda}>
        <p className={rotuloMovil}>Qué sigue</p>
        {/* Por fuera y andando, la columna Fase ya lo dice todo: repetirlo sería ruido. */}
        {fila.sigue.quien !== 'fuera' && (
          <p>
            <span className={`inline-flex rounded-[3px] px-[7px] py-[2px] text-[12.5px] font-semibold ${CHIP[fila.sigue.quien]}`}>{MARCA[fila.sigue.quien]}{fila.sigue.texto}</span>
          </p>
        )}
        {fila.sigue.detalle && (
          fila.sigue.href
            ? <Link href={fila.sigue.href} className="mt-1.5 block text-[14.5px] leading-[1.45] text-[var(--ink)] underline decoration-[var(--line)] underline-offset-[3px] hover:decoration-[var(--ink)]">{fila.sigue.detalle} →</Link>
            : <p className="mt-1.5 text-[14.5px] leading-[1.45] text-[var(--cuerpo)]">{fila.sigue.detalle}</p>
        )}
      </div>

      <div className={celda}>
        <p className={rotuloMovil}>Encargado</p>
        <Editable etiqueta={`Encargado de ${fila.nombre}`} valor={fila.seguimiento.encargado} placeholder="Asignar" multilinea
          onGuardar={async v => { await guardar(fila.id, { encargado: v }); onCambio() }} />
      </div>

      <div className={celda}>
        <p className={rotuloMovil}>Entrega</p>
        <Entrega fila={fila} onCambio={onCambio} />
      </div>

      <div className={celda}>
        <p className={rotuloMovil}>Notas</p>
        <Editable etiqueta={`Notas de ${fila.nombre}`} valor={fila.seguimiento.notas} placeholder="Agregar nota" multilinea
          onGuardar={async v => { await guardar(fila.id, { notas: v }); onCambio() }} />
      </div>
    </li>
  )
}

export function TablaSistema({ filas }: { filas: FilaSistema[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<FaseSistema | 'todas'>('todas')
  const porFase = useMemo(() => new Map(FASES.map(f => [f, filas.filter(x => x.actual === f).length])), [filas])
  const visibles = filas
    .filter(f => filtro === 'todas' || f.actual === filtro)
    .sort((a, b) => URGENCIA[a.sigue.quien] - URGENCIA[b.sigue.quien] || a.nombre.localeCompare(b.nombre))
  const nosToca = filas.filter(f => f.sigue.quien === 'revisar' || f.sigue.quien === 'equipo').length
  const encargados = useMemo(() => encargadosConocidos(filas.map(f => f.seguimiento.encargado)), [filas])

  const pestaña = (activa: boolean) =>
    `-mb-px inline-flex items-baseline gap-1.5 border-b-2 pb-3 text-[14.5px] transition-colors ${
      activa ? 'border-[var(--ink)] font-medium text-[var(--ink)]' : 'border-transparent text-[var(--secundario)] hover:text-[var(--ink)]'
    }`

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[var(--line)]">
        <nav aria-label="Filtrar por fase" className="flex flex-wrap gap-x-7 gap-y-2">
          <button type="button" className={pestaña(filtro === 'todas')} aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>
            Todos <span className="font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{filas.length}</span>
          </button>
          {FASES.map(f => (
            <button key={f} type="button" className={pestaña(filtro === f)} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {FASE_LABEL[f]} <span className="font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{porFase.get(f) ?? 0}</span>
            </button>
          ))}
        </nav>
        {nosToca > 0 && (
          <p className="pb-3 text-[13.5px] text-[var(--secundario)]">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[var(--banana)] ring-1 ring-[var(--ink)]" aria-hidden="true" />
            {nosToca} {nosToca === 1 ? 'cliente espera' : 'clientes esperan'} al equipo
          </p>
        )}
      </div>

      <div className="hidden gap-x-7 border-b border-[var(--line)] pb-3 pt-6 text-[10.5px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)] lg:grid lg:grid-cols-[minmax(170px,1.2fr)_minmax(140px,.95fr)_minmax(170px,1.15fr)_minmax(150px,1fr)_minmax(140px,.8fr)_minmax(170px,1.2fr)]">
        <span>Cliente</span><span>Fase</span><span>Qué sigue</span><span className="px-2">Encargado</span><span className="px-2">Entrega</span><span className="px-2">Notas</span>
      </div>

      {visibles.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-[var(--secundario)]">No hay clientes en {filtro === 'todas' ? 'la plataforma' : FASE_LABEL[filtro]}.</p>
      ) : (
        <ul aria-label="Clientes">
          {visibles.map(f => <Fila key={f.id} fila={f} encargados={encargados} onCambio={() => router.refresh()} />)}
        </ul>
      )}
    </div>
  )
}
