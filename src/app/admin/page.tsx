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

  return (
    <AdminShell sistema={filas}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium leading-tight text-ink">
          <span className="underline-banana">Sistema M&amp;B</span>
        </h1>
        <p className="text-[13px] text-[var(--rotulo)]">Cada cliente: en qué fase va, qué sigue y quién lo lleva</p>
      </div>

      {filas.length === 0 ? (
        <p className="mt-16 text-center text-[15px] text-[var(--secundario)]">
          Todavía no hay proyectos. Se crean al completarse una entrevista.
        </p>
      ) : (
        <div className="mt-8"><TablaSistema filas={filas} /></div>
      )}
    </AdminShell>
  )
}
