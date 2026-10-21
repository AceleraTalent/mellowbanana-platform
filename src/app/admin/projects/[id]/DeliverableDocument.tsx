'use client'
import { useState } from 'react'
import type { DeckView, DeckSection, DeckBlock, DeckItem } from '@/lib/deck/view-model'
import type { Deliverable, PartKey } from '@/lib/deliverable/schema'
import { partsOfSection, type SectionNumber } from './section-parts'
import { EditorSeccion } from './EditorEntregable'
import { BOTON_SECUNDARIO } from '@/components/paso/piezas'

const ORIGEN_LABEL: Partial<Record<DeckItem['origen'], string>> = {
  equipo: 'propuesta del equipo',
  pendiente: 'pendiente del taller',
}

function ErrorBox({ text }: { text: string }) {
  return <p className="mt-3 border-l-[1.5px] border-[var(--error)] pl-3 text-[14px] leading-[1.55] text-[var(--error)]">{text}</p>
}

function ItemRow({ it }: { it: DeckItem }) {
  const pend = it.origen === 'pendiente'
  return (
    <div className="mt-3 flex gap-2.5">
      <span aria-hidden="true" className="shrink-0 text-[var(--banana)]">—</span>
      <div>
        <p className={`text-[15px] leading-relaxed ${pend ? 'text-[var(--secundario)]' : 'text-[var(--cuerpo)]'}`}>{it.texto}</p>
        {!!it.cita && (
          <p className="mt-1.5 border-l-2 border-[var(--banana)] pl-2.5 text-sm leading-relaxed text-[var(--secundario)]">“{it.cita}”</p>
        )}
        {!!ORIGEN_LABEL[it.origen] && (
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--rotulo)]">{ORIGEN_LABEL[it.origen]}</p>
        )}
      </div>
    </div>
  )
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{children}</h3>
}

/** Un bloque del documento: una columna con regla arriba, no una caja (como en el Landscape). */
function Block({ b, wide = false }: { b: DeckBlock; wide?: boolean }) {
  return (
    <div className={`min-w-0 border-t-[1.5px] border-[var(--ink)] pt-3.5${wide ? ' md:col-span-2' : ''}`}>
      <BlockTitle>{b.titulo}</BlockTitle>
      {b.error
        ? <ErrorBox text={`Esta parte no se pudo generar: ${b.error}`} />
        : (
          <>
            {!!b.parrafo && <p className="mt-3 text-[15px] leading-relaxed text-[var(--cuerpo)]">{b.parrafo}</p>}
            {b.items.map((it, i) => <ItemRow key={i} it={it} />)}
          </>
        )}
    </div>
  )
}

// La solución del canvas viene con prefijo de tipo ("pain reliever: …" / "gain creator: …").
// Lo separamos para mostrarlo como tag de color y que se pueda escanear pain vs gain de un vistazo.
const TIPO_TAG: Record<'pain' | 'gain', string> = {
  pain: 'bg-[var(--superficie)] text-[var(--ink)]',   // alivia un dolor
  gain: 'bg-[var(--aprobado)] text-[var(--ink)]',     // crea un beneficio
}
function partirSolucion(s: string): { tipo: 'pain' | 'gain' | null; etiqueta: string; texto: string } {
  const m = s.match(/^\s*(pain reliever|gain creator)\s*:\s*([\s\S]*)$/i)
  if (!m) return { tipo: null, etiqueta: '', texto: s.trim() }
  return { tipo: /pain/i.test(m[1]) ? 'pain' : 'gain', etiqueta: m[1].toLowerCase(), texto: m[2].trim() }
}

