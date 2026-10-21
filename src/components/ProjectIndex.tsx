import Link from 'next/link'
import type { EntradaIndice, FaseIndice, SubPasoIndice } from '@/lib/pipeline/indice'
import { CabeceraProyecto } from './CabeceraProyecto'

/**
 * El punto de estado de cada etapa. `aprobada` y `pendiente` no se pueden distinguir sólo
 * por color: `aprobada` lleva un tilde adentro. `pendiente` y `no_aplica` quedan huecas
 * —por forma, contra el relleno de `aprobada`— pero huecas entre sí también se confunden,
 * así que se separan por el trazo: `pendiente` es sólida y marcada porque es una etapa que
 * todavía falta trabajar; `no_aplica` es punteada y apagada porque no se va a tocar nunca.
 */
function Punto({ estado }: { estado: EntradaIndice['estado'] }) {
  if (estado === 'aprobada') {
    // A 6px el tilde no se lee: sube a 8px, el mínimo que lo hace legible.
    return (
      <svg viewBox="0 0 8 8" className="h-[8px] w-[8px] flex-none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="var(--banana)" />
        <path
          d="M2.3 4.3 L3.5 5.6 L5.7 2.6"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (estado === 'actual') {
    return <span className="h-[7px] w-[7px] flex-none rounded-full bg-[var(--ink)]" />
  }
  if (estado === 'pendiente') {
    return <span className="h-[6px] w-[6px] flex-none rounded-full border border-[var(--apagado)]" />
  }
  return <span className="h-[6px] w-[6px] flex-none rounded-full border border-dashed border-[#E0DCD0]" />
}

/**
 * El paso a paso de la etapa activa, colgado debajo de ella. El estado se lee por forma:
 * tilde en amarillo si está hecho, punto amarillo si espera revisión, aro vacío si falta.
 */
function PasosDeEtapa({ pasos }: { pasos: SubPasoIndice[] }) {
  return (
    <ul className="mb-2 ml-[3px] mt-1 border-l border-[var(--line)] py-0.5 pl-3">
      {pasos.map(p => (
        <li key={p.id}>
          <Link
            href={p.href}
            aria-current={p.actual ? 'step' : undefined}
            className={`-ml-1.5 flex items-start gap-2 rounded-[5px] px-1.5 py-[5px] text-[13px] leading-[1.35] ${
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

export function ProjectIndex({
  projectId,
  nombre,
  subtitulo,
  fases,
}: {
  projectId: string
  nombre: string
  subtitulo: string
  fases: FaseIndice[]
}) {
  return (
    <nav aria-label="Índice del proyecto" className="flex flex-col gap-5">
      <CabeceraProyecto projectId={projectId} nombre={nombre} subtitulo={subtitulo} />
      {fases.map(fase => (
        <div key={fase.key}>
          {/* Un conteo (“5/6”) va a la derecha del nombre; una frase (“Se trabaja en Miro”)
              no entra ahí y va debajo. */}
          {/^\d+\/\d+$/.test(fase.avance) ? (
            <div className="flex items-baseline justify-between gap-2 pb-1.5">
              <p className="text-[10.5px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)]">{fase.label}</p>
              <p className="flex-none font-mono text-[11px] tabular-nums text-[var(--rotulo)]">{fase.avance}</p>
            </div>
          ) : (
            <div className="pb-1.5">
              <p className="text-[10.5px] font-mono uppercase tracking-[.12em] text-[var(--rotulo)]">{fase.label}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--secundario)]">{fase.avance}</p>
            </div>
          )}
          <ul>
            {fase.entradas.map(entrada => (
              <li key={entrada.key}>
                {entrada.bloque && (
                  <p className="mt-2.5 text-[10px] font-mono uppercase tracking-[.1em] text-[var(--rotulo)]">
                    {entrada.bloque}
                  </p>
                )}
                <Link
                  href={entrada.href}
                  aria-current={entrada.estado === 'actual' ? 'page' : undefined}
                  className={
                    entrada.estado === 'actual'
                      ? 'flex items-center gap-2.5 py-[5px] font-semibold text-[var(--ink)]'
                      : 'flex items-center gap-2.5 py-[5px] text-[var(--cuerpo)] hover:text-[var(--ink)]'
                  }
                >
                  <Punto estado={entrada.estado} />
                  <span className="text-[14px]">{entrada.label}</span>
                  {entrada.espera && (
                    <>
                      {/* Al final del renglón, separado del punto de estado: no dice en qué anda
                          la etapa sino que la pelota la tiene el equipo. */}
                      <span
                        className="ml-auto h-[6px] w-[6px] flex-none rounded-full bg-[var(--banana)]"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Espera al equipo</span>
                    </>
                  )}
                </Link>
                {entrada.pasos && <PasosDeEtapa pasos={entrada.pasos} />}
              </li>
            ))}
          </ul>
          {fase.ocultas > 0 && (
            <Link href={fase.hrefTodas} className="mt-1 block text-[12px] text-[var(--secundario)] hover:text-[var(--ink)]">
              ＋ {fase.ocultas} etapas más
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
