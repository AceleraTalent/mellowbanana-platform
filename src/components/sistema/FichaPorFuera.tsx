'use client'

import { useRouter } from 'next/navigation'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { FormularioCliente } from './FormularioCliente'

/**
 * La ficha de un cliente que lleva su proceso por fuera: lo mismo que se edita desde el
 * tablero, abierto en su página. No hay entrevistas, Landscape ni Estrategia que mostrar;
 * lo que el equipo necesita es en qué va, quién lo lleva, para cuándo y qué falta.
 */
export function FichaPorFuera({ fila, encargados }: { fila: FilaSistema; encargados: string[] }) {
  const router = useRouter()
  return (
    <div className="mt-8 max-w-[680px] overflow-hidden rounded-[18px] border border-[var(--line)] bg-white">
      <FormularioCliente fila={fila} encargados={encargados} onListo={() => router.refresh()} />
    </div>
  )
}