function FilaCard({ f, n }: { f: DeckSection['tabla'][number]; n: number }) {
  const { tipo, etiqueta, texto } = partirSolucion(f.solucion)
  return (
    <li className="border-t border-[var(--line)] py-5 first:border-t-0 first:pt-1">
      <div className="flex gap-4">
        <span aria-hidden="true" className="w-6 flex-none pt-[3px] font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{String(n).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-[18px] leading-snug text-[var(--ink)]">{f.job}</h4>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {tipo && (
              <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono uppercase tracking-[0.08em] ${TIPO_TAG[tipo]}`}>{etiqueta}</span>
            )}
            <span className="text-[14px] font-medium leading-relaxed text-[var(--cuerpo)]">{texto}</span>
          </div>
          <p className="mt-2.5 text-[14.5px] leading-[1.7] text-[var(--secundario)]">{f.comoSeResuelve}</p>
          {!!ORIGEN_LABEL[f.origen] && (
            <p className="mt-2.5 text-[10px] font-medium font-mono uppercase tracking-[0.12em] text-[var(--rotulo)]">{ORIGEN_LABEL[f.origen]}</p>
          )}
        </div>
      </div>
    </li>
  )
}

function Tabla({ filas, error }: { filas: DeckSection['tabla']; error: DeckSection['tablaError'] }) {
  if (error) {
    return (
      <div className="border-t-[1.5px] border-[var(--ink)] pt-3.5 md:col-span-2">
        <BlockTitle>Cómo lo resolvemos, trabajo por trabajo</BlockTitle>
        <ErrorBox text={`La tabla de JTBD no se pudo generar: ${error}`} />
      </div>
    )
  }
  if (!filas.length) return null
  return (
    <div className="border-t-[1.5px] border-[var(--ink)] pt-3.5 md:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <BlockTitle>Cómo lo resolvemos, trabajo por trabajo</BlockTitle>
        <span className="text-[11px] font-medium font-mono uppercase tracking-[0.12em] text-[var(--rotulo)]">{filas.length} {filas.length === 1 ? 'trabajo' : 'trabajos'}</span>
      </div>
      <ul className="mt-3">
        {filas.map((f, i) => <FilaCard key={i} f={f} n={i + 1} />)}
      </ul>
    </div>
  )
}

const DISCRETO = 'text-[13px] text-[var(--secundario)] underline-offset-2 hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-45'

/**
 * El título de una sección del documento: el número en la mono y el nombre con regla
 * abajo, como las secciones del Landscape. Editar y regenerar van a la derecha, discretos.
 */
function SectionHeader({ sec, busy, editable, onRegenerate, onEditar }: {
  sec: DeckSection
  busy: PartKey | 'full' | null
  /** Hay contenido generado en esta sección: editar tiene sobre qué trabajar. */
  editable: boolean
  onRegenerate: (part: PartKey) => void
  onEditar: () => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[var(--line)] pb-4">
      <div className="min-w-0">
        <p className="font-mono text-[12px] tabular-nums uppercase tracking-[.12em] text-[var(--rotulo)]">{String(sec.numero).padStart(2, '0')}</p>
        <h2 className="mt-1.5 font-serif text-[28px] leading-[1.15] tracking-[-.02em] text-[var(--ink)]">{sec.titulo}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {partsOfSection(sec.numero as SectionNumber).map(({ key, label }) => (
          <button key={key} type="button" onClick={() => onRegenerate(key)} disabled={busy !== null} className={DISCRETO}>
            {busy === key ? 'Regenerando…' : label}
          </button>
        ))}
        {editable && (
          <button type="button" onClick={onEditar} disabled={busy !== null} className={BOTON_SECUNDARIO}>Editar</button>
        )}
      </div>
    </div>
  )
}

function Section({ sec, busy, editando, deliverable, projectId, onRegenerate, onEditar, onCerrarEditor }: {
  sec: DeckSection
  busy: PartKey | 'full' | null
  editando: boolean
  deliverable: Deliverable | null
  projectId: string
  onRegenerate: (part: PartKey) => void
  onEditar: () => void
  onCerrarEditor: () => void
}) {
  const impar = sec.blocks.length % 2 === 1
  const editable = !!deliverable && partsOfSection(sec.numero as SectionNumber).some(({ key }) => deliverable[key]?.data)
  return (
    <section>
      <SectionHeader sec={sec} busy={busy} editable={editable} onRegenerate={onRegenerate} onEditar={onEditar} />
      {editando && deliverable ? (
        <EditorSeccion
          numero={sec.numero as SectionNumber}
          deliverable={deliverable}
          projectId={projectId}
          onCerrar={onCerrarEditor}
        />
      ) : (
        <div className="mt-8">
          {sec.error
            ? <ErrorBox text={`Esta parte no se pudo generar: ${sec.error}`} />
            : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                {sec.blocks.map((b, i) => (
                  <Block key={i} b={b} wide={impar && i === sec.blocks.length - 1} />
                ))}
                <Tabla filas={sec.tabla} error={sec.tablaError} />
              </div>
            )}
        </div>
      )}
    </section>
  )
}

/** Espejo HTML de DeckDocument (el PDF del taller): las 3 secciones numeradas del entregable. */
export function DeliverableDocument({ view, busy, deliverable, projectId, onRegenerate }: {
  view: DeckView
  busy: PartKey | 'full' | null
  /** El contenido crudo, para editarlo: el view es su proyección de lectura. */
  deliverable: Deliverable | null
  projectId: string
  onRegenerate: (part: PartKey) => void
}) {
  // El editor abierto vive acá y no en cada sección: una sola sección se edita a la vez,
  // y regenerar mientras se edita cerraría el formulario abajo del usuario.
  const [editando, setEditando] = useState<SectionNumber | null>(null)
  return (
    <div className="space-y-16">
      {view.secciones.map(sec => (
        <Section
          key={sec.numero}
          sec={sec}
          busy={busy}
          editando={editando === sec.numero}
          deliverable={deliverable}
          projectId={projectId}
          onRegenerate={onRegenerate}
          onEditar={() => setEditando(sec.numero as SectionNumber)}
          onCerrarEditor={() => setEditando(null)}
        />
      ))}
    </div>
  )
}
