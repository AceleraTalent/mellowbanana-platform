import type { ReactNode } from 'react'

/**
 * El encabezado de cada pantalla del panel, en la dirección “Papel”: dónde estás en la
 * mono, el título grande subrayado en amarillo y, si hace falta, una bajada y las acciones
 * de la pantalla a la derecha. Es uno solo para que ninguna pantalla vuelva a quedar con
 * otro tamaño u otra jerarquía.
 */
export function EncabezadoPagina({ rotulo, titulo, bajada, children }: {
  /** Dónde estás: "Taller · Entrevistas", "Landscape · 3 de 6 secciones listas". */
  rotulo: ReactNode
  titulo: ReactNode
  bajada?: ReactNode
  /** Las acciones de la pantalla (descargar, generar…), a la derecha del título. */
  children?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">{rotulo}</p>
        <h1 className="mt-3 font-serif text-[38px] leading-[1.1] tracking-[-.025em] text-[var(--ink)]">
          <span className="underline-banana">{titulo}</span>
        </h1>
        {bajada && <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.55] text-[var(--secundario)]">{bajada}</p>}
      </div>
      {children && <div className="flex flex-none flex-wrap items-center gap-2 pb-1">{children}</div>}
    </header>
  )
}
