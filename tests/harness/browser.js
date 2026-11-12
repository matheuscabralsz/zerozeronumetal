// A fake browser for the game: loads jogo/index.html in jsdom with small fakes for
// canvas, images, audio and the animation loop. Tests drive the game one step at a time
// (60 steps = 1 second of game time) and read what the game drew with `texts()`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { JSDOM, VirtualConsole } from 'jsdom'

const GAME_DIR = fileURLToPath(new URL('../../jogo/', import.meta.url))
let GAME_HTML = null
/** The game page with its script files (pixspr.js, imagens.js, jogo.js) put inline, as the browser would run them. */
export function gameHtml() {
  if (!GAME_HTML) {
    GAME_HTML = readFileSync(GAME_DIR + 'index.html', 'utf8').replace(
      /<script src="([^"]+)"><\/script>/g,
      (_, file) => '<script>' + readFileSync(GAME_DIR + file, 'utf8').replace(/<\/script>/gi, '<\\/script>') + '</script>',
    )
  }
  return GAME_HTML
}

// Same numbers every run: a small seeded random generator (mulberry32).
export function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A 2D canvas context that draws nothing but remembers every text it was asked to draw.
function fakeContext(canvas, record) {
  const state = { fillStyle: '#000', strokeStyle: '#000', font: '10px sans-serif', globalAlpha: 1, lineWidth: 1, textAlign: 'left', textBaseline: 'top', globalCompositeOperation: 'source-over', imageSmoothingEnabled: true }
  const matrix = () => {
    const m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
    m.inverse = () => matrix()
    m.multiply = () => matrix()
    return m
  }
  const special = {
    canvas,
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }),
    measureText: (s) => ({ width: String(s).length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({ setTransform() {} }),
    getTransform: () => matrix(),
    fillText: (s, x, y) => { if (record) record.push({ text: String(s), x, y, color: state.fillStyle, kind: 'fill' }) },
    strokeText: (s, x, y) => { if (record) record.push({ text: String(s), x, y, color: state.strokeStyle, kind: 'stroke' }) },
  }
  return new Proxy(state, {
    get(t, prop) {
      if (prop in special) return special[prop]
      if (prop in t) return t[prop]
      if (typeof prop === 'symbol') return undefined
      return () => {}
    },
    set(t, prop, v) { t[prop] = v; return true },
  })
}

/**
 * Load one game in a fake browser.
 * @param {object} [o]
 * @param {number} [o.seed=1] seed for Math.random
 * @param {(win: Window) => void} [o.beforeGame] runs before the game script (install fakes here)
 * @param {boolean} [o.touch=false] pretend to be a phone (touch controls)
 */
export function loadGame(o = {}) {
  const texts = []
  const vc = new VirtualConsole()
  const errors = []
  vc.on('jsdomError', (e) => errors.push(e))
  vc.on('error', (e) => errors.push(e))
  const dom = new JSDOM(gameHtml(), {
    url: 'https://zerozeronumetal.pages.dev/',
    runScripts: 'dangerously',
    pretendToBeVisual: false,
    virtualConsole: vc,
    beforeParse(win) {
      win.Math.random = seededRandom(o.seed ?? 1)
      win.requestAnimationFrame = () => 0
      win.cancelAnimationFrame = () => {}
      win.matchMedia = (q) => ({ matches: !!o.touch && q.includes('coarse'), addEventListener() {}, removeEventListener() {} })
      // jsdom says every window has touch; a computer (the default) must not.
      if (o.touch) win.ontouchstart = null
      else delete win.ontouchstart
      win.HTMLCanvasElement.prototype.getContext = function () {
        if (!this.__ctx) this.__ctx = fakeContext(this, this.id === 'c' ? texts : null)
        return this.__ctx
      }
      win.HTMLCanvasElement.prototype.toDataURL = () => 'data:,'
      win.AudioContext = undefined
      win.webkitAudioContext = undefined
      if (o.beforeGame) o.beforeGame(win)
    },
  })
  const win = dom.window
  if (errors.length) throw new Error('game failed to load: ' + errors.map((e) => e.stack || e.message || e).join('\n'))
  // The game waits for fonts with a 2.5 s timeout; jsdom has no document.fonts, so it starts at once (microtask).
  return { dom, win, texts, errors }
}
