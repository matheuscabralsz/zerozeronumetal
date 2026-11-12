// Browsers can not read the HTTP status of a failed WebSocket handshake, so a refused player
// gets an accepted socket that says why ({t:'err', code}) and is closed at once.

/**
 * @param {string} code one of ERR in protocol.js
 * @returns {Response} a 101 response with the client end of the socket
 */
export function errorSocket(code) {
  const [client, server] = Object.values(new WebSocketPair())
  server.accept()
  server.send(JSON.stringify({ t: 'err', code }))
  server.close(1000, code)
  return new Response(null, { status: 101, webSocket: client })
}
