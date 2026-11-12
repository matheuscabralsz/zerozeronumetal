import { describe, expect, it } from 'vitest'
import { LobbyCore, NEW_TTL_MS } from '../../../server/lobby-core.js'
import { CODE_ALPHABET, CODE_LENGTH } from '../../../server/protocol.js'

/** A random source that gives these numbers, then starts again. */
const numbers = (...xs) => {
  let i = 0
  return () => xs[i++ % xs.length]
}
const ID_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`)

describe('LobbyCore', () => {
  it('gives a new room a free hidden id and its clean name; the room is not listed before it says it is open', () => {
    const lobby = new LobbyCore()
    const r = lobby.create({ name: '  rock  ', now: 0 })
    expect(r.id).toMatch(ID_RE)
    expect(r.name).toBe('ROCK')
    expect(lobby.list(0)).toEqual([])
    lobby.set({ id: r.id, state: 'open' })
    expect(lobby.list(0)).toEqual([{ id: r.id, name: 'ROCK' }])
  })

  it('names a room SALA when nothing usable is left of its name', () => {
    expect(new LobbyCore().create({ name: ' !! ', now: 0 }).name).toBe('SALA')
    expect(new LobbyCore().create({ name: undefined, now: 0 }).name).toBe('SALA')
  })

  it('never gives a name that a room has now (new, open or busy); a closed room frees its name', () => {
    const lobby = new LobbyCore()
    const a = lobby.create({ name: 'rock', now: 0 })
    expect(lobby.create({ name: 'ROCK', now: 0 }).name).toBe('ROCK 2') // a is still 'new'
    lobby.set({ id: a.id, state: 'busy' })
    expect(lobby.create({ name: 'Rock', now: 0 }).name).toBe('ROCK 3')
    lobby.set({ id: a.id, state: 'gone' })
    expect(lobby.create({ name: 'rock', now: 0 }).name).toBe('ROCK')
  })

  it('never gives an id that a room has now, and gives up after many taken ids', () => {
    const lobby = new LobbyCore()
    const a = lobby.create({ name: 'a', now: 0, random: () => 0 })
    const b = lobby.create({ name: 'b', now: 0, random: numbers(0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5) })
    expect(b.id).not.toBe(a.id)
    expect(() => lobby.create({ name: 'c', now: 0, random: () => 0 })).toThrow()
  })

  it('lists only open rooms, newest first; busy rooms leave the list and can come back', () => {
    const lobby = new LobbyCore()
    const ids = ['rock', 'metal', 'punk'].map((name) => lobby.create({ name, now: 0 }).id)
    for (const id of ids) lobby.set({ id, state: 'open' })
    expect(lobby.list(0).map((r) => r.name)).toEqual(['PUNK', 'METAL', 'ROCK'])
    lobby.set({ id: ids[1], state: 'busy' })
    expect(lobby.list(0).map((r) => r.name)).toEqual(['PUNK', 'ROCK'])
    lobby.set({ id: ids[1], state: 'open' })
    expect(lobby.list(0).map((r) => r.name)).toEqual(['PUNK', 'METAL', 'ROCK'])
    lobby.set({ id: ids[2], state: 'gone' })
    expect(lobby.list(0).map((r) => r.name)).toEqual(['METAL', 'ROCK'])
  })

  it('forgets an id that never said its state after NEW_TTL_MS, and keeps open and busy rooms', () => {
    const lobby = new LobbyCore()
    const lost = lobby.create({ name: 'lost', now: 0 })
    const busy = lobby.create({ name: 'busy', now: 0 })
    lobby.set({ id: busy.id, state: 'busy' })
    lobby.list(NEW_TTL_MS)
    expect(lobby.create({ name: 'lost', now: NEW_TTL_MS }).name).toBe('LOST 2') // not yet
    lobby.list(NEW_TTL_MS + 1)
    expect(Object.keys(lobby.state.rooms)).not.toContain(lost.id)
    expect(Object.keys(lobby.state.rooms)).toContain(busy.id)
  })

  it('adds back a room it does not know when the room says it is open or busy (with its name), but not when it is gone', () => {
    const lobby = new LobbyCore()
    lobby.set({ id: 'KQ7X', state: 'open', name: 'ROCK', at: 5 })
    expect(lobby.list(10)).toEqual([{ id: 'KQ7X', name: 'ROCK' }])
    lobby.set({ id: 'MMMM', state: 'gone' })
    expect(Object.keys(lobby.state.rooms)).toEqual(['KQ7X'])
    lobby.set({ id: 'KQ7X', state: 'gone' })
    expect(lobby.list(10)).toEqual([])
  })

  it('keeps its whole state as plain JSON, so it can be stored and built again', () => {
    const lobby = new LobbyCore()
    const r = lobby.create({ name: 'rock', now: 0 })
    lobby.set({ id: r.id, state: 'open' })
    const again = new LobbyCore(JSON.parse(JSON.stringify(lobby.state)))
    expect(again.list(0)).toEqual([{ id: r.id, name: 'ROCK' }])
    expect(again.create({ name: 'rock', now: 0 }).name).toBe('ROCK 2')
  })
})
