// Online co-op (2 players). Each test name is one business decision approved by the user.
// The rule and the reason for each decision: .specs/online-coop/DECISIONS.md
// Test hooks and screens the game must offer: the CONTRACT in tests/harness/game.js

import { describe, it, expect } from 'vitest'
import { device, onePlayer, twoPlayers, charIndex, place, stepUntil, pickRoom } from './harness/game.js'
import { seededRandom } from './harness/browser.js'
import { createMemoryServer } from '../server/memory-server.js'

// Each block below holds the helpers of one group of tests. The test groups are put
// together at the end of the file, in the approved order.
const GROUP = {}

// ──────────────────────────────────────────────────────────────────────
{
  // Draft: test bodies for the title menu, the select/stage screens and the rooms.
  // The helpers below are shared by both files (copy them into each file, or move them to a
  // small shared helper module next to tests/harness/game.js).

  // ───────────────────────────── shared helpers ─────────────────────────────

  const MENU = ['1 JOGADOR', 'CRIAR SALA', 'ENTRAR NA SALA']
  const MSG = {
    waiting2: 'ESPERANDO JOGADOR 2...',
    waiting1: 'ESPERANDO JOGADOR 1...',
    notFound: 'SALA NÃO ENCONTRADA',
    full: 'SALA CHEIA',
    started: 'JOGO JÁ COMEÇOU',
    version: 'VERSÃO DIFERENTE — RECARREGUE A PÁGINA',
    noServer: 'SEM CONEXÃO COM O SERVIDOR',
    limit: 'MODO ONLINE ESGOTADO HOJE — TENTE AMANHÃ',
    closed: 'JOGADOR 1 SAIU — SALA FECHADA',
    noRooms: 'NENHUMA SALA ABERTA',
  }
  const GAME_URL = 'wss://zerozeronumetal.pages.dev'

  const settle = () => new Promise((r) => setImmediate(r))

  /** n steps of any devices on one room server, messages delivered after each step (like g.tick).
   *  A device closed with g.closeGame() is skipped. */
  function ticker(server, devs) {
    return async (n = 1) => {
      for (let i = 0; i < n; i++) {
        for (const d of devs) if (!d.closed) d.zz.step()
        server.deliver()
        await settle()
        server.deliver()
      }
    }
  }

  /** Like the tick, and the room server clock moves n/60 seconds with the steps (like g.wait). */
  function waiter(server, tick) {
    return async (n) => {
      for (let i = 0; i < n; i++) {
        server.advance(1000 / 60)
        await tick(1)
      }
    }
  }

  /** Steps until cond() is true; fails the test with `what` (a text, or a function giving one)
   *  if it does not happen within max steps. */
  async function reach(tick, cond, what, max = 600) {
    if (await stepUntil(tick, cond, max)) return
    throw new Error('did not happen within ' + max + ' steps: ' + (typeof what === 'function' ? what() : what))
  }

  /** A room server with n fresh devices on it. */
  function lobby(random, n = 2) {
    const server = createMemoryServer({ random })
    const devs = Array.from({ length: n }, (_, i) => device({ seed: i + 1, server }))
    return { server, devs, tick: ticker(server, devs) }
  }

  /** The room server as one device sees it, recording every URL the device asks for.
   *  otherVersion: the device says it runs another game version (v=OTHER-<its version>). */
  function netSpy(server, { otherVersion = false } = {}) {
    const urls = []
    return {
      urls,
      WebSocketFor(win) {
        const Base = server.WebSocketFor(win)
        return class extends Base {
          constructor(url, ...rest) {
            let u = String(url)
            if (otherVersion) u = u.replace(/([?&]v=)([^&]*)/, (_, k, v) => k + 'OTHER-' + v)
            urls.push(u)
            super(u, ...rest)
          }
        }
      },
      fetchFor(win) {
        const f = server.fetchFor(win)
        return (url, ...rest) => {
          urls.push(String(url))
          return f(url, ...rest)
        }
      },
    }
  }

  /** The element and all its parents are shown. */
  function visible(el) {
    const win = el.ownerDocument.defaultView
    for (let e = el; e; e = e.parentElement) {
      const cs = win.getComputedStyle(e)
      if (e.hidden || cs.display === 'none' || cs.visibility === 'hidden') return false
    }
    return true
  }

  /** Texts the player sees now: drawn on the canvas in one frame, or in a shown page element. */
  function screenTexts(dev) {
    const out = dev.render()
    const doc = dev.win.document
    const walker = doc.createTreeWalker(doc.body, dev.win.NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || ['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName)) continue
      if (n.textContent.trim() && visible(el)) out.push(n.textContent)
    }
    return out
  }

  /** Is the text on this device's screen within ~1 second? (texts may blink)
   *  For a "NOT shown" check, false means it was not there in any of those frames. */
  async function seen(tick, dev, s, steps = 64) {
    for (let i = 0; i < steps; i++) {
      if (screenTexts(dev).some((t) => t.includes(s))) return true
      await tick(1)
    }
    return false
  }

  const nameBox = (dev) => dev.win.document.getElementById('roomName')
  /** The suggested-name buttons under the room name box. */
  const sugButtons = (dev) => [...dev.win.document.querySelectorAll('.roomSug')]
  /** The text boxes the player can see now. */
  const shownBoxes = (dev) => [...dev.win.document.querySelectorAll('input, textarea')].filter(visible)

  /** Choose a title menu entry with ▲▼ and ENTER, like a player. */
  async function choose(dev, tick, label) {
    const want = dev.zz.menu.items.indexOf(label)
    expect(want, 'title menu entry ' + label).toBeGreaterThanOrEqual(0)
    for (let n = 0; n < 6 && dev.zz.menu.sel !== want; n++) {
      dev.tap(dev.zz.menu.sel < want ? 'ArrowDown' : 'ArrowUp')
      await tick(1)
    }
    expect(dev.zz.menu.sel).toBe(want)
    dev.tap('Enter')
    await tick(1)
  }

  /** CRIAR SALA: the room name screen is open. */
  async function openName(dev, tick) {
    await choose(dev, tick, 'CRIAR SALA')
    await reach(tick, () => dev.zz.scene === 'name', 'the room name screen', 300)
  }

  /** CRIAR SALA with a typed name (or the suggested name when `typed` is not given), ENTER.
   *  Returns the room's hidden id (`code`) and its final name. */
  async function hostRoom(dev, tick, typed) {
    await openName(dev, tick)
    if (typed != null) {
      dev.clearName()
      dev.typeName(typed)
    }
    dev.submitName()
    await reach(tick, () => dev.zz.scene === 'room' && !!dev.zz.net.code, 'the room on the creator', 300)
    return { code: dev.zz.net.code, name: dev.zz.net.name }
  }

  /** ENTRAR NA SALA: the room list is on screen and has loaded. */
  async function openList(dev, tick) {
    await choose(dev, tick, 'ENTRAR NA SALA')
    await reach(tick, () => dev.zz.scene === 'join' && dev.zz.rooms.loaded, 'the room list', 300)
  }

  /** The room names in this device's list, top to bottom. */
  const listNames = (dev) => dev.zz.rooms.items.map((r) => r.name)

  /** ENTRAR NA SALA, pick the room `name`, ENTER. */
  async function joinRoom(dev, tick, name) {
    await openList(dev, tick)
    await pickRoom(dev, name, tick)
    await tick(2)
  }

  /** The room `name` is not in a freshly opened list, nor after its next update, nor on screen. */
  async function expectNotListed(dev, tick, name) {
    await openList(dev, tick)
    expect(listNames(dev)).not.toContain(name)
    await tick(130) // one more update of the list
    expect(listNames(dev)).not.toContain(name)
    expect(await seen(tick, dev, name)).toBe(false)
  }

  /** A raw join with a room's hidden id (as a stale list would do); returns the first message. */
  async function rawJoin(server, win, id, version) {
    const WS = server.WebSocketFor(win)
    const ws = new WS(`${GAME_URL}/api/room/${id}?v=${encodeURIComponent(version)}`)
    const got = []
    ws.onmessage = (e) => got.push(JSON.parse(e.data))
    server.deliver()
    await settle()
    server.deliver()
    ws.close()
    server.deliver()
    return got[0]
  }

  /** The device ends up showing `msg` (netMsg, and on the screen). */
  async function expectMsg(tick, dev, msg, max = 180) {
    await stepUntil(tick, () => dev.zz.netMsg === msg, max)
    expect(dev.zz.netMsg).toBe(msg)
    expect(await seen(tick, dev, msg)).toBe(true)
  }

  // 1 player

  /** From the select screen into the game, with ENTER only (1 player). */
  async function selectToPlay(dev, tick) {
    await tick(12)
    dev.tap('Enter')
    await reach(tick, () => dev.zz.scene === 'mut', 'the stage screen', 60)
    await tick(25)
    dev.tap('Enter')
    await reach(tick, () => dev.zz.scene === 'story', 'the story', 60)
    dev.tap('Enter') // the whole story text
    await tick(2)
    dev.tap('Enter') // start
    await reach(tick, () => dev.zz.scene === 'play', 'the game', 60)
  }

  /** 1 JOGADOR from the title, into the game. */
  async function playAlone(dev, tick) {
    await tick(1)
    dev.tap('Enter') // 1 JOGADOR is selected first
    await reach(tick, () => dev.zz.scene === 'select', 'the select screen', 60)
    await selectToPlay(dev, tick)
  }

  /** Hold a key for half a second; returns how far the fighter moved to the right. */
  async function walked(dev, tick, key, fighter) {
    const x0 = fighter().x
    dev.down(key)
    await tick(30)
    dev.up(key)
    await tick(1)
    return fighter().x - x0
  }

  // 2 players

  const tickOf = (g) => (n) => g.tick(n)
  const devOf = (g, slot) => (slot === 0 ? g.host : g.guest)

  /** Move a player's select cursor to a band member with ◄ ►, waiting for the host to apply each
   *  press and for both devices to agree. */
  async function moveTo(g, slot, id) {
    const want = charIndex(g.host, id)
    for (let n = 0; n < 20 && g.zz.sel[slot].char !== want; n++) {
      const before = g.zz.sel[slot].char
      devOf(g, slot).tap(before < want ? 'ArrowRight' : 'ArrowLeft')
      await reach(tickOf(g), () => g.zz.sel[slot].char !== before, 'the cursor of J' + (slot + 1) + ' moves', 30)
    }
    await reach(tickOf(g), () => [g.host, g.guest].every((d) => d.zz.sel[slot].char === want),
      'J' + (slot + 1) + ' cursor on ' + id + ' on both devices', 30)
  }

  /** The player presses ENTER on the select screen. */
  async function confirm(g, slot) {
    devOf(g, slot).tap('Enter')
    await g.tick(8)
  }

  /** Both players pick their band members; both devices reach the stage screen. */
  async function pickBoth(g, p1 = 'vocal', p2 = 'guitar') {
    await moveTo(g, 0, p1)
    await moveTo(g, 1, p2)
    await g.tick(15)
    await confirm(g, 0)
    await confirm(g, 1)
    await reach(tickOf(g), () => g.host.zz.scene === 'mut' && g.guest.zz.scene === 'mut', 'the stage screen on both devices', 120)
  }

  /** Player 1 confirms the stage on the stage screen; both devices show the story. */
  async function toStory(g) {
    await g.tick(25)
    g.host.tap('Enter')
    await reach(tickOf(g), () => g.host.zz.scene === 'story' && g.guest.zz.scene === 'story', 'the story on both devices', 60)
  }

  /** The player on `dev` presses ENTER every 10 steps until the shared scene is no longer `from`
   *  (nobody else presses anything). Returns the new scene, once both devices show it. */
  async function pressToLeave(g, dev, from, max = 80) {
    expect(g.host.zz.scene).toBe(from)
    for (let n = 0; n < max && g.host.zz.scene === from; n++) {
      dev.tap('Enter')
      await g.tick(10)
    }
    const to = g.host.zz.scene
    await reach(tickOf(g), () => g.guest.zz.scene === to, 'player 2 also sees ' + to, 60)
    return to
  }

  /** From the stage screen into the game (player 1 presses). */
  async function toPlay(g) {
    await toStory(g)
    await pressToLeave(g, g.host, 'story')
    await reach(tickOf(g), () => g.host.zz.scene === 'play' && g.guest.zz.scene === 'play', 'play on both devices', 60)
  }

  /** Ends the stage the quick way: the fighters stand at the end of the street and every enemy
   *  that comes is taken away, until the band show starts on both devices. */
  async function winStage(g) {
    for (let n = 0; n < 3000 && g.zz.scene === 'play'; n++) {
      for (const p of g.zz.players) if (!p.out && !p.left) place(p, 3480, 215)
      g.zz.enemies.splice(0)
      await g.tick(1)
    }
    await reach(tickOf(g), () => g.host.zz.scene === 'show' && g.guest.zz.scene === 'show', 'the band show on both devices', 120)
  }

  /** Both fighters lose their last life: each takes one punk punch on 1 HP with no lives left. */
  async function knockOutBoth(g) {
    const zz = g.zz
    zz.players.forEach((p, k) => {
      place(p, zz.cam + 100 + 150 * k, 215)
      Object.assign(p, { lives: 0, hp: 1, inv: 0 })
      const e = zz.spawn('punk', 1) ?? zz.enemies.at(-1)
      place(e, p.x + 14, p.y)
      e.facing = -1
      zz.attack(e, 'ePunch')
    })
    await reach(tickOf(g), () => g.host.zz.scene === 'gameover' && g.guest.zz.scene === 'gameover', 'game over on both devices', 400)
  }

  /** Player 1 waits in the room with its name on screen, the room has one free place, and it is
   *  in the room list. */
  async function expectWaiting(g) {
    const tick = tickOf(g)
    expect(g.host.zz.scene).toBe('room')
    expect(g.host.zz.net).toMatchObject({ code: g.code, name: g.name })
    expect(await seen(tick, g.host, g.name)).toBe(true)
    expect(await seen(tick, g.host, MSG.waiting2)).toBe(true)
    expect(g.server.rooms()).toEqual([expect.objectContaining({ code: g.code, name: g.name, started: false, slots: ['here', null] })])
    expect(g.server.list()).toEqual([{ id: g.code, name: g.name }])
  }

  // ===== FILE: tests/multiplayer.integration.test.js =====

  GROUP['creating a room#menus'] = () => {
    it('creating a room makes the creator player 1 (host) and opens the room under the name the creator chose', async () => {
      const { server, devs: [a, friend], tick } = lobby(seededRandom(5))
      await tick(1)
      const r = await hostRoom(a, tick, 'rock')
      expect(r.name).toBe('ROCK')
      expect(a.zz.net).toMatchObject({ role: 'host', slot: 0, code: r.code, name: 'ROCK', peer: 'none' })
      expect(server.rooms()).toEqual([expect.objectContaining({ code: r.code, name: 'ROCK', started: false, slots: ['here', null] })])
      expect(server.list()).toEqual([{ id: r.code, name: 'ROCK' }])
      expect(await seen(tick, a, 'ROCK')).toBe(true)
      // the hidden id is never shown
      expect(screenTexts(a).join('|')).not.toContain(r.code)
      // the friend finds the room by its name
      await openList(friend, tick)
      expect(listNames(friend)).toEqual(['ROCK'])
      expect(await seen(tick, friend, 'ROCK')).toBe(true)
      expect(screenTexts(friend).join('|')).not.toContain(r.code)
    }, 60_000)
    it('CRIAR SALA suggests a room name: the creator can keep it, switch to another suggestion, or type their own name', async () => {
      const { server, devs: [a, b, c], tick } = lobby(seededRandom(6), 3)
      await tick(1)
      // keep: the box starts with the first of 3 different suggestions, selected
      await openName(a, tick)
      const box = nameBox(a)
      expect(visible(box)).toBe(true)
      const sugs = sugButtons(a).map((x) => x.textContent.trim())
      expect(sugs).toHaveLength(3)
      expect(new Set(sugs).size).toBe(3)
      for (const n of sugs) expect(n).toMatch(/^[A-ZÀ-ÖØ-Þ0-9 ]{1,16}$/)
      expect(box.value).toBe(sugs[0])
      expect([box.selectionStart, box.selectionEnd]).toEqual([0, sugs[0].length])
      a.submitName()
      await reach(tick, () => a.zz.scene === 'room' && !!a.zz.net.name, 'the room of a', 300)
      expect(a.zz.net.name).toBe(sugs[0])

      // switch: ▼ in the box puts another suggestion in; a tap on a suggestion button puts that one in
      await openName(b, tick)
      const first = nameBox(b).value
      b.nameKey('ArrowDown')
      await tick(1)
      expect(nameBox(b).value).not.toBe(first)
      expect(nameBox(b).value).not.toBe('')
      b.nameKey('ArrowUp')
      await tick(1)
      expect(nameBox(b).value).toBe(first)
      const pick = sugButtons(b).find((x) => x.textContent.trim() !== first && x.textContent.trim() !== sugs[0])
      b.click(pick)
      await tick(1)
      expect(nameBox(b).value).toBe(pick.textContent.trim())
      expect(b.zz.scene).toBe('name') // a suggestion only fills the box
      b.click(b.win.document.getElementById('roomGo')) // CRIAR
      await reach(tick, () => b.zz.scene === 'room' && !!b.zz.net.name, 'the room of b', 300)
      expect(b.zz.net.name).toBe(pick.textContent.trim())

      // type: typing replaces the selected suggestion
      await openName(c, tick)
      c.typeName('Garagem do Zé')
      c.submitName()
      await reach(tick, () => c.zz.scene === 'room' && !!c.zz.net.name, 'the room of c', 300)
      expect(c.zz.net.name).toBe('GARAGEM DO ZÉ')
      expect(server.list().map((r) => r.name)).toEqual(['GARAGEM DO ZÉ', pick.textContent.trim(), sugs[0]])
      // the name screen and its box are gone once the room is made
      for (const d of [a, b, c]) expect(shownBoxes(d)).toEqual([])
    }, 60_000)

    it('a room name keeps only letters, numbers and spaces, is cut to 16 characters and shown in capital letters, and an empty name gets the suggested name', async () => {
      const { server, devs: [a, b, c, friend], tick } = lobby(seededRandom(7), 4)
      await tick(1)
      expect((await hostRoom(a, tick, '  sala   do João!!  ')).name).toBe('SALA DO JOÃO')
      expect((await hostRoom(b, tick, 'a very long room name 123')).name).toBe('A VERY LONG ROOM')
      // nothing usable typed: the suggested name
      await openName(c, tick)
      const suggested = nameBox(c).value
      c.clearName()
      c.typeName('  !!?  ')
      c.submitName()
      await reach(tick, () => c.zz.scene === 'room' && !!c.zz.net.name, 'the room of c', 300)
      expect(c.zz.net.name).toBe(suggested)
      // shown in capital letters, on the creator's screen and in the friend's list
      expect(await seen(tick, a, 'SALA DO JOÃO')).toBe(true)
      await openList(friend, tick)
      expect(listNames(friend)).toEqual([suggested, 'A VERY LONG ROOM', 'SALA DO JOÃO'])
      for (const n of listNames(friend)) expect(await seen(tick, friend, n)).toBe(true)
      // the room server cleans the name too (a page that skips the rules gets the same result)
      const WS = server.WebSocketFor(friend.win)
      new WS(`${GAME_URL}/api/room/new?v=${encodeURIComponent(friend.zz.version)}&name=${encodeURIComponent('<b>hi</b>  💀 ok_ok ' + 'x'.repeat(30))}`)
      server.deliver()
      expect(server.rooms().map((r) => r.name)).toContain('BHIB OKOK XXXXXX')
    }, 60_000)
    it('two rooms can NOT have the same name: the second one gets a number added (ROCK, then ROCK 2)', async () => {
      const { server, devs: [a, b, c, d, e], tick } = lobby(seededRandom(8), 5)
      await tick(1)
      expect((await hostRoom(a, tick, 'rock')).name).toBe('ROCK')
      expect((await hostRoom(b, tick, 'Rock')).name).toBe('ROCK 2')
      expect((await hostRoom(c, tick, 'ROCK')).name).toBe('ROCK 3')
      expect(await seen(tick, b, 'ROCK 2')).toBe(true)
      // a 16-character name stays at 16 characters
      expect((await hostRoom(d, tick, 'abcdefghijklmnop')).name).toBe('ABCDEFGHIJKLMNOP')
      expect((await hostRoom(e, tick, 'abcdefghijklmnop')).name).toBe('ABCDEFGHIJKLMN 2')
      expect(server.list().map((r) => r.name)).toEqual(['ABCDEFGHIJKLMN 2', 'ABCDEFGHIJKLMNOP', 'ROCK 3', 'ROCK 2', 'ROCK'])
      // when ROCK closes, its name is free again
      a.tap('Escape')
      await reach(tick, () => a.zz.scene === 'title' && !server.rooms().some((r) => r.name === 'ROCK'), 'ROCK closed', 60)
      expect((await hostRoom(a, tick, 'rock')).name).toBe('ROCK')
    }, 60_000)

    it('while waiting for the friend, the room stays open and in the list when the creator switches to another app or loses the connection for a moment', async () => {
      const g = await twoPlayers({ until: 'room' })
      const tick = tickOf(g)
      // another app for 40 s (much more than the 15 s a dropped player gets in a game)
      g.host.setHidden(true)
      await g.wait(60 * 40)
      g.host.setHidden(false)
      await g.tick(5)
      await expectWaiting(g)
      // no connection for 40 s: the room stays in the list; when the network is back, the same room again
      await g.offline(g.host, true)
      await g.wait(60 * 40)
      expect(g.server.rooms().map((r) => r.code)).toEqual([g.code])
      expect(g.server.list()).toEqual([{ id: g.code, name: g.name }])
      await g.offline(g.host, false)
      await reach(tick, () => g.server.rooms()[0]?.slots[0] === 'here', 'the creator is back in the room', 180)
      await expectWaiting(g)
      // a friend who comes while the creator is away finds the room and waits for the creator
      await g.offline(g.host, true)
      await g.wait(60 * 5)
      await joinRoom(g.guest, tick, g.name)
      await g.tick(10)
      expect(g.guest.zz.scene).toBe('join')
      expect(await seen(tick, g.guest, MSG.waiting1)).toBe(true)
      await g.offline(g.host, false)
      await reach(tick, () => g.host.zz.scene === 'select' && g.guest.zz.scene === 'select', 'both on the select screen', 240)
      expect(g.server.rooms()).toEqual([expect.objectContaining({ code: g.code, slots: ['here', 'here'] })])
    }, 60_000)
  }
  GROUP['joining a room#menus'] = () => {
    it('ENTRAR NA SALA shows the names of all rooms that wait for player 2, newest first, and the list updates by itself (about every 2 seconds); with no such room it shows \'NENHUMA SALA ABERTA\'', async () => {
      const { server, devs: [a, b, c, friend], tick } = lobby(seededRandom(9), 4)
      await tick(1)
      // no room yet
      await openList(friend, tick)
      expect(listNames(friend)).toEqual([])
      expect(await seen(tick, friend, MSG.noRooms)).toBe(true)
      // two rooms are made while the list is open: they appear by themselves, newest first
      await hostRoom(a, tick, 'rock')
      await hostRoom(b, tick, 'metal')
      await reach(tick, () => listNames(friend).length === 2, 'both rooms in the open list', 150)
      expect(listNames(friend)).toEqual(['METAL', 'ROCK'])
      expect(await seen(tick, friend, 'METAL')).toBe(true)
      expect(await seen(tick, friend, 'ROCK')).toBe(true)
      expect(await seen(tick, friend, MSG.noRooms)).toBe(false)
      // the selected room stays selected when the list changes
      friend.tap('ArrowDown')
      await tick(1)
      expect(friend.zz.rooms.items[friend.zz.rooms.sel].name).toBe('ROCK')
      await hostRoom(c, tick, 'punk')
      await reach(tick, () => listNames(friend).length === 3, 'PUNK in the open list', 150)
      expect(listNames(friend)).toEqual(['PUNK', 'METAL', 'ROCK'])
      expect(friend.zz.rooms.items[friend.zz.rooms.sel].name).toBe('ROCK')
      // a room that closes leaves the open list by itself
      a.tap('Escape')
      await reach(tick, () => !listNames(friend).includes('ROCK'), 'ROCK leaves the list', 150)
      expect(listNames(friend)).toEqual(['PUNK', 'METAL'])
      expect(friend.zz.rooms.sel).toBeLessThan(2)
      // about every 2 seconds: no more than 2 list updates in 4 seconds
      const asked = server.listAsks()
      await tick(240)
      expect(server.listAsks() - asked).toBeGreaterThanOrEqual(1)
      expect(server.listAsks() - asked).toBeLessThanOrEqual(3)
    }, 60_000)
    it('a friend who picks a room from the list joins it as player 2 (guest), with no code or password', async () => {
      const g = await twoPlayers({ until: 'room' })
      const tick = tickOf(g)
      await openList(g.guest, tick)
      expect(shownBoxes(g.guest)).toEqual([]) // nothing to type
      await pickRoom(g.guest, g.name, tick)
      await reach(tick, () => g.host.zz.scene === 'select' && g.guest.zz.scene === 'select', 'both on the select screen', 120)
      expect(g.guest.zz.net).toMatchObject({ role: 'guest', slot: 1, code: g.code, name: g.name, peer: 'here' })
      expect(g.host.zz.net).toMatchObject({ role: 'host', slot: 0, code: g.code, name: g.name, peer: 'here' })
      expect(g.server.rooms()).toEqual([expect.objectContaining({ code: g.code, started: false, slots: ['here', 'here'] })])
      for (const dev of [g.host, g.guest]) expect(dev.zz.sel).toHaveLength(2)
    }, 60_000)

    it('a full room is NOT in the list, and a player who picks a room just as it becomes full sees \'SALA CHEIA\'', async () => {
      {
        const g = await twoPlayers({ until: 'select' }) // 2 players in, the game has not started
        const third = device({ seed: 3, server: g.server })
        const tick = ticker(g.server, [g.host, g.guest, third])
        await tick(1)
        expect(g.server.list()).toEqual([])
        await expectNotListed(third, tick, g.name)
        expect(await seen(tick, third, MSG.noRooms)).toBe(true)
      }
      // the list of a third player still shows the room when the friend gets in first
      const { server, devs: [host, friend, third], tick } = lobby(seededRandom(10), 3)
      await tick(1)
      const { name } = await hostRoom(host, tick, 'rock')
      await openList(friend, tick)
      await openList(third, tick)
      expect(listNames(third)).toEqual(['ROCK'])
      await pickRoom(friend, name, tick)
      await reach(tick, () => server.rooms()[0]?.slots[1] === 'here', 'the friend is in', 30)
      expect(listNames(third)).toEqual(['ROCK']) // not updated yet
      third.tap('Enter')
      await expectMsg(tick, third, MSG.full)
      expect(third.zz.scene).toBe('join') // still on the list
      expect(third.zz.net.role).toBe('off')
      await reach(tick, () => !listNames(third).includes('ROCK'), 'the full room leaves the list', 150)
      expect(server.rooms()).toEqual([expect.objectContaining({ name: 'ROCK', started: false, slots: ['here', 'here'] })])
      // the two players in the room are not disturbed
      await reach(tick, () => host.zz.scene === 'select' && friend.zz.scene === 'select', 'both on the select screen', 120)
      expect([host.zz.net.peer, friend.zz.net.peer]).toEqual(['here', 'here'])
    }, 60_000)

    it('a started game is NOT in the list and nobody new can join it, even after player 2 (guest) has left', async () => {
      const g = await twoPlayers({ until: 'room' })
      const late1 = device({ seed: 3, server: g.server })
      const tickAll = ticker(g.server, [g.host, g.guest, late1])
      await tickAll(1)
      await openList(late1, tickAll)
      expect(listNames(late1)).toEqual([g.name])
      // player 2 joins and both confirm band members: the game has started (late1's screen waits meanwhile)
      await joinRoom(g.guest, tickOf(g), g.name)
      await reach(tickOf(g), () => g.host.zz.scene === 'select' && g.guest.zz.scene === 'select', 'both on the select screen', 120)
      await pickBoth(g)
      await reach(tickOf(g), () => g.server.rooms()[0]?.started === true, 'the room knows the game started', 60)
      expect(g.server.list()).toEqual([])
      // late1 still shows the old list and picks the room
      expect(listNames(late1)).toEqual([g.name])
      late1.tap('Enter')
      await expectMsg(tickAll, late1, MSG.started)
      expect(late1.zz.scene).toBe('join')
      expect(late1.zz.net.role).toBe('off')
      await reach(tickAll, () => !listNames(late1).includes(g.name), 'the started game leaves the list', 150)
      expect(g.server.rooms()[0].slots).toEqual(['here', 'here'])
      // player 2 leaves during the stage; player 1 plays on alone, and the room is still not listed
      await toPlay(g)
      await g.leaveRoom(g.guest)
      await reach(tickOf(g), () => g.zz.players[1].left === true, 'player 2 has left', 120)
      expect(g.server.rooms()).toEqual([expect.objectContaining({ code: g.code, started: true, slots: ['here', null] })])
      expect(g.server.list()).toEqual([])
      const late2 = device({ seed: 4, server: g.server })
      const tick2 = ticker(g.server, [g.host, late2])
      await tick2(1)
      await expectNotListed(late2, tick2, g.name)
      // even with the room's hidden id (as a stale list would use), nobody new gets in
      expect(await rawJoin(g.server, late2.win, g.code, late2.zz.version)).toEqual({ t: 'err', code: 'started' })
      expect(g.server.rooms()[0].slots).toEqual(['here', null])
      expect(g.host.zz.scene).toBe('play')
    }, 60_000)
    it('a player who picks a room that closed a moment ago sees \'SALA NÃO ENCONTRADA\', stays on the list, and NO room is created', async () => {
      const g = await twoPlayers({ until: 'room' })
      const tick = tickOf(g)
      await openList(g.guest, tick)
      expect(listNames(g.guest)).toEqual([g.name])
      // the creator cancels; the friend's list is not updated yet, and the friend picks the room
      g.host.tap('Escape')
      await reach(tick, () => g.server.rooms().length === 0, 'the room closed', 30)
      expect(listNames(g.guest)).toEqual([g.name])
      g.guest.tap('Enter')
      await expectMsg(tick, g.guest, MSG.notFound)
      expect(g.guest.zz.scene).toBe('join')
      expect(g.guest.zz.net.role).toBe('off')
      expect(g.server.rooms()).toEqual([]) // no new room
      await reach(tick, () => listNames(g.guest).length === 0, 'the closed room leaves the list', 150)
      expect(await seen(tick, g.guest, MSG.noRooms)).toBe(true)
      // a new room of the creator shows up and can be joined
      const { name } = await hostRoom(g.host, tick, 'outra')
      await pickRoom(g.guest, name, tick)
      await reach(tick, () => g.host.zz.scene === 'select' && g.guest.zz.scene === 'select', 'both on the select screen', 120)
    }, 60_000)

    it('a player with a different game version can NOT join and is asked to reload the page', async () => {
      const server = createMemoryServer({ random: seededRandom(12) })
      const spy = netSpy(server, { otherVersion: true })
      const host = device({ seed: 1, server })
      const friend = device({ seed: 2, server: spy }) // this browser runs another version of the game
      const tick = ticker(server, [host, friend])
      await tick(1)
      const { code, name } = await hostRoom(host, tick)
      // the room is in the list of the other version too
      await openList(friend, tick)
      expect(listNames(friend)).toEqual([name])
      await pickRoom(friend, name, tick)
      await expectMsg(tick, friend, MSG.version)
      // the friend really asked to join with another version
      expect(spy.urls.some((u) => u.includes('/api/room/') && /[?&]v=OTHER-/.test(u))).toBe(true)
      expect(friend.zz.scene).toBe('join')
      expect(friend.zz.net.role).toBe('off')
      expect(server.rooms()).toEqual([expect.objectContaining({ code, slots: ['here', null] })])
      expect(host.zz.scene).toBe('room')
    }, 60_000)
  }
  GROUP['leaving, dropping and closing#menus'] = () => {
    it('when player 2 (guest) leaves before the game starts, player 1 (host) waits again and the room is back in the list', async () => {
      const g = await twoPlayers({ until: 'select' })
      const friend2 = device({ seed: 3, server: g.server })
      const tick = ticker(g.server, [g.host, g.guest, friend2])
      const wait = waiter(g.server, tick)
      expect(g.server.list()).toEqual([])
      // player 2 closes the game on the select screen
      await g.closeGame(g.guest)
      await wait(60 * 16)
      await reach(tick, () => g.host.zz.scene === 'room', 'player 1 waits again', 120)
      await expectWaiting(g)
      // another friend finds the room in the list, joins, then has no connection for more than 15 s
      await joinRoom(friend2, tick, g.name)
      await reach(tick, () => g.host.zz.scene === 'select' && friend2.zz.scene === 'select', 'player 1 and the new friend on the select screen', 120)
      expect(g.server.list()).toEqual([])
      g.server.offline(friend2.win, true)
      await wait(60 * 16)
      await reach(tick, () => g.host.zz.scene === 'room', 'player 1 waits again', 120)
      await expectWaiting(g)
    }, 60_000)

    it('when player 1 (host) cancels or leaves before the game starts, the room closes and leaves the list, and player 2 (guest) goes back to the title', async () => {
      // CANCELAR (ESC) on the waiting screen
      const a = await twoPlayers({ until: 'room' })
      a.host.tap('Escape')
      await reach(tickOf(a), () => a.host.zz.scene === 'title', 'the creator back on the title', 60)
      expect(a.server.rooms()).toEqual([])
      expect(a.server.list()).toEqual([])
      await expectNotListed(a.guest, tickOf(a), a.name)

      // after the friend joined: player 1 closes the game, or has no connection for more than 15 s
      for (const how of ['close', 'offline']) {
        const g = await twoPlayers({ until: 'select' })
        const tick = tickOf(g)
        if (how === 'close') await g.closeGame(g.host)
        else await g.offline(g.host, true)
        await g.wait(60 * 16)
        await reach(tick, () => g.guest.zz.scene === 'title', 'player 2 back on the title (' + how + ')', 120)
        expect(g.guest.zz.netMsg).toBe(MSG.closed)
        expect(await seen(tick, g.guest, MSG.closed)).toBe(true)
        expect(g.server.rooms()).toEqual([])
        expect(g.server.list()).toEqual([])
        await expectNotListed(g.guest, tick, g.name)
      }
    }, 60_000)

    it('a player whose connection drops can come back within 15 seconds with the same fighter, lives, money and level, but NOT after that', async () => {
      const g = await twoPlayers({ p1: 'vocal', p2: 'guitar' })
      const tick = tickOf(g)
      const j2 = () => g.zz.players[1]
      const facts = (p) => ({ look: p.look.pix, lives: p.lives, hp: p.hp, money: p.money, lvl: p.lvl })
      Object.assign(j2(), { lives: 2, hp: 55, money: 7.5, lvl: 3 })
      const before = { look: 'guitar', lives: 2, hp: 55, money: 7.5, lvl: 3 }
      await g.tick(5)
      expect(facts(g.guest.zz.players[1])).toEqual(before)

      // no connection for 10 s, then back
      await g.offline(g.guest, true)
      await g.wait(60 * 10)
      await g.offline(g.guest, false)
      await reach(tick, () => g.zz.net.peer === 'here' && g.zz.stop === null, 'player 2 is back and the game goes on', 180)
      expect(g.server.rooms()[0].slots).toEqual(['here', 'here'])
      expect(j2().left).toBeFalsy()
      for (const dev of [g.host, g.guest]) expect(facts(dev.zz.players[1])).toEqual(before)
      // ... and player 2 controls that same fighter again
      expect(await walked(g.guest, tick, 'ArrowRight', j2)).toBeGreaterThan(20)

      // no connection for more than 15 s: player 2 has left and can NOT come back
      await g.offline(g.guest, true)
      await g.wait(60 * 16)
      expect(j2().left).toBe(true)
      expect(g.zz.net.peer).toBe('left')
      await g.offline(g.guest, false)
      await g.wait(60 * 3) // the game tries to come back about once per second
      expect(g.server.rooms()).toEqual([expect.objectContaining({ code: g.code, slots: ['here', null] })])
      expect(j2().left).toBe(true)
      expect(g.zz.net.peer).toBe('left')
    }, 60_000)

    it('when both players have left, the room closes and is no longer in the list', async () => {
      const g = await twoPlayers()
      const tick = tickOf(g)
      await g.leaveRoom(g.guest)
      await reach(tick, () => g.zz.players[1].left === true, 'player 2 has left', 120)
      expect(g.server.rooms().map((r) => r.code)).toEqual([g.code]) // player 1 is still in it
      await g.closeGame(g.host)
      await g.wait(60 * 16)
      expect(g.server.rooms()).toEqual([])
      expect(g.server.list()).toEqual([])
      // a late friend: the room is not in the list, and its old id gives nothing (not 'JOGO JÁ COMEÇOU')
      const late = device({ seed: 3, server: g.server })
      const lateTick = ticker(g.server, [late])
      await lateTick(1)
      await expectNotListed(late, lateTick, g.name)
      expect(await rawJoin(g.server, late.win, g.code, late.zz.version)).toEqual({ t: 'err', code: 'not_found' })
      expect(g.server.rooms()).toEqual([])
    }, 60_000)
  }
  GROUP['when online play is not possible#menus'] = () => {
    it('when online play is not possible (no connection, or the daily limit is used up), CRIAR SALA and ENTRAR NA SALA show why and go back to the title', async () => {
      for (const [problem, msg] of [['down', MSG.noServer], ['limit', MSG.limit]]) {
        for (const entry of ['CRIAR SALA', 'ENTRAR NA SALA']) {
          const { server, devs: [dev], tick } = lobby(seededRandom(11), 1)
          server[problem](true)
          await tick(1)
          await choose(dev, tick, entry)
          await tick(30)
          // the game may open the name screen first; then the problem shows when the name is sent
          if (dev.zz.scene === 'name') dev.submitName()
          await reach(tick, () => dev.zz.scene === 'title' && dev.zz.netMsg === msg,
            () => `${entry} with '${problem}': back on the title with '${msg}' (now: ${dev.zz.scene}, '${dev.zz.netMsg}')`, 600)
          expect(await seen(tick, dev, msg)).toBe(true)
          expect(dev.zz.net.role).toBe('off')
          expect(server.rooms()).toEqual([])
          // 1 JOGADOR still works
          await choose(dev, tick, '1 JOGADOR')
          await reach(tick, () => dev.zz.scene === 'select', '1 JOGADOR after the message', 60)
        }
      }
    }, 60_000)
  }
}

// ──────────────────────────────────────────────────────────────────────
describe('creating a room', () => { GROUP['creating a room#menus']() })
describe('joining a room', () => { GROUP['joining a room#menus']() })
describe('leaving, dropping and closing', () => { GROUP['leaving, dropping and closing#menus']() })
describe('when online play is not possible', () => { GROUP['when online play is not possible#menus']() })
