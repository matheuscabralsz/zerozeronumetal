// The room rules as pure logic: no I/O, no timers. The clock is passed in, and the whole
// state is plain JSON (`core.state`), so the Durable Object can store it and build the
// room again after hibernation with `new RoomCore(state)`.
// The same class runs inside the Durable Object (server/room-do.js) and inside the
// in-memory test server (server/memory-server.js).
//
// Sockets are named by a connection number (`conn`) that the room gives out. Every
// method returns a list of effects for the caller to carry out, in order:
//   {send: conn, msg}  send msg (an object; the caller turns it into JSON) to that socket
//   {close: conn}      close that socket
// A socket whose conn is no longer in the room (it left, or was replaced by a come-back)
// is ignored: its messages and its close do nothing.
//
// Rules: see server/protocol.js and .specs/online-coop/DECISIONS.md (D5, NEW-46, NEW-55..NEW-63).

import { DROP_GRACE_MS, ERR, WAIT_ROOM_MS } from './protocol.js'

/**
 * @typedef {{send: number, msg: object} | {close: number}} Effect
 * @typedef {object} Slot
 * @property {string} token        come-back token of this player
 * @property {number|null} conn    the connected socket, or null while dropped
 * @property {number|null} until   while dropped: the time the player counts as gone
 * @property {boolean} wait        dropped while the room waited for player 2 (NEW-56)
 * @typedef {object} RoomState
 * @property {string} code       the hidden id
 * @property {string} name       the room name (clean and unique, from the lobby)
 * @property {string} version
 * @property {number} createdAt
 * @property {boolean} started
 * @property {boolean} closed      the room is closed; the caller deletes what it stored
 * @property {number} nextConn
 * @property {[Slot|null, Slot|null]} slots
 */

export class RoomCore {
  /** @param {RoomState} state  plain JSON, from `create()` or from storage */
  constructor(state) {
    this.state = state
  }

