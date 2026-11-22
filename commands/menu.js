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
  ['Imagen y audio', [`${p}meme arriba | abajo`, `${p}bn / ${p}negativo / ${p}espejo / ${p}blur / ${p}pixelar`, `${p}mp3`, `${p}audiogoku (audio real de Goku)`, `${p}rapido / ${p}lento / ${p}ardilla / ${p}grave / ${p}eco`]],
  ['Interactivo', [`${p}trivia (gana Zenis)`, `${p}menui (menú con botones)`, `${p}encuesta pregunta | a | b`, `${p}recordar 30m texto`]],
  ['Subbots', [`${p}serbot (crea tu subbot)`, `${p}subbots (radar)`, `${p}borrarsubbot`, `${p}mibot (panel)`, `${p}configbot`, `${p}miprefijo`, `${p}mibienvenida`, `${p}miia`, `${p}mipersona`, `${p}pausarbot / ${p}reanudarbot`, `${p}reiniciarbot`]],
  ['Descargas', [`${p}tiktok <enlace>`, `${p}ig <enlace>`, `${p}fb <enlace>`, `${p}dl <enlace> (detecta solo)`, `${p}ttmp3 <enlace de TikTok>`]],
  ['Diario y mascota', [`${p}diario (racha de días)`, `${p}racha`, `${p}adoptar`, `${p}mascota`, `${p}alimentar / ${p}acariciar`, `${p}skins / ${p}skin <nombre>`, `${p}nombrarmascota <nombre>`]],
  ['Torneo', [`${p}torneo (admin abre)`, `${p}unirme`, `${p}empezar (admin)`, `${p}torneo top`, `${p}cancelartorneo`]],
  ['Juegos multijugador', [`${p}3enraya @rival`, `${p}jugar <1-9>`, `${p}combate @rival [apuesta]`, `${p}aceptar / ${p}rechazar`, `${p}rendirse`, `${p}ppt <piedra|papel|tijera>`, `${p}ahorcado / ${p}letra <x>`]],
  ['Economía', [`${p}banco / ${p}cartera`, `${p}depositar <n|todo>`, `${p}retirar <n|todo>`, `${p}trabajar (cada 45 min)`, `${p}robar @usuario`, `${p}mercado`, `${p}adquirir <escudo|llave|amuleto>`, `${p}mochila`]],
  ['Moderación', [`${p}warn / ${p}unwarn / ${p}warns`, `${p}kick`, `${p}promover / ${p}degradar`, `${p}cerrar / ${p}abrir`, `${p}silenciar / ${p}desilenciar`, `${p}antispam on/off`, `${p}reglas / ${p}setreglas`, `${p}admins`, `${p}link`, `${p}eliminar`, `${p}moderar (panel)`]],
  ['WhatsApp', [`${p}copiar <texto>`, `${p}contacto`, `${p}ubicacion`, `${p}repo`, `${p}cargar`]],
  ['Dueño', [`${p}panel`, `${p}ia on/off`, `${p}anuncio <texto>`, `${p}ban / ${p}unban`, `${p}dar / ${p}quitar <zenis>`, `${p}darxp`, `${p}daresfera`, `${p}darguerrero`, `${p}jugador`, `${p}resetjugador`, `${p}reiniciar`, `${p}miid`, `${p}usosub`, `${p}avisosub`, `${p}bansub / ${p}unbansub`, `${p}limitesub`, `${p}pausarsub / ${p}reiniciarsub`]],
  ['Grupos', [`${p}bienvenida on/off`, `${p}antilink on/off`, `${p}todos <mensaje>`, `${p}actividad`]],
  ['IA Goku', [`${p}ia <pregunta>`, `${p}ia reset`, `${p}voz on/off`, `${p}hablar <texto>`, '(en privado responde solo)']],
  ['Imagen y animación', [`${p}tarjeta`, `${p}top`, `${p}nevada`, `${p}fuegos`, `${p}dragon`, `${p}stickeranim`, `${p}aura`, `${p}onda`, `${p}poder`, `${p}esferas`]],
  ['Utilidades', [`${p}estado`, `${p}menuapi`, `${p}ping`, `${p}owner`]]
]

// Secciones del menú desplegable (WhatsApp limita las listas a ~10 filas).
const SECTIONS = [
  { key: 'juegos',    title: '🎮 Juegos y RPG',          desc: 'Saiyajin RPG, guerreros, juegos Z',       cats: ['Universo Goku', 'Saiyajin RPG', 'Personajes', 'Guerreros originales', 'Juegos Z', 'Interactivo'] },
  { key: 'multi',     title: '⚔️ Multijugador',          desc: '3 en raya, combates, piedra/papel/tijera', cats: ['Juegos multijugador'] },
  { key: 'economia',  title: '💰 Economía y mercado',    desc: 'Banco, trabajos, robos y objetos',         cats: ['Economía'] },
  { key: 'social',    title: '🐲 Diario, mascota y torneo', desc: 'Racha diaria, mascota y Tenkaichi',      cats: ['Diario y mascota', 'Torneo'] },
  { key: 'descargas', title: '📥 Descargas y música',    desc: 'YouTube, TikTok, Instagram, Facebook',     cats: ['YouTube', 'Descargas'] },
  { key: 'ia',        title: '🤖 IA y subbots',          desc: 'IA Goku, voz y tu propio subbot',          cats: ['IA Goku', 'Subbots'] },
  { key: 'imagen',    title: '🎨 Imagen y animación',    desc: 'Tarjetas, stickers, efectos y audio',      cats: ['Imagen y audio', 'Imagen y animación'] },
  { key: 'grupos',    title: '🛡️ Grupos y moderación',   desc: 'Warns, kick, antispam, reglas',            cats: ['Moderación', 'Grupos'] },
  { key: 'util',      title: '🧰 Utilidades y WhatsApp', desc: 'Copiar, contacto, estado, ping',           cats: ['WhatsApp', 'Utilidades'] },
  { key: 'dueno',     title: '👑 Dueño',                 desc: 'Panel y herramientas del dueño',           cats: ['Dueño'] }
]

