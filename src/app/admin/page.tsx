import Link from 'next/link'
import { db } from '@/lib/db/client'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { FASES, type FaseSistema } from '@/lib/seguimiento/sistema'
import { quienEntro } from '@/lib/admin/auth'
import { paraQuien } from '@/lib/admin/permisos'
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
export default async function Admin({ searchParams }: { searchParams: Promise<{ vista?: string; fase?: string }> }) {
  const { vista: pedida, fase: fasePedida } = await searchParams
  const fase = FASES.find(f => f === fasePedida) as FaseSistema | undefined
  // `tablero` es el nombre viejo del Kanban: los links guardados siguen llegando.
  const vista: Vista = pedida === 'lista' || pedida === 'tabla' ? 'lista' : pedida === 'tiempo' ? 'tiempo' : 'kanban'
  const ahora = new Date()
  const filas = paraQuien(await cargarSistema(db, ahora), await quienEntro())

  return (
    <AdminShell riel sistema={filas} fase={vista === 'lista' ? fase : undefined}>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">Pipeline de proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filas.length} {filas.length === 1 ? 'proyecto' : 'proyectos'} en {FASES.length} etapas
            {vista === 'kanban' && ' · arrastra una tarjeta para moverla de etapa'}
          </p>
        </div>
        <nav aria-label="Vista" className="inline-flex rounded-xl border border-border bg-white p-1 shadow-soft">
          {VISTAS.map(v => (
            <Link key={v.key} href={v.href} aria-current={vista === v.key ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${vista === v.key ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">{v.icono}</svg>
              {v.label}
            </Link>
          ))}
        </nav>
      </header>

      {filas.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-card px-6 py-14 text-center text-sm text-muted-foreground shadow-soft">
          Todavía no hay clientes. Agrega uno con “Nuevo cliente”, o llegan solos al completarse una entrevista.
        </p>
      ) : (
        <div>
          {vista === 'kanban' ? <TableroSistema filas={filas} /> : vista === 'lista' ? <TablaSistema key={fase ?? 'todas'} filas={filas} fase={fase} /> : <LineaDeTiempo filas={filas} hoy={ahora} />}
        </div>
      )}
    </AdminShell>
  )
}
