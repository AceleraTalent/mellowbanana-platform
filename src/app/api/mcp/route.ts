import { z } from 'zod'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { db } from '@/lib/db/client'
import { verificarAccessToken } from '@/lib/oauth/store'
import { ErrorDeHerramienta } from '@/lib/mcp/errores'
import {
  listarProyectos, contextoProyecto, estadoLandscape, estadoEstrategia, guardarEtapa, guardarConclusionesTaller,
} from '@/lib/mcp/tools'
import { actualizarCliente, comentarCliente, verCliente } from '@/lib/mcp/clientes'

/**
 * Devuelve el error como resultado de herramienta y no como excepción: así Claude lo
 * lee y reintenta en el mismo turno, que es todo el punto de validar acá.
 */
async function responder(fn: () => Promise<unknown>) {
  try {
    return { content: [{ type: 'text' as const, text: JSON.stringify(await fn(), null, 2) }] }
  } catch (e) {
    if (e instanceof ErrorDeHerramienta)
      return { content: [{ type: 'text' as const, text: e.message }], isError: true }
    throw e
  }
}

const handler = createMcpHandler(
  server => {
    server.registerTool('listar_proyectos', {
      title: 'Listar proyectos',
      description:
        'Devuelve todos los clientes del estudio como están en el tablero (Sistema M&B): en qué ' +
        'fase va cada uno, qué sigue, quién lo lleva, la fecha de entrega y las notas, y si lleva ' +
        'su proceso por fuera de la plataforma. Para los que lo hacen acá, también cuántas ' +
        'entrevistas tienen y cuánto avanzó su landscape. Llamá a esto primero cuando la persona ' +
        'mencione una marca o pregunte por el trabajo del equipo ("¿qué tiene Lina?", "¿qué se ' +
        'vence esta semana?"), en vez de suponer.',
      inputSchema: z.object({}),
    }, async () => responder(() => listarProyectos(db)))

    server.registerTool('contexto_proyecto', {
      title: 'Contexto de un proyecto',
      description:
        'Trae todo el contexto de un proyecto, entero: la marca, las entrevistas con sus ' +
        'respuestas, la propuesta de valor, las conclusiones del taller si alguien las cargó, el ' +
        'estado del landscape y el de la estrategia, con ' +
        'el contenido de las etapas aprobadas de ambos y, aparte, el borrador que todavía espera ' +
        'aprobación (`borradorSinAprobar`). Llamá a esto al empezar a trabajar en un proyecto, ' +
        'antes de escribir nada, para no repetir lo que ya se decidió; y cuando pidan cambios ' +
        'sobre un borrador, para partir de él.',
      inputSchema: z.object({
        proyecto: z.string().describe('Nombre de la marca o id del proyecto'),
      }),
    }, async ({ proyecto }) => responder(() => contextoProyecto(db, proyecto)))

    server.registerTool('estado_landscape', {
      title: 'Estado del landscape',
      description:
        'Qué toca ahora en el landscape (`sigue`), qué etapa está en curso, cuál está aprobada, ' +
        'si hay un borrador esperando aprobación y qué bloquea el avance. Llamá a esto cuando te ' +
        'digan “sigamos” con una marca, o pregunten en qué va el landscape o qué falta, y hacé lo ' +
        'que dice `sigue`: el equipo trabaja todo el landscape en una sola conversación.',
      inputSchema: z.object({
        proyecto: z.string().describe('Nombre de la marca o id del proyecto'),
      }),
    }, async ({ proyecto }) => responder(() => estadoLandscape(db, proyecto)))

    server.registerTool('estado_estrategia', {
      title: 'Estado de la estrategia',
      description:
        'Qué toca ahora en el Proceso de Estrategia (`sigue`), qué etapa está en curso, cuál está ' +
        'aprobada, si hay un borrador esperando aprobación y qué bloquea el avance. Llamá a esto ' +
        'cuando te digan “sigamos con la estrategia” de una marca, o pregunten en qué va o qué ' +
        'falta, y hacé lo que dice `sigue`.',
      inputSchema: z.object({
        proyecto: z.string().describe('Nombre de la marca o id del proyecto'),
      }),
    }, async ({ proyecto }) => responder(() => estadoEstrategia(db, proyecto)))

    server.registerTool('actualizar_cliente', {
      title: 'Actualizar un cliente en el tablero',
      description:
        'Mueve, asigna y anota clientes en el Sistema M&B, el tablero del estudio (lo que antes ' +
        'llevaban en Notion). Usalo cuando el equipo te diga en qué va un cliente: "Viajero pasó a ' +
        'diseño", "Bon Bonite está esperando feedback", "Lina lleva Arbo", "la entrega de Glas es el ' +
        '30". Mandá sólo lo que cambia: lo que no mandes queda como estaba, y null borra. Con ' +
        'crear: true, si el cliente no existe lo crea como cliente por fuera (sin entrevistas ni ' +
        'Landscape en la plataforma); sin crear, un nombre que no existe es un error y te lista ' +
        'los que hay, para que no dupliques uno mal escrito. Cualquier cliente se mueve de fase; ' +
        'en uno que hace su proceso en la plataforma la fase queda puesta a mano, y con ' +
        'calcularSola: true vuelve a salir de lo que se aprobó. ' +
        'También le cambia el nombre (nombre) o lo pasa a llevarse por fuera o en la ' +
        'plataforma (porFuera). Para dejar constancia de algo que pasó ("el cliente aprobó la ' +
        'paleta"), usá comentar_cliente; las notas son lo que falta hoy. Al terminar, dale al ' +
        'equipo el link verEnElPanel.',
      inputSchema: z.object({
        cliente: z.string().describe('Nombre del cliente (como está en el panel) o su id'),
        crear: z.boolean().optional().describe('Crearlo como cliente por fuera si no existe'),
        fase: z.enum(['taller', 'landscape', 'estrategia', 'naming', 'diseno', 'terminado']).optional()
          .describe('La fase en la que va ahora: lo anterior queda terminado'),
        sinEmpezar: z.boolean().optional().describe('La fase a la que pasa todavía no arrancó'),
        frenado: z.enum(['no', 'cliente', 'pausa']).optional()
          .describe('"cliente" si espera algo del cliente, "pausa" si está en pausa, "no" para destrabarlo'),
        encargado: z.string().nullable().optional().describe('Quién o quiénes lo llevan'),
        fechaEntrega: z.string().nullable().optional().describe('AAAA-MM-DD'),
        notas: z.string().nullable().optional().describe('Lo que falta hoy; reemplaza la nota anterior'),
        nombre: z.string().optional().describe('Nombre nuevo, si hay que cambiarlo'),
        porFuera: z.boolean().optional()
          .describe('true si lleva su proceso por fuera de la plataforma; false si lo hace en la plataforma'),
        calcularSola: z.boolean().optional()
          .describe('Sólo clientes de la plataforma: que la fase deje de estar a mano y salga de lo aprobado'),
      }),
    }, async pedido => responder(() => actualizarCliente(db, pedido)))

    server.registerTool('ver_cliente', {
      title: 'Ver un cliente',
      description:
        'La ficha de un cliente: en qué fase va, cómo va (en curso, sin empezar, esperando al ' +
        'cliente, en pausa), quién lo lleva, la entrega, las notas, el último movimiento y los ' +
        'últimos comentarios del equipo. Usalo antes de contestar "¿cómo va X?" o de moverlo, ' +
        'para no pisar algo que el equipo ya anotó.',
      inputSchema: z.object({
        cliente: z.string().describe('Nombre del cliente (como está en el panel) o su id'),
      }),
    }, async ({ cliente }) => responder(() => verCliente(db, cliente)))

    server.registerTool('comentar_cliente', {
      title: 'Comentar un cliente',
      description:
        'Deja un comentario en la bitácora del cliente, con fecha: lo que pasó, lo que se decidió, ' +
        'lo que dijo el cliente ("aprobó la paleta", "pidió mover la entrega al 30"). Los ' +
        'comentarios no se editan ni se borran y el equipo los ve en el panel. Si sabés quién del ' +
        'equipo lo está diciendo, mandalo en autor. Si además cambia la fase, la entrega o lo que ' +
        'falta, usá también actualizar_cliente.',
      inputSchema: z.object({
        cliente: z.string().describe('Nombre del cliente (como está en el panel) o su id'),
        comentario: z.string().describe('El comentario, en una o dos frases claras'),
        autor: z.string().optional().describe('Quién del equipo lo dice, si lo sabés'),
      }),
    }, async pedido => responder(() => comentarCliente(db, pedido)))

    server.registerTool('guardar_conclusiones_taller', {
      title: 'Guardar las conclusiones del taller',
      description:
        'Guarda lo que volvió del taller en Miro (los 4 competidores principales, la propuesta ' +
        'ajustada, lo que se decidió) cuando el equipo te lo pasa en el chat. Es opcional: si no ' +
        'hay, se trabaja igual. Reemplaza lo que hubiera guardado antes.',
      inputSchema: z.object({
        proyecto: z.string().describe('Nombre de la marca o id del proyecto'),
        conclusiones: z.string().describe('El texto de las conclusiones, ordenado y completo'),
      }),
    }, async ({ proyecto, conclusiones }) => responder(() => guardarConclusionesTaller(db, { proyecto, conclusiones })))

    server.registerTool('guardar_etapa', {
      title: 'Guardar una etapa del proceso',
      description:
        'Guarda el resultado de una etapa en la plataforma. **Llamá a esto cada vez que termines ' +
        'de redactar una etapa**, sin esperar a que te lo pidan: si no la guardás, el trabajo se ' +
        'queda solo en este chat y no llega al panel del estudio. Siempre entra como borrador — ' +
        'vos nunca aprobás, el equipo aprueba desde el panel: al terminar, dales el link ' +
        '`verEnElPanel` para que lo revisen. Para la etapa "tendencias" mandá ' +
        'la long list completa en "candidatas", cada una con id, eje (Marca, Estrategia o ' +
        'Comunicación), titulo, descripcion y fuentes; no mandes "seleccionadas", que elegir las ' +
        '4 o 5 principales es decisión del equipo. Para las etapas de estrategia mandá fase: ' +
        '"estrategia"; las claves son las 14 del Proceso de Estrategia (diagnostico, consumidor, ' +
        'rtbs, concepto, beneficios, arquetipo, personalidad, valores, territorio, brand_ideal, ' +
        'ingredients, tagline, manifiesto, cuadros). Cada etapa de estrategia tiene su forma mínima: ' +
        'diagnostico es problema, insight, ventaja y diferenciales (lista); consumidor es metodologia ' +
        'y frases (lista); rtbs e ingredients son items (lista); concepto es concepto y racional; ' +
        'beneficios es funcionales y emocionales (listas); arquetipo es arquetipo y justificacion; ' +
        'personalidad es rasgos (lista); valores es items, lista de { valor, validacion }; territorio, ' +
        'brand_ideal, tagline y manifiesto son solo texto; cuadros es brandEssence y consumidor, cada ' +
        'uno un objeto de pares campo→texto. Los cuadros se llenan desde contenido aprobado. ' +
        'Las partes del deck del landscape van en su propia clave de etapa, sin fase: ' +
        '"tendencias-desarrollo" es { tendencias: [{ titulo, explicacion, profundizacion, enfoques }] }; ' +
        '"tendencias-casos" es { tendencias: [{ titulo, casos: [{ marca, mercado, descripcion, link, imagen }] }] }; ' +
        '"panorama-brand-assets" es { competidores: [{ marca, territorio, mensajes, claims }] }; ' +
        '"panorama-circulo" es { marcas: [{ marca, colores: ["#hex", …] }], lectura }.',
      inputSchema: z.object({
        proyecto: z.string().describe('Nombre de la marca o id del proyecto'),
        fase: z.enum(['landscape', 'estrategia']).default('landscape')
          .describe('A qué proceso pertenece la etapa'),
        etapa: z.string().describe('Clave de la etapa dentro de la fase'),
        contenido: z.record(z.string(), z.unknown()).describe('El resultado de la etapa, como objeto JSON'),
      }),
    }, async ({ proyecto, etapa, contenido, fase }) =>
      responder(() => guardarEtapa(db, { proyecto, etapa, contenido, fase })))
  },
  { serverInfo: { name: 'melo-banana', version: '1.0.0' } },
)

