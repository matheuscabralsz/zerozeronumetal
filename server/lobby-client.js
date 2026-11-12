// Calls to the one Durable Object `Lobby` (server/lobby-do.js), for the Pages Function and the rooms.
// No 'cloudflare:workers' import here, so the Pages Function can use it too.

/** The one Lobby object, or null when this Worker has no LOBBY binding. */
export function lobbyOf(env) {
  return env.LOBBY ? env.LOBBY.get(env.LOBBY.idFromName('lobby')) : null
}

/** A room tells the list its state; a failure is only logged (the list heals on the next join). */
export async function tellLobby(env, report) {
  const lobby = lobbyOf(env)
  if (!lobby) return
  try {
    const res = await lobby.fetch('https://lobby/set', { method: 'POST', body: JSON.stringify(report) })
    await res.body?.cancel()
  } catch (e) {
    console.log('lobby set failed', e?.message)
  }
}
