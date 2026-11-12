import { describe, expect, it } from 'vitest'
import { RoomCore } from '../../../server/room-core.js'
import { DROP_GRACE_MS, ERR, WAIT_ROOM_MS } from '../../../server/protocol.js'

const V = 'v1'

// A room with named players. Effects are read back as [name, msg] or [name, 'close'].
class Fixture {
  constructor(now = 0) {
    this.who = new Map() // conn -> name
    this.conn = {} // name -> latest conn
    const r = RoomCore.create({ code: 'K7QX', name: 'ROCK', version: V, token: 'T-host', now })
    this.core = r.core
    this.who.set(r.conn, 'host')
    this.conn.host = r.conn
    this.created = this.read(r.effects)
  }

  read(effects) {
    return effects.map((e) => ('send' in e ? [this.who.get(e.send), e.msg] : [this.who.get(e.close), 'close']))
  }

  join(name, { version = V, token = null, now = 0 } = {}) {
    const r = this.core.join({ version, token, newToken: 'T-' + name, now })
    if (r.conn != null) {
      this.who.set(r.conn, name)
      this.conn[name] = r.conn
    }
    return { reject: r.reject, slot: r.slot, out: this.read(r.effects) }
  }

  say(name, msg, now = 0) {
    return this.read(this.core.receive(this.conn[name], JSON.stringify(msg), now))
  }

  drop(name, now = 0) {
    return this.read(this.core.disconnect(this.conn[name], now))
  }

  tick(now) {
    return this.read(this.core.tick(now))
  }

  slots() {
    return this.core.summary().slots
  }
}

const hello = (slot, token, peer, started = false) => ({ t: 'hello', code: 'K7QX', name: 'ROCK', slot, token, peer, started })
const peer = (ev) => ({ t: 'peer', ev })

describe('creating and joining', () => {
  it('the creator is slot 0 and gets hello with its token and no peer', () => {
    const f = new Fixture()
    expect(f.created).toEqual([['host', hello(0, 'T-host', 'none')]])
    expect(f.core.summary()).toEqual({ code: 'K7QX', name: 'ROCK', started: false, slots: ['here', null] })
    expect(f.core.closed).toBe(false)
  })

  it('a friend with the same version joins as slot 1; the friend gets hello and the host gets peer join', () => {
    const f = new Fixture()
    const r = f.join('guest')
    expect(r.reject).toBeUndefined()
    expect(r.slot).toBe(1)
    expect(r.out).toEqual([
      ['guest', hello(1, 'T-guest', 'here')],
      ['host', peer('join')],
    ])
    expect(f.slots()).toEqual(['here', 'here'])
  })

  it('a friend with a different version gets version and does NOT take slot 1', () => {
    const f = new Fixture()
    expect(f.join('guest', { version: 'v2' })).toMatchObject({ reject: ERR.VERSION, out: [] })
    expect(f.slots()).toEqual(['here', null])
  })

  it('a third person gets full', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.join('third')).toMatchObject({ reject: ERR.FULL, out: [] })
    expect(f.slots()).toEqual(['here', 'here'])
  })

  it('a token that belongs to nobody in the room gets expired, before the version check', () => {
    const f = new Fixture()
    expect(f.join('guest', { token: 'nope' }).reject).toBe(ERR.EXPIRED)
    expect(f.join('guest', { token: 'nope', version: 'v2' }).reject).toBe(ERR.EXPIRED)
  })
})

