import { db } from '@/lib/db/client'
import { quienEntro } from '@/lib/admin/auth'
import { listarUsuarios } from '@/lib/db/usuarios-store'
import { AdminShell } from '@/components/AdminShell'
import { PanelEquipo } from './PanelEquipo'

export const dynamic = 'force-dynamic'

/**
 * Quiénes entran al panel. Cada persona tiene su usuario y su clave: así el historial dice
 * quién aprobó qué. Quien administra crea las cuentas y le pasa a cada uno su usuario y su
 * clave; cada quien puede cambiar la suya.
 */
export default async function Equipo() {
  const [quien, personas] = await Promise.all([quienEntro(), listarUsuarios(db)])
  return (
    <AdminShell>
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">Panel interno</p>
        <h1 className="mt-3 font-serif text-[46px] leading-[1.05] tracking-[-.025em] text-[var(--ink)]">
          <span className="underline-banana">Equipo</span>
        </h1>
        <p className="mt-3.5 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--secundario)]">
          Cada persona entra con su usuario y su clave.
        </p>
      </header>
      <PanelEquipo
        personas={personas.map(p => ({ id: p.id, nombre: p.nombre, usuario: p.usuario, esAdmin: p.esAdmin, activo: p.activo }))}
        yo={quien ? { id: quien.id, esAdmin: quien.esAdmin, maestra: quien.maestra } : null}
      />
    </AdminShell>
  )
}
