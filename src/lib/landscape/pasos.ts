/**
 * El paso a paso del Landscape, tal como lo escribió el estudio en
 * docs/fase2/fase-2-investigacion-landscape.md. Las seis etapas son donde se guarda el
 * trabajo y son también las secciones de la pantalla; los pasos son la receta: lo que
 * Claude sigue en el chat y lo que el equipo marca cuando lo hace por fuera.
 *
 * Cada paso dice tres cosas que la pantalla necesita para no hacer pensar a nadie: quién
 * lo hace, dónde se resuelve y cuándo está listo. El estado no se guarda aparte: se deduce
 * de lo que ya hay en la etapa (o de la marca que pone el equipo, si el paso es de afuera).
 */

import { STAGE_LABEL, type StageKey } from './stages'

export type Quien = 'claude' | 'equipo' | 'juntos'

/**
 * Dónde se resuelve el paso:
 * - `plataforma`: Claude guarda por MCP y el equipo lo aprueba acá (o el equipo decide acá).
 * - `chat`: Claude ayuda en claude.ai pero la plataforma todavía no guarda ese contenido;
 *   el equipo lo lleva al deck y marca el paso como hecho.
 * - `afuera`: lo hace el equipo fuera de la plataforma (Dropbox, una reunión) y lo marca.
 */
export type Donde = 'plataforma' | 'chat' | 'afuera'

export interface Paso {
  /** '2.2': el número del documento del estudio. Es también lo que va en la URL. */
  id: string
  etapa: StageKey
  titulo: string
  /** Una frase: qué hay que hacer. */
  queEs: string
  quien: Quien
  /** Quién hace qué, dicho en palabras. */
  quienTexto: string
  necesita: string
  listoCuando: string
  donde: Donde
  /**
   * Sólo existe si Claude guardó algo ahí: sin contenido no aplica, no queda pendiente ni
   * es lo que sigue. Es el caso de la Entrega, donde Claude a veces deja material.
   */
  opcional?: boolean
}

