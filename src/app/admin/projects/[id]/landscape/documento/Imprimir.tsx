'use client'

import { BOTON_PRIMARIO } from '@/components/paso/piezas'

/** El navegador imprime o guarda en PDF: no hace falta generar el archivo en el servidor. */
export function Imprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={`${BOTON_PRIMARIO} px-4 py-2`}>
      Imprimir o guardar PDF
    </button>
  )
}
