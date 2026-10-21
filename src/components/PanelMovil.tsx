'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Escape cierra lo que está abierto encima del contenido. Lo usan el menú en móvil y los
 * diálogos de la cabecera del proyecto: es el mismo gesto, así que es un solo efecto.
 */
export function useCerrarConEscape(cerrar: () => void, activo: boolean) {
  useEffect(() => {
    if (!activo) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [cerrar, activo])
}

/**
 * En móvil no entra la barra lateral: se abre como panel desde la izquierda, encima del
 * contenido, desde la cabecera.
 */
export function PanelMovil({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])
  useCerrarConEscape(cerrar, abierto)

  return (
    <>
      <button
        type="button"
        aria-expanded={abierto}
        aria-label="Abrir el menú"
        onClick={() => setAbierto(a => !a)}
        className="rounded-[6px] border border-[var(--line)] px-2.5 py-1 font-mono text-[12px] uppercase tracking-[.1em] text-[var(--ink)]"
      >
        Menú
      </button>

      {abierto && (
        <>
          <div aria-hidden="true" onClick={cerrar} className="fixed inset-0 z-40 bg-[rgba(21,18,12,.14)]" />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto bg-[var(--papel)] shadow-2xl">{children}</div>
        </>
      )}
    </>
  )
}
