'use client'

import { useMemo, useState } from 'react'
import { FASE_LABEL, type FaseSistema } from '@/lib/seguimiento/sistema'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { URGENCIA } from './chips'
import { CajonCliente } from './CajonCliente'
import { diasHasta, encargadosConocidos, fechaCorta, personas, valorCorto } from './cliente'
import { Avatar, ChipEstado, ChipFase, type TonoEstado } from './fase'

/**
 * El Pipeline como lista: una fila por cliente con su etapa, su avance, quién lo lleva, la
 * entrega, el valor y cómo va. No se edita acá: un clic en la fila abre el resumen del
 * cliente, y de ahí se lo edita o se va a su proyecto completo.
 */

export { URGENCIA }

export async function guardar(id: string, cambios: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${id}/seguimiento`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  })
  if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'No se pudo guardar')
}

/** Cómo va un cliente respecto de su entrega, en una palabra. */
export function estadoDe(fila: FilaSistema, hoy = new Date()): { texto: string; tono: TonoEstado } {
  if (fila.sigue.quien === 'listo') return { texto: 'Terminado', tono: 'quieto' }
  if (fila.sigue.quien === 'pausa') return { texto: 'En pausa', tono: 'quieto' }
  const fecha = fila.seguimiento.fechaEntrega
  if (!fecha) return { texto: 'Sin fecha', tono: 'quieto' }
  const dias = diasHasta(fecha, hoy)
  if (dias < 0) return { texto: 'Atrasado', tono: 'mal' }
  if (dias <= 14 && fila.avance < 70) return { texto: 'En riesgo', tono: 'ojo' }
  return { texto: 'En tiempo', tono: 'bien' }
}

/** La línea chica bajo el nombre: dónde hace el proceso y en qué anda. */
export function bajadaDe(fila: FilaSistema): string {
  const donde = fila.seguimiento.porFuera ? 'Por fuera' : 'En la plataforma'
  const que = fila.seguimiento.notas?.split('\n')[0] ?? fila.sigue.detalle ?? (fila.sigue.quien === 'listo' ? undefined : fila.sigue.texto)
  return que ? `${donde} · ${que}` : donde
}

const TH = 'h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pl-6 last:pr-6'
const TD = 'px-4 py-3 align-middle first:pl-6 last:pr-6'

export function TablaSistema({ filas, fase }: { filas: FilaSistema[]; /** La fase que llega elegida desde el menú. */ fase?: FaseSistema }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const filaAbierta = abierto ? filas.find(f => f.id === abierto) : undefined
  const encargados = useMemo(() => encargadosConocidos(filas.map(f => f.seguimiento.encargado)), [filas])
  const visibles = filas
    .filter(f => !fase || f.actual === fase)
    .sort((a, b) => URGENCIA[a.sigue.quien] - URGENCIA[b.sigue.quien] || a.nombre.localeCompare(b.nombre))
  // El valor es de dirección: para el equipo, la columna no existe.
  const conValor = !filas.some(f => f.valorOculto)

  return (
    <div className="rounded-2xl border border-border/70 bg-card text-card-foreground shadow-soft">
      <div className="flex items-start justify-between gap-4 p-6 pb-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">{fase ? `Proyectos en ${FASE_LABEL[fase]}` : 'Proyectos en curso'}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Haz clic en un proyecto para ver su resumen</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{visibles.length} {visibles.length === 1 ? 'proyecto' : 'proyectos'}</span>
      </div>
      {visibles.length === 0 ? (
        <p className="border-t py-12 text-center text-sm text-muted-foreground">No hay clientes en {fase ? FASE_LABEL[fase] : 'la plataforma'}.</p>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <table aria-label="Clientes" className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className={TH}>Cliente y proyecto</th>
                <th className={TH}>Etapa</th>
                <th className={`${TH} min-w-[130px]`}>Avance</th>
                <th className={TH}>Responsable</th>
                <th className={TH}>Entrega</th>
                {conValor && <th className={`${TH} text-right`}>Valor</th>}
                <th className={TH}>Estado</th>
                <th className={`${TH} w-8`}><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {visibles.map(f => {
                const terminado = f.sigue.quien === 'listo'
                const gente = personas(f.seguimiento.encargado).map(p => p.nombre)
                const estado = estadoDe(f)
                return (
                  <tr key={f.id} onClick={() => setAbierto(f.id)} className="group cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <Avatar nombre={f.nombre} size={40} cuadrado />
                        <div className="min-w-0 max-w-[260px]">
                          <button type="button" className="block max-w-full truncate text-left font-semibold">{f.nombre}</button>
                          <p className="truncate text-xs text-muted-foreground">{bajadaDe(f)}</p>
                        </div>
                      </div>
                    </td>
                    <td className={TD}><ChipFase fase={terminado ? 'terminado' : f.actual}>{terminado ? 'Terminado' : FASE_LABEL[f.actual]}</ChipFase></td>
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${f.avance}%` }} /></div>
                        <span className="tabular w-9 text-right text-xs font-semibold text-muted-foreground">{f.avance}%</span>
                      </div>
                    </td>
                    <td className={TD}>
                      {gente.length ? (
                        <div className="flex items-center gap-2" title={gente.join(', ')}>
                          <Avatar nombre={gente[0]} size={28} anillo />
                          <span className="whitespace-nowrap text-sm font-medium">{gente[0].split(' ')[0]}{gente.length > 1 && <span className="text-muted-foreground"> +{gente.length - 1}</span>}</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">Sin asignar</span>}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-sm font-medium`}>{f.seguimiento.fechaEntrega ? fechaCorta(f.seguimiento.fechaEntrega) : <span className="font-normal text-muted-foreground">Sin fecha</span>}</td>
                    {conValor && <td className={`${TD} tabular text-right font-semibold`}>{f.seguimiento.valor !== null ? valorCorto(f.seguimiento.valor) : <span className="font-normal text-muted-foreground">—</span>}</td>}
                    <td className={TD}><ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado></td>
                    <td className={TD}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-foreground"><path d="m9 18 6-6-6-6" /></svg>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {filaAbierta && <CajonCliente fila={filaAbierta} encargados={encargados} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}