  /**
   * A new room; its creator is slot 0 and gets 'hello'.
   * @param {{code: string, name: string, version: string, token: string, now: number}} o
   * @returns {{core: RoomCore, conn: number, effects: Effect[]}}
   */
  static create({ code, name, version, token, now }) {
    const core = new RoomCore({
      code,
      name,
      version,
      createdAt: now,
      started: false,
      closed: false,
      nextConn: 1,
      slots: [null, null],
    })
    const conn = core.#seat(0, token)
    return { core, conn, effects: [core.#hello(0)] }
  }

  /** @returns {boolean} */
  get closed() {
    return this.state.closed
  }

  /**
   * A new socket wants to join (no token) or come back (token).
   * @param {{version: string, token?: string|null, newToken: string, now: number}} o
   * @returns {{effects: Effect[], conn?: number, slot?: number, reject?: string}}
   */
  join({ version, token, newToken, now }) {
    const effects = this.tick(now)
    if (this.closed) return { effects, reject: ERR.NOT_FOUND }
    const { slots } = this.state
    if (token) {
      const slot = slots.findIndex((s) => s && s.token === token)
      if (slot < 0) return { effects, reject: ERR.EXPIRED }
      if (version !== this.state.version) return { effects, reject: ERR.VERSION }
      return { effects, ...this.#comeBack(slot, effects) }
    }
    if (version !== this.state.version) return { effects, reject: ERR.VERSION }
    if (this.state.started) return { effects, reject: ERR.STARTED }
    if (slots[1]) return { effects, reject: ERR.FULL }
    const conn = this.#seat(1, newToken)
    effects.push(this.#hello(1))
    this.#tell(0, 'join', effects)
    return { effects, conn, slot: 1 }
  }

  /**
   * A text frame from a socket.
   * @param {number} conn
   * @param {string} text
   * @param {number} now
   * @returns {Effect[]}
   */
  receive(conn, text, now) {
    const effects = this.tick(now)
    const slot = this.#slotOf(conn)
    if (slot < 0) return effects
    let msg
    try {
      msg = JSON.parse(text)
    } catch {
      return effects
    }
    if (!msg || typeof msg !== 'object') return effects
    const { slots } = this.state
    if (msg.t === 'm') {
      const other = slots[1 - slot]
      if (other && other.conn != null) effects.push({ send: other.conn, msg: { t: 'm', d: msg.d } })
    } else if (msg.t === 'start') {
      if (slot === 0 && slots[1] && slots[1].conn != null) this.state.started = true
    } else if (msg.t === 'leave') {
      this.#remove(slot, 'host_left', effects)
    }
    return effects
  }

  /**
   * A socket closed or failed without {t:'leave'}: the player dropped.
   * @param {number} conn
   * @param {number} now
   * @returns {Effect[]}
   */
  disconnect(conn, now) {
    const effects = this.tick(now)
    const slot = this.#slotOf(conn)
    if (slot < 0) return effects
    const s = this.state.slots[slot]
    s.conn = null
    // NEW-56: while the room waits for player 2, the host may be away until 10 min after
    // the room was made (and never less than the normal come-back time).
    s.wait = !this.state.started && slot === 0 && !this.state.slots[1]
    s.until = now + DROP_GRACE_MS
    if (s.wait) s.until = Math.max(s.until, this.state.createdAt + WAIT_ROOM_MS)
    this.#tell(1 - slot, 'drop', effects)
    return effects
  }

  /**
   * Run every deadline that is due at `now`.
   * @param {number} now
   * @returns {Effect[]}
   */
  tick(now) {
    const effects = []
    for (;;) {
      const due = this.nextDeadline()
      if (this.closed || due == null || due > now) return effects
      const slot = this.state.slots.findIndex((s) => s && s.conn == null && s.until === due)
      this.#remove(slot, this.state.slots[slot].wait ? 'expired' : 'host_left', effects)
    }
  }

  /** @returns {number|null} the next time tick() has something to do */
  nextDeadline() {
    let next = null
    for (const s of this.state.slots) {
      if (s && s.conn == null && (next == null || s.until < next)) next = s.until
    }
    return next
  }

  /** @returns {{code: string, name: string, started: boolean, slots: Array<null|'here'|'drop'>}} */
  summary() {
    const { code, name, started, slots } = this.state
    return { code, name, started, slots: slots.map((s) => (s ? (s.conn != null ? 'here' : 'drop') : null)) }
  }

  /**
   * What the room list must show: 'open' while the room waits for player 2 (the host may be
   * away), 'busy' when it is full or started, 'gone' when it is closed.
   * @returns {'open'|'busy'|'gone'}
   */
  listing() {
    if (this.closed) return 'gone'
    return !this.state.started && !this.state.slots[1] ? 'open' : 'busy'
  }

  // --- helpers ---

  /** Put a new player with this token into a free slot; returns its conn. */
  #seat(slot, token) {
    const conn = this.state.nextConn++
    this.state.slots[slot] = { token, conn, until: null, wait: false }
    return conn
  }

  /** A player comes back with its token on a new socket (the old one, if still open, is closed). */
  #comeBack(slot, effects) {
    const s = this.state.slots[slot]
    const wasHere = s.conn != null
    if (wasHere) effects.push({ close: s.conn })
    s.conn = this.state.nextConn++
    s.until = null
    s.wait = false
    effects.push(this.#hello(slot))
    if (!wasHere) this.#tell(1 - slot, 'back', effects)
    return { conn: s.conn, slot }
  }

  /** The slot that this socket is in, or -1. */
  #slotOf(conn) {
    if (conn == null) return -1
    return this.state.slots.findIndex((s) => s && s.conn === conn)
  }

  /**
   * The player in `slot` is gone for good (left, or its come-back time ran out).
   * Before the start the room belongs to the host, so the host going closes it (`why`).
   */
  #remove(slot, why, effects) {
    const { slots } = this.state
    if (slots[slot].conn != null) effects.push({ close: slots[slot].conn })
    slots[slot] = null
    if (!this.state.started && slot === 0) return this.#closeRoom(why, effects)
    this.#tell(1 - slot, 'leave', effects)
    if (!slots[0] && !slots[1]) this.#closeRoom(why, effects)
  }

  /** Close the room: whoever is still connected gets {t:'closed'} and is closed. */
  #closeRoom(why, effects) {
    for (const s of this.state.slots) {
      if (s && s.conn != null) effects.push({ send: s.conn, msg: { t: 'closed', why } }, { close: s.conn })
    }
    this.state.slots = [null, null]
    this.state.closed = true
  }

  /** 'none' | 'here' | 'drop': how `slot` sees the other player. */
  #peerOf(slot) {
    const other = this.state.slots[1 - slot]
    if (!other) return 'none'
    return other.conn != null ? 'here' : 'drop'
  }

  #hello(slot) {
    const { code, name, started, slots } = this.state
    const s = slots[slot]
    return { send: s.conn, msg: { t: 'hello', code, name, slot, token: s.token, peer: this.#peerOf(slot), started } }
  }

  /** Tell `slot` (if it is connected) about the other player. */
  #tell(slot, ev, effects) {
    const s = this.state.slots[slot]
    if (s && s.conn != null) effects.push({ send: s.conn, msg: { t: 'peer', ev } })
  }
}
