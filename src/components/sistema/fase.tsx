import type { FaseSistema } from '@/lib/seguimiento/sistema'

/**
 * Cómo se ve cada fase del proceso: su color (definido en globals.css, `.fase-…`) y su
 * ícono. Lo usan el Pipeline, la línea de tiempo y el detalle del proyecto, para que
 * “Landscape” sea siempre el mismo azul con la misma brújula.
 */
export type FaseVisual = FaseSistema | 'terminado'

export const FASE_CLASE: Record<FaseVisual, string> = {
  taller: 'fase-taller',
  landscape: 'fase-landscape',
  estrategia: 'fase-estrategia',
  naming: 'fase-naming',
  diseno: 'fase-diseno',
  terminado: 'fase-terminado',
}

/** Qué se hace en cada fase, en una línea. */
export const FASE_BAJADA: Record<FaseVisual, string> = {
  taller: 'Entrevistas, propuesta de valor y taller',
  landscape: 'Investigación del sector y benchmarking',
  estrategia: 'Esencia de marca, narrativa y copies',
  naming: 'Nombre de la marca',
  diseno: 'Identidad visual y piezas',
  terminado: 'Proyecto entregado',
}

const TRAZOS: Record<FaseVisual, React.ReactNode> = {
  // Taller: dos personas conversando.
  taller: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  // Landscape: una brújula.
  landscape: <><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></>,
  // Estrategia: un blanco.
  estrategia: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  // Naming: una letra.
  naming: <><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></>,
  // Diseño: la punta de una pluma.
  diseno: <><path d="m12 19 7-7 3 3-7 7-3-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="m2 2 7.586 7.586" /><circle cx="11" cy="11" r="2" /></>,
  // Terminado: una bandera.
  terminado: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>,
}

export function IconoFase({ fase, size = 18 }: { fase: FaseVisual; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[fase]}
    </svg>
  )
}

/** El ícono de la fase en su cuadro de color suave. */
export function SelloFase({ fase, size = 36 }: { fase: FaseVisual; size?: number }) {
  return (
    <span className={`${FASE_CLASE[fase]} grid flex-none place-items-center rounded-[10px] bg-[var(--f-suave)] text-[var(--f-texto)]`} style={{ width: size, height: size }}>
      <IconoFase fase={fase} size={Math.round(size * 0.5)} />
    </span>
  )
}

/** La fase como chip: punto de color y nombre. */
export function ChipFase({ fase, children }: { fase: FaseVisual; children: React.ReactNode }) {
  return (
    <span className={`${FASE_CLASE[fase]} inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--f)_28%,transparent)] bg-[var(--f-suave)] px-2.5 py-[3px] text-[12.5px] font-semibold text-[var(--f-texto)]`}>
      <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[var(--f)]" />
      {children}
    </span>
  )
}

const TONOS = [
  ['#eef2ff', '#4338ca'], ['#e0f2fe', '#0369a1'], ['#d1fae5', '#047857'],
  ['#fef3c7', '#b45309'], ['#ede9fe', '#6d28d9'], ['#ffe4e6', '#be123c'], ['#ccfbf1', '#0f766e'],
]

/** Un tono fijo por nombre: la misma persona o el mismo cliente salen siempre del mismo color. */
export function tonoDe(nombre: string): { fondo: string; texto: string } {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const [fondo, texto] = TONOS[h % TONOS.length]
  return { fondo, texto }
}

export const inicialesDe = (nombre: string) =>
  nombre.replace(/[^\p{L}\p{N}\s&]/gu, '').split(/\s+/).filter(p => p && p !== '&').slice(0, 2).map(p => p[0]!.toUpperCase()).join('')

/** Las iniciales en un círculo (personas) o un cuadro redondeado (clientes). */
export function Avatar({ nombre, size = 28, cuadrado, anillo }: { nombre: string; size?: number; cuadrado?: boolean; anillo?: boolean }) {
  const t = tonoDe(nombre)
  return (
    <span aria-hidden="true"
      className={`grid flex-none place-items-center font-bold ${cuadrado ? 'rounded-[10px]' : 'rounded-full'} ${anillo ? 'ring-2 ring-white' : ''}`}
      style={{ width: size, height: size, background: t.fondo, color: t.texto, fontSize: Math.max(9.5, Math.round(size * 0.36)) }}>
      {inicialesDe(nombre)}
    </span>
  )
}

/** Hasta tres personas, encimadas, con “+2” si hay más. */
export function Avatares({ nombres, size = 26 }: { nombres: string[]; size?: number }) {
  if (!nombres.length) return null
  return (
    <span className="flex items-center" title={nombres.join(', ')}>
      <span className="sr-only">{nombres.join(', ')}</span>
      {nombres.slice(0, 3).map((n, i) => (
        <span key={n} style={{ marginLeft: i ? -6 : 0 }}><Avatar nombre={n} size={size} anillo /></span>
      ))}
      {nombres.length > 3 && <span aria-hidden="true" className="ml-1.5 text-[12px] font-medium text-[var(--secundario)]">+{nombres.length - 3}</span>}
    </span>
  )
}
