import { describe, it, expect } from 'vitest'
import { onePlayer } from '../../harness/game.js'

// The host sends the whole game state as JSON; the guest rebuilds it (and can take the game over).
describe('game state codec', () => {
  it('keeps shared objects shared, sets as sets, and fixed game data as the same objects', async () => {
    const { zz } = await onePlayer()
    const boss = zz().spawn('boss', 1)
    const punk = zz().spawn('punk', -1)
    zz().attack(punk, 'ePunch') // starts with a new, empty hit set
    punk.hitSet.add(zz().player)
    const { state: s } = zz().codec.roundTrip()
    const sBoss = s.enemies.find((e) => e.type === 'boss')
    const sPunk = s.enemies.find((e) => e.type === 'punk')
    expect(s.bossRef).toBe(sBoss) // the boss is one object, in two places
    expect(Object.prototype.toString.call(sPunk.hitSet)).toBe('[object Set]') // a Set of the game's window
    expect(sPunk.hitSet.has(s.players[0])).toBe(true) // a set that points to the player
    expect(sPunk.atk).toBe(punk.atk) // attack data is the game's own table entry
    expect(s.players[0].look).toBe(zz().player.look) // band look: the game's own object
    expect(sBoss.hp).toBe(boss.hp)
    expect(s.scene).toBe('play')
  })

  it('gives a generated enemy look the same object in every snapshot (sprite cache)', async () => {
    const { zz } = await onePlayer()
    const punk = zz().spawn('punk', 1)
    const a = zz().codec.roundTrip().state.enemies.find((e) => e.type === 'punk')
    punk.x += 10
    const b = zz().codec.roundTrip().state.enemies.find((e) => e.type === 'punk')
    expect(a.look).toBe(b.look)
    expect(a.look.pix ?? a.look.top).toEqual(punk.look.pix ?? punk.look.top)
    expect(b.x).toBeCloseTo(punk.x, 2)
  })

  it('sends a look only once, and the state of a busy screen stays small', async () => {
    const { zz } = await onePlayer()
    for (let i = 0; i < 8; i++) zz().spawn(i % 2 ? 'punk' : 'garota', i % 2 ? 1 : -1)
    const first = zz().codec.roundTrip({ fresh: true })
    const second = zz().codec.roundTrip()
    expect(first.looksSent).toBeGreaterThanOrEqual(8)
    expect(second.looksSent).toBe(0)
    expect(second.size).toBeLessThan(20000)
  })
})
