// The room server in the real Workers runtime (local workerd, no Cloudflare account):
// the Pages Function logic (server/api.js) talking to the real Durable Object `Room`.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { handleApi } from './api.js'
import { DROP_GRACE_MS, ERR, WAIT_ROOM_MS, normalizeCode } from './protocol.js'

const ORIGIN = 'https://zerozeronumetal.pages.dev'
const open = [] // every client socket, closed after each test

afterEach(() => {
  vi.useRealTimers()
  for (const ws of open.splice(0)) {
    try {
      ws.close(1000)
    } catch {}
  }
})

/** A WebSocket request to the API, as a browser makes it. */
function wsRequest(path) {
  return new Request(ORIGIN + path, { headers: { Upgrade: 'websocket' } })
}

/** The client end of an accepted WebSocket, with a message inbox. */
function client(res) {
  expect(res.status).toBe(101)
  const ws = res.webSocket
  const inbox = []
  const waiters = []
  let closeCode = null
  const closeWaiters = []
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (waiters.length) waiters.shift()(msg)
    else inbox.push(msg)
  })
  ws.addEventListener('close', (e) => {
    closeCode = e.code
    for (const w of closeWaiters.splice(0)) w(e.code)
  })
  ws.accept()
  open.push(ws)
  return {
    ws,
    next: () => (inbox.length ? Promise.resolve(inbox.shift()) : new Promise((r) => waiters.push(r))),
    closed: () => (closeCode != null ? Promise.resolve(closeCode) : new Promise((r) => closeWaiters.push(r))),
    send: (m) => ws.send(JSON.stringify(m)),
    inbox,
  }
}

async function connect(path, random) {
  return client(await handleApi(wsRequest(path), env, random))
}

/** A room with its host (the hello already read). */
async function hostRoom(random) {
  const host = await connect('/api/room/new?v=1', random)
  const hello = await host.next()
  return { host, hello, code: hello.code }
}

function stubFor(code) {
  return env.ROOMS.get(env.ROOMS.idFromName(code))
}

