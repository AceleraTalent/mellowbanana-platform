/** Una cifra grande con su rótulo, su ícono y una línea que la explica. */
export function Estadistica({ rotulo, valor, unidad, pie, icono, tono }: { rotulo: string; valor: string; unidad?: string; pie: string; icono: React.ReactNode; tono: string }) {
  return (
    <div className="tarjeta p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="rotulo">{rotulo}</p>
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-full ${tono}`}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icono}</svg>
        </span>
      </div>
      <p className="mt-2 text-[40px] font-extrabold leading-none tracking-[-.03em] text-[var(--ink)]">
        {valor}{unidad && <span className="ml-2 text-[15px] font-medium tracking-normal text-[var(--secundario)]">{unidad}</span>}
      </p>
      <p className="mt-2.5 text-[13.5px] text-[var(--secundario)]">{pie}</p>
    </div>
  )
}
