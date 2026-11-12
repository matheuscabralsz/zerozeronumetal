// Contract: an in-memory copy of the room server for tests. It must run the SAME room
// logic as the real server (the Durable Object), only the sockets and the clock are fake.
// The game tests (tests/multiplayer.integration.test.js) install it into each fake browser.

import { RoomCore } from './room-core.js'
import { LobbyCore } from './lobby-core.js'
import { ERR, normalizeCode } from './protocol.js'

const MAX_STEPS = 100_000 // deliver() stops with an error after this many steps

/**
 * @typedef {object} MemoryServer
 * @property {(win: Window) => typeof WebSocket} WebSocketFor
 *   A WebSocket class for one browser window. It behaves like the browser one:
 *   readyState (0 CONNECTING, 1 OPEN, 2 CLOSING, 3 CLOSED), onopen/onmessage/onclose/onerror
 *   and addEventListener, send(string), close(code?, reason?). Events are created with
 *   the window's own Event classes. URLs: wss://<any host>/api/room/new?v=..&name=.. and
 *   wss://<any host>/api/room/<ID>?v=..[&token=..] (see protocol.js).
 * @property {(win: Window) => typeof fetch} fetchFor
 *   A fetch for one browser window. GET /api/ping: 200 {"ok":true}. GET /api/rooms: 200
 *   {"rooms":[{id,name}]} (the room list, newest first). Both give 429 while limit(true), and a
 *   rejected promise (network error) while down(true) or offline(win, true).
 * @property {() => number} deliver
 *   Deliver every queued event and message, in order, in both directions (open, message,
 *   close). Returns how many were delivered. Nothing is delivered before this is called.
 * @property {(ms: number) => void} advance
 *   Move the fake clock forward and run the room deadlines (15 s come-back time, 10 min wait).
 * @property {() => number} now  the fake clock, in ms.
 * @property {(on: boolean) => void} down   the server can not be reached: new sockets fail
 *   (error + close, never open) and fetch rejects.
 * @property {(on: boolean) => void} limit  the daily limit is used up: /api/ping gives 429 and
 *   new sockets fail like down().
 * @property {(win: Window) => void} drop  cut every open socket of this window without a
 *   'leave' message, as when a phone loses the network (the server sees a drop).
 * @property {(win: Window, on: boolean) => void} offline  while on, this one window has no
 *   network: its open sockets are cut like drop(win) (the server sees a drop, no 'leave'),
 *   its new sockets fail (error + close, never open) and its fetch rejects.
 *   offline(win, false) gives the network back.
 * @property {() => Array<{code: string, name: string, started: boolean, slots: Array<null|'here'|'drop'>}>} rooms
 *   The rooms that exist (code = the hidden id), for checks.
 * @property {() => Array<{id: string, name: string}>} list  the room list, as /api/rooms gives it.
 * @property {() => number} connections  how many sockets were ever opened (for "does NOT connect").
 * @property {() => number} listAsks  how many times /api/rooms was asked for.
 *
 * Timing: what a browser sends (connect, messages, its own close) reaches the server only in
 * deliver(), in order. drop(), offline(win, true) and advance() act on the server at once,
 * at the current fake time; what the server sends because of them waits for deliver().
 * A cut socket loses what was still on the way to or from it (it gets error + close 1006).
 */

/**
 * @param {object} [o]
 * @param {() => number} [o.random=Math.random]  used for room codes and tokens
 * @returns {MemoryServer}
 */
