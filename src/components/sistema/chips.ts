import type { Quien } from '@/lib/seguimiento/sistema'

/**
 * El chip de “qué sigue”: el mismo en la tabla del inicio y en el menú de cada cliente,
 * para que “Te toca” se vea igual en los dos lados.
 */
export const CHIP: Record<Quien, string> = {
  revisar: 'bg-[var(--banana)] text-[var(--ink)]',
  equipo: 'bg-[var(--banana)] text-[var(--ink)]',
  claude: 'bg-[var(--ink)] text-white',
  cliente: 'text-[var(--secundario)] pl-0',
  pausa: 'border border-dashed border-[var(--rotulo)] text-[var(--secundario)]',
  fuera: 'text-[var(--secundario)] pl-0 font-medium',
  listo: 'bg-[var(--papel-hondo)] text-[var(--ink)]',
}

/** Lo que va antes del texto del chip cuando no lleva fondo: se lee sin depender del color. */
export const MARCA: Partial<Record<Quien, string>> = { cliente: '○ ', pausa: '‖ ', listo: '✓ ' }
