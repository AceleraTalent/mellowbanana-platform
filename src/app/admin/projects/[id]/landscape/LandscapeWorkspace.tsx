'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EJES, MIN_TENDENCIAS, MAX_TENDENCIAS, STAGE_ORDER, STAGE_LABEL,
  type StageKey, type TendenciaCandidata,
} from '@/lib/landscape/stages'
import { tieneContenido, type PasoConEstado } from '@/lib/landscape/pasos'
import { ComparadorVersiones } from '@/components/ComparadorVersiones'
import { AvisoVersionNueva, NotaDependencia, Vecinas } from '@/components/EtapaPartes'
import { BotonCopiar, BOTON_PRIMARIO, ListaDePasos } from '@/components/paso/ListaDePasos'
import { FuentesEnLinea } from '@/components/documento/bloques'
import {
  VistaBenchmarking, VistaContexto, VistaDiagnostico, VistaEnfoque, VistaFuentes, VistaGenerica, VistaListaLarga,
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

/** Lo que se ve donde va el documento cuando la etapa todavía no tiene nada guardado. */
function Vacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-[12px] border border-dashed border-[#CFC9BA] px-6 py-8 text-center text-[14px] leading-[1.6] text-[var(--secundario)]">
      {texto}
    </p>
  )
}

/** El documento que produce un paso de la plataforma. */
function DocumentoDelPaso({ paso, content }: { paso: PasoConEstado; content: unknown }) {
  switch (paso.id) {
    case '1.0': return <VistaEnfoque content={content} />
    case '2.1': return <VistaFuentes content={content} />
    case '2.2': return <VistaContexto content={content} hrefFuentes="#paso-doc-2.1" />
    case '4.1': return <VistaBenchmarking content={content} />
    case '5.1': return <VistaDiagnostico content={content} />
    default: return <VistaGenerica content={content} />
  }
}

/**
 * La barra donde se aprueba lo que Claude entregó. Queda pegada abajo mientras se lee el
 * documento: se decide al terminar de leer, sin volver a subir.
 */
