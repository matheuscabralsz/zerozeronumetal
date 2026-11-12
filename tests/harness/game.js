// Test helpers for the game. Each "device" is one browser with the real jogo/index.html.
// A 2-player game is two devices connected through the in-memory room server, which runs
// the same room logic as the real server (server/memory-server.js).
//
// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: test hooks the game exposes on window.__zz
// (on a guest device, game state is the copy received from the host)
//
// loop
//   step()                one 60 Hz step: runs the game (1 player / host) or applies the newest
//                         state from the host (guest). Also sends and handles network messages.
//   render()              draws one frame (texts drawn are recorded by the harness)
//   frame                 facts about the last render: { maskOverlay: boolean,
//                         walkers: string[] (look.pix of the fighters drawn walking on the story screen) }
// scenes and menus
//   scene                 'title'|'name'|'room'|'join'|'select'|'mut'|'story'|'play'|'shop'|'pause'
//                         |'gameover'|'clear'|'show'
//                         ('name' = the creator chooses the room name; 'room' = the creator waits;
//                          'join' = the room list)
//   menu                  { items: string[], sel: number }  the title menu
//   netMsg                string|null  the message shown on the title / join screen
//   muted                 boolean (this device)
//   sfxLog                string[]  names of the sound effects this device played (newest last)
// network
//   net                   { role: 'off'|'host'|'guest', slot: 0|1, code: string|null (the room's
//                           hidden id), name: string|null (the room name), peer: 'none'|'here'|'drop'|'left' }
//   rooms                 { items: [{id, name}], sel: number, loaded: boolean }  the room list on
//                         this device (scene 'join'); loaded = the first answer has come
//   version               the game version sent to the room server
// select screen
//   chars                 band member ids (look.pix) in select-screen order
//   sel                   one cursor per player: [{ char: number, ok: boolean }, ...]
// game state
//   stage, setStage(n)    STAGE (1..5)
//   players               [J1, J2] with 2 players, [J1] with 1 player. A player keeps its place
//                         in the list when out or gone. Fields used by tests: slot, look, x, y, z,
//                         state, hp, maxHp, lives, money, xp, lvl, fury, pw, maskT, comboN,
//                         weapon, grabbed, stunT, def, atkBonus, inv,
//                         out (true = no lives left, watching), left (true = left the game)
//   player                players[0]
//   enemies, items, projs arrays of the game
//   cam, lock, trigs, trigIdx, bonus, kills, totalXp, buddy, runner
//   stop                  null | { by: 0|1, why: 'pause'|'shop'|'drop' }  the game is stopped for both
//   shop                  null | { i, by: 0|1, sel, confirm, yes }
//   power                 null | { k, by: 0|1, t }  the PODER that is running
//   show                  null | { me: [{ look }...], band: [{ look }...] }  the band show
//   input(slot)           { held, prs } the inputs of a player as this device's game sees them
// helpers
//   spawn(type, side)     add an enemy now, with the strength rules of right now
//   attack(e, name)       make an enemy start an attack now (a name from the ATK table)
//   startStage()          start the current stage again
//   enterBonus()          go to the bonus room (as if a player used the bonus door)
//   runnerSoon()          the stage 4 runner comes now
//   fill(slot)            fill the MASC and PODER bars of a player
// DOM
//   #roomForm             shown only in scene 'name': input#roomName (the room name box),
//                         3 button.roomSug (suggested names), button#roomGo ('CRIAR')
//   #maskBtn              the touch MÁSC/PODER button (existing)
//
// UI CONTRACT (what the screens show and which keys do what)
//   title menu            '1 JOGADOR', 'CRIAR SALA', 'ENTRAR NA SALA'; ▲▼ move, ENTER/J/SPACE choose
//   'name' (CRIAR SALA)   #roomName starts with the first suggested name, selected (typing replaces
//                         it). ▲▼ in the box = another suggestion; a click on a .roomSug puts its
//                         name in the box; ENTER in the box or #roomGo = create; ESC = back to the title
//   'room' (host waits)   shows the room name and 'ESPERANDO JOGADOR 2...'; ESC = cancel (room closes)
//   'join' (room list)    the names of the rooms that wait for player 2, newest first, updated about
//                         every 2 s (120 steps); 'NENHUMA SALA ABERTA' when there is none.
//                         ▲▼ choose, ENTER/J/SPACE join, ESC/P back to the title; on a phone the
//                         stick, SOCO and II. While waiting for a host who is away: 'ESPERANDO JOGADOR 1...'
//   errors (netMsg)       'SALA NÃO ENCONTRADA' | 'SALA CHEIA' | 'JOGO JÁ COMEÇOU'
//                         | 'VERSÃO DIFERENTE — RECARREGUE A PÁGINA' (on 'join': the list stays)
//                         | 'SEM CONEXÃO COM O SERVIDOR' | 'MODO ONLINE ESGOTADO HOJE — TENTE AMANHÃ'
//                         | 'JOGADOR 1 SAIU — SALA FECHADA' (on the title)
//   scene is SHARED in 2-player games: when a player pauses, scene is 'pause' on both devices and
//   stop = {by, why:'pause'}; the pause menu is drawn and used only on that player's device; the
//   other device draws the frozen game and the message. Same for the shop (scene 'shop').
//   messages              'JOGADOR 1 ESTÁ NA LOJA', 'JOGADOR 2 PAUSOU', 'JOGADOR 1 RECONECTANDO...',
//                         'JOGADOR 2 SAIU', 'VOCÊ ESTÁ FORA - ASSISTINDO' (1/2 = the player meant)
//   HUD (2 players)       J1 panel on the left, J2 panel on the right; tag 'J1'/'J2' over each
//                         fighter; 'FORA' on the panel of a player who is out
//   pause menu (2 players) the key rows, 'RESTAURAR PADRÃO', 'VOLTAR AO JOGO', 'SAIR DA SALA' (last).
//                         SAIR DA SALA asks 'SIM' / 'NÃO' (NÃO selected first, ◄ ► change, ENTER ok).
//   leaving               SAIR DA SALA sends 'leave' and goes to the title. Closing the tab also
//                         tries to send 'leave'. A lost connection: the game tries to come back
//                         (about once per second) for 15 s.
// ─────────────────────────────────────────────────────────────────────────────

