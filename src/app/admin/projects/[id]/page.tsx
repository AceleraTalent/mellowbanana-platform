import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { tallerDelProyecto } from '@/lib/db/seguimiento-store'
import {
  getProjectWithSessions, getDeliverable, landscapeState, summarizeLandscape, listLandscapeActivity,
} from '@/lib/db/store'
import { strategyState, summarizeStrategy, listStrategyActivity } from '@/lib/db/strategy-store'
import { deriveFases, derivePantallas } from '@/lib/pipeline/phases'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { construirIndice, esperanDecision } from '@/lib/pipeline/indice'
import { projectSignals } from '@/lib/pipeline/signals'
import { attentionItems, haceCuanto } from '@/lib/pipeline/attention'
import { armarNosToca, armarMovimientos } from '@/lib/pipeline/mesa'
import { buildStages } from '@/lib/landscape/stages'
import { buildEtapasEstrategia } from '@/lib/estrategia/stages'
import { Estadistica } from '@/components/sistema/Estadistica'
import { quienEntro } from '@/lib/admin/auth'
import { paraQuien } from '@/lib/admin/permisos'
import { AdminShell } from '@/components/AdminShell'
import { ProjectIndex } from '@/components/ProjectIndex'
import { CabeceraDetalle } from '@/components/detalle/CabeceraDetalle'
import { TareasDeEtapa } from '@/components/detalle/TareasDeEtapa'
import { Comentarios } from '@/components/sistema/Comentarios'
import { CHIP, MARCA } from '@/components/sistema/chips'
import { cuandoVence, diasHasta, encargadosConocidos, fechaLarga, personas } from '@/components/sistema/cliente'
import { Avatar, FASE_BAJADA, FASE_ESTILO, IconoFase, SelloFase } from '@/components/sistema/fase'
import { FASES, type EstadoFase, type FaseSistema } from '@/lib/seguimiento/sistema'
import { cuentaDeTareas } from '@/lib/seguimiento/tareas'

export const dynamic = 'force-dynamic'


const ESTADO_FASE: Record<EstadoFase, string> = { completa: 'Completada', en_curso: 'En curso', pendiente: 'Pendiente' }

/**
 * El detalle de un proyecto: la cabecera con sus datos, el recorrido por las cinco fases
 * y, debajo, dos pestañas. “Etapas” muestra las tareas de la fase elegida, con responsable
 * y fecha; “Resumen”, los números del proyecto, el equipo, lo que espera una decisión y
 * qué se movió. Vale igual para un cliente que lleva su proceso por fuera.
 */
