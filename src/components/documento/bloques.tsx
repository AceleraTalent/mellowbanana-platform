/**
 * Las piezas con las que se arma el documento de un paso. Lo que Claude guarda es jsonb
 * libre, así que todo acá es defensivo: cada pieza recibe `unknown`, se queda con lo que
 * entiende y no rinde nada si no hay nada. Nunca revienta por una forma inesperada.
 */

import type { ReactNode } from 'react'

export const txt = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
export const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
export const textos = (v: unknown): string[] => lista(v).map(txt).filter(Boolean)
export const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** Una sección del documento, con su título y, si tiene, su número. */
export function Seccion({ titulo, numero, children, id }: { titulo: string; numero?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-8 pt-4">
      <h2 className="flex items-baseline gap-3.5 font-serif text-[26px] leading-[1.2] tracking-[-.015em] text-[var(--ink)]">
        {numero && <span className="font-mono text-[14px] tabular-nums tracking-normal text-[var(--rotulo)]">{numero.padStart(2, '0')}</span>}
        <span>{titulo}</span>
      </h2>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  )
}

/** Un rótulo chico en mono, para nombrar un bloque sin hacerlo título. */
export function Rotulo({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{children}</p>
}

export function Parrafo({ texto }: { texto: unknown }) {
  const t = txt(texto)
  if (!t) return null
  return <p className="max-w-[64ch] whitespace-pre-line text-[16px] leading-[1.75] text-[var(--cuerpo)]">{t}</p>
}

/** La idea más importante del paso, grande. Un resumen, una pregunta central. */
export function Destacado({ texto, rotulo }: { texto: unknown; rotulo?: string }) {
  const t = txt(texto)
  if (!t) return null
  return (
    <div>
      {rotulo && <Rotulo>{rotulo}</Rotulo>}
      {/* Los titulares sólo están en Bold: un párrafo largo en Bold cansa. Lo corto (una
          pregunta) va en la de titulares; lo largo (un resumen) en el cuerpo, más grande. */}
      <p className={`${rotulo ? 'mt-3 ' : ''}max-w-[62ch] text-[var(--ink)] ${
        t.length <= 200
          ? 'font-serif text-[25px] leading-[1.35] tracking-[-.015em]'
          : 'text-[19px] leading-[1.65] tracking-[-.005em]'
      }`}>{t}</p>
    </div>
  )
}

/**
 * Lo que concluye Claude a partir de los datos. No es un dato y se tiene que ver distinto:
 * el equipo lo lee como una opinión para discutir, no como algo verificado.
 */
export function Interpretacion({ texto, titulo = 'Interpretación' }: { texto: unknown; titulo?: string }) {
  const t = txt(texto)
  if (!t) return null
  return (
    <div className="max-w-[68ch] rounded-[4px] bg-[var(--papel-hondo)] px-6 py-5">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--secundario)]">
        <span className="rounded-[3px] bg-[var(--banana)] px-1.5 py-0.5 text-[var(--ink)]">{titulo}</span>
        lo concluye Claude, no es un dato
      </p>
      <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.7] text-[var(--cuerpo)]">{t}</p>
    </div>
  )
}