function BarraDeRevision({ procedencia, apruebaJuntos, instruccionCambios, onAprobar, guardando, error }: {
  procedencia: string
  apruebaJuntos: string[]
  instruccionCambios: string
  onAprobar: () => void
  guardando: boolean
  error: string | null
}) {
  return (
    <div className="sticky bottom-4 z-10 mt-10 flex flex-col gap-3 rounded-[14px] border border-[var(--ink)] bg-white/95 px-5 py-3.5 shadow-[0_8px_24px_rgba(21,18,12,.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[var(--ink)]">Por revisar</p>
        <p className="text-[12.5px] leading-snug text-[var(--secundario)]">
          {procedencia}
          {apruebaJuntos.length > 1 && ` · se aprueban juntos ${apruebaJuntos.join(' y ')}`}
        </p>
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
 * Una etapa del Landscape: arriba sus pasos, como lista de chequeo con la acción de cada
 * uno en su renglón; debajo, lo que Claude guardó en la etapa, para leerlo y aprobarlo.
 * La etapa es la pantalla: los pasos no son páginas aparte.
 */
export function LandscapeWorkspace({
  projectId,
  proyecto,
  etapa,
  foco,
  pasos,
  tendencias,
  seleccionAprobada,
  tendenciasAprobadas,
  contenidoPorEtapa,
  actividad,
  dependencia,
}: {
  projectId: string
  /** El nombre del proyecto, para la instrucción que se copia a Claude. */
  proyecto: string
  /** La etapa que se está mirando. Viene de `?etapa=` o de `?paso=`, ya resuelta por la página. */
  etapa: StageKey
  /** El paso que se resalta en la lista: el que pidió la URL o el primero que falta. */
  foco?: string
  /** Los quince pasos con su estado, en orden. */
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
  // Qué se está guardando: el id de un paso que se marca, o 'etapa' si se aprueba o elige.
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<{ donde: string; texto: string } | null>(null)
  // El equipo pidió mirar sólo la versión aprobada. No decide nada —el borrador sigue
  // guardado y la etapa sigue esperando— así que es estado de vista y se vuelve.
  const [soloAprobada, setSoloAprobada] = useState(false)
  // Con la selección ya confirmada se lee la lista entera; cambiarla es pedirlo.
  const [cambiandoSeleccion, setCambiandoSeleccion] = useState(false)

  // Navegar es cambiar la URL: el componente sigue montado entre etapas, así que lo que era
  // de la anterior —el error, qué versión se estaba mirando— se limpia durante el render.
  const [etapaPrevia, setEtapaPrevia] = useState(etapa)
  if (etapaPrevia !== etapa) {
    setEtapaPrevia(etapa)
    setError(null)
    setSoloAprobada(false)
    setCambiandoSeleccion(false)
  }

  // Claude guarda desde claude.ai, en otra pestaña. Al volver a esta, se trae lo nuevo:
  // así no hace falta un botón de “ya guardó”.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [router])

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
    enviar(`${base}/tendencias`, { accion: 'seleccionar-tendencias', seleccionadas: selected }, 'No se pudo guardar', 'etapa')
  // Aprobar una versión ya guardada: Claude guarda por MCP, el equipo aprueba desde acá.
  const aprobarVersion = (versionId: string) =>
    enviar(`${base}/${etapa}`, { accion: 'aprobar', versionId }, 'No se pudo aprobar', 'etapa')
  // La otra salida del conflicto: el equipo se queda con lo que ya había aprobado.
  const mantenerAprobada = () =>
    enviar(`${base}/${etapa}`, { accion: 'reafirmar' }, 'No se pudo mantener la versión aprobada', 'etapa')
  const marcar = (id: string, hecho: boolean) =>
    enviar(`${base}/pasos`, { paso: id, hecho }, 'No se pudo marcar el paso', id)

  const hrefEtapa = (key: StageKey) => `/admin/projects/${projectId}/landscape?etapa=${key}`
  const n = STAGE_ORDER.indexOf(etapa)
  const anterior = n > 0 ? STAGE_ORDER[n - 1] : undefined
  const siguiente = n < STAGE_ORDER.length - 1 ? STAGE_ORDER[n + 1] : undefined

  const deLaEtapa = pasos.filter(p => p.etapa === etapa)
  const aplicables = deLaEtapa.filter(p => p.estado !== 'no_aplica')
  const hechos = aplicables.filter(p => p.estado === 'hecho').length
  const deLaPlataforma = deLaEtapa.filter(p => p.donde === 'plataforma')
  // Los pasos de la etapa que esperan la misma aprobación: Claude los guardó en un solo borrador.
  const apruebaJuntos = deLaEtapa.filter(p => p.estado === 'revisar').map(p => p.id)

  const contenido = contenidoPorEtapa[etapa] ?? null
  const borradorNuevo = contenido?.borradorNuevo ?? null
  const enConflicto = etapa !== 'tendencias' && !!contenido && !!borradorNuevo && !soloAprobada
  const errorEtapa = error?.donde === 'etapa' ? error.texto : null

  const documento = (() => {
    if (etapa === 'tendencias') {
      if (!tendencias.length)
        return <Vacio texto="Cuando Claude guarde la lista larga, las tendencias aparecen acá para elegir." />

      if (tendenciasAprobadas && !borradorNuevo && !cambiandoSeleccion) {
        return (
          <>
            {/* 3.1 y 3.3 son el mismo documento: la lista, con las elegidas marcadas. */}
            <span id="paso-doc-3.3" className="block scroll-mt-8" />
            <p id="paso-doc-3.1" className="mb-8 flex scroll-mt-8 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] pb-2.5">
              <span className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">3.1 · Lista larga de tendencias</span>
              <button type="button" onClick={() => setCambiandoSeleccion(true)}
                className="text-[13px] font-medium text-[var(--ink)] underline underline-offset-2">
                Cambiar la selección
              </button>
            </p>
            <VistaListaLarga candidatas={tendencias} elegidas={seleccionAprobada} />
          </>
        )
      }

      return (
        <>
          <span id="paso-doc-3.1" className="block scroll-mt-8" />
          <p id="paso-doc-3.3" className="mb-8 scroll-mt-8 border-b border-[var(--line)] pb-2.5 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">
            3.3 · Elegir 4 o 5 tendencias
          </p>
          {borradorNuevo && (
            <p className="mb-6 max-w-[62ch] border-l-[1.5px] border-[var(--ink)] pl-3 text-[13.5px] leading-[1.6] text-[var(--secundario)]">
              {borradorNuevo.autor} amplió la lista larga después de la selección aprobada. Abajo está la lista completa;
              la selección vigente sigue siendo la anterior hasta que vuelvas a confirmar.
            </p>
          )}
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
              {errorEtapa && <span className="ml-2 text-[var(--error)]">{errorEtapa}</span>}
            </p>
            <button
              type="button"
              disabled={!listo || guardando === 'etapa'}
              onClick={aprobarSeleccion}
              className="rounded-[9px] bg-[var(--banana)] px-4 py-2.5 text-[14px] font-semibold text-[var(--ink)] transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {guardando === 'etapa' ? 'Guardando…' : tendenciasAprobadas ? 'Actualizar selección' : 'Confirmar selección'}
            </button>
          </div>
        </>
      )
    }

    if (enConflicto && contenido && borradorNuevo) {
      return (
        <>
          <ComparadorVersiones
            aprobada={{ content: contenido.content, cuando: contenido.cuando }}
            nueva={{ content: borradorNuevo.content, cuando: borradorNuevo.cuando, autor: borradorNuevo.autor }}
            onMantener={mantenerAprobada}
            onVerSoloAprobada={() => setSoloAprobada(true)}
            onAprobarNueva={() => aprobarVersion(borradorNuevo.id)}
            guardando={guardando === 'etapa'}
          />
          {errorEtapa && <p className="mt-3 text-[13px] text-[var(--error)]">{errorEtapa}</p>}
        </>
      )
    }

    // Lo principal primero: en el contexto, el texto y después las fuentes que cita.
    const conDocumento = deLaPlataforma
      .filter(p => contenido && tieneContenido(p, contenido.content))
      .sort((a, b) => (a.id === '2.1' ? 1 : 0) - (b.id === '2.1' ? 1 : 0))
    if (!contenido || !conDocumento.length)
      return <Vacio texto="Lo que Claude guarde en esta etapa aparece acá para que lo revises." />

    return (
      <>
        {/* Se está mirando sólo la aprobada, pero el borrador sigue ahí: la vuelta al
            comparador tiene que estar a un clic. */}
        {borradorNuevo && soloAprobada && (
          <div className="mb-6">
            <AvisoVersionNueva autor={borradorNuevo.autor} cuando={borradorNuevo.cuando} onVer={() => setSoloAprobada(false)} />
          </div>
        )}
        <div className="space-y-16">
          {conDocumento.map((p, i) => (
            <div key={p.id} id={`paso-doc-${p.id}`} className="scroll-mt-8">
              {/* Cada documento dice de qué paso sale; quién lo escribió y si está aprobado
                  va una sola vez, en el primero: la etapa se guarda y se aprueba entera. */}
              <p className="mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] pb-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{p.id} · {p.titulo}</span>
                {i === 0 && <span className="text-[12.5px] text-[var(--rotulo)]">{contenido.procedencia}</span>}
              </p>
              <DocumentoDelPaso paso={p} content={contenido.content} />
            </div>
          ))}
        </div>
        {apruebaJuntos.length > 0 && (
          <BarraDeRevision
            procedencia={contenido.procedencia}
            apruebaJuntos={apruebaJuntos}
            instruccionCambios={`Ajustemos la etapa ${STAGE_LABEL[etapa]} (pasos ${apruebaJuntos.join(' y ')}), del Landscape de ${proyecto}. Lee lo que ya está guardado y cámbialo así:\n`}
            onAprobar={() => aprobarVersion(contenido.id)}
            guardando={guardando === 'etapa'}
            error={errorEtapa}
          />
        )}
      </>
    )
  })()

  const errorLista = error && error.donde !== 'etapa' ? error.texto : null

  return (
    <div className="max-w-[860px]">
      <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">
        Landscape · Etapa {n + 1} de {STAGE_ORDER.length}
        {aplicables.length > 0 && <> · {hechos}/{aplicables.length} listos</>}
      </p>
      <h1 className="mt-3 font-serif text-[38px] leading-[1.1] tracking-[-.025em] text-[var(--ink)]">
        <span className="underline-banana">{STAGE_LABEL[etapa]}</span>
      </h1>
      {/* La dependencia de la fase es del Panorama (los competidores del Taller): en otra etapa confunde. */}
      {dependencia && etapa === 'panorama' && <NotaDependencia texto={dependencia} />}

      <div className="mt-8">
        <ListaDePasos pasos={deLaEtapa} foco={foco} proyecto={proyecto} guardando={guardando} onMarcar={marcar} />
        {errorLista && <p role="alert" className="mt-2 text-[13px] text-[var(--error)]">{errorLista}</p>}
      </div>

      {deLaPlataforma.length > 0 && (
        <section id="documento" aria-label={`Lo que hay en ${STAGE_LABEL[etapa]}`} className="mt-12 scroll-mt-8">
          {documento}
        </section>
      )}

      <div className="mt-12">
        <Vecinas
          anterior={anterior && { label: STAGE_LABEL[anterior], href: hrefEtapa(anterior) }}
          siguiente={siguiente && { label: STAGE_LABEL[siguiente], href: hrefEtapa(siguiente) }}
        />
      </div>

      <Actividad actividad={actividad} />
    </div>
  )
}