import { loadGame, seededRandom } from './browser.js'
import { createMemoryServer } from '../../server/memory-server.js'

export const W = 480
const settle = () => new Promise((r) => setImmediate(r))

/**
 * One device (one browser running the game).
 * @param {object} [o]
 * @param {number} [o.seed]
 * @param {import('../../server/memory-server.js').MemoryServer} [o.server]
 * @param {boolean} [o.touch]
 * @param {boolean} [o.zip]  the browser has gzip streams (CompressionStream)
 */
export function device(o = {}) {
  const g = loadGame({
    seed: o.seed ?? 1,
    touch: o.touch,
    beforeGame(win) {
      if (o.zip) {
        // give the fake browser real gzip streams (jsdom has none), like a modern browser
        for (const k of ['CompressionStream', 'DecompressionStream', 'Response', 'TextEncoder', 'ReadableStream']) win[k] = globalThis[k]
      }
      if (o.server) {
        win.WebSocket = o.server.WebSocketFor(win)
        win.fetch = o.server.fetchFor(win)
      } else {
        // No server at all: like having no internet.
        win.fetch = () => Promise.reject(new TypeError('Failed to fetch'))
        win.WebSocket = class { constructor() { throw new Error('no network in this test') } }
      }
    },
  })
  const { win } = g
  const zz = () => {
    if (!win.__zz) throw new Error('the game did not expose window.__zz')
    return win.__zz
  }
  const keyEvent = (type, code, target) => {
    const ev = new win.KeyboardEvent(type, { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true, cancelable: true })
    ;(target || win).dispatchEvent(ev)
  }
  const dev = {
    win,
    get zz() { return zz() },
    /** key down (KeyboardEvent.code, e.g. 'KeyJ', 'Enter', 'ArrowLeft') */
    down(code) { keyEvent('keydown', code) },
    up(code) { keyEvent('keyup', code) },
    /** a short press: down and up before the next step */
    tap(code) { keyEvent('keydown', code); keyEvent('keyup', code) },
    /** run n steps of this device alone (1-player games) */
    async step(n = 1) {
      for (let i = 0; i < n; i++) { zz().step(); await settle() }
    },
    /** draw one frame; returns the texts drawn in it */
    render() {
      g.texts.length = 0
      zz().render()
      return g.texts.map((t) => t.text)
    },
    /** texts of the last render with positions: [{text, x, y, color}] */
    drawn() { return g.texts.slice() },
    /** type into the room name box like a person: each character as key events + input event;
     *  selected text is replaced, like in a real text box */
    typeName(s) {
      const box = win.document.getElementById('roomName')
      if (!box) throw new Error('no #roomName box on screen')
      if (win.document.activeElement !== box) box.focus()
      for (const ch of s) {
        const code = /[a-z]/i.test(ch) ? 'Key' + ch.toUpperCase() : /\d/.test(ch) ? 'Digit' + ch : ch === ' ' ? 'Space' : ch
        keyEvent('keydown', code, box)
        const a = box.selectionStart ?? box.value.length
        const b = box.selectionEnd ?? a
        box.value = box.value.slice(0, a) + ch + box.value.slice(b)
        box.setSelectionRange(a + 1, a + 1)
        box.dispatchEvent(new win.Event('input', { bubbles: true }))
        keyEvent('keyup', code, box)
      }
    },
    /** empty the room name box like a person deleting what is in it */
    clearName() {
      const box = win.document.getElementById('roomName')
      box.value = ''
      box.dispatchEvent(new win.Event('input', { bubbles: true }))
    },
    /** a key pressed inside the room name box (e.g. 'Enter', 'ArrowDown', 'Escape') */
    nameKey(code) {
      const box = win.document.getElementById('roomName')
      keyEvent('keydown', code, box)
      keyEvent('keyup', code, box)
    },
    /** press Enter inside the room name box */
    submitName() { dev.nameKey('Enter') },
    /** a click (or a tap) on a page element */
    click(el) {
      for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true }))
      el.click()
    },
    /** the tab is hidden (true) or shown again (false) */
    setHidden(hidden) {
      Object.defineProperty(win.document, 'hidden', { configurable: true, get: () => hidden })
      Object.defineProperty(win.document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
      win.document.dispatchEvent(new win.Event('visibilitychange'))
    },
    /** the window loses focus */
    blur() { win.dispatchEvent(new win.Event('blur')) },
  }
  return dev
}