describe('messages, start and leave', () => {
  it('{t:m} goes to the other player only, with the same d', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.say('host', { t: 'm', d: { x: 1 } })).toEqual([['guest', { t: 'm', d: { x: 1 } }]])
    expect(f.say('guest', { t: 'm', d: [1, 2] })).toEqual([['host', { t: 'm', d: [1, 2] }]])
  })

  it('{t:m} is dropped when the other player is not connected', () => {
    const f = new Fixture()
    expect(f.say('host', { t: 'm', d: 1 })).toEqual([])
  })

  it('text that is not JSON, unknown messages and sockets that are not in the room do nothing', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.read(f.core.receive(f.conn.host, 'not json', 0))).toEqual([])
    expect(f.read(f.core.receive(f.conn.host, '"text"', 0))).toEqual([])
    expect(f.read(f.core.receive(f.conn.host, 'null', 0))).toEqual([])
    expect(f.say('host', { t: 'what' })).toEqual([])
    expect(f.read(f.core.receive(999, JSON.stringify({ t: 'leave' }), 0))).toEqual([])
    expect(f.read(f.core.disconnect(999, 0))).toEqual([])
    expect(f.slots()).toEqual(['here', 'here'])
  })

  it('start works only from slot 0 and only while slot 1 is here', () => {
    const f = new Fixture()
    expect(f.say('host', { t: 'start' })).toEqual([])
    expect(f.core.summary().started).toBe(false)
    f.join('guest')
    f.say('guest', { t: 'start' })
    expect(f.core.summary().started).toBe(false)
    f.say('host', { t: 'start' })
    expect(f.core.summary().started).toBe(true)
  })

  it('after the start nobody new can join (started); the version check comes first', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    expect(f.join('third').reject).toBe(ERR.STARTED)
    expect(f.join('third', { version: 'v2' }).reject).toBe(ERR.VERSION)
  })

  it('before the start, player 2 leaving frees slot 1 at once: the host gets leave and a new friend can join', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.say('guest', { t: 'leave' })).toEqual([
      ['guest', 'close'],
      ['host', peer('leave')],
    ])
    expect(f.slots()).toEqual(['here', null])
    expect(f.say('guest', { t: 'm', d: 1 })).toEqual([]) // the old socket is not in the room
    expect(f.join('friend2').out).toEqual([
      ['friend2', hello(1, 'T-friend2', 'here')],
      ['host', peer('join')],
    ])
  })

  it('before the start, the host leaving closes the room: player 2 gets closed host_left', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.say('host', { t: 'leave' })).toEqual([
      ['host', 'close'],
      ['guest', { t: 'closed', why: 'host_left' }],
      ['guest', 'close'],
    ])
    expect(f.core.closed).toBe(true)
    expect(f.join('late').reject).toBe(ERR.NOT_FOUND)
  })

  it('the host cancelling an empty waiting room closes it', () => {
    const f = new Fixture()
    expect(f.say('host', { t: 'leave' })).toEqual([['host', 'close']])
    expect(f.core.closed).toBe(true)
  })

  it('after the start, a leave tells the other player, who keeps the room; a new person still gets started', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    expect(f.say('guest', { t: 'leave' })).toEqual([
      ['guest', 'close'],
      ['host', peer('leave')],
    ])
    expect(f.core.closed).toBe(false)
    expect(f.slots()).toEqual(['here', null])
    expect(f.join('third').reject).toBe(ERR.STARTED)
  })

  it('after the start, the host may leave too: player 2 gets leave and keeps playing', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    expect(f.say('host', { t: 'leave' })).toEqual([
      ['host', 'close'],
      ['guest', peer('leave')],
    ])
    expect(f.slots()).toEqual([null, 'here'])
    expect(f.say('guest', { t: 'm', d: 1 })).toEqual([])
  })

  it('when the last player leaves, the room closes and its code gives not_found', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    f.say('guest', { t: 'leave' })
    expect(f.say('host', { t: 'leave' })).toEqual([['host', 'close']])
    expect(f.core.closed).toBe(true)
    expect(f.join('late').reject).toBe(ERR.NOT_FOUND)
    expect(f.join('late', { token: 'T-host' }).reject).toBe(ERR.NOT_FOUND)
  })
})

