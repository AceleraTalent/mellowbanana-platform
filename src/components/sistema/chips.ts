import type { Quien } from '@/lib/seguimiento/sistema'

/**
 * El chip de “qué sigue”: el mismo en el Pipeline y en el menú de cada cliente, para que
 * “Te toca” se vea igual en los dos lados. Cada uno con su color: lo que espera al equipo
 * en ámbar, lo de Claude en violeta, lo terminado en verde.
 */
export const CHIP: Record<Quien, string> = {
  revisar: 'bg-[#fef3c7] text-[#92400e]',
  equipo: 'bg-[var(--primario-suave)] text-[var(--primario)]',
  claude: 'bg-[#ede9fe] text-[#6d28d9]',
  cliente: 'bg-[var(--superficie)] text-[var(--secundario)]',
  pausa: 'border border-dashed border-[var(--apagado)] text-[var(--secundario)]',
  fuera: 'bg-[var(--superficie)] text-[var(--secundario)]',
  listo: 'bg-[#d1fae5] text-[#047857]',
}

/** Lo que va antes del texto del chip: se lee sin depender del color. */
export const MARCA: Partial<Record<Quien, string>> = { cliente: '○ ', pausa: '‖ ', listo: '✓ ' }
