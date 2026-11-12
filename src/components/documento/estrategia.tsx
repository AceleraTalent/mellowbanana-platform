/**
 * El documento de cada etapa de la Estrategia, para leerse como un libro de marca y no
 * como una ficha de campos. Cada vista conoce la forma mínima que valida el MCP
 * (src/lib/mcp/validar-estrategia.ts) y los nombres que Claude usa a veces en su lugar; lo
 * que no reconoce no se pierde: cae al final, en “Más información”.
 */

import type { EstrategiaKey } from '@/lib/estrategia/stages'
import { Destacado, Ficha, Parrafo, Puntos, Rotulo, Seccion, Tarjeta, Tarjetas, lista, obj, textos, txt } from './bloques'
import { Documento, MasInformacion, VistaGenerica, lector } from './vistas'

type Vista = (p: { content: unknown }) => React.ReactNode

/** Una frase de la marca, grande: el territorio, el tagline, el brand ideal. */
function Frase({ texto, enorme }: { texto: unknown; enorme?: boolean }) {
  const t = txt(texto)
  if (!t) return null
  return (
    <p className={`max-w-[30ch] font-serif text-[var(--ink)] ${enorme ? 'text-[44px] leading-[1.08] tracking-[-.03em]' : 'text-[30px] leading-[1.25] tracking-[-.02em]'}`}>
      {t}
    </p>
  )
}