/**
 * Sin token válido la respuesta es 401 con `WWW-Authenticate` apuntando al documento
 * de recurso protegido — es lo único que le dice a Claude dónde descubrir el resto.
 * `withMcpAuth` arma ese header; nosotros solo decimos si el token sirve.
 */
async function verificar(_req: Request, bearer?: string) {
  if (!bearer) return undefined
  const info = await verificarAccessToken(db, bearer)
  if (!info) return undefined
  return { token: bearer, clientId: info.clientId, scopes: info.scope.split(' ') }
}

/**
 * Desde el protocolo 2026-07-28 el cliente abre su canal de avisos con un POST
 * `subscriptions/listen`, y el SDK lo deja abierto para siempre con un latido cada 15 s:
 * en Vercel eso termina cortado a los 5 minutos ("Task timed out", decenas por hora). Este
 * servidor nunca manda avisos —cada pedido trae su respuesta—, así que se contesta de una
 * que no hay nada que escuchar, antes de llegar al SDK.
 */
async function sinSuscripciones(req: Request) {
  if (req.method === 'POST') {
    const cuerpo = (await req.clone().json().catch(() => null)) as { id?: unknown; method?: unknown } | null
    if (req.headers.get('mcp-method') === 'subscriptions/listen' || cuerpo?.method === 'subscriptions/listen')
      return Response.json({
        jsonrpc: '2.0',
        id: cuerpo?.id ?? null,
        error: { code: -32601, message: 'Method not found: este servidor no envía notificaciones' },
      })
  }
  return handler(req)
}

const protegido = withMcpAuth(sinSuscripciones, verificar, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
})

// GET pasa por la autenticación (un 401 le dice al cliente dónde está el OAuth) y el SDK
// en modo sin estado lo contesta con 405: no hay canal de escucha.
export { protegido as GET, protegido as POST }
