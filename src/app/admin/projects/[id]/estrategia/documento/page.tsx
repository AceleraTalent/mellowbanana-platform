import Link from 'next/link'
import { db } from '@/lib/db/client'
import { getProject } from '@/lib/db/store'
import { strategyState } from '@/lib/db/strategy-store'
import { BLOQUES, ETAPA_LABEL } from '@/lib/estrategia/stages'
import { VistaEstrategia } from '@/components/documento/estrategia'
import { Imprimir } from '../../landscape/documento/Imprimir'

export const dynamic = 'force-dynamic'

/**
 * La Estrategia entera, por bloques y sólo con lo aprobado: para pasarla al deck o
 * guardarla en PDF. Va sin la barra del panel, para que se imprima limpia.
 */
export default async function DocumentoEstrategia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proyecto = await getProject(db, id)
  if (!proyecto) return <p className="p-16 text-center text-[15px] text-[var(--secundario)]">Proyecto no encontrado.</p>

  const estado = await strategyState(db, id)
  const aprobada = new Map(estado.filter(e => e.aprobada && e.actual).map(e => [e.stage, e.actual!.content]))
  const faltan = estado.filter(e => !e.aprobada && e.status !== 'no_aplica').map(e => ETAPA_LABEL[e.stage])
  const fecha = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-white/95 px-6 py-3 backdrop-blur print:hidden">
        <Link href={`/admin/projects/${id}/estrategia`} className="text-[14px] text-[var(--secundario)] hover:text-[var(--ink)]">← Volver a la Estrategia</Link>
        <Imprimir />
      </div>

      <article className="mx-auto max-w-[860px] px-6 py-14 print:max-w-none print:px-0 print:py-0">
        <header className="mb-16">
          <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">Mellow &amp; Banana · Estrategia · {fecha}</p>
          <h1 className="mt-3 font-serif text-[52px] leading-[1.05] tracking-[-.03em] text-[var(--ink)]">{proyecto.name}</h1>
          {faltan.length > 0 && (
            <p className="mt-6 max-w-[62ch] border-l-[1.5px] border-[var(--ink)] pl-3 text-[13.5px] leading-[1.6] text-[var(--secundario)] print:hidden">
              Sólo va lo aprobado. Todavía falta: {faltan.join(', ')}.
            </p>
          )}
        </header>

        {BLOQUES.map(bloque => {
          const conContenido = bloque.etapas.filter(k => aprobada.has(k))
          if (!conContenido.length) return null
          return (
            <div key={bloque.titulo} className="mt-20 first:mt-0">
              <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">{bloque.titulo}</p>
              {conContenido.map(k => (
                <section key={k} className="mt-10 break-inside-avoid-page">
                  <h2 className="border-b border-[var(--ink)] pb-3 font-serif text-[30px] leading-[1.15] tracking-[-.02em] text-[var(--ink)]">{ETAPA_LABEL[k]}</h2>
                  <div className="mt-8"><VistaEstrategia etapa={k} content={aprobada.get(k)} /></div>
                </section>
              ))}
            </div>
          )
        })}
        {aprobada.size === 0 && <p className="text-[15px] text-[var(--secundario)]">Todavía no hay nada aprobado en la Estrategia.</p>}
      </article>
    </div>
  )
}
