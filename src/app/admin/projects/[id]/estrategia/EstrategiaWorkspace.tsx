'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BLOQUES, ETAPA_LABEL, ETAPA_ORDER, type EstrategiaKey, type EtapaEstrategia } from '@/lib/estrategia/stages'
import { mensajeEstrategia, type QueSigueEstrategia } from '@/lib/estrategia/sigue'
import { ContenidoEtapa } from '../landscape/ContenidoEtapa'
import { ComparadorVersiones } from '@/components/ComparadorVersiones'
import { AvisoVersionNueva, NotaDependencia } from '@/components/EtapaPartes'
import { BarraDeRevision, BOTON_PRIMARIO, Franja, SeguirEnClaude } from '@/components/paso/piezas'

export type ContenidoEstrategiaVista = {
  id: string
  content: unknown
  aprobada: boolean
  /** “Escrito por Claude · hace 2 h · sin aprobar”: se arma en el servidor, con la hora del servidor. */
  procedencia: string
  /** Cuándo se escribió. Es la cabecera de su columna en el comparador. */
  cuando: string
  /** Lo que Claude guardó después de la aprobación. Ver `StrategyStageState.borradorNuevo`. */
  borradorNuevo: { id: string; content: unknown; cuando: string; autor: string } | null
} | null

type EstadoEtapa = 'listo' | 'revisar' | 'claude' | 'sin_empezar' | 'no_aplica'

const CHIP: Record<EstadoEtapa, { texto: string; clase: string }> = {
  listo: { texto: 'Listo', clase: 'bg-[var(--aprobado)] text-[var(--ink)]' },
  revisar: { texto: 'Por revisar', clase: 'bg-[var(--banana)] text-[var(--ink)]' },
  claude: { texto: 'Le toca a Claude', clase: 'border border-[var(--ink)] text-[var(--ink)]' },
  sin_empezar: { texto: 'Sin empezar', clase: 'text-[var(--rotulo)]' },
  no_aplica: { texto: 'No aplica', clase: 'text-[var(--apagado)]' },
}

/**
 * Toda la Estrategia en una página, como el Landscape: arriba lo que sigue y de quién es;
 * debajo, las catorce etapas agrupadas en los bloques del proceso, abierta la que tiene
 * trabajo. El trabajo se hace en el chat de Claude; acá se lee y se aprueba.
 */
