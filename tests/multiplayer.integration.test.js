// Online co-op (2 players). Each test name is one business decision approved by the user.
// The rule and the reason for each decision: .specs/online-coop/DECISIONS.md
// Test hooks and screens the game must offer: the CONTRACT in tests/harness/game.js

import { describe, it, expect } from 'vitest'
import { device, onePlayer, twoPlayers, charIndex, place, stepUntil, pickRoom, W } from './harness/game.js'
import { seededRandom } from './harness/browser.js'
import { createMemoryServer } from '../server/memory-server.js'
import { DROP_GRACE_MS } from '../server/protocol.js'

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

  GROUP['title menu and waiting for a friend#menus'] = () => {
    it('the title screen shows 1 JOGADOR, CRIAR SALA and ENTRAR NA SALA, with 1 JOGADOR selected first', async () => {
      const dev = device()
      const tick = (n) => dev.step(n)
      await tick(1)
      expect(dev.zz.scene).toBe('title')
      expect(dev.zz.menu.items).toEqual(MENU)
      expect(dev.zz.menu.sel).toBe(0)
      for (const label of MENU) expect(await seen(tick, dev, label), label).toBe(true)
      // ENTER at once starts a 1-player game, as today
      dev.tap('Enter')
      await reach(tick, () => dev.zz.scene === 'select', 'the select screen', 30)
      expect(dev.zz.net.role).toBe('off')
    }, 60_000)

    it('a 1-player game does NOT connect to the room server and works with no internet', async () => {
      // A room server is there: the 1-player game never asks it anything (no socket, no ping).
      const server = createMemoryServer({ random: seededRandom(3) })
      const spy = netSpy(server)
      const dev = device({ server: spy })
      const tick = ticker(server, [dev])
      await playAlone(dev, tick)
      expect(await walked(dev, tick, 'ArrowRight', () => dev.zz.players[0])).toBeGreaterThan(20)
      await tick(120)
      expect(spy.urls).toEqual([])
      expect(server.connections()).toBe(0)
      expect(dev.zz.net.role).toBe('off')

      // No internet at all: the same game starts and plays.
      const off = await onePlayer()
      expect(off.zz().scene).toBe('play')
      expect(await walked(off.dev, off.tick, 'ArrowRight', () => off.zz().players[0])).toBeGreaterThan(20)
      expect(off.zz().scene).toBe('play')
      expect(off.zz().net.role).toBe('off')
    }, 60_000)

    it('2 players on one keyboard is NOT offered: co-op is online only', async () => {
      const dev = device()
      const tick = (n) => dev.step(n)
      await tick(1)
      // the title offers only 1 JOGADOR and the two online entries
      expect(dev.zz.menu.items).toEqual(MENU)
      dev.tap('Enter')
      await reach(tick, () => dev.zz.scene === 'select', 'the select screen', 60)
      // one cursor, and both key sets (D and ►) move that same cursor
      expect(dev.zz.sel).toHaveLength(1)
      const n = dev.zz.chars.length
      const c0 = dev.zz.sel[0].char
      dev.tap('KeyD')
      await tick(2)
      expect(dev.zz.sel[0].char).toBe((c0 + 1) % n)
      dev.tap('ArrowRight')
      await tick(2)
      expect(dev.zz.sel[0].char).toBe((c0 + 2) % n)
      // in the game: one fighter, and both key sets move that same fighter
      await selectToPlay(dev, tick)
      expect(dev.zz.players).toHaveLength(1)
      expect(await walked(dev, tick, 'KeyD', () => dev.zz.players[0])).toBeGreaterThan(20)
      expect(await walked(dev, tick, 'ArrowRight', () => dev.zz.players[0])).toBeGreaterThan(20)
      expect(dev.zz.players).toHaveLength(1)
      expect(dev.zz.net.role).toBe('off')
    }, 60_000)

    it('the room creator sees the room name and \'ESPERANDO JOGADOR 2...\' until the friend joins', async () => {
      const g = await twoPlayers({ until: 'room', name: 'Porão do Rock' })
      const tick = tickOf(g)
      expect(g.name).toBe('PORÃO DO ROCK')
      expect(await seen(tick, g.host, 'PORÃO DO ROCK')).toBe(true)
      expect(await seen(tick, g.host, MSG.waiting2)).toBe(true)
      // nobody comes for 10 s: still waiting, still showing the name
      await g.wait(60 * 10)
      expect(g.host.zz.scene).toBe('room')
      expect(await seen(tick, g.host, g.name)).toBe(true)
      expect(await seen(tick, g.host, MSG.waiting2)).toBe(true)
      // the friend joins: the waiting screen ends
      await joinRoom(g.guest, tick, g.name)
      await reach(tick, () => g.host.zz.scene === 'select', 'the creator leaves the waiting screen', 120)
      expect(await seen(tick, g.host, MSG.waiting2)).toBe(false)
    }, 60_000)

    it('the creator can type the room name on a computer or a phone, and the typed letters do NOT act as game keys or mute the sound', async () => {
      for (const phone of [false, true]) {
        const server = createMemoryServer({ random: seededRandom(13) })
        const dev = device({ seed: 1, server, touch: phone })
        const tick = ticker(server, [dev])
        await tick(1)
        await openName(dev, tick)
        const box = nameBox(dev)
        expect(box, 'a #roomName box').not.toBeNull()
        expect(box.tagName).toBe('INPUT') // a real text box: on a phone it opens the keyboard
        expect(box.type).toBe('text')
        expect(visible(box)).toBe(true)
        // on a computer the letters go straight into the box
        if (!phone) expect(dev.win.document.activeElement).toBe(box)

        // letters that are game keys: M mute, J/Z punch (= confirm), K/X kick, P pause (= back),
        // H/N mask, U/B weapon, L/C jump, W/A/S/D move, O block
        const msgBefore = dev.zz.netMsg
        expect(dev.zz.muted).toBe(false)
        dev.clearName()
        dev.typeName('MJZKXPHNUBLCWASDO')
        await tick(10)
        expect(box.value.startsWith('MJZKXPHNUBLCWASD')).toBe(true) // the letters went into the box
        expect(dev.zz.scene).toBe('name') // P did not go back to the title
        expect(dev.zz.netMsg).toBe(msgBefore)
        expect(server.rooms()).toEqual([]) // J/Z did not create the room
        expect(dev.zz.muted).toBe(false) // M did not mute

        // the creator types a real name and creates the room
        dev.clearName()
        dev.typeName('rock')
        dev.submitName()
        await reach(tick, () => dev.zz.scene === 'room', 'the room', 300)
        expect(dev.zz.net.name).toBe('ROCK')
        // out of the box, M is the mute key again (so M above was really kept out of the game)
        dev.tap('KeyM')
        expect(dev.zz.muted).toBe(true)
      }
    }, 60_000)

    it('when the friend joins, both players go to the select screen together', async () => {
      const g = await twoPlayers({ until: 'room' })
      const tick = tickOf(g)
      await openList(g.guest, tick)
      await g.tick(30)
      const scenes = () => [g.host.zz.scene, g.guest.zz.scene]
      expect(scenes()).toEqual(['room', 'join']) // nobody moves before the friend picks the room
      expect(g.guest.zz.rooms.items[g.guest.zz.rooms.sel].name).toBe(g.name)
      g.guest.tap('Enter')
      let first = null
      let both = null
      for (let n = 1; n <= 180 && both === null; n++) {
        await g.tick(1)
        if (first === null && scenes().includes('select')) first = n
        if (scenes().every((s) => s === 'select')) both = n
      }
      expect(both, 'both devices on the select screen').not.toBeNull()
      expect(both - first, 'steps between the two devices reaching the select screen').toBeLessThanOrEqual(10)
      // the same select screen for 2 players on both devices
      expect(g.host.zz.sel).toHaveLength(2)
      expect(g.guest.zz.sel).toHaveLength(2)
      expect(g.guest.zz.net).toMatchObject({ role: 'guest', slot: 1 })
    }, 60_000)

    it('the friend moves through the room list with ▲▼ and joins with ENTER on a computer, or with the touch buttons on a phone; ESC (or the II button) goes back to the title', async () => {
      // touch controls of a phone: the stick pushed up or down, and the round buttons
      const stickY = async (dev, tick, ny) => {
        const st = dev.win.document.getElementById('stick')
        st.getBoundingClientRect = () => ({ left: 0, top: 0, right: 80, bottom: 80, width: 80, height: 80, x: 0, y: 0 })
        st.setPointerCapture = () => {}
        st.dispatchEvent(new dev.win.PointerEvent('pointerdown', { pointerId: 7, clientX: 40, clientY: 40 + ny * 40, bubbles: true, cancelable: true }))
        await tick(2)
        st.dispatchEvent(new dev.win.PointerEvent('pointerup', { pointerId: 7, bubbles: true }))
        await tick(2)
      }
      const button = (dev, k) => {
        const b = dev.win.document.querySelector('.tb[data-k="' + k + '"]')
        for (const type of ['pointerdown', 'pointerup']) b.dispatchEvent(new dev.win.PointerEvent(type, { pointerId: 9, bubbles: true, cancelable: true }))
      }
      for (const phone of [false, true]) {
        const server = createMemoryServer({ random: seededRandom(21) })
        const a = device({ seed: 1, server })
        const b = device({ seed: 2, server })
        const friend = device({ seed: 3, server, touch: phone })
        const tick = ticker(server, [a, b, friend])
        const down = phone ? () => stickY(friend, tick, 1) : async () => { friend.tap('ArrowDown'); await tick(2) }
        const up = phone ? () => stickY(friend, tick, -1) : async () => { friend.tap('ArrowUp'); await tick(2) }
        const sel = () => friend.zz.rooms.items[friend.zz.rooms.sel]?.name
        await tick(1)
        await hostRoom(a, tick, 'rock')
        await hostRoom(b, tick, 'metal')
        await openList(friend, tick)
        expect(listNames(friend)).toEqual(['METAL', 'ROCK'])
        expect(sel()).toBe('METAL')
        await down()
        expect(sel()).toBe('ROCK')
        await up()
        expect(sel()).toBe('METAL')
        // back to the title, without joining
        if (phone) button(friend, 'pause')
        else friend.tap('Escape')
        await tick(3)
        expect(friend.zz.scene).toBe('title')
        expect(friend.zz.net.role).toBe('off')
        expect(server.rooms().map((r) => r.slots)).toEqual([['here', null], ['here', null]])
        // again, and join ROCK
        await openList(friend, tick)
        await down()
        expect(sel()).toBe('ROCK')
        if (phone) button(friend, 'punch')
        else friend.tap('Enter')
        await reach(tick, () => a.zz.scene === 'select' && friend.zz.scene === 'select', 'the friend and the ROCK creator on the select screen', 120)
        expect(friend.zz.net.name).toBe('ROCK')
        expect(b.zz.scene).toBe('room') // METAL still waits
      }
    }, 60_000)
  }
  GROUP['character select and stage start#menus'] = () => {
    it('the first player to confirm a band member gets it, and the other player can NOT confirm the same band member', async () => {
      for (const first of [0, 1]) {
        const other = 1 - first
        const g = await twoPlayers({ until: 'select' })
        const vocal = charIndex(g.host, 'vocal')
        // both cursors on the same band member
        await moveTo(g, 0, 'vocal')
        await moveTo(g, 1, 'vocal')
        await g.tick(15)
        await confirm(g, first)
        for (const dev of [g.host, g.guest]) expect(dev.zz.sel[first]).toMatchObject({ char: vocal, ok: true })
        // the other player tries to confirm it too
        await confirm(g, other)
        const s = g.zz.sel[other]
        expect(s.ok && s.char === vocal, 'J' + (other + 1) + ' confirmed the band member J' + (first + 1) + ' already has').toBe(false)
        // a different band member works for the other player
        if (!s.ok) {
          await moveTo(g, other, 'guitar')
          await confirm(g, other)
        }
        await reach(tickOf(g), () => g.host.zz.scene === 'mut', 'the stage screen', 60)
        await toPlay(g)
        expect(g.zz.players[first].look.pix).toBe('vocal')
        expect(g.zz.players[other].look.pix).not.toBe('vocal')
      }
    }, 60_000)

    it('the game leaves the select screen only after both players have confirmed a band member', async () => {
      for (const first of [0, 1]) {
        const other = 1 - first
        const g = await twoPlayers({ until: 'select' })
        await moveTo(g, 0, 'vocal')
        await moveTo(g, 1, 'guitar')
        await g.tick(15)
        await confirm(g, first)
        expect(g.zz.sel[first].ok).toBe(true)
        // 3 s with only one player confirmed: both devices stay on the select screen
        await g.tick(180)
        expect([g.host.zz.scene, g.guest.zz.scene]).toEqual(['select', 'select'])
        expect(g.zz.sel[other].ok).toBe(false)
        await confirm(g, other)
        await reach(tickOf(g), () => g.host.zz.scene === 'mut' && g.guest.zz.scene === 'mut', 'both devices leave the select screen', 60)
      }
    }, 60_000)

    it('only player 1 (host) chooses the stage; player 2 (guest) can NOT change it', async () => {
      const g = await twoPlayers({ until: 'select' })
      await pickBoth(g)
      expect(g.zz.stage).toBe(1)
      // player 2 tries ▼ ▼ ▲ and then ENTER
      for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp']) {
        g.guest.tap(key)
        await g.tick(10)
      }
      await g.tick(20)
      g.guest.tap('Enter')
      await g.tick(15)
      expect([g.host.zz.scene, g.guest.zz.scene]).toEqual(['mut', 'mut'])
      expect([g.host.zz.stage, g.guest.zz.stage]).toEqual([1, 1])
      // player 1 can, and player 2 sees the same screen
      g.host.tap('ArrowDown')
      await g.tick(10)
      expect([g.host.zz.stage, g.guest.zz.stage]).toEqual([2, 2])
      expect(await seen(tickOf(g), g.guest, 'FASE 2')).toBe(true)
      await toStory(g)
      expect(g.zz.stage).toBe(2)
    }, 60_000)

    it('on the story, band show, stage clear and game over screens, a button press from either player moves on', async () => {
      const g = await twoPlayers({ until: 'select' })
      await pickBoth(g)
      await toStory(g)
      // story (stage 1): player 2 shows the whole text and starts the stage
      expect(await pressToLeave(g, g.guest, 'story')).toBe('play')
      // game over: player 2 tries again, then player 1 tries again
      await knockOutBoth(g)
      expect(await pressToLeave(g, g.guest, 'gameover')).toBe('play')
      await knockOutBoth(g)
      expect(await pressToLeave(g, g.host, 'gameover')).toBe('play')
      // band show by player 2, stage clear by player 1
      await winStage(g)
      expect(await pressToLeave(g, g.guest, 'show')).toBe('clear')
      expect(await pressToLeave(g, g.host, 'clear')).toBe('mut')
      expect(g.zz.stage).toBe(2)
      // stage 2: story and band show by player 1, stage clear by player 2
      await toStory(g)
      expect(await pressToLeave(g, g.host, 'story')).toBe('play')
      await winStage(g)
      expect(await pressToLeave(g, g.host, 'show')).toBe('clear')
      expect(await pressToLeave(g, g.guest, 'clear')).toBe('mut')
      expect(g.zz.stage).toBe(3)
    }, 60_000)

    it('both players\' band members appear in the story and in the band show', async () => {
      const g = await twoPlayers({ until: 'select' })
      await pickBoth(g, 'vocal', 'guitar')
      await toStory(g)
      g.host.tap('Enter') // the whole story text
      await g.tick(5)
      const story = [g.host, g.guest].map((dev) => ({
        texts: dev.render(),
        // CONTRACT-GAP: __zz.frame.walkers — band member ids (look.pix) drawn walking on the story
        // screen in the last render. Nothing in the contract tells which fighters a frame drew.
        walkers: dev.zz.frame.walkers,
      }))
      await pressToLeave(g, g.host, 'story')
      expect(g.zz.players.map((p) => p.look.pix)).toEqual(['vocal', 'guitar'])
      const [n1, n2] = g.zz.players.map((p) => p.look.name)
      for (const s of story) {
        expect(s.texts).toContain(`Boraaa, ${n1} E ${n2}!`)
        expect(s.walkers).toEqual(expect.arrayContaining(['vocal', 'guitar']))
      }
      // band show: both walk in, and neither stays in the band line-up
      await winStage(g)
      for (const dev of [g.host, g.guest]) {
        const show = dev.zz.show
        expect(show.me.map((m) => m.look.pix).sort()).toEqual(['guitar', 'vocal'])
        const band = show.band.map((m) => m.look.pix)
        expect(band.length).toBeGreaterThan(0)
        expect(band).not.toContain('vocal')
        expect(band).not.toContain('guitar')
      }
    }, 60_000)
  }
}

