'use client'

import { useState } from 'react'
import { instruccionParaClaude, type PasoConEstado } from '@/lib/landscape/pasos'

/**
 * Los pasos de una etapa del Landscape, como lista de chequeo. Cada paso trae su acción en
 * el mismo renglón —copiar la instrucción para Claude, marcarlo hecho— así que no hace
 * falta entrar a ningún lado para resolver lo chico. Lo que se revisa o se elige vive en
 * el documento de la etapa, debajo: el renglón sólo apunta ahí.
 */

const BOTON = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none'
export const BOTON_PRIMARIO = `${BOTON} bg-[var(--ink)] text-white hover:bg-[#2b2720]`
export const BOTON_SECUNDARIO = `${BOTON} border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]`

/**
 * Copia un texto para pegarlo en claude.ai. Después del primer uso deja a mano el link a
 * claude.ai: es a donde va la instrucción, y así no hay que explicarlo con un párrafo.
 */
export function BotonCopiar({ texto, etiqueta, principal }: { texto: string; etiqueta: string; principal?: boolean }) {
  const [copiado, setCopiado] = useState(false)
  const [usado, setUsado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setUsado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      setCopiado(false)
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" onClick={copiar} className={principal ? BOTON_PRIMARIO : BOTON_SECUNDARIO}>
        {copiado ? '✓ Copiada' : etiqueta}
      </button>
      {usado && (
        <a href="https://claude.ai/projects" target="_blank" rel="noreferrer" className="text-[13px] font-medium text-[var(--ink)] underline underline-offset-2">
          Pegar en claude.ai ↗
        </a>
      )}
    </span>
  )
}

function Icono({ estado }: { estado: PasoConEstado['estado'] }) {
  if (estado === 'hecho') {
    return (
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill="var(--banana)" />
        <path d="M5.4 9.3 L7.9 11.8 L12.6 6.4" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (estado === 'revisar') return <span className="m-[3px] block h-[12px] w-[12px] rounded-full bg-[var(--banana)] ring-1 ring-[var(--ink)]" aria-hidden="true" />
  if (estado === 'no_aplica') return <span className="block h-[18px] w-[18px] rounded-full border border-dashed border-[var(--apagado)]" aria-hidden="true" />
  return <span className="block h-[18px] w-[18px] rounded-full border-[1.5px] border-[var(--apagado)]" aria-hidden="true" />
}

const LEIDO: Record<PasoConEstado['estado'], string> = {
  hecho: 'listo',
  revisar: 'por revisar',
  pendiente: 'pendiente',
  no_aplica: 'no aplica',
}

const DISCRETO = 'text-[12.5px] text-[var(--rotulo)] underline-offset-2 hover:text-[var(--ink)] hover:underline'
const LINK_AL_DOCUMENTO = 'inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] bg-[var(--banana)] px-2 py-[3px] text-[12.5px] font-semibold text-[var(--ink)] hover:underline'

/** Lo que va a la derecha de un paso: la acción que lo hace avanzar, o nada si ya está. */
function Accion({ paso, proyecto, principal, guardando, onMarcar }: {
  paso: PasoConEstado
  proyecto: string
  principal: boolean
  guardando: boolean
  onMarcar: (id: string, hecho: boolean) => void
}) {
  const manual = paso.donde !== 'plataforma'
  const marcar = (
    <button type="button" onClick={() => onMarcar(paso.id, true)} disabled={guardando}
      className={principal && paso.turno === 'equipo' ? BOTON_PRIMARIO : BOTON_SECUNDARIO}>
      {guardando ? 'Guardando…' : 'Marcar hecho'}
    </button>
  )

  switch (paso.turno) {
    case 'claude':
      return (
        <>
          <BotonCopiar texto={instruccionParaClaude(paso, proyecto)} etiqueta="Copiar instrucción" principal={principal} />
          {manual && marcar}
        </>
      )
    case 'equipo':
      return manual ? marcar : <a href="#documento" className={LINK_AL_DOCUMENTO}>Elige abajo ↓</a>
    case 'revisar':
      return <a href="#documento" className={LINK_AL_DOCUMENTO}>Por revisar ↓</a>
    case 'no_aplica':
      return <span className="font-mono text-[11px] uppercase tracking-[.08em] text-[var(--rotulo)]">No aplica</span>
    case 'listo':
      return manual ? (
        <button type="button" onClick={() => onMarcar(paso.id, false)} disabled={guardando} className={DISCRETO}>
          Deshacer
        </button>
      ) : (
        // Lo hecho en la plataforma es un documento: el renglón lleva a su parte, abajo.
        <a href={`#paso-doc-${paso.id}`} className={DISCRETO}>Ver ↓</a>
      )
  }
}

export function ListaDePasos({ pasos, foco, proyecto, guardando, onMarcar }: {
  /** Los pasos de la etapa, en orden. */
  pasos: PasoConEstado[]
  /** El paso que se resalta: el que pidió la URL o el primero que falta. */
  foco?: string
  proyecto: string
  /** El paso que se está guardando, si hay uno. */
  guardando: string | null
  onMarcar: (id: string, hecho: boolean) => void
}) {
  return (
    <ol aria-label="Pasos de la etapa" className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
      {pasos.map(p => {
        const enFoco = p.id === foco
        const abierto = p.estado === 'pendiente' || p.estado === 'revisar'
        return (
          <li
            key={p.id}
            id={`paso-${p.id}`}
            aria-current={enFoco ? 'step' : undefined}
            className={`flex scroll-mt-8 flex-col gap-3 border-t border-[var(--line)] px-5 py-4 first:border-t-0 sm:flex-row sm:items-center sm:gap-6 ${
              enFoco ? 'bg-[color-mix(in_oklab,var(--banana)_16%,white)] shadow-[inset_3px_0_0_var(--banana)]' : ''
            }`}
          >
            <div className="flex min-w-0 flex-1 gap-3.5">
              <span className="mt-[1px] flex-none"><Icono estado={p.estado} /></span>
              <div className="min-w-0">
                <p className="flex items-baseline gap-2.5 leading-snug">
                  <span className="font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{p.id}</span>
                  <span className={`text-[15px] ${
                    abierto ? 'font-semibold text-[var(--ink)]' : p.estado === 'no_aplica' ? 'text-[var(--apagado)]' : 'text-[var(--secundario)]'
                  }`}>{p.titulo}</span>
                  <span className="sr-only">({LEIDO[p.estado]})</span>
                </p>
                {abierto && <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[1.5] text-[var(--secundario)]">{p.queEs}</p>}
              </div>
            </div>
            <div className="flex flex-none flex-wrap items-center gap-2 pl-[32px] sm:pl-0">
              <Accion paso={p} proyecto={proyecto} principal={enFoco} guardando={guardando === p.id} onMarcar={onMarcar} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
