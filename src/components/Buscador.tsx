'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/** Algo a lo que se puede saltar: un cliente o un paso de un cliente. */
export interface Buscable {
  tipo: 'cliente' | 'paso'
  titulo: string
  /** “Landscape · Te toca” o el nombre del cliente del paso. */
  detalle: string
  href: string
}

/** Sin tildes ni mayúsculas: “cafe” encuentra “Café”. */
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const MAXIMO = 8

/**
 * El buscador del panel: escribir el nombre de un cliente, el de un paso o su número
 * (“2.2”) y saltar ahí. ⌘K (o Ctrl+K) lo enfoca desde cualquier pantalla. Busca sobre la
 * lista que ya trajo el servidor: no hay consultas mientras se escribe.
 */
export function Buscador({ items }: { items: Buscable[] }) {
  const router = useRouter()
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [marcado, setMarcado] = useState(0)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        campo.current?.focus()
        setAbierto(true)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  const resultados = useMemo(() => {
    const q = normalizar(texto.trim())
    if (!q) return []
    const palabras = q.split(/\s+/)
    return items
      .filter(i => {
        const donde = normalizar(`${i.titulo} ${i.detalle}`)
        return palabras.every(p => donde.includes(p))
      })
      // Los clientes primero: buscar “heroica” es casi siempre querer ir al proyecto. El
      // sort es estable, así que entre pasos se respeta el orden que trae la lista.
      .sort((a, b) => Number(b.tipo === 'cliente') - Number(a.tipo === 'cliente'))
      .slice(0, MAXIMO)
  }, [items, texto])

  function ir(href: string) {
    setTexto('')
    setAbierto(false)
    campo.current?.blur()
    router.push(href)
  }

  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-2.5 py-2 text-[var(--rotulo)] focus-within:border-[var(--ink)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only">Buscar un cliente o un paso</span>
        <input
          ref={campo}
          value={texto}
          placeholder="Buscar cliente o paso"
          role="combobox"
          aria-expanded={abierto && resultados.length > 0}
          aria-controls="resultados-busqueda"
          aria-activedescendant={resultados.length ? `resultado-${marcado}` : undefined}
          onChange={e => { setTexto(e.target.value); setAbierto(true); setMarcado(0) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado(m => Math.min(m + 1, resultados.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado(m => Math.max(m - 1, 0)) }
            if (e.key === 'Enter' && resultados[marcado]) { e.preventDefault(); ir(resultados[marcado].href) }
            if (e.key === 'Escape') { setTexto(''); campo.current?.blur() }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--ink)] placeholder:text-[var(--rotulo)] focus:outline-none"
        />
        <kbd className="rounded-[4px] border border-[var(--line)] px-1.5 py-px font-mono text-[10.5px] text-[var(--rotulo)]">⌘K</kbd>
      </label>

      {abierto && texto.trim() && (
        <ul id="resultados-busqueda" role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[10px] border border-[var(--line)] bg-white py-1 shadow-[0_12px_32px_rgba(21,18,12,.14)]">
          {resultados.length === 0 ? (
            <li className="px-3 py-2.5 text-[13px] text-[var(--secundario)]">Nada con “{texto.trim()}”.</li>
          ) : resultados.map((r, i) => (
            <li key={r.href} id={`resultado-${i}`} role="option" aria-selected={i === marcado}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); ir(r.href) }}
                onMouseEnter={() => setMarcado(i)}
                className={`flex w-full items-baseline gap-2.5 px-3 py-2 text-left ${i === marcado ? 'bg-[var(--superficie)]' : ''}`}
              >
                <span className="w-12 flex-none font-mono text-[10.5px] uppercase tracking-[.08em] text-[var(--rotulo)]">{r.tipo === 'cliente' ? 'Cliente' : 'Paso'}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-[var(--ink)]">{r.titulo}</span>
                  <span className="block truncate text-[12px] text-[var(--secundario)]">{r.detalle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
