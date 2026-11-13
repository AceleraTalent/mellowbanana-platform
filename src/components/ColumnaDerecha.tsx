'use client'

import { useSyncExternalStore } from 'react'

const CLAVE = 'mb-columna-derecha'

function leer(): boolean {
  try { return localStorage.getItem(CLAVE) !== 'cerrada' } catch { return true }
}
function suscribir(avisar: () => void) {
  window.addEventListener(CLAVE, avisar)
  window.addEventListener('storage', avisar)
  return () => { window.removeEventListener(CLAVE, avisar); window.removeEventListener('storage', avisar) }
}

/**
 * La columna derecha del panel y el contenido a su lado. Se puede encoger para darle el
 * ancho al Pipeline: el botón está arriba de la columna y, encogida, queda una pestaña en
 * el borde para volver a abrirla. Lo elegido se recuerda en ese navegador.
 */
export function ColumnaDerecha({ columna, children }: { columna: React.ReactNode; children: React.ReactNode }) {
  // Lo elegido vive en el navegador; el servidor siempre la dibuja abierta.
  const abierta = useSyncExternalStore(suscribir, leer, () => true)
  function cambiar(a: boolean) {
    try { localStorage.setItem(CLAVE, a ? 'abierta' : 'cerrada') } catch { /* sin almacenamiento no se recuerda */ }
    window.dispatchEvent(new Event(CLAVE))
  }

  return (
    <>
      {abierta ? (
        <aside aria-label="Actividad" className="fixed bottom-0 right-0 top-[68px] z-10 hidden w-[340px] flex-col border-l border-border/70 bg-white xl:flex">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-2.5">
            <p className="text-sm font-bold">Actividad</p>
            <button type="button" onClick={() => cambiar(false)} aria-expanded="true"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-soft transition hover:bg-muted hover:text-foreground">
              Ocultar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18M8 9l3 3-3 3" /></svg>
            </button>
          </div>
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 scroll-thin">{columna}</div>
        </aside>
      ) : (
        <button type="button" onClick={() => cambiar(true)} aria-expanded="false" aria-label="Mostrar la actividad"
          className="fixed right-0 top-[88px] z-10 hidden items-center gap-1.5 rounded-l-xl border border-r-0 bg-white py-2.5 pl-3 pr-2.5 text-xs font-semibold text-slate-600 shadow-lift transition hover:bg-muted hover:text-foreground xl:flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18M10 15l-3-3 3-3" /></svg>
          Actividad
        </button>
      )}
      <main className={`mx-auto w-full max-w-[1500px] overflow-x-clip px-4 py-8 transition-[padding] duration-200 sm:px-6 lg:px-8 ${abierta ? 'xl:pr-[372px]' : ''}`}>{children}</main>
    </>
  )
}