describe('drops, come-backs and deadlines', () => {
  const S = 1000
  const MIN = 60 * S

  it('waiting room: the host can drop and come back with its token within 10 min after the room was made', () => {
    const f = new Fixture()
    expect(f.drop('host', 1 * MIN)).toEqual([])
    expect(f.slots()).toEqual(['drop', null])
    expect(f.core.nextDeadline()).toBe(WAIT_ROOM_MS)
    expect(f.tick(9 * MIN)).toEqual([])
    const r = f.join('host2', { token: 'T-host', now: 9 * MIN })
    expect(r.slot).toBe(0)
    expect(r.out).toEqual([['host2', hello(0, 'T-host', 'none')]])
    expect(f.slots()).toEqual(['here', null])
    expect(f.core.nextDeadline()).toBe(null)
  })

  it('waiting room: with the host still away 10 min after the room was made, the room closes', () => {
    const f = new Fixture()
    f.drop('host', 1 * MIN)
    expect(f.tick(WAIT_ROOM_MS - 1)).toEqual([])
    expect(f.tick(WAIT_ROOM_MS)).toEqual([])
    expect(f.core.closed).toBe(true)
    expect(f.join('host2', { token: 'T-host', now: WAIT_ROOM_MS }).reject).toBe(ERR.NOT_FOUND)
  })

  it('waiting room: a friend may join while the host is away (peer drop); the friend gets back when the host returns', () => {
    const f = new Fixture()
    f.drop('host', 1 * MIN)
    expect(f.join('guest', { now: 2 * MIN }).out).toEqual([['guest', hello(1, 'T-guest', 'drop')]])
    expect(f.join('host2', { token: 'T-host', now: 3 * MIN }).out).toEqual([
      ['host2', hello(0, 'T-host', 'here')],
      ['guest', peer('back')],
    ])
    expect(f.slots()).toEqual(['here', 'here'])
  })

  it('waiting room: if the host is still away after 10 min, a waiting friend gets closed expired', () => {
    const f = new Fixture()
    f.drop('host', 1 * MIN)
    f.join('guest', { now: 2 * MIN })
    expect(f.tick(WAIT_ROOM_MS)).toEqual([
      ['guest', { t: 'closed', why: 'expired' }],
      ['guest', 'close'],
    ])
    expect(f.core.closed).toBe(true)
  })

  it('waiting room: a host who drops near (or after) the 10 min still gets the normal 15 s to come back', () => {
    const f = new Fixture()
    f.drop('host', 20 * MIN)
    expect(f.core.nextDeadline()).toBe(20 * MIN + DROP_GRACE_MS)
    f.join('host2', { token: 'T-host', now: 20 * MIN + DROP_GRACE_MS - 1 })
    expect(f.slots()).toEqual(['here', null])
  })

  it('before the start: the host drops after player 2 joined; player 2 gets drop, and closed host_left after 15 s', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.drop('host', 5 * S)).toEqual([['guest', peer('drop')]])
    expect(f.core.nextDeadline()).toBe(5 * S + DROP_GRACE_MS)
    expect(f.tick(5 * S + DROP_GRACE_MS - 1)).toEqual([])
    expect(f.tick(5 * S + DROP_GRACE_MS)).toEqual([
      ['guest', { t: 'closed', why: 'host_left' }],
      ['guest', 'close'],
    ])
    expect(f.core.closed).toBe(true)
  })

  it('before the start: the host comes back within 15 s; player 2 gets back', () => {
    const f = new Fixture()
    f.join('guest')
    f.drop('host', 0)
    expect(f.join('host2', { token: 'T-host', now: DROP_GRACE_MS - 1 }).out).toEqual([
      ['host2', hello(0, 'T-host', 'here')],
      ['guest', peer('back')],
    ])
    expect(f.core.nextDeadline()).toBe(null)
  })

  it('before the start: player 2 drops; the slot is kept for 15 s (a new person gets full), then freed and the host gets leave', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.drop('guest', 0)).toEqual([['host', peer('drop')]])
    expect(f.join('third', { now: DROP_GRACE_MS - 1 }).reject).toBe(ERR.FULL)
    expect(f.tick(DROP_GRACE_MS)).toEqual([['host', peer('leave')]])
    expect(f.slots()).toEqual(['here', null])
    expect(f.join('guest2', { token: 'T-guest', now: DROP_GRACE_MS }).reject).toBe(ERR.EXPIRED)
    expect(f.join('third', { now: DROP_GRACE_MS }).slot).toBe(1)
  })

  it('before the start: player 2 comes back within 15 s with the same token', () => {
    const f = new Fixture()
    f.join('guest')
    f.drop('guest', 0)
    expect(f.join('guest2', { token: 'T-guest', now: 10 * S }).out).toEqual([
      ['guest2', hello(1, 'T-guest', 'here')],
      ['host', peer('back')],
    ])
  })

  it('after the start: a drop tells the other player; a come-back within 15 s gets back, after 15 s it counts as leave', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    expect(f.drop('host', 0)).toEqual([['guest', peer('drop')]])
    expect(f.join('host2', { token: 'T-host', now: 14 * S }).out).toEqual([
      ['host2', hello(0, 'T-host', 'here', true)],
      ['guest', peer('back')],
    ])
    expect(f.drop('guest', 20 * S)).toEqual([['host2', peer('drop')]])
    expect(f.tick(20 * S + DROP_GRACE_MS)).toEqual([['host2', peer('leave')]])
    expect(f.core.closed).toBe(false)
    expect(f.join('guest2', { token: 'T-guest', now: 40 * S }).reject).toBe(ERR.EXPIRED)
  })

  it('after the start: when both have dropped and their 15 s ran out, the room closes', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    f.drop('host', 0)
    f.drop('guest', 2 * S)
    expect(f.core.nextDeadline()).toBe(DROP_GRACE_MS)
    expect(f.tick(DROP_GRACE_MS)).toEqual([])
    expect(f.core.closed).toBe(false)
    expect(f.core.nextDeadline()).toBe(2 * S + DROP_GRACE_MS)
    expect(f.tick(2 * S + DROP_GRACE_MS)).toEqual([])
    expect(f.core.closed).toBe(true)
  })

  it('a come-back while the old socket is still open closes the old socket and uses the new one, with no drop/back', () => {
    const f = new Fixture()
    f.join('guest')
    const old = f.conn.guest
    expect(f.join('guest2', { token: 'T-guest', now: 0 }).out).toEqual([
      ['guest', 'close'],
      ['guest2', hello(1, 'T-guest', 'here')],
    ])
    expect(f.read(f.core.receive(old, JSON.stringify({ t: 'leave' }), 0))).toEqual([])
    expect(f.read(f.core.disconnect(old, 0))).toEqual([])
    expect(f.slots()).toEqual(['here', 'here'])
    expect(f.say('host', { t: 'm', d: 1 })).toEqual([['guest2', { t: 'm', d: 1 }]])
  })

  it('a come-back with a valid token but another game version gets version', () => {
    const f = new Fixture()
    f.join('guest')
    f.drop('guest', 0)
    expect(f.join('guest2', { token: 'T-guest', version: 'v2', now: 1 }).reject).toBe(ERR.VERSION)
    expect(f.slots()).toEqual(['here', 'drop'])
  })

  it('a second close of a dropped socket does nothing', () => {
    const f = new Fixture()
    f.join('guest')
    f.drop('guest', 0)
    expect(f.drop('guest', 5 * S)).toEqual([])
    expect(f.core.nextDeadline()).toBe(DROP_GRACE_MS)
  })

  it('every call first runs the deadlines that are due, even if tick() was late', () => {
    const f = new Fixture()
    f.join('guest')
    f.drop('guest', 0)
    expect(f.join('third', { now: 20 * S }).out).toEqual([
      ['host', peer('leave')],
      ['third', hello(1, 'T-third', 'here')],
      ['host', peer('join')],
    ])

    const g = new Fixture()
    g.join('guest')
    g.drop('host', 0)
    expect(g.say('guest', { t: 'm', d: 1 }, 20 * S)).toEqual([
      ['guest', { t: 'closed', why: 'host_left' }],
      ['guest', 'close'],
    ])
    expect(g.join('late', { now: 20 * S }).reject).toBe(ERR.NOT_FOUND)
  })

  it('the state is plain JSON: a room built again from a copy of its state goes on the same way', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    f.drop('guest', 0)
    const copy = new RoomCore(JSON.parse(JSON.stringify(f.core.state)))
    expect(copy.summary()).toEqual(f.core.summary())
    expect(copy.nextDeadline()).toBe(DROP_GRACE_MS)
    expect(f.read(copy.tick(DROP_GRACE_MS))).toEqual([['host', peer('leave')]])
  })
})

describe('the room list (listing)', () => {
  it('a room is open while it waits for player 2, also while the host is away (NEW-56)', () => {
    const f = new Fixture()
    expect(f.core.listing()).toBe('open')
    f.drop('host', 1000)
    expect(f.core.listing()).toBe('open')
  })

  it('a room with player 2 is busy, also while player 2 is dropped; it is open again when player 2 is gone before the start', () => {
    const f = new Fixture()
    f.join('guest')
    expect(f.core.listing()).toBe('busy')
    f.drop('guest', 0)
    expect(f.core.listing()).toBe('busy')
    f.tick(DROP_GRACE_MS + 1)
    expect(f.core.listing()).toBe('open')
  })

  it('a started game is busy, also after player 2 left; a closed room is gone', () => {
    const f = new Fixture()
    f.join('guest')
    f.say('host', { t: 'start' })
    f.say('guest', { t: 'leave' })
    expect(f.core.listing()).toBe('busy')
    f.say('host', { t: 'leave' })
    expect(f.core.listing()).toBe('gone')
  })
})