export function EstrategiaWorkspace({
  projectId,
  proyecto,
  irA,
  etapas,
  contenidoPorEtapa,
  sigue,
  dependencia,
}: {
  projectId: string
  /** El nombre del proyecto, para el mensaje que se lleva a Claude. */
  proyecto: string
  /** La etapa que pidió el link (`?etapa=`): se abre y se baja hasta ella. */
  irA?: EstrategiaKey
  etapas: EtapaEstrategia[]
  contenidoPorEtapa: Record<string, ContenidoEstrategiaVista>
  /** Lo que sigue en toda la Estrategia, o nada si está completa. */
  sigue?: QueSigueEstrategia
  /** Lo que esta fase necesita de otra y todavía no llegó, si hay algo. */
  dependencia?: string
}) {
  const router = useRouter()
  const [guardando, setGuardando] = useState<EstrategiaKey | null>(null)
  const [error, setError] = useState<{ donde: EstrategiaKey; texto: string } | null>(null)
  // Las etapas donde el equipo pidió mirar sólo la aprobada: estado de vista, no decide nada.
  const [soloAprobada, setSoloAprobada] = useState<EstrategiaKey[]>([])
  // Lo que el equipo abrió o cerró a mano; lo demás sigue lo que pasa en el proyecto.
  const [plegado, setPlegado] = useState<Partial<Record<EstrategiaKey, boolean>>>({})

  // Claude guarda desde claude.ai, en otra pestaña: al volver, se trae lo nuevo.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [router])

  useEffect(() => {
    if (irA) document.getElementById(irA)?.scrollIntoView({ block: 'start' })
  }, [irA])

  async function enviar(etapa: EstrategiaKey, body: unknown, fallo: string) {
    setGuardando(etapa)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/estrategia/${etapa}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? fallo)
      router.refresh()
    } catch (e) {
      setError({ donde: etapa, texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setGuardando(null)
    }
  }
  const aprobar = (etapa: EstrategiaKey, versionId: string) => enviar(etapa, { accion: 'aprobar', versionId }, 'No se pudo aprobar')
  // La otra salida del conflicto: el equipo se queda con lo que ya había aprobado.
  const mantener = (etapa: EstrategiaKey) => enviar(etapa, { accion: 'reafirmar' }, 'No se pudo mantener la versión aprobada')

  const estadoDe = (e: EtapaEstrategia): EstadoEtapa => {
    const c = contenidoPorEtapa[e.key]
    if (e.status === 'no_aplica') return 'no_aplica'
    if (c && (!c.aprobada || c.borradorNuevo)) return 'revisar'
    if (e.status === 'aprobada') return 'listo'
    return sigue?.key === e.key ? 'claude' : 'sin_empezar'
  }
  const abiertaPorDefecto = (k: EstrategiaKey) => k === irA || k === sigue?.key
  const abierta = (k: EstrategiaKey) => !(plegado[k] ?? !abiertaPorDefecto(k))

  const aprobadas = etapas.filter(e => e.status === 'aprobada').length
  const aplicables = etapas.filter(e => e.status !== 'no_aplica').length

  function cuerpo(e: EtapaEstrategia) {
    const contenido = contenidoPorEtapa[e.key] ?? null
    const borradorNuevo = contenido?.borradorNuevo ?? null
    const errorEtapa = error?.donde === e.key ? error.texto : null
    if (!contenido) {
      return (
        <p className="rounded-[12px] border border-dashed border-[#CFC9BA] px-6 py-6 text-[14px] leading-[1.6] text-[var(--secundario)]">
          {e.key === 'cuadros'
            ? 'Claude arma acá los cuadros finales con lo que la esencia ya tiene aprobado.'
            : `Claude escribe acá ${ETAPA_LABEL[e.key]} cuando se lo pidan en el chat.`}
        </p>
      )
    }
    if (borradorNuevo && !soloAprobada.includes(e.key)) {
      return (
        <>
          <ComparadorVersiones
            aprobada={{ content: contenido.content, cuando: contenido.cuando }}
            nueva={{ content: borradorNuevo.content, cuando: borradorNuevo.cuando, autor: borradorNuevo.autor }}
            onMantener={() => mantener(e.key)}
            onVerSoloAprobada={() => setSoloAprobada(prev => [...prev, e.key])}
            onAprobarNueva={() => aprobar(e.key, borradorNuevo.id)}
            guardando={guardando === e.key}
          />
          {errorEtapa && <p className="mt-3 text-[13px] text-[var(--error)]">{errorEtapa}</p>}
        </>
      )
    }
    return (
      <>
        {borradorNuevo && (
          <div className="mb-6">
            <AvisoVersionNueva autor={borradorNuevo.autor} cuando={borradorNuevo.cuando}
              onVer={() => setSoloAprobada(prev => prev.filter(k => k !== e.key))} />
          </div>
        )}
        <p className="mb-6 text-[12.5px] text-[var(--rotulo)]">{contenido.procedencia}</p>
        <ContenidoEtapa content={contenido.content} />
        {!contenido.aprobada && (
          <BarraDeRevision
            procedencia={contenido.procedencia}
            instruccionCambios={`Ajustemos ${ETAPA_LABEL[e.key]}, de la Estrategia de ${proyecto}. Lee lo que ya está guardado y cámbialo así:\n`}
            onAprobar={() => aprobar(e.key, contenido.id)}
            guardando={guardando === e.key}
            error={errorEtapa}
          />
        )}
      </>
    )
  }

  const franja = !sigue
    ? <Franja titulo="La Estrategia está completa." />
    : sigue.turno === 'revisar'
      ? (
        <Franja de="equipo" quien="Te toca revisar" titulo={ETAPA_LABEL[sigue.key]} texto="Claude guardó un borrador. Léelo y apruébalo, o pide cambios.">
          <a href={`#${sigue.key}`} className={`${BOTON_PRIMARIO} px-4 py-2 text-[14px]`}>Revisar <span aria-hidden="true">↓</span></a>
        </Franja>
      )
      : (
        <Franja de="claude" quien="Le toca a Claude" titulo={ETAPA_LABEL[sigue.key]}
          texto={sigue.key === 'cuadros' ? 'Los cuadros finales se arman con lo que la esencia ya tiene aprobado.' : 'Claude la trabaja desde lo aprobado del Landscape y de la Estrategia.'}>
          <SeguirEnClaude mensaje={mensajeEstrategia(sigue.key, proyecto)} proyecto={proyecto} fase="la Estrategia" />
        </Franja>
      )

  const porKey = new Map(etapas.map(e => [e.key, e]))

  return (
    <div className="max-w-[860px]">
      <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">
        Estrategia · {aprobadas} de {aplicables} etapas aprobadas
      </p>
      <h1 className="mt-3 font-serif text-[38px] leading-[1.1] tracking-[-.025em] text-[var(--ink)]">
        <span className="underline-banana">Estrategia</span>
      </h1>
      {dependencia && <NotaDependencia texto={dependencia} />}

      {franja}

      {BLOQUES.map(bloque => (
        <div key={bloque.titulo} className="mt-12">
          <p className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{bloque.titulo}</p>
          <div className="mt-2 border-b border-[var(--line)]">
            {bloque.etapas.map(key => {
              const e = porKey.get(key) ?? { key, label: ETAPA_LABEL[key], status: 'pendiente' as const }
              const estado = estadoDe(e)
              const chip = CHIP[estado]
              const abiertaAhora = abierta(key)
              const n = ETAPA_ORDER.indexOf(key) + 1
              return (
                <section key={key} id={key} aria-labelledby={`titulo-${key}`} className="scroll-mt-6 border-t border-[var(--line)]">
                  <h2 id={`titulo-${key}`}>
                    <button
                      type="button"
                      aria-expanded={abiertaAhora}
                      aria-controls={`cuerpo-${key}`}
                      onClick={() => setPlegado(prev => ({ ...prev, [key]: abiertaAhora }))}
                      className="group flex w-full items-center gap-4 py-4 text-left"
                    >
                      <span className="w-6 flex-none font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{String(n).padStart(2, '0')}</span>
                      <span className={`min-w-0 flex-1 font-serif text-[21px] leading-[1.2] tracking-[-.015em] group-hover:underline group-hover:decoration-[var(--line)] group-hover:underline-offset-4 ${
                        estado === 'sin_empezar' || estado === 'no_aplica' ? 'text-[var(--secundario)]' : 'text-[var(--ink)]'
                      }`}>
                        {e.label}
                      </span>
                      <span className={`flex-none rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${chip.clase}`}>{chip.texto}</span>
                      <span aria-hidden="true" className={`flex-none text-[13px] text-[var(--rotulo)] transition-transform duration-150 motion-reduce:transition-none ${abiertaAhora ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                  </h2>
                  {abiertaAhora && (
                    <div id={`cuerpo-${key}`} className="pb-10 pl-10 max-sm:pl-0">{cuerpo(e)}</div>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
