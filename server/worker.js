// The Worker "zerozero-rooms": it only holds the Durable Object classes. There are no public
// routes (workers_dev = false); the game's Pages Function reaches the rooms via its binding.
export { Room } from './room-do.js'
export { Lobby } from './lobby-do.js'

export default {
  fetch() {
    return new Response('not found', { status: 404 })
  },
}
