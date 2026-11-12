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
  return d === 0 ? '🎄 ¡¡HOY ES NAVIDAD!! 🎅🎁' : `⏳ Faltan *${d}* día${d === 1 ? '' : 's'} para Navidad 🎅`
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
  '🎧 Unos audífonos', '📱 Un celular nuevo', '🧸 Un peluche gigante', '🎮 Una consola de videojuegos',
  '👟 Zapatillas nuevas', '🍫 Una caja de chocolates', '📚 Un libro', '🧦 Unas medias navideñas (clásico)',
  '💻 Una laptop', '🎁 ¡Una caja misteriosa!'
]

function arbol() {
  const adorno = ['🎄', '🎄', '🎄', '🎁', '🔴', '🟡', '✨']
  let t = '        ⭐\n'
  for (let i = 1; i <= 6; i++) {
    let row = ''
    for (let j = 0; j < i * 2 - 1; j++) row += pick(adorno)
    t += ' '.repeat((7 - i) * 2) + row + '\n'
  }
  return t + '          🟫🟫\n🎅 ¡Feliz Navidad! 🎅'
}

const menu = p => `❄️🎄❄️🎄❄️🎄❄️🎄❄️🎄❄️
🎅 *${cfg.botName}* 🎅
❄️🎄❄️🎄❄️🎄❄️🎄❄️🎄❄️
${countdown()}

🎁 Creador: ${cfg.creator}
📞 Owner: ${cfg.owner ? 'wa.me/' + cfg.owner : 'No configurado'}
🔰 Prefijo: ${p}

╭─〔 🎄 *NAVIDAD* 〕
│ 🎅 ${p}navidad → cuenta regresiva
│ ✨ ${p}frase → frase navideña
│ 🎁 ${p}regalo → tu regalo sorpresa
│ 🌲 ${p}arbol → árbol de Navidad
│ 💌 ${p}felicitar <nombre>
│ 🎲 ${p}sorteo → elige a alguien (grupos)
╰────────────

╭─〔 ⛄ *YOUTUBE* 〕
│ 🔎 ${p}yts <texto> → botones
│ 🎵 ${p}ytmp3 <texto|link>
│ 🎬 ${p}ytmp4 <texto|link>
╰────────────

╭─〔 ❄️ *MÁS* 〕
│ 🌐 ${p}menuapi → comandos API
│ 🏓 ${p}ping   👑 ${p}owner
╰────────────
🎅 _${cfg.botName} • by ${cfg.creator}_ 🎄`

const NAMES = new Set(['menu', 'help', 'menú', 'navidad', 'frase', 'regalo', 'arbol', 'felicitar', 'sorteo'])

module.exports = async function (sock, m, jid, cmd, text, p) {
  if (cfg.navidad === false || !NAMES.has(cmd)) return false
  const reply = t => sock.sendMessage(jid, { text: t }, { quoted: m })
  switch (cmd) {
    case 'menu': case 'help': case 'menú':
      try {
        await sock.sendMessage(jid, { video: await menuVideo(), mimetype: 'video/mp4', gifPlayback: true, caption: menu(p) }, { quoted: m })
      } catch (e) { console.log('MENU ERR:', e.message); await reply(menu(p)) }
      break
    case 'navidad':
      await reply(`🎄❄️ ${countdown()}\n\n${pick(FRASES)}`)
      break
    case 'frase':
      await reply(`🎅 ${pick(FRASES)}`)
      break
    case 'regalo':
      await reply(`🎁 Santa te trae...\n\n${pick(REGALOS)}\n\n🎄 ¡Feliz Navidad!`)
      break
    case 'arbol':
      await reply(arbol())
      break
    case 'felicitar':
      if (!text) return (await reply(`Ejemplo: ${p}felicitar Yesica`), true)
      await reply(`🎄✨ *¡Feliz Navidad, ${text}!* ✨🎄\n\n${pick(FRASES)}\n\n🎅 De parte de ${cfg.creator} y ${cfg.botName} 🎁`)
      break
    case 'sorteo': {
      if (!jid.endsWith('@g.us')) return (await reply('🎲 Este comando es solo para grupos.'), true)
      const meta = await sock.groupMetadata(jid)
      const win = pick(meta.participants).id
      await sock.sendMessage(jid, { text: `🎁🎲 ¡Santa eligió a @${win.split('@')[0]}! 🎅🎄`, mentions: [win] }, { quoted: m })
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
