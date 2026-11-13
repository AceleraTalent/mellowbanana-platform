'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import {
  FASES, FASE_LABEL, ESTADO_CLIENTE_LABEL, estadoDelCliente,
  type EstadoCliente, type EstadoFase, type FaseSistema,
} from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CerrarModal } from '@/components/Modal'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/components/paso/piezas'
import { cuandoVence, pesosDe, valorCorto } from './cliente'
import { Comentarios } from './Comentarios'

export type Destino = FaseSistema | 'terminado'

async function patch(id: string, cambios: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${id}/seguimiento`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  })
  if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'No se pudo guardar')
}

const CAMPO = 'w-full rounded-[10px] border border-[var(--line)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--rotulo)] hover:border-[var(--apagado)] focus:border-[var(--ink)]'
const ETIQUETA = 'text-[13px] font-medium text-[var(--secundario)]'

function Opcion({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={activa} onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] ${
        activa ? 'border-[var(--ink)] bg-[var(--primario)] text-white' : 'border-[var(--line)] bg-white text-[var(--cuerpo)] hover:border-[var(--ink)]'
      }`}>
      {children}
    </button>
  )
}

/**
 * El recorrido de cinco tramos, el mismo que se ve en la tabla. En un cliente por fuera es
 * el selector de fase: un clic en el tramo lo lleva ahí. Lo anterior queda en amarillo
 * (terminado), el tramo actual en tinta (lleno si está en curso, hueco si no arrancó).
 */
function Recorrido({ destino, sinEmpezar, onElegir, estados }: {
  destino: Destino
  sinEmpezar: boolean
  onElegir?: (d: Destino) => void
  /** Sólo lectura: los estados que calcula la plataforma. */
  estados?: Record<FaseSistema, EstadoFase>
}) {
  const i = destino === 'terminado' ? FASES.length : FASES.indexOf(destino)
  const estadoDe = (f: FaseSistema, j: number): EstadoFase =>
    estados ? estados[f] : j < i ? 'completa' : j === i ? (sinEmpezar ? 'pendiente' : 'en_curso') : 'pendiente'
  const terminado = estados ? FASES.every(f => estados[f] === 'completa') : destino === 'terminado'
  const Tramo = onElegir ? 'button' : 'div'

  return (
    <div role={onElegir ? 'radiogroup' : undefined} aria-label={onElegir ? 'Fase' : undefined}
      className="grid grid-cols-3 gap-x-2 gap-y-3.5 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
      {FASES.map((f, j) => {
        const e = estadoDe(f, j)
        const actual = estados ? false : j === i
        return (
          <Tramo key={f} {...(onElegir ? { type: 'button' as const, role: 'radio', 'aria-checked': actual, onClick: () => onElegir(f) } : {})}
            className={`group flex min-w-0 flex-col gap-2 rounded-[6px] text-left ${onElegir ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]' : ''}`}>
            <span className={`block h-[8px] rounded-full transition-colors ${
              e === 'completa' ? 'bg-[var(--listo)]'
                : actual && e === 'pendiente' ? 'shadow-[inset_0_0_0_1.5px_var(--ink)]'
                : e === 'en_curso' ? 'bg-[var(--primario)]'
                : `bg-[var(--line)] ${onElegir ? 'group-hover:bg-[#D6D1C4]' : ''}`
            }`} />
            <span className={`truncate text-[12.5px] ${actual || (estados && e === 'en_curso') ? 'font-semibold text-[var(--ink)]' : 'text-[var(--secundario)]'}`}>
              {FASE_LABEL[f]}
            </span>
          </Tramo>
        )
      })}
      <Tramo {...(onElegir ? { type: 'button' as const, role: 'radio', 'aria-checked': terminado, onClick: () => onElegir('terminado') } : {})}
        className={`group flex flex-col items-start gap-1 rounded-[6px] sm:items-center ${onElegir ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]' : ''}`}>
        <span className={`-mt-[7px] grid h-[22px] w-[22px] place-items-center rounded-full transition-colors ${
          terminado ? 'bg-[var(--listo)]' : `border border-[var(--line)] bg-white ${onElegir ? 'group-hover:border-[var(--ink)]' : ''}`
        }`}>
          <svg viewBox="0 0 12 12" className={`h-3 w-3 ${terminado ? 'text-white' : 'text-[var(--apagado)]'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 6.3 4.9 8.6 9.5 3.6" />
          </svg>
        </span>
        <span className={`text-[12.5px] ${terminado ? 'font-semibold text-[var(--ink)]' : 'text-[var(--secundario)]'}`}>Terminado</span>
      </Tramo>
    </div>
  )
}

function Interruptor({ encendido, onCambiar, children }: { encendido: boolean; onCambiar: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={encendido} onClick={() => onCambiar(!encendido)}
      className="flex items-center gap-2.5 rounded-[6px] text-left text-[13.5px] text-[var(--cuerpo)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]">
      <span className={`relative h-[20px] w-[34px] flex-none rounded-full transition-colors ${encendido ? 'bg-[var(--primario)]' : 'bg-[var(--line)]'}`}>
        <span className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(21,18,12,.25)] transition-[left] ${encendido ? 'left-[16px]' : 'left-[2px]'}`} />
      </span>
      {children}
    </button>
  )
}

