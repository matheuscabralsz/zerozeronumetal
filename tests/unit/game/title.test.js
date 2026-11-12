import { describe, it, expect } from 'vitest'
import { device } from '../../harness/game.js'

describe('test hooks and title menu', () => {
  it('step() runs the game and render() draws the title menu with 1 JOGADOR first', async () => {
    const d = device()
    await d.step(2)
    expect(d.zz.scene).toBe('title')
    expect(d.zz.menu).toEqual({ items: ['1 JOGADOR', 'CRIAR SALA', 'ENTRAR NA SALA'], sel: 0 })
    const shown = d.render()
    for (const s of ['1 JOGADOR', 'CRIAR SALA', 'ENTRAR NA SALA']) expect(shown.join('|')).toContain(s)
  })

  it('down moves the menu cursor and wraps around', async () => {
    const d = device()
    await d.step(1)
    for (const want of [1, 2, 0]) {
      d.tap('ArrowDown')
      await d.step(1)
      expect(d.zz.menu.sel).toBe(want)
    }
  })

  it('ENTER on 1 JOGADOR opens the select screen at once, as today', async () => {
    const d = device()
    await d.step(1)
    d.tap('Enter')
    await d.step(1)
    expect(d.zz.scene).toBe('select')
    expect(d.zz.net.role).toBe('off')
  })

  it('M mutes only this device and is reported in muted', async () => {
    const d = device()
    await d.step(1)
    expect(d.zz.muted).toBe(false)
    d.tap('KeyM')
    expect(d.zz.muted).toBe(true)
  })
})
