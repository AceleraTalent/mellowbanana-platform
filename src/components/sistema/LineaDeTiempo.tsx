import Link from 'next/link'
import { FASE_LABEL } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { fechaCorta } from './cliente'
import { Avatar, FASE_CLASE } from './fase'

/**
 * El Pipeline como línea de tiempo: una barra por cliente, desde que arrancó hasta su
 * fecha de entrega, partida en las cinco fases. Lo que ya se hizo va en el color de la
 * fase; lo que falta, en el mismo color apagado. La línea roja es hoy: una barra cuyo
 * color no llega a la línea va atrasada respecto de su entrega.
 *
 * La plataforma no guarda fechas por fase, así que los tramos reparten el plazo en partes
 * iguales: la barra muestra el plan, no cuándo se cerró cada fase.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const utc = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) }
const isoBogota = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d)

export function LineaDeTiempo({ filas, hoy }: { filas: FilaSistema[]; hoy: Date }) {
  const hoyMs = utc(isoBogota(hoy))
  const conFecha = filas.filter(f => f.seguimiento.fechaEntrega)
  const sinFecha = filas.length - conFecha.length
  const sinTramo = conFecha.filter(f => utc(f.seguimiento.fechaEntrega!) <= utc(f.inicioIso)).length

  // La ventana: del mes de la fecha más vieja (un inicio o una entrega) al mes siguiente de la última.
  const fechas = [...filas.map(f => utc(f.inicioIso)), ...conFecha.map(f => utc(f.seguimiento.fechaEntrega!)), hoyMs]
  const d0 = new Date(Math.min(...fechas)), d1 = new Date(Math.max(...fechas))
  const desde = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1)
  const hasta = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth() + 2, 1)
  const pos = (ms: number) => ((ms - desde) / (hasta - desde)) * 100

  const meses: { ms: number; label: string }[] = []
  for (let m = new Date(desde); m.getTime() < hasta; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)))
    meses.push({ ms: m.getTime(), label: `${MESES[m.getUTCMonth()]} ${String(m.getUTCFullYear()).slice(2)}` })
  // Con muchos meses, las etiquetas se pisan: se muestra una de cada tantas.
  const cada = Math.ceil(meses.length / 9)

  const orden = [...filas].sort((a, b) =>
    (a.seguimiento.fechaEntrega ?? '9999').localeCompare(b.seguimiento.fechaEntrega ?? '9999') || a.nombre.localeCompare(b.nombre))

  return (
    <div className="tarjeta overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] px-5 py-4 text-[13px] font-medium text-[var(--cuerpo)] sm:px-6">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="h-[9px] w-[22px] rounded-full bg-[var(--ink)]" />Etapas recorridas</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="h-[9px] w-[22px] rounded-full bg-[var(--aprobado)] ring-1 ring-inset ring-[var(--line)]" />Por recorrer</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="h-[9px] w-[9px] rotate-45 rounded-[2px] bg-[var(--ink)]" />Sólo fecha de entrega</span>
        <span className="ml-auto flex items-center gap-2 text-[var(--error)]"><span aria-hidden="true" className="h-[14px] w-[2px] rounded-full bg-[var(--error)]" />Hoy</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="rotulo grid grid-cols-[236px_minmax(0,1fr)] border-b border-[var(--line)] bg-[var(--superficie)]/60 py-3">
            <span className="px-6">Cliente</span>
            <span className="relative h-4">
              {meses.map((m, i) => i % cada === 0 && (
                <span key={m.ms} className="absolute top-0 whitespace-nowrap pl-2 normal-case tracking-normal" style={{ left: `${pos(m.ms)}%` }}>{m.label}</span>
              ))}
            </span>
          </div>

          <ul className="relative">
            {orden.map(f => {
              const ini = utc(f.inicioIso)
              const entrega = f.seguimiento.fechaEntrega ? utc(f.seguimiento.fechaEntrega) : null
              const terminado = f.sigue.quien === 'listo'
              // Sin plazo válido (sin entrega, o una entrega anterior al inicio) no hay barra que partir.
              const fin = entrega !== null && entrega > ini ? entrega : null
              return (
                <li key={f.id} className="grid grid-cols-[236px_minmax(0,1fr)] border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--superficie)]/50">
                  <Link href={f.href} className="flex min-w-0 items-center gap-3 px-6 py-3.5">
                    <Avatar nombre={f.nombre} size={34} cuadrado />
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-bold text-[var(--ink)]">{f.nombre}</span>
                      <span className="block truncate text-[12.5px] text-[var(--secundario)]">{terminado ? 'Terminado' : FASE_LABEL[f.actual]}</span>
                    </span>
                  </Link>
                  <div className="relative">
                    {meses.map(m => <span key={m.ms} aria-hidden="true" className="absolute inset-y-0 w-px bg-[var(--line)]" style={{ left: `${pos(m.ms)}%` }} />)}
                    {fin !== null ? (
                      <div className="absolute top-1/2 flex h-[22px] -translate-y-1/2 overflow-hidden rounded-full"
                        style={{ left: `${pos(ini)}%`, width: `${Math.max(pos(fin) - pos(ini), 1.5)}%` }}
                        title={`${f.nombre}: del ${fechaCorta(f.inicioIso, hoy)} al ${fechaCorta(f.seguimiento.fechaEntrega!, hoy)}\n${f.fases.map(x => `${x.label}: ${x.detalle}`).join('\n')}`}>
                        {f.fases.map(x => (
                          <span key={x.key} className={`${FASE_CLASE[x.key]} h-full flex-1 ${terminado || x.estado !== 'pendiente' ? 'bg-[var(--f)]' : 'bg-[var(--f-suave)]'}`} />
                        ))}
                      </div>
                    ) : entrega !== null ? (
                      // Sin un inicio anterior a la entrega no hay tramo que dibujar: sólo el día de entrega.
                      <span className={`${FASE_CLASE[terminado ? 'terminado' : f.actual]} absolute top-1/2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap`} style={{ left: `calc(${pos(entrega)}% - 6px)` }}>
                        <span aria-hidden="true" className="h-[12px] w-[12px] rotate-45 rounded-[3px] bg-[var(--f)]" />
                        <span className="text-[12.5px] font-medium text-[var(--secundario)]">Entrega {fechaCorta(f.seguimiento.fechaEntrega!, hoy)}</span>
                      </span>
                    ) : (
                      <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-dashed border-[var(--apagado)] bg-white px-2.5 py-0.5 text-[12px] text-[var(--rotulo)]"
                        style={{ left: `calc(${pos(ini)}% + 4px)` }}>
                        Sin fecha de entrega
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
            <li aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[236px] right-0">
              <span className="absolute inset-y-0 w-[2px] bg-[var(--error)]" style={{ left: `${pos(hoyMs)}%` }} />
            </li>
          </ul>
        </div>
      </div>

      {(sinFecha > 0 || sinTramo > 0) && (
        <p className="border-t border-[var(--line)] px-6 py-3 text-[13px] leading-[1.5] text-[var(--secundario)]">
          {sinTramo > 0 && <>{sinTramo} {sinTramo === 1 ? 'cliente muestra' : 'clientes muestran'} sólo el día de entrega porque su inicio es posterior. Ponles la fecha de inicio en “Editar cliente” para ver la barra completa. </>}
          {sinFecha > 0 && <>{sinFecha} {sinFecha === 1 ? 'cliente no tiene' : 'clientes no tienen'} fecha de entrega.</>}
        </p>
      )}
    </div>
  )
}
