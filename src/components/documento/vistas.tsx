/**
 * El documento de cada paso del Landscape, armado para leerse como un informe y no como
 * un volcado de campos. Cada vista conoce la forma que Claude usa hoy para su paso; lo que
 * no reconoce no se pierde: cae al final, en “Más información”, con el render genérico.
 *
 * Claude a veces escribe las claves en snake_case y a veces en camelCase, así que cada
 * campo se busca por todos sus nombres conocidos.
 */

import Link from 'next/link'
import { ContenidoEtapa } from '../../app/admin/projects/[id]/landscape/ContenidoEtapa'
import {
  Chips, ChipFuente, Cifras, Destacado, Faltantes, Ficha, FuentesEnLinea, Interpretacion,
  Parrafo, Puntos, Rotulo, Seccion, Tarjeta, Tarjetas, dominio, lista, obj, textos, txt,
} from './bloques'
import { EJES, type TendenciaCandidata } from '@/lib/landscape/stages'

type Contenido = Record<string, unknown>

/** El primer campo presente entre varios nombres posibles, y la lista de los nombres usados. */
function lector(c: Contenido) {
  const usados = new Set<string>()
  const leer = (...nombres: string[]): unknown => {
    for (const n of nombres) usados.add(n)
    for (const n of nombres) if (c[n] !== undefined && c[n] !== null) return c[n]
    return undefined
  }
  return { leer, usados }
}

/** Lo que Claude guardó y ninguna vista sabe mostrar. Se muestra igual, al final. */
function MasInformacion({ c, usados }: { c: Contenido; usados: Set<string> }) {
  const resto = Object.fromEntries(Object.entries(c).filter(([k]) => !usados.has(k)))
  if (!Object.keys(resto).length) return null
  return (
    <Seccion titulo="Más información">
      <ContenidoEtapa content={resto} />
    </Seccion>
  )
}

function Documento({ children }: { children: React.ReactNode }) {
  return <div className="space-y-9">{children}</div>
}

/** Saca el “1. ” del principio de un título numerado: el número ya va aparte. */
function sinNumero(titulo: string): { numero?: string; titulo: string } {
  const m = titulo.match(/^(\d+)[.)]\s+(.*)$/)
  return m ? { numero: m[1], titulo: m[2] } : { titulo }
}

// ─── 1.0 · Enfoque del estudio ────────────────────────────────────────────────────────

