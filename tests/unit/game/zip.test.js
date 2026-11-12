import { describe, it, expect } from 'vitest'
import { twoPlayers } from '../../harness/game.js'

const realWait = (ms) => new Promise((r) => setTimeout(r, ms))

describe('compressed game state', () => {
  it('when both browsers can gzip, the host sends the state compressed and the guest still sees the game', async () => {
    const g = await twoPlayers({ zip: true, until: 'select' })
    for (let i = 0; i < 30; i++) {
      await g.tick(1)
      await realWait(2) // gzip runs outside the game step
    }
    expect(g.host.zz.net.zip).toBe(true)
    g.guest.tap('ArrowRight')
    for (let i = 0; i < 30 && g.guest.zz.sel[1].char !== 2; i++) {
      await g.tick(1)
      await realWait(2)
    }
    expect(g.zz.sel[1].char).toBe(2)
    expect(g.guest.zz.sel[1].char).toBe(2) // the guest got it through a compressed message
  })

  it('without gzip in the guest browser the host sends plain state', async () => {
    const g = await twoPlayers({ until: 'select' })
    await g.tick(10)
    expect(g.host.zz.net.zip).toBe(false)
  })
})
