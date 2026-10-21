import Link from 'next/link'
import { db } from '@/lib/db/client'
import { getProject, landscapeState, piezasState, type TendenciasContent } from '@/lib/db/store'
import { STAGE_LABEL, type StageKey } from '@/lib/landscape/stages'
import { PIEZA_LABEL, type PiezaKey } from '@/lib/landscape/piezas'
import {
  VistaBenchmarking, VistaBrandAssets, VistaCasos, VistaCirculo, VistaContexto, VistaDesarrollo,
  VistaDiagnostico, VistaEnfoque, VistaFuentes, VistaListaLarga,
} from '@/components/documento/vistas'
import { Imprimir } from './Imprimir'

export const dynamic = 'force-dynamic'

/** Un bloque del documento: su título y lo aprobado, o una línea que dice que falta. */
function Parte({ titulo, contenido, children }: { titulo: string; contenido: unknown; children: React.ReactNode }) {
  return (
    <section className="mt-16 break-inside-avoid-page first:mt-0">
      <h2 className="border-b border-[var(--ink)] pb-3 font-serif text-[30px] leading-[1.15] tracking-[-.02em] text-[var(--ink)]">{titulo}</h2>
      <div className="mt-8">
        {contenido ? children : <p className="text-[14px] text-[var(--secundario)]">Todavía no hay nada aprobado acá.</p>}
      </div>
    </section>
  )
}

/**
 * El Landscape entero, en el orden del deck y sólo con lo aprobado: para pasarlo al
 * template del estudio o guardarlo en PDF. Va sin la barra del panel, para que se imprima
 * limpio.
 */
export default async function DocumentoLandscape({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proyecto = await getProject(db, id)
  if (!proyecto) return <p className="p-16 text-center text-[15px] text-[var(--secundario)]">Proyecto no encontrado.</p>

  const [etapas, piezas] = await Promise.all([landscapeState(db, id), piezasState(db, id)])
  const aprobada = (k: StageKey) => {
    const e = etapas.find(x => x.stage === k)!
    return e.aprobada ? e.actual?.content ?? null : null
  }
  const pieza = (k: PiezaKey) => {
    const p = piezas.find(x => x.pieza === k)!
    return p.aprobada ? p.actual?.content ?? null : null
  }
  const noAplica = (k: StageKey) => etapas.find(x => x.stage === k)!.status === 'no_aplica'

  const tendencias = aprobada('tendencias') as TendenciasContent | null
  const elegidas = tendencias ? tendencias.candidatas.filter(t => tendencias.seleccionadas?.includes(t.id)) : []
  const contexto = aprobada('contexto')

  const faltan = [
    ...(['setup', 'contexto', 'tendencias', 'panorama', 'diagnostico'] as StageKey[])
      .filter(k => !noAplica(k) && !aprobada(k)).map(k => STAGE_LABEL[k]),
    ...piezas.filter(p => !p.aprobada).map(p => PIEZA_LABEL[p.pieza]),
  ]
  const fecha = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-white/95 px-6 py-3 backdrop-blur print:hidden">
        <Link href={`/admin/projects/${id}/landscape`} className="text-[14px] text-[var(--secundario)] hover:text-[var(--ink)]">← Volver al Landscape</Link>
        <Imprimir />
      </div>

      <article className="mx-auto max-w-[860px] px-6 py-14 print:max-w-none print:px-0 print:py-0">
        <header className="mb-16">
          <p className="font-mono text-[12px] uppercase tracking-[.12em] text-[var(--rotulo)]">Mellow &amp; Banana · Landscape · {fecha}</p>
          <h1 className="mt-3 font-serif text-[52px] leading-[1.05] tracking-[-.03em] text-[var(--ink)]">{proyecto.name}</h1>
          {faltan.length > 0 && (
            <p className="mt-6 max-w-[62ch] border-l-[1.5px] border-[var(--ink)] pl-3 text-[13.5px] leading-[1.6] text-[var(--secundario)] print:hidden">
              Sólo va lo aprobado. Todavía falta: {faltan.join(', ')}.
            </p>
          )}
        </header>

        <Parte titulo={STAGE_LABEL.setup} contenido={aprobada('setup')}><VistaEnfoque content={aprobada('setup')} /></Parte>

        <Parte titulo={STAGE_LABEL.contexto} contenido={contexto}>
          <VistaContexto content={contexto} hrefFuentes="#fuentes" />
          <div id="fuentes" className="mt-12"><VistaFuentes content={contexto} /></div>
        </Parte>

        <Parte titulo={STAGE_LABEL.tendencias} contenido={tendencias}>
          <VistaListaLarga candidatas={elegidas} elegidas={[]} conResumen={false} />
          {pieza('tendencias-desarrollo') && <div className="mt-14"><VistaDesarrollo content={pieza('tendencias-desarrollo')} /></div>}
          {pieza('tendencias-casos') && (
            <div className="mt-14">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{PIEZA_LABEL['tendencias-casos']}</p>
              <VistaCasos content={pieza('tendencias-casos')} />
            </div>
          )}
        </Parte>

        <Parte titulo={STAGE_LABEL.panorama} contenido={aprobada('panorama')}>
          <VistaBenchmarking content={aprobada('panorama')} />
          {pieza('panorama-brand-assets') && (
            <div className="mt-14">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{PIEZA_LABEL['panorama-brand-assets']}</p>
              <VistaBrandAssets content={pieza('panorama-brand-assets')} />
            </div>
          )}
          {pieza('panorama-circulo') && (
            <div className="mt-14">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[.12em] text-[var(--rotulo)]">{PIEZA_LABEL['panorama-circulo']}</p>
              <VistaCirculo content={pieza('panorama-circulo')} />
            </div>
          )}
        </Parte>

        {!noAplica('diagnostico') && (
          <Parte titulo={STAGE_LABEL.diagnostico} contenido={aprobada('diagnostico')}><VistaDiagnostico content={aprobada('diagnostico')} /></Parte>
        )}
      </article>
    </div>
  )
}
