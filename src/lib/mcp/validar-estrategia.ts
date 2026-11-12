import type { EstrategiaKey } from '@/lib/estrategia/stages'
import { ErrorDeHerramienta } from './errores'

/**
 * Formas mínimas por etapa: campos requeridos no vacíos, listas con al menos un
 * elemento. A propósito liviana — Claude escribe borradores y el control de calidad
 * real es humano en el panel. Validar acá pone el error donde sale gratis: Claude
 * todavía tiene el turno y reintenta.
 */
export function validarContenidoEstrategia(etapa: EstrategiaKey, contenido: unknown): void {
  if (typeof contenido !== 'object' || contenido === null || Array.isArray(contenido))
    throw new ErrorDeHerramienta('El contenido tiene que ser un objeto JSON.')
  const c = contenido as Record<string, unknown>

  const texto = (campo: string) => {
    if (typeof c[campo] !== 'string' || !(c[campo] as string).trim())
      throw new ErrorDeHerramienta(`La etapa “${etapa}” necesita “${campo}” como texto no vacío.`)
  }
  const listaDeTextos = (campo: string) => {
    const v = c[campo]
    if (!Array.isArray(v) || v.length === 0 || v.some(x => typeof x !== 'string' || !x.trim()))
      throw new ErrorDeHerramienta(
        `La etapa “${etapa}” necesita “${campo}” como lista de textos no vacíos, con al menos uno.`,
      )
  }
  const objetoConTexto = (campo: string) => {
    const v = c[campo]
    if (typeof v !== 'object' || v === null || Array.isArray(v) || Object.keys(v).length === 0)
      throw new ErrorDeHerramienta(
        `La etapa “cuadros” necesita “${campo}” como objeto no vacío de pares campo→texto ` +
        '(el layout del cuadro es del archivo de Estrategia; acá va el contenido).',
      )
  }

  const listaDeObjetos = (campo: string, forma: string): Record<string, unknown>[] => {
    const v = c[campo]
    if (!Array.isArray(v) || v.length === 0 || v.some(x => typeof x !== 'object' || x === null || Array.isArray(x)))
      throw new ErrorDeHerramienta(`La etapa “${etapa}” necesita “${campo}”: ${forma}, con al menos un elemento.`)
    return v as Record<string, unknown>[]
  }
  const exigir = (o: Record<string, unknown>, campos: string[], donde: string) => {
    for (const campo of campos)
      if (typeof o[campo] !== 'string' || !(o[campo] as string).trim())
        throw new ErrorDeHerramienta(`${donde} le falta “${campo}” como texto no vacío.`)
  }

  switch (etapa) {
    case 'diagnostico': texto('problema'); texto('insight'); texto('ventaja'); listaDeTextos('diferenciales'); texto('rumbo'); break
    case 'consumidor':
      texto('metodologia'); texto('perfil'); listaDeTextos('motivaciones'); listaDeTextos('tensiones')
      texto('pertenencia'); listaDeTextos('frases')
      break
    case 'rtbs': listaDeTextos('items'); break
    case 'concepto': texto('concepto'); texto('racional'); break
    case 'beneficios': listaDeTextos('funcionales'); listaDeTextos('emocionales'); break
    case 'arquetipo': texto('arquetipo'); texto('justificacion'); break
    case 'personalidad': listaDeTextos('rasgos'); break
    case 'valores': {
      const items = c.items
      if (!Array.isArray(items) || items.length === 0)
        throw new ErrorDeHerramienta('La etapa “valores” necesita “items”: una lista de { valor, validacion }.')
      items.forEach((item, i) => {
        if (typeof item !== 'object' || item === null)
          throw new ErrorDeHerramienta(`El valor ${i + 1} tiene que ser un objeto { valor, validacion }.`)
        const v = item as Record<string, unknown>
        for (const campo of ['valor', 'validacion'] as const)
          if (typeof v[campo] !== 'string' || !(v[campo] as string).trim())
            throw new ErrorDeHerramienta(`Al valor ${i + 1} le falta “${campo}” como texto no vacío.`)
      })
      break
    }
    case 'territorio': case 'brand_ideal': case 'tagline': case 'manifiesto': case 'objetivo': case 'onlyness':
      texto('texto'); break
    case 'ingredients': listaDeTextos('items'); break
    case 'cuadros': objetoConTexto('brandEssence'); objetoConTexto('consumidor'); break
    case 'naming':
      listaDeObjetos('propuestas', 'una lista de { nombre, racional }').forEach((p, i) =>
        exigir(p, ['nombre', 'racional'], `A la propuesta de nombre ${i + 1}`))
      break
    case 'copies':
      listaDeObjetos('entregables', 'una lista de { entregable, especificaciones, copies }').forEach((e, i) => {
        exigir(e, ['entregable', 'especificaciones'], `Al entregable ${i + 1}`)
        const copies = e.copies
        if (!Array.isArray(copies) || copies.length === 0 || copies.some(x => typeof x !== 'string' || !x.trim()))
          throw new ErrorDeHerramienta(
            `Al entregable ${i + 1} le faltan sus “copies”: una lista de textos no vacíos, con al menos uno.`,
          )
      })
      break
  }
}
