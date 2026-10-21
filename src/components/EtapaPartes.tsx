'use client'

/**
 * Las piezas sueltas que comparten el Landscape y la Estrategia: la nota de por qué algo
 * está trabado y el aviso de una versión nueva. Están acá para que el estilo sea uno solo.
 */

/**
 * Lo que esta fase necesita de otra y todavía no llegó. Es la única pieza del panel que
 * explica *por qué* algo está trabado, así que va arriba del documento y no en el índice:
 * el índice navega, no explica.
 */
export function NotaDependencia({ texto }: { texto: string }) {
  return (
    <p className="mt-6 max-w-[60ch] border-l-[1.5px] border-[var(--ink)] pl-3 text-[13px] leading-[1.66] text-[var(--secundario)]">
      {texto}
    </p>
  )
}

/**
 * El camino de vuelta al comparador. Mirar sólo la aprobada es una acción de vista, no una
 * decisión: mientras el borrador siga sin resolverse tiene que estar a un clic — y el
 * índice, que sigue marcando la etapa como “espera al equipo”, dice lo mismo.
 */
export function AvisoVersionNueva({ autor, cuando, onVer }: { autor: string; cuando: string; onVer: () => void }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-3">
      <p className="text-[13px] text-[var(--secundario)]">
        {autor} escribió una versión nueva {cuando}, sin aprobar.
      </p>
      <button
        type="button"
        onClick={onVer}
        className="rounded-[7px] border border-[var(--line)] px-3 py-1.5 text-[13px] text-[var(--cuerpo)] transition-colors duration-200 hover:border-[var(--ink)] motion-reduce:transition-none"
      >
        Ver la versión nueva
      </button>
    </div>
  )
}