/** Index of a band member on the select screen, by id ('vocal', 'guitar', ...). */
export function charIndex(dev, id) {
  const i = dev.zz.chars.indexOf(id)
  if (i < 0) throw new Error('unknown band member ' + id + ' (have ' + dev.zz.chars.join(',') + ')')
  return i
}

/** Move a device's select cursor to a band member (uses right arrow presses). */
async function moveCursor(dev, slot, id, tick) {
  const want = charIndex(dev, id)
  for (let n = 0; n < 20 && dev.zz.sel[slot].char !== want; n++) {
    const before = dev.zz.sel[slot].char
    dev.tap('ArrowRight')
    // player 2's screen shows the move a few steps later: wait for it, so we never press too often
    for (let k = 0; k < 12 && dev.zz.sel[slot].char === before; k++) await tick(1)
  }
  if (dev.zz.sel[slot].char !== want) throw new Error('could not move cursor of J' + (slot + 1) + ' to ' + id)
}

/** Choose the stage on the stage screen with up/down (the stage screen is 'mut'). */
async function chooseStage(dev, stage, tick) {
  for (let n = 0; n < 10 && dev.zz.stage !== stage; n++) {
    dev.tap('ArrowDown')
    await tick(2)
  }
  if (dev.zz.stage !== stage) throw new Error('could not choose stage ' + stage)
}

async function until(cond, tick, what, max = 600) {
  for (let i = 0; i < max; i++) {
    if (cond()) return
    await tick(1)
  }
  throw new Error('timed out waiting for: ' + what)
}

/**
 * A 1-player game, through the real menus, ready in the 'play' scene.
 * @param {object} [o]
 * @param {string} [o.char='vocal']   band member id
 * @param {number} [o.stage=1]
 * @param {boolean} [o.withServer=false]  give the device a room server (to check it is NOT used)
 */
export async function onePlayer(o = {}) {
  const server = o.withServer ? createMemoryServer({ random: seededRandom(99) }) : undefined
  const dev = device({ seed: o.seed ?? 1, server })
  const tick = (n = 1) => dev.step(n)
  await tick(1)
  dev.tap('Enter') // 1 JOGADOR is selected first
  await until(() => dev.zz.scene === 'select', tick, 'select screen')
  await tick(12) // the select screen ignores a confirm in its first 10 steps
  await moveCursor(dev, 0, o.char ?? 'vocal', tick)
  dev.tap('Enter')
  await until(() => dev.zz.scene === 'mut', tick, 'stage screen')
  await chooseStage(dev, o.stage ?? 1, tick)
  await tick(25)
  dev.tap('Enter')
  await until(() => dev.zz.scene === 'story', tick, 'story')
  dev.tap('Enter') // show the whole story text
  await tick(2)
  dev.tap('Enter') // start
  await until(() => dev.zz.scene === 'play', tick, 'play')
  return { dev, server, tick, zz: () => dev.zz }
}

/**
 * Two devices in one room. Stops at the step you ask for.
 * @param {object} [o]
 * @param {'room'|'select'|'play'} [o.until='play']
 * @param {string} [o.p1='vocal']  band member of player 1 (host)
 * @param {string} [o.p2='guitar'] band member of player 2 (guest)
 * @param {number} [o.stage=1]
 * @param {string} [o.name]  the room name player 1 types (default: the suggested name)
 */
