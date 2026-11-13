'use client'

import { useMemo, useState } from 'react'
import { FASES, FASE_LABEL } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { CajonCliente } from './CajonCliente'
import { encargadosConocidos, fechaCorta } from './cliente'
import { Avatar, FASE_ESTILO } from './fase'

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
  const [abierto, setAbierto] = useState<string | null>(null)
  const filaAbierta = abierto ? filas.find(f => f.id === abierto) : undefined
  const encargados = useMemo(() => encargadosConocidos(filas.map(f => f.seguimiento.encargado)), [filas])
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
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-soft">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3.5">
        {FASES.map(f => (
          <span key={f} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${FASE_ESTILO[f].barra}`} />{FASE_LABEL[f]}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-rose-600"><span aria-hidden="true" className="h-3 w-0.5 bg-rose-500" />Hoy</span>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <div className="min-w-[900px]">
          <div className="flex border-b">
            <div className="w-[230px] shrink-0 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proyecto</div>
            <div className="relative h-9 flex-1">
              {meses.map((m, i) => i % cada === 0 && (
                <span key={m.ms} className="absolute top-2.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold capitalize text-muted-foreground" style={{ left: `${pos(m.ms)}%` }}>{m.label}</span>
              ))}
            </div>
          </div>

          <ul>
            {orden.map(f => {
              const ini = utc(f.inicioIso)
              const entrega = f.seguimiento.fechaEntrega ? utc(f.seguimiento.fechaEntrega) : null
              const terminado = f.sigue.quien === 'listo'
              // Sin plazo válido (sin entrega, o una entrega anterior al inicio) no hay barra que partir.
              const fin = entrega !== null && entrega > ini ? entrega : null
              return (
                <li key={f.id} className="group flex items-center border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <button type="button" onClick={() => setAbierto(f.id)} className="flex w-[230px] shrink-0 items-center gap-2.5 px-5 py-3 text-left">
                    <Avatar nombre={f.nombre} size={32} cuadrado />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{f.nombre}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{terminado ? 'Terminado' : FASE_LABEL[f.actual]}</span>
                    </span>
                  </button>
                  <div className="relative h-12 flex-1">
                    {meses.map(m => <span key={m.ms} aria-hidden="true" className="absolute inset-y-0 w-px bg-border/50" style={{ left: `${pos(m.ms)}%` }} />)}
                    <span aria-hidden="true" className="absolute inset-y-0 z-10 w-0.5 bg-rose-500/80" style={{ left: `${pos(hoyMs)}%` }} />
                    {fin !== null ? (
                      <div className="absolute top-3.5 flex h-5 overflow-hidden rounded-md shadow-soft ring-1 ring-black/5 transition group-hover:ring-primary/40"
                        style={{ left: `${pos(ini)}%`, width: `${Math.max(pos(fin) - pos(ini), 1.5)}%` }}
                        title={`${f.nombre}: del ${fechaCorta(f.inicioIso, hoy)} al ${fechaCorta(f.seguimiento.fechaEntrega!, hoy)}\n${f.fases.map(x => `${x.label}: ${x.detalle}`).join('\n')}`}>
                        {f.fases.map(x => (
                          <span key={x.key} data-hecha={terminado || x.estado !== 'pendiente'} className={`relative h-full flex-1 ${FASE_ESTILO[x.key].suave}`}>
                            {(terminado || x.estado !== 'pendiente') && <span className={`absolute inset-0 opacity-90 ${FASE_ESTILO[x.key].barra}`} />}
                          </span>
                        ))}
                      </div>
                    ) : entrega !== null ? (
                      // Sin un inicio anterior a la entrega no hay tramo que dibujar: sólo el día de entrega.
                      <span className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap" style={{ left: `calc(${pos(entrega)}% - 6px)` }}>
                        <span aria-hidden="true" className={`h-3 w-3 rotate-45 rounded-[3px] ${FASE_ESTILO[terminado ? 'terminado' : f.actual].barra}`} />
                        <span className="text-xs font-semibold text-muted-foreground">Entrega {fechaCorta(f.seguimiento.fechaEntrega!, hoy)}</span>
                      </span>
                    ) : (
                      <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-dashed bg-white px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                        style={{ left: `calc(${pos(ini)}% + 4px)` }}>
                        Sin fecha de entrega
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {(sinFecha > 0 || sinTramo > 0) && (
        <p className="border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          {sinTramo > 0 && <>{sinTramo} {sinTramo === 1 ? 'cliente muestra' : 'clientes muestran'} sólo el día de entrega porque su inicio es posterior. Ponles la fecha de inicio en “Editar cliente” para ver la barra completa. </>}
          {sinFecha > 0 && <>{sinFecha} {sinFecha === 1 ? 'cliente no tiene' : 'clientes no tienen'} fecha de entrega.</>}
        </p>
      )}
      {filaAbierta && <CajonCliente fila={filaAbierta} encargados={encargados} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}
