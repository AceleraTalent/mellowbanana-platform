import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  const db = await makeTestDb()
  return { db }
})

import { POST } from './[stage]/route'
import { db } from '@/lib/db/client'
import { cookieDeSesion } from '@/lib/admin/sesion-de-prueba'
import {
  findOrCreateProject, saveLandscapeVersion, approveLandscapeVersion, landscapeState, listLandscapeVersions,
} from '@/lib/db/store'

let contador = 0
let projectId: string
beforeEach(async () => { projectId = (await findOrCreateProject(db, `Marca ${contador++}`)).id })

function post(id: string, stage: string, body: unknown, conSesion = true) {
  return POST(
    new Request(`http://localhost/api/projects/${id}/landscape/${stage}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(conSesion ? cookieDeSesion() : {}) },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id, stage }) },
  )
}

describe('POST /api/projects/[id]/landscape/[stage] — aprobar', () => {
  it('con versionId inexistente devuelve 404, no 500', async () => {
    const res = await post(projectId, 'contexto', {
      accion: 'aprobar', versionId: '00000000-0000-4000-8000-000000000000',
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/projects/[id]/landscape/[stage] — reafirmar', () => {
  /** Etapa aprobada, y encima un borrador que llegó después. */
  async function conConflicto() {
    const v = await saveLandscapeVersion(db, projectId, 'contexto', { content: { v: 1 }, author: 'claude' })
    await approveLandscapeVersion(db, v.id, { projectId, stage: 'contexto' })
    await saveLandscapeVersion(db, projectId, 'contexto', { content: { v: 2 }, author: 'claude' })
  }

  it('ratifica la vigente y la etapa deja de tener borrador pendiente', async () => {
    await conConflicto()
    const res = await post(projectId, 'contexto', { accion: 'reafirmar', autor: 'Flor' })
    expect(res.status).toBe(200)

    const { reafirmada, version } = await res.json()
    expect(reafirmada).toBe(true)
    expect(version.approvedAt).not.toBeNull()
    expect(version.authorLabel).toBe('Flor')

    const etapa = (await landscapeState(db, projectId)).find(e => e.stage === 'contexto')!
    expect(etapa.borradorNuevo).toBeNull()
    expect(etapa.actual!.content).toEqual({ v: 1 })
  })

  it('sin conflicto responde que no ratificó nada, sin escribir', async () => {
    const res = await post(projectId, 'contexto', { accion: 'reafirmar' })
    expect(res.status).toBe(200)
    expect((await res.json()).reafirmada).toBe(false)
    expect((await landscapeState(db, projectId)).find(e => e.stage === 'contexto')!.versiones).toBe(0)
  })

  it('con un proyecto que no existe devuelve 404, no 500', async () => {
    const res = await post('00000000-0000-4000-8000-000000000000', 'contexto', { accion: 'reafirmar' })
    expect(res.status).toBe(404)
  })

  it('con una etapa desconocida devuelve 400', async () => {
    const res = await post(projectId, 'inventada', { accion: 'reafirmar' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/projects/[id]/landscape/[stage] — sesión', () => {
  it('sin sesión es 401 y no aprueba nada', async () => {
    const v = await saveLandscapeVersion(db, projectId, 'contexto', { content: { v: 1 }, author: 'claude' })
    const res = await post(projectId, 'contexto', { accion: 'aprobar', versionId: v.id }, false)
    expect(res.status).toBe(401)
    expect((await listLandscapeVersions(db, projectId, 'contexto'))[0].approvedAt).toBeNull()
  })

  it('sin sesión tampoco se puede escribir contenido', async () => {
    const res = await post(projectId, 'contexto', { accion: 'guardar', content: { v: 1 } }, false)
    expect(res.status).toBe(401)
    expect(await listLandscapeVersions(db, projectId, 'contexto')).toHaveLength(0)
  })
})

describe('POST /api/projects/[id]/landscape/[stage] — no aplica', () => {
  const estadoDe = async (stage: string) => (await landscapeState(db, projectId)).find(e => e.stage === stage)!.status

  it('el Diagnóstico se marca como que no aplica, y al reactivarlo vuelve como venía', async () => {
    expect((await post(projectId, 'diagnostico', { accion: 'no-aplica', noAplica: true })).status).toBe(200)
    expect(await estadoDe('diagnostico')).toBe('no_aplica')

    expect((await post(projectId, 'diagnostico', { accion: 'no-aplica', noAplica: false })).status).toBe(200)
    expect(await estadoDe('diagnostico')).toBe('pendiente')
  })

  it('reactivar una etapa con algo aprobado la deja aprobada', async () => {
    const v = await saveLandscapeVersion(db, projectId, 'diagnostico', { content: { r: 1 }, author: 'claude' })
    await approveLandscapeVersion(db, v.id, { projectId, stage: 'diagnostico' })
    await post(projectId, 'diagnostico', { accion: 'no-aplica', noAplica: true })
    await post(projectId, 'diagnostico', { accion: 'no-aplica', noAplica: false })
    expect(await estadoDe('diagnostico')).toBe('aprobada')
  })

  it('las etapas que siempre aplican no se pueden marcar', async () => {
    const res = await post(projectId, 'contexto', { accion: 'no-aplica', noAplica: true })
    expect(res.status).toBe(400)
    expect(await estadoDe('contexto')).toBe('pendiente')
  })
})
