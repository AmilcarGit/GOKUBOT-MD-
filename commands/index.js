// Router de comandos: cada módulo recibe (sock, m, jid, cmd, text, prefix)
// y devuelve true si atendió el comando. El orden define la prioridad.
const handlers = [
  require('./menu'),             // Menú principal (themed)
  require('./goku/rpg'),         // RPG: perfil, entrenar, duelo, tienda...
  require('./goku/personajes'),  // Colección de personajes
  require('./goku'),             // Goku y temporadas
  require('./yui'),              // Utilidades de YuiAPI
  require('./estado'),           // estado del bot en vivo
  require('./dueno'),            // Panel del dueño (.panel, .ia on/off, .ban...)
  require('./ia'),               // IA de Goku (.ia)
  require('./interactivo'),      // Trivia, menú con botones, encuesta, recordar
  require('./whatsapp'),         // Funciones de WhatsApp: copiar, contacto, ubicación, repo, cargar
  require('./diario'),           // Recompensa diaria con racha
  require('./mascota'),          // Mascota: adoptar, alimentar, skins
  require('./torneo'),           // Torneo Tenkaichi en grupos
  require('./guerreros'),        // Guerreros originales: invocar, coleccion
  require('./juegos'),           // Juegos: slot y ruleta con Zenis
  require('./grupos'),           // Grupos: bienvenida, antilink, todos, actividad
  require('./herramientas'),     // Filtros de imagen, memes y audio
  require('./visual'),           // imágenes, animaciones y stickers animados
  require('./general'),          // ping, owner
  require('./youtube')           // YouTube: yts, play, ytmp3, ytmp4
]

const { wrapSock } = require('../lib/theme')
const status = require('../lib/status')

// Todo mensaje saliente pasa por el tema activo (themes/*.js).
module.exports = async function runCommand(sock, ...args) {
  const themed = wrapSock(sock)
  for (const handler of handlers) {
    if (await handler(themed, ...args)) {
      status.countCommand(args[2])
      return true
    }
  }
  return false
}
