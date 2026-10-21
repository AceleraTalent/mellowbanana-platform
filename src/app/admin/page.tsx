import { db } from '@/lib/db/client'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { AdminShell } from '@/components/AdminShell'
import { TablaSistema } from '@/components/sistema/TablaSistema'

export const dynamic = 'force-dynamic'

/**
 * El inicio del panel es el Sistema M&B: una fila por cliente con su fase, qué sigue,
 * quién lo lleva, la entrega y las notas. Ver src/lib/seguimiento/sistema.ts
 */
export default async function Admin() {
  const filas = await cargarSistema(db)
  // La fecha de hoy en Bogotá, como encabezado de un diario: “Martes 20 de octubre”.
  const hoy = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <AdminShell sistema={filas}>
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">{hoy}</p>
        <h1 className="mt-3 font-serif text-[46px] leading-[1.05] tracking-[-.025em] text-[var(--ink)]">
          <span className="underline-banana">Sistema M&amp;B</span>
        </h1>
        <p className="mt-3.5 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--secundario)]">
          Cada cliente, en qué fase va y qué sigue.
        </p>
      </header>

      {filas.length === 0 ? (
        <p className="mt-16 text-center text-[15px] text-[var(--secundario)]">
          Todavía no hay proyectos. Se crean al completarse una entrevista.
        </p>
      ) : (
        <div className="mt-10"><TablaSistema filas={filas} /></div>
      )}
    </AdminShell>
  )
}
