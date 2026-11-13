import { db } from '@/lib/db/client'
import { quienEntro } from '@/lib/admin/auth'
import { listarUsuarios } from '@/lib/db/usuarios-store'
import { AdminShell } from '@/components/AdminShell'
import { PanelEquipo } from './PanelEquipo'
import { EncabezadoPagina } from '@/components/EncabezadoPagina'

export const dynamic = 'force-dynamic'

/**
 * Quiénes entran al panel. Cada persona tiene su usuario y su clave: así el historial dice
 * quién aprobó qué. Quien administra crea las cuentas y le pasa a cada uno su usuario y su
 * clave; cada quien puede cambiar la suya.
 */
export default async function Equipo() {
  const [quien, personas] = await Promise.all([quienEntro(), listarUsuarios(db)])
  return (
    <AdminShell seccion="equipo">
      <EncabezadoPagina rotulo="Panel interno" titulo="Equipo" bajada="Cada persona entra con su usuario y su clave." />
      <PanelEquipo
        personas={personas.map(p => ({ id: p.id, nombre: p.nombre, usuario: p.usuario, esAdmin: p.esAdmin, activo: p.activo }))}
        yo={quien ? { id: quien.id, esAdmin: quien.esAdmin, maestra: quien.maestra } : null}
      />
    </AdminShell>
  )
}
