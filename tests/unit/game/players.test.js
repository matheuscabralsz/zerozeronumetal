import { describe, it, expect } from 'vitest'
import { onePlayer, place, stepUntil } from '../../harness/game.js'

describe('players list and inputs (1 player, nothing must change)', () => {
  it('a 1-player game has one player in players, slot 0, the same object as player', async () => {
    const { zz } = await onePlayer()
    expect(zz().players.length).toBe(1)
    expect(zz().players[0]).toBe(zz().player)
    expect(zz().players[0].slot).toBe(0)
    expect(zz().stage).toBe(1)
  })

  it('both key sets move the one player, and input(0) shows the held key', async () => {
    const { dev, tick, zz } = await onePlayer()
    for (const t of zz().trigs) t.x = 1e9
    const x0 = zz().player.x
    dev.down('KeyD')
    await tick(1)
    expect(zz().input(0).held.right).toBe(1)
    await tick(9)
    dev.up('KeyD')
    const x1 = zz().player.x
    expect(x1).toBeGreaterThan(x0)
    dev.down('ArrowRight')
    await tick(10)
    dev.up('ArrowRight')
    expect(zz().player.x).toBeGreaterThan(x1)
  })

  it('a punk punch still takes 6 HP from the only player on stage 1', async () => {
    const { tick, zz } = await onePlayer()
    for (const t of zz().trigs) t.x = 1e9
    const p = zz().player
    place(p, 300, 220)
    p.inv = 0
    p.facing = 1
    const e = zz().spawn('punk', 1)
    place(e, 318, 220)
    e.facing = -1
    e.stunT = 0
    const hp = p.hp
    zz().attack(e, 'ePunch')
    expect(await stepUntil(tick, () => p.hp < hp, 60)).toBe(true)
    expect(hp - p.hp).toBe(6)
  })
})
