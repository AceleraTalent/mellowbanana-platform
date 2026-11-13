'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { estadoDe, guardar } from '@/components/sistema/TablaSistema'
import { EditorCliente } from '@/components/sistema/EditorCliente'
import { cuandoVence, fechaLarga, personas, valorCorto } from '@/components/sistema/cliente'
import { Avatar, Avatares, ChipEstado, ChipFase } from '@/components/sistema/fase'

type Destino = FaseSistema | 'terminado'

function Dato({ rotulo, icono, children }: { rotulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5">{icono}</svg>
        <p className={LABEL}>{rotulo}</p>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

const LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'
const VACIO = 'text-sm text-muted-foreground'
const VALOR = 'text-sm font-bold'

/**
 * La cabecera del detalle de un proyecto: quién es, en qué fase va y los datos que el
 * equipo lleva (valor, inicio, entrega, equipo). “Mover de etapa” hace lo mismo que
 * arrastrar la tarjeta en el Kanban; lo demás se edita en el modal del cliente, el mismo
 * del Pipeline.
 */
export function CabeceraDetalle({ fila, encargados }: { fila: FilaSistema; encargados: string[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const s = fila.seguimiento
  const terminado = fila.sigue.quien === 'listo'
  const destino: Destino = terminado ? 'terminado' : fila.actual
  const fase = fila.fases.find(f => f.key === fila.actual)!
  const gente = personas(s.encargado).map(p => p.nombre)
  const vence = s.fechaEntrega ? cuandoVence(s.fechaEntrega) : null

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

  const estado = estadoDe(fila)
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-6 text-card-foreground shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Avatar nombre={fila.nombre} size={48} cuadrado />
          <div className="min-w-0">
            <p className={LABEL}>Detalle de proyecto</p>
            <h1 className="mt-0.5 text-[24px] font-extrabold leading-tight tracking-tight">{fila.nombre}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {s.porFuera ? 'Lleva su proceso fuera de la plataforma' : 'Hace su proceso en la plataforma'}
              {fila.ultimo && <> · {fila.ultimo.texto} {fila.ultimo.cuando}</>}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ChipFase fase={destino}>{terminado ? 'Terminado' : fase.label}</ChipFase>
              <ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado>
              <span className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{s.porFuera ? 'Por fuera' : 'En la plataforma'}</span>
              {s.faseAMano && <span className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Fase puesta a mano</span>}
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setEditando(true)} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border bg-white px-3.5 text-sm font-semibold shadow-soft transition hover:bg-muted">Editar cliente</button>
      </div>

      <div className={`mt-6 grid grid-cols-2 gap-4 border-t border-dashed pt-5 ${fila.valorOculto ? 'md:grid-cols-4' : 'md:grid-cols-4 lg:grid-cols-5'}`}>
        {!fila.valorOculto && (
          <Dato rotulo="Valor del proyecto" icono={<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>}>
            {s.valor !== null ? <p className={VALOR}>{valorCorto(s.valor)}</p> : <p className={VACIO}>Sin anotar</p>}
          </Dato>
        )}
        <Dato rotulo="Inicio" icono={<><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>}>
          <p className={VALOR}>{fechaLarga(fila.inicioIso)}</p>
          {!s.fechaInicio && <p className="text-xs text-muted-foreground">Alta en la plataforma</p>}
        </Dato>
        <Dato rotulo="Entrega" icono={<><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>}>
          {s.fechaEntrega && vence ? (
            <>
              <p className={VALOR}>{fechaLarga(s.fechaEntrega)}</p>
              {!terminado && <p className={`text-xs ${vence.vencida ? 'font-semibold text-rose-600' : 'text-muted-foreground'}`}>{vence.texto}</p>}
            </>
          ) : <p className={VACIO}>Sin fecha</p>}
        </Dato>
        <Dato rotulo="Equipo" icono={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>}>
          {gente.length ? (
            <p className="flex items-center gap-2">
              <Avatares nombres={gente} size={28} />
              <span className="truncate text-sm font-semibold">{gente[0].split(' ')[0]}</span>
            </p>
          ) : <p className={VACIO}>Sin asignar</p>}
        </Dato>
        <div className="min-w-0">
          <label htmlFor="mover-etapa" className={`${LABEL} block`}>Mover de etapa</label>
          <select id="mover-etapa" value={destino} disabled={moviendo} onChange={e => mover(e.target.value as Destino)}
            className="mt-1.5 h-9 w-full cursor-pointer rounded-lg border bg-white px-3 text-sm font-medium shadow-soft outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:cursor-wait disabled:opacity-60">
            {FASES.map((f, i) => <option key={f} value={f}>{String(i + 1).padStart(2, '0')} · {FASE_LABEL[f]}</option>)}
            <option value="terminado">{String(FASES.length + 1).padStart(2, '0')} · Terminado</option>
          </select>
          {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </div>

      {editando && <EditorCliente fila={fila} encargados={encargados} onCerrar={() => setEditando(false)} />}
    </section>
  )
}
