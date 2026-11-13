'use client'

import { useState } from 'react'
import { STAGE_LABEL } from '@/lib/landscape/stages'
import { mensajeParaSeguir, type PasoConEstado } from '@/lib/landscape/pasos'

/**
 * Las piezas con las que el Landscape se trabaja entre las dos pantallas: la franja de lo
 * que sigue (con el botón que lleva a Claude), los pendientes que el equipo resuelve por
 * fuera y el botón de copiar. El trabajo se hace en el chat; acá se ve y se decide.
 */

const BOTON = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none'
export const BOTON_PRIMARIO = `${BOTON} bg-[var(--primario)] text-white hover:brightness-110`
export const BOTON_SECUNDARIO = `${BOTON} border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]`

const CLAUDE_AI = 'https://claude.ai/projects'

/** Copia un texto para pegarlo en claude.ai. Después del primer uso deja a mano el link. */
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
        {copiado ? '✓ Copiado' : etiqueta}
      </button>
      {usado && (
        <a href={CLAUDE_AI} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-[var(--ink)] underline underline-offset-2">
          Pegar en claude.ai ↗
        </a>
      )}
    </span>
  )
}

/**
 * Copia el mensaje para seguir y abre claude.ai, en un clic. Primero copia y después abre:
 * la pestaña nueva se lleva el foco, y sin foco el portapapeles no deja escribir.
 */
export function SeguirEnClaude({ mensaje, proyecto, fase = 'el Landscape', junto }: {
  mensaje: string
  proyecto: string
  /** Qué se trabaja en ese chat: "el Landscape", "la Estrategia". */
  fase?: string
  /** Otra acción que va al lado del botón. */
  junto?: React.ReactNode
}) {
  const [copiado, setCopiado] = useState(false)
  async function seguir() {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
    window.open(CLAUDE_AI, '_blank', 'noopener')
  }
  return (
    <>
      <button type="button" onClick={seguir} className={`${BOTON_PRIMARIO} px-4 py-2 text-[14px]`}>
        Seguir en Claude <span aria-hidden="true">↗</span>
      </button>
      {junto}
      <p role="status" className="basis-full text-[13px] leading-[1.5] text-[var(--secundario)]">
        {copiado
          ? <>✓ Mensaje copiado. Pégalo en el chat de {proyecto}: Claude lo guarda acá y esta página se actualiza sola.</>
          : <>Copia el mensaje y abre claude.ai. Todo {fase} va en el mismo chat: Claude sabe en qué va.</>}
      </p>
    </>
  )
}

/**
 * La franja de arriba de cada fase: qué sigue, de quién es y el botón que lo mueve. Sin
 * `de`, es la franja de una fase terminada.
 */
export function Franja({ de, quien, titulo, texto, children }: {
  de?: 'claude' | 'equipo'
  quien?: string
  titulo: string
  texto?: string
  children?: React.ReactNode
}) {
  if (!de) {
    return (
      <div className="mt-8 rounded-[14px] border border-[var(--line)] bg-white px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">Lo que sigue</p>
        <p className="mt-1.5 font-serif text-[22px] leading-[1.25] text-[var(--ink)]">{titulo}</p>
      </div>
    )
  }
  return (
    <div className="mt-8 rounded-[14px] border border-[var(--ink)] bg-white px-6 py-5 shadow-[0_1px_0_var(--ink)]">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">
        <span className={`h-[7px] w-[7px] rounded-full ${de === 'claude' ? 'border border-[var(--ink)]' : 'bg-[var(--banana)] ring-1 ring-[var(--ink)]'}`} aria-hidden="true" />
        Lo que sigue · {quien}
      </p>
      <p className="mt-1.5 font-serif text-[22px] leading-[1.25] text-[var(--ink)]">{titulo}</p>
      {texto && <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.55] text-[var(--secundario)]">{texto}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2.5">{children}</div>
    </div>
  )
}

/**
 * La barra donde se aprueba lo que Claude entregó. Queda pegada abajo mientras se lee:
 * se decide al terminar de leer, sin volver a subir.
 */
export function BarraDeRevision({ procedencia, instruccionCambios, onAprobar, guardando, error }: {
  procedencia: string
  instruccionCambios: string
  onAprobar: () => void
  guardando: boolean
  error: string | null
}) {
  return (
    <div className="sticky bottom-4 z-10 mt-10 flex flex-col gap-3 rounded-[14px] border border-[var(--ink)] bg-white/95 px-5 py-3.5 shadow-[0_8px_24px_rgba(21,18,12,.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[var(--ink)]">Por revisar</p>
        <p className="text-[12.5px] leading-snug text-[var(--secundario)]">{procedencia}</p>
        {error && <p className="mt-1 text-[13px] text-[var(--error)]">{error}</p>}
      </div>
      <div className="flex flex-none flex-wrap items-center gap-2">
        <BotonCopiar texto={instruccionCambios} etiqueta="Pedir cambios" />
        <button type="button" onClick={onAprobar} disabled={guardando} className={`${BOTON_PRIMARIO} px-4 py-2`}>
          {guardando ? 'Aprobando…' : 'Aprobar'}
        </button>
      </div>
    </div>
  )
}

