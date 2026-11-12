const cfg = require('./config')
const pick = a => a[Math.floor(Math.random() * a.length)]

function daysLeft() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let x = new Date(now.getFullYear(), 11, 25)
  if (today > x) x = new Date(now.getFullYear() + 1, 11, 25)
  return Math.round((x - today) / 86400000)
}

const countdown = () => {
  const d = daysLeft()
  return d === 0
    ? '🎄 ¡¡HOY ES NAVIDAD!! 🎅🎁'
    : `⏳ Faltan *${d}* día${d === 1 ? '' : 's'} para Navidad 🎅`
}

const FRASES = [
  'La Navidad no es un día, es un estado del corazón. ❤️',
  'Que la magia de la Navidad llene tu hogar de paz y alegría. ✨',
  'El mejor regalo es compartir con quienes amas. 🎁',
  'Que tu Navidad brille más que todas las luces del árbol. 🎄',
  'Un abrazo sincero vale más que cualquier regalo. 🤗',
  'Que esta Navidad nazca en ti la esperanza. 🌟',
  'Chocolate caliente, familia y risas: eso es Navidad. ☕'
]

const REGALOS = [
  '🎧 Unos audífonos', '📱 Un celular nuevo', '🧸 Un peluche gigante',
  '🎮 Una consola de videojuegos', '👟 Zapatillas nuevas',
  '🍫 Una caja de chocolates', '📚 Un libro',
  '🧦 Unas medias navideñas (clásico)', '💻 Una laptop',
  '🎁 ¡Una caja misteriosa!'
]

const GOKU = [
  '🐉 ¡Hola! Soy Goku. ¿Listo para entrenar y superar tus límites?',
  '🥋 ¡Qué bueno verte! Siempre hay un nuevo nivel por alcanzar.',
  '🔥 ¡El espíritu Saiyajin nunca se rinde! ¡Vamos a entrenar!',
  '⭐ ¡Un guerrero también sabe compartir! ¡Felices fiestas!'
]

const KIS = [
  '🔥 Tu ki está aumentando...',
  '⚡ ¡Poder de combate en ascenso!',
  '💥 ¡Has liberado todo tu ki! ¡KAMEHAMEHA!',
  '🌟 Tu energía está brillando como una estrella navideña.'
]

const TRANSFORMACIONES = [
  '🟡 *SUPER SAIYAJIN* — El primer despertar.',
  '🔴 *SUPER SAIYAJIN GOD* — El poder divino.',
  '🔵 *SUPER SAIYAJIN BLUE* — Poder y control.',
  '⚪ *ULTRA INSTINTO* — Movimiento sin pensar.',
  '🐉 *MODO GUERRERO Z NAVIDEÑO* — Poder, amistad y espíritu festivo.'
]

function arbol() {
  const adorno = ['🎄', '🎄', '🎄', '🎁', '🔴', '🟡', '✨']
  let t = '          ⭐\n'
  for (let i = 1; i <= 6; i++) {
    let row = ''
    for (let j = 0; j < i * 2 - 1; j++) row += pick(adorno)
    t += ' '.repeat((7 - i) * 2) + row + '\n'
  }
  return t + '          🟫🟫\n🎅 ¡Feliz Navidad, Guerrero Z! 🎅'
}

const menu = p => `╔════════════════════════════════╗
║   🐉 *GOKUBOT-MD • SAIYAN XMAS* 🎄
╚════════════════════════════════╝

       ❄️  ⭐  🎄  ⭐  ❄️
       *${cfg.botName}*
   🔥 PODER SAIYAJIN • ESPÍRITU NAVIDEÑO 🔥

╭━━━〔 🐉 *UNIVERSO GOKU* 〕━━━╮
┃ ⚡ ${p}goku → saludo Saiyajin
┃ 🔥 ${p}ki → libera tu energía
┃ 💥 ${p}transformacion → niveles Saiyajin
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🎅 *MODO NAVIDAD* 〕━━╮
┃ 🎄 ${p}navidad → cuenta regresiva
┃ ✨ ${p}frase → frase navideña
┃ 🎁 ${p}regalo → regalo sorpresa
┃ 🌲 ${p}arbol → árbol navideño
┃ 💌 ${p}felicitar <nombre>
┃ 🎲 ${p}sorteo → sorteo grupal
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎬 *YOUTUBE* 〕━━━╮
┃ 🔎 ${p}yts <texto> / ${p}play <texto>
┃ 🎵 ${p}ytmp3 <texto|link>
┃ 🎥 ${p}ytmp4 <texto|link>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🌐 *UTILIDADES* 〕━━━╮
┃ ${p}menuapi → comandos de YuiAPI
┃ ${p}ping → velocidad del bot
┃ ${p}owner → contacto del creador
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🎄❄️ *FELICES FIESTAS, GUERRERO Z* ❄️🎄
👑 ${cfg.creator}  •  🔰 Prefijo: ${p}`

