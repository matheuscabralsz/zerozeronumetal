// The Durable Object `Lobby`: ONE object (idFromName('lobby')) that keeps the room list
// (lobby-core.js) in storage. It holds no sockets; the Pages Function and the rooms call it:
//   POST https://lobby/reserve {id, name}           200 {id, name} (final name) | 409 id in use
//   POST https://lobby/set {id, state, name?, at?}  204   a room tells its state (open|busy|gone)
//   GET  https://lobby/list                         200 {rooms:[{id, name}]} newest first
import { DurableObject } from 'cloudflare:workers'
import { LobbyCore } from './lobby-core.js'

const KEY = 'lobby'

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.core = new LobbyCore()
    ctx.blockConcurrencyWhile(async () => {
      const state = await ctx.storage.get(KEY)
      if (state) this.core = new LobbyCore(state)
    })
  }

  async fetch(request) {
    const url = new URL(request.url)
    const now = Date.now()
    if (request.method === 'GET' && url.pathname === '/list') {
      const before = JSON.stringify(this.core.state)
      const rooms = this.core.list(now)
      if (JSON.stringify(this.core.state) !== before) await this.save()
      return Response.json({ rooms })
    }
    if (request.method !== 'POST') return new Response('not found', { status: 404 })
    let body
    try {
      body = await request.json()
    } catch {
      return new Response('bad request', { status: 400 })
    }
    if (url.pathname === '/reserve') {
      const made = this.core.reserve({ id: String(body.id), name: body.name, now })
      if (!made) return new Response('id in use', { status: 409 })
      await this.save()
      return Response.json(made)
    }
    if (url.pathname === '/set') {
      this.core.set({ id: String(body.id), state: body.state, name: body.name, at: body.at })
      await this.save()
      return new Response(null, { status: 204 })
    }
    return new Response('not found', { status: 404 })
  }

  async save() {
    await this.ctx.storage.put(KEY, this.core.state)
  }
}
