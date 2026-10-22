import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/client', async () => {
  const { makeTestDb } = await import('@/lib/db/testdb')
  return { db: await makeTestDb() }
})
// El token es de OAuth; acá sólo importa que el servidor lo acepte.
vi.mock('@/lib/oauth/store', () => ({
  verificarAccessToken: async (_db: unknown, t: string) => (t === 'bueno' ? { clientId: 'claude', scope: 'mcp' } : null),
}))

import { GET, POST } from './route'

let id = 0
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await POST(new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer bueno' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  }))
  const texto = await res.text()
  // Streamable HTTP puede contestar en SSE: el JSON va en la línea `data:`.
  const linea = texto.split('\n').find(l => l.startsWith('data:'))
  return { status: res.status, cuerpo: JSON.parse(linea ? linea.slice(5) : texto) }
}

describe('MCP · lo que ve Claude', () => {
  it('publica todas las herramientas, cada una con un esquema de entrada válido', async () => {
    const { status, cuerpo } = await rpc('tools/list')
    expect(status).toBe(200)
    const herramientas = cuerpo.result.tools as { name: string; inputSchema: { type: string } }[]
    if (process.env.MOSTRAR) console.log(JSON.stringify(herramientas.find(h => h.name === 'actualizar_cliente'), null, 1))
    expect(herramientas.map(h => h.name)).toEqual(expect.arrayContaining(['actualizar_cliente', 'ver_cliente', 'comentar_cliente']))
    for (const h of herramientas) expect(h.inputSchema.type).toBe('object')
  })
})

describe('MCP · sin conexiones colgadas', () => {
  // Lo que manda claude.ai con el protocolo 2026-07-28 para quedarse escuchando avisos.
  const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientInfo': { name: 'claude-ai', version: '1' }, 'io.modelcontextprotocol/clientCapabilities': {} }

  it('subscriptions/listen se contesta y se cierra de una: el servidor no manda avisos', async () => {
    const res = await POST(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer bueno',
        'mcp-protocol-version': '2026-07-28', 'mcp-method': 'subscriptions/listen',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'subscriptions/listen', params: { notifications: { toolsListChanged: true }, _meta: meta } }),
    }))
    const texto = await Promise.race([res.text(), new Promise<string>(r => setTimeout(() => r('SIGUE ABIERTO'), 2000))])
    expect(texto).not.toBe('SIGUE ABIERTO')
    expect(JSON.parse(texto)).toMatchObject({ id: 7, error: { code: -32601 } })
  })

  it('el GET de escucha pide token, y con token el SDK lo contesta con 405', async () => {
    expect((await GET(new Request('http://localhost/api/mcp', { headers: { accept: 'text/event-stream' } }))).status).toBe(401)
    expect((await GET(new Request('http://localhost/api/mcp', { headers: { accept: 'text/event-stream', authorization: 'Bearer bueno' } }))).status).toBe(405)
  })

  it('una herramienta del tablero responde de punta a punta', async () => {
    const { cuerpo } = await rpc('tools/call', { name: 'actualizar_cliente', arguments: { cliente: 'Viajero', crear: true, fase: 'diseno' } })
    expect(cuerpo.result.isError).toBeFalsy()
    const { cuerpo: ficha } = await rpc('tools/call', { name: 'ver_cliente', arguments: { cliente: 'Viajero' } })
    expect(JSON.parse(ficha.result.content[0].text)).toMatchObject({ cliente: 'Viajero', porFuera: true })
  })
})