// ──────────────────────────────────────────────────────────────────────
{
  // Online co-op (2 players): difficulty with 2 players, and the first part of playing together.
  // The rule and the reason for each decision: .specs/online-coop/DECISIONS.md
  // Expected numbers come from today's game (jogo/index.html): the ATK table (attack damage),
  // spawn() (enemy health, +20% a stage, TIGAS 300 x (2 + 0.75 per stage)) and applyHit()
  // (+12% damage to players a stage), with the 2-player multipliers of D1, D2 and NEW-11.

  // ───────── helpers ─────────

  const STAND = 330 // x where the player under test stands; the other player stands 250 px behind

  /** A 1-player game with the same shape as a 2-player one ({ zz, tick }). */
  async function solo(o) {
    const s = await onePlayer(o)
    return { dev: s.dev, tick: s.tick, get zz() { return s.dev.zz } }
  }

  /** No wave starts by walking: every wave trigger is moved out of reach. */
  function noWaves(zz) { for (const tg of zz.trigs) tg.x = 1e9 }

  /** Remove every enemy and every flying thing (bottles, fire, pillars, vomit, puddles, discs). */
  function clear(zz) { zz.enemies.length = 0; zz.projs.length = 0 }

  /** Keep only `keep` in the game's list of flying things. */
  function only(zz, keep) { zz.projs.length = 0; zz.projs.push(keep) }

  const named = (zz, name) => zz.enemies.filter((e) => e.name === name)
  const drones = (zz) => zz.enemies.filter((e) => e.type === 'demonio')
  function countTypes(list) {
    const c = {}
    for (const x of list) { const k = typeof x === 'string' ? x : x.type; c[k] = (c[k] || 0) + 1 }
    return c
  }

  /** Step until get() gives something, and return it. */
  async function waitFor(t, get, max = 400) {
    let v
    await stepUntil(t.tick, () => (v = get()), max)
    expect(v, 'it did not happen in time').toBeTruthy()
    return v
  }

  /**
   * Start wave trigger k now. A fight that is running ends at once (its enemies are removed until the
   * screen unlocks), and the triggers before k pass with no enemies. A boss arena keeps its own screen.
   */
  async function fireTrigger(t, k) {
    const zz = t.zz
    await stepUntil(t.tick, () => { clear(zz); return !zz.lock }, 400)
    for (let i = zz.trigIdx; i < k; i++) Object.assign(zz.trigs[i], { x: 0, waves: [[]], boss: undefined, cam: undefined, final: undefined })
    zz.trigs[k].x = 0
    expect(await stepUntil(t.tick, () => zz.trigIdx === k && !!zz.lock, 100), 'trigger ' + k + ' started').toBe(true)
  }

  /** Player `slot` stands at (x, 200); the other player (if still playing) stands far behind at (x - 250, 250). */
  function standApart(t, slot, x = STAND) {
    const p = t.zz.players[slot], o = t.zz.players[1 - slot]
    place(p, x, 200); p.inv = 0; p.stunT = 0
    if (o && !o.out && !o.left) { place(o, x - 250, 250); o.inv = 0 }
    return p
  }

  /** Enemy e stands `gap` px in front of player p, on the same line, facing p, and does no attack of its own. */
  function inFront(e, p, gap) {
    place(e, p.x + gap, p.y)
    e.facing = -1
    e.cd = 99999
    if (e.flyer) e.z = 34 // drones fly at height 34
  }

  /** Put enemy e in front of player `slot`, and wait a second so it picks that player as its target (NEW-18). */
  async function aim(t, e, slot = 0, gap = 18, x = STAND) {
    inFront(e, standApart(t, slot, x), gap)
    await t.tick(70)
    inFront(e, standApart(t, slot, x), gap)
    return e
  }
  const foe = (t, type, slot, gap, x) => aim(t, t.zz.spawn(type, 1), slot, gap, x)

  /** The HP player `slot` loses from the first hit of enemy e's attack `name` (player idle, not blocking, inv 0). */
  async function hpLoss(t, e, name, slot = 0, gap = 18, x = STAND) {
    const p = standApart(t, slot, x)
    inFront(e, p, gap)
    t.zz.projs.length = 0
    p.hp = p.maxHp
    t.zz.attack(e, name)
    expect(await stepUntil(t.tick, () => p.hp !== p.maxHp, 300), name + ' hit the player').toBe(true)
    return p.maxHp - p.hp
  }

  /** TIGAS vomits; player `slot` waits out of the way, then steps under one falling drop. Returns the HP lost. */
  async function vomitLoss(t, tigas, slot = 0) {
    const zz = t.zz, p = standApart(t, slot)
    inFront(tigas, p, 120)
    zz.projs.length = 0
    place(p, STAND, 250) // the vomit falls near y 200, so it can not touch y 250
    p.hp = p.maxHp
    zz.attack(tigas, 'dVomit')
    const drop = await waitFor(t, () => zz.projs.find((q) => q.kind === 'vomit' && q.z > 10 && q.z < 40), 200)
    only(zz, drop) // one drop in the air, so one drop can hit
    place(p, drop.x + drop.vx, drop.y + drop.vy) // where the drop is one step later
    p.inv = 0
    expect(await stepUntil(t.tick, () => p.hp !== p.maxHp, 10), 'the vomit drop hit the player').toBe(true)
    return p.maxHp - p.hp
  }

  /** TIGAS vomits; when every drop is down, player `slot` stands in one puddle. Returns { loss, puddle, p }. */
  async function puddleLoss(t, tigas, slot = 0) {
    const zz = t.zz, p = standApart(t, slot)
    inFront(tigas, p, 120)
    zz.projs.length = 0
    place(p, STAND, 250) // away from the vomit and from the puddles (they are near y 200)
    zz.attack(tigas, 'dVomit')
    expect(await stepUntil(t.tick, () => tigas.state !== 'attack' && !zz.projs.some((q) => q.kind === 'vomit'), 300)).toBe(true)
    const puddle = zz.projs.find((q) => q.kind === 'puddle')
    expect(puddle, 'the vomit made a puddle').toBeTruthy()
    only(zz, puddle)
    place(p, puddle.x, puddle.y)
    p.inv = 0
    p.hp = p.maxHp
    expect(await stepUntil(t.tick, () => p.hp !== p.maxHp, 60), 'the puddle hurt the player').toBe(true) // a puddle hurts every 50 steps
    return { loss: p.maxHp - p.hp, puddle, p }
  }

  /** Player `slot` has no lives left and a punk knocks the player out. Returns that punk. */
  async function knockOut(g, slot) {
    const zz = g.zz, p = zz.players[slot]
    const punk = await foe(g, 'punk', slot)
    p.lives = 0
    p.hp = 1
    p.inv = 0
    zz.attack(punk, 'ePunch')
    expect(await stepUntil(g.tick, () => p.out, 600), 'player ' + (slot + 1) + ' is out').toBe(true)
    return punk
  }

  /** Stage 4, TIGAS fight: both players on one lane, player `slot` nearer to where the runner comes from (the right). */
  async function runnerHits(g, slot) {
    const zz = g.zz, p = zz.players[slot], o = zz.players[1 - slot]
    await stepUntil(g.tick, () => !zz.runner, 900) // the last runner has gone
    const c = Math.round(zz.cam)
    place(p, c + 330, 215) // the runner runs left from the right edge to the bar (x 3395)
    place(o, c + 170, 215)
    for (const f of [p, o]) { f.stunT = 0; f.inv = 0 }
    zz.runnerSoon()
    return stepUntil(g.tick, () => p.stunT > 0, 400)
  }

  /** Hold a key for n steps. */
  async function hold(g, dev, key, n) { dev.down(key); await g.tick(n); dev.up(key); await g.tick(3) }

  /** Two quick presses of right; the key stays down after the second one (a run). */
  async function doubleTap(g, dev) { dev.tap('ArrowRight'); await g.tick(3); dev.down('ArrowRight') }

  /** Touch stick of a phone device, pushed to nx (-1 = all the way left, 1 = all the way right; past 0.88 runs). */
  function stick(dev, nx) {
    const st = dev.win.document.getElementById('stick')
    // the fake browser has no layout: give the stick a size (80 x 80) and pointer capture
    st.getBoundingClientRect = () => ({ left: 0, top: 0, right: 80, bottom: 80, width: 80, height: 80, x: 0, y: 0 })
    st.setPointerCapture = () => {}
    st.dispatchEvent(new dev.win.PointerEvent('pointerdown', { pointerId: 7, clientX: 40 + nx * 40, clientY: 40, bubbles: true, cancelable: true }))
  }
  function stickOff(dev) {
    dev.win.document.getElementById('stick').dispatchEvent(new dev.win.PointerEvent('pointerup', { pointerId: 7, bubbles: true }))
  }
  /** A short press of a touch button (data-k = 'punch', 'kick', 'jump', 'weapon', 'mask', 'pause'). */
  function touchButton(dev, k) {
    const b = dev.win.document.querySelector('.tb[data-k="' + k + '"]')
    for (const type of ['pointerdown', 'pointerup']) b.dispatchEvent(new dev.win.PointerEvent(type, { pointerId: 9, bubbles: true, cancelable: true }))
  }

  /**
   * Player `slot` attacks with `moves` while the other player stands `gap` px in front, at the same spot as a
   * dummy enemy (a brute that does not move or attack). moves: 'tap KeyJ' / 'down ...' / 'up ...', a number
   * (steps to wait) or an async function(tick). Returns { hurt, reached }: hurt = the other player lost HP or was
   * knocked; reached = the attack reached that spot (the dummy was hit or blown away).
   */
  async function attackOnFriend(g, slot, gap, moves, setup) {
    const zz = g.zz, me = zz.players[slot], other = zz.players[1 - slot], dev = slot ? g.guest : g.host
    clear(zz)
    zz.items.length = 0
    place(me, 150, 210); me.facing = 1; me.inv = 0; me.weapon = null; me.maskT = 0; me.hp = me.maxHp
    place(other, 150 + gap, 210); other.inv = 0; other.hp = other.maxHp
    const dummy = zz.spawn('brute', 1)
    place(dummy, 150 + gap, 210); dummy.stunT = 99999; dummy.cd = 99999
    if (setup) setup(zz, me)
    let hurt = false, reached = false
    const tick = async (n = 1) => {
      for (let i = 0; i < n; i++) {
        await g.tick(1)
        if (other.hp < other.maxHp || ['hurt', 'air', 'down'].includes(other.state)) hurt = true
        if (dummy.hp < dummy.maxHp || dummy.state === 'air') reached = true
      }
    }
    for (const m of moves) {
      if (typeof m === 'number') await tick(m)
      else if (typeof m === 'function') await m(tick)
      else { const [how, code] = m.split(' '); dev[how](code) }
    }
    await tick(30)
    return { hurt, reached }
  }

  // ───────── tests ─────────

  GROUP['difficulty with 2 players#diff'] = () => {
    it('with 2 players, normal enemies have x1.5 health, applied after the stage increase (a stage 5 punk has 92 HP)', async () => {
      const g = await twoPlayers({ stage: 5 })
      const zz = g.zz
      // the first wave of stage 5 (punks): 34 x 1.8 = 61.2 -> 61 (today), then x1.5 = 91.5 -> 92
      await fireTrigger(g, 0)
      await g.tick(30) // a wave that comes over a few steps is complete
      expect(zz.enemies.length).toBeGreaterThan(0)
      for (const e of zz.enemies) expect([e.type, e.maxHp, e.hp]).toEqual(['punk', 92, 92])
      // every normal enemy (drones included) on every stage: today's stage health (rounded), then x1.5 (rounded).
      // Stage 2 shows the order: a garota has 28 x 1.2 = 33.6 -> 34, x1.5 = 51 (x1.5 first would give 50).
      const HP = {
        1: { punk: 51, garota: 42, brute: 120, demonio: 33 }, // today 34, 28, 80, 22
        2: { punk: 62, garota: 51, brute: 144, demonio: 39 }, // today 41, 34, 96, 26
        3: { punk: 72, garota: 59, brute: 168, demonio: 47 }, // today 48, 39, 112, 31
        4: { punk: 81, garota: 68, brute: 192, demonio: 53 }, // today 54, 45, 128, 35
        5: { punk: 92, garota: 75, brute: 216, demonio: 60 }, // today 61, 50, 144, 40
      }
      for (const [stage, hp] of Object.entries(HP)) {
        zz.setStage(Number(stage))
        zz.startStage()
        await g.tick(1)
        noWaves(zz)
        for (const [type, want] of Object.entries(hp)) {
          const e = zz.spawn(type, 1)
          expect(['stage ' + stage, type, e.maxHp, e.hp]).toEqual(['stage ' + stage, type, want, want])
        }
        clear(zz)
      }
    }, 60_000)

    it('with 2 players, normal enemies do x1.5 damage with every attack: punches, kicks and drone swoops', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      const punk = await foe(g, 'punk')
      expect(await hpLoss(g, punk, 'ePunch')).toBe(9) // 6 x 1.5
      expect(await hpLoss(g, punk, 'eKick')).toBe(12) // 8 x 1.5
      clear(zz)
      const garota = await foe(g, 'garota')
      expect(await hpLoss(g, garota, 'eKick')).toBe(12) // 8 x 1.5
      expect(await hpLoss(g, garota, 'ePunch')).toBe(9) // 6 x 1.5
      clear(zz)
      const brute = await foe(g, 'brute')
      expect(await hpLoss(g, brute, 'bPunch')).toBe(18) // 12 x 1.5
      clear(zz)
      const drone = await foe(g, 'demonio')
      expect(await hpLoss(g, drone, 'swoop')).toBe(12) // 8 x 1.5
    }, 60_000)

    it('with 2 players, each normal wave has twice as many enemies', async () => {
      // the normal waves of every stage today (trigger by trigger, first wave then second wave)
      const WAVES = [
        [['punk', 'punk'], ['punk', 'garota', 'punk']],
        [['punk', 'brute'], ['garota', 'punk', 'garota']],
        [['punk', 'garota', 'punk'], ['brute', 'garota']],
        [['punk', 'garota', 'brute'], ['brute', 'garota', 'punk', 'punk']],
      ]
      const g = await twoPlayers()
      const zz = g.zz
      for (let k = 0; k < WAVES.length; k++) {
        await fireTrigger(g, k)
        for (let w = 0; w < 2; w++) {
          await waitFor(g, () => zz.enemies.length > 0, 100)
          await g.tick(30) // a wave that comes over a few steps is complete
          expect(['trigger ' + k, 'wave ' + w, countTypes(zz.enemies)]).toEqual(['trigger ' + k, 'wave ' + w, countTypes([...WAVES[k][w], ...WAVES[k][w]])])
          zz.enemies.length = 0 // the wave is beaten; the next one comes
        }
      }
    }, 60_000)

    it('with 2 players, ROBÔ CHEFÃO, TIGAS (on every stage), CARECA and LOUCA each have x2.5 health, applied after the stage increase (a stage 5 TIGAS has 3750 HP)', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      // today's health on stages 1..5, then x2.5, rounded
      const HP = {
        boss: [600, 720, 840, 960, 1080], //        ROBÔ CHEFÃO: 240, 288, 336, 384, 432
        drunk: [1500, 2063, 2625, 3188, 3750], //   TIGAS: 600, 825, 1050, 1275, 1500 (2062.5 -> 2063, 3187.5 -> 3188)
        careca: [475, 570, 665, 760, 855], //       190, 228, 266, 304, 342
        louca: [300, 360, 420, 480, 540], //        120, 144, 168, 192, 216
      }
      for (let stage = 1; stage <= 5; stage++) {
        zz.setStage(stage)
        zz.startStage()
        await g.tick(1)
        noWaves(zz)
        for (const [type, list] of Object.entries(HP)) {
          const e = zz.spawn(type, 1)
          const want = list[stage - 1]
          expect(['stage ' + stage, type, e.maxHp, e.hp]).toEqual(['stage ' + stage, type, want, want])
          clear(zz)
        }
      }
    }, 60_000)

    it('with 2 players, ROBÔ CHEFÃO, TIGAS, CARECA and LOUCA do x2.5 damage with every attack, including fire, pillars, vomit, LOUCA\'s bottles and the vomit puddle (which still can NOT kill)', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      const robot = await foe(g, 'boss')
      expect(await hpLoss(g, robot, 'bossJab')).toBe(13) // 5 x 2.5 = 12.5 -> 13
      expect(await hpLoss(g, robot, 'bossDash')).toBe(23) // 9 x 2.5 = 22.5 -> 23
      expect(await hpLoss(g, robot, 'bossFire', 0, 60)).toBe(18) // fire: 7 x 2.5 = 17.5 -> 18
      expect(await hpLoss(g, robot, 'bossPillar', 0, 60)).toBe(20) // pillar: 8 x 2.5
      clear(zz)
      const tigas = await foe(g, 'drunk')
      expect(await hpLoss(g, tigas, 'dPunch')).toBe(20) // 8 x 2.5
      expect(await hpLoss(g, tigas, 'dSpin')).toBe(15) // 6 x 2.5
      expect(await vomitLoss(g, tigas)).toBe(10) // a vomit drop: 4 x 2.5
      const { loss, puddle, p } = await puddleLoss(g, tigas)
      expect(loss).toBe(3) // the puddle: 1 x 2.5 = 2.5 -> 3
      // the puddle still can NOT kill: with 2 HP, the next puddle hit (3) must leave the player alive
      const lives = p.lives
      p.hp = 2
      await g.tick(55) // the puddle hurts every 50 steps
      expect(zz.projs).toContain(puddle) // the puddle was still there, under the player
      expect(Math.abs(p.x - puddle.x) < 10 && Math.abs(p.y - puddle.y) < 6).toBe(true)
      expect(p.hp).toBeGreaterThanOrEqual(1)
      expect(p.dying).toBeFalsy()
      expect(p.lives).toBe(lives)
      clear(zz)
      const careca = await foe(g, 'careca')
      expect(await hpLoss(g, careca, 'bPunch')).toBe(30) // 12 x 2.5
      expect(await hpLoss(g, careca, 'eKick')).toBe(20) // 8 x 2.5
      clear(zz)
      const louca = await foe(g, 'louca')
      expect(await hpLoss(g, louca, 'ePunch')).toBe(15) // 6 x 2.5
      expect(await hpLoss(g, louca, 'eKick')).toBe(20) // 8 x 2.5
      expect(await hpLoss(g, louca, 'throwB', 0, 120)).toBe(23) // her bottle: 9 x 2.5 = 22.5 -> 23
    }, 60_000)

    it('with 2 players, enemy damage still grows with the stage, then x1.5 or x2.5 is applied, and then the player\'s defense is taken off', async () => {
      // stage 5: +12% a stage = x1.48. Player 1 has defense 2.
      // Damage = base x 1.48 x (1.5 or 2.5), rounded once, minus 2.
      const g = await twoPlayers({ stage: 5 })
      const zz = g.zz
      noWaves(zz)
      zz.players[0].def = 2
      const garota = await foe(g, 'garota')
      // 8 x 1.48 x 1.5 = 17.76 -> 18, -2 = 16 (no stage increase: 10; defense before x1.5: 15; no defense: 18)
      expect(await hpLoss(g, garota, 'eKick')).toBe(16)
      clear(zz)
      const tigas = await foe(g, 'drunk')
      // 8 x 1.48 x 2.5 = 29.6 -> 30, -2 = 28 (no stage increase: 18; defense before x2.5: 25; no defense: 30)
      expect(await hpLoss(g, tigas, 'dPunch')).toBe(28)
      clear(zz)
      const louca = await foe(g, 'louca')
      // 6 x 1.48 x 2.5 = 22.2 -> 22, -2 = 20 (NEW-11 rounds once: rounding 6 x 1.48 = 8.88 -> 9 first would give 21)
      expect(await hpLoss(g, louca, 'ePunch')).toBe(20)
    }, 60_000)

    it('a boss fight is NOT doubled with 2 players: still one ROBÔ CHEFÃO, one TIGAS, and one CARECA with one LOUCA', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      const bossFight = async (k) => {
        await fireTrigger(g, k)
        await waitFor(g, () => zz.enemies.length > 0, 300)
        await g.tick(30) // time for a second copy, if one were coming
        return zz.enemies.map((e) => e.name).sort()
      }
      // stage 1: the ROBÔ CHEFÃO fight, then the TIGAS fight
      expect(await bossFight(4)).toEqual(['ROBÔ CHEFÃO'])
      expect(await bossFight(5)).toEqual(['TIGAS'])
      // stage 2: CARECA & LOUCA
      zz.setStage(2)
      zz.startStage()
      await g.tick(1)
      expect(await bossFight(4)).toEqual(['CARECA', 'LOUCA'])
    }, 60_000)

    it('with 2 players, the drones in the ROBÔ CHEFÃO fight follow the normal-enemy rules: x1.5 health and damage, and 2 drones come each time instead of 1', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      await fireTrigger(g, 4) // the ROBÔ CHEFÃO fight of stage 1
      const robot = await waitFor(g, () => named(zz, 'ROBÔ CHEFÃO')[0], 300)
      robot.cd = 99999
      const X = Math.round(zz.lock.cam) + STAND
      expect(drones(zz).length).toBe(0)
      // below 70% health the first drones come: 2 instead of 1
      robot.hp = Math.floor(robot.maxHp * 0.69)
      await waitFor(g, () => drones(zz).length > 0, 60)
      await g.tick(30) // time for every drone of this batch
      expect(drones(zz).length).toBe(2)
      for (const d of drones(zz)) { d.cd = 99999; expect([d.maxHp, d.hp]).toEqual([33, 33]) } // 22 x 1.5
      // their swoop does x1.5 damage
      const drone = await aim(g, drones(zz)[0], 0, 18, X)
      expect(await hpLoss(g, drone, 'swoop', 0, 18, X)).toBe(12) // 8 x 1.5
      // below 35% health 2 more drones come
      const first = drones(zz)
      robot.hp = Math.floor(robot.maxHp * 0.34)
      await waitFor(g, () => drones(zz).length > 2, 60)
      await g.tick(30)
      expect(drones(zz).length).toBe(4)
      for (const d of drones(zz).filter((d) => !first.includes(d))) expect([d.maxHp, d.hp]).toEqual([33, 33])
    }, 60_000)

    it('CARECA and LOUCA with 2-player strength take PODER hits like a boss: a PODER can NOT kill them in one hit', async () => {
      // player 1: RAIO DA GUITARRA (a 999 bolt on each enemy on screen); player 2: TOFUZAÇÃO (eats each enemy)
      const g = await twoPlayers({ p1: 'guitar2', p2: 'angelo' })
      const zz = g.zz
      noWaves(zz)
      const [p1, p2] = zz.players
      place(p1, 120, 200)
      place(p2, 160, 240)
      const careca = zz.spawn('careca', 1), louca = zz.spawn('louca', -1)
      expect([careca.maxHp, louca.maxHp]).toEqual([475, 300]) // 190 x 2.5, 120 x 2.5: 2-player strength
      const both = [careca, louca]
      const onScreen = () => { place(careca, 300, 200); place(louca, 340, 240); for (const e of both) e.cd = 99999 }
      const usePower = async (slot) => {
        zz.fill(slot)
        ;(slot ? g.guest : g.host).tap('KeyH')
        expect(await stepUntil(g.tick, () => zz.power && zz.power.by === slot, 10), 'PODER of player ' + (slot + 1)).toBeTruthy()
        expect(await stepUntil(g.tick, () => !zz.power, 600), 'the PODER ended').toBe(true)
      }
      // the 999 bolt is cut to 70, as for a boss
      onScreen()
      await usePower(0)
      for (const e of both) expect([e.name, e.hp, !!e.dying]).toEqual([e.name, e.maxHp - 70, false])
      // they are not eaten: they take 70, as a boss does
      onScreen()
      const before = both.map((e) => e.hp)
      await usePower(1)
      both.forEach((e, i) => expect([e.name, e.hp, !!e.eaten, !!e.dying]).toEqual([e.name, before[i] - 70, false, false]))
    }, 60_000)

    it('while one player is out (no lives left), enemies that appear later (waves, drones, a boss not yet on screen) use 1-player strength, and enemies already on screen do NOT change', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      // a punk that came while both players were playing knocks out player 2
      const early = await knockOut(g, 1)
      expect(early.maxHp).toBe(51) // 34 x 1.5
      // the punk already on screen keeps its 2-player strength
      expect(await hpLoss(g, early, 'ePunch', 0)).toBe(9) // 6 x 1.5
      clear(zz)
      // an enemy that comes now: 1-player strength
      const late = zz.spawn('punk', 1)
      expect(late.maxHp).toBe(34)
      expect(await hpLoss(g, late, 'ePunch', 0)).toBe(6)
      // the next wave: 1-player size and health
      await fireTrigger(g, 0)
      await g.tick(30)
      expect(countTypes(zz.enemies)).toEqual({ punk: 2 })
      for (const e of zz.enemies) expect(e.maxHp).toBe(34)
      // the ROBÔ CHEFÃO, not on screen yet: 1-player strength, and so are its drones
      await fireTrigger(g, 4)
      const robot = await waitFor(g, () => named(zz, 'ROBÔ CHEFÃO')[0], 300)
      robot.cd = 99999
      expect(robot.maxHp).toBe(240)
      robot.hp = Math.floor(robot.maxHp * 0.69)
      await waitFor(g, () => drones(zz).length > 0, 60)
      await g.tick(30) // time for every drone of this batch
      expect(drones(zz).map((d) => d.maxHp)).toEqual([22])
    }, 60_000)

    it('a 1-player game does NOT change enemy health, enemy damage or wave size', async () => {
      const t = await solo()
      const zz = t.zz
      noWaves(zz)
      // health: today's numbers on stage 1
      const HP = { punk: 34, garota: 28, brute: 80, demonio: 22, boss: 240, drunk: 600, careca: 190, louca: 120 }
      for (const [type, hp] of Object.entries(HP)) {
        const e = zz.spawn(type, 1)
        expect([type, e.maxHp, e.hp]).toEqual([type, hp, hp])
      }
      clear(zz)
      // damage: the ATK table as it is (stage 1, defense 0)
      const punk = await foe(t, 'punk')
      expect(await hpLoss(t, punk, 'ePunch')).toBe(6)
      expect(await hpLoss(t, punk, 'eKick')).toBe(8)
      clear(zz)
      const brute = await foe(t, 'brute')
      expect(await hpLoss(t, brute, 'bPunch')).toBe(12)
      clear(zz)
      const drone = await foe(t, 'demonio')
      expect(await hpLoss(t, drone, 'swoop')).toBe(8)
      clear(zz)
      const robot = await foe(t, 'boss')
      expect(await hpLoss(t, robot, 'bossJab')).toBe(5)
      expect(await hpLoss(t, robot, 'bossFire', 0, 60)).toBe(7)
      clear(zz)
      const tigas = await foe(t, 'drunk')
      expect(await hpLoss(t, tigas, 'dPunch')).toBe(8)
      clear(zz)
      const louca = await foe(t, 'louca', 0, 120)
      expect(await hpLoss(t, louca, 'throwB', 0, 120)).toBe(9)
      // wave size: the first trigger of stage 1 sends 2, then 3
      await fireTrigger(t, 0)
      await t.tick(30)
      expect(countTypes(zz.enemies)).toEqual({ punk: 2 })
      zz.enemies.length = 0
      await waitFor(t, () => zz.enemies.length > 0, 100)
      await t.tick(30)
      expect(countTypes(zz.enemies)).toEqual({ punk: 2, garota: 1 })
      // stage 5 health: today's stage increase only
      zz.setStage(5)
      zz.startStage()
      await t.tick(1)
      noWaves(zz)
      expect(zz.spawn('punk', 1).maxHp).toBe(61) // 34 x 1.8 = 61.2 -> 61
      expect(zz.spawn('drunk', 1).maxHp).toBe(1500) // 300 x 5
    }, 60_000)
  }
  GROUP['playing together#diff'] = () => {
    it('each player controls only their own select cursor and fighter, with their own keys or touch controls, running included', async () => {
      // select screen (player 2 plays on a phone)
      const s = await twoPlayers({ until: 'select', guestTouch: true })
      const n = s.zz.chars.length
      const cur = (dev) => dev.zz.sel.map((c) => c.char)
      const [a, b] = cur(s.host)
      s.host.tap('ArrowLeft') // player 1's keys
      await s.tick(3)
      expect(cur(s.host)).toEqual([(a + n - 1) % n, b])
      s.guest.tap('ArrowRight') // player 2's keys
      await s.tick(3)
      expect(cur(s.host)).toEqual([(a + n - 1) % n, (b + 1) % n])
      stick(s.guest, 1) // player 2's touch stick
      await s.tick(3)
      stickOff(s.guest)
      await s.tick(3)
      expect(cur(s.host)).toEqual([(a + n - 1) % n, (b + 2) % n])
      expect(cur(s.guest)).toEqual(cur(s.host)) // both screens show the same cursors

      // in the game
      const g = await twoPlayers({ guestTouch: true })
      const zz = g.zz
      noWaves(zz)
      zz.items.length = 0 // no weapon on the ground to pick up by mistake
      const [p1, p2] = zz.players
      place(p1, 120, 190)
      place(p2, 260, 240)
      await g.tick(2)
      // walking: player 1's keys, player 2's keys, player 2's touch stick pushed half way
      for (const [what, move, me, other, dir] of [
        ['player 1 keys', () => hold(g, g.host, 'ArrowRight', 20), p1, p2, 1],
        ['player 2 keys', () => hold(g, g.guest, 'ArrowLeft', 20), p2, p1, -1],
        ['player 2 stick', async () => { stick(g.guest, 0.6); await g.tick(20); stickOff(g.guest); await g.tick(3) }, p2, p1, 1],
      ]) {
        const x = me.x, ox = other.x, oy = other.y
        await move()
        expect([what, (me.x - x) * dir > 20]).toEqual([what, true])
        expect([what, other.x, other.y]).toEqual([what, ox, oy])
      }
      // buttons: player 1's punch key, player 2's touch SOCO button
      for (const [what, press, me, other] of [
        ['player 1 punch key', () => g.host.tap('KeyJ'), p1, p2],
        ['player 2 SOCO button', () => touchButton(g.guest, 'punch'), p2, p1],
      ]) {
        await stepUntil(g.tick, () => p1.state === 'idle' && p2.state === 'idle', 60)
        press()
        expect([what, await stepUntil(g.tick, () => me.state === 'attack', 6)]).toEqual([what, true])
        expect([what, other.state]).not.toEqual([what, 'attack'])
      }
      // running: a double tap (player 1 and player 2), and player 2's touch stick pushed all the way
      for (const [what, start, stop, me, other] of [
        ['player 1 double tap', () => doubleTap(g, g.host), () => g.host.up('ArrowRight'), p1, p2],
        ['player 2 double tap', () => doubleTap(g, g.guest), () => g.guest.up('ArrowRight'), p2, p1],
        ['player 2 stick', async () => stick(g.guest, 1), async () => stickOff(g.guest), p2, p1],
      ]) {
        await stepUntil(g.tick, () => p1.state === 'idle' && p2.state === 'idle', 60)
        await start()
        expect([what, await stepUntil(g.tick, () => me.state === 'run', 6)]).toEqual([what, true])
        const x = me.x, ox = other.x
        await g.tick(10)
        await stop()
        expect([what, me.x - x > 20]).toEqual([what, true]) // running is 2.6 px a step (walking is 1.45)
        expect([what, other.x, other.state === 'run']).toEqual([what, ox, false])
        await g.tick(5)
      }
    }, 60_000)

    it('both players share one camera that follows the middle point between them', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      const [p1, p2] = zz.players
      const settle = () => g.tick(150)
      place(p1, 200, 200)
      place(p2, 440, 240)
      await settle()
      // the middle point (320) is near the middle of the screen
      const at = ((p1.x + p2.x) / 2 - zz.cam) / W
      expect(at).toBeGreaterThanOrEqual(0.4)
      expect(at).toBeLessThanOrEqual(0.6)
      // the players swap places: same middle point, so the camera stays
      const c = zz.cam
      place(p1, 440, 240)
      place(p2, 200, 200)
      await settle()
      expect(Math.abs(zz.cam - c)).toBeLessThan(1)
      // player 1 moves 60 px right: the middle point moves 30 px, and the camera with it
      place(p1, 500, 240)
      await settle()
      expect(zz.cam - c).toBeGreaterThan(28)
      expect(zz.cam - c).toBeLessThan(32)
      // the guest's screen uses the same camera
      expect(Math.abs(g.guest.zz.cam - zz.cam)).toBeLessThan(1)
    }, 60_000)

    it('a player can NOT leave the screen: at the screen edge they stop until the other player comes closer', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      zz.items.length = 0
      const [p1, p2] = zz.players
      place(p1, 100, 200)
      place(p2, 300, 240)
      await g.tick(60)
      let outside = 0
      const watch = async (n) => {
        for (let i = 0; i < n; i++) {
          await g.tick(1)
          for (const p of [p1, p2]) if (p.x < zz.cam || p.x > zz.cam + W) outside++
        }
      }
      // player 2 walks right while player 1 stands still: player 2 stops at the screen edge
      g.guest.down('ArrowRight')
      await watch(360)
      const stop2 = p2.x
      await watch(30)
      expect(p2.x).toBeGreaterThan(450) // player 2 walked a long way ...
      expect(p2.x - stop2).toBeLessThan(0.5) // ... and then stopped
      expect(p1.x).toBe(100) // player 1 was not pulled along
      // player 1 comes closer: player 2 (still holding right) goes on
      g.host.down('ArrowRight')
      await watch(60)
      g.host.up('ArrowRight')
      await watch(30)
      expect(p2.x).toBeGreaterThan(stop2 + 40)
      g.guest.up('ArrowRight')
      await watch(10)
      // player 1 walks left while player 2 stands still: player 1 stops at the screen edge, not at the world edge
      const x2 = p2.x
      g.host.down('ArrowLeft')
      await watch(360)
      const stop1 = p1.x
      await watch(30)
      g.host.up('ArrowLeft')
      expect(stop1 - p1.x).toBeLessThan(0.5)
      expect(p1.x).toBeGreaterThan(60) // the world starts at x 8
      expect(p2.x).toBe(x2)
      expect(outside).toBe(0) // nobody was outside the screen at any step
    }, 60_000)

    it('a wave starts when either player reaches its start point, and a player who is behind is moved into the locked screen', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      // the first wave of stage 1 starts at x 320; its locked screen starts at 320 - 240 + 60 = 140
      for (const [walker, behind, dev] of [[1, 0, g.guest], [0, 1, g.host]]) {
        zz.startStage()
        await g.tick(2)
        const w = zz.players[walker], b = zz.players[behind]
        place(b, 60, 200)
        place(w, 290, 240)
        await g.tick(5)
        expect(zz.lock).toBeFalsy()
        dev.down('ArrowRight')
        let bx = b.x
        for (let i = 0; i < 120 && !zz.lock; i++) { bx = b.x; await g.tick(1) }
        dev.up('ArrowRight')
        const who = 'player ' + (walker + 1) + ' walks'
        expect([who, !!zz.lock]).toEqual([who, true]) // the wave started ...
        expect([who, bx < 320, zz.enemies.length > 0]).toEqual([who, true, true]) // ... with the other player still behind
        await g.tick(10)
        expect([who, b.x >= zz.lock.cam && b.x <= zz.lock.cam + W]).toEqual([who, true]) // the player behind is in the locked screen
      }
    }, 60_000)

    it('each enemy, boss included, chases and attacks the nearest player who is not out and not knocked down', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      const [p1, p2] = zz.players
      const reset = () => {
        place(p1, 80, 210)
        place(p2, 380, 210)
        for (const p of [p1, p2]) { p.hp = p.maxHp; p.inv = 0 }
      }
      // a punk nearer to player 2 walks to player 2 and hits player 2, not player 1
      reset()
      const punk = zz.spawn('punk', 1)
      place(punk, 260, 210)
      expect(await stepUntil(g.tick, () => p2.hp < p2.maxHp, 600), 'the punk hit player 2').toBe(true)
      expect(punk.x).toBeGreaterThan(300) // it walked to player 2
      expect(p1.hp).toBe(p1.maxHp)
      // a boss nearer to player 2 does the same
      clear(zz)
      reset()
      const robot = zz.spawn('boss', 1)
      place(robot, 470, 210)
      expect(await stepUntil(g.tick, () => p2.hp < p2.maxHp, 600), 'the ROBÔ CHEFÃO hit player 2').toBe(true)
      expect(p1.hp).toBe(p1.maxHp)
      // when player 2 is knocked down, a punk next to player 2 turns to player 1
      clear(zz)
      reset()
      const punk2 = zz.spawn('punk', 1)
      punk2.cd = 99999
      place(punk2, 340, 210)
      await g.tick(70)
      expect(punk2.facing).toBe(1) // it is after player 2 (on its right)
      p2.state = 'down'
      p2.t = 0
      const x0 = punk2.x
      await g.tick(20)
      expect(p2.state).toBe('down') // still down
      expect(punk2.facing).toBe(-1) // now it is after player 1 (on its left)
      expect(punk2.x).toBeLessThan(x0 - 10)
      // when player 2 is out, a punk right next to player 2 goes after player 1 and hits player 1
      clear(zz)
      reset()
      await knockOut(g, 1)
      clear(zz)
      place(p1, 80, 210)
      p1.hp = p1.maxHp
      p1.inv = 0
      const punk3 = zz.spawn('punk', 1)
      place(punk3, p2.x + 20, 210)
      expect(await stepUntil(g.tick, () => p1.hp < p1.maxHp, 900), 'the punk hit player 1').toBe(true)
    }, 60_000)

    it('at most 2 normal enemies attack each player at the same time', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      const [p1, p2] = zz.players
      place(p1, 100, 210)
      place(p2, 380, 210)
      // 4 punks around each player
      for (const [x, y] of [[40, 195], [60, 225], [150, 195], [170, 225], [320, 195], [340, 225], [430, 195], [450, 225]]) {
        place(zz.spawn('punk', x < 240 ? -1 : 1), x, y)
      }
      const most = [0, 0], attackers = [new Set(), new Set()]
      for (let i = 0; i < 900; i++) {
        // the players stand still and do not die during the count
        p1.x = 100; p1.y = 210; p1.hp = p1.maxHp
        p2.x = 380; p2.y = 210; p2.hp = p2.maxHp
        await g.tick(1)
        const now = [0, 0]
        for (const e of zz.enemies) {
          if (e.state !== 'attack') continue
          const s = Math.abs(e.x - p1.x) <= Math.abs(e.x - p2.x) ? 0 : 1 // the player it is next to
          now[s]++
          attackers[s].add(e)
        }
        most[0] = Math.max(most[0], now[0])
        most[1] = Math.max(most[1], now[1])
      }
      expect(most[0]).toBeLessThanOrEqual(2)
      expect(most[1]).toBeLessThanOrEqual(2)
      // the limit is for each player (up to 4 in all): each player was attacked by 2 different enemies
      expect(attackers[0].size).toBeGreaterThanOrEqual(2)
      expect(attackers[1].size).toBeGreaterThanOrEqual(2)
    }, 60_000)

    it('enemy hits, bottles, fire, pillars, vomit, the vomit puddle and the stage 4 runners can hit either player', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      for (const slot of [0, 1]) {
        const who = 'player ' + (slot + 1) + ': '
        clear(zz)
        const punk = await foe(g, 'punk', slot)
        expect(await hpLoss(g, punk, 'ePunch', slot), who + 'enemy hit').toBeGreaterThan(0)
        clear(zz)
        const louca = await foe(g, 'louca', slot, 120)
        expect(await hpLoss(g, louca, 'throwB', slot, 120), who + 'bottle').toBeGreaterThan(0)
        clear(zz)
        const robot = await foe(g, 'boss', slot, 60)
        expect(await hpLoss(g, robot, 'bossFire', slot, 60), who + 'fire').toBeGreaterThan(0)
        expect(await hpLoss(g, robot, 'bossPillar', slot, 60), who + 'pillar').toBeGreaterThan(0)
        clear(zz)
        const tigas = await foe(g, 'drunk', slot, 120)
        expect(await vomitLoss(g, tigas, slot), who + 'vomit').toBeGreaterThan(0)
        expect((await puddleLoss(g, tigas, slot)).loss, who + 'vomit puddle').toBeGreaterThan(0)
      }
      // the stage 4 runners (they come during the TIGAS fight of stage 4)
      const g4 = await twoPlayers({ stage: 4 })
      await fireTrigger(g4, 5)
      const tigas = await waitFor(g4, () => named(g4.zz, 'TIGAS')[0], 300)
      tigas.cd = 99999
      for (const slot of [0, 1]) expect(await runnerHits(g4, slot), 'the runner stops player ' + (slot + 1)).toBe(true)
    }, 60_000)

    it('players can NOT hurt each other with any attack, weapon, thrown enemy or PODER', async () => {
      // player 1 = DJ (his third punch throws discs), player 2 = BATERA (his PODER runs across the screen)
      const g = await twoPlayers({ p1: 'dj', p2: 'batera' })
      const zz = g.zz
      noWaves(zz)
      const taco = (z, me) => { me.weapon = { w: 'taco', dur: 7 } }
      const mask = (z, me) => { me.maskT = 600 }
      const usePower = (slot) => async (tick) => {
        zz.fill(slot)
        ;(slot ? g.guest : g.host).tap('KeyH')
        expect(await stepUntil(tick, () => !!zz.power, 10), 'the PODER started').toBe(true)
        expect(await stepUntil(tick, () => !zz.power, 900), 'the PODER ended').toBe(true)
      }
      const loseALife = async (tick) => { // player 1 falls with lives left; standing up again blows enemies away
        const me = zz.players[0], punk = zz.spawn('punk', -1)
        place(punk, me.x - 18, me.y)
        punk.facing = 1
        punk.cd = 99999
        me.hp = 1
        zz.attack(punk, 'ePunch')
        expect(await stepUntil(tick, () => me.state === 'getup', 300), 'player 1 stood up again').toBe(true)
      }
      const cases = [
        // [attacker, what, gap to the other player, moves, setup]
        [0, 'punches (with discs)', 16, ['tap KeyJ', 6, 'tap KeyJ', 6, 'tap KeyJ', 50]],
        [0, 'kick', 16, ['tap KeyK', 40]],
        [0, 'jump kick', 16, ['tap Space', 3, 'tap KeyK', 40]],
        [0, 'run and dash punch', 50, ['tap ArrowRight', 3, 'down ArrowRight', 3, 'tap KeyJ', 3, 'up ArrowRight', 40]],
        [0, 'signature weapon punches', 16, ['tap KeyU', 3, 'tap KeyJ', 6, 'tap KeyJ', 6, 'tap KeyJ', 40, 'tap KeyU', 3]],
        [0, 'MÁSCARA punches', 16, ['tap KeyJ', 5, 'tap KeyJ', 5, 'tap KeyJ', 40], mask],
        [0, 'MÁSCARA kick', 16, ['tap KeyK', 40], mask],
        [0, 'weapon swing', 20, ['tap KeyJ', 40], taco],
        [0, 'weapon throw', 40, ['tap KeyK', 40], taco],
        [0, 'thrown enemy', 70, ['down ArrowRight', 2, 'up ArrowRight', 2, 'tap KeyK', 50], (z, me) => {
          const e = z.spawn('brute', 1) // a hurt enemy right in front is grabbed at once
          place(e, me.x + 10, me.y)
          e.cd = 99999
          e.state = 'hurt'
          e.hitstun = 40
        }],
        [0, 'get-up blast', 40, [loseALife]],
        [1, 'punches', 16, ['tap KeyJ', 6, 'tap KeyJ', 6, 'tap KeyJ', 50]],
        [1, 'kick', 16, ['tap KeyK', 40]],
        [1, 'PODER', 60, [usePower(1)]],
      ]
      for (const [slot, what, gap, moves, setup] of cases) {
        const r = await attackOnFriend(g, slot, gap, moves, setup)
        const who = 'player ' + (slot + 1) + ' ' + what
        expect({ who, ...r }).toEqual({ who, hurt: false, reached: true })
      }
    }, 60_000)

    it('players walk through each other: they do NOT push or stop each other', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      zz.items.length = 0
      const [p1, p2] = zz.players
      place(p1, 100, 210)
      place(p2, 250, 210)
      await g.tick(2)
      // per step: [p1 dx, p1 dy, p2 dx, p2 dy]
      const log = async (n) => {
        const out = []
        for (let i = 0; i < n; i++) {
          const a = [p1.x, p1.y, p2.x, p2.y]
          await g.tick(1)
          out.push([p1.x - a[0], p1.y - a[1], p2.x - a[2], p2.y - a[3]])
        }
        return out
      }
      const walking = (d, dir) => Math.abs(d - dir * 1.45) < 0.01 // walking speed: 1.45 px a step
      // player 1 walks through player 2, who stands still on the same line
      g.host.down('ArrowRight')
      const a = await log(150)
      g.host.up('ArrowRight')
      expect(a.every(([dx1, dy1]) => walking(dx1, 1) && dy1 === 0)).toBe(true) // never stopped or pushed
      expect(a.every(([, , dx2, dy2]) => dx2 === 0 && dy2 === 0)).toBe(true) // player 2 was never pushed
      expect(p1.x).toBeGreaterThan(p2.x + 50) // player 1 is now past player 2
      await g.tick(5)
      // both walk toward each other on the same line and pass
      g.host.down('ArrowLeft')
      g.guest.down('ArrowRight')
      const b = await log(120)
      g.host.up('ArrowLeft')
      g.guest.up('ArrowRight')
      expect(b.every(([dx1, dy1]) => walking(dx1, -1) && dy1 === 0)).toBe(true)
      const moving2 = b.slice(b.findIndex(([, , dx2]) => dx2 !== 0)) // player 2's key comes over the network a step later
      expect(moving2.length).toBeGreaterThan(110)
      expect(moving2.every(([, , dx2, dy2]) => walking(dx2, 1) && dy2 === 0)).toBe(true)
      expect(p1.x).toBeLessThan(p2.x) // they passed each other
    }, 60_000)
  }
}