function allCategories(p) {
  const categories = CATEGORIES(p)
  const event = seasonal.getEvent()
  if (event) categories.splice(1, 0, [event.name, [`${p}evento`, `${p}frase`, `${p}regalo`, `${p}arbol`, `${p}felicitar <nombre>`, `${p}sorteo`]])
  return categories
}

function buildMenu(p) {
  const blocks = [T.theme.menuBanner(cfg.botName)]
  for (const [name, lines] of allCategories(p)) blocks.push(T.section(name, lines))
  blocks.push(T.theme.menuFooter(cfg.creator, p))
  return T.mark(blocks.join('\n\n'))
}

function stats(p) {
  const cats = allCategories(p)
  const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-záéíóúñ0-9]+', 'gi')
  const names = new Set()
  for (const [, lines] of cats) for (const l of lines) for (const x of l.match(re) || []) names.add(x.toLowerCase())
  return { commands: names.size, categories: cats.length }
}

function sectionText(sec, p) {
  const cats = allCategories(p)
  const extra = sec.key === 'juegos' ? cats.filter(([n]) => seasonal.getEvent() && n === seasonal.getEvent().name) : []
  const picked = [...cats.filter(([n]) => sec.cats.includes(n)), ...extra]
  return T.mark(picked.map(([name, lines]) => T.section(name, lines)).join('\n\n'))
}

// El banner se dibuja una sola vez y se guarda en memoria.
let bannerCache = null
async function banner(p) {
  const info = { name: cfg.botName, ...stats(p) }
  const key = JSON.stringify(info)
  if (bannerCache?.key === key) return bannerCache
  const { Canvas } = require('../lib/canvas')
  const scenes = require('../lib/scenes3')
  const video = require('../lib/video')
  const W = 480, H = 270, count = 30
  const c = new Canvas(W, H)
  let entry
  if (video.hasFfmpeg()) {
    try {
      const buffer = await video.encode({ width: W, height: H, fps: 12, count, format: 'mp4', frame: i => { c.clear([0, 0, 0], 1); scenes.menuBanner(c, i / count, info); return c.data } })
      entry = { key, video: buffer }
    } catch (error) { console.error('[menu] banner animado falló:', error.message) }
  }
  if (!entry) { c.clear([0, 0, 0], 1); scenes.menuBanner(c, 0.1, info); entry = { key, image: c.toPNG() } }
  return (bannerCache = entry)
}

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!['menu', 'help', 'menú'].includes(cmd)) return false
  const arg = text.trim().toLowerCase()

  if (arg === 'todo' || arg === 'completo') {
    await sock.sendMessage(jid, { text: buildMenu(prefix) }, { quoted: m })
    return true
  }
  const sec = arg && SECTIONS.find(s => s.key === arg)
  const nav = [{ id: `${prefix}menu`, text: '⬅️ Volver al menú' }, { id: `${prefix}menu todo`, text: '📜 Ver todo' }]
  if (sec) {
    await sock.sendMessage(jid, { text: sectionText(sec, prefix), footer: sec.title, buttons: nav }, { quoted: m })
    return true
  }

  const st = stats(prefix)
  const event = seasonal.getEvent()
  const caption = T.mark(`${T.theme.menuBanner(cfg.botName)}\n\n¡Hola! Soy *${cfg.botName}* 🐉\n📚 ${st.commands} comandos en ${st.categories} secciones${event ? `\n🎉 Evento activo: ${event.name}` : ''}\n\n👇 Abre la cajita y elige una sección`)
  const buttons = [
    { text: '📂 Elegir sección', sections: [{ title: 'Secciones', rows: SECTIONS.map(s => ({ title: s.title, description: s.desc, id: `${prefix}menu ${s.key}` })) }] },
    { text: '📜 Ver todo', id: `${prefix}menu todo` }
  ]
  const b = await banner(prefix).catch(() => null)
  const attempts = b
    ? [b.video ? { video: b.video, mimetype: 'video/mp4', gifPlayback: true } : { image: b.image }]
    : [{}]
  for (const media of attempts) {
    try {
      await sock.sendMessage(jid, { ...media, ...(media.video || media.image ? { caption } : { text: caption }), footer: cfg.botName, buttons }, { quoted: m })
      return true
    } catch (error) { console.error('[menu] envío con botones falló:', error.message) }
    try {
      await sock.sendMessage(jid, media.video || media.image ? { ...media, caption } : { text: caption }, { quoted: m })
      return true
    } catch {}
  }
  await sock.sendMessage(jid, { text: buildMenu(prefix) }, { quoted: m })
  return true
}

module.exports.buildMenu = buildMenu
module.exports.CATEGORIES = CATEGORIES
module.exports.SECTIONS = SECTIONS
