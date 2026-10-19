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
    <section id={id} className="scroll-mt-8 border-t border-[var(--line)] pt-7">
      <h2 className="flex items-baseline gap-3 font-serif text-[21px] leading-[1.25] tracking-[-.01em] text-[var(--ink)]">
        {numero && <span className="font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{numero}</span>}
        <span>{titulo}</span>
      </h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

/** Un rótulo chico en mono, para nombrar un bloque sin hacerlo título. */
export function Rotulo({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold font-mono uppercase tracking-[.14em] text-[var(--rotulo)]">{children}</p>
}

export function Parrafo({ texto }: { texto: unknown }) {
  const t = txt(texto)
  if (!t) return null
  return <p className="max-w-[66ch] whitespace-pre-line text-[15px] leading-[1.7] text-[var(--cuerpo)]">{t}</p>
}

/** La idea más importante del paso, grande. Un resumen, una pregunta central. */
export function Destacado({ texto, rotulo }: { texto: unknown; rotulo?: string }) {
  const t = txt(texto)
  if (!t) return null
  return (
    <div className="rounded-[14px] bg-[var(--aprobado)] px-6 py-5">
      {rotulo && <Rotulo>{rotulo}</Rotulo>}
      {/* Favorit sólo está en Bold: un párrafo largo en Bold cansa. Lo corto (una pregunta)
          va en Favorit; lo largo (un resumen) en el cuerpo de texto, más grande. */}
      <p className={`${rotulo ? 'mt-2 ' : ''}max-w-[64ch] text-[var(--ink)] ${
        t.length <= 200
          ? 'font-serif text-[20px] leading-[1.4] tracking-[-.005em]'
          : 'text-[16.5px] leading-[1.7]'
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
    <div className="max-w-[66ch] rounded-[10px] border-l-[3px] border-[var(--banana)] bg-[var(--superficie)] px-4 py-3.5">
      <p className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-[.14em] text-[var(--secundario)]">
        <span aria-hidden="true">✦</span>{titulo}
        <span className="font-normal normal-case tracking-normal text-[var(--rotulo)]">· lo concluye Claude, no es un dato</span>
      </p>
      <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-[var(--cuerpo)]">{t}</p>
    </div>
  )
}

/** Viñetas limpias. `numerada` cuando el orden importa (implicaciones, pasos). */
export function Puntos({ items, numerada }: { items: unknown; numerada?: boolean }) {
  const ts = textos(items)
  if (!ts.length) return null
  return (
    <ul className="max-w-[66ch] space-y-2.5">
      {ts.map((t, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.6] text-[var(--cuerpo)]">
          {numerada
            ? <span className="mt-[3px] flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--ink)] font-mono text-[10.5px] text-white">{i + 1}</span>
            : <span className="mt-[9px] h-[5px] w-[5px] flex-none rounded-full bg-[var(--ink)]" aria-hidden="true" />}
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
    <div className="max-w-[66ch] rounded-[12px] border border-[#F1DFA6] bg-[#FFF9E6] px-5 py-4">
      <p className="text-[13px] font-semibold text-[#7A5B00]">{titulo} · {ts.length}</p>
      <ul className="mt-2.5 space-y-2">
        {ts.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-[1.6] text-[#4D3A00]">
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
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {visibles.map(([r, v]) => (
        <div key={r} className="min-w-0">
          <dt className="text-[12px] text-[var(--secundario)]">{r}</dt>
          <dd className="mt-0.5 text-[15px] leading-[1.55] text-[var(--ink)]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Tarjetas en grilla: para ejes, grupos de competidores, hallazgos. */
export function Tarjetas({ children, columnas = 2 }: { children: ReactNode; columnas?: 2 | 3 }) {
  return <div className={`grid gap-3 ${columnas === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>{children}</div>
}

export function Tarjeta({ titulo, children, tono }: { titulo?: string; children: ReactNode; tono?: 'claro' }) {
  return (
    <div className={`min-w-0 rounded-[12px] border border-[var(--line)] p-4 ${tono === 'claro' ? 'bg-[var(--superficie)]' : 'bg-white'}`}>
      {titulo && <p className="text-[14px] font-semibold leading-snug text-[var(--ink)]">{titulo}</p>}
      <div className={titulo ? 'mt-2' : ''}>{children}</div>
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
        <span key={i} className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[13px] text-[var(--cuerpo)]">{t}</span>
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
  const clase = 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-[var(--line)] bg-white px-2 py-0.5 font-mono text-[10.5px] text-[var(--secundario)]'
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className={`${clase} hover:border-[var(--ink)] hover:text-[var(--ink)]`}>{texto} <span aria-hidden="true">↗</span></a>
    : <span className={clase}>{texto}</span>
}

/** Las fuentes de un bloque, sean `{url, titulo}` o `{doc, url?, pagina?}`. */
export function FuentesEnLinea({ fuentes }: { fuentes: unknown }) {
  const fs = lista(fuentes).map(obj).filter(f => txt(f.titulo) || txt(f.doc) || txt(f.url))
  if (!fs.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
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

/** Las cifras de una sección, en tarjetas: de qué es, cuánto, y la fuente al pie. */
export function Cifras({ datos }: { datos: unknown }) {
  const ds = textos(datos).map(partirDato)
  if (!ds.length) return null
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {ds.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-col rounded-[12px] border border-[var(--line)] bg-white px-4 py-3">
          {d.etiqueta && <p className="text-[12px] text-[var(--secundario)]">{d.etiqueta}</p>}
          <p className="mt-0.5 flex-1 text-[14.5px] font-medium leading-[1.5] text-[var(--ink)]">{d.valor}</p>
          {d.fuente
            ? <p className="mt-2"><ChipFuente texto={d.fuente} /></p>
            : <p className="mt-2 text-[11.5px] text-[#7A5B00]">△ Sin fuente</p>}
        </div>
      ))}
    </div>
  )
}