export default async function DetalleDeProyecto({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; etapa?: string }>
}) {
  const { id } = await params
  const pedido = await searchParams
  const project = await getProjectWithSessions(db, id)
  if (!project) notFound()

  const sesiones = project.sessions as {
    id: string; name?: string | null; status?: string | null; completedAt?: Date | string | null
  }[]
  const deliverable = await getDeliverable(db, id)
  const estadoLandscape = await landscapeState(db, id)
  const estrategiaEstado = await strategyState(db, id)
  const señales = projectSignals({
    ...(await tallerDelProyecto(db, id).then(t => ({ tienePostTaller: !!t.conclusiones, tallerHecho: t.hecho }))),
    sessions: sesiones,
    tieneEntregable: !!deliverable,
    landscape: summarizeLandscape(estadoLandscape),
    estrategia: summarizeStrategy(estrategiaEstado),
  })
  const fases = deriveFases(id, señales)
  const pantallas = derivePantallas(id, señales)


  // El resumen no está parado en ninguna etapa (etapaActiva vacía).
  const indice = construirIndice({
    projectId: id,
    fases,
    pantallas,
    etapaActiva: '',
    stagesLandscape: buildStages(estadoLandscape),
    etapasEstrategia: buildEtapasEstrategia(estrategiaEstado),
    esperanDecision: [
      ...esperanDecision('landscape', estadoLandscape),
      ...esperanDecision('estrategia', estrategiaEstado),
    ],
  })

  const completadas = sesiones.filter(s => s.status === 'completed').length
  const atencion = attentionItems([{
    id,
    name: project.name,
    pantallas,
    sessionsTotal: sesiones.length,
    sessionsCompleted: completadas,
    tieneEntregable: !!deliverable,
  }])

  const movimientos = armarMovimientos({
    projectId: id,
    landscape: await listLandscapeActivity(db, id, 8),
    estrategia: await listStrategyActivity(db, id, 8),
    sesiones,
    limite: 8,
  })
  const ahora = new Date()
  // La fase del Sistema M&B, la misma que dicen el inicio y el menú; la vieja queda de
  // respaldo si el proyecto no aparece en el Sistema.
  const sistema = paraQuien(await cargarSistema(db, ahora), await quienEntro())
  const fila = sistema.find(p => p.id === id)
  if (!fila) notFound()
  const faseDeFila = fila.fases.find(f => f.key === fila.actual)!
  const bajada = `${faseDeFila.label} · ${faseDeFila.detalle}`
  const nosToca = armarNosToca(indice, atencion, { sigue: fila.sigue, fase: faseDeFila.label })
  const porFuera = fila.seguimiento.porFuera
  const terminado = fila.sigue.quien === 'listo'
  const encargados = encargadosConocidos(sistema.map(f => f.seguimiento.encargado))

  // Qué se está mirando: la pestaña y, en Etapas, cuál. Sin pedido, la etapa en la que va.
  const tab = pedido.tab === 'resumen' ? 'resumen' : 'etapas'
  const etapa: FaseSistema = FASES.includes(pedido.etapa as FaseSistema) ? (pedido.etapa as FaseSistema) : fila.actual
  const faseVista = fila.fases.find(f => f.key === etapa)!
  const tareas = fila.tareas[etapa]
  const hechas = tareas.filter(t => t.hecha).length
  const base = `/admin/projects/${id}`
  const todas = FASES.flatMap(f => fila.tareas[f])
  const gente = personas(fila.seguimiento.encargado)
  const entrega = fila.seguimiento.fechaEntrega

  // Los documentos que salen de cada fase, sólo donde la plataforma los arma.
  const entregables: Partial<Record<FaseSistema, { titulo: string; detalle: string; href: string; listo: boolean }[]>> = porFuera ? {} : {
    taller: [{ titulo: 'Propuesta de valor', detalle: deliverable ? 'Generada con las entrevistas' : 'Se genera al completar entrevistas', href: `${base}/propuesta`, listo: !!deliverable }],
    landscape: [{ titulo: 'Documento del Landscape', detalle: 'Con lo aprobado hasta hoy', href: `${base}/landscape/documento`, listo: fila.fases.find(f => f.key === 'landscape')!.estado === 'completa' }],
    estrategia: [{ titulo: 'Documento de la Estrategia', detalle: 'Con lo aprobado hasta hoy', href: `${base}/estrategia/documento`, listo: fila.fases.find(f => f.key === 'estrategia')!.estado === 'completa' }],
  }

  return (
    <AdminShell
      riel
      activeProjectId={id}
      sistema={sistema}
      indice={<ProjectIndex enResumen projectId={id} nombre={project.name} subtitulo={bajada} fases={indice} />}
    >
      <div className="flex flex-col gap-6">
        <CabeceraDetalle fila={fila} encargados={encargados} />

        {/* El recorrido: las cinco fases en orden. Un clic en una abre sus tareas. */}
        <nav aria-label="Etapas del proyecto" className="overflow-x-auto rounded-2xl border border-border/70 bg-card p-6 shadow-soft scroll-thin">
          <ol className="flex min-w-[700px] items-start">
            {fila.fases.map((f, i) => {
              const hecha = terminado || f.estado === 'completa'
              const enEsta = !terminado && f.key === fila.actual
              const elegida = tab === 'etapas' && etapa === f.key
              return (
                <li key={f.key} className="flex flex-1 items-start last:flex-none">
                  <Link href={`${base}?etapa=${f.key}#etapa`} aria-current={elegida ? 'step' : undefined} className="group flex w-[128px] flex-col items-center text-center">
                    <span className="relative">
                      {enEsta && <span aria-hidden="true" className={`absolute inset-0 animate-ping rounded-full opacity-40 ${FASE_ESTILO[f.key].barra}`} />}
                      <span className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 group-hover:scale-105 ${
                        hecha ? 'border-emerald-500 bg-emerald-500 text-white'
                          : enEsta ? `border-transparent text-white shadow-lg ${FASE_ESTILO[f.key].barra}`
                          : 'border-border bg-muted text-muted-foreground'
                      } ${elegida ? 'ring-4 ring-primary/20' : ''}`}>
                        {hecha ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6"><path d="M20 6 9 17l-5-5" /></svg>
                        ) : <IconoFase fase={f.key} size={24} />}
                      </span>
                    </span>
                    <span aria-hidden="true" className="mt-2.5 font-mono text-[10px] font-semibold text-muted-foreground/70">{String(i + 1).padStart(2, '0')}</span>
                    <span className={`text-[13px] font-bold leading-tight ${hecha || enEsta ? 'text-foreground' : 'text-muted-foreground'}`}>{f.label}</span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">{terminado ? 'Completada' : ESTADO_FASE[f.estado]}</span>
                  </Link>
                  {i < fila.fases.length - 1 && <span aria-hidden="true" className={`mt-7 h-0.5 flex-1 rounded-full ${hecha ? 'bg-emerald-400' : 'bg-border'}`} />}
                </li>
              )
            })}
          </ol>
        </nav>

        <div id="etapa" className="scroll-mt-24">
          <nav aria-label="Secciones del proyecto" className="flex flex-wrap gap-1.5 border-b">
            {([['resumen', 'Resumen', `${base}?tab=resumen`], ['etapas', 'Etapas', `${base}?etapa=${etapa}`]] as const).map(([k, l, href]) => (
              <Link key={k} href={href} aria-current={tab === k ? 'page' : undefined}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {l}
              </Link>
            ))}
          </nav>

          {tab === 'etapas' ? (
            <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-3 [&>section]:xl:col-span-2">
              <section className="rounded-2xl border border-border/70 bg-card text-card-foreground shadow-soft">
                <div className="flex items-start justify-between gap-4 p-6 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <SelloFase fase={etapa} size={44} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa {String(FASES.indexOf(etapa) + 1).padStart(2, '0')} · {terminado ? 'Completada' : ESTADO_FASE[faseVista.estado]}</p>
                      <h2 className="text-lg font-bold tracking-tight">{faseVista.label}</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">{FASE_BAJADA[etapa]}</p>
                    </div>
                  </div>
                  {tareas.length > 0 && <span className="tabular flex-none rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{cuentaDeTareas(tareas)} tareas</span>}
                </div>
                <div className="px-6 pb-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className={`block h-full rounded-full transition-all duration-700 ${FASE_ESTILO[etapa].barra}`} style={{ width: `${tareas.length ? Math.round((hechas / tareas.length) * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="p-3 pb-4">
                  <TareasDeEtapa key={etapa} projectId={id} fase={etapa} nombreFase={faseVista.label} tareas={tareas} encargados={encargados} />
                </div>
              </section>

              <div className="flex flex-col gap-6">
                {etapa === fila.actual && !terminado && fila.sigue.quien !== 'fuera' && (
                  <section className="tarjeta overflow-hidden">
                    <div className="bg-gradient-to-b from-[var(--primario-suave)] to-white p-5">
                      <p className="rotulo text-[var(--primario)]">Lo que sigue</p>
                      <p className="mt-2"><span className={`inline-flex rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold ${CHIP[fila.sigue.quien]}`}>{MARCA[fila.sigue.quien]}{fila.sigue.texto}</span></p>
                      <p className="mt-2 text-[15px] font-semibold leading-snug text-[var(--ink)]">{fila.sigue.detalle ?? faseVista.detalle}</p>
                    </div>
                    {fila.sigue.href && (
                      <div className="border-t border-[var(--line)] p-4">
                        <Link href={fila.sigue.href} className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--primario)] px-4 py-2.5 text-[14.5px] font-semibold text-white hover:brightness-110">Ir a trabajarlo <span aria-hidden="true">→</span></Link>
                      </div>
                    )}
                  </section>
                )}

                {entregables[etapa] && (
                  <section className="tarjeta p-5">
                    <p className="rotulo">Entregables</p>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {entregables[etapa]!.map(e => (
                        <li key={e.href}>
                          <Link href={e.href} className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] p-3 transition-colors hover:border-[var(--apagado)] hover:bg-[var(--superficie)]/60">
                            <span className={`grid h-9 w-9 flex-none place-items-center rounded-[10px] ${e.listo ? 'bg-[var(--aprobado)] text-[var(--ink)]' : 'bg-[var(--superficie)] text-[var(--rotulo)]'}`}>
                              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14.5px] font-semibold leading-snug text-[var(--ink)]">{e.titulo}</span>
                              <span className="block text-[12.5px] text-[var(--secundario)]">{e.detalle}</span>
                            </span>
                            <span className={`flex-none rounded-full px-2.5 py-[2px] text-[12px] font-semibold ${e.listo ? 'bg-[var(--aprobado)] text-[var(--ink)]' : 'bg-[var(--superficie)] text-[var(--secundario)]'}`}>{e.listo ? 'Listo' : 'En curso'}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {fila.seguimiento.notas && (
                  <section className="tarjeta p-5">
                    <p className="rotulo">Notas del equipo</p>
                    <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.55] text-[var(--cuerpo)]">{fila.seguimiento.notas}</p>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Estadistica rotulo="Avance general" valor={`${terminado ? 100 : fila.avance}%`} pie="Del recorrido completo" tono="bg-[var(--primario-suave)] text-[var(--primario)]" icono={<path d="M5 12.5l4.5 4.5L19 7" />} />
                {entrega ? (
                  <Estadistica rotulo={diasHasta(entrega) < 0 ? 'Días de retraso' : 'Días para entrega'} valor={String(Math.abs(diasHasta(entrega)))} unidad="días" pie={`${fechaLarga(entrega)} · ${cuandoVence(entrega).texto}`}
                    tono={diasHasta(entrega) < 0 && !terminado ? 'bg-[var(--ink)] text-white' : 'bg-[var(--aprobado)] text-[var(--ink)]'} icono={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>} />
                ) : (
                  <Estadistica rotulo="Días para entrega" valor="—" pie="Sin fecha de entrega. Se pone en “Editar cliente”." tono="bg-[var(--aprobado)] text-[var(--ink)]" icono={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>} />
                )}
                <Estadistica rotulo="Tareas" valor={String(todas.filter(t => t.hecha).length)} unidad={`de ${todas.length}`} pie="Hechas, entre las cinco etapas" tono="bg-[var(--aprobado)] text-[var(--ink)]" icono={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />
                <Estadistica rotulo="Etapa actual" valor={terminado ? 'Terminado' : faseDeFila.label} pie={terminado ? 'Proyecto entregado' : faseDeFila.detalle} tono="bg-[var(--aprobado)] text-[var(--ink)]" icono={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>} />
              </div>

              <section className="tarjeta p-5 sm:p-6">
                <p className="rotulo">Equipo del proyecto</p>
                {gente.length === 0 ? (
                  <p className="mt-3 text-[14.5px] text-[var(--secundario)]">Nadie asignado todavía. Se asigna en “Editar cliente”.</p>
                ) : (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {gente.map(p => (
                      <li key={p.nombre} className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] p-3">
                        <Avatar nombre={p.nombre} size={38} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14.5px] font-semibold text-[var(--ink)]">{p.nombre}</span>
                          <span className="block truncate text-[12.5px] text-[var(--secundario)]">
                            {(n => (n ? `${n} ${n === 1 ? 'tarea asignada' : 'tareas asignadas'}` : 'Encargado del proyecto'))(todas.filter(t => t.responsable === p.nombre).length)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {!porFuera && (
                <div className="grid items-start gap-6 lg:grid-cols-2">
                  <section className="tarjeta p-5 sm:p-6">
                    <p className="rotulo">Nos toca</p>
                    {nosToca.length === 0 ? (
                      <p className="mt-3 text-[14.5px] text-[var(--secundario)]">Nada espera una decisión del equipo.</p>
                    ) : (
                      <ul className="mt-2">
                        {nosToca.map(p => (
                          <li key={p.href + p.titulo} className="border-b border-[var(--line)] last:border-b-0">
                            <Link href={p.href} className="group flex items-center gap-3 py-3">
                              <span className="h-[8px] w-[8px] flex-none rounded-full bg-[var(--primario)]" aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[14.5px] font-semibold text-[var(--ink)] group-hover:text-[var(--primario)]">{p.titulo}</span>
                                {p.sub && <span className="mt-0.5 block text-[12.5px] text-[var(--secundario)]">{p.sub}</span>}
                              </span>
                              <span aria-hidden="true" className="flex-none text-[var(--rotulo)] group-hover:text-[var(--primario)]">→</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="tarjeta p-5 sm:p-6">
                    <p className="rotulo">Actividad reciente</p>
                    {movimientos.length === 0 ? (
                      <p className="mt-3 text-[14.5px] text-[var(--secundario)]">Todavía no se movió nada en este proyecto.</p>
                    ) : (
                      <ul className="mt-2">
                        {movimientos.map(m => (
                          <li key={m.id} className="border-b border-[var(--line)] last:border-b-0">
                            <Link href={m.href} className="flex items-baseline gap-3 py-2.5 text-[14px] hover:text-[var(--primario)]">
                              <span className="min-w-0 flex-1 text-[var(--secundario)]"><strong className="font-semibold text-[var(--ink)]">{m.quien}</strong> {m.texto}</span>
                              <span className="flex-none text-[12.5px] tabular-nums text-[var(--rotulo)]">{haceCuanto(m.cuando, ahora)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}

              <section className="tarjeta p-5 sm:p-6">
                {fila.seguimiento.notas && (
                  <div className="mb-5 border-b border-[var(--line)] pb-5">
                    <p className="rotulo">Notas del equipo</p>
                    <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.55] text-[var(--cuerpo)]">{fila.seguimiento.notas}</p>
                  </div>
                )}
                <Comentarios projectId={id} />
              </section>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
