// Cloudflare Pages Function for every /api/* address of the game (see server/api.js).
// The room Durable Objects are reached through the ROOMS binding (wrangler.toml at the root).
import { handleApi } from '../../server/api.js'

export function onRequestGet({ request, env }) {
  return handleApi(request, env)
}
