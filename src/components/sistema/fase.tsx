import type { FaseSistema } from '@/lib/seguimiento/sistema'

/**
 * Cómo se ve cada fase del proceso: su color (definido en globals.css, `.fase-…`) y su
 * ícono. Lo usan el Pipeline, la línea de tiempo y el detalle del proyecto, para que
 * “Landscape” se reconozca siempre por la misma brújula.
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

/** Cómo se pinta cada fase: su cuadro, su chip, su punto y su barra. Clases enteras, para que Tailwind las vea. */
export const FASE_ESTILO: Record<FaseVisual, { sello: string; chip: string; punto: string; barra: string; suave: string }> = {
  taller:     { sello: 'bg-indigo-50 text-indigo-700',   chip: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',    punto: 'bg-indigo-500',  barra: 'bg-indigo-600',  suave: 'bg-indigo-50' },
  landscape:  { sello: 'bg-sky-50 text-sky-700',         chip: 'bg-sky-50 text-sky-700 ring-sky-600/15',             punto: 'bg-sky-500',     barra: 'bg-sky-500',     suave: 'bg-sky-50' },
  estrategia: { sello: 'bg-emerald-50 text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', punto: 'bg-emerald-500', barra: 'bg-emerald-500', suave: 'bg-emerald-50' },
  naming:     { sello: 'bg-amber-50 text-amber-700',     chip: 'bg-amber-50 text-amber-700 ring-amber-600/15',       punto: 'bg-amber-500',   barra: 'bg-amber-500',   suave: 'bg-amber-50' },
  diseno:     { sello: 'bg-violet-50 text-violet-700',   chip: 'bg-violet-50 text-violet-700 ring-violet-600/15',    punto: 'bg-violet-500',  barra: 'bg-violet-500',  suave: 'bg-violet-50' },
  terminado:  { sello: 'bg-rose-50 text-rose-700',       chip: 'bg-rose-50 text-rose-700 ring-rose-600/15',          punto: 'bg-rose-500',    barra: 'bg-rose-500',    suave: 'bg-rose-50' },
}

/** El ícono de la fase en su cuadro de color suave. */
export function SelloFase({ fase, size = 32 }: { fase: FaseVisual; size?: number }) {
  return (
    <span className={`flex flex-none items-center justify-center rounded-lg ${FASE_ESTILO[fase].sello}`} style={{ width: size, height: size }}>
      <IconoFase fase={fase} size={Math.round(size * 0.5)} />
    </span>
  )
}

/** La fase como chip: punto de color y nombre. */
export function ChipFase({ fase, children }: { fase: FaseVisual; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${FASE_ESTILO[fase].chip}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${FASE_ESTILO[fase].punto}`} />
      {children}
    </span>
  )
}

/** Un chip de estado: punto y texto, en verde, ámbar, rojo o gris. */
const TONO_ESTADO = {
  bien: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  ojo: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  mal: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  quieto: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  azul: 'bg-sky-50 text-sky-700 ring-sky-600/10',
}
export type TonoEstado = keyof typeof TONO_ESTADO
export function ChipEstado({ tono, children }: { tono: TonoEstado; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONO_ESTADO[tono]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  )
}

// Los tonos de las iniciales: fuertes para los clientes, suaves para las personas.
const TONOS_CLIENTE = ['bg-teal-100 text-teal-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-indigo-100 text-indigo-700']
const TONOS_PERSONA = ['bg-indigo-50 text-indigo-700', 'bg-emerald-50 text-emerald-700', 'bg-violet-50 text-violet-700', 'bg-rose-50 text-rose-700', 'bg-sky-50 text-sky-700', 'bg-amber-50 text-amber-700']

/** Un tono fijo por nombre: la misma persona o el mismo cliente salen siempre del mismo color. */
export function tonoDe(nombre: string, cliente = false): string {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const tonos = cliente ? TONOS_CLIENTE : TONOS_PERSONA
  return tonos[h % tonos.length]
}

export const inicialesDe = (nombre: string) =>
  nombre.replace(/[^\p{L}\p{N}\s&]/gu, '').split(/\s+/).filter(p => p && p !== '&').slice(0, 2).map(p => p[0]!.toUpperCase()).join('')

/** Las iniciales en un círculo (personas) o un cuadro redondeado (clientes). */
export function Avatar({ nombre, size = 28, cuadrado, anillo }: { nombre: string; size?: number; cuadrado?: boolean; anillo?: boolean }) {
  return (
    <span aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-bold ${tonoDe(nombre, cuadrado)} ${cuadrado ? (size >= 40 ? 'rounded-xl' : 'rounded-lg') : 'rounded-full'} ${anillo ? 'ring-2 ring-white' : ''}`}
      style={{ width: size, height: size, fontSize: size >= 40 ? 12 : size >= 28 ? 11 : 9 }}>
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
        <span key={n} style={{ marginLeft: i ? -6 : 0 }} className="flex"><Avatar nombre={n} size={size} anillo /></span>
      ))}
      {nombres.length > 3 && <span aria-hidden="true" className="ml-1.5 text-[12px] font-medium text-[var(--secundario)]">+{nombres.length - 3}</span>}
    </span>
  )
}