const NAMES = new Set([
  'menu', 'help', 'menú', 'navidad', 'frase', 'regalo',
  'arbol', 'felicitar', 'sorteo', 'goku', 'ki', 'transformacion', 'transformación'
])

module.exports = async function (sock, m, jid, cmd, text, p) {
  if (cfg.navidad === false || !NAMES.has(cmd)) return false
  const reply = t => sock.sendMessage(jid, { text: t }, { quoted: m })

  switch (cmd) {
    case 'menu': case 'help': case 'menú':
      try {
        await sock.sendMessage(jid, {
          video: await menuVideo(),
          mimetype: 'video/mp4',
          gifPlayback: true,
          caption: menu(p)
        }, { quoted: m })
      } catch (e) {
        console.log('MENU ERR:', e.message)
        await reply(menu(p))
      }
      break
    case 'goku':
      await reply(`🐉 *¡HEY! SOY GOKU* 🐉\n\n${pick(GOKU)}\n\n🎄 ¡Que tengas una Navidad llena de energía!`)
      break
    case 'ki':
      await reply(`╭━━〔 🔥 *LECTURA DE KI* 〕━━╮\n┃ ${pick(KIS)}\n┃ ⚡ Nivel: ${Math.floor(50 + Math.random() * 950)}\n╰━━━━━━━━━━━━━━━━━━━━╯\n🐉 ¡Sigue entrenando, Saiyajin!`)
      break
    case 'transformacion': case 'transformación':
      await reply(`🐉 *TRANSFORMACIONES SAIYAJIN*\n\n${TRANSFORMACIONES.join('\n\n')}\n\n🎄 ¡Desbloquea tu mejor versión!`)
      break
    case 'navidad':
      await reply(`🎄❄️ *MODO NAVIDAD* ❄️🎄\n${countdown()}\n\n🐉 ¡Un verdadero guerrero también comparte alegría!\n\n${pick(FRASES)}`)
      break
    case 'frase':
      await reply(`🎅✨ ${pick(FRASES)}\n\n🐉 _Espíritu Saiyajin activado._`)
      break
    case 'regalo':
      await reply(`🎁 *¡REGALO SORPRESA!*\n\n${pick(REGALOS)}\n\n🐉 ¡Hasta Goku necesita descansar y celebrar! 🎄`)
      break
    case 'arbol':
      await reply(arbol())
      break
    case 'felicitar':
      if (!text) return (await reply(`Ejemplo: ${p}felicitar Yésica`), true)
      await reply(`🎄✨ *¡Feliz Navidad, ${text}!* ✨🎄\n\n${pick(FRASES)}\n\n🐉 ¡Que la fuerza y la alegría te acompañen!\n🎅 De parte de ${cfg.creator} y ${cfg.botName}`)
      break
    case 'sorteo': {
      if (!jid.endsWith('@g.us')) return (await reply('🎲 Este comando es solo para grupos.'), true)
      const meta = await sock.groupMetadata(jid)
      if (!meta.participants?.length) return (await reply('No hay participantes para el sorteo.'), true)
      const win = pick(meta.participants).id
      await sock.sendMessage(jid, {
        text: `🎁🎲 ¡Santa y Shenlong eligieron a @${win.split('@')[0]}! 🎅🐉🎄`,
        mentions: [win]
      }, { quoted: m })
      break
    }
  }
  return true
}

let _vid
async function menuVideo() {
  if (!_vid) {
    const r = await fetch(cfg.menuVideo, { signal: AbortSignal.timeout(60000) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    _vid = Buffer.from(await r.arrayBuffer())
  }
  return _vid
}
