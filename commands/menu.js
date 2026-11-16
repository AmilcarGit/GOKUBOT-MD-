const cfg = require('../config')
const T = require('../lib/theme')
const seasonal = require('./goku/temporadas')

// Lista de comandos por categoría. Para agregar un comando al menú, añádelo aquí.
// El aspecto (marcos, emojis, letras) lo pone el tema activo (themes/*.js).
const CATEGORIES = p => [
  ['Universo Goku', [`${p}goku`, `${p}ki`, `${p}transformacion`]],
  ['Saiyajin RPG', [
    `${p}perfil / ${p}nivel`, `${p}entrenar / ${p}transformar`, `${p}duelo @usuario`,
    `${p}ranking / ${p}misiones`, `${p}reclamar`, `${p}tienda / ${p}comprar <id>`, `${p}inventario / ${p}shenlong`, `${p}jefe <esbirro|capitan|senor>`
  ]],
  ['Personajes', [`${p}personajes`, `${p}invocarz`, `${p}misguerreros`, `${p}mejorar <id>`]],
  ['YouTube', [`${p}yts <texto>`, `${p}play <texto>`, `${p}ytmp3 <texto|link|nº>`, `${p}ytmp4 <texto|link|nº>`]],
  ['Guerreros originales', [`${p}invocar (250 Zenis)`, `${p}coleccion`, `${p}guerrero <nombre|nº>`, `${p}guerreros`]],
  ['Juegos Z', [`${p}slot <apuesta>`, `${p}ruleta <apuesta> <rojo|negro|verde>`, `${p}regalar @usuario <zenis>`, `${p}ricos`]],
  ['Imagen y audio', [`${p}meme arriba | abajo`, `${p}bn / ${p}negativo / ${p}espejo / ${p}blur / ${p}pixelar`, `${p}mp3`, `${p}rapido / ${p}lento / ${p}ardilla / ${p}grave / ${p}eco`]],
  ['Interactivo', [`${p}trivia (gana Zenis)`, `${p}menui (menú con botones)`, `${p}encuesta pregunta | a | b`, `${p}recordar 30m texto`]],
  ['Descargas', [`${p}tiktok <enlace>`, `${p}ig <enlace>`, `${p}fb <enlace>`, `${p}dl <enlace> (detecta solo)`, `${p}ttmp3 <enlace de TikTok>`]],
  ['Diario y mascota', [`${p}diario (racha de días)`, `${p}racha`, `${p}adoptar`, `${p}mascota`, `${p}alimentar / ${p}acariciar`, `${p}skins / ${p}skin <nombre>`, `${p}nombrarmascota <nombre>`]],
  ['Torneo', [`${p}torneo (admin abre)`, `${p}unirme`, `${p}empezar (admin)`, `${p}torneo top`, `${p}cancelartorneo`]],
  ['WhatsApp', [`${p}copiar <texto>`, `${p}contacto`, `${p}ubicacion`, `${p}repo`, `${p}cargar`]],
  ['Dueño', [`${p}panel`, `${p}ia on/off`, `${p}anuncio <texto>`, `${p}ban / ${p}unban`, `${p}dar / ${p}quitar <zenis>`, `${p}darxp`, `${p}daresfera`, `${p}darguerrero`, `${p}jugador`, `${p}resetjugador`, `${p}reiniciar`, `${p}miid`]],
  ['Grupos', [`${p}bienvenida on/off`, `${p}antilink on/off`, `${p}todos <mensaje>`, `${p}actividad`]],
  ['IA Goku', [`${p}ia <pregunta>`, `${p}ia reset`, `${p}voz on/off`, `${p}hablar <texto>`, '(en privado responde solo)']],
  ['Imagen y animación', [`${p}tarjeta`, `${p}top`, `${p}nevada`, `${p}fuegos`, `${p}dragon`, `${p}stickeranim`, `${p}aura`, `${p}onda`, `${p}poder`, `${p}esferas`]],
  ['Utilidades', [`${p}estado`, `${p}menuapi`, `${p}ping`, `${p}owner`]]
]

function buildMenu(p) {
  const event = seasonal.getEvent()
  const blocks = [T.theme.menuBanner(cfg.botName)]
  const categories = CATEGORIES(p)
  if (event) {
    categories.splice(1, 0, [event.name, [`${p}evento`, `${p}frase`, `${p}regalo`, `${p}arbol`, `${p}felicitar <nombre>`, `${p}sorteo`]])
  }
  for (const [name, lines] of categories) blocks.push(T.section(name, lines))
  blocks.push(T.theme.menuFooter(cfg.creator, p))
  return T.mark(blocks.join('\n\n'))
}

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!['menu', 'help', 'menú'].includes(cmd)) return false
  const caption = buildMenu(prefix)
  try {
    const response = await fetch(cfg.menuVideo, { signal: AbortSignal.timeout(60000) })
    if (!response.ok) throw new Error('No se pudo obtener el video del menú')
    const video = Buffer.from(await response.arrayBuffer())
    await sock.sendMessage(jid, { video, mimetype: 'video/mp4', gifPlayback: true, caption }, { quoted: m })
  } catch {
    await sock.sendMessage(jid, { text: caption }, { quoted: m })
  }
  return true
}

module.exports.buildMenu = buildMenu
module.exports.CATEGORIES = CATEGORIES
