const cfg = require('../config')
const T = require('../lib/theme')
const seasonal = require('./goku/temporadas')

// Lista de comandos por categoría. Para agregar un comando al menú, añádelo aquí.
// El aspecto (marcos, emojis, letras) lo pone el tema activo (themes/*.js).
const CATEGORIES = p => [
  ['Universo Goku', [`${p}goku`, `${p}ki`, `${p}transformacion`]],
  ['Saiyajin RPG', [
    `${p}perfil / ${p}nivel`, `${p}entrenar / ${p}transformar`, `${p}duelo @usuario`,
    `${p}ranking / ${p}misiones`, `${p}reclamar`, `${p}tienda / ${p}comprar <id>`, `${p}inventario / ${p}shenlong`
  ]],
  ['Personajes', [`${p}personajes`, `${p}invocar`, `${p}misguerreros`, `${p}mejorar <id>`]],
  ['YouTube', [`${p}yts <texto>`, `${p}play <texto>`, `${p}ytmp3 <texto|link|nº>`, `${p}ytmp4 <texto|link|nº>`]],
  ['Imagen y animación', [`${p}tarjeta`, `${p}top`, `${p}nevada`, `${p}fuegos`, `${p}dragon`, `${p}stickeranim`]],
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