/**
 * Lo único que la pantalla pone adelante: qué sigue, de quién es y el botón que lo mueve.
 * Si le toca a Claude, el botón lleva al chat; si al equipo, a la sección donde se decide.
 */
export function LoQueSigue({ paso, proyecto, guardando, onMarcar }: {
  /** El paso que sigue en todo el Landscape, o nada si ya está completo. */
  paso?: PasoConEstado
  proyecto: string
  guardando: boolean
  onMarcar: (id: string, hecho: boolean) => void
}) {
  if (!paso) return <Franja titulo="El Landscape está completo." />

  const quien = paso.turno === 'claude' ? 'Le toca a Claude' : paso.turno === 'revisar' ? 'Te toca revisar' : 'Te toca'
  // Una pieza (los casos, el brand assets) se nombra a sí misma; una etapa, por su sección.
  const titulo = paso.turno === 'revisar' && !paso.pieza ? STAGE_LABEL[paso.etapa] : paso.titulo
  const texto = paso.turno === 'revisar'
    ? 'Claude guardó un borrador. Léelo y apruébalo, o pide cambios.'
    : paso.queEs

  const irALaSeccion = (etiqueta: string) => (
    <a href={`#${paso.pieza ?? paso.etapa}`} className={`${BOTON_PRIMARIO} px-4 py-2 text-[14px]`}>{etiqueta} <span aria-hidden="true">↓</span></a>
  )
  const marcarHecho = (etiqueta: string, principal: boolean) => (
    <button type="button" onClick={() => onMarcar(paso.id, true)} disabled={guardando}
      className={principal ? `${BOTON_PRIMARIO} px-4 py-2 text-[14px]` : BOTON_SECUNDARIO}>
      {guardando ? 'Guardando…' : etiqueta}
    </button>
  )

  let acciones: React.ReactNode
  if (paso.turno === 'claude') {
    acciones = (
      <SeguirEnClaude
        mensaje={mensajeParaSeguir(paso, proyecto)}
        proyecto={proyecto}
        // Lo que Claude da en el chat no llega solo: el equipo dice cuándo ya está en el deck.
        junto={paso.donde === 'chat' && marcarHecho('Ya está en el deck', false)}
      />
    )
  } else if (paso.turno === 'revisar') {
    acciones = irALaSeccion('Revisar')
  } else {
    acciones = paso.donde === 'plataforma' ? irALaSeccion('Elegir') : marcarHecho('Marcar hecho', true)
  }

  return <Franja de={paso.turno === 'claude' ? 'claude' : 'equipo'} quien={quien} titulo={titulo} texto={texto}>{acciones}</Franja>
}

/**
 * Lo que el equipo resuelve fuera de la plataforma (Dropbox, el deck, el cliente): una
 * casilla por cosa, dentro de la sección a la que pertenece. Marcarla no abre nada.
 */
export function PorFuera({ pasos, guardando, onMarcar }: {
  pasos: PasoConEstado[]
  /** El id del paso que se está guardando, si hay uno. */
  guardando: string | null
  onMarcar: (id: string, hecho: boolean) => void
}) {
  if (!pasos.length) return null
  return (
    <fieldset className="mt-8">
      <legend className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">Por fuera de la plataforma</legend>
      <ul className="mt-2.5 divide-y divide-[var(--line)] rounded-[12px] border border-[var(--line)] bg-white">
        {pasos.map(p => {
          const hecho = p.estado === 'hecho'
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-start gap-3.5 px-4 py-3 has-[:disabled]:cursor-wait">
                <input
                  type="checkbox"
                  checked={hecho}
                  disabled={guardando === p.id}
                  onChange={() => onMarcar(p.id, !hecho)}
                  className="mt-[3px] h-[16px] w-[16px] flex-none accent-[var(--ink)]"
                />
                <span className="min-w-0">
                  <span className={`block text-[14.5px] leading-snug ${hecho ? 'text-[var(--secundario)] line-through decoration-[var(--apagado)]' : 'font-medium text-[var(--ink)]'}`}>
                    {p.titulo}
                  </span>
                  {!hecho && (
                    <span className="mt-0.5 block text-[13px] leading-[1.5] text-[var(--secundario)]">
                      {p.donde === 'chat' ? 'Claude lo hace en el chat; va al deck.' : p.queEs}
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