export const PASOS: Paso[] = [
  {
    id: '1.0', etapa: 'setup', titulo: 'Enfoque del estudio',
    queEs: 'Definir qué se va a investigar: la pregunta central, el set competitivo y las fuentes prioritarias.',
    quien: 'juntos', quienTexto: 'Claude lo propone desde las entrevistas y el equipo lo aprueba.',
    necesita: 'Las entrevistas y la propuesta de valor.',
    listoCuando: 'El equipo aprueba el enfoque.',
    donde: 'plataforma',
  },
  {
    id: '1.1', etapa: 'setup', titulo: 'Carpeta y deck en Dropbox',
    queEs: 'Crear la carpeta “Fase 01 Landscape” del proyecto y copiar ahí el template del Landscape de M&B, con el nombre del proyecto.',
    quien: 'equipo', quienTexto: 'Lo hace el equipo en Dropbox.',
    necesita: 'El nombre del proyecto.',
    listoCuando: 'El deck de trabajo está en su carpeta y todo el equipo lo puede abrir.',
    donde: 'afuera',
  },
  {
    id: '2.1', etapa: 'contexto', titulo: 'Fuentes del sector',
    queEs: 'Reunir informes de consultoras y artículos sobre la categoría del cliente.',
    quien: 'juntos', quienTexto: 'Claude busca y el equipo decide qué fuentes sirven.',
    necesita: 'El enfoque aprobado (1.0).',
    listoCuando: 'Hay suficientes fuentes y el equipo las revisó.',
    donde: 'plataforma',
  },
  {
    id: '2.2', etapa: 'contexto', titulo: 'Contexto del sector',
    queEs: 'Escribir el panorama del sector: cifras con fuente y año, qué lo mueve, cómo cambia el consumidor y sus retos.',
    quien: 'claude', quienTexto: 'Claude lo escribe y el equipo lo aprueba.',
    necesita: 'Las fuentes del paso 2.1.',
    listoCuando: 'Cada bloque está escrito y cada cifra dice de dónde sale.',
    donde: 'plataforma',
  },
  {
    id: '3.1', etapa: 'tendencias', titulo: 'Lista larga de tendencias',
    queEs: 'Encontrar las tendencias que afectan al sector, ordenadas en tres ejes: marca, estrategia y comunicación. Sumar lo que sirva de los landscapes que el estudio ya hizo en categorías parecidas.',
    quien: 'claude', quienTexto: 'Claude arma la lista desde el contexto, los informes y los landscapes anteriores del estudio.',
    necesita: 'El contexto aprobado (2.2).',
    listoCuando: 'Hay una lista larga de donde elegir.',
    donde: 'plataforma',
  },
  {
    id: '3.3', etapa: 'tendencias', titulo: 'Elegir 4 o 5 tendencias',
    queEs: 'Elegir las tendencias principales. Cada una se desarrolla en tres diapositivas: explicación, profundización y enfoques.',
    quien: 'equipo', quienTexto: 'El equipo elige acá. Claude las desarrolla después.',
    necesita: 'La lista larga (3.1).',
    listoCuando: 'Hay entre 4 y 5 tendencias elegidas.',
    donde: 'plataforma',
  },
  {
    id: '3.4', etapa: 'tendencias', titulo: 'Casos por tendencia',
    queEs: 'Buscar marcas que ya apliquen cada tendencia: marca, mercado, descripción corta, link e imagen.',
    quien: 'claude', quienTexto: 'Claude busca los casos y el equipo los lleva al deck.',
    necesita: 'Las tendencias elegidas (3.3).',
    listoCuando: 'Cada tendencia tiene sus casos de referencia.',
    donde: 'chat',
  },
  {
    id: '4.1', etapa: 'panorama', titulo: 'Benchmarking',
    queEs: 'Analizar referentes y competidores en cuatro ejes: logos, páginas web, redes sociales y experiencia de marca.',
    quien: 'juntos', quienTexto: 'Claude analiza y el equipo completa con capturas.',
    necesita: 'La lista de referentes y competidores (1.0).',
    listoCuando: 'Todas las marcas están cubiertas en los cuatro ejes.',
    donde: 'plataforma',
  },
  {
    id: '4.2', etapa: 'panorama', titulo: 'Brand assets',
    queEs: 'Comparar territorio, mensajes y claims de los 4 competidores principales que salieron del Taller.',
    quien: 'juntos', quienTexto: 'Claude arma el cuadro y el equipo lo revisa.',
    necesita: 'Los 4 competidores del Taller de propuesta de valor.',
    listoCuando: 'El cuadro de 4 competidores por 3 campos está completo.',
    donde: 'chat',
  },
  {
    id: '4.3', etapa: 'panorama', titulo: 'Círculo cromático',
    queEs: 'Ubicar los colores de competidores y referentes para ver qué espacios de color quedan libres.',
    quien: 'juntos', quienTexto: 'Claude saca los colores de los logos y el equipo lee los espacios libres.',
    necesita: 'Los logos del benchmarking (4.1).',
    listoCuando: 'El mapa está armado y el equipo escribió su lectura.',
    donde: 'chat',
  },
  {
    id: '5.1', etapa: 'diagnostico', titulo: 'Assets actuales',
    queEs: 'Analizar los assets que la marca tiene hoy y plantear si el proyecto es una evolución o una revolución.',
    quien: 'juntos', quienTexto: 'Claude lo analiza y el equipo lo aprueba. Solo aplica en rebranding.',
    necesita: 'Los assets vigentes de la marca.',
    listoCuando: 'El equipo aprueba el diagnóstico.',
    donde: 'plataforma',
  },
  {
    id: '6.0', etapa: 'entrega', titulo: 'Material de entrega',
    queEs: 'Lo que Claude haya preparado para la entrega, como el resumen para presentar. Sólo aparece si Claude guardó algo acá.',
    quien: 'claude', quienTexto: 'Claude lo prepara si se lo piden y el equipo lo aprueba.',
    necesita: 'El Landscape aprobado.',
    listoCuando: 'El equipo lo aprueba.',
    donde: 'plataforma',
    opcional: true,
  },
  {
    id: '6.1', etapa: 'entrega', titulo: 'Presentación al cliente',
    queEs: 'Presentar el deck al cliente, en persona u online, y anotar su feedback.',
    quien: 'equipo', quienTexto: 'Lo hace el equipo con el cliente.',
    necesita: 'El deck consolidado.',
    listoCuando: 'La sesión se hizo y el feedback quedó anotado.',
    donde: 'afuera',
  },
  {
    id: '6.2', etapa: 'entrega', titulo: 'Envío del archivo',
    queEs: 'Mandar al cliente el deck final, con los ajustes que salieron de la presentación.',
    quien: 'equipo', quienTexto: 'Lo hace el equipo, después de presentar.',
    necesita: 'La presentación hecha (6.1).',
    listoCuando: 'El cliente recibió el archivo.',
    donde: 'afuera',
  },
]