/** Wait (real time, up to 2 s) until check() is true. */
async function until(check) {
  for (let i = 0; i < 200; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('timed out waiting')
}

/** What the room with this code keeps in storage. */
function stored(code) {
  return runInDurableObject(stubFor(code), async (_, state) => ({
    room: await state.storage.get('room'),
    alarm: await state.storage.getAlarm(),
  }))
}

describe('GET /api/ping', () => {
  it('answers 200 {ok:true} and is never cached', async () => {
    const res = await handleApi(new Request(ORIGIN + '/api/ping'), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('creating and joining a room', () => {
  it('/api/room/new opens a WebSocket: the creator is slot 0 of a new room with a valid code', async () => {
    const { hello, code } = await hostRoom()
    expect(hello).toMatchObject({ t: 'hello', slot: 0, peer: 'none', started: false })
    expect(normalizeCode(code)).toBe(code)
    expect(typeof hello.token).toBe('string')
    expect((await stored(code)).room).toMatchObject({ code, version: '1', started: false })
  })

  it('a friend joins with the code in lower case as slot 1; the host gets peer join; game messages pass', async () => {
    const { host, code } = await hostRoom()
    const guest = await connect(`/api/room/${code.toLowerCase()}?v=1`)
    expect(await guest.next()).toMatchObject({ t: 'hello', code, slot: 1, peer: 'here', started: false })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'join' })
    host.send({ t: 'm', d: { x: 1 } })
    expect(await guest.next()).toEqual({ t: 'm', d: { x: 1 } })
    guest.send({ t: 'm', d: 'k' })
    expect(await host.next()).toEqual({ t: 'm', d: 'k' })
  })

  it('an invalid code, or a code with no open room, gets err not_found on an open socket and makes NO room', async () => {
    for (const path of ['/api/room/ab?v=1', '/api/room/AAAA?v=1', '/api/room/WXWX?v=1']) {
      const s = await connect(path)
      expect(await s.next()).toEqual({ t: 'err', code: ERR.NOT_FOUND })
      expect(await s.closed()).toBe(1000)
    }
    expect((await stored('WXWX')).room).toBeUndefined()
  })

  it('another version gets err version; a third person gets err full; after the start a new person gets err started', async () => {
    const { host, code } = await hostRoom()
    const other = await connect(`/api/room/${code}?v=2`)
    expect(await other.next()).toEqual({ t: 'err', code: ERR.VERSION })
    expect(await other.closed()).toBe(1000)
    const guest = await connect(`/api/room/${code}?v=1`)
    await guest.next()
    const third = await connect(`/api/room/${code}?v=1`)
    expect(await third.next()).toEqual({ t: 'err', code: ERR.FULL })
    host.send({ t: 'start' })
    guest.send({ t: 'leave' })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'join' })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'leave' })
    const late = await connect(`/api/room/${code}?v=1`)
    expect(await late.next()).toEqual({ t: 'err', code: ERR.STARTED })
  })

  it('a room request that is not a WebSocket gets 426, other paths 404', async () => {
    expect((await handleApi(new Request(ORIGIN + '/api/room/new?v=1'), env)).status).toBe(426)
    expect((await handleApi(new Request(ORIGIN + '/api/nothing'), env)).status).toBe(404)
  })

  it('the room answers 409 (before any socket) when its code is already open, and /api/room/new then tries another code', async () => {
    const { code } = await hostRoom()
    const res = await stubFor(code).fetch(`https://room/create?code=${code}&v=1`, { headers: { Upgrade: 'websocket' } })
    expect(res.status).toBe(409)
    expect(res.webSocket).toBeNull()

    // The first code offered is the open one; the next one is free.
    const taken = [...code].map((ch) => ('CDFGHJKMNPQRTVWX3479'.indexOf(ch) + 0.5) / 20)
    let calls = 0
    const random = () => (calls++ < taken.length ? taken[calls - 1] : Math.random())
    const second = await hostRoom(random)
    expect(calls).toBe(2 * taken.length) // two codes were made
    expect(second.code).not.toBe(code)
  })

  it('/api/room/new gives up with 503 when every code it tries is taken', async () => {
    const { code } = await hostRoom()
    const taken = [...code].map((ch) => ('CDFGHJKMNPQRTVWX3479'.indexOf(ch) + 0.5) / 20)
    let i = 0
    const random = () => taken[i++ % taken.length]
    const res = await handleApi(wsRequest('/api/room/new?v=1'), env, random)
    expect(res.status).toBe(503)
  })
})

describe('the room list (the Durable Object Lobby)', () => {
  /** GET /api/rooms as the game asks for it. */
  async function list() {
    const res = await handleApi(new Request(ORIGIN + '/api/rooms'), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    return (await res.json()).rooms
  }
  const listedIds = async () => (await list()).map((r) => r.id)

  it('/api/rooms lists the rooms that wait for player 2, newest first, by name; hello has the final, unique name', async () => {
    const a = await connect('/api/room/new?v=1&name=' + encodeURIComponent('  rock  '))
    const helloA = await a.next()
    expect(helloA).toMatchObject({ t: 'hello', slot: 0, name: 'ROCK' })
    const b = await connect('/api/room/new?v=1&name=Rock')
    const helloB = await b.next()
    expect(helloB.name).toBe('ROCK 2')
    const c = await connect('/api/room/new?v=1')
    expect((await c.next()).name).toMatch(/^SALA( \d+)?$/) // no name: SALA (other tests made rooms too)
    await until(async () => (await listedIds()).includes(helloB.code))
    const rooms = await list()
    const mine = rooms.filter((r) => [helloA.code, helloB.code].includes(r.id))
    expect(mine).toEqual([{ id: helloB.code, name: 'ROCK 2' }, { id: helloA.code, name: 'ROCK' }])
    expect((await stored(helloA.code)).room).toMatchObject({ name: 'ROCK' })
  })

  it('a room leaves the list while player 2 is in, comes back when player 2 leaves before the start, and leaves for good at the start and when it closes', async () => {
    const { host, code } = await hostRoom()
    await until(async () => (await listedIds()).includes(code))
    const guest = await connect(`/api/room/${code}?v=1`)
    await guest.next()
    await until(async () => !(await listedIds()).includes(code))
    guest.send({ t: 'leave' })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'join' })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'leave' })
    await until(async () => (await listedIds()).includes(code))
    // after hibernation the room still tells the list what changed
    await evictDurableObject(stubFor(code))
    const guest2 = await connect(`/api/room/${code}?v=1`)
    await guest2.next()
    await until(async () => !(await listedIds()).includes(code))
    host.send({ t: 'start' })
    guest2.send({ t: 'leave' })
    await guest2.closed()
    expect(await listedIds()).not.toContain(code)
    host.send({ t: 'leave' })
    await host.closed()
    expect((await stored(code)).room).toBeUndefined()
    expect(await listedIds()).not.toContain(code)
  })

  it('a list entry whose room is gone is removed when someone tries to join it', async () => {
    const lobby = env.LOBBY.get(env.LOBBY.idFromName('lobby'))
    await lobby.fetch('https://lobby/set', { method: 'POST', body: JSON.stringify({ id: 'WXWX', state: 'open', name: 'FANTASMA', at: 1 }) })
    expect(await listedIds()).toContain('WXWX')
    const s = await connect('/api/room/WXWX?v=1')
    expect(await s.next()).toEqual({ t: 'err', code: ERR.NOT_FOUND })
    await until(async () => !(await listedIds()).includes('WXWX'))
  })
})

