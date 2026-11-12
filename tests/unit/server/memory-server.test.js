import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { createMemoryServer } from '../../../server/memory-server.js'
import { DROP_GRACE_MS, ERR, WAIT_ROOM_MS, normalizeCode } from '../../../server/protocol.js'
import { NEW_TTL_MS } from '../../../server/lobby-core.js'

const HOST = 'wss://zerozeronumetal.pages.dev'

function makeWindow() {
  return new JSDOM('', { url: 'https://zerozeronumetal.pages.dev/', runScripts: 'outside-only' }).window
}

// A socket whose events are written into `log`: 'open', 'error', ['close', code] or the parsed message.
function connect(server, win, path) {
  const WS = server.WebSocketFor(win)
  const ws = new WS(HOST + path)
  const log = []
  ws.onopen = () => log.push('open')
  ws.onmessage = (e) => log.push(JSON.parse(e.data))
  ws.onerror = () => log.push('error')
  ws.onclose = (e) => log.push(['close', e.code])
  return { ws, log, send: (m) => ws.send(JSON.stringify(m)) }
}

// A room with a host already in it (delivered).
function hostRoom(server = createMemoryServer()) {
  const hostWin = makeWindow()
  const host = connect(server, hostWin, '/api/room/new?v=1')
  server.deliver()
  return { server, hostWin, host, code: host.log[1].code, token: host.log[1].token }
}

describe('memory server: /api/ping', () => {
  it('answers 200 {ok:true}', async () => {
    const server = createMemoryServer()
    const fetch = server.fetchFor(makeWindow())
    const res = await fetch('/api/ping')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect((await fetch('https://zerozeronumetal.pages.dev/api/ping')).status).toBe(200)
  })

  it('answers 429 while limit(true), and 200 again after limit(false)', async () => {
    const server = createMemoryServer()
    const fetch = server.fetchFor(makeWindow())
    server.limit(true)
    expect((await fetch('/api/ping')).status).toBe(429)
    server.limit(false)
    expect((await fetch('/api/ping')).status).toBe(200)
  })

  it('rejects (network error, a TypeError of the window) while down(true)', async () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const fetch = server.fetchFor(win)
    server.down(true)
    await expect(fetch('/api/ping')).rejects.toBeInstanceOf(win.TypeError)
    server.down(false)
    expect((await fetch('/api/ping')).status).toBe(200)
  })

  it('serves nothing else (404)', async () => {
    const server = createMemoryServer()
    expect((await server.fetchFor(makeWindow())('/api/other')).status).toBe(404)
  })
})

describe('memory server: creating a room', () => {
  it('nothing happens before deliver(); then the creator gets open and hello as slot 0', () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const host = connect(server, win, '/api/room/new?v=1')
    expect(host.ws.readyState).toBe(0)
    expect(server.connections()).toBe(1)
    expect(server.rooms()).toEqual([])
    expect(host.log).toEqual([])

    expect(server.deliver()).toBeGreaterThan(0)
    expect(host.ws.readyState).toBe(1)
    expect(host.log[0]).toBe('open')
    const hello = host.log[1]
    expect(hello).toMatchObject({ t: 'hello', slot: 0, peer: 'none', started: false })
    expect(normalizeCode(hello.code)).toBe(hello.code)
    expect(typeof hello.token).toBe('string')
    expect(hello.token.length).toBeGreaterThan(8)
    expect(server.rooms()).toEqual([{ code: hello.code, name: 'SALA', started: false, slots: ['here', null] }])
    expect(server.deliver()).toBe(0)
  })

  it('events are made with the window\'s own classes, and addEventListener works too', () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const WS = server.WebSocketFor(win)
    expect(server.WebSocketFor(win)).toBe(WS)
    expect([WS.CONNECTING, WS.OPEN, WS.CLOSING, WS.CLOSED]).toEqual([0, 1, 2, 3])
    const ws = new WS(HOST + '/api/room/new?v=1')
    expect(ws.OPEN).toBe(1)
    expect(ws.url).toBe(HOST + '/api/room/new?v=1')
    const events = []
    ws.addEventListener('open', (e) => events.push(e))
    ws.addEventListener('message', (e) => events.push(e))
    server.deliver()
    expect(events[0]).toBeInstanceOf(win.Event)
    expect(events[0].type).toBe('open')
    expect(events[1]).toBeInstanceOf(win.MessageEvent)
    expect(events[1].target).toBe(ws)
    expect(typeof events[1].data).toBe('string')
  })

  it('a room code is unique among open rooms, also when the random numbers repeat', () => {
    const values = [0, 0, 0, 0] // the first code: CCCC
    let i = 0
    const random = () => (i < values.length ? values[i++] : (i++ % 7) / 7)
    const server = createMemoryServer({ random })
    const a = hostRoom(server)
    i = 0 // the second room is offered CCCC first again
    const b = hostRoom(server)
    expect(a.code).toBe('CCCC')
    expect(b.code).not.toBe('CCCC')
    expect(server.rooms().map((r) => r.code).sort()).toEqual([a.code, b.code].sort())
  })
})