// ──────────────────────────────────────────────────────────────────────
{
  // Draft bodies for tests/multiplayer.integration.test.js:
  // the last 10 tests of 'playing together' (NEW-23 .. NEW-32) and all of 'shop, pause and bonus room'.
  // The rule and the reason for each decision: .specs/online-coop/DECISIONS.md

  const T = 60_000

  // Numbers from the game code (jogo/index.html)
  const PCUT = 84 // steps of the PODER cut-in, before the PODER effect starts
  const BONUS_X = 4300 // the bonus room starts at this world x
  const BONUS_DOOR = 1500 // DOORS: the bonus door
  const SHOP_DOOR = 1700 // DOORS: shop 0, CAFÉ QUENTINHO
  const DOOR_Y = 180 // a door works only close to the wall: y <= YMIN + 16 = 188

  /** No wave will start, no enemy, nothing on the ground. */
  function quiet(g) {
    for (const t of g.zz.trigs) t.x = 1e9
    g.zz.enemies.length = 0
    g.zz.items.length = 0
  }

  /** Put a fighter at x,y, standing still, facing right (1) or left (-1). */
  function put(f, x, y, facing = 1) {
    place(f, x, y)
    f.facing = facing
  }

  /** A normal enemy that stands still and never attacks (a target for hits). */
  function dummy(g, type, x, y) {
    const e = g.zz.spawn(type, 1)
    put(e, x, y, -1)
    e.hp = e.maxHp = 999
    e.stunT = 1e7
    return e
  }

  const coin = (x, y, val) => ({ kind: 'coin', val, x, y, z: 0, vz: 0, vx: 0, t: 20 })
  const food = (x, y) => ({ kind: 'food', x, y, z: 0, vz: 0, vx: 0, t: 20 })
  const fire = (x, y, vx) => ({ kind: 'fire', x, y, z: 44, vx, t: 0 })

  const until = (g, cond, max) => stepUntil((n) => g.tick(n), cond, max)

  /** Run n steps; true if cond() was true after any of them. */
  async function during(g, n, cond) {
    let seen = false
    for (let i = 0; i < n; i++) {
      await g.tick(1)
      if (cond()) seen = true
    }
    return seen
  }

  /** Tap keys on one device, one after the other. */
  async function keys(g, dev, list, wait = 4) {
    for (const k of list) {
      dev.tap(k)
      await g.tick(wait)
    }
  }

  /** True if the device draws a text that contains s in one of the next frames. */
  async function shows(g, dev, s, frames = 30) {
    for (let i = 0; i < frames; i++) {
      if (dev.render().some((t) => t.includes(s))) return true
      await g.tick(1)
    }
    return false
  }

  /** Tap a key and tell if that fighter starts an attack; then wait until the attack is over. */
  async function attacks(g, dev, key, p) {
    dev.tap(key)
    const seen = await during(g, 12, () => p.state === 'attack')
    await g.tick(20)
    return seen
  }

  /** Move both fighters to (x1,y1) and (x2,y2) little by little, so the shared camera can follow. */
  async function moveTeam(g, [x1, y1], [x2, y2]) {
    const zz = g.zz
    const far = Math.max(x1, x2)
    for (let i = 0; i < 1000; i++) {
      const d = Math.min(0, zz.cam + 400 - far) // the front fighter stays on the screen
      put(zz.players[0], x1 + d, y1)
      put(zz.players[1], x2 + d, y2)
      if (d === 0) break
      await g.tick(1)
    }
    await g.tick(40) // the camera settles
  }

  GROUP['playing together#shop'] = () => {
    // NEW-23
    it('an enemy grabbed by one player can NOT be grabbed or hit by the other player', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215, -1)
      put(p2, 200, 215, -1)
      const e = dummy(g, 'punk', 88, 215)
      e.state = 'hurt' // a dazed enemy is grabbed at once by a player who walks into it
      e.hitstun = 1e7
      e.vx = 0

      // J1 walks left into it and grabs it
      host.down('ArrowLeft')
      await g.tick(2)
      host.up('ArrowLeft')
      await g.tick(2)
      expect(p1.grabbed).toBe(e)
      expect(e.state).toBe('grabbed')

      // J2 walks into the held enemy for 30 steps, kept at grab distance
      // (a free enemy is grabbed after 15 steps of walking into it)
      let pushing = 0
      guest.down('ArrowLeft')
      for (let i = 0; i < 30; i++) {
        const x0 = e.x + 11 // after one step to the left: about 9.5 px in front of it (grab: 4..18 px)
        p2.x = x0
        p2.y = e.y
        await g.tick(1)
        const front = (e.x - p2.x) * p2.facing
        if (p2.x < x0 && front > 4 && front < 18) pushing++
      }
      guest.up('ArrowLeft')
      await g.tick(5)
      expect(pushing).toBeGreaterThanOrEqual(20)
      expect(p2.grabbed ?? null).toBe(null)
      expect(p2.state).not.toBe('grab')
      expect(p1.grabbed).toBe(e)
      expect(e.state).toBe('grabbed')

      // J2 punches and kicks it: it is in reach (a punch reaches 0..26 px), but nothing happens
      const front = (e.x - p2.x) * p2.facing
      expect(front).toBeGreaterThan(0)
      expect(front).toBeLessThan(20)
      const hp = e.hp
      guest.tap('KeyJ')
      expect(await during(g, 20, () => p2.state === 'attack')).toBe(true)
      guest.tap('KeyK')
      expect(await during(g, 30, () => p2.state === 'attack')).toBe(true)
      expect(e.hp).toBe(hp)
      expect(p1.grabbed).toBe(e)
      expect(e.state).toBe('grabbed')

      // when J1 lets go (a grab lasts about 110 steps), the same punch of J2 hits it
      expect(await until(g, () => !p1.grabbed, 200)).toBe(true)
      guest.tap('KeyJ')
      await g.tick(15)
      expect(e.hp).toBeLessThan(hp)
    }, T)

    // NEW-24
    it('each player has their own money: a coin goes only to the player who touches it, and in the shop a player pays with their own money and only they get what they buy', async () => {
      const g = await twoPlayers()
      const { guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      p1.money = 0
      p2.money = 0

      // a R$ 2,00 coin under J2, then a R$ 0,50 coin under J1
      zz.items.push(coin(300, 215, 2))
      await g.tick(5)
      expect(p2.money).toBe(2)
      expect(p1.money).toBe(0)
      zz.items.push(coin(100, 215, 0.5))
      await g.tick(5)
      expect(p1.money).toBe(0.5)
      expect(p2.money).toBe(2)
      expect(zz.items.filter((i) => i.kind === 'coin')).toHaveLength(0)

      // J2 enters CAFÉ QUENTINHO; Pão de Queijo (the last item) costs R$ 3,75 and gives +30 HP and +1 FOR
      await moveTeam(g, [1560, 230], [SHOP_DOOR, DOOR_Y])
      p1.money = 10
      p2.money = 3
      p1.hp = 50
      p2.hp = 50
      const str1 = p1.atkBonus
      const str2 = p2.atkBonus
      guest.tap('ArrowUp')
      await g.tick(45)
      expect(zz.scene).toBe('shop')
      expect(zz.shop.by).toBe(1)
      await keys(g, guest, ['ArrowUp']) // from the first item up to the last one
      expect(zz.shop.sel).toBe(4)

      // J2 has R$ 3,00 < 3,75: the purchase fails, J1's R$ 10,00 is NOT used
      await keys(g, guest, ['KeyJ', 'KeyJ'])
      expect(p2.money).toBe(3)
      expect(p1.money).toBe(10)
      expect(p2.hp).toBe(50)
      expect(p2.atkBonus).toBe(str2)

      // with R$ 5,00 J2 buys it: 5,00 - 3,75 = 1,25; 50 + 30 = 80 HP; FOR + 1. J1 gets nothing.
      p2.money = 5
      await keys(g, guest, ['KeyJ', 'KeyJ'])
      expect(p2.money).toBe(1.25)
      expect(p2.hp).toBe(80)
      expect(p2.atkBonus).toBe(str2 + 1)
      expect(p1.money).toBe(10)
      expect(p1.hp).toBe(50)
      expect(p1.atkBonus).toBe(str1)
    }, T)

    // NEW-25
    it('food heals only the player who picks it up', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      p1.hp = 40
      p2.hp = 40

      // food (+40 HP) under J2: 40 + 40 = 80 for J2 only
      zz.items.push(food(300, 215))
      await g.tick(5)
      expect(p2.hp).toBe(80)
      expect(p1.hp).toBe(40)
      expect(zz.items.filter((i) => i.kind === 'food')).toHaveLength(0)

      // food under J1: 80 for J1 only
      zz.items.push(food(100, 215))
      await g.tick(5)
      expect(p1.hp).toBe(80)
      expect(p2.hp).toBe(80)
      expect(zz.items.filter((i) => i.kind === 'food')).toHaveLength(0)
    }, T)

    // NEW-26
    it('with 2 players, each player who is not out gets half the XP of every kill, so both stay at the same level', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      for (const p of [p1, p2]) {
        p.lvl = 1
        p.xp = 40
      }

      // J2 knocks out a punk (10 XP): 5 each; 40 + 5 = 45 = 1 x 45, so both reach level 2 with 0 XP
      const punk = dummy(g, 'punk', 316, 215)
      punk.hp = 1
      guest.tap('KeyJ')
      expect(await until(g, () => !zz.enemies.includes(punk), 300)).toBe(true)
      expect([p1.lvl, p1.xp]).toEqual([2, 0])
      expect([p2.lvl, p2.xp]).toEqual([2, 0])

      // J1 knocks out a brute (25 XP): half rounded up = 13 each
      const brute = dummy(g, 'brute', 116, 215)
      brute.hp = 1
      host.tap('KeyJ')
      expect(await until(g, () => !zz.enemies.includes(brute), 300)).toBe(true)
      expect([p1.lvl, p1.xp]).toEqual([2, 13])
      expect([p2.lvl, p2.xp]).toEqual([2, 13])
    }, T)

    // NEW-27
    it('each player has their own MASC and PODER bars, filled only by their own hits and by the hits they take', async () => {
      const g = await twoPlayers()
      const { guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      for (const p of [p1, p2]) {
        p.fury = 0
        p.pw = 0
      }
      const target = dummy(g, 'punk', 316, 215)

      // J2 punches: MASC + 5, PODER + 5 x 1.35 = 6.75, only for J2
      guest.tap('KeyJ')
      await g.tick(25)
      expect(target.hp).toBeLessThan(999)
      expect(p2.fury).toBe(5)
      expect(p2.pw).toBeCloseTo(6.75)
      expect(p1.fury).toBe(0)
      expect(p1.pw).toBe(0)

      // J2 throws a weapon at it: that hit is J2's too (10 and 13.5)
      p2.weapon = { w: 'taco', dur: 7 }
      const hp = target.hp
      guest.tap('KeyK')
      await g.tick(30)
      expect(target.hp).toBeLessThan(hp)
      expect(p2.fury).toBe(10)
      expect(p2.pw).toBeCloseTo(13.5)
      expect(p1.fury).toBe(0)
      expect(p1.pw).toBe(0)

      // an enemy punches J1: MASC + 4, PODER + 4 x 1.35 = 5.4, only for J1
      const hp1 = p1.hp
      const puncher = zz.spawn('punk', 1)
      put(puncher, 118, 215, -1)
      zz.attack(puncher, 'ePunch')
      await g.tick(25)
      expect(p1.hp).toBeLessThan(hp1)
      expect(p1.fury).toBe(4)
      expect(p1.pw).toBeCloseTo(5.4)
      expect(p2.fury).toBe(10)
      expect(p2.pw).toBeCloseTo(13.5)
    }, T)

    // NEW-28
    it('each player has their own hit combo counter; the other player\'s hits do NOT add to it', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      const a = dummy(g, 'punk', 116, 215)
      const b = dummy(g, 'punk', 316, 215)

      // J1 hits twice (a combo lasts 70 steps after the last hit)
      host.tap('KeyJ')
      await g.tick(25)
      host.tap('KeyJ')
      await g.tick(10)
      expect(a.hp).toBeLessThan(999)
      expect(p1.comboN).toBe(2)
      expect(p2.comboN || 0).toBe(0)

      // J2 hits once while J1's combo is still on
      guest.tap('KeyJ')
      await g.tick(10)
      expect(b.hp).toBeLessThan(999)
      expect(p2.comboN).toBe(1)
      expect(p1.comboN).toBe(2)
    }, T)

    // NEW-29
    it('only one PODER can run at a time: the other player\'s PODER button does NOT work then, and their full bar is kept', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      zz.fill(0)
      zz.fill(1)
      p2.fury = 0 // only J2's PODER bar is full, so J2's button can only mean PODER

      host.tap('KeyH')
      expect(await until(g, () => zz.power != null, 10)).toBe(true)
      expect(zz.power).toMatchObject({ by: 0, k: 'vocal' })

      // J2 presses PODER during J1's cut-in and during J1's PODER effect
      for (const when of [20, PCUT + 20]) {
        expect(await until(g, () => zz.power.t >= when, 300)).toBe(true)
        guest.tap('KeyH')
        await g.tick(6)
        expect(zz.power).toMatchObject({ by: 0, k: 'vocal' })
        expect(p2.pw).toBe(100)
      }

      // J1's PODER ends: J2's bar is still full and no PODER starts by itself
      expect(await until(g, () => zz.power == null, 300)).toBe(true)
      await g.tick(10)
      expect(zz.power).toBe(null)
      expect(p2.pw).toBe(100)

      // now J2's PODER works
      guest.tap('KeyH')
      expect(await until(g, () => zz.power != null, 10)).toBe(true)
      expect(zz.power).toMatchObject({ by: 1, k: 'guitar' })
      expect(p2.pw).toBe(0)
    }, T)

    // NEW-30
    it('while a PODER runs, both players can NOT move and can NOT be hurt', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215, 1)
      put(p2, 300, 215, -1)
      zz.fill(0)
      host.tap('KeyH')
      expect(await until(g, () => zz.power != null, 10)).toBe(true)
      const x1 = p1.x
      const x2 = p2.x
      const hp1 = p1.hp
      const hp2 = p2.hp

      // both hold a direction during the PODER
      host.down('ArrowRight')
      guest.down('ArrowLeft')
      // wait for the end of the cut-in and of J1's short shield at the PODER start (30 steps)
      expect(await until(g, () => zz.power && zz.power.t > PCUT + 35, 300)).toBe(true)
      // a fireball flies into each player (it hurts any player it touches who can be hit)
      zz.projs.push(fire(p1.x + 20, p1.y, -3.6), fire(p2.x - 20, p2.y, 3.6))
      await g.tick(20)
      expect(zz.power).not.toBe(null)
      expect([p1.x, p2.x]).toEqual([x1, x2])
      expect([p1.hp, p2.hp]).toEqual([hp1, hp2])

      // after the PODER, the same keys move them and the same fireballs hurt them
      expect(await until(g, () => zz.power == null, 300)).toBe(true)
      host.up('ArrowRight')
      guest.up('ArrowLeft')
      await g.tick(3)
      host.down('ArrowRight')
      guest.down('ArrowLeft')
      await g.tick(15)
      host.up('ArrowRight')
      guest.up('ArrowLeft')
      await g.tick(5)
      expect(p1.x).toBeGreaterThan(x1)
      expect(p2.x).toBeLessThan(x2)
      const hpA = p1.hp
      const hpB = p2.hp
      zz.projs.push(fire(p1.x + 20, p1.y, -3.6), fire(p2.x - 20, p2.y, 3.6))
      await g.tick(20)
      expect(p1.hp).toBeLessThan(hpA)
      expect(p2.hp).toBeLessThan(hpB)
    }, T)

    // NEW-31
    it('a stun from a stage 4 runner stops only the player it hits; the other player can still move', async () => {
      const g = await twoPlayers({ stage: 4 })
      const { host, guest } = g
      const zz = g.zz
      zz.enemies.length = 0
      zz.items.length = 0
      zz.trigs.splice(0, zz.trigs.length - 1) // only the last fight is left: TIGAS at the bar

      // both past the start point of the fight (x 3470), on two lanes far apart,
      // so one runner can touch only one of them
      await moveTeam(g, [3490, 190], [3540, 245])
      expect(await until(g, () => zz.enemies.some((e) => e.drunk), 300)).toBe(true)
      const boss = zz.enemies.find((e) => e.drunk)
      put(boss, 3760, 215, -1)
      boss.stunT = 1e7 // TIGAS waits at the far right and does not attack
      put(zz.players[0], 3490, 190)
      put(zz.players[1], 3540, 245)

      zz.runnerSoon()
      expect(await until(g, () => zz.players.some((p) => p.stunT > 0), 400)).toBe(true)
      const s = zz.players.findIndex((p) => p.stunT > 0)
      const stunned = zz.players[s]
      const other = zz.players[1 - s]
      expect(other.stunT || 0).toBe(0)

      // both hold left for 30 steps: only the player who was not hit walks (1.45 px per step)
      const xs = stunned.x
      const xo = other.x
      host.down('ArrowLeft')
      guest.down('ArrowLeft')
      await g.tick(30)
      host.up('ArrowLeft')
      guest.up('ArrowLeft')
      expect(stunned.stunT).toBeGreaterThan(0)
      expect(stunned.x).toBe(xs)
      expect(other.stunT || 0).toBe(0)
      expect(other.x).toBeLessThan(xo - 20)
    }, T)

    // NEW-32
    it('the Feijão helper in stage 2 does NOT appear when one of the players picked Feijão, also after that player leaves or is out', async () => {
      // without Feijão in the team, the helper is there from the first steps of stage 2
      const a = await twoPlayers({ stage: 2, p1: 'vocal', p2: 'guitar' })
      expect(await until(a, () => a.zz.buddy != null, 60)).toBe(true)

      // J2 picked Feijão: no helper
      const g = await twoPlayers({ stage: 2, p1: 'vocal', p2: 'feijao' })
      const zz = g.zz
      expect(await until(g, () => zz.buddy != null, 120)).toBe(false)

      // J2 loses the last life and is out: still no helper
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 250, 215)
      p2.lives = 0
      p2.hp = 1
      const e = zz.spawn('punk', 1)
      put(e, 268, 215, -1)
      zz.attack(e, 'ePunch')
      expect(await until(g, () => p2.hp <= 0, 60)).toBe(true)
      e.stunT = 1e7 // it stops attacking
      expect(await until(g, () => zz.players[1].out === true, 400)).toBe(true)
      expect(await until(g, () => zz.buddy != null, 120)).toBe(false)
      expect(zz.scene).toBe('play')

      // J2 leaves the room (a player who is out can use SAIR DA SALA too): still no helper
      await g.leaveRoom(g.guest)
      expect(zz.players[1].left).toBe(true)
      expect(await until(g, () => zz.buddy != null, 120)).toBe(false)
      expect(zz.scene).toBe('play')
    }, T)
  }
  GROUP['shop, pause and bonus room#shop'] = () => {
    // D7
    it('when a player pauses or enters a shop, the game stops for both players', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)
      const clock = dummy(g, 'punk', 200, 250) // its step counter (t) grows while the game runs

      // J2 pauses: J1 can not walk and the enemy does not move on
      guest.tap('KeyP')
      await g.tick(4)
      expect([zz.scene, guest.zz.scene]).toEqual(['pause', 'pause'])
      expect(zz.stop).toMatchObject({ by: 1, why: 'pause' })
      const x1 = p1.x
      const t1 = clock.t
      host.down('ArrowRight')
      await g.tick(60)
      host.up('ArrowRight')
      await g.tick(3)
      expect(p1.x).toBe(x1)
      expect(clock.t).toBe(t1)
      guest.tap('KeyP')
      await g.tick(4)
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])
      expect(zz.stop).toBe(null)
      await g.tick(5)
      expect(clock.t).toBeGreaterThan(t1)

      // J1 enters a shop: J2 can not walk and the enemy does not move on
      await moveTeam(g, [SHOP_DOOR, DOOR_Y], [1560, 230])
      put(clock, 1620, 250, -1)
      host.tap('ArrowUp')
      await g.tick(45)
      expect([zz.scene, guest.zz.scene]).toEqual(['shop', 'shop'])
      expect(zz.stop).toMatchObject({ by: 0, why: 'shop' })
      const x2 = p2.x
      const t2 = clock.t
      guest.down('ArrowLeft')
      await g.tick(60)
      guest.up('ArrowLeft')
      await g.tick(3)
      expect(p2.x).toBe(x2)
      expect(clock.t).toBe(t2)
      host.tap('KeyK')
      await g.tick(45)
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])
      expect(zz.stop).toBe(null)
      await g.tick(5)
      expect(clock.t).toBeGreaterThan(t2)
    }, T)

    // D7
    it('while the game is stopped, the other player sees why: \'JOGADOR 1 ESTÁ NA LOJA\' or \'JOGADOR 1 PAUSOU\' (or JOGADOR 2)', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)

      // J1 pauses
      host.tap('KeyP')
      await g.tick(4)
      expect(zz.stop).toMatchObject({ by: 0, why: 'pause' })
      expect(await shows(g, guest, 'JOGADOR 1 PAUSOU')).toBe(true)
      host.tap('KeyP')
      await g.tick(4)
      expect(await shows(g, guest, 'JOGADOR 1 PAUSOU', 10)).toBe(false)

      // J2 pauses
      guest.tap('KeyP')
      await g.tick(4)
      expect(zz.stop).toMatchObject({ by: 1, why: 'pause' })
      expect(await shows(g, host, 'JOGADOR 2 PAUSOU')).toBe(true)
      guest.tap('KeyP')
      await g.tick(4)
      expect(await shows(g, host, 'JOGADOR 2 PAUSOU', 10)).toBe(false)

      // J1 in a shop
      await moveTeam(g, [SHOP_DOOR, DOOR_Y], [1560, 230])
      host.tap('ArrowUp')
      await g.tick(45)
      expect(zz.stop).toMatchObject({ by: 0, why: 'shop' })
      expect(await shows(g, guest, 'JOGADOR 1 ESTÁ NA LOJA')).toBe(true)
      host.tap('KeyK')
      await g.tick(45)
      expect(await shows(g, guest, 'JOGADOR 1 ESTÁ NA LOJA', 10)).toBe(false)

      // J2 in a shop
      await moveTeam(g, [1560, 230], [SHOP_DOOR, DOOR_Y])
      guest.tap('ArrowUp')
      await g.tick(45)
      expect(zz.stop).toMatchObject({ by: 1, why: 'shop' })
      expect(await shows(g, host, 'JOGADOR 2 ESTÁ NA LOJA')).toBe(true)
    }, T)

    // NEW-33
    it('while the game is stopped for pause or shop, only the player who stopped it can act or go back to the game; the other player\'s buttons do NOT work', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players

      // J2 pauses. J1's P and ESC (close the pause), ▲ ▲ ENTER (= VOLTAR AO JOGO from the first row) and J do nothing
      guest.tap('KeyP')
      await g.tick(4)
      expect(zz.stop).toMatchObject({ by: 1, why: 'pause' })
      await keys(g, host, ['KeyP', 'ArrowUp', 'ArrowUp', 'Enter', 'KeyJ', 'Escape'])
      await g.tick(20)
      expect([zz.scene, guest.zz.scene]).toEqual(['pause', 'pause'])
      expect(zz.stop).toMatchObject({ by: 1, why: 'pause' })
      // J2 uses the menu: ▲ ▲ to VOLTAR AO JOGO, ENTER
      await keys(g, guest, ['ArrowUp', 'ArrowUp', 'Enter'])
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])
      expect(zz.stop).toBe(null)

      // J1 enters a shop while J2 stands at the bonus door
      await moveTeam(g, [SHOP_DOOR, DOOR_Y], [BONUS_DOOR, DOOR_Y])
      p1.money = 10
      p2.money = 10
      host.tap('ArrowUp')
      await g.tick(45)
      expect(zz.shop).toMatchObject({ by: 0, sel: 0, confirm: false })
      // J2's ▼, J, ENTER, ▲ (also the door key), K and P do nothing
      for (const k of ['ArrowDown', 'KeyJ', 'Enter', 'ArrowUp', 'KeyK', 'KeyP']) {
        guest.tap(k)
        await g.tick(6)
        expect(zz.shop, k).toMatchObject({ by: 0, sel: 0, confirm: false })
      }
      await g.tick(45)
      expect([zz.scene, guest.zz.scene]).toEqual(['shop', 'shop'])
      expect(zz.stop).toMatchObject({ by: 0, why: 'shop' })
      expect([p1.money, p2.money]).toEqual([10, 10])
      expect(zz.bonus).toBe(false)

      // J1 acts in the shop and goes back to the game
      host.tap('ArrowDown')
      await g.tick(4)
      expect(zz.shop.sel).toBe(1)
      host.tap('KeyK')
      await g.tick(45)
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])
      expect(zz.stop).toBe(null)
      // J2's ▲ at the bonus door was not kept for later either
      await g.tick(30)
      expect(zz.bonus).toBe(false)
    }, T)

    // NEW-34
    it('changing keys in the pause menu changes only that player\'s own keys', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)
      const [p1, p2] = zz.players
      put(p1, 100, 215)
      put(p2, 300, 215)

      // J2 pauses and sets Q as the SOCO (punch) key: ▼ x4 to SOCO, ENTER, Q, then P to play again
      await keys(g, guest, ['KeyP', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'KeyQ', 'KeyP'])
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])

      // J2: Q punches now, J does not
      expect(await attacks(g, guest, 'KeyQ', p2)).toBe(true)
      expect(await attacks(g, guest, 'KeyJ', p2)).toBe(false)
      // J1: J still punches, Q does nothing
      expect(await attacks(g, host, 'KeyJ', p1)).toBe(true)
      expect(await attacks(g, host, 'KeyQ', p1)).toBe(false)
    }, T)

    // NEW-35
    it('when a player switches to another tab or app, the game pauses for both players, as if that player pressed pause', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)

      // J2 switches away
      guest.setHidden(true)
      await g.tick(4)
      expect([zz.scene, guest.zz.scene]).toEqual(['pause', 'pause'])
      expect(zz.stop).toMatchObject({ by: 1, why: 'pause' })
      expect(await shows(g, host, 'JOGADOR 2 PAUSOU')).toBe(true)
      // coming back does not start the game: J2 closes the pause like after pressing P
      guest.setHidden(false)
      await g.tick(30)
      expect(zz.scene).toBe('pause')
      guest.tap('KeyP')
      await g.tick(4)
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])
      expect(zz.stop).toBe(null)

      // J1 switches away
      host.setHidden(true)
      await g.tick(4)
      expect([zz.scene, guest.zz.scene]).toEqual(['pause', 'pause'])
      expect(zz.stop).toMatchObject({ by: 0, why: 'pause' })
      expect(await shows(g, guest, 'JOGADOR 1 PAUSOU')).toBe(true)
      host.setHidden(false)
      await g.tick(30)
      expect(zz.scene).toBe('pause')
      host.tap('KeyP')
      await g.tick(4)
      expect([zz.scene, guest.zz.scene]).toEqual(['play', 'play'])
      expect(zz.stop).toBe(null)
    }, T)

    // D7
    it('when either player uses the bonus door, both players go into the bonus room together', async () => {
      for (const slot of [1, 0]) {
        const g = await twoPlayers()
        const zz = g.zz
        quiet(g)
        const door = [BONUS_DOOR, DOOR_Y]
        const away = [1300, 230]
        await moveTeam(g, slot === 0 ? door : away, slot === 0 ? away : door)
        ;(slot === 0 ? g.host : g.guest).tap('ArrowUp')
        expect(await until(g, () => zz.bonus, 60)).toBe(true)
        await g.tick(30)
        for (const p of zz.players) expect(p.x, 'J' + (p.slot + 1)).toBeGreaterThan(BONUS_X)
        for (const p of g.guest.zz.players) expect(p.x, 'guest copy J' + (p.slot + 1)).toBeGreaterThan(BONUS_X)
      }
    }, T)

    // NEW-36
    it('the bonus room opens only once per stage for the team, NOT once for each player', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      quiet(g)

      // J2 uses the bonus door; the bonus room lasts 25 s (1500 steps), then both come back out
      await moveTeam(g, [1300, 230], [BONUS_DOOR, DOOR_Y])
      guest.tap('ArrowUp')
      expect(await until(g, () => zz.bonus, 60)).toBe(true)
      expect(await until(g, () => !zz.bonus, 1700)).toBe(true)
      await g.tick(40)
      expect(zz.scene).toBe('play')

      // J1 at the bonus door presses UP: it does NOT open again
      await moveTeam(g, [BONUS_DOOR, DOOR_Y], [1350, 230])
      expect(zz.lock ?? null).toBe(null)
      host.tap('ArrowUp')
      expect(await until(g, () => zz.bonus, 90)).toBe(false)
      // J2 again: neither
      await moveTeam(g, [1350, 230], [BONUS_DOOR, DOOR_Y])
      guest.tap('ArrowUp')
      expect(await until(g, () => zz.bonus, 90)).toBe(false)

      // the doors still work: J1 at a shop door gets in
      await moveTeam(g, [SHOP_DOOR, DOOR_Y], [1500, 230])
      host.tap('ArrowUp')
      expect(await until(g, () => zz.scene === 'shop', 60)).toBe(true)
    }, T)
  }
}

