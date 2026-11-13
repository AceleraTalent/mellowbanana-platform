import Link from 'next/link'
import { db } from '@/lib/db/client'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { FASES } from '@/lib/seguimiento/sistema'
import { AdminShell } from '@/components/AdminShell'
import { TablaSistema } from '@/components/sistema/TablaSistema'
import { TableroSistema } from '@/components/sistema/TableroSistema'
import { LineaDeTiempo } from '@/components/sistema/LineaDeTiempo'

export const dynamic = 'force-dynamic'

type Vista = 'kanban' | 'lista' | 'tiempo'

const VISTAS: { key: Vista; label: string; href: string; icono: React.ReactNode }[] = [
  { key: 'kanban', label: 'Kanban', href: '/admin', icono: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v12" /></> },
  { key: 'lista', label: 'Lista', href: '/admin?vista=lista', icono: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /> },
  { key: 'tiempo', label: 'Línea de tiempo', href: '/admin?vista=tiempo', icono: <path d="M4 6h10M8 12h12M4 18h8" /> },
]

/**
 * El inicio del panel es el Pipeline: todos los clientes del estudio por fase, en tres
 * vistas de lo mismo. Kanban para mover, Lista para editar de corrido y Línea de tiempo
 * para ver las entregas. Ver src/lib/seguimiento/sistema.ts
 */
export default async function Admin({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const pedida = (await searchParams).vista
  // `tablero` es el nombre viejo del Kanban: los links guardados siguen llegando.
  const vista: Vista = pedida === 'lista' || pedida === 'tabla' ? 'lista' : pedida === 'tiempo' ? 'tiempo' : 'kanban'
  const ahora = new Date()
  const filas = await cargarSistema(db, ahora)

  return (
    <AdminShell sistema={filas}>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="font-serif text-[30px] leading-[1.1] text-[var(--ink)]">Pipeline de proyectos</h1>
          <p className="mt-1.5 text-[15px] text-[var(--secundario)]">
            {filas.length} {filas.length === 1 ? 'cliente' : 'clientes'} en {FASES.length} fases
            {vista === 'kanban' && ' · arrastra una tarjeta para moverla de fase'}
          </p>
        </div>
        <nav aria-label="Vista" className="flex rounded-[14px] border border-[var(--line)] bg-white p-1 text-[14px] font-medium">
          {VISTAS.map(v => (
            <Link key={v.key} href={v.href} aria-current={vista === v.key ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2 transition-colors ${vista === v.key ? 'bg-[var(--primario)] text-white' : 'text-[var(--secundario)] hover:text-[var(--ink)]'}`}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{v.icono}</svg>
              {v.label}
            </Link>
          ))}
        </nav>
      </header>

      {filas.length === 0 ? (
        <p className="tarjeta mt-8 px-6 py-14 text-center text-[15px] text-[var(--secundario)]">
          Todavía no hay clientes. Agrega uno con “Nuevo cliente”, o llegan solos al completarse una entrevista.
        </p>
      ) : (
        <div className="mt-7">
          {vista === 'kanban' ? <TableroSistema filas={filas} /> : vista === 'lista' ? <TablaSistema filas={filas} /> : <LineaDeTiempo filas={filas} hoy={ahora} />}
        </div>
      )}
    </AdminShell>
  )
}
