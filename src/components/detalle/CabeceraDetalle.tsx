'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CHIP, MARCA } from '@/components/sistema/chips'
import { guardar } from '@/components/sistema/TablaSistema'
import { EditorCliente } from '@/components/sistema/EditorCliente'
import { cuandoVence, fechaLarga, personas, valorCorto } from '@/components/sistema/cliente'
import { Avatar, Avatares, ChipFase } from '@/components/sistema/fase'
import { BOTON_SECUNDARIO } from '@/components/paso/piezas'

type Destino = FaseSistema | 'terminado'

function Dato({ rotulo, icono, children }: { rotulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="rotulo flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icono}</svg>
        {rotulo}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

const VACIO = 'text-[14.5px] text-[var(--rotulo)]'
const VALOR = 'text-[15.5px] font-bold text-[var(--ink)]'

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

  return (
    <section className="tarjeta p-5 sm:p-7">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
        <Avatar nombre={fila.nombre} size={56} cuadrado />
        <div className="min-w-0 flex-1 basis-[280px]">
          <p className="rotulo">Detalle de proyecto</p>
          <h1 className="mt-1 font-serif text-[30px] leading-[1.12] text-[var(--ink)]">{fila.nombre}</h1>
          <p className="mt-1.5 text-[14.5px] text-[var(--secundario)]">
            {s.porFuera ? 'Lleva su proceso fuera de la plataforma' : 'Hace su proceso en la plataforma'}
            {fila.ultimo && <> · {fila.ultimo.texto} {fila.ultimo.cuando}</>}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ChipFase fase={destino}>{terminado ? 'Terminado' : fase.label}</ChipFase>
            {!terminado && (
              <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold ${CHIP[fila.sigue.quien]}`}>{MARCA[fila.sigue.quien]}{fila.sigue.texto}</span>
            )}
            {s.faseAMano && <span className="inline-flex rounded-full border border-[var(--line)] px-2.5 py-[2px] text-[12.5px] text-[var(--secundario)]">Fase puesta a mano</span>}
          </div>
        </div>
        <button type="button" onClick={() => setEditando(true)} className={`${BOTON_SECUNDARIO} px-3.5 py-2 text-[13.5px]`}>Editar cliente</button>
      </div>

      <div className="mt-6 grid gap-x-6 gap-y-5 border-t border-dashed border-[var(--line)] pt-5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(190px,1.1fr)]">
        <Dato rotulo="Valor del proyecto" icono={<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>}>
          {s.valor !== null ? <p className={VALOR}>{valorCorto(s.valor)}</p> : <p className={VACIO}>Sin anotar</p>}
        </Dato>
        <Dato rotulo="Inicio" icono={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>}>
          <p className={VALOR}>{fechaLarga(fila.inicioIso)}</p>
          {!s.fechaInicio && <p className="text-[12.5px] text-[var(--secundario)]">Alta en la plataforma</p>}
        </Dato>
        <Dato rotulo="Entrega" icono={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>}>
          {s.fechaEntrega && vence ? (
            <>
              <p className={VALOR}>{fechaLarga(s.fechaEntrega)}</p>
              {!terminado && <p className={`text-[12.5px] ${vence.vencida ? 'text-[var(--error)]' : 'text-[var(--secundario)]'}`}>{vence.texto}</p>}
            </>
          ) : <p className={VACIO}>Sin fecha</p>}
        </Dato>
        <Dato rotulo="Equipo" icono={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>}>
          {gente.length ? (
            <p className="flex items-center gap-2">
              <Avatares nombres={gente} size={28} />
              <span className="truncate text-[14.5px] font-semibold text-[var(--ink)]">{gente[0].split(' ')[0]}{gente.length > 1 && ` y ${gente.length - 1} más`}</span>
            </p>
          ) : <p className={VACIO}>Sin asignar</p>}
        </Dato>
        <div className="min-w-0">
          <label htmlFor="mover-etapa" className="rotulo block">Mover de etapa</label>
          <select id="mover-etapa" value={destino} disabled={moviendo} onChange={e => mover(e.target.value as Destino)}
            className="mt-1.5 w-full cursor-pointer rounded-[12px] border border-[var(--line)] bg-white px-3 py-2.5 text-[14.5px] font-medium text-[var(--ink)] outline-none transition-colors hover:border-[var(--apagado)] focus:border-[var(--primario)] disabled:cursor-wait disabled:opacity-60">
            {FASES.map((f, i) => <option key={f} value={f}>{String(i + 1).padStart(2, '0')} · {FASE_LABEL[f]}</option>)}
            <option value="terminado">{String(FASES.length + 1).padStart(2, '0')} · Terminado</option>
          </select>
          {error && <p role="alert" className="mt-1 text-[12.5px] text-[var(--error)]">{error}</p>}
        </div>
      </div>

      {editando && <EditorCliente fila={fila} encargados={encargados} onCerrar={() => setEditando(false)} />}
    </section>
  )
}
