// The game's API (served by the Pages Function functions/api/[[path]].js):
//   GET /api/ping                         -> 200 {"ok":true}
//   GET /api/rooms                         -> 200 {"rooms":[{id,name}]}  the room list
//   GET /api/room/new?v=&name=             WebSocket: create a room
//   GET /api/room/<ID>?v=[&token=]         WebSocket: join a room, or come back
// The rooms are Durable Objects reached through the binding env.ROOMS (server/room-do.js); the
// list is the one Durable Object `Lobby` (env.LOBBY, server/lobby-do.js).
import { DEFAULT_NAME, ERR, cleanName, normalizeCode, randomCode } from './protocol.js'
import { errorSocket } from './error-socket.js'
import { lobbyOf, tellLobby } from './lobby-client.js'

const CREATE_TRIES = 10 // ids to try before giving up (503); an id in use answers 409
const NO_STORE = { headers: { 'cache-control': 'no-store' } }

/**
 * @param {Request} request
 * @param {{ROOMS: DurableObjectNamespace}} env
 * @param {() => number} [random=Math.random] used for new room codes
 * @returns {Promise<Response>}
 */
export async function handleApi(request, env, random = Math.random) {
  const url = new URL(request.url)
  if (url.pathname === '/api/ping') return Response.json({ ok: true }, NO_STORE)
  if (url.pathname === '/api/rooms') {
    const lobby = lobbyOf(env)
    const res = lobby ? await lobby.fetch('https://lobby/list') : null
    const rooms = res?.ok ? (await res.json()).rooms : []
    return Response.json({ rooms }, NO_STORE)
  }
  const path = url.pathname.match(/^\/api\/room\/([^/]+)$/)
  if (!path) return new Response('not found', { status: 404 })
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('expected a WebSocket', { status: 426 })
  }
  const v = url.searchParams.get('v') ?? ''

  if (path[1] === 'new') {
    const typed = url.searchParams.get('name') ?? ''
    const lobby = lobbyOf(env)
    for (let i = 0; i < CREATE_TRIES; i++) {
      const code = randomCode(random)
      let name = cleanName(typed) || DEFAULT_NAME
      if (lobby) {
        // the list gives the final, unique name (409: a room has this id now)
        const r = await lobby.fetch('https://lobby/reserve', { method: 'POST', body: JSON.stringify({ id: code, name: typed }) })
        if (r.status === 409) {
          await r.body?.cancel()
          continue
        }
        if (!r.ok) return new Response('room list error', { status: 503 })
        name = (await r.json()).name
      }
      const res = await toRoom(env, request, 'create', { code, v, name })
      if (res.status !== 409) return res
      await res.body?.cancel()
      await tellLobby(env, { id: code, state: 'gone' }) // drop the reservation; try another id
    }
    return new Response('no free room code', { status: 503 })
  }

  const code = normalizeCode(path[1])
  if (!code) return errorSocket(ERR.NOT_FOUND)
  const token = url.searchParams.get('token')
  return toRoom(env, request, 'join', token ? { code, v, token } : { code, v })
}

/** Pass the WebSocket request on to the Durable Object of the room `params.code`. */
function toRoom(env, request, action, params) {
  const url = new URL('https://room/' + action)
  for (const [k, value] of Object.entries(params)) url.searchParams.set(k, value)
  const stub = env.ROOMS.get(env.ROOMS.idFromName(params.code))
  return stub.fetch(new Request(url, request))
}
