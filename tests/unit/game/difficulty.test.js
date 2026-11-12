import { describe, it, expect } from 'vitest'
import { twoPlayers, onePlayer } from '../../harness/game.js'

describe('enemy strength at spawn', () => {
  it('with 2 fighting players a punk gets x1.5 health and damage, a boss x2.5', async () => {
    const g = await twoPlayers()
    const punk = g.zz.spawn('punk', 1)
    expect([punk.maxHp, punk.dmul]).toEqual([51, 1.5]) // 34 x 1.5
    const robot = g.zz.spawn('boss', 1)
    expect([robot.maxHp, robot.dmul]).toEqual([600, 2.5]) // 240 x 2.5
    const louca = g.zz.spawn('louca', -1)
    expect([louca.maxHp, louca.dmul, louca.mpBoss]).toEqual([300, 2.5, true])
  })

  it('a 1-player spawn is unchanged', async () => {
    const { zz } = await onePlayer()
    const punk = zz().spawn('punk', 1)
    expect([punk.maxHp, punk.dmul ?? 1]).toEqual([34, 1])
  })
})
