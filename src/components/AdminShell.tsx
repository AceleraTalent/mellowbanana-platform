import Link from 'next/link'
import { cloneElement, isValidElement } from 'react'
import { db } from '@/lib/db/client'
import { quienEntro } from '@/lib/admin/auth'
import { cargarSistema, type FilaSistema } from '@/lib/seguimiento/cargar'
import { Wordmark } from './Brand'
import { PanelMovil } from './PanelMovil'
import { Buscador, type Buscable } from './Buscador'
import type { SistemaDelProyecto } from './ProjectIndex'

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-2 text-[10.5px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)]">
      {children}
    </p>
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
      { tipo: 'cliente' as const, titulo: p.nombre, detalle: `${fase.label} · ${p.sigue.texto}`, href: p.href },
      ...p.pasos.map(paso => ({
        tipo: 'paso' as const,
        titulo: `${paso.id} ${paso.titulo}`,
        detalle: `${p.nombre} · ${ESTADO_PASO[paso.estado] ?? paso.estado}`,
        href: `/admin/projects/${p.id}/landscape?paso=${paso.id}`,
      })),
    ]
  })
}

/**
 * El marco de todas las pantallas autenticadas, en la dirección “Papel”: una sola barra
 * lateral de papel con el buscador arriba. En el inicio lleva la navegación y la lista de
 * clientes; adentro de un proyecto, el índice de ese proyecto (que trae su propio “volver”).
 *
 * El índice llega armado por la prop `indice`: las páginas de proyecto ya consultaron sus
 * etapas, así que el shell no vuelve a la base por eso.
 */
export async function AdminShell({ activeProjectId, indice, sistema, children }: {
  activeProjectId?: string
  indice?: React.ReactNode
  /** Las filas del Sistema M&B, si la página ya las cargó (el inicio): así no se leen dos veces. */
  sistema?: FilaSistema[]
  children: React.ReactNode
}) {
  // La barra y el inicio leen el mismo Sistema M&B: lo que espera al equipo acá es
  // exactamente lo que la tabla del inicio marca como del equipo.
  const proyectos = sistema ?? await cargarSistema(db)
  const quien = await quienEntro()
  const esperan = new Set(proyectos
    .filter(p => p.sigue.quien === 'revisar' || p.sigue.quien === 'equipo')
    .map(p => p.id))

  // El menú del cliente se completa con el Sistema M&B, no con lo que trae la página: así
  // dice la misma fase, el mismo avance y lo mismo que sigue que el inicio (“Landscape · 7
  // de 15 pasos”). La página arma el índice y el shell conoce el Sistema, por eso se
  // completa acá; lo que trae la página queda de respaldo si el proyecto no aparece.
  const fila = activeProjectId ? proyectos.find(p => p.id === activeProjectId) : undefined
  const faseDeFila = fila?.fases.find(f => f.key === fila.actual)
  const indiceConFase = fila && faseDeFila && isValidElement<{ subtitulo?: string; sistema?: SistemaDelProyecto }>(indice)
    ? cloneElement(indice, {
        subtitulo: `${faseDeFila.label} · ${faseDeFila.detalle}`,
        sistema: { fases: fila.fases, actual: fila.actual, sigue: fila.sigue, pasos: fila.pasos },
      })
    : indice

  const barra = (
    <div className="flex min-h-full flex-col gap-7">
      <Link href="/admin" className="font-serif text-[18px] leading-tight text-[var(--ink)]">
        <Wordmark />
      </Link>

      <Buscador items={buscables(proyectos, activeProjectId)} />

      {indiceConFase ?? (
        <>
          <nav aria-label="Secciones del panel">
            <Link
              href="/admin"
              aria-current={activeProjectId ? undefined : 'page'}
              className={`flex items-baseline justify-between rounded-[6px] px-3 py-2 text-[14px] ${
                activeProjectId ? 'text-[var(--cuerpo)] hover:bg-[var(--superficie)]' : 'bg-[var(--banana)] font-semibold text-[var(--ink)]'
              }`}
            >
              Sistema M&amp;B
              <span className="font-mono text-[12px] font-normal tabular-nums">{proyectos.length}</span>
            </Link>
          </nav>

          <div>
            <Rotulo>Clientes</Rotulo>
            <ul className="flex flex-col">
              {proyectos.map(p => (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    aria-current={p.id === activeProjectId ? 'page' : undefined}
                    className="flex items-center justify-between gap-2 py-1.5 text-[14px] text-[var(--cuerpo)] hover:text-[var(--ink)]"
                  >
                    <span className="truncate">{p.nombre}</span>
                    {esperan.has(p.id) && (
                      <>
                        <span aria-hidden="true" className="h-[7px] w-[7px] flex-none rounded-full bg-[var(--banana)] ring-1 ring-[var(--ink)]" />
                        <span className="sr-only">Espera al equipo</span>
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Quién está adentro, el equipo y salir. Salir es un formulario: un POST, para que
          un link ajeno no te cierre la sesión. */}
      <div className="mt-auto border-t border-[var(--line)] pt-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-[var(--rotulo)]">Panel interno</p>
        {quien && <p className="mt-1.5 truncate text-[14px] font-medium text-[var(--ink)]">{quien.nombre}</p>}
        <div className="mt-1 flex items-center gap-4 text-[13px] text-[var(--secundario)]">
          <Link href="/admin/equipo" className="hover:text-[var(--ink)] hover:underline">Equipo</Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="hover:text-[var(--ink)] hover:underline">Salir</button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative flex min-h-screen bg-[var(--papel)]">
      <aside
        aria-label="Panel"
        className="sticky top-0 hidden h-screen w-[264px] flex-none overflow-y-auto border-r border-[var(--line)] px-5 py-7 md:block"
      >
        {barra}
      </aside>

      <div className="min-w-0 flex-1">
        {/* En móvil no entra la barra: queda una cabecera de papel, y la barra entera se
            abre como panel desde la izquierda. */}
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 md:hidden">
          <Link href="/admin" className="font-serif text-[16px] text-[var(--ink)]"><Wordmark /></Link>
          <PanelMovil>
            <div className="min-h-full px-5 py-6">{barra}</div>
          </PanelMovil>
        </header>

        <main className="w-full px-5 py-8 md:px-12 md:py-12">{children}</main>
      </div>
    </div>
  )
}
