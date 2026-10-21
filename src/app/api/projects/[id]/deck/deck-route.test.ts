import { describe, it, expect, vi } from 'vitest'

const { buildProjectDeckView } = vi.hoisted(() => ({ buildProjectDeckView: vi.fn(async () => null) }))
vi.mock('@/lib/deck/service', () => ({ buildProjectDeckView }))

import { GET } from './route'
import { cookieDeSesion } from '@/lib/admin/sesion-de-prueba'

const pedido = (headers: Record<string, string> = {}) =>
  GET(new Request('http://localhost/api/projects/p1/deck', { headers }), { params: Promise.resolve({ id: 'p1' }) })

describe('GET /api/projects/[id]/deck', () => {
  it('sin sesión es 401 y no arma nada: el deck lleva lo que dijeron los clientes', async () => {
    cookieDeSesion()
    const res = await pedido()
    expect(res.status).toBe(401)
    expect(buildProjectDeckView).not.toHaveBeenCalled()
  })

  it('con sesión lo arma (acá no hay entregable: 404)', async () => {
    const res = await pedido(cookieDeSesion())
    expect(res.status).toBe(404)
    expect(buildProjectDeckView).toHaveBeenCalledWith('p1')
  })
})
