import { EJES, MAX_TENDENCIAS, MIN_TENDENCIAS, type StageKey } from '@/lib/landscape/stages'
import type { PiezaKey } from '@/lib/landscape/piezas'
import { ErrorDeHerramienta } from './errores'

/**
 * Cinco de las seis etapas guardan lo que venga: el panel las renderiza genéricamente
 * y una humana las lee. Tendencias es distinta — el gate no lee texto, recorre
 * `candidatas` y guarda la selección como una lista de ids. Con otra forma el panel
 * muestra el contenido pero el gate deja de funcionar, y el gate es la etapa.
 *
 * Validar acá pone el error donde sale gratis: Claude todavía tiene el turno y reintenta.
 */
export function validarContenidoEtapa(etapa: StageKey, contenido: unknown): void {
  if (typeof contenido !== 'object' || contenido === null || Array.isArray(contenido))
    throw new ErrorDeHerramienta('El contenido tiene que ser un objeto JSON.')

  if (etapa !== 'tendencias') return

  const { candidatas, seleccionadas } = contenido as Record<string, unknown>

  if (seleccionadas !== undefined)
    throw new ErrorDeHerramienta(
      'No escribas “seleccionadas”: elegir las 4 o 5 tendencias es una decisión del equipo ' +
      'y se hace desde el panel. Mandá solo la long list en “candidatas”.',
    )

  if (!Array.isArray(candidatas) || candidatas.length < MIN_TENDENCIAS)
    throw new ErrorDeHerramienta(
      'La etapa Tendencias necesita “candidatas”: una lista con la long list completa, de ' +
      `al menos ${MIN_TENDENCIAS} tendencias — de esa lista el equipo elige entre ` +
      `${MIN_TENDENCIAS} y ${MAX_TENDENCIAS} desde el panel, así que tiene que haber ` +
      'al menos esa cantidad. ' +
      'Cada tendencia lleva id, eje, titulo, descripcion y fuentes.',
    )

  const vistos = new Set<string>()
  candidatas.forEach((c, i) => {
    if (typeof c !== 'object' || c === null)
      throw new ErrorDeHerramienta(`La candidata ${i + 1} tiene que ser un objeto.`)
    const t = c as Record<string, unknown>

    if (typeof t.id !== 'string' || !t.id.trim())
      throw new ErrorDeHerramienta(
        `A la candidata ${i + 1} le falta un “id” de texto. El id es lo que guarda la ` +
        'selección del equipo, así que tiene que ser estable y único.',
      )
    if (vistos.has(t.id))
      throw new ErrorDeHerramienta(`El id “${t.id}” está repetido: cada tendencia necesita el suyo.`)
    vistos.add(t.id)

    if (typeof t.eje !== 'string' || !EJES.includes(t.eje as (typeof EJES)[number]))
      throw new ErrorDeHerramienta(
        `La candidata “${t.id}” tiene un eje inválido. Los válidos son: ${EJES.join(', ')}.`,
      )
    for (const campo of ['titulo', 'descripcion'] as const)
      if (typeof t[campo] !== 'string' || !(t[campo] as string).trim())
        throw new ErrorDeHerramienta(`A la candidata “${t.id}” le falta “${campo}”.`)

    // El panel recorre `fuentes` sin guarda al renderizar (`t.fuentes.map(...)`): sin
    // este chequeo, una candidata sin `fuentes` o con `fuentes` mal formada no rompe
    // acá, rompe en el navegador de quien abre el gate, y ahí ya no hay vuelta atrás
    // fácil. Puede venir vacía — el panel mapea sobre un array vacío sin problema.
    if (!Array.isArray(t.fuentes))
      throw new ErrorDeHerramienta(
        `A la candidata “${t.id}” le falta “fuentes” como array (puede ir vacío: []).`,
      )
    t.fuentes.forEach((f, j) => {
      if (typeof f !== 'object' || f === null)
        throw new ErrorDeHerramienta(
          `La fuente ${j + 1} de la candidata “${t.id}” tiene que ser un objeto.`,
        )
      const fuente = f as Record<string, unknown>
      if (typeof fuente.doc !== 'string' || !fuente.doc.trim())
        throw new ErrorDeHerramienta(
          `La fuente ${j + 1} de la candidata “${t.id}” necesita “doc” de texto no vacío.`,
        )
      if (fuente.pagina !== undefined && typeof fuente.pagina !== 'number')
        throw new ErrorDeHerramienta(
          `La fuente ${j + 1} de la candidata “${t.id}” tiene “pagina”, pero no es un número.`,
        )
    })
  })
}

const texto = (v: unknown) => typeof v === 'string' && v.trim() !== ''
const textoOLista = (v: unknown) => texto(v) || (Array.isArray(v) && v.length > 0 && v.every(texto))

function lista(contenido: Record<string, unknown>, campo: string, pieza: string): Record<string, unknown>[] {
  const v = contenido[campo]
  if (!Array.isArray(v) || !v.length || v.some(x => typeof x !== 'object' || x === null))
    throw new ErrorDeHerramienta(`${pieza} necesita “${campo}”: una lista de objetos, con al menos uno.`)
  return v as Record<string, unknown>[]
}

function exigir(o: Record<string, unknown>, campos: [string, (v: unknown) => boolean][], donde: string) {
  for (const [campo, ok] of campos)
    if (!ok(o[campo])) throw new ErrorDeHerramienta(`A ${donde} le falta “${campo}”.`)
}

/**
 * Las piezas que se guardan aparte (ver piezas.ts). La forma mínima es la que el panel sabe
 * mostrar como parte del deck; lo que sobre se guarda igual y se ve al final.
 */
export function validarPieza(pieza: PiezaKey, contenido: unknown): void {
  if (typeof contenido !== 'object' || contenido === null || Array.isArray(contenido))
    throw new ErrorDeHerramienta('El contenido tiene que ser un objeto JSON.')
  const c = contenido as Record<string, unknown>
  switch (pieza) {
    case 'tendencias-desarrollo':
      lista(c, 'tendencias', 'El desarrollo').forEach((t, i) => exigir(t, [
        ['titulo', texto], ['explicacion', texto], ['profundizacion', texto], ['enfoques', textoOLista],
      ], `la tendencia ${i + 1}`))
      return
    case 'tendencias-casos':
      lista(c, 'tendencias', 'Los casos').forEach((t, i) => {
        exigir(t, [['titulo', texto]], `la tendencia ${i + 1}`)
        lista(t, 'casos', `La tendencia “${t.titulo}”`).forEach((caso, j) =>
          exigir(caso, [['marca', texto], ['descripcion', texto]], `el caso ${j + 1} de “${t.titulo}”`))
      })
      return
    case 'panorama-brand-assets':
      lista(c, 'competidores', 'El cuadro de brand assets').forEach((m, i) => exigir(m, [
        ['marca', texto], ['territorio', textoOLista], ['mensajes', textoOLista], ['claims', textoOLista],
      ], `el competidor ${i + 1}`))
      return
    case 'panorama-circulo':
      lista(c, 'marcas', 'El círculo cromático').forEach((m, i) => {
        exigir(m, [['marca', texto]], `la marca ${i + 1}`)
        const colores = m.colores
        if (!Array.isArray(colores) || !colores.length || !colores.every(x => typeof x === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(x)))
          throw new ErrorDeHerramienta(`Los “colores” de “${m.marca}” tienen que ser una lista de hex, como "#1A2B3C".`)
      })
      if (!texto(c.lectura)) throw new ErrorDeHerramienta('Al círculo cromático le falta “lectura”: qué espacios de color quedan libres.')
      return
  }
}
