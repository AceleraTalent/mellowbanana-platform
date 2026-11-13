import Link from 'next/link'
import { cloneElement, isValidElement } from 'react'
import { db } from '@/lib/db/client'
import { quienEntro } from '@/lib/admin/auth'
import { esDireccion, paraQuien } from '@/lib/admin/permisos'
import { avisosRecientes, cuantosNuevos } from '@/lib/avisos'
import { cargarSistema, type FilaSistema } from '@/lib/seguimiento/cargar'
import { PanelMovil } from './PanelMovil'
import { Buscador, type Buscable } from './Buscador'
import type { SistemaDelProyecto } from './ProjectIndex'
import { NuevoCliente } from './sistema/NuevoCliente'
import { encargadosConocidos } from './sistema/cliente'
import { Avatar, ChipEstado, FASE_ESTILO, IconoFase, inicialesDe } from './sistema/fase'
import { URGENCIA } from './sistema/chips'
import { haceCuanto } from '@/lib/landscape/stages'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'

/** Los avisos, arriba y a la vista: la campana lleva cuántos llegaron sin mirar. */
function Campana({ nuevos }: { nuevos: number }) {
  return (
    <Link
      href="/admin/avisos"
      aria-label={nuevos ? `Avisos: ${nuevos} sin ver` : 'Avisos'}
      className="relative flex h-10 w-10 flex-none items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[18px] w-[18px]">
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {nuevos > 0 && <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
    </Link>
  )
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{children}</p>
}

const ESTADO_PASO: Record<string, string> = {
  hecho: 'Listo',
  revisar: 'Por revisar',
  pendiente: 'Pendiente',
  no_aplica: 'No aplica',
}

/**
 * Lo que el buscador puede encontrar: cada cliente y cada paso de su Landscape. Adentro de
 * un proyecto, lo de ese proyecto va primero: buscar “2.2” ahí es querer su 2.2.
 */
function buscables(proyectos: FilaSistema[], activeProjectId?: string): Buscable[] {
  const ordenados = [...proyectos].sort((a, b) => Number(b.id === activeProjectId) - Number(a.id === activeProjectId))
  return ordenados.flatMap(p => {
    const fase = p.fases.find(f => f.key === p.actual)!
    return [
      { tipo: 'cliente' as const, titulo: p.nombre, detalle: p.sigue.quien === 'listo' ? 'Terminado' : `${fase.label} · ${p.sigue.texto}`, href: p.href },
      // Un cliente por fuera no tiene Landscape acá: sus pasos no se buscan.
      ...(p.seguimiento.porFuera ? [] : p.pasos).map(paso => ({
        tipo: 'paso' as const,
        titulo: `${paso.id} ${paso.titulo}`,
        detalle: `${p.nombre} · ${ESTADO_PASO[paso.estado] ?? paso.estado}`,
        href: `/admin/projects/${p.id}/landscape?paso=${paso.id}`,
      })),
    ]
  })
}

const ICONO: Record<string, React.ReactNode> = {
  panorama: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  toca: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  pipeline: <><path d="M3 5a2 2 0 0 1 2-2h3l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M8 13h8" /></>,
  avisos: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  equipo: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
}

/** Un renglón de la navegación: ícono, nombre y, si hay, un número a la derecha. */
function Enlace({ href, icono, fase, activo, cuenta, children }: { href: string; icono?: string; fase?: FaseSistema; activo: boolean; cuenta?: number; children: React.ReactNode }) {
  const tono = activo ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'
  return (
    <Link href={href} aria-current={activo ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        activo ? 'bg-primary-soft text-primary' : 'text-slate-600 hover:bg-muted hover:text-foreground'
      }`}>
      {activo && <span aria-hidden="true" className="absolute -left-4 bottom-2 top-2 w-1 rounded-r-full bg-primary" />}
      {fase ? <span className={`flex-none ${tono}`}><IconoFase fase={fase} size={18} /></span> : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-[18px] w-[18px] flex-none ${tono}`}>{ICONO[icono!]}</svg>
      )}
      <span className="flex-1 text-left">{children}</span>
      {cuenta !== undefined && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activo ? 'bg-primary text-white' : 'bg-muted text-slate-600'}`}>{cuenta}</span>
      )}
    </Link>
  )
}

/**
 * El marco de todas las pantallas autenticadas: barra lateral blanca con la navegación,
 * barra de arriba con el buscador y las acciones, y el contenido sobre fondo gris. En el
 * inicio la barra lleva las etapas del proceso; adentro de un
 * proyecto, el menú de ese proyecto (que trae su propio “volver”).
 *
 * El índice llega armado por la prop `indice`: las páginas de proyecto ya consultaron sus
 * etapas, así que el shell no vuelve a la base por eso.
 */
export async function AdminShell({ activeProjectId, indice, sistema, seccion, fase, riel, children }: {
  activeProjectId?: string
  indice?: React.ReactNode
  /** Las filas del Sistema M&B, si la página ya las cargó (el inicio): así no se leen dos veces. */
  sistema?: FilaSistema[]
  /** Qué renglón de la navegación va marcado. Sin esto: el Pipeline, salvo dentro de un proyecto. */
  seccion?: 'panorama' | 'pipeline' | 'avisos' | 'equipo'
  /** La fase elegida en la Lista, para marcarla en el menú en vez del Pipeline. */
  fase?: FaseSistema
  /** Muestra la columna derecha (lo que se mueve y la actividad). Las pantallas de trabajo no la llevan: necesitan el ancho. */
  riel?: boolean
  children: React.ReactNode
}) {
  // La barra y el inicio leen el mismo Sistema M&B: lo que espera al equipo acá es
  // exactamente lo que el Pipeline marca como del equipo.
  const [quien, avisos] = await Promise.all([quienEntro(), avisosRecientes(db)])
  const proyectos = paraQuien(sistema ?? await cargarSistema(db), quien)
  const nuevos = cuantosNuevos(avisos, quien?.avisosVistosHasta ?? null)
  const activa = seccion ?? (activeProjectId || fase ? undefined : 'pipeline')
  const enCurso = proyectos.filter(p => p.sigue.quien !== 'listo')

  // El menú del cliente se completa con el Sistema M&B, no con lo que trae la página: así
  // dice la misma fase, el mismo avance y lo mismo que sigue que el inicio (“Landscape · 7
  // de 15 pasos”). La página arma el índice y el shell conoce el Sistema, por eso se
  // completa acá; lo que trae la página queda de respaldo si el proyecto no aparece.
  const fila = activeProjectId ? proyectos.find(p => p.id === activeProjectId) : undefined
  const faseDeFila = fila?.fases.find(f => f.key === fila.actual)
  // Borrar un cliente es de dirección: el menú del proyecto se entera acá.
  const indiceConFase = isValidElement<{ subtitulo?: string; sistema?: SistemaDelProyecto; puedeBorrar?: boolean }>(indice)
    ? cloneElement(indice, {
        puedeBorrar: esDireccion(quien),
        ...(fila && faseDeFila ? {
          subtitulo: `${faseDeFila.label} · ${faseDeFila.detalle}`,
          sistema: { fases: fila.fases, actual: fila.actual, sigue: fila.sigue, pasos: fila.pasos, porFuera: fila.seguimiento.porFuera },
        } : {}),
      })
    : indice

  const marca = (
    <Link href="/admin" className="flex items-center gap-2.5 px-2 pb-5 pt-1">
      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[var(--banana)] text-lg font-extrabold text-[var(--ink)] shadow-sm">M</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[15px] font-extrabold tracking-tight">Mellow &amp; Banana</span>
        <span className="block truncate text-[11px] font-medium text-muted-foreground">Sistema M&amp;B</span>
      </span>
    </Link>
  )

  const barra = (
    <div className="flex min-h-full flex-col">
      {marca}

      <nav aria-label="Secciones del panel" className="space-y-5">
        <div className="space-y-0.5">
          <Rotulo>Panorama</Rotulo>
          <Enlace href="/admin/panorama" icono="panorama" activo={activa === 'panorama'}>Dashboard</Enlace>
        </div>
        <div className="space-y-0.5">
          <Rotulo>Proyectos</Rotulo>
          <Enlace href="/admin" icono="pipeline" activo={activa === 'pipeline'} cuenta={proyectos.length}>Pipeline de proyectos</Enlace>
          {fila && <Enlace href={fila.href} icono="toca" activo>Detalle de proyecto</Enlace>}
        </div>
        {/* Adentro de un proyecto manda el menú de ese proyecto: las etapas de todos se guardan. */}
        {!indiceConFase && (
          <div className="space-y-0.5">
            <Rotulo>Etapas</Rotulo>
            {FASES.map(f => (
              <Enlace key={f} href={`/admin?vista=lista&fase=${f}`} fase={f} activo={fase === f} cuenta={enCurso.filter(p => p.actual === f).length}>{FASE_LABEL[f]}</Enlace>
            ))}
          </div>
        )}
        <div className="space-y-0.5">
          <Rotulo>Gestión</Rotulo>
          <Enlace href="/admin/avisos" icono="avisos" activo={activa === 'avisos'} cuenta={nuevos || undefined}>Avisos</Enlace>
          <Enlace href="/admin/equipo" icono="equipo" activo={activa === 'equipo'}>Equipo</Enlace>
        </div>
      </nav>

      {indiceConFase && <div className="mt-5 border-t pt-5">{indiceConFase}</div>}

      {/* Quién está adentro y salir. Salir es un formulario: un POST, para que un link
          ajeno no te cierre la sesión. */}
      <div className="mt-auto flex items-center gap-2.5 border-t pt-4">
        {quien && <Avatar nombre={quien.nombre} size={36} />}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{quien?.nombre ?? 'Panel interno'}</p>
          <p className="text-[11px] text-muted-foreground">{quien?.esAdmin ? 'Dirección' : 'Equipo'}</p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Salir</button>
        </form>
      </div>
    </div>
  )

  // La columna derecha: lo que se mueve en la plataforma y lo último que pasó.
  const enPlataforma = proyectos.filter(p => !p.seguimiento.porFuera && p.sigue.quien !== 'listo')
    .sort((a, b) => URGENCIA[a.sigue.quien] - URGENCIA[b.sigue.quien] || a.nombre.localeCompare(b.nombre)).slice(0, 5)
  const ahora = new Date()
  const TONO_QUIEN: Record<string, 'ojo' | 'azul' | 'quieto' | 'bien'> = { revisar: 'ojo', equipo: 'ojo', claude: 'azul', cliente: 'quieto', pausa: 'quieto', fuera: 'quieto', listo: 'bien' }
  const columna = (
    <aside aria-label="Actividad" className="fixed bottom-0 right-0 top-[68px] z-10 hidden w-[340px] flex-col border-l border-border/70 bg-white xl:flex">
      <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 scroll-thin">
        <section>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" /></svg>
            En la plataforma
          </p>
          {enPlataforma.length === 0 ? <p className="text-xs text-muted-foreground">Ningún cliente hace su proceso en la plataforma ahora.</p> : (
            <div className="space-y-2.5">
              {enPlataforma.map(p => (
                <Link key={p.id} href={p.sigue.href ?? p.href} className="block w-full rounded-xl border border-border/70 bg-white p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{p.nombre}</span>
                    <ChipEstado tono={TONO_QUIEN[p.sigue.quien]}>{p.sigue.texto}</ChipEstado>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{FASE_LABEL[p.actual]}{p.sigue.detalle ? ` · ${p.sigue.detalle}` : ''}</span>
                  <span className="mt-2.5 flex items-center gap-2.5">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full ${FASE_ESTILO[p.actual].barra}`} style={{ width: `${p.avance}%` }} /></span>
                    <span className="tabular w-8 text-right text-[11px] font-semibold text-muted-foreground">{p.avance}%</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
            Actividad reciente
          </p>
          {avisos.length === 0 ? <p className="text-xs text-muted-foreground">Todavía no hay avisos. Llegan cuando un cliente termina su entrevista.</p> : (
            <ol className="relative space-y-4 border-l pl-5">
              {avisos.slice(0, 6).map(a => (
                <li key={a.id} className="relative">
                  <span aria-hidden="true" className="absolute -left-[31px] top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  <Link href={a.href} className="block text-[13px] font-medium leading-snug hover:text-primary">{a.texto}{a.detalle ? ` · ${a.detalle}` : ''}</Link>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{haceCuanto(a.cuando, ahora)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </aside>
  )

  const campana = <Campana nuevos={nuevos} />

  return (
    <div className="panel relative min-h-screen bg-background">
      <aside aria-label="Panel" className="fixed inset-y-0 left-0 z-30 hidden w-[256px] overflow-y-auto border-r border-border/70 bg-white px-4 py-5 scroll-thin lg:block">
        {barra}
      </aside>

      <div className="lg:pl-[256px]">
        {/* La barra de arriba: buscar, crear un cliente, los avisos y quién está adentro. En
            móvil no entra la barra lateral: se abre como panel desde la izquierda. */}
        <header className="sticky top-0 z-20 border-b border-border/70 bg-white/85 backdrop-blur-md">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <PanelMovil>
                <div className="panel min-h-full bg-white px-4 py-5">{barra}</div>
              </PanelMovil>
            </div>
            <div className="min-w-0 max-w-md flex-1">
              <Buscador items={buscables(proyectos, activeProjectId)} />
            </div>
            <div className="ml-auto flex flex-none items-center gap-2">
              <span className="hidden sm:block"><NuevoCliente encargados={encargadosConocidos(proyectos.map(p => p.seguimiento.encargado))} /></span>
              <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />
              {campana}
              {quien && (
                <span className="hidden items-center gap-2.5 py-1 pl-1 pr-2 sm:flex">
                  <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-white">{inicialesDe(quien.nombre)}</span>
                  <span className="hidden text-left leading-tight 2xl:block">
                    <span className="block text-sm font-semibold">{quien.nombre}</span>
                    <span className="block text-[11px] text-muted-foreground">{quien.esAdmin ? 'Dirección' : 'Equipo'}</span>
                  </span>
                </span>
              )}
            </div>
          </div>
        </header>
        {riel && columna}

        <main className={`mx-auto w-full max-w-[1500px] overflow-x-clip px-4 py-8 sm:px-6 lg:px-8 ${riel ? 'xl:pr-[372px]' : ''}`}>{children}</main>
      </div>
    </div>
  )
}