export const pasoPorId = (id: string): Paso | undefined => PASOS.find(p => p.id === id)

export const pasosDeEtapa = (etapa: StageKey): Paso[] => PASOS.filter(p => p.etapa === etapa)

/**
 * El link a un paso (`…/landscape?paso=2.1`) convertido al de su etapa
 * (`…/landscape?etapa=contexto`): la etapa es la pantalla, el paso es un renglón de ella.
 * Sin un paso real en el link, `undefined`.
 */
export function hrefDeSuEtapa(href: string): string | undefined {
  const id = /[?&]paso=([\d.]+)/.exec(href)?.[1]
  const paso = PASOS.find(p => p.id === id)
  return paso && href.replace(/\?.*$/, `?etapa=${paso.etapa}`)
}

export type EstadoPaso = 'hecho' | 'revisar' | 'pendiente' | 'no_aplica'

/** De quién es la pelota. Es lo primero que dice el panel. */
export type Turno = 'claude' | 'equipo' | 'revisar' | 'listo' | 'no_aplica'

/** Lo que el paso a paso necesita saber de una etapa. Sale de `landscapeState`. */
export interface EtapaParaPasos {
  stage: StageKey
  status: string
  /** El contenido vigente: la aprobada más nueva o, si no hay, el borrador. */
  contenido: unknown
  /** La vigente está aprobada y no llegó nada después. */
  cerrada: boolean
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function lleno(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0
  if (v && typeof v === 'object') return Object.keys(v).length > 0
  return typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null
}

/**
 * Si la etapa ya tiene lo que este paso produce. Solo aplica a los pasos de la plataforma:
 * los de chat y afuera se cierran con la marca del equipo.
 */
export function tieneContenido(paso: Paso, contenido: unknown): boolean {
  const c = obj(contenido)
  switch (paso.id) {
    case '2.1': return lleno(c.fuentes)
    case '2.2': return Object.keys(c).some(k => k !== 'fuentes' && lleno(c[k]))
    case '3.1': return lleno(c.candidatas)
    case '3.3': return Array.isArray(c.seleccionadas) && c.seleccionadas.length > 0
    default: return lleno(c)
  }
}

export interface PasoConEstado extends Paso {
  estado: EstadoPaso
  turno: Turno
}

/**
 * El estado de cada paso, en el orden del proceso.
 *
 * - Un paso de la plataforma está `hecho` cuando la etapa tiene lo suyo y está aprobada, y
 *   en `revisar` cuando lo tiene pero falta aprobar. Si no lo tiene, está `pendiente`.
 * - Un paso de chat o de afuera está `hecho` cuando el equipo lo marcó.
 * - Si la etapa no aplica (diagnóstico en una marca nueva), sus pasos tampoco.
 * - Un paso opcional sin contenido no aplica: no se cuenta ni se espera.
 */
export function estadoDePasos(etapas: EtapaParaPasos[], marcados: ReadonlySet<string>): PasoConEstado[] {
  const porEtapa = new Map(etapas.map(e => [e.stage, e]))
  return PASOS.map(paso => {
    const etapa = porEtapa.get(paso.etapa)
    let estado: EstadoPaso
    if (etapa?.status === 'no_aplica') estado = 'no_aplica'
    else if (paso.opcional && !(etapa && tieneContenido(paso, etapa.contenido))) estado = 'no_aplica'
    else if (paso.donde !== 'plataforma') estado = marcados.has(paso.id) ? 'hecho' : 'pendiente'
    else if (!etapa || !tieneContenido(paso, etapa.contenido)) estado = 'pendiente'
    // La lista larga no se aprueba sola: se cierra cuando el equipo elige sobre ella.
    else if (paso.id === '3.1') estado = 'hecho'
    else estado = etapa.cerrada ? 'hecho' : 'revisar'
    return { ...paso, estado, turno: turnoDe(paso, estado) }
  })
}

function turnoDe(paso: Paso, estado: EstadoPaso): Turno {
  if (estado === 'no_aplica') return 'no_aplica'
  if (estado === 'hecho') return 'listo'
  if (estado === 'revisar') return 'revisar'
  // Pendiente: si Claude puede empezarlo, la pelota es de Claude; si no, del equipo.
  return paso.quien === 'equipo' ? 'equipo' : 'claude'
}

/**
 * Lo que sigue en todo el Landscape: primero lo que espera revisión (el equipo es el
 * cuello de botella), si no, el primer paso que falta. Un trámite de afuera (la carpeta en
 * Dropbox) no frena el trabajo: queda marcado en su sección y sólo pasa adelante cuando no
 * queda otra cosa. Es lo mismo que dice el Sistema M&B.
 */
export function pasoQueSigue(pasos: PasoConEstado[]): PasoConEstado | undefined {
  const pendientes = pasos.filter(p => p.estado === 'pendiente')
  return pasos.find(p => p.estado === 'revisar')
    ?? pendientes.find(p => p.donde !== 'afuera')
    ?? pendientes[0]
}

/**
 * Lo que el equipo pega en el chat del proyecto en claude.ai. Una sola conversación sirve
 * para todo el Landscape: Claude lee en qué va con `estado_landscape`, así que el mensaje
 * sólo dice qué toca ahora y dónde dejarlo.
 */
export function mensajeParaSeguir(paso: Paso, proyecto: string): string {
  const donde = paso.donde === 'plataforma'
    ? 'Cuando termines, guárdalo en la plataforma.'
    : 'Este va acá en el chat, ordenado para pasarlo al deck.'
  return `Sigamos con el Landscape de ${proyecto}. Lo que sigue: ${paso.titulo.toLowerCase()}. ${paso.queEs} ${donde}`
}

/**
 * Lo mismo, dicho para Claude: lo devuelve `estado_landscape`, así que basta con escribirle
 * “sigamos con Heroica” para que sepa qué hacer y dónde guardarlo.
 */
export function queSigueParaClaude(pasos: PasoConEstado[], contexto: { conclusionesTaller?: boolean } = {}): string {
  const paso = pasoQueSigue(pasos)
  if (!paso) return 'El Landscape está completo: no queda nada pendiente.'
  if (paso.turno === 'revisar')
    return `El equipo tiene que revisar y aprobar ${STAGE_LABEL[paso.etapa]} en el panel. No sigas con lo próximo hasta que lo aprueben; si piden cambios, ajusta ese borrador.`
  if (paso.turno === 'equipo')
    return `Le toca al equipo: ${paso.titulo}. ${paso.queEs} Avísales que se hace desde el panel o por fuera, y espera.`
  const guardar = paso.donde === 'plataforma'
    ? `Cuando termines, guárdalo con guardar_etapa en la etapa "${paso.etapa}", sin borrar lo que esa etapa ya tenga.`
    : 'Esto no se guarda en la plataforma: entrégalo en el chat, ordenado para pasarlo al deck, y el equipo lo marca hecho en el panel.'
  // El brand assets sale de los 4 competidores del taller. Si nadie cargó las conclusiones,
  // no se frena: se piden o se parte del Enfoque.
  const insumo = paso.id === '4.2' && !contexto.conclusionesTaller
    ? ' Las conclusiones del taller no están cargadas: pregúntale al equipo cuáles son los 4 competidores principales (o pídeles el documento del taller y guárdalo con guardar_conclusiones_taller); si no los tienen, parte del set competitivo del Enfoque y dilo.'
    : ''
  return `${paso.titulo}: ${paso.queEs}${insumo} ${guardar}`
}
