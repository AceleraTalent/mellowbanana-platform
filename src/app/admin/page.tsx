import { db } from '@/lib/db/client'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { AdminShell } from '@/components/AdminShell'
import { TablaSistema } from '@/components/sistema/TablaSistema'
import { TableroSistema } from '@/components/sistema/TableroSistema'
import { NuevoCliente } from '@/components/sistema/NuevoCliente'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * El inicio del panel es el Sistema M&B: una fila por cliente con su fase, qué sigue,
 * quién lo lleva, la entrega y las notas. Ver src/lib/seguimiento/sistema.ts
 */
export default async function Admin({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const tablero = (await searchParams).vista === 'tablero'
  const filas = await cargarSistema(db)
  // La fecha de hoy en Bogotá, como encabezado de un diario: “Martes 20 de octubre”.
  const hoy = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <AdminShell sistema={filas}>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">{hoy}</p>
          <h1 className="mt-3 font-serif text-[46px] leading-[1.05] tracking-[-.025em] text-[var(--ink)]">
            <span className="underline-banana">Sistema M&amp;B</span>
          </h1>
          <p className="mt-3.5 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--secundario)]">
            Cada cliente, en qué fase va y qué sigue.
          </p>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <nav aria-label="Vista" className="flex rounded-[8px] border border-[var(--line)] bg-white p-0.5 text-[13.5px]">
            {([[false, 'Tabla', '/admin'], [true, 'Tablero', '/admin?vista=tablero']] as const).map(([es, l, href]) => (
              <Link key={l} href={href} aria-current={tablero === es ? 'page' : undefined}
                className={`rounded-[6px] px-3 py-1.5 ${tablero === es ? 'bg-[var(--ink)] text-white' : 'text-[var(--secundario)] hover:text-[var(--ink)]'}`}>
                {l}
              </Link>
            ))}
          </nav>
          <NuevoCliente />
        </div>
      </header>

      {filas.length === 0 ? (
        <p className="mt-16 text-center text-[15px] text-[var(--secundario)]">
          Todavía no hay clientes. Agrega uno con “Nuevo cliente”, o llegan solos al completarse una entrevista.
        </p>
      ) : (
        <div className="mt-10">{tablero ? <TableroSistema filas={filas} /> : <TablaSistema filas={filas} />}</div>
      )}
    </AdminShell>
  )
}
