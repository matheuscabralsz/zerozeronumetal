// Room protocol: the contract between the game (jogo/index.html) and the room server.
// The game keeps its own copy of these values; tests check that the copies match.
//
// HTTP, all under the game's own address (Cloudflare Pages Functions in /functions):
//   GET /api/ping                               -> 200 {"ok":true}            (is online play possible?)
//   GET /api/rooms                              -> 200 {"rooms":[{"id","name"}]}  the rooms that wait
//                                                  for player 2, newest first (never cached)
//   GET /api/room/new?v=<version>&name=<name>   WebSocket: create a room; you are player 1 (slot 0).
//                                                  The server cleans the name (cleanName) and makes it
//                                                  unique (uniqueName); 'hello' carries the final name.
//   GET /api/room/<ID>?v=<version>              WebSocket: join a room as player 2 (slot 1)
//   GET /api/room/<ID>?v=<version>&token=<t>    WebSocket: come back after a dropped connection
// <ID> is the room's hidden id (a code, see below). Players never see or type it; the game takes it
// from the room list or from 'hello'.
// The daily limit of the free plan shows up as HTTP 429 on /api/ping and /api/rooms.
//
// Server -> client, JSON text frames:
//   {t:'hello', code, name, slot:0|1, token, peer:'none'|'here'|'drop', started:boolean}
//        you are in the room `code` (its hidden id) called `name`. `peer` is the other player's
//        state right now.
//   {t:'peer', ev:'join'|'drop'|'back'|'leave'}
//        the other player joined / lost the connection / came back / left for good.
//   {t:'closed', why:'host_left'|'expired'}
//        the room closed before the game started (you go back to the title).
//   {t:'err', code:ERR.*}
//        you could not enter; the server closes the socket right after.
//   {t:'m', d:<any JSON>}
//        a message from the other player (game data: inputs, game state).
//
// Client -> server, JSON text frames:
//   {t:'start'}   (slot 0 only) the game has started: from now on nobody new can join.
//   {t:'leave'}   leave on purpose: no 15 s wait. Before the start, the host leaving closes the room.
//   {t:'m', d}    send d to the other player (dropped if the other player is not connected).
//
// Rules (see .specs/online-coop/DECISIONS.md D5, NEW-46, NEW-56..NEW-69):
// - Ids: CODE_LENGTH characters from CODE_ALPHABET, unique among open rooms.
// - Names: cleanName(), at most NAME_MAX characters, unique among the rooms that exist (uniqueName).
// - The room list has a room while it waits for player 2: not started, no player 2 (the host may
//   be away, NEW-56). Rooms of every game version are listed.
// - A dropped player (socket closed without {t:'leave'}) can come back with its token within
//   DROP_GRACE_MS; after that it counts as a player who left.
// - Exception (NEW-56): while the room waits for player 2, the host can be away up to
//   WAIT_ROOM_MS after the room was made.
// - A room with nobody left closes, keeps nothing and leaves the list; its id then gives ERR.NOT_FOUND.

export const CODE_ALPHABET = 'CDFGHJKMNPQRTVWX3479'
export const CODE_LENGTH = 4
export const DROP_GRACE_MS = 15_000
export const WAIT_ROOM_MS = 10 * 60_000
export const CONNECT_TIMEOUT_MS = 8_000
export const NAME_MAX = 16
export const DEFAULT_NAME = 'SALA' // when a name is empty after cleaning

export const ERR = Object.freeze({
  NOT_FOUND: 'not_found', // no open room with this code
  FULL: 'full', // the room already has 2 players
  STARTED: 'started', // the game in this room already started
  VERSION: 'version', // the room was made with another game version
  EXPIRED: 'expired', // a come-back token that is no longer valid
})

/**
 * Turn what a person typed into a room code, or null when it can not be a code.
 * Not case-sensitive; spaces around are ignored. Example: ' k7qx ' -> 'K7QX'.
 * @param {string} typed
 * @returns {string|null}
 */
export function normalizeCode(typed) {
  if (typeof typed !== 'string') return null
  const code = typed.trim().toUpperCase()
  if (code.length !== CODE_LENGTH) return null
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null
  return code
}

/**
 * A new random room code.
 * @param {() => number} [random=Math.random]
 * @returns {string}
 */
export function randomCode(random = Math.random) {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const n = Math.min(CODE_ALPHABET.length - 1, Math.floor(random() * CODE_ALPHABET.length))
    code += CODE_ALPHABET[n]
  }
  return code
}

/**
 * Clean a room name as typed: capital letters; only letters (accents included), numbers and
 * spaces; no spaces at the ends and no double spaces; at most NAME_MAX characters.
 * Example: '  rock   do jo\u00e3o!! ' -> 'ROCK DO JO\u00c3O'. Returns '' when nothing is left.
 * @param {string} typed
 * @returns {string}
 */
export function cleanName(typed) {
  if (typeof typed !== 'string') return ''
  return typed
    .normalize('NFC')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9À-ÖØ-Þ ]/g, '')
    .replace(/ +/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim()
}

/**
 * The name itself when no room in `taken` has it, else the name with ' 2' added (then ' 3', ...),
 * cut so that it stays at NAME_MAX characters. Example: 'ROCK' with {'ROCK'} -> 'ROCK 2'.
 * @param {string} name     a clean name (cleanName)
 * @param {Set<string>} taken  names of the rooms that exist
 * @returns {string}
 */
export function uniqueName(name, taken) {
  if (!taken.has(name)) return name
  for (let n = 2; ; n++) {
    const end = ' ' + n
    const candidate = name.slice(0, NAME_MAX - end.length).trimEnd() + end
    if (!taken.has(candidate)) return candidate
  }
}