/** Lo que dijo la gente, como cita. */
function Citas({ items }: { items: unknown }) {
  const ts = textos(items)
  if (!ts.length) return null
  return (
    <ul className="max-w-[64ch] space-y-5">
      {ts.map((t, i) => (
        <li key={i} className="border-l-[1.5px] border-[var(--banana)] pl-4 font-serif text-[19px] leading-[1.5] tracking-[-.005em] text-[var(--ink)]">
          {t.replace(/^[“"']|[”"']$/g, '')}
        </li>
      ))}
    </ul>
  )
}

/** Una lista que a veces llega como texto suelto. */
const comoLista = (v: unknown): unknown => (typeof v === 'string' ? [v] : v)

const Diagnostico: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  return (
    <Documento>
      <Destacado rotulo="Insight" texto={leer('insight')} />
      <Tarjetas>
        {txt(leer('problema')) && <Tarjeta titulo="El problema"><Parrafo texto={c.problema} /></Tarjeta>}
        {txt(leer('ventaja')) && <Tarjeta titulo="La ventaja"><Parrafo texto={c.ventaja} /></Tarjeta>}
      </Tarjetas>
      {textos(comoLista(leer('diferenciales'))).length > 0 && (
        <Seccion titulo="Atributos diferenciales"><Puntos numerada items={comoLista(c.diferenciales)} /></Seccion>
      )}
      {txt(leer('rumbo', 'haciaDondeVamos', 'hacia_donde_vamos')) && (
        <Seccion titulo="Hacia dónde vamos"><Parrafo texto={c.rumbo ?? c.haciaDondeVamos ?? c.hacia_donde_vamos} /></Seccion>
      )}
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

const Consumidor: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  // Se leen las dos antes de pintar: lo que `leer` no toca cae a “Más información”.
  const motivaciones = comoLista(leer('motivaciones'))
  const tensiones = comoLista(leer('tensiones'))
  return (
    <Documento>
      {txt(leer('metodologia')) && (
        <div>
          <Rotulo>Cómo se leyó</Rotulo>
          <div className="mt-2.5"><Parrafo texto={c.metodologia} /></div>
        </div>
      )}
      {txt(leer('perfil')) && <Seccion titulo="Perfil"><Parrafo texto={c.perfil} /></Seccion>}
      {(textos(motivaciones).length > 0 || textos(tensiones).length > 0) && (
        <Tarjetas>
          {textos(motivaciones).length > 0 && <Tarjeta titulo="Motivaciones y necesidades"><Puntos items={motivaciones} /></Tarjeta>}
          {textos(tensiones).length > 0 && <Tarjeta titulo="Tensiones y barreras"><Puntos items={tensiones} /></Tarjeta>}
        </Tarjetas>
      )}
      {txt(leer('pertenencia')) && <Seccion titulo="Cómo pertenece al grupo"><Parrafo texto={c.pertenencia} /></Seccion>}
      {textos(leer('frases')).length > 0 && <Seccion titulo="Lo que dice el consumidor"><Citas items={c.frases} /></Seccion>}
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/** RTBs y brand ingredients: una lista numerada, en el orden en que pesan. */
const ListaNumerada: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  return (
    <Documento>
      <Puntos numerada items={leer('items')} />
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

const Concepto: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  return (
    <Documento>
      <Frase texto={leer('concepto')} />
      {txt(leer('racional')) && <Seccion titulo="Por qué"><Parrafo texto={c.racional} /></Seccion>}
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

const Beneficios: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  return (
    <Documento>
      <Tarjetas>
        <Tarjeta titulo="Funcionales"><Puntos items={comoLista(leer('funcionales'))} /></Tarjeta>
        <Tarjeta titulo="Emocionales"><Puntos items={comoLista(leer('emocionales'))} /></Tarjeta>
      </Tarjetas>
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

const Arquetipo: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  return (
    <Documento>
      <Frase texto={leer('arquetipo')} />
      {txt(leer('justificacion')) && <Seccion titulo="Por qué este arquetipo"><Parrafo texto={c.justificacion} /></Seccion>}
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/**
 * La personalidad llega de dos lados: Claude escribe `rasgos`; la que se genera desde las
 * entrevistas trae `arquetipo`, `atributos`, `tensiones` y `queNoQuiereSer`.
 */
const Personalidad: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const rasgos = leer('rasgos', 'atributos')
  return (
    <Documento>
      <Destacado rotulo="Temperamento" texto={leer('arquetipo', 'temperamento')} />
      {textos(rasgos).length > 0 && <Seccion titulo="Rasgos"><Puntos items={rasgos} /></Seccion>}
      {textos(leer('tensiones')).length > 0 && <Seccion titulo="Tensiones por resolver"><Puntos items={c.tensiones} /></Seccion>}
      {textos(leer('queNoQuiereSer', 'que_no_quiere_ser')).length > 0 && (
        <Seccion titulo="Lo que no quiere ser"><Puntos items={c.queNoQuiereSer ?? c.que_no_quiere_ser} /></Seccion>
      )}
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

const Valores: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const items = lista(leer('items', 'valores')).map(obj)
  return (
    <Documento>
      <ol className="max-w-[68ch] divide-y divide-[var(--line)] border-y border-[var(--ink)]">
        {items.map((v, i) => (
          <li key={i} className="flex gap-4 py-5">
            <span className="w-6 flex-none pt-[6px] font-mono text-[12.5px] tabular-nums text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <p className="font-serif text-[22px] leading-[1.25] tracking-[-.01em] text-[var(--ink)]">{txt(v.valor)}</p>
              {txt(v.validacion) && <p className="mt-1.5 text-[15px] leading-[1.6] text-[var(--secundario)]">{txt(v.validacion)}</p>}
            </div>
          </li>
        ))}
      </ol>
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/** Objetivo, territorio, brand ideal, onlyness y tagline: una sola frase que manda. */
function FraseUnica(enorme: boolean): Vista {
  function VistaFrase({ content }: { content: unknown }) {
    const c = obj(content)
    const { leer, usados } = lector(c)
    return (
      <Documento>
        <Frase texto={leer('texto')} enorme={enorme} />
        <MasInformacion c={c} usados={usados} />
      </Documento>
    )
  }
  return VistaFrase
}

const Manifiesto: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const parrafos = txt(leer('texto')).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return (
    <Documento>
      <div className="max-w-[58ch] space-y-5">
        {parrafos.map((p, i) => (
          // La de titulares sólo viene en Bold: un manifiesto entero en Bold pesa. Va en la
          // del cuerpo, grande; la primera línea sí en la de titulares, como apertura.
          <p key={i} className={`whitespace-pre-line text-[var(--ink)] ${i === 0
            ? 'font-serif text-[26px] leading-[1.3] tracking-[-.015em]'
            : 'text-[19px] leading-[1.7] tracking-[-.005em]'}`}>{p}</p>
        ))}
      </div>
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/** Las propuestas de nombre, cada una con su porqué; la recomendada va marcada. */
const Naming: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const propuestas = lista(leer('propuestas')).map(obj)
  const recomendado = txt(leer('recomendado', 'recomendada')).toLowerCase()
  return (
    <Documento>
      {txt(leer('criterios')) && (
        <div>
          <Rotulo>Con qué criterio</Rotulo>
          <div className="mt-2.5"><Parrafo texto={c.criterios} /></div>
        </div>
      )}
      <ol className="max-w-[68ch] divide-y divide-[var(--line)] border-y border-[var(--ink)]">
        {propuestas.map((p, i) => (
          <li key={i} className="flex gap-4 py-5">
            <span className="w-6 flex-none pt-[9px] font-mono text-[12.5px] tabular-nums text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-[26px] leading-[1.2] tracking-[-.015em] text-[var(--ink)]">
                {txt(p.nombre)}
                {recomendado && txt(p.nombre).toLowerCase() === recomendado && (
                  <span className="rounded-full bg-[var(--banana)] px-2.5 py-[3px] font-sans text-[12px] font-semibold tracking-normal text-[var(--ink)]">Recomendado</span>
                )}
              </p>
              {txt(p.racional) && <p className="mt-1.5 text-[15px] leading-[1.6] text-[var(--secundario)]">{txt(p.racional)}</p>}
              {txt(p.disponibilidad) && <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[var(--rotulo)]">Disponibilidad: {txt(p.disponibilidad)}</p>}
            </div>
          </li>
        ))}
      </ol>
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/** La tabla de entregables de marca: qué pieza, con qué especificaciones y qué dice. */
const Copies: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const entregables = lista(leer('entregables')).map(obj)
  return (
    <Documento>
      <div className="max-w-[72ch] border-t-[1.5px] border-[var(--ink)]">
        {entregables.map((e, i) => (
          <div key={i} className="grid gap-x-8 gap-y-3 border-b border-[var(--line)] py-6 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div>
              <p className="font-serif text-[20px] leading-[1.25] tracking-[-.01em] text-[var(--ink)]">{txt(e.entregable)}</p>
              {txt(e.especificaciones) && <p className="mt-1.5 text-[13.5px] leading-[1.55] text-[var(--secundario)]">{txt(e.especificaciones)}</p>}
            </div>
            <ul className="space-y-3">
              {textos(comoLista(e.copies)).map((t, j) => (
                <li key={j} className="whitespace-pre-line border-l-[1.5px] border-[var(--banana)] pl-4 text-[16px] leading-[1.55] text-[var(--ink)]">{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/** “brandEssence” o “brand_essence” → “Brand essence”. */
function humano(k: string): string {
  const s = k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const Cuadros: Vista = ({ content }) => {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const cuadro = (v: unknown) => Object.entries(obj(v)).map(([k, t]) => [humano(k), t] as [string, unknown])
  return (
    <Documento>
      <Seccion titulo="Brand essence"><Ficha filas={cuadro(leer('brandEssence', 'brand_essence'))} /></Seccion>
      <Seccion titulo="Consumidor"><Ficha filas={cuadro(leer('consumidor'))} /></Seccion>
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

const VISTAS: Record<EstrategiaKey, Vista> = {
  diagnostico: Diagnostico,
  consumidor: Consumidor,
  objetivo: FraseUnica(false),
  rtbs: ListaNumerada,
  concepto: Concepto,
  beneficios: Beneficios,
  arquetipo: Arquetipo,
  personalidad: Personalidad,
  valores: Valores,
  territorio: FraseUnica(false),
  brand_ideal: FraseUnica(false),
  ingredients: ListaNumerada,
  onlyness: FraseUnica(false),
  tagline: FraseUnica(true),
  manifiesto: Manifiesto,
  cuadros: Cuadros,
  naming: Naming,
  copies: Copies,
}

/** El documento de una etapa de la Estrategia. Si llega algo que no es un objeto, el genérico. */
export function VistaEstrategia({ etapa, content }: { etapa: EstrategiaKey; content: unknown }) {
  if (typeof content !== 'object' || content === null || Array.isArray(content)) return <VistaGenerica content={content} />
  const V = VISTAS[etapa]
  return <V content={content} />
}
