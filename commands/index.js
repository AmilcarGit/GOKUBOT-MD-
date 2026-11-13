// Router de comandos: cada módulo recibe (sock, m, jid, cmd, text, prefix)
// y devuelve true si atendió el comando. El orden define la prioridad.
const handlers = [
  require('./goku/rpg'),         // RPG: perfil, entrenar, duelo, tienda...
  require('./goku/personajes'),  // Colección de personajes
  require('./goku'),             // Menú, Goku y temporadas
  require('./yui'),              // Utilidades de YuiAPI
  require('./general'),          // ping, owner
  require('./youtube')           // YouTube (respaldo sin YuiAPI)
]

module.exports = async function runCommand(...args) {
  for (const handler of handlers) {
    if (await handler(...args)) return true
  }
  return false
}
