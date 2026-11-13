import type { Quien } from '@/lib/seguimiento/sistema'

/**
 * El chip de “qué sigue”: el mismo en el Pipeline y en el menú de cada cliente, para que
 * “Te toca” se vea igual en los dos lados. Lo que espera al equipo va en amarillo y lo de Claude
 * en tinta.
 */
export const CHIP: Record<Quien, string> = {
  revisar: 'bg-[var(--banana)] text-[var(--ink)]',
  equipo: 'bg-[var(--banana)] text-[var(--ink)]',
  claude: 'bg-[var(--ink)] text-white',
  cliente: 'bg-[var(--superficie)] text-[var(--secundario)]',
  pausa: 'border border-dashed border-[var(--apagado)] text-[var(--secundario)]',
  fuera: 'bg-[var(--superficie)] text-[var(--secundario)]',
  listo: 'bg-[var(--papel-hondo)] text-[var(--ink)]',
}

/** Lo que va antes del texto del chip: se lee sin depender del color. */
export const MARCA: Partial<Record<Quien, string>> = { cliente: '○ ', pausa: '‖ ', listo: '✓ ' }