describe('memory server: joining, messages and leaving', () => {
  it('a friend joins with the code in lower case as slot 1; the host gets peer join', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code.toLowerCase()}?v=1`)
    server.deliver()
    expect(guest.log).toEqual(['open', expect.objectContaining({ t: 'hello', code, slot: 1, peer: 'here', started: false })])
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'join' })
    expect(server.rooms()).toEqual([{ code, name: 'SALA', started: false, slots: ['here', 'here'] }])
  })

  it('game messages go to the other player in order, only after deliver()', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    host.send({ t: 'm', d: 1 })
    host.send({ t: 'm', d: 2 })
    guest.send({ t: 'm', d: 'x' })
    expect(guest.log).toHaveLength(2)
    server.deliver()
    expect(guest.log.slice(2)).toEqual([{ t: 'm', d: 1 }, { t: 'm', d: 2 }])
    expect(host.log.at(-1)).toEqual({ t: 'm', d: 'x' })
  })

  it('an unknown or invalid code opens, gets err not_found, is closed, and makes NO room', () => {
    const { server } = hostRoom()
    for (const path of ['/api/room/WWWW?v=1', '/api/room/ab?v=1', '/api/room/AAAA?v=1']) {
      const s = connect(server, makeWindow(), path)
      server.deliver()
      expect(s.log).toEqual(['open', { t: 'err', code: ERR.NOT_FOUND }, ['close', 1000]])
    }
    expect(server.rooms()).toHaveLength(1)
  })

  it('a third person gets err full; another version gets err version', () => {
    const { server, code } = hostRoom()
    connect(server, makeWindow(), `/api/room/${code}?v=1`)
    const other = connect(server, makeWindow(), `/api/room/${code}?v=2`)
    server.deliver()
    expect(other.log).toEqual(['open', { t: 'err', code: ERR.VERSION }, ['close', 1000]])
    const third = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    expect(third.log).toEqual(['open', { t: 'err', code: ERR.FULL }, ['close', 1000]])
  })

  it('player 2 leaving before the start: its socket is closed, the host gets leave, the code works again', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    guest.send({ t: 'leave' })
    server.deliver()
    expect(guest.log.at(-1)).toEqual(['close', 1000])
    expect(guest.ws.readyState).toBe(3)
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'leave' })
    expect(server.rooms()[0].slots).toEqual(['here', null])
    const again = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    expect(again.log[1]).toMatchObject({ t: 'hello', slot: 1 })
  })

  it('the host leaving before the start closes the room: player 2 gets closed host_left and the code is gone', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    host.send({ t: 'leave' })
    server.deliver()
    expect(guest.log.slice(-2)).toEqual([{ t: 'closed', why: 'host_left' }, ['close', 1000]])
    expect(host.log.at(-1)).toEqual(['close', 1000])
    expect(server.rooms()).toEqual([])
    const late = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    expect(late.log[1]).toEqual({ t: 'err', code: ERR.NOT_FOUND })
  })

  it('after start, a new person gets err started, also after player 2 has left', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    host.send({ t: 'start' })
    guest.send({ t: 'leave' })
    server.deliver()
    expect(server.rooms()).toEqual([{ code, name: 'SALA', started: true, slots: ['here', null] }])
    const late = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    expect(late.log[1]).toEqual({ t: 'err', code: ERR.STARTED })
  })
})

describe('memory server: drops, the clock, and no network', () => {
  function twoPlayers() {
    const r = hostRoom()
    r.guestWin = makeWindow()
    r.guest = connect(r.server, r.guestWin, `/api/room/${r.code}?v=1`)
    r.server.deliver()
    r.guestToken = r.guest.log[1].token
    return r
  }

  it('drop(win): the server sees a drop at once (no leave); the browser gets error + close 1006 in deliver()', () => {
    const { server, host, guest, guestWin } = twoPlayers()
    server.drop(guestWin)
    expect(server.rooms()[0].slots).toEqual(['here', 'drop'])
    expect(guest.ws.readyState).toBe(1)
    server.deliver()
    expect(guest.log.slice(-2)).toEqual(['error', ['close', 1006]])
    expect(guest.ws.readyState).toBe(3)
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'drop' })
  })

  it('a dropped player comes back with its token within 15 s; the other gets back', () => {
    const { server, host, code, guestWin, guestToken } = twoPlayers()
    server.drop(guestWin)
    server.advance(DROP_GRACE_MS - 1)
    const back = connect(server, guestWin, `/api/room/${code}?v=1&token=${guestToken}`)
    server.deliver()
    expect(back.log).toEqual(['open', { t: 'hello', code, name: 'SALA', slot: 1, token: guestToken, peer: 'here', started: false }])
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'back' })
  })

  it('advance() runs the deadlines: after 15 s the host gets leave and the token gives err expired', () => {
    const { server, host, code, guestWin, guestToken } = twoPlayers()
    server.drop(guestWin)
    server.deliver()
    server.advance(DROP_GRACE_MS)
    expect(server.now()).toBe(DROP_GRACE_MS)
    expect(server.rooms()[0].slots).toEqual(['here', null])
    server.deliver()
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'leave' })
    const late = connect(server, guestWin, `/api/room/${code}?v=1&token=${guestToken}`)
    server.deliver()
    expect(late.log[1]).toEqual({ t: 'err', code: ERR.EXPIRED })
  })

  it('waiting room: the host may be away up to 10 min; then the room closes', () => {
    const { server, hostWin, code, token } = hostRoom()
    server.drop(hostWin)
    server.advance(WAIT_ROOM_MS - 1)
    expect(server.rooms()).toHaveLength(1)
    server.advance(1)
    expect(server.rooms()).toEqual([])
    const late = connect(server, hostWin, `/api/room/${code}?v=1&token=${token}`)
    server.deliver()
    expect(late.log[1]).toEqual({ t: 'err', code: ERR.NOT_FOUND })
  })

  it('down(true): new sockets fail with error + close and never open; down(false) works again', () => {
    const server = createMemoryServer()
    server.down(true)
    const s = connect(server, makeWindow(), '/api/room/new?v=1')
    server.deliver()
    expect(s.log).toEqual(['error', ['close', 1006]])
    expect(server.rooms()).toEqual([])
    expect(server.connections()).toBe(1)
    server.down(false)
    const t = connect(server, makeWindow(), '/api/room/new?v=1')
    server.deliver()
    expect(t.log[0]).toBe('open')
  })

  it('down(true) does not cut sockets that are already open', () => {
    const { server, host, guest } = twoPlayers()
    server.down(true)
    host.send({ t: 'm', d: 1 })
    server.deliver()
    expect(guest.log.at(-1)).toEqual({ t: 'm', d: 1 })
  })

  it('limit(true): new sockets fail like down()', () => {
    const server = createMemoryServer()
    server.limit(true)
    const s = connect(server, makeWindow(), '/api/room/new?v=1')
    server.deliver()
    expect(s.log).toEqual(['error', ['close', 1006]])
  })

  it('offline(win, true): that window\'s sockets are cut (a drop), its new sockets fail and its fetch rejects; others are fine', async () => {
    const { server, host, guest, guestWin, code, guestToken } = twoPlayers()
    server.offline(guestWin, true)
    expect(server.rooms()[0].slots).toEqual(['here', 'drop'])
    server.deliver()
    expect(guest.log.slice(-2)).toEqual(['error', ['close', 1006]])
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'drop' })

    const retry = connect(server, guestWin, `/api/room/${code}?v=1&token=${guestToken}`)
    server.deliver()
    expect(retry.log).toEqual(['error', ['close', 1006]])
    await expect(server.fetchFor(guestWin)('/api/ping')).rejects.toBeInstanceOf(guestWin.TypeError)
    expect((await server.fetchFor(makeWindow())('/api/ping')).status).toBe(200)

    server.offline(guestWin, false)
    const back = connect(server, guestWin, `/api/room/${code}?v=1&token=${guestToken}`)
    server.deliver()
    expect(back.log[1]).toMatchObject({ t: 'hello', slot: 1 })
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'back' })
  })
})

describe('memory server: the fake socket behaves like a browser socket', () => {
  it('send() while connecting throws InvalidStateError; send() after close is ignored', () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const s = connect(server, win, '/api/room/new?v=1')
    expect(() => s.send({ t: 'm' })).toThrow(win.DOMException)
    try {
      s.send({ t: 'm' })
    } catch (e) {
      expect(e.name).toBe('InvalidStateError')
    }
    server.deliver()
    s.ws.close()
    expect(s.ws.readyState).toBe(2)
    expect(() => s.send({ t: 'm' })).not.toThrow()
  })

  it('close() while connecting: the socket never opens (error + close 1006) and makes no room', () => {
    const server = createMemoryServer()
    const s = connect(server, makeWindow(), '/api/room/new?v=1')
    s.ws.close()
    server.deliver()
    expect(s.log).toEqual(['error', ['close', 1006]])
    expect(server.rooms()).toEqual([])
  })

  it('close() of an open socket without leave counts as a drop; the browser gets a clean close', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    let closeEvent
    guest.ws.addEventListener('close', (e) => (closeEvent = e))
    guest.ws.close(1000, 'bye')
    server.deliver()
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'drop' })
    expect(server.rooms()[0].slots).toEqual(['here', 'drop'])
    expect(closeEvent.code).toBe(1000)
    expect(closeEvent.wasClean).toBe(true)
  })

  it('leave followed by close() is a leave, not a drop', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    guest.send({ t: 'leave' })
    guest.ws.close()
    server.deliver()
    expect(host.log.at(-1)).toEqual({ t: 'peer', ev: 'leave' })
    expect(server.rooms()[0].slots).toEqual(['here', null])
  })

  it('messages still on the way to a socket that is cut are lost', () => {
    const { server, host, code } = hostRoom()
    const guestWin = makeWindow()
    const guest = connect(server, guestWin, `/api/room/${code}?v=1`)
    server.deliver()
    host.send({ t: 'm', d: 1 })
    server.deliver()
    host.send({ t: 'm', d: 2 })
    server.drop(guestWin)
    server.deliver()
    expect(guest.log.slice(2)).toEqual([{ t: 'm', d: 1 }, 'error', ['close', 1006]])
  })

  it('a come-back while the old socket is still open: the server closes the old socket and uses the new one', () => {
    const { server, host, code } = hostRoom()
    const guestWin = makeWindow()
    const guest = connect(server, guestWin, `/api/room/${code}?v=1`)
    server.deliver()
    const token = guest.log[1].token
    const again = connect(server, guestWin, `/api/room/${code}?v=1&token=${token}`)
    server.deliver()
    expect(guest.log.at(-1)).toEqual(['close', 1000])
    expect(again.log[1]).toMatchObject({ t: 'hello', slot: 1, token })
    host.send({ t: 'm', d: 'hi' })
    server.deliver()
    expect(again.log.at(-1)).toEqual({ t: 'm', d: 'hi' })
    expect(server.rooms()[0].slots).toEqual(['here', 'here'])
  })

  it('deliver() also delivers what handlers send while it runs, and stops with an error on an endless exchange', () => {
    const { server, host, code } = hostRoom()
    const guest = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    guest.ws.addEventListener('message', (e) => {
      if (JSON.parse(e.data).d === 'ping') guest.send({ t: 'm', d: 'pong' })
    })
    host.send({ t: 'm', d: 'ping' })
    server.deliver()
    expect(host.log.at(-1)).toEqual({ t: 'm', d: 'pong' })

    host.ws.addEventListener('message', () => host.send({ t: 'm', d: 'ping' }))
    host.send({ t: 'm', d: 'ping' })
    expect(() => server.deliver()).toThrow(/never ends/)
  })
})

describe('memory server: odd input', () => {
  it('a code with a broken % escape is just not found', () => {
    const { server } = hostRoom()
    const s = connect(server, makeWindow(), '/api/room/%E0%A4%A?v=1')
    server.deliver()
    expect(s.log[1]).toEqual({ t: 'err', code: ERR.NOT_FOUND })
  })

  it('a path that is not a room path fails like a 404 handshake', () => {
    const server = createMemoryServer()
    const s = connect(server, makeWindow(), '/api/rooms?v=1')
    server.deliver()
    expect(s.log).toEqual(['error', ['close', 1006]])
  })
})

describe('memory server: the room list', () => {
  const ids = (server) => server.list().map((r) => r.id)

  it('/api/rooms lists the rooms that wait for player 2, newest first, by name; hello carries the final name', async () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const fetch = server.fetchFor(win)
    expect(await (await fetch('/api/rooms')).json()).toEqual({ rooms: [] })
    const a = connect(server, win, '/api/room/new?v=1&name=' + encodeURIComponent(' rock '))
    const b = connect(server, makeWindow(), '/api/room/new?v=1&name=rock')
    server.deliver()
    expect(a.log[1]).toMatchObject({ t: 'hello', slot: 0, name: 'ROCK' })
    expect(b.log[1]).toMatchObject({ t: 'hello', slot: 0, name: 'ROCK 2' })
    const res = await fetch('/api/rooms')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const want = [{ id: b.log[1].code, name: 'ROCK 2' }, { id: a.log[1].code, name: 'ROCK' }]
    expect(await res.json()).toEqual({ rooms: want })
    expect(server.list()).toEqual(want)
    expect(server.rooms().map((r) => r.name).sort()).toEqual(['ROCK', 'ROCK 2'])
    expect(server.listAsks()).toBe(2)
  })

  it('a room leaves the list while player 2 is in, comes back when player 2 is gone before the start, and leaves for good at the start', () => {
    const { server, host, code } = hostRoom()
    expect(ids(server)).toEqual([code])
    const g = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    expect(ids(server)).toEqual([])
    g.send({ t: 'leave' })
    server.deliver()
    expect(ids(server)).toEqual([code])
    const g2 = connect(server, makeWindow(), `/api/room/${code}?v=1`)
    server.deliver()
    host.send({ t: 'start' })
    g2.send({ t: 'leave' })
    server.deliver()
    expect(server.rooms()).toEqual([expect.objectContaining({ code, started: true, slots: ['here', null] })])
    expect(ids(server)).toEqual([])
    host.send({ t: 'leave' })
    server.deliver()
    expect(server.rooms()).toEqual([])
    expect(ids(server)).toEqual([])
  })

  it('the deadlines update the list: a host away too long closes the room, and its name is free again', () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const a = connect(server, win, '/api/room/new?v=1&name=rock')
    server.deliver()
    server.drop(win)
    server.deliver()
    server.advance(NEW_TTL_MS + 1000)
    expect(ids(server)).toEqual([a.log[1].code]) // the host may be away while the room waits
    server.advance(WAIT_ROOM_MS)
    expect(server.rooms()).toEqual([])
    expect(ids(server)).toEqual([])
    const b = connect(server, makeWindow(), '/api/room/new?v=1&name=rock')
    server.deliver()
    expect(b.log[1].name).toBe('ROCK')
  })

  it('/api/rooms gives 429 while limit(true) and rejects while down(true) or offline(win, true)', async () => {
    const server = createMemoryServer()
    const win = makeWindow()
    const fetch = server.fetchFor(win)
    server.limit(true)
    expect((await fetch('/api/rooms')).status).toBe(429)
    server.limit(false)
    server.down(true)
    await expect(fetch('/api/rooms')).rejects.toBeInstanceOf(win.TypeError)
    server.down(false)
    server.offline(win, true)
    await expect(fetch('/api/rooms')).rejects.toBeInstanceOf(win.TypeError)
    server.offline(win, false)
    expect((await fetch('/api/rooms')).status).toBe(200)
  })
})