// ──────────────────────────────────────────────────────────────────────
{
  // Draft part for tests/multiplayer.integration.test.js:
  // 'lives, game over and stage end', 'a player leaving', 'what each player sees (HUD and sound)'.
  // Rules and reasons: .specs/online-coop/DECISIONS.md (D3, D4, NEW-37..NEW-54).

  const T = 60_000
  const SECOND = 60 // steps
  const DOOR_Y = 176 // just below the top of the street (YMIN 172): doors work only up there
  const SHOP_DOOR_X = 1700 // the first shop door of every stage (DOORS in the game)

  // ── steps ──────────────────────────────────────────────────────────────────
  const ticker = (g) => (n) => g.tick(n) // both devices step, server clock stays
  const waiter = (g) => (n) => g.wait(n) // both devices step, server clock moves too
  const both = (g, scene) => g.host.zz.scene === scene && g.guest.zz.scene === scene

  async function bothReach(g, scene, max = 10 * SECOND) {
    const ok = await stepUntil(ticker(g), () => both(g, scene), max)
    expect(ok, `both devices reach '${scene}'`).toBe(true)
  }

  /** Move a fighter without touching its state (used for a player who is out). */
  function moveTo(f, x, y) {
    f.x = x
    f.y = y
  }

  function removeEnemy(zz, e) {
    const i = zz.enemies.indexOf(e)
    if (i >= 0) zz.enemies.splice(i, 1)
  }

  /** No wave starts any more in this stage, so players can be moved anywhere. */
  function noWaves(zz) {
    zz.trigs.length = 0
  }

  /** Move the players still in the game to x in short hops, so the shared camera can follow. */
  async function moveTeam(g, x) {
    const team = g.zz.players.filter((f) => !f.out && !f.left)
    for (let i = 0; i < 40 && team.some((f) => f.x < x - 1); i++) {
      const nx = Math.min(x, Math.min(...team.map((f) => f.x)) + 150)
      team.forEach((f) => place(f, nx, f.y))
      await g.tick(40)
    }
    expect(team.every((f) => f.x >= x - 1), `the team reached x ${x}`).toBe(true)
  }

  /** Does this fighter walk when its player holds right for half a second? */
  async function walks(g, dev, fighter) {
    const x0 = fighter().x
    dev.down('ArrowRight')
    await g.tick(30)
    dev.up('ArrowRight')
    await g.tick(3)
    return fighter().x - x0 > 15
  }

  // ── hits and lives ─────────────────────────────────────────────────────────
  /** Enemy e, right in front of the fighter, punches it once. Returns the HP the fighter lost. */
  async function punch(g, e, slot) {
    const p = g.zz.players[slot]
    p.inv = 0
    place(e, p.x + 16, p.y)
    e.facing = -1
    e.cd = 9999 // no second attack
    const hp0 = p.hp
    g.zz.attack(e, 'ePunch')
    const hit = await stepUntil(ticker(g), () => p.hp < hp0, SECOND)
    expect(hit, `the punch reached J${slot + 1}`).toBe(true)
    return hp0 - p.hp
  }

  /** A new enemy punches the fighter once, then goes away. */
  async function punchedOnce(g, slot) {
    const e = g.zz.spawn('punk', 1)
    const lost = await punch(g, e, slot)
    removeEnemy(g.zz, e)
    return lost
  }

  /** The fighter is on its last life with 1 HP and gets punched. Other players still in the game stand away. */
  async function loseLastLife(g, slot, x = 300) {
    const zz = g.zz
    zz.players.forEach((f, i) => {
      if (i !== slot && !f.out && !f.left) place(f, Math.max(40, x - 200), 230)
    })
    const p = zz.players[slot]
    place(p, x, 230)
    p.lives = 0
    p.hp = 1
    await punchedOnce(g, slot)
  }

  /** Make a player 'out' the way the game does it: they lose their last life. */
  async function knockOut(g, slot, x) {
    await loseLastLife(g, slot, x)
    const out = await stepUntil(ticker(g), () => g.zz.players[slot].out === true, 10 * SECOND)
    expect(out, `J${slot + 1} is out`).toBe(true)
  }

  // ── stage end ──────────────────────────────────────────────────────────────
  /** Win the stage: the next wave becomes an empty last wave; then the band show and the stage clear screen. */
  async function winStage(g) {
    const zz = g.zz
    zz.trigs.splice(zz.trigIdx, zz.trigs.length, { x: 0, final: true, waves: [[]] })
    await bothReach(g, 'show', 15 * SECOND)
    await g.tick(210)
    for (let i = 0; i < 60 && !both(g, 'clear'); i++) {
      g.host.tap('Enter')
      await g.tick(10)
    }
    expect(both(g, 'clear'), 'both devices reach the stage clear screen').toBe(true)
  }

  /** From play: win the stage and start the next one. */
  async function nextStage(g) {
    await winStage(g)
    await g.tick(125)
    g.host.tap('Enter')
    await bothReach(g, 'mut')
    await g.tick(25)
    g.host.tap('Enter')
    await bothReach(g, 'story')
    g.host.tap('Enter') // show the whole story text
    await g.tick(2)
    g.host.tap('Enter')
    await bothReach(g, 'play')
  }

  /** From the game over screen: try again. */
  async function tryAgain(g) {
    await g.tick(65)
    g.host.tap('Enter')
    await bothReach(g, 'play')
  }

  /** In the open pause menu: SAIR DA SALA, then SIM (the keys of g.leaveRoom, without opening the menu). */
  async function chooseLeave(g, dev) {
    dev.tap('ArrowUp') // from the first row up to the last one: SAIR DA SALA
    await g.tick(2)
    dev.tap('Enter')
    await g.tick(2)
    dev.tap('ArrowLeft') // NÃO -> SIM
    await g.tick(2)
    dev.tap('Enter')
    await g.tick(3)
  }

  // ── what is on the screen ──────────────────────────────────────────────────
  /** Texts of the last render as a person reads them: no outlines and no drop shadows. */
  function shownTexts(dev) {
    const all = dev.drawn().filter((t) => t.kind !== 'stroke')
    return all.filter((t) => !all.some((o) => o !== t && o.text === t.text && o.x === t.x - 1 && o.y === t.y - 1))
  }
  function screen(dev) {
    dev.render()
    return shownTexts(dev)
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  /** One row of the stage clear screen: the label must be there once; returns the value next to it. */
  function rowValue(shown, label) {
    const rows = shown.filter((t) => t.text === label || t.text.startsWith(label + ' ') || t.text.startsWith(label + ':'))
    expect(rows.map((t) => t.text), `one '${label}' row`).toHaveLength(1)
    const r = rows[0]
    if (r.text !== label) return r.text.slice(label.length).replace(/^[:\s]+/, '')
    const right = shown.filter((t) => t !== r && Math.abs(t.y - r.y) <= 2 && t.x > r.x).sort((a, b) => a.x - b.x)
    return right[0] && right[0].text
  }

  /** The 'J1'/'J2' tag drawn over a fighter's head (screen x near the fighter, 40 to 150 px above the feet). */
  function tagOver(shown, label, f, cam) {
    const sx = f.x - cam
    const feet = f.y - (f.z || 0)
    return shown.find((t) => t.text === label && Math.abs(t.x - sx) <= 24 && t.y < feet - 40 && t.y > feet - 150)
  }

  function rgbOf(color) {
    const s = String(color).trim().toLowerCase()
    let m = s.match(/^#([0-9a-f]{3})$/)
    if (m) return [...m[1]].map((h) => parseInt(h + h, 16))
    m = s.match(/^#([0-9a-f]{6})/)
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
    m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
    if (m) return m.slice(1, 4).map(Number)
    m = s.match(/^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/)
    if (m) {
      const [h, sat, l] = [Number(m[1]) / 360, Number(m[2]) / 100, Number(m[3]) / 100]
      const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat
      const p = 2 * l - q
      const ch = (t) => {
        t = (t + 1) % 1
        const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
        return Math.round(v * 255)
      }
      return [ch(h + 1 / 3), ch(h), ch(h - 1 / 3)]
    }
    return null
  }
  const isRed = (c) => {
    const v = rgbOf(c)
    return !!v && v[0] >= 150 && v[0] > v[2] + 60 && v[0] > v[1] + 30
  }
  const isBlue = (c) => {
    const v = rgbOf(c)
    return !!v && v[2] >= 150 && v[2] > v[0] + 60
  }

  /** Today's 1-player camera: after a while the fighter stands at 42% of the screen. */
  async function expectTodayCamera(tick, z, f) {
    place(f, 290, 230) // before the first wave (x 320)
    await tick(150)
    expect(z().cam, "today's camera").toBeCloseTo(290 - 0.42 * W, 0)
  }

  /** Today's 1-player screen: one HUD panel at the top left, no player tag. */
  function expectOnePanel(dev, f) {
    const shown = screen(dev)
    expect(shown.filter((t) => t.text === 'J1' || t.text === 'J2').map((t) => t.text), 'no player tag').toEqual([])
    const lv = shown.filter((t) => /^LV\d+$/.test(t.text))
    expect(lv.map((t) => t.text), 'one HUD panel').toEqual(['LV' + f.lvl])
    expect(lv[0].x).toBeLessThan(W / 2)
    const masc = shown.filter((t) => t.text === 'MASC')
    expect(masc, 'one MASC bar').toHaveLength(1)
    expect(masc[0].x).toBeLessThan(W / 2)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  GROUP['lives, game over and stage end (\'out\' = a player with no lives left)#lives'] = () => {
    it('it is game over only when both players are out, and NOT while one player still has lives', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      await knockOut(g, 1)
      await g.tick(2 * SECOND)
      expect(zz.players[0].lives).toBe(3)
      expect([g.host.zz.scene, g.guest.zz.scene], 'one player out: no game over').toEqual(['play', 'play'])

      // player 1 loses a life but still has more: no game over
      const p1 = zz.players[0]
      place(p1, 160, 230)
      p1.hp = 1
      await punchedOnce(g, 0)
      expect(await stepUntil(ticker(g), () => p1.lives === 2, 10 * SECOND), 'player 1 lost a life').toBe(true)
      await g.tick(SECOND)
      expect([g.host.zz.scene, g.guest.zz.scene], 'player 1 still has lives: no game over').toEqual(['play', 'play'])

      // player 1's last life: now both are out
      await loseLastLife(g, 0, 160)
      await bothReach(g, 'gameover')
    }, T)

    it('a player who is out is removed from the fight and only watches: enemies, attacks, traps, items, doors and the camera ignore them', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      noWaves(zz)
      await knockOut(g, 1)
      const [p1, p2] = zz.players

      // camera: it follows player 1 alone, as in a 1-player game
      place(p1, 290, 230)
      moveTo(p2, 60, 230)
      await g.tick(150)
      expect(zz.cam, 'camera on player 1 only').toBeCloseTo(290 - 0.42 * W, 0)

      // enemies: a new enemy goes for player 1, even with player 2 right next to it
      moveTo(p2, 470, 230)
      const e = zz.spawn('punk', 1)
      place(e, 500, 230)
      e.cd = 9999
      await g.tick(2 * SECOND)
      expect(e.x, 'the enemy walks to player 1, not to player 2').toBeLessThan(440)

      // attacks: a punch right on player 2 does not touch them
      place(p1, 290, 180) // far away, on another line
      const hp1 = p1.hp
      const hp2 = p2.hp
      const lives2 = p2.lives
      place(e, p2.x + 16, p2.y)
      e.facing = -1
      zz.attack(e, 'ePunch')
      expect(await stepUntil(ticker(g), () => e.state !== 'attack', SECOND), 'the punch was thrown').toBe(true)
      removeEnemy(zz, e)
      expect([p2.hp, p2.lives], 'the punch did not touch player 2').toEqual([hp2, lives2])

      // traps: the boss's fire flies through player 2, and a pillar under them does nothing
      const boss = zz.spawn('boss', 1)
      place(boss, p2.x + 70, p2.y)
      boss.facing = -1
      boss.cd = 9999
      zz.attack(boss, 'bossFire')
      let fire = null
      expect(await stepUntil(ticker(g), () => !!(fire = zz.projs.find((q) => q.kind === 'fire')), SECOND), 'the boss fires').toBe(true)
      await stepUntil(ticker(g), () => fire.x < p2.x - 30 || !zz.projs.includes(fire), SECOND)
      expect(fire.x, 'the fire flew through player 2').toBeLessThan(p2.x - 30)
      removeEnemy(zz, boss)
      zz.projs.push({ kind: 'pillar', vx: 0, x: p2.x, y: p2.y, t: 0 })
      await g.tick(70)
      expect([p2.hp, p2.lives], 'fire and pillar did not touch player 2').toEqual([hp2, lives2])
      expect(p1.hp).toBe(hp1)

      // items: food and a coin at player 2's feet stay on the ground
      const money2 = p2.money
      const food = { kind: 'food', x: p2.x, y: p2.y, z: 0, vz: 0, vx: 0, t: 20 }
      const coin = { kind: 'coin', val: 1, x: p2.x + 3, y: p2.y, z: 0, vz: 0, vx: 0, t: 20 }
      zz.items.push(food, coin)
      await g.tick(30)
      expect(zz.items, 'the food stays on the ground').toContain(food)
      expect(zz.items, 'the coin stays on the ground').toContain(coin)
      expect([p2.hp, p2.money]).toEqual([hp2, money2])

      // doors: player 2 at the shop door pressing up does not open it; player 1 can
      await moveTeam(g, SHOP_DOOR_X - 60)
      moveTo(p2, SHOP_DOOR_X, DOOR_Y)
      place(p1, SHOP_DOOR_X - 60, 240)
      g.guest.down('ArrowUp')
      await g.tick(SECOND)
      g.guest.up('ArrowUp')
      expect(zz.scene, 'player 2 did not open the door').toBe('play')
      expect(zz.shop ?? null).toBeNull()
      expect(zz.stop ?? null).toBeNull()
      place(p1, SHOP_DOOR_X, DOOR_Y)
      g.host.down('ArrowUp')
      const opened = await stepUntil(ticker(g), () => zz.scene === 'shop', SECOND)
      g.host.up('ArrowUp')
      expect(opened, 'the same door opens for player 1').toBe(true)
    }, T)

    it('a player who is out does NOT come back during the same stage; at the next stage start or a try again, both players have 3 lives', async () => {
      const g = await twoPlayers()
      await knockOut(g, 1)
      await g.tick(10 * SECOND)
      expect(g.zz.scene).toBe('play')
      expect(g.zz.players[1].out, 'still out 10 seconds later').toBe(true)
      expect(g.zz.players[1].lives).toBe(0)

      // next stage start: player 1 lost lives too, and both start with 3
      g.zz.players[0].lives = 1
      await nextStage(g)
      expect(g.zz.stage).toBe(2)
      expect(g.zz.players.map((f) => [f.lives, !!f.out]), 'next stage').toEqual([[3, false], [3, false]])

      // try again after a game over
      await knockOut(g, 1)
      await loseLastLife(g, 0, 160)
      await bothReach(g, 'gameover')
      await tryAgain(g)
      expect(g.zz.players.map((f) => [f.lives, !!f.out]), 'try again').toEqual([[3, false], [3, false]])
    }, T)

    it('when player 2 (guest) is out, switching tab or app or losing the connection does NOT stop the game for player 1 (host)', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      const p1 = () => zz.players[0]
      await knockOut(g, 1)

      // player 2 switches to another tab or app
      g.guest.setHidden(true)
      await g.tick(SECOND)
      expect(zz.scene).toBe('play')
      expect(zz.stop ?? null).toBeNull()
      place(p1(), 100, 230)
      expect(await walks(g, g.host, p1), 'player 1 still plays (hidden tab)').toBe(true)
      g.guest.setHidden(false)

      // player 2 loses the connection
      await g.offline(g.guest, true)
      expect(await stepUntil(waiter(g), () => zz.net.peer === 'drop', 2 * SECOND), 'the host knows player 2 dropped').toBe(true)
      await g.wait(2 * SECOND)
      expect(zz.scene).toBe('play')
      expect(zz.stop ?? null).toBeNull()
      place(p1(), 100, 230)
      expect(await walks(g, g.host, p1), 'player 1 still plays (no connection)').toBe(true)
    }, T)

    it('the stage clear screen shows one card per player with their own money, and KO, XP and time as team totals', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      const [p1, p2] = zz.players
      // one KO by each player
      for (const [dev, f, x] of [[g.host, p1, 120], [g.guest, p2, 300]]) {
        place(f, x, 220)
        f.facing = 1
        const e = zz.spawn('brute', 1)
        place(e, x + 18, 220)
        Object.assign(e, { hp: 1, cd: 9999, stunT: 9999 })
        await g.tick(2)
        dev.tap('KeyJ')
        expect(await stepUntil(ticker(g), () => !zz.enemies.includes(e), 10 * SECOND), 'the enemy is KO').toBe(true)
      }
      expect(zz.kills).toBe(2)
      for (let i = zz.items.length - 1; i >= 0; i--) if (zz.items[i].kind === 'coin') zz.items.splice(i, 1)
      p1.money = 12.5
      p2.money = 3.25

      await winStage(g)
      await g.tick(100) // all rows are shown
      for (const dev of [g.host, g.guest]) {
        const shown = screen(dev)
        const name1 = shown.find((t) => t.text.includes(p1.look.name))
        const name2 = shown.find((t) => t.text.includes(p2.look.name))
        expect(name1, 'card of player 1').toBeTruthy()
        expect(name2, 'card of player 2').toBeTruthy()
        const m1 = shown.filter((t) => t.text.includes('12,50'))
        const m2 = shown.filter((t) => t.text.includes('3,25'))
        expect(m1, "player 1's money, once").toHaveLength(1)
        expect(m2, "player 2's money, once").toHaveLength(1)
        expect(dist(m1[0], name1), "player 1's money is on player 1's card").toBeLessThan(dist(m1[0], name2))
        expect(dist(m2[0], name2), "player 2's money is on player 2's card").toBeLessThan(dist(m2[0], name1))
        expect(rowValue(shown, 'KO'), 'team KO').toBe('2')
        expect(rowValue(shown, 'XP'), 'team XP').toBe(String(zz.totalXp))
        expect(rowValue(shown, 'TEMPO'), 'team time').toMatch(/^\d+:\d\d$/)
      }
    }, T)

    it('after the last stage, both players go back to the select screen in the same room', async () => {
      const g = await twoPlayers({ stage: 5 })
      await winStage(g)
      await g.tick(125)
      let sawTitle = false
      g.host.tap('Enter')
      const back = await stepUntil(ticker(g), () => {
        sawTitle = sawTitle || g.host.zz.scene === 'title' || g.guest.zz.scene === 'title'
        return both(g, 'select')
      }, 5 * SECOND)
      expect(back, 'both on the select screen').toBe(true)
      expect(sawTitle, 'nobody went to the title').toBe(false)
      expect(g.host.zz.net).toMatchObject({ role: 'host', code: g.code, peer: 'here' })
      expect(g.guest.zz.net).toMatchObject({ role: 'guest', code: g.code, peer: 'here' })
      const room = g.server.rooms().find((r) => r.code === g.code)
      expect(room && room.slots, 'the room is still open with both players').toEqual(['here', 'here'])
    }, T)
  }
  GROUP['a player leaving (\'leaves\' = SAIR DA SALA, closing the game, or no connection for more than 15 seconds)#lives'] = () => {
    it('in a 2-player game, the pause menu has SAIR DA SALA: the player leaves at once, and the other player does NOT wait 15 seconds for them', async () => {
      // a 1-player game has no such entry
      const one = await onePlayer()
      one.dev.tap('KeyP')
      await one.tick(2)
      const solo = one.dev.render()
      expect(solo.some((s) => s.includes('VOLTAR AO JOGO')), '1-player pause menu is open').toBe(true)
      expect(solo.some((s) => s.includes('SAIR DA SALA')), 'no SAIR DA SALA in a 1-player game').toBe(false)

      const g = await twoPlayers()
      const zz = g.zz
      g.guest.tap('KeyP')
      await g.tick(2)
      expect(g.guest.render().some((s) => s.includes('SAIR DA SALA'))).toBe(true)
      await chooseLeave(g, g.guest)
      expect(g.guest.zz.scene, 'the player who left is on the title at once').toBe('title')
      // g.tick does not move the room server clock: no 15-second timer can end this wait
      expect(await stepUntil(ticker(g), () => zz.players[1].left === true, SECOND), 'player 1 sees the leave at once').toBe(true)
      expect(zz.net.peer).toBe('left')
      expect(zz.scene).toBe('play')
      expect(zz.stop ?? null).toBeNull()
    }, T)

    it('when player 2 (guest) leaves after the game has started, player 1 (host) keeps playing alone', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      const p1 = () => zz.players[0]
      await g.closeGame(g.guest) // leaves by closing the game: no connection for more than 15 s
      await g.wait((DROP_GRACE_MS / 1000) * SECOND + SECOND)
      expect(zz.players[1].left).toBe(true)
      expect(zz.net.peer).toBe('left')
      expect(zz.scene).toBe('play')
      expect(zz.stop ?? null).toBeNull()
      place(p1(), 100, 230)
      expect(await walks(g, g.host, p1), 'player 1 plays').toBe(true)
      await g.tick(3 * SECOND)
      expect(zz.scene, 'the game goes on').toBe('play')
    }, T)

    it('when player 1 (host) leaves after the game has started, player 2 (guest) keeps playing alone from the same moment, with the same stage, enemies, lives and money', async () => {
      const g = await twoPlayers({ stage: 3 })
      const { host, guest } = g
      const zz = g.zz
      const [p1, p2] = zz.players
      place(p1, 120, 230)
      place(p2, 200, 220)
      Object.assign(p2, { lives: 2, money: 7.5 })
      const a = zz.spawn('punk', 1)
      const b = zz.spawn('brute', -1)
      place(a, 380, 240)
      place(b, 40, 190)
      Object.assign(a, { hp: 17, cd: 9999 }) // they do not attack: nothing changes before the leave
      Object.assign(b, { hp: 33, cd: 9999 })
      await g.tick(10)
      const enemiesOf = (z) => z.enemies.map((e) => ({ type: e.type, hp: e.hp, maxHp: e.maxHp, x: e.x })).sort((m, n) => m.x - n.x)
      const before = enemiesOf(zz)

      await g.leaveRoom(host)
      expect(host.zz.scene).toBe('title')
      const gz = () => guest.zz
      const took = await stepUntil(ticker(g), () => gz().players[0].left === true && gz().scene === 'play', 2 * SECOND)
      expect(took, "player 2's browser goes on with the game").toBe(true)
      expect(guest.render()).toContain('JOGADOR 1 SAIU')
      expect(gz().stage).toBe(3)
      const after = enemiesOf(gz())
      expect(after.map(({ type, hp, maxHp }) => ({ type, hp, maxHp })), 'same enemies').toEqual(before.map(({ type, hp, maxHp }) => ({ type, hp, maxHp })))
      after.forEach((e, i) => expect(Math.abs(e.x - before[i].x), 'enemy at the same place').toBeLessThan(15))
      expect(gz().players[1]).toMatchObject({ lives: 2, money: 7.5 })
      expect(Math.abs(gz().players[1].x - 200), 'player 2 at the same place').toBeLessThan(5)
      expect(await walks(g, guest, () => gz().players[1]), 'player 2 plays').toBe(true)
    }, T)

    it('after a player leaves, enemies that appear later (waves, drones, a boss not yet on screen) use 1-player strength, and enemies already on screen do NOT change', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      const p1 = zz.players[0]
      place(p1, 150, 230)
      const old = zz.spawn('punk', 1)
      old.cd = 9999
      expect(old.maxHp, '2-player strength before the leave (34 x1.5)').toBe(51)
      await g.leaveRoom(g.guest)
      expect(await stepUntil(ticker(g), () => zz.players[1].left === true, SECOND)).toBe(true)

      // already on screen: same health and damage as before (6 x1.5)
      expect([old.hp, old.maxHp]).toEqual([51, 51])
      p1.hp = p1.maxHp
      expect(await punch(g, old, 0), 'old enemy damage').toBe(9)
      removeEnemy(zz, old)

      // appearing later: 1-player strength
      const punk = zz.spawn('punk', 1)
      expect(punk.maxHp).toBe(34)
      place(p1, 150, 230)
      p1.hp = p1.maxHp
      expect(await punch(g, punk, 0), 'new enemy damage').toBe(6)
      removeEnemy(zz, punk)
      const drone = zz.spawn('demonio', 1)
      const boss = zz.spawn('boss', 1)
      expect([drone.maxHp, boss.maxHp], 'drone and ROBÔ CHEFÃO').toEqual([22, 240])
      removeEnemy(zz, drone)
      removeEnemy(zz, boss)

      // the next wave: 2 punks with 34 HP, not 4
      place(p1, 330, 230)
      await g.tick(SECOND)
      expect(zz.enemies.map((e) => [e.type, e.maxHp]), 'first wave').toEqual([['punk', 34], ['punk', 34]])
    }, T)

    it('when a player leaves, their fighter is removed at once: their weapon drops, an enemy they grabbed is released, and their PODER stops', async () => {
      // an enemy grabbed by player 2 is released
      {
        const g = await twoPlayers()
        const zz = g.zz
        const [p1, p2] = zz.players
        place(p1, 80, 240)
        place(p2, 220, 220)
        p2.facing = 1
        const e = zz.spawn('punk', 1)
        place(e, 232, 220)
        Object.assign(e, { cd: 9999, state: 'hurt', hitstun: 40 }) // a hurt enemy is grabbed at once
        g.guest.down('ArrowRight')
        const grabbed = await stepUntil(ticker(g), () => p2.grabbed === e && e.state === 'grabbed', 30)
        g.guest.up('ArrowRight')
        expect(grabbed, 'player 2 grabs the enemy').toBe(true)
        await g.leaveRoom(g.guest)
        expect(await stepUntil(ticker(g), () => zz.players[1].left === true, SECOND)).toBe(true)
        await g.tick(2)
        expect(e.state, 'the enemy is released').not.toBe('grabbed')
        expect(zz.players[1].grabbed ?? null).toBeNull()
        await g.tick(SECOND)
        expect(e.state, 'the enemy is still free').not.toBe('grabbed')
      }
      // player 2's weapon drops and their PODER stops
      {
        const g = await twoPlayers()
        const zz = g.zz
        const [p1, p2] = zz.players
        place(p1, 80, 240)
        place(p2, 220, 220)
        p2.weapon = { w: 'taco', dur: 5 }
        zz.fill(1)
        await g.tick(2)
        g.guest.tap('KeyH')
        expect(await stepUntil(ticker(g), () => !!zz.power && zz.power.by === 1, 30), "player 2's PODER runs").toBe(true)
        await g.leaveRoom(g.guest)
        expect(await stepUntil(ticker(g), () => zz.players[1].left === true, SECOND)).toBe(true)
        await g.tick(2)
        expect(zz.power ?? null, 'the PODER stopped').toBeNull()
        expect(zz.players[1].weapon ?? null).toBeNull()
        const dropped = zz.items.filter((it) => it.kind === 'weapon' && it.w === 'taco' && Math.abs(it.x - 220) < 40)
        expect(dropped, 'the weapon lies on the ground').toHaveLength(1)
      }
    }, T)

    it('if the player who paused or is in the shop leaves, the game goes on for the other player', async () => {
      const p1Walks = (g) => walks(g, g.host, () => g.zz.players[0])
      // player 2 paused, then leaves from the pause menu
      {
        const g = await twoPlayers()
        const zz = g.zz
        g.guest.tap('KeyP')
        await g.tick(3)
        expect(zz.stop).toMatchObject({ by: 1, why: 'pause' })
        await chooseLeave(g, g.guest)
        expect(await stepUntil(ticker(g), () => zz.players[1].left === true, SECOND)).toBe(true)
        expect(zz.scene).toBe('play')
        expect(zz.stop ?? null).toBeNull()
        place(zz.players[0], 100, 230)
        expect(await p1Walks(g), 'player 1 plays after the pause').toBe(true)
      }
      // player 2 is in the shop, then closes the game
      {
        const g = await twoPlayers()
        const zz = g.zz
        const [p1, p2] = zz.players
        noWaves(zz)
        await moveTeam(g, SHOP_DOOR_X - 60)
        place(p2, SHOP_DOOR_X, DOOR_Y)
        place(p1, SHOP_DOOR_X - 60, 240)
        g.guest.down('ArrowUp')
        const inShop = await stepUntil(ticker(g), () => zz.scene === 'shop' && !!zz.stop && zz.stop.by === 1, SECOND)
        g.guest.up('ArrowUp')
        expect(inShop, 'player 2 is in the shop').toBe(true)
        expect(zz.stop).toMatchObject({ by: 1, why: 'shop' })
        await g.closeGame(g.guest)
        await g.wait((DROP_GRACE_MS / 1000) * SECOND + SECOND)
        expect(zz.players[1].left).toBe(true)
        expect(zz.scene).toBe('play')
        expect(zz.stop ?? null).toBeNull()
        expect(await p1Walks(g), 'player 1 plays after the shop').toBe(true)
      }
    }, T)

    it('if a player leaves while the other player is already out, it is game over', async () => {
      // player 2 is out and player 1 (host) leaves: game over on player 2's device
      {
        const g = await twoPlayers()
        await knockOut(g, 1)
        expect(g.guest.zz.scene).toBe('play')
        await g.leaveRoom(g.host)
        const over = await stepUntil(ticker(g), () => g.guest.zz.scene === 'gameover', 2 * SECOND)
        expect(over, 'game over for player 2').toBe(true)
        // a try again starts a 1-player game
        await g.tick(65)
        g.guest.tap('Enter')
        expect(await stepUntil(ticker(g), () => g.guest.zz.scene === 'play', 2 * SECOND)).toBe(true)
        expect(g.guest.zz.players).toHaveLength(1)
      }
      // player 1 is out and player 2 (guest) leaves: game over on player 1's device
      {
        const g = await twoPlayers()
        await knockOut(g, 0)
        expect(g.zz.scene).toBe('play')
        await g.leaveRoom(g.guest)
        const over = await stepUntil(ticker(g), () => g.zz.scene === 'gameover', 2 * SECOND)
        expect(over, 'game over for player 1').toBe(true)
      }
    }, T)

    it('when a player\'s connection drops, the game pauses for both players while that player can still come back', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      const p1 = () => zz.players[0]
      place(p1(), 100, 230)

      // player 2's connection drops
      await g.offline(guest, true)
      expect(await stepUntil(waiter(g), () => !!zz.stop && zz.stop.why === 'drop', SECOND), 'the game stops').toBe(true)
      expect(zz.stop).toMatchObject({ by: 1, why: 'drop' })
      expect(host.render()).toContain('JOGADOR 2 RECONECTANDO...')
      expect(await walks(g, host, p1), 'player 1 can not move while the game is stopped').toBe(false)
      await g.wait(10 * SECOND) // still inside the 15 seconds
      expect(zz.stop).toMatchObject({ by: 1, why: 'drop' })
      expect(zz.players[1].left ?? false).toBe(false)
      // player 2 comes back: the game goes on
      await g.offline(guest, false)
      expect(await stepUntil(waiter(g), () => !zz.stop, 3 * SECOND), 'the game goes on').toBe(true)
      expect(await walks(g, host, p1)).toBe(true)

      // player 1's connection drops
      await g.offline(host, true)
      expect(await stepUntil(waiter(g), () => !!zz.stop && guest.zz.net.peer === 'drop', SECOND), 'the game stops').toBe(true)
      expect(zz.stop).toMatchObject({ by: 0, why: 'drop' })
      expect(guest.render()).toContain('JOGADOR 1 RECONECTANDO...')
      expect(await walks(g, host, p1), 'player 1 can not move while the game is stopped').toBe(false)
      await g.offline(host, false)
      expect(await stepUntil(waiter(g), () => !zz.stop && guest.zz.net.peer === 'here', 3 * SECOND), 'the game goes on').toBe(true)
      expect(await walks(g, host, p1)).toBe(true)
    }, T)

    it('after a player switches tab or loses the connection, their fighter does NOT keep walking or blocking when the game goes on', async () => {
      const g = await twoPlayers()
      const zz = g.zz
      const p2 = () => zz.players[1]
      const standsStill = async () => {
        await g.tick(3)
        const x = p2().x
        await g.tick(30)
        expect(p2().x, 'player 2 does not walk').toBeCloseTo(x, 0)
        expect(['walk', 'run', 'block'], 'player 2 does not walk or block').not.toContain(p2().state)
      }
      const resumeIfPaused = async () => {
        if (zz.stop && zz.stop.by === 1) g.guest.tap('KeyP') // player 2 closes their pause menu
        expect(await stepUntil(ticker(g), () => !zz.stop, SECOND), 'the game goes on').toBe(true)
      }
      place(zz.players[0], 80, 240)

      // walking, then the tab is hidden with the key still down
      place(p2(), 150, 220)
      g.guest.down('ArrowRight')
      expect(await stepUntil(ticker(g), () => p2().state === 'walk', 20), 'player 2 walks').toBe(true)
      g.guest.setHidden(true)
      await g.tick(10)
      g.guest.setHidden(false)
      await g.tick(5)
      await resumeIfPaused()
      await standsStill()

      // blocking, then the window loses focus with the key still down
      g.guest.down('KeyO')
      expect(await stepUntil(ticker(g), () => p2().state === 'block', 20), 'player 2 blocks').toBe(true)
      g.guest.blur()
      await g.tick(5)
      await resumeIfPaused()
      await standsStill()

      // walking, then the connection drops and comes back with the key still down
      place(p2(), 150, 220)
      g.guest.down('ArrowRight')
      expect(await stepUntil(ticker(g), () => p2().state === 'walk', 20), 'player 2 walks').toBe(true)
      await g.offline(g.guest, true)
      await g.wait(SECOND)
      await g.offline(g.guest, false)
      expect(await stepUntil(waiter(g), () => !zz.stop && zz.net.peer === 'here', 3 * SECOND), 'player 2 is back').toBe(true)
      await standsStill()
    }, T)
  }
  GROUP['what each player sees (HUD and sound)#lives'] = () => {
    it('player 1\'s HUD panel is on the left and player 2\'s is on the right, on both devices', async () => {
      const g = await twoPlayers()
      const [p1, p2] = g.zz.players
      p1.lvl = 3
      p2.lvl = 8
      await g.tick(5)
      for (const [name, dev] of [['host', g.host], ['guest', g.guest]]) {
        const shown = screen(dev)
        const lv3 = shown.filter((t) => t.text.includes('LV3'))
        const lv8 = shown.filter((t) => t.text.includes('LV8'))
        expect(lv3.length, `${name}: player 1's panel is drawn`).toBeGreaterThan(0)
        expect(lv8.length, `${name}: player 2's panel is drawn`).toBeGreaterThan(0)
        expect(lv3.every((t) => t.x < W / 2), `${name}: player 1's panel on the left`).toBe(true)
        expect(lv8.every((t) => t.x > W / 2), `${name}: player 2's panel on the right`).toBe(true)
      }
    }, T)

    it('each fighter has a \'J1\' or \'J2\' tag in that player\'s color', async () => {
      const g = await twoPlayers()
      const [p1, p2] = g.zz.players
      place(p1, 100, 230)
      place(p2, 300, 220)
      await g.tick(30)
      for (const [name, dev] of [['host', g.host], ['guest', g.guest]]) {
        const shown = screen(dev)
        const z = dev.zz
        const j1 = tagOver(shown, 'J1', z.players[0], z.cam)
        const j2 = tagOver(shown, 'J2', z.players[1], z.cam)
        expect(j1, `${name}: 'J1' over player 1`).toBeTruthy()
        expect(j2, `${name}: 'J2' over player 2`).toBeTruthy()
        expect(isRed(j1.color), `${name}: 'J1' is red (${j1.color})`).toBe(true)
        expect(isBlue(j2.color), `${name}: 'J2' is blue (${j2.color})`).toBe(true)
      }
    }, T)

    it('the HUD panel of a player who is out shows \'FORA\'', async () => {
      const g = await twoPlayers()
      const fora = (dev) => screen(dev).filter((t) => t.text === 'FORA')
      expect(fora(g.host), 'no FORA while both play').toEqual([])
      await knockOut(g, 1)
      await g.tick(5)
      for (const [name, dev] of [['host', g.host], ['guest', g.guest]]) {
        const shown = fora(dev)
        expect(shown.length, `${name}: FORA is shown`).toBeGreaterThan(0)
        expect(shown.every((t) => t.x > W / 2), `${name}: FORA is on player 2's panel (right)`).toBe(true)
      }
    }, T)

    it('with only one player in the game (1 JOGADOR, or after the other player left), the screen looks like today: one HUD panel, NO player tag and today\'s camera', async () => {
      // 1 JOGADOR
      {
        const one = await onePlayer()
        const f = one.zz().players[0]
        await expectTodayCamera(one.tick, one.zz, f)
        expectOnePanel(one.dev, f)
      }
      // player 2 (guest) left: player 1's screen
      {
        const g = await twoPlayers()
        place(g.zz.players[1], 60, 230) // where a 2-player camera would still look
        await g.leaveRoom(g.guest)
        expect(await stepUntil(ticker(g), () => g.zz.players[1].left === true, SECOND)).toBe(true)
        const f = g.zz.players[0]
        await expectTodayCamera(ticker(g), () => g.zz, f)
        expectOnePanel(g.host, f)
      }
      // player 1 (host) left: player 2's screen
      {
        const g = await twoPlayers()
        place(g.zz.players[0], 60, 230)
        g.zz.players[1].lvl = 6
        await g.tick(5)
        await g.leaveRoom(g.host)
        const gz = () => g.guest.zz
        expect(await stepUntil(ticker(g), () => gz().players[0].left === true && gz().scene === 'play', 2 * SECOND)).toBe(true)
        const f = gz().players[1]
        await expectTodayCamera(ticker(g), gz, f)
        expectOnePanel(g.guest, f)
      }
    }, T)

    it('the full-screen MÁSCARA colors show only on the device of the player who has the mask', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      const [p1, p2] = zz.players
      const overlay = (dev) => {
        dev.render()
        return dev.zz.frame.maskOverlay
      }
      expect([overlay(host), overlay(guest)], 'no mask yet').toEqual([false, false])

      // player 1 puts on the mask
      p1.fury = 100
      host.tap('KeyH')
      expect(await stepUntil(ticker(g), () => p1.maskT > 0 && guest.zz.players[0].maskT > 0, 30), 'player 1 has the mask').toBe(true)
      expect([overlay(host), overlay(guest)], 'player 1 has the mask').toEqual([true, false])

      // player 1's mask ends, player 2 puts on the mask
      p1.maskT = 1
      await g.tick(5)
      p2.fury = 100
      guest.tap('KeyH')
      expect(await stepUntil(ticker(g), () => p2.maskT > 0 && guest.zz.players[1].maskT > 0, 30), 'player 2 has the mask').toBe(true)
      expect([overlay(host), overlay(guest)], 'player 2 has the mask').toEqual([false, true])
    }, T)

    it('on each device, the \'APERTE ...\' message, the weapon arrow and the MÁSC button glow use only that device\'s player and keys', async () => {
      const g = await twoPlayers({ guestTouch: true }) // player 2 plays on a phone: touch button names
      const { host, guest } = g
      const zz = g.zz
      const [p1, p2] = zz.players
      const aperte = (dev) => dev.render().filter((s) => s.startsWith('APERTE'))
      const glow = (dev) => dev.win.document.getElementById('maskBtn').style.boxShadow // read after a render
      const touchControls = (dev) => dev.win.document.getElementById('touch').style.display === 'block'
      // HARNESS-GAP: jsdom has 'ontouchstart' on every window, so today every test device looks like a
      // phone. tests/harness/browser.js must remove it on a keyboard device (o.touch false).
      expect(touchControls(host), "harness: player 1's device is a keyboard device").toBe(false)
      expect(touchControls(guest), "harness: player 2's device is a phone").toBe(true)

      // only player 2's PODER is ready
      zz.fill(1)
      await g.tick(5)
      expect(aperte(host), 'host: no APERTE for player 2').toEqual([])
      expect(glow(host), 'host: no button glow').toBe('')
      const onGuest = aperte(guest)
      expect(onGuest.length, 'guest: APERTE is shown').toBeGreaterThan(0)
      expect(onGuest.every((s) => s.startsWith('APERTE MÁSC')), `guest: touch button name (${onGuest[0]})`).toBe(true)
      expect(glow(guest), 'guest: the button glows').not.toBe('')

      // only player 1's PODER is ready
      Object.assign(p2, { pw: 0, fury: 0 })
      zz.fill(0)
      await g.tick(5)
      const onHost = aperte(host)
      expect(onHost.length, 'host: APERTE is shown').toBeGreaterThan(0)
      expect(onHost.every((s) => s.startsWith('APERTE H')), `host: keyboard key (${onHost[0]})`).toBe(true)
      expect(glow(host), 'host: the button glows').not.toBe('')
      expect(aperte(guest), 'guest: no APERTE for player 1').toEqual([])
      expect(glow(guest), 'guest: no button glow').toBe('')

      // the blinking arrow over a weapon on the ground: only for this device's own fighter
      const w = zz.items.find((it) => it.kind === 'weapon' && it.x < 320)
      const arrowSeen = async () => {
        const seen = { host: false, guest: false }
        for (let i = 0; i < 30; i++) {
          await g.tick(1)
          seen.host = seen.host || host.render().includes('▼')
          seen.guest = seen.guest || guest.render().includes('▼')
        }
        return seen
      }
      place(p1, w.x + 6, w.y)
      place(p2, w.x - 140, w.y)
      expect(await arrowSeen(), 'player 1 at the weapon').toEqual({ host: true, guest: false })
      place(p1, w.x - 140, w.y)
      place(p2, w.x + 6, w.y)
      expect(await arrowSeen(), 'player 2 at the weapon').toEqual({ host: false, guest: true })
    }, T)

    it('both devices play the game sounds (hits, coins, jumps), and mute (M) works only on the device where it is pressed', async () => {
      const g = await twoPlayers()
      const { host, guest } = g
      const zz = g.zz
      const p1 = zz.players[0]
      const mark = () => [host.zz.sfxLog.length, guest.zz.sfxLog.length]
      const playedOnBoth = async (from, name) => {
        const ok = await stepUntil(ticker(g), () => host.zz.sfxLog.slice(from[0]).includes(name) && guest.zz.sfxLog.slice(from[1]).includes(name), SECOND)
        expect(ok, `'${name}' plays on both devices`).toBe(true)
      }

      // a jump of player 2
      let m = mark()
      guest.tap('Space')
      await playedOnBoth(m, 'jump')
      await g.tick(SECOND)
      // a coin picked up by player 1
      place(p1, 150, 220)
      m = mark()
      zz.items.push({ kind: 'coin', val: 1, x: 150, y: 220, z: 0, vz: 0, vx: 0, t: 20 })
      await playedOnBoth(m, 'coin')
      // a hit on player 1
      m = mark()
      await punchedOnce(g, 0)
      await playedOnBoth(m, 'hit')
      await g.tick(SECOND)

      // M on player 1's device mutes only that device
      host.tap('KeyM')
      await g.tick(2)
      expect([host.zz.muted, guest.zz.muted]).toEqual([true, false])
      expect(host.render(), 'host shows MUDO').toContain('MUDO')
      expect(guest.render(), 'guest does not show MUDO').not.toContain('MUDO')
      m = mark()
      guest.tap('Space')
      expect(await stepUntil(ticker(g), () => guest.zz.sfxLog.slice(m[1]).includes('jump'), SECOND), 'the guest still plays sounds').toBe(true)
      await g.tick(SECOND)
      // M on player 2's device mutes only that device
      guest.tap('KeyM')
      await g.tick(2)
      expect([host.zz.muted, guest.zz.muted]).toEqual([true, true])
      host.tap('KeyM')
      await g.tick(2)
      expect([host.zz.muted, guest.zz.muted]).toEqual([false, true])
    }, T)
  }
}

// ──────────────────────────────────────────────────────────────────────
describe('title menu and waiting for a friend', () => { GROUP['title menu and waiting for a friend#menus']() })
describe('character select and stage start', () => { GROUP['character select and stage start#menus']() })
describe('difficulty with 2 players', () => { GROUP['difficulty with 2 players#diff']() })
describe('playing together', () => { GROUP['playing together#diff'](); GROUP['playing together#shop']() })
describe('shop, pause and bonus room', () => { GROUP['shop, pause and bonus room#shop']() })
describe('lives, game over and stage end (\'out\' = a player with no lives left)', () => { GROUP['lives, game over and stage end (\'out\' = a player with no lives left)#lives']() })
describe('a player leaving (\'leaves\' = SAIR DA SALA, closing the game, or no connection for more than 15 seconds)', () => { GROUP['a player leaving (\'leaves\' = SAIR DA SALA, closing the game, or no connection for more than 15 seconds)#lives']() })
describe('what each player sees (HUD and sound)', () => { GROUP['what each player sees (HUD and sound)#lives']() })