export async function twoPlayers(o = {}) {
  const server = createMemoryServer({ random: seededRandom(o.seed ?? 7) })
  const host = device({ seed: 1, server, zip: o.zip })
  const guest = device({ seed: 2, server, touch: o.guestTouch, zip: o.zip })
  const g = {
    host, guest, server,
    /** n steps of both devices; network messages are delivered after each step.
     *  A device that was closed with closeGame() is not stepped any more. */
    async tick(n = 1) {
      for (let i = 0; i < n; i++) {
        if (!host.closed) host.zz.step()
        if (!guest.closed) guest.zz.step()
        server.deliver()
        await settle()
        server.deliver()
      }
    },
    /** n steps and the room server clock moves n/60 seconds with them */
    async wait(n) {
      for (let i = 0; i < n; i++) {
        server.advance(1000 / 60)
        await g.tick(1)
      }
    },
    /** the player leaves with SAIR DA SALA in the pause menu */
    async leaveRoom(dev) {
      dev.tap('KeyP')
      await g.tick(2)
      dev.tap('ArrowUp') // from the first row up to the last one: SAIR DA SALA
      await g.tick(2)
      dev.tap('Enter')
      await g.tick(2)
      dev.tap('ArrowLeft') // NÃO -> SIM
      await g.tick(2)
      dev.tap('Enter')
      await g.tick(3)
    },
    /** the tab is closed with no goodbye: the device stops and its connection is cut */
    async closeGame(dev) {
      dev.closed = true
      server.drop(dev.win)
      await g.tick(1)
    },
    /** the device has no network (on) or gets it back (off); it keeps running */
    async offline(dev, on) {
      server.offline(dev.win, on)
      await g.tick(1)
    },
    /** the host's game state */
    get zz() { return host.zz },
    /** the room's hidden id (server.rooms() shows it as `code`) and its name */
    code: null,
    name: null,
  }
  const tick = (n) => g.tick(n)
  await tick(1)
  // player 1: CRIAR SALA, keep the suggested name (or type o.name)
  host.tap('ArrowDown')
  await tick(1)
  host.tap('Enter')
  await until(() => host.zz.scene === 'name', tick, 'the room name screen on the host')
  if (o.name) { host.clearName(); host.typeName(o.name) }
  host.submitName()
  await until(() => host.zz.scene === 'room' && host.zz.net.code, tick, 'the room on the host')
  g.code = host.zz.net.code
  g.name = host.zz.net.name
  if (o.until === 'room') return g
  // player 2: ENTRAR NA SALA, pick the room from the list
  guest.tap('ArrowDown')
  await tick(1)
  guest.tap('ArrowDown')
  await tick(1)
  guest.tap('Enter')
  await pickRoom(guest, g.name, tick)
  await until(() => host.zz.scene === 'select' && guest.zz.scene === 'select', tick, 'both on the select screen')
  if (o.until === 'select') return g
  await tick(12) // the select screen ignores a confirm in its first 10 steps
  await moveCursor(host, 0, o.p1 ?? 'vocal', tick)
  await moveCursor(guest, 1, o.p2 ?? 'guitar', tick)
  host.tap('Enter')
  await tick(2)
  guest.tap('Enter')
  await until(() => host.zz.scene === 'mut', tick, 'stage screen')
  await chooseStage(host, o.stage ?? 1, tick)
  await tick(25)
  host.tap('Enter')
  await until(() => host.zz.scene === 'story', tick, 'story')
  host.tap('Enter')
  await tick(2)
  host.tap('Enter')
  await until(() => host.zz.scene === 'play' && guest.zz.scene === 'play', tick, 'play on both devices')
  return g
}

/**
 * On the room list (scene 'join'): wait until the room `name` is listed, move the cursor to it
 * with ▲▼ and press ENTER.
 */
export async function pickRoom(dev, name, tick, max = 400) {
  await until(() => dev.zz.scene === 'join' && dev.zz.rooms.items.some((r) => r.name === name), tick, 'the room ' + name + ' in the list', max)
  for (let n = 0; n < 40; n++) {
    const { items, sel } = dev.zz.rooms
    const want = items.findIndex((r) => r.name === name)
    if (want < 0) throw new Error('the room ' + name + ' left the list')
    if (sel === want) break
    dev.tap(sel < want ? 'ArrowDown' : 'ArrowUp')
    await tick(1)
  }
  const { items, sel } = dev.zz.rooms
  if (items[sel]?.name !== name) throw new Error('could not select the room ' + name)
  dev.tap('Enter')
  await tick(1)
}

/** Put a fighter at a place (host side) and make it stand still. */
export function place(f, x, y) {
  f.x = x
  f.y = y ?? f.y
  f.z = 0
  f.vx = 0
  f.state = 'idle'
  f.t = 0
}

/** Run until cond() is true or max steps pass; returns true if it happened. */
export async function stepUntil(tick, cond, max = 600) {
  for (let i = 0; i < max; i++) {
    if (cond()) return true
    await tick(1)
  }
  return cond()
}
