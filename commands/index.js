// Router de comandos: cada módulo recibe (sock, m, jid, cmd, text, prefix)
// y devuelve true si atendió el comando. El orden define la prioridad.
const handlers = [
  require('./menu'),             // Menú principal (themed)
  require('./goku/rpg'),         // RPG: perfil, entrenar, duelo, tienda...
  require('./goku/personajes'),  // Colección de personajes
  require('./goku'),             // Goku y temporadas
  require('./yui'),              // Utilidades de YuiAPI
  require('./general'),          // ping, owner
  require('./youtube')           // YouTube: yts, play, ytmp3, ytmp4
]

const { wrapSock } = require('../lib/theme')

// Todo mensaje saliente pasa por el tema activo (themes/*.js).
module.exports = async function runCommand(sock, ...args) {
  const themed = wrapSock(sock)
  for (const handler of handlers) {
    if (await handler(themed, ...args)) return true
  }
  return false
}
