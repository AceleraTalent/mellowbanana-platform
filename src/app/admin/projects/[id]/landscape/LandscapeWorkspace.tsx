'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  EJES, MIN_TENDENCIAS, MAX_TENDENCIAS, STAGE_ORDER, STAGE_LABEL,
  type StageKey, type TendenciaCandidata,
} from '@/lib/landscape/stages'
import {
  instruccionParaClaude, siguientePendiente, tieneContenido, type PasoConEstado,
} from '@/lib/landscape/pasos'
import { ComparadorVersiones } from '@/components/ComparadorVersiones'
import { AvisoVersionNueva, NotaDependencia } from '@/components/EtapaPartes'
import { PanelTurno } from '@/components/paso/PanelTurno'
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
        {/* Recortada: para elegir basta el arranque. Entera se lee en el paso 3.1. */}
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

/** Lo que se ve en el centro cuando el paso todavía no tiene nada. */
function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-[4px] border border-dashed border-[#CFC9BA] px-6 py-12 text-center">
      <p className="font-serif text-[19px] text-[var(--ink)]">{titulo}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] leading-[1.6] text-[var(--secundario)]">{texto}</p>
    </div>
  )
}

/** El documento de un paso de la plataforma que ya tiene contenido. */
function DocumentoDelPaso({ paso, content, hrefPaso }: { paso: PasoConEstado; content: unknown; hrefPaso: (id: string) => string }) {
  switch (paso.id) {
    case '1.0': return <VistaEnfoque content={content} />
    case '2.1': return <VistaFuentes content={content} />
    case '2.2': return <VistaContexto content={content} hrefFuentes={hrefPaso('2.1')} />
    case '4.1': return <VistaBenchmarking content={content} />
    case '5.1': return <VistaDiagnostico content={content} />
    default: return <VistaGenerica content={content} />
  }
}

