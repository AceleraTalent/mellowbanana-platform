import Link from 'next/link'
import type { EntradaIndice, FaseIndice, SubPasoIndice } from '@/lib/pipeline/indice'
import type { FilaSistema } from '@/lib/seguimiento/cargar'
import type { EstadoFase, FaseConEstado, FaseSistema } from '@/lib/seguimiento/sistema'
import { PASOS } from '@/lib/landscape/pasos'
import { CabeceraProyecto } from './CabeceraProyecto'
import { FaseManual } from './FaseManual'
import { CHIP, MARCA } from './sistema/chips'

/** Lo que el menú usa del Sistema M&B. Lo inyecta `AdminShell`, que ya lo tiene cargado. */
export type SistemaDelProyecto = Pick<FilaSistema, 'fases' | 'actual' | 'sigue' | 'pasos'>

/** Las tres fases que tienen pantallas, con la key que usa el índice. */
const DEL_INDICE: Partial<Record<FaseSistema, FaseIndice['key']>> = {
  taller: 'propuesta-valor',
  landscape: 'landscape',
  estrategia: 'estrategia',
}

/** Un renglón de fase, ya resuelto: venga del Sistema (las cinco) o sólo del índice (tres). */
interface FaseMenu {
  key: string
  label: string
  estado: EstadoFase
  /** Lo que va a la derecha: “7/15”, “Listo”, “Sin empezar”. */
  derecha: string
  /** La fase en la que está el proyecto, según el Sistema M&B. */
  enCurso: boolean
  /** Adónde lleva el renglón cuando la fase está cerrada. */
  href?: string
  indice?: FaseIndice
  /** Naming y Diseño: no tienen pantalla, el equipo marca en qué van. */
  manual?: 'naming' | 'diseno'
}

function derecha(f: FaseConEstado): string {
  if (f.estado === 'completa') return 'Listo'
  if (f.avance) return f.avance
  return f.estado === 'en_curso' ? 'En curso' : 'Sin empezar'
}

/** Adónde lleva una fase cerrada: a lo primero que falta adentro de ella. */
function hrefDeFase(projectId: string, key: string, indice?: FaseIndice): string | undefined {
  if (key === 'landscape' || key === 'estrategia') return `/admin/projects/${projectId}/${key}`
  if (!indice) return undefined
  return (indice.entradas.find(e => e.estado !== 'aprobada') ?? indice.entradas[0])?.href
}

function fasesDelMenu(projectId: string, fases: FaseIndice[], sistema?: SistemaDelProyecto): FaseMenu[] {
  if (sistema) {
    return sistema.fases.map(f => {
      const indice = fases.find(x => x.key === DEL_INDICE[f.key])
      return {
        key: f.key,
        label: f.label,
        estado: f.estado,
        derecha: derecha(f),
        enCurso: f.key === sistema.actual,
        href: hrefDeFase(projectId, f.key, indice),
        indice,
        ...(f.key === 'naming' || f.key === 'diseno' ? { manual: f.key } : {}),
      }
    })
  }
  // Sin el Sistema (un proyecto que no aparece en la tabla): las tres fases del índice.
  return fases.map(f => {
    const [hechas, total] = f.avance.split('/').map(Number)
    const contada = Number.isFinite(hechas) && Number.isFinite(total)
    return {
      key: f.key === 'propuesta-valor' ? 'taller' : f.key,
      label: f.label,
      estado: contada && total > 0 && hechas === total ? 'completa' : contada && hechas > 0 ? 'en_curso' : 'pendiente',
      derecha: contada ? f.avance : '',
      enCurso: false,
      href: hrefDeFase(projectId, f.key === 'propuesta-valor' ? 'taller' : f.key, f),
      indice: f,
    }
  })
}

