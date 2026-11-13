import Link from 'next/link'
import { db } from '@/lib/db/client'
import { quienEntro } from '@/lib/admin/auth'
import { avisosRecientes } from '@/lib/avisos'
import { haceCuanto } from '@/lib/landscape/stages'
import { AdminShell } from '@/components/AdminShell'
import { MarcarVistos } from './MarcarVistos'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'

export const dynamic = 'force-dynamic'

/** Lo que pasó y conviene saber: hoy, las entrevistas que se completaron. */
export default async function Avisos() {
  const [quien, avisos] = await Promise.all([quienEntro(), avisosRecientes(db)])
  const vistosHasta = quien?.avisosVistosHasta ?? null
  const ahora = new Date()
  return (
    <AdminShell seccion="avisos">
      <EncabezadoPagina rotulo="Panel interno" titulo="Avisos" bajada="Cada vez que un cliente termina su entrevista." />
      <MarcarVistos />
      {avisos.length === 0 ? (
        <p className="mt-10 max-w-[860px] rounded-[12px] border border-dashed border-[#CFC9BA] px-6 py-6 text-[14px] text-[var(--secundario)]">
          Todavía no hay avisos.
        </p>
      ) : (
        <ul aria-label="Avisos" className="mt-10 max-w-[860px] divide-y divide-[var(--line)] rounded-[12px] border border-[var(--line)] bg-white">
          {avisos.map(a => {
            const nuevo = !!vistosHasta && a.cuando > vistosHasta
            return (
              <li key={a.id}>
                <Link href={a.href} className="flex items-baseline justify-between gap-4 px-5 py-4 hover:bg-[var(--superficie)]">
                  <span className="min-w-0">
                    <span className={`text-[15px] ${nuevo ? 'font-semibold text-[var(--ink)]' : 'text-[var(--cuerpo)]'}`}>{a.texto}</span>
                    {a.detalle && <span className="ml-2 text-[13.5px] text-[var(--secundario)]">{a.detalle}</span>}
                    {nuevo && <span className="ml-2 rounded-full bg-[var(--banana)] px-2 py-[2px] text-[11.5px] font-semibold text-[var(--ink)]">Nuevo</span>}
                  </span>
                  <span className="flex-none text-[13px] text-[var(--rotulo)]">{haceCuanto(a.cuando, ahora)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AdminShell>
  )
}