export function LandscapeWorkspace({
  projectId,
  proyecto,
  paso,
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
  /** El paso que se está mirando. Viene de `?paso=` o `?etapa=`, ya resuelto por la página. */
  paso: PasoConEstado
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
  const etapaActiva: StageKey = paso.etapa
  const [selected, setSelected] = useState<string[]>(seleccionAprobada)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El equipo pidió mirar sólo la versión aprobada. No decide nada —el borrador sigue
  // guardado y la etapa sigue esperando— así que es estado de vista y se vuelve.
  const [soloAprobada, setSoloAprobada] = useState(false)

  // Navegar es cambiar la URL: el componente sigue montado entre pasos, así que lo que era
  // del paso anterior —el error, qué versión se estaba mirando— se limpia durante el render.
  const [pasoPrevio, setPasoPrevio] = useState(paso.id)
  if (pasoPrevio !== paso.id) {
    setPasoPrevio(paso.id)
    setError(null)
    setSoloAprobada(false)
  }

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

  async function enviar(url: string, body: unknown, fallo: string) {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? fallo)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  const base = `/api/projects/${projectId}/landscape`
  const aprobarSeleccion = () =>
    enviar(`${base}/tendencias`, { accion: 'seleccionar-tendencias', seleccionadas: selected }, 'No se pudo guardar')
  // Aprobar una versión ya guardada: Claude guarda por MCP, el equipo aprueba desde acá.
  const aprobarVersion = (versionId: string) =>
    enviar(`${base}/${etapaActiva}`, { accion: 'aprobar', versionId }, 'No se pudo aprobar')
  // La otra salida del conflicto: el equipo se queda con lo que ya había aprobado.
  const mantenerAprobada = () =>
    enviar(`${base}/${etapaActiva}`, { accion: 'reafirmar' }, 'No se pudo mantener la versión aprobada')
  const marcar = (hecho: boolean) =>
    enviar(`${base}/pasos`, { paso: paso.id, hecho }, 'No se pudo marcar el paso')

  const hrefPaso = (id: string) => `/admin/projects/${projectId}/landscape?paso=${id}`
  const i = pasos.findIndex(p => p.id === paso.id)
  const anterior = i > 0 ? pasos[i - 1] : undefined
  const proximo = i < pasos.length - 1 ? pasos[i + 1] : undefined
  const pendiente = siguientePendiente(pasos, paso.id)

  const contenido = contenidoPorEtapa[etapaActiva] ?? null
  const borradorNuevo = contenido?.borradorNuevo ?? null
  const enConflicto = paso.donde === 'plataforma' && !!contenido && !!borradorNuevo && !soloAprobada
    && paso.id !== '3.1' && paso.id !== '3.3'
  const conContenido = !!contenido && tieneContenido(paso, contenido.content)
  const numeroEtapa = STAGE_ORDER.indexOf(etapaActiva) + 1
  // Los pasos de la plataforma de esta etapa que están esperando la misma aprobación.
  const apruebaJuntos = pasos.filter(p => p.etapa === etapaActiva && p.estado === 'revisar').map(p => p.id)
  const aplicables = pasos.filter(p => p.estado !== 'no_aplica')

  const centro = (() => {
    if (paso.donde !== 'plataforma') {
      return (
        <div className="space-y-4">
          <div className="rounded-[4px] bg-[var(--papel-hondo)] px-7 py-6">
            <p className="text-[10px] font-bold font-mono uppercase tracking-[.14em] text-[var(--rotulo)]">
              {paso.donde === 'chat' ? 'Se trabaja en el chat con Claude' : 'Se hace fuera de la plataforma'}
            </p>
            <p className="mt-3 text-[13px] text-[var(--secundario)]">Quién</p>
            <p className="mt-0.5 max-w-[60ch] text-[15.5px] leading-[1.55] text-[var(--ink)]">{paso.quienTexto}</p>
            <p className="mt-4 text-[13px] text-[var(--secundario)]">Está listo cuando</p>
            <p className="mt-0.5 max-w-[60ch] text-[15.5px] leading-[1.55] text-[var(--ink)]">{paso.listoCuando}</p>
          </div>
          {paso.donde === 'chat' && (
            <p className="max-w-[62ch] text-[13.5px] leading-[1.6] text-[var(--secundario)]">
              La plataforma todavía no guarda lo que Claude produce en este paso. Por ahora Claude te lo entrega en el chat,
              tú lo pasas al deck y lo marcas como hecho.
            </p>
          )}
        </div>
      )
    }

    if (paso.id === '3.1') {
      return tendencias.length
        ? <VistaListaLarga candidatas={tendencias} elegidas={seleccionAprobada} />
        : <Vacio titulo="Todavía no hay lista larga" texto="Cuando Claude la guarde, las tendencias aparecen acá ordenadas por eje." />
    }

    if (paso.id === '3.3') {
      if (!tendencias.length)
        return <Vacio titulo="Primero hace falta la lista larga" texto="Este paso se hace sobre la lista del paso 3.1. Cuando Claude la guarde, eliges acá." />
      return (
        <>
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
          {/* Gate humano: elegir es la decisión del paso. Queda pegado abajo mientras se elige. */}
          <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-[14px] border border-[var(--ink)] bg-white/95 px-5 py-3.5 shadow-[0_8px_24px_rgba(21,18,12,.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] text-[var(--secundario)]">
                <span className="font-semibold tabular-nums text-[var(--ink)]">{selected.length}</span> elegidas · entre {MIN_TENDENCIAS} y {MAX_TENDENCIAS}
                {tope && <span className="ml-1 text-[var(--ink)]">· Llegaste al máximo.</span>}
                {error && <span className="ml-2 text-[var(--error)]">{error}</span>}
              </p>
              <button
                type="button"
                disabled={!listo || guardando}
                onClick={aprobarSeleccion}
                className="rounded-[9px] bg-[var(--banana)] px-4 py-2.5 text-[14px] font-semibold text-[var(--ink)] transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              >
                {guardando ? 'Guardando…' : tendenciasAprobadas ? 'Actualizar selección' : 'Confirmar selección'}
              </button>
          </div>
        </>
      )
    }

    if (enConflicto && contenido && borradorNuevo) {
      return (
        <ComparadorVersiones
          aprobada={{ content: contenido.content, cuando: contenido.cuando }}
          nueva={{ content: borradorNuevo.content, cuando: borradorNuevo.cuando, autor: borradorNuevo.autor }}
          onMantener={mantenerAprobada}
          onVerSoloAprobada={() => setSoloAprobada(true)}
          onAprobarNueva={() => aprobarVersion(borradorNuevo.id)}
          guardando={guardando}
        />
      )
    }

    if (contenido && conContenido) {
      return (
        <>
          {/* Se está mirando sólo la aprobada, pero el borrador sigue ahí: la vuelta al
              comparador tiene que estar a un clic. */}
          {borradorNuevo && soloAprobada && (
            <div className="mb-6">
              <AvisoVersionNueva autor={borradorNuevo.autor} cuando={borradorNuevo.cuando} onVer={() => setSoloAprobada(false)} />
            </div>
          )}
          <p className="mb-9 text-[13px] text-[var(--rotulo)]">{contenido.procedencia}</p>
          <DocumentoDelPaso paso={paso} content={contenido.content} hrefPaso={hrefPaso} />
        </>
      )
    }

    return paso.quien === 'equipo'
      ? <Vacio titulo="Todavía no hay nada acá" texto="Este paso lo resuelve el equipo. El panel de la derecha te dice cómo." />
      : <Vacio titulo="Todavía no hay nada acá" texto="Este paso lo empieza Claude. Sigue los pasos del panel de la derecha: copias la instrucción, la pegas en claude.ai y cuando Claude guarde, el borrador aparece acá." />
  })()

  return (
    <div className="-my-8 grid md:-my-12 xl:min-h-screen xl:grid-cols-[minmax(0,1fr)_330px]">
      <article className="order-2 min-w-0 py-8 md:py-12 xl:order-1 xl:pr-14">
        <div className="max-w-[820px]">
        <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">
          Etapa {numeroEtapa} · {STAGE_LABEL[etapaActiva]}
        </p>
        <h1 className="mt-3.5 flex items-baseline gap-4 font-serif text-[42px] leading-[1.08] tracking-[-.025em] text-[var(--ink)]">
          <span className="font-mono text-[19px] tabular-nums tracking-normal text-[var(--rotulo)]">{paso.id}</span>
          <span className="underline-banana">{paso.titulo}</span>
        </h1>
        <p className="mt-4 max-w-[58ch] text-[17px] leading-[1.6] text-[var(--secundario)]">{paso.queEs}</p>
        {/* La dependencia de la fase es del Panorama (los competidores del Taller): en otro paso confunde. */}
        {dependencia && etapaActiva === 'panorama' && <NotaDependencia texto={dependencia} />}

        <div className="mt-10">{centro}</div>

        <nav aria-label="Pasos vecinos" className="mt-14 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          {anterior
            ? <Link href={hrefPaso(anterior.id)} className="text-[14px] text-[var(--secundario)] underline decoration-[var(--line)] underline-offset-[3px] transition-colors hover:text-[var(--ink)] hover:decoration-[var(--ink)]">‹ {anterior.id} {anterior.titulo}</Link>
            : <span />}
          {proximo
            ? <Link href={hrefPaso(proximo.id)} className="text-[14px] text-[var(--secundario)] underline decoration-[var(--line)] underline-offset-[3px] transition-colors hover:text-[var(--ink)] hover:decoration-[var(--ink)]">{proximo.id} {proximo.titulo} ›</Link>
            : <span />}
        </nav>

        <Actividad actividad={actividad} />
        </div>
      </article>

      <aside className="order-1 border-b border-[var(--line)] py-8 xl:order-2 xl:-mr-12 xl:border-b-0 xl:border-l xl:py-12 xl:pl-9 xl:pr-10">
        <div className="xl:sticky xl:top-12">
          <PanelTurno
            paso={paso}
            etapaLabel={STAGE_LABEL[etapaActiva]}
            avance={{ hechos: aplicables.filter(p => p.estado === 'hecho').length, total: aplicables.length }}
            siguiente={pendiente && { id: pendiente.id, titulo: pendiente.titulo, turno: pendiente.turno, href: hrefPaso(pendiente.id) }}
            instruccion={instruccionParaClaude(paso, proyecto)}
            instruccionCambios={`Ajustemos el paso ${paso.id} · ${paso.titulo}, del Landscape de ${proyecto}. Lee lo que ya está guardado y cámbialo así:\n`}
            cuando={contenido?.cuando}
            apruebaJuntos={apruebaJuntos}
            enConflicto={enConflicto}
            onAprobar={contenido ? () => aprobarVersion(contenido.id) : undefined}
            onMarcar={marcar}
            guardando={guardando}
            error={paso.id === '3.3' ? null : error}
          />
        </div>
      </aside>
    </div>
  )
}