/** El número de la fase, en un círculo: amarillo con tilde si terminó, tinta si es la de ahora. */
function NumeroDeFase({ n, estado, enCurso }: { n: number; estado: EstadoFase; enCurso: boolean }) {
  if (estado === 'completa') {
    return (
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] flex-none" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill="var(--banana)" />
        <path d="M5.4 9.3 L7.9 11.8 L12.6 6.4" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-full font-mono text-[10px] tabular-nums ${
        enCurso ? 'bg-[var(--ink)] text-white' : 'border border-[var(--apagado)] text-[var(--rotulo)]'
      }`}
    >
      {n}
    </span>
  )
}

/**
 * El punto de estado de cada etapa. `aprobada` y `pendiente` no se pueden distinguir sólo
 * por color: `aprobada` lleva un tilde adentro. `no_aplica` es punteada y apagada porque no
 * se va a tocar nunca.
 */
function Punto({ estado }: { estado: EntradaIndice['estado'] }) {
  if (estado === 'aprobada') {
    // A 6px el tilde no se lee: sube a 8px, el mínimo que lo hace legible.
    return (
      <svg viewBox="0 0 8 8" className="h-[8px] w-[8px] flex-none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="var(--banana)" />
        <path d="M2.3 4.3 L3.5 5.6 L5.7 2.6" fill="none" stroke="var(--ink)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (estado === 'actual') return <span className="h-[7px] w-[7px] flex-none rounded-full bg-[var(--ink)]" />
  if (estado === 'pendiente') return <span className="h-[7px] w-[7px] flex-none rounded-full border border-[var(--apagado)]" />
  return <span className="h-[7px] w-[7px] flex-none rounded-full border border-dashed border-[#E0DCD0]" />
}

/**
 * Los pasos de la etapa activa del Landscape, colgados debajo de ella: tilde amarillo si
 * está hecho, punto amarillo si espera revisión, aro vacío si falta.
 */
function PasosDeEtapa({ pasos }: { pasos: SubPasoIndice[] }) {
  return (
    <ul className="mb-1.5 ml-[10px] mt-0.5">
      {pasos.map(p => (
        <li key={p.id}>
          <Link
            href={p.href}
            aria-current={p.actual ? 'page' : undefined}
            className={`-ml-1.5 flex items-start gap-2 rounded-[5px] px-1.5 py-[4px] text-[13px] leading-[1.35] ${
              p.actual ? 'bg-[var(--banana)] font-semibold text-[var(--ink)]' : p.estado === 'no_aplica' ? 'text-[var(--rotulo)]' : 'text-[var(--cuerpo)] hover:text-[var(--ink)]'
            }`}
          >
            <span className="mt-[3px] flex h-[11px] w-[11px] flex-none items-center justify-center">
              {p.estado === 'hecho' ? (
                <svg viewBox="0 0 10 10" className="h-[11px] w-[11px]" aria-hidden="true">
                  <circle cx="5" cy="5" r="5" fill="var(--banana)" />
                  <path d="M2.8 5.2 L4.4 6.8 L7.2 3.4" fill="none" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : p.estado === 'revisar' ? (
                <span className="h-[8px] w-[8px] rounded-full bg-[var(--banana)] ring-1 ring-[var(--ink)]" />
              ) : (
                <span className={`h-[8px] w-[8px] rounded-full border ${p.actual ? 'border-[var(--ink)]' : 'border-[var(--apagado)]'} ${p.estado === 'no_aplica' ? 'border-dashed' : ''}`} />
              )}
            </span>
            <span className={`font-mono text-[11px] tabular-nums ${p.actual ? 'text-[var(--ink)]' : 'text-[var(--rotulo)]'}`}>{p.id}</span>
            <span className="min-w-0">{p.titulo}</span>
            <span className="sr-only">
              {p.estado === 'hecho' ? ' (listo)' : p.estado === 'revisar' ? ' (por revisar)' : p.estado === 'no_aplica' ? ' (no aplica)' : ' (pendiente)'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Cuántos pasos de una etapa del Landscape están listos. El estado de la etapa sale de sus
 * pasos y no de la aprobación de la etapa: si no, “Setup” se veía terminado con dos pasos
 * por hacer.
 */
function avanceDeEtapa(entrada: EntradaIndice, pasos: SistemaDelProyecto['pasos']) {
  const etapa = entrada.key.replace('landscape:', '')
  const deLaEtapa = PASOS
    .filter(p => p.etapa === etapa)
    .map(p => pasos.find(x => x.id === p.id))
    .filter(p => p && p.estado !== 'no_aplica')
  const hechos = deLaEtapa.filter(p => p!.estado === 'hecho').length
  return { hechos, total: deLaEtapa.length }
}

/** Las etapas (o pantallas) de la fase abierta. */
function Entradas({ fase, sistema }: { fase: FaseMenu; sistema?: SistemaDelProyecto }) {
  const entradas = fase.indice!.entradas
  return (
    <ul className="mb-2 ml-[8.5px] mt-1 border-l border-[var(--line)] pl-[17px]">
      {entradas.map(entrada => {
        let estado = entrada.estado
        let cuenta: string | undefined
        if (fase.key === 'landscape' && sistema) {
          const { hechos, total } = avanceDeEtapa(entrada, sistema.pasos)
          cuenta = total ? `${hechos}/${total}` : undefined
          if (estado !== 'actual') estado = total && hechos === total ? 'aprobada' : 'pendiente'
        }
        // El taller en Miro se cierra a mano: lo que el equipo marcó manda.
        if (entrada.key === 'taller' && estado !== 'actual' && fase.estado === 'completa') estado = 'aprobada'

        return (
          <li key={entrada.key}>
            {entrada.bloque && (
              <p className="mb-0.5 mt-2.5 font-mono text-[10px] uppercase tracking-[.1em] text-[var(--rotulo)]">{entrada.bloque}</p>
            )}
            <Link
              href={entrada.href}
              aria-current={entrada.estado === 'actual' && !entrada.pasos ? 'page' : undefined}
              className={`flex items-center gap-2.5 py-[5px] text-[13.5px] ${
                entrada.estado === 'actual' ? 'font-semibold text-[var(--ink)]' : 'text-[var(--cuerpo)] hover:text-[var(--ink)]'
              }`}
            >
              <Punto estado={estado} />
              <span className="min-w-0 flex-1 truncate">{entrada.label}</span>
              {entrada.espera && (
                <>
                  {/* No dice en qué anda la etapa sino que la pelota la tiene el equipo. */}
                  <span className="h-[6px] w-[6px] flex-none rounded-full bg-[var(--banana)] ring-1 ring-[var(--ink)]" aria-hidden="true" />
                  <span className="sr-only">Espera al equipo</span>
                </>
              )}
              {cuenta && <span className="flex-none font-mono text-[11px] font-normal tabular-nums text-[var(--rotulo)]">{cuenta}</span>}
            </Link>
            {entrada.pasos && <PasosDeEtapa pasos={entrada.pasos} />}
          </li>
        )
      })}
    </ul>
  )
}

/** Lo que sigue en este cliente, el mismo chip que en la tabla del inicio. */
function LoQueSigue({ sigue }: { sigue: SistemaDelProyecto['sigue'] }) {
  const cuerpo = (
    <>
      <span className="block font-mono text-[10px] uppercase tracking-[.12em] text-[var(--rotulo)]">Lo que sigue</span>
      <span className="mt-2 flex flex-col items-start gap-1">
        <span className={`inline-flex rounded-[3px] px-[7px] py-[2px] text-[12px] font-semibold ${CHIP[sigue.quien]}`}>
          {MARCA[sigue.quien]}{sigue.texto}
        </span>
        {sigue.detalle && (
          <span className="text-[13.5px] font-medium leading-snug text-[var(--ink)]">
            {sigue.detalle}
            {sigue.href && <span aria-hidden="true" className="ml-1 text-[var(--rotulo)] transition-transform duration-150 group-hover:translate-x-0.5">→</span>}
          </span>
        )}
      </span>
    </>
  )
  const caja = 'group block rounded-[10px] border border-[var(--line)] bg-white px-3 py-2.5'
  return sigue.href
    ? <Link href={sigue.href} className={`${caja} transition-colors duration-150 hover:border-[var(--ink)]`}>{cuerpo}</Link>
    : <div className={caja}>{cuerpo}</div>
}

/**
 * El menú de un cliente: el mismo en todas sus pantallas. Arriba, lo que sigue; después el
 * resumen y las cinco fases del Sistema M&B, numeradas y en orden. Sólo se abre la fase en
 * la que uno está parado; las otras quedan en una línea con su avance, y un clic lleva a
 * lo primero que falta en ellas. Naming y Diseño no tienen pantalla: al abrirlas se marca
 * en qué van.
 */
export function ProjectIndex({
  projectId,
  nombre,
  subtitulo,
  fases,
  sistema,
  enResumen = false,
}: {
  projectId: string
  nombre: string
  subtitulo: string
  fases: FaseIndice[]
  sistema?: SistemaDelProyecto
  /** La pantalla es el resumen del cliente: no hay etapa activa, se abre la fase en curso. */
  enResumen?: boolean
}) {
  const menu = fasesDelMenu(projectId, fases, sistema)
  const activas = fases.flatMap(f => f.entradas).filter(e => e.estado === 'actual')
  const abierta = menu.find(f => f.indice?.entradas.some(e => e.estado === 'actual'))?.key
    ?? (enResumen ? sistema?.actual : undefined)

  // Si uno ya está parado en lo que sigue, la tarjeta repetiría la pantalla. En el resumen
  // también: “Nos toca” arranca con eso mismo.
  const hrefsActuales = new Set(activas.flatMap(e => [e.href, ...(e.pasos ?? []).filter(p => p.actual).map(p => p.href)]))
  const sigue = sistema?.sigue
  const mostrarSigue = sigue && !enResumen && !(sigue.href && hrefsActuales.has(sigue.href))

  return (
    <nav aria-label="Índice del proyecto" className="flex flex-col gap-5">
      <CabeceraProyecto projectId={projectId} nombre={nombre} subtitulo={subtitulo} />

      {mostrarSigue && <LoQueSigue sigue={sigue} />}

      <div>
        <Link
          href={`/admin/projects/${projectId}`}
          aria-current={enResumen ? 'page' : undefined}
          className={`flex items-center gap-2.5 rounded-[6px] py-1.5 text-[14px] ${
            enResumen ? 'font-semibold text-[var(--ink)]' : 'text-[var(--cuerpo)] hover:text-[var(--ink)]'
          }`}
        >
          <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] flex-none text-[var(--rotulo)]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <rect x="2.5" y="2.5" width="13" height="13" rx="3" />
            <path d="M6 7h6M6 10h6M6 13h3.5" />
          </svg>
          Resumen
        </Link>

        <ol className="mt-2 border-t border-[var(--line)] pt-2">
          {menu.map((fase, i) => {
            const estaAbierta = fase.key === abierta
            const renglon = (
              <>
                <NumeroDeFase n={i + 1} estado={fase.estado} enCurso={fase.enCurso} />
                <span className={`min-w-0 flex-1 text-[14.5px] ${estaAbierta ? 'font-semibold text-[var(--ink)]' : ''}`}>{fase.label}</span>
                <span className="flex-none font-mono text-[11px] tabular-nums text-[var(--rotulo)]">{fase.derecha}</span>
              </>
            )
            const clase = 'flex items-center gap-2.5 py-[7px]'

            if (fase.manual) {
              return (
                <li key={fase.key}>
                  <details open={estaAbierta} className="group/manual">
                    <summary className={`${clase} cursor-pointer list-none text-[var(--cuerpo)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden`}>
                      {renglon}
                    </summary>
                    <div className="mb-2 ml-[8.5px] border-l border-[var(--line)] pb-1 pl-[17px] pt-0.5">
                      <p className="mb-2 text-[12.5px] leading-snug text-[var(--secundario)]">
                        Se trabaja fuera de la plataforma. ¿En qué va?
                      </p>
                      <FaseManual projectId={projectId} fase={fase.manual} label={fase.label} estado={fase.estado} />
                    </div>
                  </details>
                </li>
              )
            }

            return (
              <li key={fase.key}>
                {estaAbierta || !fase.href ? (
                  <div className={`${clase} text-[var(--cuerpo)]`}>{renglon}</div>
                ) : (
                  <Link href={fase.href} className={`${clase} text-[var(--cuerpo)] hover:text-[var(--ink)]`}>{renglon}</Link>
                )}
                {estaAbierta && fase.indice && <Entradas fase={fase} sistema={sistema} />}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