export function VistaEnfoque({ content }: { content: unknown }) {
  const c = obj(content)
  const { leer, usados } = lector(c)
  usados.add('id').add('opcionElegida')
  const ejes = obj(leer('ejesTendencias', 'ejes_tendencias'))
  const set = obj(leer('setCompetitivo', 'set_competitivo'))
  const nombre = txt(leer('nombre'))
  return (
    <Documento>
      <Destacado rotulo="Pregunta central" texto={leer('preguntaCentral', 'pregunta_central')} />

      <Seccion titulo="El enfoque">
        {nombre && <p className="font-serif text-[18px] leading-[1.4] text-[var(--ink)]">{nombre}</p>}
        <Parrafo texto={leer('enfoque')} />
        <Ficha filas={[
          ['Categoría', leer('categoria')],
          ['Alcance geográfico', leer('alcanceGeografico', 'alcance_geografico')],
        ]} />
        <Tarjetas>
          {txt(leer('gana')) && <Tarjeta titulo="Qué gana"><Parrafo texto={c.gana} /></Tarjeta>}
          {txt(leer('arriesga')) && <Tarjeta titulo="Qué arriesga"><Parrafo texto={c.arriesga} /></Tarjeta>}
        </Tarjetas>
        <Interpretacion titulo="Cómo encaja con las entrevistas" texto={leer('encajeEntrevistas', 'encaje_entrevistas')} />
        <Interpretacion titulo="Recomendación" texto={leer('recomendacionBorrador', 'recomendacion')} />
      </Seccion>

      {textos(leer('audienciasFoco', 'audiencias_foco')).length > 0 && (
        <Seccion titulo="Audiencias foco"><Puntos items={c.audienciasFoco ?? c.audiencias_foco} /></Seccion>
      )}

      {Object.keys(ejes).length > 0 && (
        <Seccion titulo="Ejes para buscar tendencias">
          <Tarjetas columnas={3}>
            {Object.entries(ejes).map(([k, v]) => {
              const t = txt(v)
              const [cabeza, ...cola] = t.split(': ')
              return (
                <Tarjeta key={k} titulo={cola.length ? cabeza : k.charAt(0).toUpperCase() + k.slice(1)} tono="claro">
                  <p className="text-[14px] leading-[1.6] text-[var(--cuerpo)]">{cola.length ? cola.join(': ') : t}</p>
                </Tarjeta>
              )
            })}
          </Tarjetas>
        </Seccion>
      )}

      {Object.keys(set).length > 0 && (
        <Seccion titulo="Set competitivo">
          <Tarjetas columnas={3}>
            {Object.entries(set).map(([k, v]) => (
              <Tarjeta key={k} titulo={`${k.charAt(0).toUpperCase() + k.slice(1)} · ${textos(v).length}`}>
                <ul className="space-y-1.5">
                  {textos(v).map((t, i) => <li key={i} className="text-[14px] leading-[1.5] text-[var(--cuerpo)]">{t}</li>)}
                </ul>
              </Tarjeta>
            ))}
          </Tarjetas>
        </Seccion>
      )}

      {textos(leer('fuentesPrioritarias', 'fuentes_prioritarias')).length > 0 && (
        <Seccion titulo="Fuentes prioritarias"><Puntos items={c.fuentesPrioritarias ?? c.fuentes_prioritarias} /></Seccion>
      )}

      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

// ─── 2.1 · Fuentes ────────────────────────────────────────────────────────────────────

/** Una lista de fuentes numerada: título, sitio y link. */
export function ListaFuentes({ fuentes }: { fuentes: unknown }) {
  const fs = lista(fuentes).map(obj).filter(f => txt(f.titulo) || txt(f.doc) || txt(f.url))
  if (!fs.length) return null
  return (
    <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {fs.map((f, i) => {
        const url = txt(f.url)
        const sitio = url ? dominio(url) : ''
        return (
          <li key={i} className="flex items-start gap-4 py-3">
            <span className="w-6 flex-none pt-[2px] text-right font-mono text-[11px] tabular-nums text-[var(--rotulo)]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] leading-[1.5] text-[var(--ink)]">{txt(f.titulo) || txt(f.doc) || sitio}</p>
              {(sitio || (url && !sitio)) && (
                <p className="mt-0.5 text-[12.5px] text-[var(--secundario)]">
                  {sitio || <span className="text-[#7A5B00]">△ El link está mal escrito</span>}
                </p>
              )}
            </div>
            {url && sitio && (
              <a href={url} target="_blank" rel="noreferrer"
                className="flex-none text-[13px] text-[var(--secundario)] underline decoration-[var(--line)] underline-offset-[3px] transition-colors hover:text-[var(--ink)] hover:decoration-[var(--ink)]">
                Abrir <span aria-hidden="true">↗</span>
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function VistaFuentes({ content }: { content: unknown }) {
  const fuentes = lista(obj(content).fuentes)
  const sitios = new Set(fuentes.map(f => dominio(txt(obj(f).url))).filter(Boolean))
  return (
    <Documento>
      <p className="text-[15px] text-[var(--secundario)]">
        <span className="font-semibold text-[var(--ink)]">{fuentes.length} fuentes</span> de {sitios.size} sitios distintos.
        Ábrelas para confirmar que dicen lo que el contexto cita.
      </p>
      <ListaFuentes fuentes={fuentes} />
    </Documento>
  )
}

// ─── 2.2 · Contexto del sector ────────────────────────────────────────────────────────

export function VistaContexto({ content, hrefFuentes }: { content: unknown; hrefFuentes: string }) {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const secciones = lista(leer('secciones')).map(obj)
  const nFuentes = lista(leer('fuentes')).length
  return (
    <Documento>
      <Destacado rotulo="En corto" texto={leer('resumen')} />

      <Ficha filas={[
        ['Marca evaluada', leer('marca_evaluada', 'marcaEvaluada')],
        ['Desde dónde se lee', leer('lente_estrategico', 'lenteEstrategico')],
      ]} />
      <Interpretacion titulo="Tensión en el cliente" texto={leer('tension_en_el_cliente', 'tensionEnElCliente', 'tension')} />

      {secciones.length > 1 && (
        <nav aria-label="Secciones del contexto" className="border-y border-[var(--line)] py-5">
          <Rotulo>En este paso</Rotulo>
          <ol className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {secciones.map((s, i) => {
              const { titulo } = sinNumero(txt(s.titulo) || `Sección ${i + 1}`)
              return (
                <li key={i}>
                  <a href={`#seccion-${i + 1}`} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-[var(--cuerpo)] hover:text-[var(--ink)] hover:underline">
                    <span className="font-mono text-[12px] tabular-nums text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>{titulo}
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {secciones.map((s, i) => {
        const { numero, titulo } = sinNumero(txt(s.titulo) || `Sección ${i + 1}`)
        return (
          <Seccion key={i} id={`seccion-${i + 1}`} numero={numero ?? String(i + 1)} titulo={titulo}>
            <Parrafo texto={s.texto} />
            <Cifras datos={s.datos} />
            <Interpretacion texto={s.lectura_estrategica ?? s.lecturaEstrategica ?? s.lectura} />
          </Seccion>
        )
      })}

      {textos(leer('implicaciones_para_la_marca', 'implicacionesParaLaMarca', 'implicaciones')).length > 0 && (
        <Seccion titulo="Qué significa para la marca">
          <Puntos numerada items={c.implicaciones_para_la_marca ?? c.implicacionesParaLaMarca ?? c.implicaciones} />
        </Seccion>
      )}

      <Faltantes items={leer('vacios_de_informacion', 'vaciosDeInformacion', 'vaciosInformacion')} />

      {nFuentes > 0 && (
        <p className="text-[14px] text-[var(--secundario)]">
          Las {nFuentes} fuentes de este contexto están en el paso{' '}
          <Link href={hrefFuentes} className="font-medium text-[var(--ink)] underline underline-offset-2">2.1 · Fuentes del sector</Link>.
        </p>
      )}

      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

// ─── 3.1 · Lista larga de tendencias ──────────────────────────────────────────────────

export function VistaListaLarga({ candidatas, elegidas }: { candidatas: TendenciaCandidata[]; elegidas: string[] }) {
  return (
    <Documento>
      <p className="text-[15px] text-[var(--secundario)]">
        <span className="font-semibold text-[var(--ink)]">{candidatas.length} tendencias</span> en tres ejes.
        Léelas acá; se eligen en el paso 3.3.
      </p>
      {EJES.map(eje => {
        const delEje = candidatas.filter(t => t.eje === eje)
        if (!delEje.length) return null
        return (
          <Seccion key={eje} titulo={eje} numero={String(delEje.length)}>
            <Tarjetas>
              {delEje.map(t => (
                <Tarjeta key={t.id} tono={elegidas.includes(t.id) ? 'claro' : undefined}>
                  {elegidas.includes(t.id) && (
                    <p className="mb-2 inline-flex rounded-[3px] bg-[var(--banana)] px-1.5 py-0.5 text-[11.5px] font-semibold text-[var(--ink)]">Elegida</p>
                  )}
                  <p className="text-[14.5px] font-semibold leading-snug text-[var(--ink)]">{t.titulo}</p>
                  <p className="mt-1.5 text-[14px] leading-[1.6] text-[var(--cuerpo)]">{t.descripcion}</p>
                  <div className="mt-3"><FuentesEnLinea fuentes={t.fuentes} /></div>
                </Tarjeta>
              ))}
            </Tarjetas>
          </Seccion>
        )
      })}
    </Documento>
  )
}

// ─── 4.1 · Benchmarking ───────────────────────────────────────────────────────────────

const EJES_BENCHMARKING: [string[], string][] = [
  [['logos'], 'Logos'],
  [['websites', 'paginasWeb', 'paginas_web', 'web'], 'Páginas web'],
  [['redesSociales', 'redes_sociales', 'redes'], 'Redes sociales'],
  [['tiposExperiencias', 'experiencia', 'experienciaDeMarca', 'experiencia_de_marca'], 'Experiencia de marca'],
]

function EjeBenchmarking({ datos }: { datos: Contenido }) {
  const clasificacion = obj(datos.clasificacion)
  return (
    <>
      <Parrafo texto={datos.nota} />
      {Object.keys(clasificacion).length > 0 && (
        <Tarjetas>
          {Object.entries(clasificacion).map(([k, v]) => (
            <Tarjeta key={k} titulo={`${k.charAt(0).toUpperCase() + k.slice(1)} · ${textos(v).length}`}>
              <Chips items={v} />
            </Tarjeta>
          ))}
        </Tarjetas>
      )}
      {textos(datos.tipos).length > 0 && <Chips items={datos.tipos} />}
      <Puntos items={datos.conclusiones} />
      <Interpretacion titulo="Qué implica" texto={datos.implicacion} />
      <FuentesEnLinea fuentes={datos.fuentes} />
    </>
  )
}

export function VistaBenchmarking({ content }: { content: unknown }) {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const b = obj(leer('benchmarking'))
  const respaldo = obj(b.respaldo)
  const cifras = lista(respaldo.cifras).map(obj)
  const reviews = obj(respaldo.reviews)
  const marcas = lista(leer('marcas')).map(obj)
  const ejesMapa = obj(leer('ejes'))
  const vertical = obj(ejesMapa.vertical)
  const horizontal = obj(ejesMapa.horizontal)
  const actual = obj(leer('posicionActual', 'posicion_actual'))
  const ideal = obj(leer('posicionIdeal', 'posicion_ideal'))
  leer('notas', 'fuente')

  return (
    <Documento>
      <Parrafo texto={b.alcance} />
      {textos(b.marcasAnalizadas).length > 0 && (
        <div className="space-y-2">
          <Rotulo>{textos(b.marcasAnalizadas).length} marcas analizadas</Rotulo>
          <Chips items={b.marcasAnalizadas} />
        </div>
      )}

      {EJES_BENCHMARKING.map(([claves, titulo], i) => {
        const datos = obj(claves.map(k => b[k]).find(v => v !== undefined))
        if (!Object.keys(datos).length) return null
        return <Seccion key={titulo} numero={String(i + 1)} titulo={titulo}><EjeBenchmarking datos={datos} /></Seccion>
      })}

      {(cifras.length > 0 || Object.keys(reviews).length > 0) && (
        <Seccion titulo="Respaldo en cifras">
          {cifras.length > 0 && (
            <div className="border-t-[1.5px] border-[var(--ink)]">
              {cifras.map((d, i) => {
                const f = obj(d.fuente)
                return (
                  <div key={i} className="grid gap-x-6 gap-y-1 border-b border-[var(--line)] py-3.5 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,200px)] sm:items-baseline">
                    <span className="text-[13.5px] text-[var(--secundario)]">{txt(d.marca)}</span>
                    <span className="text-[16px] font-medium leading-[1.45] text-[var(--ink)]">{txt(d.dato)}</span>
                    {(txt(f.doc) || txt(f.url)) && <span className="min-w-0 sm:text-right"><ChipFuente texto={txt(f.doc) || dominio(txt(f.url))} url={txt(f.url) || undefined} /></span>}
                  </div>
                )
              })}
            </div>
          )}
          <Interpretacion texto={respaldo.lecturaCifras} />
          {textos(reviews.conclusiones).length > 0 && (
            <div className="space-y-2">
              <Rotulo>Qué dicen expositores y prensa</Rotulo>
              <Puntos items={reviews.conclusiones} />
              <FuentesEnLinea fuentes={reviews.fuentes} />
            </div>
          )}
          {txt(respaldo.notaMetodologica) && <p className="text-[13px] text-[var(--secundario)]">Nota: {txt(respaldo.notaMetodologica)}</p>}
        </Seccion>
      )}

      {marcas.length > 0 && (
        <Seccion titulo="Mapa de posicionamiento">
          {(txt(vertical.arriba) || txt(horizontal.izquierda)) && (
            <p className="text-[14px] leading-[1.6] text-[var(--secundario)]">
              Vertical: de <b className="font-medium text-[var(--ink)]">{txt(vertical.abajo)}</b> a <b className="font-medium text-[var(--ink)]">{txt(vertical.arriba)}</b>.
              {' '}Horizontal: de <b className="font-medium text-[var(--ink)]">{txt(horizontal.izquierda)}</b> a <b className="font-medium text-[var(--ink)]">{txt(horizontal.derecha)}</b>.
            </p>
          )}
          <div className="overflow-x-auto border-t-[1.5px] border-[var(--ink)]">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead className="border-b border-[var(--line)] font-mono text-[10.5px] uppercase tracking-[.1em] text-[var(--rotulo)]">
                <tr>
                  <th className="px-3 py-2.5 font-normal">#</th>
                  <th className="px-3 py-2.5 font-normal">Marca</th>
                  <th className="px-3 py-2.5 font-normal">País</th>
                  {Object.keys(obj(marcas[0]?.posicion)).map(k => (
                    <th key={k} className="px-3 py-2.5 font-normal">{k.charAt(0).toUpperCase() + k.slice(1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {marcas.map((m, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--rotulo)]">{txt(m.numero) || i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-[var(--ink)]">{txt(m.nombre)}</td>
                    <td className="px-3 py-2.5 text-[var(--secundario)]">{txt(m.pais)}</td>
                    {Object.keys(obj(marcas[0]?.posicion)).map(k => (
                      <td key={k} className="px-3 py-2.5 text-[var(--cuerpo)]">{txt(obj(m.posicion)[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tarjetas>
            {txt(actual.descripcion) && <Tarjeta titulo={`Dónde está hoy ${txt(actual.marca)}`}><Parrafo texto={actual.descripcion} /></Tarjeta>}
            {txt(ideal.descripcion) && <Tarjeta titulo="Dónde debería estar" tono="claro"><Parrafo texto={ideal.descripcion} /></Tarjeta>}
          </Tarjetas>
          {txt(c.notas) && <p className="text-[13px] text-[var(--secundario)]">Nota: {txt(c.notas)}</p>}
          {txt(c.fuente) && <p><ChipFuente texto={txt(c.fuente)} /></p>}
        </Seccion>
      )}

      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

// ─── 5.1 · Diagnóstico de assets ──────────────────────────────────────────────────────

export function VistaDiagnostico({ content }: { content: unknown }) {
  const c = obj(content)
  const { leer, usados } = lector(c)
  const pregunta = obj(leer('preguntaCentral', 'pregunta_central'))
  const hallazgos = lista(leer('hallazgos')).map(obj)
  // Se leen antes del JSX: dentro de un `||` el segundo no se leería y su clave caería
  // repetida en “Más información”.
  const tensiones = textos(leer('tensiones'))
  const riesgos = textos(leer('riesgos'))
  return (
    <Documento>
      <Destacado rotulo="En corto" texto={leer('resumen')} />
      {txt(pregunta.pregunta) && (
        <div className="space-y-3">
          <Destacado rotulo="Pregunta central" texto={pregunta.pregunta} />
          <Interpretacion titulo="Respuesta" texto={pregunta.respuesta} />
        </div>
      )}

      {hallazgos.map((h, i) => (
        <Seccion key={i} numero={String(i + 1)} titulo={txt(h.titulo) || `Hallazgo ${i + 1}`}>
          <Parrafo texto={h.texto} />
          {textos(h.evidencia).length > 0 && (
            <div className="space-y-2"><Rotulo>Evidencia</Rotulo><Puntos items={h.evidencia} /></div>
          )}
          <Interpretacion texto={h.lecturaEstrategica ?? h.lectura_estrategica ?? h.lectura} />
        </Seccion>
      ))}

      {(tensiones.length > 0 || riesgos.length > 0) && (
        <Seccion titulo="Tensiones y riesgos">
          <Tarjetas>
            {tensiones.length > 0 && <Tarjeta titulo="Tensiones"><Puntos items={tensiones} /></Tarjeta>}
            {riesgos.length > 0 && <Tarjeta titulo="Riesgos"><Puntos items={riesgos} /></Tarjeta>}
          </Tarjetas>
        </Seccion>
      )}
      {textos(leer('oportunidades')).length > 0 && (
        <Seccion titulo="Oportunidades"><Puntos items={c.oportunidades} /></Seccion>
      )}
      {textos(leer('implicaciones')).length > 0 && (
        <Seccion titulo="Qué significa para la marca"><Puntos numerada items={c.implicaciones} /></Seccion>
      )}
      <Faltantes items={leer('vaciosInformacion', 'vacios_de_informacion', 'vaciosDeInformacion')} />
      {lista(leer('fuentes')).length > 0 && (
        <Seccion titulo="Fuentes"><ListaFuentes fuentes={c.fuentes} /></Seccion>
      )}
      <MasInformacion c={c} usados={usados} />
    </Documento>
  )
}

/** Cualquier otro contenido: el render genérico, dentro del mismo marco. */
export function VistaGenerica({ content }: { content: unknown }) {
  return <ContenidoEtapa content={content} />
}