export function createMemoryServer(o = {}) {
  const random = o.random ?? Math.random
  let clock = 0
  let isDown = false
  let isLimit = false
  let opened = 0
  let listAsks = 0
  const lobby = new LobbyCore() // the room list, like the Durable Object `Lobby`
  const rooms = new Map() // code -> {core: RoomCore, links: Map<conn, socket>, listed: string}
  const queue = [] // steps for deliver(); each returns false when it had nothing to deliver
  const classes = new WeakMap() // window -> its WebSocket class
  const meta = new WeakMap() // socket -> {win, link: {room, conn}|null, cut, aborted}
  const byWindow = new WeakMap() // window -> Set of its sockets
  const offlineWindows = new WeakSet()

  // --- the browser side ---

  function fire(ws, type, init) {
    const { win } = meta.get(ws)
    const Ev = type === 'message' ? win.MessageEvent : type === 'close' ? win.CloseEvent : win.Event
    ws.dispatchEvent(new Ev(type, init))
  }

  function classFor(win) {
    class WebSocket extends win.EventTarget {
      constructor(url) {
        super()
        let parsed
        try {
          parsed = new URL(String(url), win.location.href)
        } catch {
          throw new win.DOMException(`The URL '${url}' is invalid.`, 'SyntaxError')
        }
        this.url = String(url)
        this.readyState = 0
        this.protocol = ''
        this.extensions = ''
        this.bufferedAmount = 0
        this.binaryType = 'blob'
        for (const type of ['open', 'message', 'error', 'close']) {
          this['on' + type] = null
          this.addEventListener(type, (e) => this['on' + type]?.call(this, e))
        }
        meta.set(this, { win, link: null, cut: false, aborted: false })
        if (!byWindow.has(win)) byWindow.set(win, new Set())
        byWindow.get(win).add(this)
        opened++
        queue.push(() => serverConnect(this, parsed))
      }

      send(data) {
        if (this.readyState === 0) throw new win.DOMException('Still in CONNECTING state.', 'InvalidStateError')
        if (this.readyState !== 1) return
        const text = String(data)
        queue.push(() => serverReceive(this, text))
      }

      close(code = 1000, reason = '') {
        if (this.readyState >= 2) return
        const wasOpen = this.readyState === 1
        this.readyState = 2
        if (!wasOpen) return abort(this)
        queue.push(() => {
          serverGone(this)
          return true
        })
        queue.push(() => toClientClose(this, code, reason, true))
      }
    }
    for (const [name, n] of [['CONNECTING', 0], ['OPEN', 1], ['CLOSING', 2], ['CLOSED', 3]]) {
      Object.defineProperty(WebSocket, name, { value: n })
      Object.defineProperty(WebSocket.prototype, name, { value: n })
    }
    return WebSocket
  }

  /** close() while connecting: the socket never opens (error + close 1006). */
  function abort(ws) {
    const m = meta.get(ws)
    m.aborted = true
    if (m.link) cut(ws)
  }

  /** The connection is lost: the server sees a drop now, the browser gets error + close 1006. */
  function cut(ws) {
    const m = meta.get(ws)
    if (m.cut || ws.readyState === 3) return
    m.cut = true
    serverGone(ws)
    queue.push(() => fail(ws))
  }

  function fail(ws) {
    ws.readyState = 3
    fire(ws, 'error')
    fire(ws, 'close', { code: 1006, reason: '', wasClean: false })
    return true
  }

  function toClientOpen(ws) {
    if (ws.readyState !== 0 || meta.get(ws).cut) return false
    ws.readyState = 1
    fire(ws, 'open')
    return true
  }

  function toClientMessage(ws, text) {
    if (ws.readyState !== 1 || meta.get(ws).cut) return false
    fire(ws, 'message', { data: text })
    return true
  }

  function toClientClose(ws, code, reason, wasClean) {
    if (ws.readyState === 3 || meta.get(ws).cut) return false
    ws.readyState = 3
    fire(ws, 'close', { code, reason, wasClean })
    return true
  }

  // --- the server side: the same rules as the Durable Object (server/room-do.js) ---

  function newToken() {
    let t = ''
    for (let i = 0; i < 24; i++) t += Math.floor(random() * 36).toString(36)
    return t
  }

  function serverConnect(ws, url) {
    const m = meta.get(ws)
    if (m.cut) return false // fail() is already on its way
    if (m.aborted || isDown || isLimit || offlineWindows.has(m.win)) return fail(ws)
    const v = url.searchParams.get('v') ?? ''
    const path = url.pathname.match(/^\/api\/room\/([^/]*)$/)
    if (!path) return fail(ws) // the real server answers 404: the handshake fails
    if (path[1] === 'new') return create(ws, v, url.searchParams.get('name') ?? '')
    return join(ws, path[1], v, url.searchParams.get('token'))
  }

  function create(ws, version, typedName) {
    let made
    try {
      made = lobby.create({ name: typedName, now: clock, random })
    } catch {
      return fail(ws) // no free id: the real server answers 503
    }
    const code = made.id
    const { core, conn, effects } = RoomCore.create({ code, name: made.name, version, token: newToken(), now: clock })
    const room = { core, links: new Map(), listed: null }
    rooms.set(code, room)
    attach(ws, room, conn)
    apply(room, effects)
    return true
  }

  function join(ws, typed, version, token) {
    const code = normalizeCode(typed)
    const room = rooms.get(code)
    if (!room) {
      if (code) lobby.set({ id: code, state: 'gone' }) // like the Durable Object: heal a stale list
      return reject(ws, ERR.NOT_FOUND)
    }
    const r = room.core.join({ version, token, newToken: newToken(), now: clock })
    if (r.conn != null) attach(ws, room, r.conn)
    apply(room, r.effects)
    if (r.reject) reject(ws, r.reject)
    return true
  }

  /** Like the real server: accept the socket, send {t:'err'}, close it. */
  function reject(ws, code) {
    const text = JSON.stringify({ t: 'err', code })
    queue.push(() => toClientOpen(ws))
    queue.push(() => toClientMessage(ws, text))
    queue.push(() => toClientClose(ws, 1000, code, true))
    return true
  }

  function attach(ws, room, conn) {
    room.links.set(conn, ws)
    meta.get(ws).link = { room, conn }
    queue.push(() => toClientOpen(ws))
  }

  /** Carry out the effects of the room rules (sends and closes reach the browser in deliver()). */
  function apply(room, effects) {
    for (const e of effects) {
      const conn = 'send' in e ? e.send : e.close
      const ws = room.links.get(conn)
      if (!ws) continue
      if ('send' in e) {
        const text = JSON.stringify(e.msg)
        queue.push(() => toClientMessage(ws, text))
      } else {
        unlink(ws)
        queue.push(() => toClientClose(ws, 1000, '', true))
      }
    }
    if (room.core.closed) {
      for (const ws of room.links.values()) unlink(ws)
      rooms.delete(room.core.state.code)
    }
    // tell the room list, like the Durable Object `Room` does
    const listed = room.core.listing()
    if (listed !== room.listed) {
      room.listed = listed
      const { code, name, createdAt } = room.core.state
      lobby.set({ id: code, state: listed, name, at: createdAt })
    }
  }

  function unlink(ws) {
    const m = meta.get(ws)
    if (!m.link) return null
    const link = m.link
    link.room.links.delete(link.conn)
    m.link = null
    return link
  }

  function serverReceive(ws, text) {
    const link = meta.get(ws).link
    if (!link) return false
    apply(link.room, link.room.core.receive(link.conn, text, clock))
    return true
  }

  /** The socket closed or was cut without 'leave': a drop. */
  function serverGone(ws) {
    const link = unlink(ws)
    if (link) apply(link.room, link.room.core.disconnect(link.conn, clock))
  }

  // --- the API for tests ---

  function drop(win) {
    for (const ws of byWindow.get(win) ?? []) {
      if (ws.readyState === 3) byWindow.get(win).delete(ws)
      else cut(ws)
    }
  }

  function fetchFor(win) {
    return async function fetch(input) {
      const url = new URL(typeof input === 'string' ? input : (input?.url ?? String(input)), win.location.href)
      if (url.pathname === '/api/rooms') listAsks++
      if (isDown || offlineWindows.has(win)) throw new (win.TypeError ?? TypeError)('Failed to fetch')
      if (url.pathname !== '/api/ping' && url.pathname !== '/api/rooms') return new Response('not found', { status: 404 })
      if (isLimit) return new Response('daily limit', { status: 429 })
      const body = url.pathname === '/api/ping' ? { ok: true } : { rooms: lobby.list(clock) }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      })
    }
  }

  return {
    WebSocketFor(win) {
      if (!classes.has(win)) classes.set(win, classFor(win))
      return classes.get(win)
    },
    fetchFor,
    deliver() {
      let delivered = 0
      let head = 0
      try {
        while (head < queue.length) {
          if (head >= MAX_STEPS) throw new Error('memory server: deliver() never ends (messages keep coming)')
          if (queue[head++]() !== false) delivered++
        }
      } finally {
        queue.splice(0, head)
      }
      return delivered
    },
    advance(ms) {
      clock += ms
      for (const room of [...rooms.values()]) apply(room, room.core.tick(clock))
    },
    now: () => clock,
    down(on) {
      isDown = !!on
    },
    limit(on) {
      isLimit = !!on
    },
    drop,
    offline(win, on) {
      if (on) {
        offlineWindows.add(win)
        drop(win)
      } else {
        offlineWindows.delete(win)
      }
    },
    rooms: () => [...rooms.values()].map((r) => r.core.summary()),
    list: () => lobby.list(clock),
    listAsks: () => listAsks,
    connections: () => opened, // every new WebSocket(), also the ones that failed
  }
}