/** Viñetas limpias. `numerada` cuando el orden importa (implicaciones, pasos). */
export function Puntos({ items, numerada }: { items: unknown; numerada?: boolean }) {
  const ts = textos(items)
  if (!ts.length) return null
  return (
    <ul className="max-w-[64ch] space-y-3">
      {ts.map((t, i) => (
        <li key={i} className="flex gap-3.5 text-[16px] leading-[1.65] text-[var(--cuerpo)]">
          {numerada
            ? <span className="w-6 flex-none pt-[3px] font-mono text-[12.5px] tabular-nums text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>
            : <span className="mt-[11px] h-[5px] w-[5px] flex-none rounded-full bg-[var(--primario)]" aria-hidden="true" />}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Lo que falta averiguar. Se pinta en ámbar suave porque es trabajo pendiente para el
 * equipo, no contenido para el deck.
 */
export function Faltantes({ items, titulo = 'Falta averiguar' }: { items: unknown; titulo?: string }) {
  const ts = textos(items)
  if (!ts.length) return null
  return (
    <div className="max-w-[68ch] rounded-[4px] bg-[#F8EFCF] px-6 py-5">
      <p className="font-mono text-[11px] uppercase tracking-[.12em] text-[#6B4A00]">{titulo} · {ts.length}</p>
      <ul className="mt-3 space-y-2.5">
        {ts.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-[1.6] text-[#4D3A00]">
            <span aria-hidden="true" className="mt-[1px]">△</span><span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Fichas de “rótulo → valor” en dos columnas. Para datos cortos del proyecto. */
export function Ficha({ filas }: { filas: [string, unknown][] }) {
  const visibles = filas.map(([r, v]) => [r, txt(v)] as const).filter(([, v]) => v)
  if (!visibles.length) return null
  return (
    <dl className="grid gap-x-10 gap-y-5 border-y border-[var(--line)] py-6 sm:grid-cols-2">
      {visibles.map(([r, v]) => (
        <div key={r} className="min-w-0">
          <dt className="text-[13px] text-[var(--rotulo)]">{r}</dt>
          <dd className="mt-1.5 text-[15.5px] leading-[1.6] text-[var(--ink)]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Tarjetas en grilla: para ejes, grupos de competidores, hallazgos. */
export function Tarjetas({ children, columnas = 2 }: { children: ReactNode; columnas?: 2 | 3 }) {
  return <div className={`grid gap-x-8 gap-y-6 ${columnas === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>{children}</div>
}

export function Tarjeta({ titulo, children, tono }: { titulo?: string; children: ReactNode; tono?: 'claro' }) {
  return (
    // Una columna con regla arriba, no una caja: en papel, los bloques se separan con líneas.
    <div className={`min-w-0 border-t-[1.5px] pt-3.5 ${tono === 'claro' ? 'border-[var(--banana)]' : 'border-[var(--ink)]'}`}>
      {titulo && <p className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{titulo}</p>}
      <div className={titulo ? 'mt-2.5' : ''}>{children}</div>
    </div>
  )
}

/** Etiquetas cortas en línea: marcas analizadas, audiencias. */
export function Chips({ items }: { items: unknown }) {
  const ts = textos(items)
  if (!ts.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {ts.map((t, i) => (
        <span key={i} className="rounded-[4px] border border-[var(--line)] px-2 py-[3px] text-[13.5px] text-[var(--cuerpo)]">{t}</span>
      ))}
    </div>
  )
}

/** De qué sitio viene un link, para que se lea “nmma.org” y no la URL entera. */
export function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Una fuente chiquita, en línea. Si tiene link, abre en otra pestaña. */
export function ChipFuente({ texto, url }: { texto: string; url?: string }) {
  const clase = 'inline-flex max-w-full items-center gap-1 truncate font-mono text-[11.5px] text-[var(--secundario)]'
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className={`${clase} underline decoration-[var(--line)] underline-offset-[3px] hover:text-[var(--ink)] hover:decoration-[var(--ink)]`}>{texto} <span aria-hidden="true">↗</span></a>
    : <span className={clase}>{texto}</span>
}

/** Las fuentes de un bloque, sean `{url, titulo}` o `{doc, url?, pagina?}`. */
export function FuentesEnLinea({ fuentes }: { fuentes: unknown }) {
  const fs = lista(fuentes).map(obj).filter(f => txt(f.titulo) || txt(f.doc) || txt(f.url))
  if (!fs.length) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {fs.map((f, i) => {
        const url = txt(f.url) || undefined
        const nombre = txt(f.titulo) || txt(f.doc) || (url ? dominio(url) : '')
        const pagina = txt(f.pagina)
        return <ChipFuente key={i} texto={pagina ? `${nombre} · p.${pagina}` : nombre} url={url} />
      })}
    </div>
  )
}

/**
 * Parte un dato escrito como “EE. UU.: USD 54.000 M de gasto (NMMA)” en sus tres partes:
 * de qué es, cuánto es y de dónde sale. Si no tiene esa forma, el texto entero es el valor.
 */
export function partirDato(s: string): { etiqueta?: string; valor: string; fuente?: string } {
  let resto = s.trim()
  let fuente: string | undefined
  const m = resto.match(/\s*\(([^()]{2,60})\)\s*\.?$/)
  if (m && m.index !== undefined && m.index > 0) {
    fuente = m[1].trim()
    resto = resto.slice(0, m.index).trim()
  }
  const i = resto.indexOf(': ')
  if (i > 0 && i <= 48) return { etiqueta: resto.slice(0, i), valor: resto.slice(i + 2), fuente }
  return { valor: resto, fuente }
}

/**
 * Las cifras de una sección, como filas de un libro contable: de qué es, cuánto, y de dónde
 * sale, alineado a la derecha. Lo que no dice de dónde sale queda marcado en ámbar.
 */
export function Cifras({ datos }: { datos: unknown }) {
  const ds = textos(datos).map(partirDato)
  if (!ds.length) return null
  return (
    <div className="border-t-[1.5px] border-[var(--ink)]">
      {ds.map((d, i) => (
        <div key={i} className="grid gap-x-6 gap-y-1 border-b border-[var(--line)] py-3.5 sm:grid-cols-[170px_minmax(0,1fr)_auto] sm:items-baseline">
          <span className="text-[13.5px] text-[var(--secundario)]">{d.etiqueta ?? ''}</span>
          <span className="text-[16px] font-medium leading-[1.45] text-[var(--ink)]">{d.valor}</span>
          {d.fuente
            ? <span className="font-mono text-[12px] text-[var(--secundario)] sm:text-right">{d.fuente}</span>
            : <span className="font-mono text-[12px] text-[#8A5A00] sm:text-right">△ Sin fuente</span>}
        </div>
      ))}
    </div>
  )
}
