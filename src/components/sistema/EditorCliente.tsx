'use client'

import { useRouter } from 'next/navigation'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import { Modal } from '@/components/Modal'
import { FormularioCliente } from './FormularioCliente'

/** Editar un cliente sin salir del tablero ni de la tabla: el formulario, en el modal. */
export function EditorCliente({ fila, encargados, onCerrar }: { fila: FilaSistema; encargados: string[]; onCerrar: () => void }) {
  const router = useRouter()
  return (
    <Modal titulo={`Editar ${fila.nombre}`} onCerrar={onCerrar} ancho={640}>
      <FormularioCliente enModal fila={fila} encargados={encargados} onCancelar={onCerrar}
        onListo={() => { router.refresh(); onCerrar() }} />
    </Modal>
  )
}
