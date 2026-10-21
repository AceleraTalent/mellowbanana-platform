import type { PhaseStatus } from '@/lib/pipeline/phases'
import { EncabezadoPagina } from './EncabezadoPagina'

const ESTADO: Record<PhaseStatus, string> = {
  completa: 'Hecho',
  en_curso: 'En curso',
  espera: 'En espera',
  pendiente: 'Pendiente',
}

/**
 * La pantalla de una fase que se trabaja fuera de la plataforma (el taller en Miro): dice
 * en qué estado está y qué vuelve de ella. Usa el mismo encabezado que el resto del panel.
 */
export function PhaseNote({ titulo, rotulo, estado, bajada, children }: {
  titulo: string
  /** La fase a la que pertenece: "Taller". */
  rotulo: string
  estado: PhaseStatus
  bajada: string
  children?: React.ReactNode
}) {
  return (
    <section className="max-w-[860px]">
      <EncabezadoPagina rotulo={`${rotulo} · ${ESTADO[estado]}`} titulo={titulo} bajada={bajada} />
      {children}
    </section>
  )
}
