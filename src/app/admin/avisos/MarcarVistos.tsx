'use client'

import { useEffect } from 'react'

/**
 * Abrir los avisos es haberlos visto. Va en el cliente, después de mostrarse, y no en el
 * render del servidor: así un prefetch del link no los da por vistos sin que nadie mire.
 */
export function MarcarVistos() {
  useEffect(() => {
    fetch('/api/avisos/vistos', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
