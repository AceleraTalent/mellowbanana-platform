'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PasoConEstado, Turno } from '@/lib/landscape/pasos'

/**
 * El panel de la derecha. Responde una sola pregunta: ¿qué me toca ahora? Arriba dice de
 * quién es el turno; debajo, qué hacer, en orden, con un solo botón principal. Lo demás
 * (qué necesita el paso, cuándo está listo) queda plegado al final.
 */

const INSIGNIA: Record<Turno, { texto: string; icono: string; clase: string }> = {
  claude: { texto: 'Le toca a Claude', icono: '✦', clase: 'bg-[var(--ink)] text-white' },
  revisar: { texto: 'Te toca revisar', icono: '!', clase: 'bg-[var(--banana)] text-[var(--ink)]' },
  equipo: { texto: 'Te toca a ti', icono: '●', clase: 'bg-[var(--banana)] text-[var(--ink)]' },
  listo: { texto: 'Listo', icono: '✓', clase: 'bg-[var(--aprobado)] text-[var(--ink)]' },
  no_aplica: { texto: 'No aplica', icono: '–', clase: 'bg-[var(--superficie)] text-[var(--secundario)]' },
}

const TURNO_CORTO: Record<Turno, string> = {
  claude: 'Le toca a Claude',
  revisar: 'Te toca revisar',
  equipo: 'Te toca a ti',
  listo: 'Listo',
  no_aplica: 'No aplica',
}

const BOTON = 'inline-flex w-full items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-[14px] font-semibold transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'
const PRIMARIO = `${BOTON} bg-[var(--banana)] text-[var(--ink)] hover:opacity-90`
const SECUNDARIO = `${BOTON} border border-[var(--line)] bg-white font-medium text-[var(--ink)] hover:border-[var(--ink)]`

function BotonCopiar({ texto, etiqueta, principal }: { texto: string; etiqueta: string; principal?: boolean }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      setCopiado(false)
    }
  }
  return (
    <button type="button" onClick={copiar} className={principal ? PRIMARIO : SECUNDARIO}>
      {copiado ? '✓ Copiada' : etiqueta}
    </button>
  )
}

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-[var(--line)] bg-white font-mono text-[11px] text-[var(--ink)]">{n}</span>
      <div className="min-w-0 flex-1 text-[14px] leading-[1.55] text-[var(--cuerpo)]">{children}</div>
    </li>
  )
}

export interface SiguientePaso {
  id: string
  titulo: string
  turno: Turno
  href: string
}

