import { desc, eq } from 'drizzle-orm'
import { clienteComentarios } from './schema'
import { existeProyecto, ErrorDeValidacion, ErrorNoEncontrado, type AnyDb } from './store'

export interface Comentario {
  id: string
  autor: string
  texto: string
  desde: 'panel' | 'claude'
  cuando: Date
}

const LARGO_MAXIMO = 2000

/**
 * Agrega un comentario a la bitácora del cliente. No se editan ni se borran: son lo que
 * fue pasando, en el orden en que pasó.
 */
export async function agregarComentario(db: AnyDb, projectId: string, d: { autor: string; texto: string; desde: 'panel' | 'claude' }): Promise<Comentario> {
  const texto = (d.texto ?? '').trim()
  if (!texto) throw new ErrorDeValidacion('El comentario vino vacío')
  if (texto.length > LARGO_MAXIMO) throw new ErrorDeValidacion(`El comentario no puede pasar de ${LARGO_MAXIMO} caracteres`)
  const autor = (d.autor ?? '').trim().slice(0, 80) || (d.desde === 'claude' ? 'Claude' : 'Equipo M&B')
  if (!(await existeProyecto(db, projectId))) throw new ErrorNoEncontrado(`No existe el proyecto ${projectId}`)
  const [fila] = await db.insert(clienteComentarios).values({ projectId, autor, texto, desde: d.desde }).returning()
  return aComentario(fila as typeof clienteComentarios.$inferSelect)
}

/** Los comentarios de un cliente, del más nuevo al más viejo. */
export async function comentariosDe(db: AnyDb, projectId: string, limite = 50): Promise<Comentario[]> {
  const filas = (await db.select().from(clienteComentarios)
    .where(eq(clienteComentarios.projectId, projectId))
    .orderBy(desc(clienteComentarios.createdAt))
    .limit(limite)) as (typeof clienteComentarios.$inferSelect)[]
  return filas.map(aComentario)
}

function aComentario(f: typeof clienteComentarios.$inferSelect): Comentario {
  return { id: f.id, autor: f.autor, texto: f.texto, desde: f.desde === 'claude' ? 'claude' : 'panel', cuando: new Date(f.createdAt) }
}