describe('drops, deadlines and closing (alarms, hibernation)', () => {
  // The Durable Object runs in the same isolate as the tests, so a fake Date moves its clock.
  // The fake clock is one day ahead of the real one: the runtime runs alarms on the real clock,
  // so they never run by themselves here, only through runDurableObjectAlarm().
  const T0 = Math.ceil(Date.now() / 1000) * 1000 + 86_400_000
  function clockAt(t) {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(t)
  }

  async function twoPlayers() {
    clockAt(T0)
    const r = await hostRoom()
    r.guest = await connect(`/api/room/${r.code}?v=1`)
    r.guestHello = await r.guest.next()
    expect(await r.host.next()).toEqual({ t: 'peer', ev: 'join' })
    return r
  }

  it('a player whose socket closes without leave has 15 s: the alarm is set, and when it runs the other gets leave', async () => {
    const { host, guest, guestHello, code } = await twoPlayers()
    guest.ws.close(1001)
    expect(await host.next()).toEqual({ t: 'peer', ev: 'drop' })
    expect((await stored(code)).alarm).toBe(T0 + DROP_GRACE_MS)
    expect((await stored(code)).room.slots[1]).toMatchObject({ conn: null, until: T0 + DROP_GRACE_MS })

    clockAt(T0 + DROP_GRACE_MS)
    expect(await runDurableObjectAlarm(stubFor(code))).toBe(true)
    expect(await host.next()).toEqual({ t: 'peer', ev: 'leave' })
    expect((await stored(code)).alarm).toBeNull()
    const late = await connect(`/api/room/${code}?v=1&token=${guestHello.token}`)
    expect(await late.next()).toEqual({ t: 'err', code: ERR.EXPIRED })
  })

  it('a dropped player comes back with its token within 15 s; the other gets back and the alarm is cleared', async () => {
    const { host, guest, guestHello, code } = await twoPlayers()
    guest.ws.close(1001)
    await host.next()
    clockAt(T0 + DROP_GRACE_MS - 1)
    const back = await connect(`/api/room/${code}?v=1&token=${guestHello.token}`)
    expect(await back.next()).toEqual({ ...guestHello, peer: 'here' })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'back' })
    expect((await stored(code)).alarm).toBeNull()
    host.send({ t: 'm', d: 2 })
    expect(await back.next()).toEqual({ t: 'm', d: 2 })
  })

  it('the room goes on after the Durable Object hibernates: messages pass and a come-back works', async () => {
    const { host, guest, guestHello, code } = await twoPlayers()
    await evictDurableObject(stubFor(code))
    host.send({ t: 'm', d: 'after' })
    expect(await guest.next()).toEqual({ t: 'm', d: 'after' })
    guest.ws.close(1001)
    expect(await host.next()).toEqual({ t: 'peer', ev: 'drop' })
    await evictDurableObject(stubFor(code))
    const back = await connect(`/api/room/${code}?v=1&token=${guestHello.token}`)
    expect(await back.next()).toMatchObject({ t: 'hello', slot: 1, token: guestHello.token })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'back' })
  })

  it('a come-back while the old socket is still open closes the old socket and uses the new one', async () => {
    const { host, guest, guestHello, code } = await twoPlayers()
    const again = await connect(`/api/room/${code}?v=1&token=${guestHello.token}`)
    expect(await again.next()).toMatchObject({ t: 'hello', slot: 1 })
    expect(await guest.closed()).toBe(1000)
    host.send({ t: 'm', d: 3 })
    expect(await again.next()).toEqual({ t: 'm', d: 3 })
    expect(guest.inbox).toEqual([])
  })

  it('the host leaving before the start closes the room: player 2 gets closed host_left, nothing is kept, the code gives not_found', async () => {
    const { host, guest, code } = await twoPlayers()
    host.send({ t: 'leave' })
    expect(await guest.next()).toEqual({ t: 'closed', why: 'host_left' })
    expect(await guest.closed()).toBe(1000)
    expect(await host.closed()).toBe(1000)
    expect(await stored(code)).toEqual({ room: undefined, alarm: null })
    const late = await connect(`/api/room/${code}?v=1`)
    expect(await late.next()).toEqual({ t: 'err', code: ERR.NOT_FOUND })
  })

  it('after the start, when both players have left, the room keeps nothing and the code gives not_found', async () => {
    const { host, guest, code } = await twoPlayers()
    host.send({ t: 'start' })
    guest.send({ t: 'leave' })
    expect(await host.next()).toEqual({ t: 'peer', ev: 'leave' })
    guest.ws.close(1000)
    host.ws.close(1001) // the last player drops...
    await until(async () => (await stored(code)).alarm != null)
    expect((await stored(code)).alarm).toBe(T0 + DROP_GRACE_MS)
    clockAt(T0 + DROP_GRACE_MS) // ...and does not come back
    await runDurableObjectAlarm(stubFor(code))
    expect(await stored(code)).toEqual({ room: undefined, alarm: null })
    const late = await connect(`/api/room/${code}?v=1`)
    expect(await late.next()).toEqual({ t: 'err', code: ERR.NOT_FOUND })
  })

  it('waiting room: the host may be away until 10 min after the room was made; then the room closes', async () => {
    clockAt(T0)
    const { host, hello, code } = await hostRoom()
    clockAt(T0 + 60_000)
    host.ws.close(1001)
    await until(async () => (await stored(code)).alarm != null)
    expect((await stored(code)).alarm).toBe(T0 + WAIT_ROOM_MS)

    clockAt(T0 + 5 * 60_000)
    const friend = await connect(`/api/room/${code}?v=1`)
    expect(await friend.next()).toMatchObject({ t: 'hello', slot: 1, peer: 'drop' })

    clockAt(T0 + WAIT_ROOM_MS)
    await runDurableObjectAlarm(stubFor(code))
    expect(await friend.next()).toEqual({ t: 'closed', why: 'expired' })
    expect(await stored(code)).toEqual({ room: undefined, alarm: null })
    const back = await connect(`/api/room/${code}?v=1&token=${hello.token}`)
    expect(await back.next()).toEqual({ t: 'err', code: ERR.NOT_FOUND })
  })

  it('a code whose time ran out before the alarm ran is free again for a new room', async () => {
    clockAt(T0)
    const { host, code } = await hostRoom()
    host.ws.close(1001)
    await until(async () => (await stored(code)).alarm != null)
    clockAt(T0 + WAIT_ROOM_MS)
    const res = await stubFor(code).fetch(`https://room/create?code=${code}&v=1`, { headers: { Upgrade: 'websocket' } })
    const again = client(res)
    expect(await again.next()).toMatchObject({ t: 'hello', code, slot: 0 })
  })
})

describe('the Pages Function file', () => {
  it('functions/api/[[path]].js answers GET requests with the API', async () => {
    const { onRequestGet } = await import('../functions/api/[[path]].js')
    const res = await onRequestGet({ request: new Request(ORIGIN + '/api/ping'), env })
    expect(await res.json()).toEqual({ ok: true })
    const s = client(await onRequestGet({ request: wsRequest('/api/room/new?v=1'), env }))
    expect(await s.next()).toMatchObject({ t: 'hello', slot: 0 })
  })
})
