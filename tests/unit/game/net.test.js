import { describe, it, expect } from 'vitest'
import { device, twoPlayers } from '../../harness/game.js'
import { createMemoryServer } from '../../../server/memory-server.js'
import { seededRandom } from '../../harness/browser.js'

const settle = () => new Promise((r) => setImmediate(r))
async function run(server, devs, n) {
  for (let i = 0; i < n; i++) {
    for (const d of devs) d.zz.step()
    server.deliver()
    await settle()
    server.deliver()
  }
}

describe('network client', () => {
  it('CRIAR SALA opens the room name screen with a suggested name; ENTER makes this device the host of a room with that name', async () => {
    const server = createMemoryServer({ random: seededRandom(3) })
    const d = device({ server })
    await run(server, [d], 1)
    d.tap('ArrowDown')
    await run(server, [d], 1)
    d.tap('Enter')
    await run(server, [d], 10)
    expect(d.zz.scene).toBe('name')
    const box = d.win.document.getElementById('roomName')
    const name = box.value
    expect(name.length).toBeGreaterThan(0)
    expect(server.rooms()).toEqual([]) // not before ENTER
    d.submitName()
    await run(server, [d], 10)
    expect(d.zz.scene).toBe('room')
    expect(d.zz.net).toMatchObject({ role: 'host', name })
    expect(d.zz.net.code).toMatch(/^[CDFGHJKMNPQRTVWX3479]{4}$/)
    expect(d.render().join('|')).toContain(name)
    expect(server.rooms()).toEqual([expect.objectContaining({ name, slots: ['here', null] })])
    expect(d.win.document.getElementById('roomForm').style.display).toBe('none')
  })

  it('ENTRAR NA SALA shows the room list from the server and joins the chosen room', async () => {
    const server = createMemoryServer({ random: seededRandom(4) })
    const host = device({ seed: 1, server })
    const friend = device({ seed: 2, server })
    await run(server, [host, friend], 1)
    host.tap('ArrowDown')
    await run(server, [host, friend], 1)
    host.tap('Enter')
    await run(server, [host, friend], 10)
    host.submitName()
    await run(server, [host, friend], 10)
    const name = host.zz.net.name
    friend.tap('ArrowUp') // from 1 JOGADOR up to the last entry: ENTRAR NA SALA
    await run(server, [host, friend], 1)
    friend.tap('Enter')
    await run(server, [host, friend], 10)
    expect(friend.zz.scene).toBe('join')
    expect(friend.zz.rooms).toMatchObject({ loaded: true, sel: 0, items: [{ id: host.zz.net.code, name }] })
    expect(friend.render().join('|')).toContain(name)
    friend.tap('Enter')
    await run(server, [host, friend], 10)
    expect(friend.zz.net).toMatchObject({ role: 'guest', slot: 1, name })
    expect(host.zz.scene).toBe('select')
  })

  it("player 2's keys move player 2's cursor on player 1's game", async () => {
    const g = await twoPlayers({ until: 'select' })
    await g.tick(12)
    const before = g.zz.sel[1].char
    g.guest.tap('ArrowRight')
    await g.tick(3)
    expect(g.zz.sel[1].char).toBe((before + 1) % g.zz.chars.length)
    await g.tick(3) // the guest's copy arrives a step or two later
    expect(g.guest.zz.sel[1].char).toBe(g.zz.sel[1].char)
  })

  it('a 2-player game reaches play on both devices, and the guest sees the host state', async () => {
    const g = await twoPlayers()
    expect(g.zz.players.length).toBe(2)
    expect(g.guest.zz.players.length).toBe(2)
    await g.tick(4)
    expect(Math.round(g.guest.zz.players[0].x)).toBe(Math.round(g.zz.players[0].x))
  })
})
