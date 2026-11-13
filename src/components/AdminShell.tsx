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
import { Avatar, IconoFase } from './sistema/fase'
import { FASES, FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'

/** Los avisos, arriba y a la vista: la campana lleva cuántos llegaron sin mirar. */
function Campana({ nuevos }: { nuevos: number }) {
  return (
    <Link
      href="/admin/avisos"
      aria-label={nuevos ? `Avisos: ${nuevos} sin ver` : 'Avisos'}
      className="relative grid h-10 w-10 flex-none place-items-center rounded-full text-[var(--cuerpo)] hover:bg-[var(--superficie)] hover:text-[var(--ink)]"
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {nuevos > 0 && (
        <span aria-hidden="true" className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--banana)] px-1 text-[10.5px] font-bold tabular-nums text-[var(--ink)] ring-2 ring-white">
          {nuevos}
        </span>
      )}
    </Link>
  )
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="rotulo px-3 pb-2">{children}</p>
  )
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
  return (
    <Link href={href} aria-current={activo ? 'page' : undefined}
      className={`relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14.5px] transition-colors ${
        activo ? 'bg-[var(--banana)] font-semibold text-[var(--ink)]' : 'text-[var(--cuerpo)] hover:bg-[var(--superficie)] hover:text-[var(--ink)]'
      }`}>
      {activo && <span aria-hidden="true" className="absolute -left-4 top-2 h-[calc(100%-16px)] w-[4px] rounded-r-full bg-[var(--primario)]" />}
      {fase ? <span className={`flex-none ${activo ? '' : 'text-[var(--rotulo)]'}`}><IconoFase fase={fase} size={18} /></span> : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`flex-none ${activo ? '' : 'text-[var(--rotulo)]'}`}>{ICONO[icono!]}</svg>
      )}
      <span className="min-w-0 flex-1">{children}</span>
      {cuenta !== undefined && (
        <span className={`grid h-[22px] min-w-[26px] place-items-center rounded-full px-1.5 text-[11.5px] font-semibold tabular-nums ${activo ? 'bg-[var(--primario)] text-white' : 'bg-[var(--superficie)] text-[var(--secundario)]'}`}>{cuenta}</span>
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
export async function AdminShell({ activeProjectId, indice, sistema, seccion, fase, children }: {
  activeProjectId?: string
  indice?: React.ReactNode
  /** Las filas del Sistema M&B, si la página ya las cargó (el inicio): así no se leen dos veces. */
  sistema?: FilaSistema[]
  /** Qué renglón de la navegación va marcado. Sin esto: el Pipeline, salvo dentro de un proyecto. */
  seccion?: 'panorama' | 'pipeline' | 'avisos' | 'equipo'
  /** La fase elegida en la Lista, para marcarla en el menú en vez del Pipeline. */
  fase?: FaseSistema
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
    <Link href="/admin" className="flex items-center gap-3">
      <span aria-hidden="true" className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-[var(--banana)] text-[15px] font-extrabold tracking-[-.02em] text-[var(--ink)]">M</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[15.5px] font-bold tracking-[-.01em] text-[var(--ink)]">Mellow &amp; Banana</span>
        <span className="block truncate text-[12.5px] text-[var(--secundario)]">Sistema M&amp;B</span>
      </span>
    </Link>
  )

  const barra = (
    <div className="flex min-h-full flex-col gap-6">
      {marca}

      <nav aria-label="Secciones del panel" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Rotulo>Panorama</Rotulo>
          <Enlace href="/admin/panorama" icono="panorama" activo={activa === 'panorama'}>Dashboard</Enlace>
        </div>
        <div className="flex flex-col gap-1">
          <Rotulo>Proyectos</Rotulo>
          <Enlace href="/admin" icono="pipeline" activo={activa === 'pipeline'} cuenta={proyectos.length}>Pipeline de proyectos</Enlace>
          {fila && <Enlace href={fila.href} icono="toca" activo>Detalle de proyecto</Enlace>}
        </div>
        {/* Adentro de un proyecto manda el menú de ese proyecto: las etapas de todos se guardan. */}
        {!indiceConFase && (
          <div className="flex flex-col gap-1">
            <Rotulo>Etapas</Rotulo>
            {FASES.map(f => (
              <Enlace key={f} href={`/admin?vista=lista&fase=${f}`} fase={f} activo={fase === f} cuenta={enCurso.filter(p => p.actual === f).length}>{FASE_LABEL[f]}</Enlace>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Rotulo>Gestión</Rotulo>
          <Enlace href="/admin/avisos" icono="avisos" activo={activa === 'avisos'} cuenta={nuevos || undefined}>Avisos</Enlace>
          <Enlace href="/admin/equipo" icono="equipo" activo={activa === 'equipo'}>Equipo</Enlace>
        </div>
      </nav>

      {indiceConFase && <div className="border-t border-[var(--line)] pt-5">{indiceConFase}</div>}

      {/* Quién está adentro y salir. Salir es un formulario: un POST, para que un link
          ajeno no te cierre la sesión. */}
      <div className="mt-auto flex items-center gap-3 border-t border-[var(--line)] pt-4">
        {quien && <Avatar nombre={quien.nombre} size={34} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{quien?.nombre ?? 'Panel interno'}</p>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="text-[12.5px] text-[var(--secundario)] hover:text-[var(--ink)] hover:underline">Salir</button>
          </form>
        </div>
      </div>
    </div>
  )

  const campana = <Campana nuevos={nuevos} />

  return (
    <div className="panel relative flex min-h-screen bg-[var(--papel)]">
      <aside
        aria-label="Panel"
        className="sticky top-0 hidden h-screen w-[272px] flex-none overflow-y-auto border-r border-[var(--line)] bg-white px-4 py-5 md:block"
      >
        {barra}
      </aside>

      <div className="min-w-0 flex-1">
        {/* La barra de arriba: buscar, crear un cliente, los avisos y quién está adentro. En
            móvil no entra la barra lateral: se abre como panel desde la izquierda. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="md:hidden">
            <PanelMovil>
              <div className="panel min-h-full bg-white px-4 py-5">{barra}</div>
            </PanelMovil>
          </div>
          <div className="min-w-0 flex-1 md:max-w-[420px]">
            <Buscador items={buscables(proyectos, activeProjectId)} />
          </div>
          <div className="ml-auto flex flex-none items-center gap-2.5">
            <span className="hidden sm:block"><NuevoCliente encargados={encargadosConocidos(proyectos.map(p => p.seguimiento.encargado))} /></span>
            {campana}
            {quien && <span className="hidden md:block"><Avatar nombre={quien.nombre} size={38} /></span>}
          </div>
        </header>

        <main className="w-full overflow-x-clip px-4 py-7 md:px-8 md:py-9">{children}</main>
      </div>
    </div>
  )
}
