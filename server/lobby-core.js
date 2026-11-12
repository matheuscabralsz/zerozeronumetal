// The room list (the lobby) as pure logic: no I/O, no timers. The clock is passed in, and the
// whole state is plain JSON (`lobby.state`), so the Durable Object `Lobby` can store it.
// The same class runs inside the Durable Object (server/lobby-do.js) and inside the in-memory
// test server (server/memory-server.js).
//
// The lobby gives out the hidden id and the unique name of each new room, and keeps what each
// room tells it: 'open' (waits for player 2: in the list), 'busy' (full or started: not in the
// list) or 'gone' (closed: forgotten). Rules: server/protocol.js and DECISIONS.md NEW-64..NEW-69.

import { DEFAULT_NAME, cleanName, randomCode, uniqueName } from './protocol.js'

/** An id given out for a room that never told its state is forgotten after this time. */
export const NEW_TTL_MS = 60_000
const ID_TRIES = 50

/**
 * @typedef {object} Entry
 * @property {string} name
 * @property {number} at                     when the room was made (ms)
 * @property {number} seq                    order of making (newest = highest)
 * @property {'new'|'open'|'busy'} state     new = id given out, the room has not told its state yet
 * @typedef {{rooms: Object<string, Entry>, next: number}} LobbyState
 */

export class LobbyCore {
  /** @param {LobbyState} [state]  plain JSON, from storage */
  constructor(state = { rooms: {}, next: 1 }) {
    this.state = state
  }

  /**
   * A free id and a unique name for a new room (the entry starts as 'new': not in the list yet).
   * @param {{name: string, now: number, random?: () => number}} o  name: as typed (it is cleaned)
   * @returns {{id: string, name: string}}
   */
  create({ name, now, random = Math.random }) {
    for (let i = 0; i < ID_TRIES; i++) {
      const made = this.reserve({ id: randomCode(random), name, now })
      if (made) return made
    }
    throw new Error('no free room id')
  }

  /**
   * Like create(), with an id chosen by the caller (the Pages Function makes the ids).
   * @param {{id: string, name: string, now: number}} o
   * @returns {{id: string, name: string} | null}  null when a room has this id now
   */
  reserve({ id, name, now }) {
    const { rooms } = this.state
    if (rooms[id]) return null
    const taken = new Set(Object.values(rooms).map((r) => r.name))
    const clean = uniqueName(cleanName(name) || DEFAULT_NAME, taken)
    rooms[id] = { name: clean, at: now, seq: this.state.next++, state: 'new' }
    return { id, name: clean }
  }

  /**
   * A room tells its state. An unknown id that says 'open' or 'busy' is added again with the
   * name and time it sends (the lobby may have lost it).
   * @param {{id: string, state: 'open'|'busy'|'gone', name?: string, at?: number}} o
   */
  set({ id, state, name, at }) {
    const { rooms } = this.state
    if (state === 'gone') {
      delete rooms[id]
      return
    }
    if (state !== 'open' && state !== 'busy') return
    if (rooms[id]) rooms[id].state = state
    else rooms[id] = { name: cleanName(name) || DEFAULT_NAME, at: at ?? 0, seq: this.state.next++, state }
  }

  /**
   * The rooms in the list, newest first. Also forgets 'new' entries older than NEW_TTL_MS.
   * @param {number} now
   * @returns {Array<{id: string, name: string}>}
   */
  list(now) {
    const { rooms } = this.state
    for (const [id, r] of Object.entries(rooms)) if (r.state === 'new' && now - r.at > NEW_TTL_MS) delete rooms[id]
    return Object.entries(rooms)
      .filter(([, r]) => r.state === 'open')
      .sort(([, a], [, b]) => b.seq - a.seq)
      .map(([id, r]) => ({ id, name: r.name }))
  }
}

