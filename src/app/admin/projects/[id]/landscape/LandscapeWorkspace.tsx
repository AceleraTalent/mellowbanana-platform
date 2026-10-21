'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EJES, MIN_TENDENCIAS, MAX_TENDENCIAS, PUEDEN_NO_APLICAR, STAGE_ORDER, STAGE_LABEL,
  type StageKey, type TendenciaCandidata,
} from '@/lib/landscape/stages'
import { pasoQueSigue, tieneContenido, type PasoConEstado } from '@/lib/landscape/pasos'
import { PIEZAS, PIEZA_LABEL, type PiezaKey } from '@/lib/landscape/piezas'
import { ComparadorVersiones } from '@/components/ComparadorVersiones'
import { AvisoVersionNueva, NotaDependencia } from '@/components/EtapaPartes'
import { BotonCopiar, BOTON_PRIMARIO, LoQueSigue, PorFuera } from '@/components/paso/piezas'
import { FuentesEnLinea } from '@/components/documento/bloques'
import {
  VistaBenchmarking, VistaBrandAssets, VistaCasos, VistaCirculo, VistaContexto, VistaDesarrollo, VistaDiagnostico,
  VistaEnfoque, VistaFuentes, VistaGenerica, VistaListaLarga,
} from '@/components/documento/vistas'

/** Lo que la página le pasa al panel: ya formateado, sin fechas crudas. */
export interface ActividadVista {
  id: string
  autor: 'claude' | 'humano'
  quien?: string
  texto: string
  cuando: string
}

export type ContenidoEtapaVista = {
  id: string
  content: unknown
  aprobada: boolean
  /** “Escrito por Claude · hace 2 h · sin aprobar”: se arma en el servidor, con la hora del servidor. */
  procedencia: string
  /** Cuándo se escribió. Es la cabecera de su columna en el comparador. */
  cuando: string
  /** Lo que Claude guardó después de la aprobación. Ver `StageState.borradorNuevo`. */
  borradorNuevo: { id: string; content: unknown; cuando: string; autor: string } | null
} | null

/**
 * Una candidata de la lista larga, para elegir. Sigue siendo un `button` con `aria-pressed`:
 * elegirla es el gate humano de la etapa, no un enlace.
 */