export function PanelTurno(props: {
  paso: PasoConEstado
  etapaLabel: string
  avance: { hechos: number; total: number }
  siguiente?: SiguientePaso
  instruccion: string
  instruccionCambios: string
  /** “hace 2 h”: cuándo llegó el borrador que hay que revisar, o cuándo se aprobó. */
  cuando?: string
  /** Los pasos que se aprueban juntos con este, porque Claude los guardó en un solo borrador. */
  apruebaJuntos: string[]
  /** Hay una versión nueva encima de una aprobada: la decisión se toma en el comparador. */
  enConflicto: boolean
  onAprobar?: () => void
  onMarcar?: (hecho: boolean) => void
  guardando: boolean
  error: string | null
}) {
  const { paso, etapaLabel, avance, siguiente, instruccion, instruccionCambios, cuando, apruebaJuntos, enConflicto, onAprobar, onMarcar, guardando, error } = props
  const router = useRouter()
  const insignia = INSIGNIA[paso.turno]
  const manual = paso.donde !== 'plataforma'
  const porcentaje = avance.total ? Math.round((avance.hechos / avance.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between text-[12px] text-[var(--secundario)]">
          <span>Landscape</span>
          <span className="tabular-nums"><b className="font-semibold text-[var(--ink)]">{avance.hechos}</b> de {avance.total} pasos listos</span>
        </div>
        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true">
          <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>

      <section aria-label="Qué te toca ahora" className="rounded-[16px] border border-[var(--line)] bg-white p-5 shadow-[0_1px_0_rgba(21,18,12,.03)]">
        <p className="text-[11px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)]">Paso {paso.id} · {etapaLabel}</p>
        <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${insignia.clase}`}>
          <span aria-hidden="true">{insignia.icono}</span>{insignia.texto}
        </p>
        <h2 className="mt-3 font-serif text-[21px] leading-[1.25] tracking-[-.01em] text-[var(--ink)]">{paso.titulo}</h2>

        {paso.turno === 'claude' && (
          <div className="mt-4">
            <p className="text-[12px] font-semibold text-[var(--ink)]">Cómo hacerlo</p>
            <ol className="mt-3 space-y-3.5">
              <Paso n={1}>
                Copia la instrucción para Claude.
                <div className="mt-2"><BotonCopiar texto={instruccion} etiqueta="Copiar instrucción" principal /></div>
              </Paso>
              <Paso n={2}>
                Pégala en el proyecto de M&amp;B en{' '}
                <a href="https://claude.ai/projects" target="_blank" rel="noreferrer" className="font-medium text-[var(--ink)] underline underline-offset-2">claude.ai ↗</a>
              </Paso>
              {manual ? (
                <>
                  <Paso n={3}>Cuando Claude te lo entregue en el chat, pásalo al deck.</Paso>
                  <Paso n={4}>
                    Márcalo como hecho.
                    <div className="mt-2">
                      <button type="button" onClick={() => onMarcar?.(true)} disabled={guardando} className={SECUNDARIO}>
                        {guardando ? 'Guardando…' : 'Marcar como hecho'}
                      </button>
                    </div>
                  </Paso>
                </>
              ) : (
                <Paso n={3}>
                  Cuando Claude te diga que guardó, el borrador aparece en el centro para que lo revises.
                  <div className="mt-2">
                    <button type="button" onClick={() => router.refresh()} className={SECUNDARIO}>Ya guardó, mostrarlo</button>
                  </div>
                </Paso>
              )}
            </ol>
          </div>
        )}

        {paso.turno === 'revisar' && (
          <div className="mt-3 space-y-4">
            {enConflicto ? (
              <p className="text-[14px] leading-[1.55] text-[var(--cuerpo)]">
                Claude escribió una versión nueva después de la que ya estaba aprobada. Compáralas en el centro y elige con cuál te quedas.
              </p>
            ) : (
              <>
                <p className="text-[14px] leading-[1.55] text-[var(--cuerpo)]">
                  Claude entregó el borrador{cuando ? ` ${cuando}` : ''}. Léelo en el centro y, si está bien, apruébalo.
                </p>
                <button type="button" onClick={onAprobar} disabled={guardando} className={PRIMARIO}>
                  {guardando ? 'Aprobando…' : 'Aprobar'}
                </button>
                {apruebaJuntos.length > 1 && (
                  <p className="text-[12.5px] leading-[1.5] text-[var(--secundario)]">
                    Se aprueban juntos los pasos {apruebaJuntos.join(' y ')}: Claude los guardó en un solo borrador.
                  </p>
                )}
                <div className="border-t border-[var(--line)] pt-4">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">¿Hay que cambiar algo?</p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-[var(--secundario)]">Copia el pedido, pégalo en claude.ai y escribe qué cambiar.</p>
                  <div className="mt-2.5"><BotonCopiar texto={instruccionCambios} etiqueta="Pedirle cambios a Claude" /></div>
                </div>
              </>
            )}
          </div>
        )}

        {paso.turno === 'equipo' && (
          <div className="mt-3 space-y-4">
            <p className="text-[14px] leading-[1.55] text-[var(--cuerpo)]">
              {manual ? 'Cuando esté hecho, márcalo para que el equipo lo vea.' : 'Este paso lo decide el equipo, acá en la plataforma.'}
            </p>
            {manual ? (
              <button type="button" onClick={() => onMarcar?.(true)} disabled={guardando} className={PRIMARIO}>
                {guardando ? 'Guardando…' : 'Marcar como hecho'}
              </button>
            ) : (
              <p className="rounded-[10px] bg-[var(--superficie)] px-3.5 py-3 text-[13.5px] leading-[1.5] text-[var(--cuerpo)]">
                Elige en el centro y confirma con el botón de abajo.
              </p>
            )}
          </div>
        )}

        {(paso.turno === 'listo' || paso.turno === 'no_aplica') && (
          <div className="mt-3 space-y-4">
            <p className="text-[14px] leading-[1.55] text-[var(--cuerpo)]">
              {paso.turno === 'no_aplica'
                ? 'Este paso no se hace en este proyecto: solo aplica en rebranding.'
                : manual
                  ? 'El equipo lo marcó como hecho.'
                  : `El equipo lo aprobó${cuando ? ` ${cuando}` : ''}.`}
            </p>
            {siguiente ? (
              <div className="rounded-[12px] bg-[var(--superficie)] p-3.5">
                <p className="text-[11px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)]">Lo que sigue</p>
                <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-[var(--ink)]">{siguiente.id} · {siguiente.titulo}</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--secundario)]">{TURNO_CORTO[siguiente.turno]}</p>
                <Link href={siguiente.href} className={`${PRIMARIO} mt-3`}>Ir al paso <span aria-hidden="true">→</span></Link>
              </div>
            ) : (
              <p className="rounded-[12px] bg-[var(--aprobado)] p-3.5 text-[14px] font-medium text-[var(--ink)]">No queda nada pendiente en el Landscape.</p>
            )}
            {manual && paso.turno === 'listo' && (
              <button type="button" onClick={() => onMarcar?.(false)} disabled={guardando}
                className="text-[12.5px] text-[var(--secundario)] underline underline-offset-2 hover:text-[var(--ink)]">
                Desmarcar
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-[13px] text-[var(--error)]">{error}</p>}

        <details className="group mt-5 border-t border-[var(--line)] pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium text-[var(--secundario)] hover:text-[var(--ink)]">
            Sobre este paso <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <dl className="mt-3 space-y-2.5 text-[13px] leading-[1.5]">
            {([['Qué es', paso.queEs], ['Quién', paso.quienTexto], ['Necesita', paso.necesita], ['Listo cuando', paso.listoCuando]] as const).map(([r, v]) => (
              <div key={r}>
                <dt className="text-[var(--rotulo)]">{r}</dt>
                <dd className="text-[var(--cuerpo)]">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>
    </div>
  )
}
