'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema, type Quien } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CHIP, MARCA } from './chips'
import { EditorCliente } from './EditorCliente'
import { cuandoVence, encargadosConocidos, personas } from './cliente'
import { Avatar, Avatares, ChipFase, FASE_CLASE } from './fase'

/**
 * El Pipeline como lista: una fila por cliente con su fase y su avance, qué sigue, quién
 * lo lleva, la fecha de entrega y las notas del equipo. Lo calculado (fase, qué
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
  const clase = 'w-full resize-none rounded-[8px] border border-transparent bg-transparent px-2 py-1 text-[14px] leading-[1.5] text-[var(--ink)] [field-sizing:content] placeholder:text-[var(--rotulo)] hover:border-[var(--line)] focus:border-[var(--primario)] focus:bg-white focus:outline-none'
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
        className={`w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1 text-[14px] hover:border-[var(--line)] focus:border-[var(--primario)] focus:outline-none ${fecha ? 'font-medium text-[var(--ink)]' : 'text-[var(--rotulo)]'}`}
      />
      {resto && <p className={`px-2 text-[12.5px] ${resto.vencida ? 'text-[var(--error)]' : 'text-[var(--secundario)]'}`}>{resto.texto}</p>}
      {error && <p className="px-2 text-[11.5px] text-[var(--error)]">No se guardó</p>}
    </div>
  )
}

const COLUMNAS = 'lg:grid-cols-[minmax(190px,1.35fr)_minmax(150px,.95fr)_minmax(160px,1fr)_minmax(200px,1.25fr)_minmax(140px,.75fr)_minmax(140px,.95fr)]'

function Fila({ fila, encargados, onCambio }: { fila: FilaSistema; encargados: string[]; onCambio: () => void }) {
  const [editando, setEditando] = useState(false)
  const fase = fila.fases.find(f => f.key === fila.actual)!
  const terminado = fila.sigue.quien === 'listo'
  const gente = personas(fila.seguimiento.encargado).map(p => p.nombre)
  const celda = 'min-w-0'
  const rotuloMovil = 'rotulo pb-1 lg:hidden'
  return (
    <li className={`grid gap-x-6 gap-y-3 border-t border-[var(--line)] px-5 py-4 transition-colors hover:bg-[var(--superficie)]/50 sm:grid-cols-2 sm:px-6 ${COLUMNAS} lg:items-center`}>
      <div className={`flex items-center gap-3.5 ${celda}`}>
        <Avatar nombre={fila.nombre} size={40} cuadrado />
        <div className="min-w-0">
          <Link href={fila.href} className="block truncate text-[15px] font-bold leading-tight text-[var(--ink)] hover:text-[var(--primario)]">{fila.nombre}</Link>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--rotulo)]">
            {fila.ultimo ? <>{fila.ultimo.texto} · {fila.ultimo.cuando}</> : `Inicio ${fila.inicio}`}
          </p>
        </div>
      </div>

      <div className={`relative ${celda}`}>
        <p className={rotuloMovil}>Fase</p>
        <button type="button" onClick={() => setEditando(true)}
          className={`${FASE_CLASE[terminado ? 'terminado' : fila.actual]} -mx-2 -my-1 block w-[calc(100%+16px)] rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-white`}
          aria-label={`Fase de ${fila.nombre}: ${fase.label}. Editar el cliente`}>
          <ChipFase fase={terminado ? 'terminado' : fila.actual}>{terminado ? 'Terminado' : fase.label}</ChipFase>
          <span className="mt-2 flex items-center gap-2.5" title={fila.fases.map(f => `${f.label}: ${f.detalle}`).join('\n')}>
            <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--papel-hondo)]">
              <span className="block h-full rounded-full bg-[var(--primario)]" style={{ width: `${fila.avance}%` }} />
            </span>
            <span className="w-9 flex-none text-right text-[12.5px] tabular-nums text-[var(--secundario)]">{fila.avance}%</span>
          </span>
        </button>
        {editando && <EditorCliente fila={fila} encargados={encargados} onCerrar={() => setEditando(false)} />}
      </div>

      <div className={celda}>
        <p className={rotuloMovil}>Qué sigue</p>
        {/* Por fuera y andando, la columna Fase ya lo dice todo: repetirlo sería ruido. */}
        {fila.sigue.quien !== 'fuera' && (
          <p>
            <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${CHIP[fila.sigue.quien]}`}>{MARCA[fila.sigue.quien]}{fila.sigue.texto}</span>
          </p>
        )}
        {fila.sigue.detalle ? (
          fila.sigue.href
            ? <Link href={fila.sigue.href} className="mt-1.5 block text-[13.5px] leading-[1.4] text-[var(--ink)] hover:text-[var(--primario)]">{fila.sigue.detalle} →</Link>
            : <p className="mt-1.5 text-[13.5px] leading-[1.4] text-[var(--cuerpo)]">{fila.sigue.detalle}</p>
        ) : fila.sigue.quien === 'fuera' && <p className="text-[13.5px] text-[var(--secundario)]">{fase.detalle}</p>}
      </div>

      <div className={celda}>
        <p className={rotuloMovil}>Responsable</p>
        <div className="flex items-center gap-1.5">
          {gente.length > 0 && <Avatares nombres={gente} size={26} />}
          <div className="min-w-0 flex-1">
            <Editable etiqueta={`Encargado de ${fila.nombre}`} valor={fila.seguimiento.encargado} placeholder="Asignar" multilinea
              onGuardar={async v => { await guardar(fila.id, { encargado: v }); onCambio() }} />
          </div>
        </div>
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
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
      activa ? 'border-[var(--primario)] bg-[var(--primario-suave)] text-[var(--primario)]' : 'border-[var(--line)] bg-white text-[var(--secundario)] hover:text-[var(--ink)]'
    }`
  const cuenta = 'text-[12px] tabular-nums opacity-70'

  return (
    <div className="tarjeta overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-[17px] font-bold text-[var(--ink)]">Proyectos en curso</h2>
          <p className="mt-0.5 text-[13.5px] text-[var(--secundario)]">Un clic en la fase abre el cliente; encargado, entrega y notas se editan aquí mismo.</p>
        </div>
        {nosToca > 0 && (
          <p className="rounded-full bg-[var(--primario-suave)] px-3 py-1 text-[12.5px] font-semibold text-[var(--primario)]">
            {nosToca} {nosToca === 1 ? 'cliente espera' : 'clientes esperan'} al equipo
          </p>
        )}
      </div>

      <nav aria-label="Filtrar por fase" className="flex flex-wrap gap-2 px-5 pb-4 pt-4 sm:px-6">
        <button type="button" className={pestaña(filtro === 'todas')} aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>
          Todos <span className={cuenta}>{filas.length}</span>
        </button>
        {FASES.map(f => (
          <button key={f} type="button" className={pestaña(filtro === f)} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {FASE_LABEL[f]} <span className={cuenta}>{porFase.get(f) ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className={`rotulo hidden gap-x-6 border-t border-[var(--line)] bg-[var(--superficie)]/60 px-6 py-3 lg:grid ${COLUMNAS}`}>
        <span>Cliente</span><span>Fase y avance</span><span>Qué sigue</span><span>Responsable</span><span className="px-2">Entrega</span><span className="px-2">Notas</span>
      </div>

      {visibles.length === 0 ? (
        <p className="border-t border-[var(--line)] py-12 text-center text-[14px] text-[var(--secundario)]">No hay clientes en {filtro === 'todas' ? 'la plataforma' : FASE_LABEL[filtro]}.</p>
      ) : (
        <ul aria-label="Clientes">
          {visibles.map(f => <Fila key={f.id} fila={f} encargados={encargados} onCambio={() => router.refresh()} />)}
        </ul>
      )}
    </div>
  )
}
