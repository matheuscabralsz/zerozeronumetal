// The Durable Object `Room`: one object per room code (idFromName(code)). It runs the room
// rules (room-core.js) with real WebSockets (Hibernation API), keeps the room state in
// storage, and runs the deadlines (15 s come-back time, 10 min wait) with an alarm.
//
// Requests come only from the Pages Function (server/api.js), as WebSocket upgrades:
//   https://room/create?code=&name=&v=    409 when this code's room is already open
//   https://room/join?code=&v=[&token=]   refusals come as {t:'err'} on an accepted socket
// After every change the room tells the room list (the Durable Object `Lobby`) when what the list
// must show changed: 'open' (waits for player 2), 'busy' (full or started) or 'gone' (closed).
import { DurableObject } from 'cloudflare:workers'
import { RoomCore } from './room-core.js'
import { DEFAULT_NAME, ERR } from './protocol.js'
import { errorSocket } from './error-socket.js'
import { tellLobby } from './lobby-client.js'

const KEY = 'room'
const tag = (conn) => 'c' + conn

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.core = null // the open room, or null
    this.saved = null // the state JSON that is in storage now
    this.listed = null // what the room list was last told: 'open' | 'busy' | 'gone' | null
    ctx.blockConcurrencyWhile(async () => {
      const state = await ctx.storage.get(KEY)
      if (state) {
        this.core = new RoomCore(state)
        this.saved = JSON.stringify(state)
        this.listed = this.core.listing() // it was told before the object slept
      }
    })
  }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected a WebSocket', { status: 426 })
    }
    const url = new URL(request.url)
    const version = url.searchParams.get('v') ?? ''
    const now = Date.now()
    // A room whose time ran out (the alarm may not have run yet) is not open.
    if (this.core) {
      this.apply(this.core.tick(now))
      await this.save()
    }

    if (url.pathname === '/create') {
      if (this.core) return new Response('this room code is in use', { status: 409 })
      const code = url.searchParams.get('code')
      const name = url.searchParams.get('name') || DEFAULT_NAME
      const r = RoomCore.create({ code, name, version, token: crypto.randomUUID(), now })
      this.core = r.core
      return this.accept(r.conn, r.effects)
    }

    if (url.pathname === '/join') {
      if (!this.core) {
        // a stale entry in the room list: remove it
        await tellLobby(this.env, { id: url.searchParams.get('code'), state: 'gone' })
        return errorSocket(ERR.NOT_FOUND)
      }
      const token = url.searchParams.get('token')
      const r = this.core.join({ version, token, newToken: crypto.randomUUID(), now })
      if (r.reject) {
        this.apply(r.effects)
        await this.save()
        return errorSocket(r.reject)
      }
      return this.accept(r.conn, r.effects)
    }

    return new Response('not found', { status: 404 })
  }

  /** Accept the new socket as `conn`, then carry out the effects (its hello among them). */
  async accept(conn, effects) {
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server, [tag(conn)])
    server.serializeAttachment({ conn })
    this.apply(effects)
    await this.save()
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws, message) {
    const conn = ws.deserializeAttachment()?.conn
    if (conn == null || !this.core || typeof message !== 'string') return
    this.apply(this.core.receive(conn, message, Date.now()))
    await this.save()
  }

  async webSocketClose(ws) {
    try {
      ws.close(1000, 'bye') // finish the closing handshake (a no-op when the runtime already did)
    } catch {}
    await this.gone(ws)
  }

  async webSocketError(ws) {
    await this.gone(ws)
  }

  /** A socket closed without {t:'leave'}: a drop. */
  async gone(ws) {
    const conn = ws.deserializeAttachment()?.conn
    if (conn == null || !this.core) return
    this.apply(this.core.disconnect(conn, Date.now()))
    await this.save()
  }

  async alarm() {
    if (!this.core) return
    this.apply(this.core.tick(Date.now()))
    await this.save({ alarm: true })
  }

  /** Carry out the effects of the room rules on the sockets. */
  apply(effects) {
    for (const e of effects) {
      const conn = 'send' in e ? e.send : e.close
      for (const ws of this.ctx.getWebSockets(tag(conn))) {
        try {
          if ('send' in e) {
            ws.send(JSON.stringify(e.msg))
          } else {
            ws.serializeAttachment(null) // from now on this socket is not in the room
            ws.close(1000, 'bye')
          }
        } catch {
          // the socket is already gone; its close event does the rest
        }
      }
    }
  }

  /**
   * Store the room (see store()), then tell the room list when what it must show changed.
   * @param {{alarm?: boolean}} [o]
   */
  async save(o = {}) {
    const core = this.core
    await this.store(o)
    if (!core) return
    const listed = core.listing()
    if (listed === this.listed) return
    this.listed = listed
    const { code, name, createdAt } = core.state
    await tellLobby(this.env, { id: code, state: listed, name, at: createdAt })
  }

  /**
   * Write the room state when it changed and set the alarm to its next deadline. A closed room
   * keeps nothing: storage and alarm are deleted, so its code gives not_found.
   * @param {{alarm?: boolean}} [o] alarm: set the alarm again even when nothing changed
   */
  async store(o = {}) {
    const storage = this.ctx.storage
    if (this.core && !this.core.closed) {
      const json = JSON.stringify(this.core.state)
      if (json === this.saved && !o.alarm) return
      if (json !== this.saved) await storage.put(KEY, this.core.state)
      this.saved = json
      const next = this.core.nextDeadline()
      if (next == null) await storage.deleteAlarm()
      else await storage.setAlarm(next)
      return
    }
    const hadRoom = this.saved != null
    this.core = null
    this.saved = null
    if (hadRoom) {
      await storage.deleteAlarm()
      await storage.deleteAll()
    }
  }
}