/**
 * Todo lo que el equipo cambia de un cliente, en un solo lugar y con un solo “Guardar”: en
 * qué fase va, en qué anda (el Status de Notion), quién lo lleva, para cuándo y qué falta.
 * Es el mismo en el modal del tablero, de la tabla y en la ficha. Cualquier cliente se mueve
 * de fase; en uno que hace su proceso en la plataforma, moverlo deja la fase a mano hasta que
 * alguien pida volver a calcularla con lo aprobado.
 */
export function FormularioCliente({ fila, encargados = [], onListo, onCancelar, enModal = false }: {
  fila: FilaSistema
  encargados?: string[]
  /** Se guardó (o no había nada que guardar). */
  onListo: () => void
  onCancelar?: () => void
  enModal?: boolean
}) {
  const s = fila.seguimiento
  const inicial = {
    porFuera: s.porFuera,
    destino: (fila.sigue.quien === 'listo' ? 'terminado' : fila.actual) as Destino,
    estado: estadoDelCliente(fila.fases, fila.actual, s.estadoManual),
    /** En la plataforma: que la fase vuelva a salir de lo aprobado. */
    calcular: false,
    encargado: s.encargado ?? '',
    fecha: s.fechaEntrega ?? '',
    notas: s.notas ?? '',
    inicio: s.fechaInicio ?? '',
    valor: s.valor === null ? '' : String(s.valor),
  }
  const [d, setD] = useState(inicial)
  const cambiar = (c: Partial<typeof inicial>) => { setD(x => ({ ...x, ...c })); setGuardado(false) }
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idLista = useId()

  const sucio = (Object.keys(inicial) as (keyof typeof inicial)[]).some(k => d[k] !== inicial[k])
  const vence = d.fecha ? cuandoVence(d.fecha) : null
  const pesos = pesosDe(d.valor)

  async function guardar() {
    if (!sucio) { onListo(); return }
    setGuardando(true); setError(null)
    const cambios: Record<string, unknown> = {}
    if (d.porFuera !== inicial.porFuera) cambios.porFuera = d.porFuera
    // Moverlo de fase (o marcar que no arrancó) lo deja a mano; "esperando al cliente" o
    // "en pausa" no tocan la fase, así un cliente de la plataforma sigue calculándose solo.
    const sinEmpezar = (e: EstadoCliente) => e === 'sin_empezar'
    const mueve = d.destino !== inicial.destino || sinEmpezar(d.estado) !== sinEmpezar(inicial.estado) || (d.porFuera && !inicial.porFuera)
    if (d.calcular && !d.porFuera) cambios.calcular = true
    else if (mueve) {
      cambios.moverA = d.destino
      if (d.destino !== 'terminado' && sinEmpezar(d.estado)) cambios.fase = { key: d.destino, estado: 'pendiente' }
    }
    const frenado = (e: EstadoCliente, destino: Destino) => (destino !== 'terminado' && (e === 'cliente' || e === 'pausa') ? e : null)
    if (frenado(d.estado, d.destino) !== frenado(inicial.estado, inicial.destino))
      cambios.estadoManual = frenado(d.estado, d.destino)
    if (d.encargado !== inicial.encargado) cambios.encargado = d.encargado.trim() || null
    if (d.fecha !== inicial.fecha) cambios.fechaEntrega = d.fecha || null
    if (d.notas !== inicial.notas) cambios.notas = d.notas.trim() || null
    if (d.inicio !== inicial.inicio) cambios.fechaInicio = d.inicio || null
    if (!fila.valorOculto && d.valor !== inicial.valor) cambios.valor = pesos
    try {
      if (Object.keys(cambios).length) await patch(fila.id, cambios)
      setGuardado(true)
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const px = 'px-5 sm:px-7'

  return (
    <form onSubmit={e => { e.preventDefault(); guardar() }} className="flex max-h-[inherit] flex-col">
      {enModal && (
        <div className={`flex items-start justify-between gap-4 pb-1 pt-5 sm:pt-6 ${px}`}>
          <div className="min-w-0">
            <h2 className="font-serif text-[26px] leading-[1.15] tracking-[-.02em] text-[var(--ink)]">{fila.nombre}</h2>
            <p className="mt-1 text-[13.5px] text-[var(--secundario)]">
              {d.porFuera ? 'Lleva su proceso por fuera de la plataforma.' : 'Hace su proceso en la plataforma.'}{' '}
              <Link href={fila.href} className="text-[var(--ink)] underline decoration-[var(--line)] underline-offset-[3px] hover:decoration-[var(--ink)]">
                {d.porFuera ? 'Abrir la ficha' : 'Abrir el proyecto'}
              </Link>
            </p>
          </div>
          {onCancelar && <CerrarModal onCerrar={onCancelar} />}
        </div>
      )}

      <div className={`flex flex-col gap-6 overflow-y-auto py-5 ${px}`}>
        <fieldset>
          <legend className={`${ETIQUETA} mb-3`}>Fase</legend>
          <Recorrido destino={d.destino} sinEmpezar={d.estado === 'sin_empezar'} onElegir={destino => cambiar({ destino, calcular: false })} />
          {!d.porFuera && (
            <p className="mt-3 text-[13px] leading-[1.5] text-[var(--secundario)]">
              {d.calcular ? (
                <>Al guardar, la fase vuelve a salir de lo que se apruebe en la plataforma.</>
              ) : s.faseAMano || d.destino !== inicial.destino ? (
                <>
                  La fase la pone el equipo.{' '}
                  <button type="button" onClick={() => cambiar({ calcular: true, destino: inicial.destino })}
                    className="text-[var(--ink)] underline decoration-[var(--line)] underline-offset-[3px] hover:decoration-[var(--ink)]">
                    Volver a calcularla sola
                  </button>
                </>
              ) : (
                <>Se calcula sola con lo que se aprueba en la plataforma. Si la mueves, queda como la pongas.</>
              )}
            </p>
          )}
        </fieldset>

        {d.destino !== 'terminado' && (
          <fieldset>
            <legend className={`${ETIQUETA} mb-2.5`}>Cómo va</legend>
            <div role="radiogroup" aria-label="Cómo va" className="flex flex-wrap gap-1.5">
              {(['en_curso', 'sin_empezar', 'cliente', 'pausa'] as const).map(e => (
                <Opcion key={e} activa={d.estado === e} onClick={() => cambiar({ estado: e })}>{ESTADO_CLIENTE_LABEL[e]}</Opcion>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
          <label className="flex flex-col gap-2">
            <span className={ETIQUETA}>Encargado</span>
            <input value={d.encargado} onChange={e => cambiar({ encargado: e.target.value })} list={idLista}
              placeholder="Quién lo lleva" maxLength={80} className={CAMPO} />
            <datalist id={idLista}>{encargados.map(n => <option key={n} value={n} />)}</datalist>
          </label>
          <label className="flex flex-col gap-2">
            <span className={ETIQUETA}>Entrega</span>
            <input type="date" value={d.fecha} onChange={e => cambiar({ fecha: e.target.value })} className={CAMPO} />
            {vence && <span className={`text-[12.5px] ${vence.vencida ? 'text-[var(--error)]' : 'text-[var(--secundario)]'}`}>{vence.texto}</span>}
          </label>
        </div>

        <div className={`grid gap-5 ${fila.valorOculto ? '' : 'sm:grid-cols-[1fr_200px]'}`}>
          {!fila.valorOculto && (
          <label className="flex flex-col gap-2">
            <span className={ETIQUETA}>Valor del proyecto</span>
            <input value={d.valor} onChange={e => cambiar({ valor: e.target.value })} inputMode="numeric"
              placeholder="En pesos, opcional" maxLength={20} className={CAMPO} />
            {pesos !== null && <span className="text-[12.5px] text-[var(--secundario)]">{valorCorto(pesos)}</span>}
          </label>
          )}
          <label className="flex flex-col gap-2">
            <span className={ETIQUETA}>Inicio</span>
            <input type="date" value={d.inicio} onChange={e => cambiar({ inicio: e.target.value })} className={CAMPO} />
            {!d.inicio && <span className="text-[12.5px] text-[var(--secundario)]">Sin fecha, cuenta desde el {fila.inicio}</span>}
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className={ETIQUETA}>Notas</span>
          <textarea value={d.notas} onChange={e => cambiar({ notas: e.target.value })} rows={2} maxLength={2000}
            placeholder="Lo que falta hoy" className={`${CAMPO} resize-y leading-[1.5]`} />
        </label>

        <div className="border-t border-[var(--line)] pt-5">
          <Comentarios projectId={fila.id} />
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[var(--line)] bg-[var(--superficie)] py-4 ${px}`}>
        <Interruptor encendido={d.porFuera} onCambiar={porFuera => cambiar({ porFuera, calcular: false })}>
          Lleva su proceso por fuera
        </Interruptor>
        <div className="ml-auto flex items-center gap-2">
          {error && <p role="alert" className="mr-1 text-[13px] text-[var(--error)]">{error}</p>}
          {!enModal && guardado && !sucio && <p className="mr-1 text-[13px] text-[var(--secundario)]">Cambios guardados</p>}
          {!enModal && !sucio && <Link href="/admin" className={BOTON_SECUNDARIO}>Ver en el Pipeline</Link>}
          {onCancelar && <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>Cancelar</button>}
          {(enModal || sucio) && (
            <button type="submit" disabled={guardando || (!sucio && !enModal)} className={`${BOTON_PRIMARIO} disabled:opacity-50`}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
