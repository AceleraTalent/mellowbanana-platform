'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * El modal del panel: un `<dialog>` nativo, así el foco queda adentro, Esc lo cierra y el
 * lector de pantalla sabe que es un diálogo sin que haya que reinventarlo. El fondo es el
 * mismo papel, desenfocado (ver `.modal` en globals.css). Se monta cuando se abre.
 */
export function Modal({ titulo, onCerrar, ancho = 560, children }: {
  /** Para el lector de pantalla; el título visible va adentro, en el contenido. */
  titulo: string
  onCerrar: () => void
  ancho?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Sin limpieza que lo cierre: al desmontarse, el <dialog> sale del DOM y deja de estar
  // abierto. Cerrarlo a mano dispararía `close`, y React en desarrollo monta, desmonta y
  // vuelve a montar: el modal se cerraría solo apenas abierto.
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      className="modal"
      style={{ maxWidth: ancho }}
      onClose={onCerrar}
      // Un clic en el fondo desenfocado cae sobre el propio <dialog>, no sobre su contenido.
      onClick={e => { if (e.target === ref.current) onCerrar() }}
    >
      {children}
    </dialog>
  )
}

/** La X de arriba a la derecha, igual en todos los modales. */
export function CerrarModal({ onCerrar }: { onCerrar: () => void }) {
  return (
    <button type="button" onClick={onCerrar} aria-label="Cerrar"
      className="grid h-9 w-9 flex-none place-items-center rounded-full text-[var(--secundario)] transition-colors hover:bg-[var(--superficie)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--ink)]">
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  )
}