function TendenciaElegible({ t, selected, onToggle }: { t: TendenciaCandidata; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex w-full min-w-0 items-start gap-3 rounded-[12px] border p-4 text-left transition-colors duration-200 motion-reduce:transition-none
        ${selected ? 'border-[var(--ink)] bg-[var(--aprobado)]' : 'border-[var(--line)] bg-[#FBFAF6] hover:border-[var(--rotulo)]'}`}
    >
      <span
        className={`mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border transition-colors duration-200 motion-reduce:transition-none
          ${selected ? 'border-[var(--ink)] bg-[var(--banana)]' : 'border-[var(--rotulo)] bg-white'}`}
      >
        {selected && (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold leading-snug text-[var(--ink)]">{t.titulo}</span>
        {/* Recortada: para elegir basta el arranque. Entera se lee con la selección confirmada. */}
        <span className="mt-1.5 line-clamp-4 text-[14px] leading-[1.6] text-[var(--cuerpo)]" title={t.descripcion}>{t.descripcion}</span>
        <span className="mt-2.5 block"><FuentesEnLinea fuentes={t.fuentes} /></span>
      </span>
    </button>
  )
}

/** El historial de la etapa, plegado al pie: se abre cuando se lo busca. */
function Actividad({ actividad }: { actividad: ActividadVista[] }) {
  return (
    <details className="group mt-14 border-t border-[var(--line)] pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-[var(--secundario)] hover:text-[var(--ink)]">
        Historial del proyecto <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
      </summary>
      {actividad.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--apagado)]">Todavía no pasó nada en este proyecto.</p>
      ) : (
        <ul className="mt-1 divide-y divide-[var(--line)]">
          {actividad.map(a => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-1.5 py-2.5 text-[13px] text-[var(--cuerpo)]">
              <span className="font-semibold text-[var(--ink)]">{a.autor === 'claude' ? 'Claude' : a.quien ?? 'Equipo'}</span>
              <span>{a.texto}</span>
              <span className="text-[var(--rotulo)]">· {a.cuando}</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

/** Lo que se ve donde va el documento cuando la sección todavía no tiene nada guardado. */
function Vacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-[12px] border border-dashed border-[#CFC9BA] px-6 py-6 text-[14px] leading-[1.6] text-[var(--secundario)]">
      {texto}
    </p>
  )
}

/** Qué va a aparecer en cada sección, dicho antes de que aparezca. */
const QUE_VA: Record<StageKey, string> = {
  setup: 'Claude propone acá el enfoque desde las entrevistas: la pregunta central, el set competitivo y las fuentes.',
  contexto: 'Claude escribe acá el contexto del sector, con cada cifra y su fuente.',
  tendencias: 'Claude arma acá la lista larga de tendencias, en tres ejes. Después eliges 4 o 5.',
  panorama: 'Claude analiza acá a referentes y competidores: logos, web, redes y experiencia.',
  diagnostico: 'Solo en rebranding: Claude analiza los assets que la marca tiene hoy.',
  entrega: '',
}

/** El documento que produce un paso de la plataforma. */
function DocumentoDelPaso({ paso, content }: { paso: PasoConEstado; content: unknown }) {
  switch (paso.id) {
    case '1.0': return <VistaEnfoque content={content} />
    case '2.1': return <VistaFuentes content={content} />
    case '2.2': return <VistaContexto content={content} hrefFuentes="#fuentes-contexto" />
    case '4.1': return <VistaBenchmarking content={content} />
    case '5.1': return <VistaDiagnostico content={content} />
    default: return <VistaGenerica content={content} />
  }
}

const VISTA_DE_PIEZA: Record<PiezaKey, (p: { content: unknown }) => React.ReactNode> = {
  'tendencias-desarrollo': VistaDesarrollo,
  'tendencias-casos': VistaCasos,
  'panorama-brand-assets': VistaBrandAssets,
  'panorama-circulo': VistaCirculo,
}

type EstadoSeccion = 'listo' | 'revisar' | 'equipo' | 'claude' | 'despues' | 'no_aplica'

const CHIP: Record<EstadoSeccion, { texto: string; clase: string }> = {
  listo: { texto: 'Listo', clase: 'bg-[var(--aprobado)] text-[var(--ink)]' },
  revisar: { texto: 'Por revisar', clase: 'bg-[var(--banana)] text-[var(--ink)]' },
  equipo: { texto: 'Te toca', clase: 'bg-[var(--banana)] text-[var(--ink)]' },
  claude: { texto: 'Le toca a Claude', clase: 'border border-[var(--ink)] text-[var(--ink)]' },
  despues: { texto: 'Más adelante', clase: 'text-[var(--rotulo)]' },
  no_aplica: { texto: 'No aplica', clase: 'text-[var(--apagado)]' },
}

/**
 * El estado de una sección, sacado de sus pasos. Una sección que todavía no empezó y queda
 * después de lo que sigue no es “de Claude” todavía: es “más adelante”.
 */
function estadoDeSeccion(deLaEtapa: PasoConEstado[], despuesDeLoQueSigue: boolean): EstadoSeccion {
  const aplicables = deLaEtapa.filter(p => p.estado !== 'no_aplica')
  if (!aplicables.length) return 'no_aplica'
  if (aplicables.every(p => p.estado === 'hecho')) return 'listo'
  if (aplicables.some(p => p.estado === 'revisar')) return 'revisar'
  if (despuesDeLoQueSigue && !aplicables.some(p => p.estado === 'hecho')) return 'despues'
  return aplicables.find(p => p.estado === 'pendiente')!.turno === 'equipo' ? 'equipo' : 'claude'
}

/**
 * La barra donde se aprueba lo que Claude entregó. Queda pegada abajo mientras se lee la
 * sección: se decide al terminar de leer, sin volver a subir.
 */
function BarraDeRevision({ procedencia, instruccionCambios, onAprobar, guardando, error }: {
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
 * Todo el Landscape en una página. Arriba, lo que sigue y de quién es; debajo, las seis
 * etapas como secciones del mismo documento. Abierta queda la sección donde hay trabajo
 * —lo que sigue, lo que espera revisión, la que pidió el link—; las demás se leen de un
 * vistazo por su estado y se abren con un clic. El trabajo se hace en el chat de Claude:
 * acá se ve lo que guardó y se decide.
 */
export function LandscapeWorkspace({
  projectId,
  proyecto,
  irA,
  pasos,
  tendencias,
  seleccionAprobada,
  tendenciasAprobadas,
  contenidoPorEtapa,
  actividad,
  dependencia,
}: {
  projectId: string
  /** El nombre del proyecto, para el mensaje que se lleva a Claude. */
  proyecto: string
  /** La sección que pidió el link (`?etapa=` o `?paso=`): se abre y se baja hasta ella. */
  irA?: StageKey
  /** Los pasos con su estado, en orden. */
  pasos: PasoConEstado[]
  tendencias: TendenciaCandidata[]
  seleccionAprobada: string[]
  tendenciasAprobadas: boolean
  contenidoPorEtapa: Record<string, ContenidoEtapaVista>
  actividad: ActividadVista[]
  /** Lo que esta fase necesita de otra y todavía no llegó, si hay algo. */
  dependencia?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(seleccionAprobada)
  // Qué se está guardando: el id de un paso que se marca, o la etapa que se aprueba o elige.
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<{ donde: string; texto: string } | null>(null)
  // Las secciones donde el equipo pidió mirar sólo la versión aprobada. No decide nada —el
  // borrador sigue guardado y la etapa sigue esperando— así que es estado de vista.
  const [soloAprobada, setSoloAprobada] = useState<string[]>([])
  // Con la selección ya confirmada se leen las elegidas; cambiarla es pedirlo.
  const [cambiandoSeleccion, setCambiandoSeleccion] = useState(false)
  // Lo que el equipo abrió o cerró a mano. Lo que no tocó sigue el estado del proyecto:
  // al aprobar una sección se pliega sola y se abre la que sigue.
  const [plegado, setPlegado] = useState<Partial<Record<StageKey, boolean>>>({})

  // Claude guarda desde claude.ai, en otra pestaña. Al volver a esta, se trae lo nuevo:
  // así no hace falta un botón de “ya guardó”.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [router])

  // El link nombró una sección (desde el menú, el buscador o el chat): se baja hasta ella.
  useEffect(() => {
    if (irA) document.getElementById(irA)?.scrollIntoView({ block: 'start' })
  }, [irA])

  // `seleccionAprobada` puede cambiar por fuera (Claude escribe por MCP con el panel
  // abierto). Se resincroniza sólo cuando el contenido cambia de verdad.
  const previaRef = useRef(seleccionAprobada)
  useEffect(() => {
    const previa = previaRef.current
    const cambio = previa.length !== seleccionAprobada.length
      || previa.some((id, i) => id !== seleccionAprobada[i])
    if (cambio) {
      setSelected(seleccionAprobada)
      previaRef.current = seleccionAprobada
    }
  }, [seleccionAprobada])

  const toggle = (id: string) =>
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length >= MAX_TENDENCIAS ? prev : [...prev, id],
    )

  const listo = selected.length >= MIN_TENDENCIAS && selected.length <= MAX_TENDENCIAS
  const tope = selected.length >= MAX_TENDENCIAS

  async function enviar(url: string, body: unknown, fallo: string, quien: string) {
    setGuardando(quien)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? fallo)
      setCambiandoSeleccion(false)
      router.refresh()
    } catch (e) {
      setError({ donde: quien, texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setGuardando(null)
    }
  }

  const base = `/api/projects/${projectId}/landscape`
  const aprobarSeleccion = () =>
    enviar(`${base}/tendencias`, { accion: 'seleccionar-tendencias', seleccionadas: selected }, 'No se pudo guardar', 'tendencias')
  // Aprobar una versión ya guardada: Claude guarda por MCP, el equipo aprueba desde acá.
  const aprobarVersion = (etapa: StageKey | PiezaKey, versionId: string) =>
    enviar(`${base}/${etapa}`, { accion: 'aprobar', versionId }, 'No se pudo aprobar', etapa)
  // La otra salida del conflicto: el equipo se queda con lo que ya había aprobado.
  const mantenerAprobada = (etapa: StageKey | PiezaKey) =>
    enviar(`${base}/${etapa}`, { accion: 'reafirmar' }, 'No se pudo mantener la versión aprobada', etapa)
  const marcar = (id: string, hecho: boolean) =>
    enviar(`${base}/pasos`, { paso: id, hecho }, 'No se pudo marcar', id)
  // El Diagnóstico es sólo para rebranding: en una marca nueva el equipo dice que no aplica.
  const noAplica = (etapa: StageKey, valor: boolean) =>
    enviar(`${base}/${etapa}`, { accion: 'no-aplica', noAplica: valor }, 'No se pudo guardar', etapa)

  const sigue = pasoQueSigue(pasos)
  const iSigue = sigue ? STAGE_ORDER.indexOf(sigue.etapa) : STAGE_ORDER.length
  const estados = Object.fromEntries(STAGE_ORDER.map((etapa, i) => [
    etapa,
    estadoDeSeccion(pasos.filter(p => p.etapa === etapa), i > iSigue),
  ])) as Record<StageKey, EstadoSeccion>
  const listas = STAGE_ORDER.filter(e => estados[e] === 'listo').length
  const aplicables = STAGE_ORDER.filter(e => estados[e] !== 'no_aplica').length

  /** Abierta por defecto: donde hay trabajo ahora, o la que pidió el link. */
  const abiertaPorDefecto = (etapa: StageKey) =>
    etapa === irA || etapa === sigue?.etapa || estados[etapa] === 'revisar'
  const abierta = (etapa: StageKey) => !(plegado[etapa] ?? !abiertaPorDefecto(etapa))

  const errorDe = (donde: string) => (error?.donde === donde ? error.texto : null)

  /** Las tendencias: la lista para elegir, o las elegidas con la lista entera a un clic. */
  function cuerpoTendencias() {
    const borradorNuevo = contenidoPorEtapa.tendencias?.borradorNuevo ?? null
    if (!tendencias.length) return <Vacio texto={QUE_VA.tendencias} />

    if (tendenciasAprobadas && !borradorNuevo && !cambiandoSeleccion) {
      const elegidas = tendencias.filter(t => seleccionAprobada.includes(t.id))
      const otras = tendencias.filter(t => !seleccionAprobada.includes(t.id))
      return (
        <>
          <p className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[15px] text-[var(--secundario)]">
              <span className="font-semibold text-[var(--ink)]">Las {elegidas.length} elegidas</span>, de una lista larga de {tendencias.length}.
            </span>
            <button type="button" onClick={() => setCambiandoSeleccion(true)}
              className="text-[13px] font-medium text-[var(--ink)] underline underline-offset-2">
              Cambiar la selección
            </button>
          </p>
          <VistaListaLarga candidatas={elegidas} elegidas={[]} conResumen={false} />
          {otras.length > 0 && (
            <details className="group mt-10 border-t border-[var(--line)] pt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] text-[var(--secundario)] hover:text-[var(--ink)]">
                Ver las otras {otras.length} de la lista larga <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-6"><VistaListaLarga candidatas={otras} elegidas={[]} conResumen={false} /></div>
            </details>
          )}
        </>
      )
    }

    const errorSeleccion = errorDe('tendencias')
    return (
      <>
        <p className="mb-6 max-w-[62ch] text-[15px] leading-[1.6] text-[var(--secundario)]">
          {borradorNuevo
            ? <>{borradorNuevo.autor} amplió la lista larga después de la selección aprobada. La selección vigente sigue siendo la anterior hasta que vuelvas a confirmar.</>
            : <>Elige entre {MIN_TENDENCIAS} y {MAX_TENDENCIAS}. Claude desarrolla cada una en tres diapositivas: explicación, profundización y enfoques.</>}
        </p>
        <div className="space-y-8">
          {EJES.map(eje => {
            const delEje = tendencias.filter(t => t.eje === eje)
            if (!delEje.length) return null
            return (
              <section key={eje}>
                <p className="mb-3 text-[10px] font-bold font-mono uppercase tracking-[.14em] text-[var(--rotulo)]">{eje} · {delEje.length}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {delEje.map(t => (
                    <TendenciaElegible key={t.id} t={t} selected={selected.includes(t.id)} onToggle={() => toggle(t.id)} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
        {/* Gate humano: elegir es la decisión de la etapa. Queda pegado abajo mientras se elige. */}
        <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-[14px] border border-[var(--ink)] bg-white/95 px-5 py-3.5 shadow-[0_8px_24px_rgba(21,18,12,.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-[var(--secundario)]">
            <span className="font-semibold tabular-nums text-[var(--ink)]">{selected.length}</span> elegidas · entre {MIN_TENDENCIAS} y {MAX_TENDENCIAS}
            {tope && <span className="ml-1 text-[var(--ink)]">· Llegaste al máximo.</span>}
            {errorSeleccion && <span className="ml-2 text-[var(--error)]">{errorSeleccion}</span>}
          </p>
          <div className="flex flex-none items-center gap-3">
            {cambiandoSeleccion && (
              <button type="button" onClick={() => { setCambiandoSeleccion(false); setSelected(seleccionAprobada) }}
                className="text-[13px] text-[var(--secundario)] underline-offset-2 hover:text-[var(--ink)] hover:underline">
                Cancelar
              </button>
            )}
            <button
              type="button"
              disabled={!listo || guardando === 'tendencias'}
              onClick={aprobarSeleccion}
              className="rounded-[9px] bg-[var(--banana)] px-4 py-2.5 text-[14px] font-semibold text-[var(--ink)] transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {guardando === 'tendencias' ? 'Guardando…' : tendenciasAprobadas ? 'Actualizar selección' : 'Confirmar selección'}
            </button>
          </div>
        </div>
      </>
    )
  }

  /**
   * Una pieza del deck dentro de su sección (el desarrollo y los casos de las tendencias,
   * el brand assets, el círculo): su propio documento y su propia aprobación.
   */
  function bloquePieza(pieza: PiezaKey) {
    const contenido = contenidoPorEtapa[pieza] ?? null
    const borradorNuevo = contenido?.borradorNuevo ?? null
    const paso = pasos.find(p => p.pieza === pieza)
    const errorPieza = errorDe(pieza)
    const Vista = VISTA_DE_PIEZA[pieza]
    let cuerpo: React.ReactNode
    if (!contenido) {
      cuerpo = <Vacio texto={`Claude lo guarda acá cuando se lo pidan en el chat. ${paso?.queEs ?? ''}`} />
    } else if (borradorNuevo && !soloAprobada.includes(pieza)) {
      cuerpo = (
        <>
          <ComparadorVersiones
            aprobada={{ content: contenido.content, cuando: contenido.cuando }}
            nueva={{ content: borradorNuevo.content, cuando: borradorNuevo.cuando, autor: borradorNuevo.autor }}
            onMantener={() => mantenerAprobada(pieza)}
            onVerSoloAprobada={() => setSoloAprobada(prev => [...prev, pieza])}
            onAprobarNueva={() => aprobarVersion(pieza, borradorNuevo.id)}
            guardando={guardando === pieza}
          />
          {errorPieza && <p className="mt-3 text-[13px] text-[var(--error)]">{errorPieza}</p>}
        </>
      )
    } else {
      cuerpo = (
        <>
          {borradorNuevo && (
            <div className="mb-6">
              <AvisoVersionNueva autor={borradorNuevo.autor} cuando={borradorNuevo.cuando}
                onVer={() => setSoloAprobada(prev => prev.filter(e => e !== pieza))} />
            </div>
          )}
          <p className="mb-6 text-[12.5px] text-[var(--rotulo)]">{contenido.procedencia}</p>
          <Vista content={contenido.content} />
          {!contenido.aprobada && (
            <BarraDeRevision
              procedencia={contenido.procedencia}
              instruccionCambios={`Ajustemos ${PIEZA_LABEL[pieza]}, del Landscape de ${proyecto}. Lee lo que ya está guardado y cámbialo así:\n`}
              onAprobar={() => aprobarVersion(pieza, contenido.id)}
              guardando={guardando === pieza}
              error={errorPieza}
            />
          )}
        </>
      )
    }
    return (
      <div key={pieza} id={pieza} className="mt-14 scroll-mt-8">
        <p className="mb-6 flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{PIEZA_LABEL[pieza]}</span>
          {contenido && (
            <span className="text-[12px] font-semibold text-[var(--secundario)]">{contenido.aprobada && !borradorNuevo ? 'Aprobado' : 'Por revisar'}</span>
          )}
        </p>
        {cuerpo}
      </div>
    )
  }

  /** Las piezas de una etapa, en el orden del deck. */
  const piezasDe = (etapa: StageKey) => PIEZAS.filter(p => p.etapa === etapa).map(p => bloquePieza(p.key))

  /** Lo que Claude guardó en una etapa (menos tendencias): leerlo, compararlo, aprobarlo. */
  function cuerpoDocumento(etapa: StageKey, deLaEtapa: PasoConEstado[]) {
    const contenido = contenidoPorEtapa[etapa] ?? null
    const borradorNuevo = contenido?.borradorNuevo ?? null
    const errorEtapa = errorDe(etapa)
    const viendoAprobada = soloAprobada.includes(etapa)

    if (contenido && borradorNuevo && !viendoAprobada) {
      return (
        <>
          <ComparadorVersiones
            aprobada={{ content: contenido.content, cuando: contenido.cuando }}
            nueva={{ content: borradorNuevo.content, cuando: borradorNuevo.cuando, autor: borradorNuevo.autor }}
            onMantener={() => mantenerAprobada(etapa)}
            onVerSoloAprobada={() => setSoloAprobada(prev => [...prev, etapa])}
            onAprobarNueva={() => aprobarVersion(etapa, borradorNuevo.id)}
            guardando={guardando === etapa}
          />
          {errorEtapa && <p className="mt-3 text-[13px] text-[var(--error)]">{errorEtapa}</p>}
        </>
      )
    }

    // Lo principal primero: en el contexto, el texto y después las fuentes que cita.
    // Las piezas (brand assets, círculo) tienen su propio bloque: acá va sólo lo de la etapa.
    const conDocumento = deLaEtapa
      .filter(p => p.donde === 'plataforma' && !p.pieza && contenido && tieneContenido(p, contenido.content))
      .sort((a, b) => (a.id === '2.1' ? 1 : 0) - (b.id === '2.1' ? 1 : 0))
    if (!contenido || !conDocumento.length) return QUE_VA[etapa] ? <Vacio texto={QUE_VA[etapa]} /> : null

    const porRevisar = !contenido.aprobada
    return (
      <>
        {/* Se está mirando sólo la aprobada, pero el borrador sigue ahí: la vuelta al
            comparador tiene que estar a un clic. */}
        {borradorNuevo && viendoAprobada && (
          <div className="mb-6">
            <AvisoVersionNueva autor={borradorNuevo.autor} cuando={borradorNuevo.cuando}
              onVer={() => setSoloAprobada(prev => prev.filter(e => e !== etapa))} />
          </div>
        )}
        <p className="mb-6 text-[12.5px] text-[var(--rotulo)]">{contenido.procedencia}</p>
        <div className="space-y-14">
          {conDocumento.map(p => (
            <div key={p.id} id={p.id === '2.1' ? 'fuentes-contexto' : undefined} className="scroll-mt-8">
              {/* Las fuentes son un anexo del contexto: llevan su rótulo para que se note el corte. */}
              {p.id === '2.1' && conDocumento.length > 1 && (
                <p className="mb-6 border-b border-[var(--line)] pb-2.5 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">Fuentes</p>
              )}
              <DocumentoDelPaso paso={p} content={contenido.content} />
            </div>
          ))}
        </div>
        {porRevisar && (
          <BarraDeRevision
            procedencia={contenido.procedencia}
            instruccionCambios={`Ajustemos ${STAGE_LABEL[etapa]}, del Landscape de ${proyecto}. Lee lo que ya está guardado y cámbialo así:\n`}
            onAprobar={() => aprobarVersion(etapa, contenido.id)}
            guardando={guardando === etapa}
            error={errorEtapa}
          />
        )}
      </>
    )
  }

  // Un paso que no se pudo marcar: el error va donde se marcó, arriba o en su sección.
  const pasoConError = error ? pasos.find(p => p.id === error.donde) : undefined
  const alerta = (texto: string) => <p role="alert" className="mt-2 text-[13px] text-[var(--error)]">{texto}</p>

  return (
    <div className="max-w-[860px]">
      <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">
        Landscape · {listas} de {aplicables} secciones listas
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="font-serif text-[38px] leading-[1.1] tracking-[-.025em] text-[var(--ink)]">
          <span className="underline-banana">Landscape</span>
        </h1>
        {/* Todo lo aprobado, en el orden del deck: para pasarlo al template o guardarlo en PDF. */}
        <a href={`/admin/projects/${projectId}/landscape/documento`} className="pb-1.5 text-[14px] font-medium text-[var(--ink)] underline underline-offset-4">
          Documento para el deck ↗
        </a>
      </div>

      <LoQueSigue paso={sigue} proyecto={proyecto} guardando={!!sigue && guardando === sigue.id} onMarcar={marcar} />
      {pasoConError && pasoConError.id === sigue?.id && alerta(error!.texto)}

      <div className="mt-12 border-b border-[var(--line)]">
        {STAGE_ORDER.map((etapa, i) => {
          const deLaEtapa = pasos.filter(p => p.etapa === etapa)
          const estado = estados[etapa]
          const abiertaAhora = abierta(etapa)
          const chip = CHIP[estado]
          const porFuera = deLaEtapa.filter(p => p.donde !== 'plataforma' && p.estado !== 'no_aplica')
          return (
            <section key={etapa} id={etapa} aria-labelledby={`titulo-${etapa}`} className="scroll-mt-6 border-t border-[var(--line)]">
              <h2 id={`titulo-${etapa}`}>
                <button
                  type="button"
                  aria-expanded={abiertaAhora}
                  aria-controls={`cuerpo-${etapa}`}
                  onClick={() => setPlegado(prev => ({ ...prev, [etapa]: abiertaAhora }))}
                  className="group flex w-full items-center gap-4 py-5 text-left"
                >
                  <span className="w-6 flex-none font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`min-w-0 flex-1 font-serif text-[24px] leading-[1.2] tracking-[-.015em] group-hover:underline group-hover:decoration-[var(--line)] group-hover:underline-offset-4 ${
                    estado === 'no_aplica' || estado === 'despues' ? 'text-[var(--secundario)]' : 'text-[var(--ink)]'
                  }`}>
                    {STAGE_LABEL[etapa]}
                  </span>
                  <span className={`flex-none rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${chip.clase}`}>{chip.texto}</span>
                  <span aria-hidden="true" className={`flex-none text-[13px] text-[var(--rotulo)] transition-transform duration-150 motion-reduce:transition-none ${abiertaAhora ? 'rotate-180' : ''}`}>▾</span>
                </button>
              </h2>
              {abiertaAhora && (
                <div id={`cuerpo-${etapa}`} className="pb-12 pl-10 max-sm:pl-0">
                  {/* La dependencia de la fase es del Panorama (los competidores del Taller). */}
                  {etapa === 'panorama' && dependencia && <div className="-mt-4 mb-6"><NotaDependencia texto={dependencia} /></div>}
                  {estado === 'no_aplica'
                    ? <p className="text-[14px] text-[var(--secundario)]">No aplica en este proyecto: es una marca nueva, no un rebranding.</p>
                    : etapa === 'tendencias' ? cuerpoTendencias() : cuerpoDocumento(etapa, deLaEtapa)}
                  {/* El desarrollo y los casos se hacen sobre las tendencias elegidas: antes no hay nada que mostrar. */}
                  {estado !== 'no_aplica' && (etapa !== 'tendencias' || tendenciasAprobadas) && piezasDe(etapa)}
                  {PUEDEN_NO_APLICAR.includes(etapa) && (
                    <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--secundario)]">
                      {estado === 'no_aplica' ? '¿Sí es un rebranding?' : 'Sólo aplica en rebranding. ¿Es una marca nueva?'}
                      <button type="button" disabled={guardando === etapa} onClick={() => noAplica(etapa, estado !== 'no_aplica')}
                        className="font-medium text-[var(--ink)] underline underline-offset-2 disabled:cursor-wait disabled:opacity-60">
                        {guardando === etapa ? 'Guardando…' : estado === 'no_aplica' ? 'Volver a activarlo' : 'Marcar que no aplica'}
                      </button>
                      {errorDe(etapa) && <span role="alert" className="text-[var(--error)]">{errorDe(etapa)}</span>}
                    </p>
                  )}
                  <PorFuera pasos={porFuera} guardando={guardando} onMarcar={marcar} />
                  {pasoConError?.etapa === etapa && pasoConError.id !== sigue?.id && alerta(error!.texto)}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <Actividad actividad={actividad} />
    </div>
  )
}
