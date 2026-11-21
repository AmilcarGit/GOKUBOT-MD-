'use strict'
// Funciones interactivas de Yui-Bails: trivia con botones, menú con submenús, encuestas y recordatorios.
const T = require('../lib/theme')

const COMMANDS = new Set(['trivia', 'menui', 'encuesta', 'recordar'])
const REWARD = 80, DAILY_CAP = 10, TRIVIA_COOLDOWN = 12000
const lastTrivia = new Map()
const daily = new Map() // id -> { day, n }

const QUESTIONS = [
  ['¿Quién es el creador de Dragon Ball?', 'Akira Toriyama', ['Eiichiro Oda', 'Masashi Kishimoto']],
  ['¿Cuántas esferas del dragón hay?', '7', ['5', '9']],
  ['¿Cómo se llama el dragón que concede deseos?', 'Shenlong', ['Ryujin', 'Orochi']],
  ['¿De qué planeta es originario Goku?', 'Planeta Vegeta', ['Namekusei', 'La Tierra']],
  ['¿Cuál es el nombre saiyajin de Goku?', 'Kakarotto', ['Raditz', 'Bardock']],
  ['¿Cómo se llama el hijo mayor de Goku?', 'Gohan', ['Goten', 'Trunks']],
  ['¿Quién entrenó a Goku en la Casa Kame?', 'Maestro Roshi', ['Piccolo', 'Kaito']],
  ['¿Cómo se llama el príncipe de los saiyajin?', 'Vegeta', ['Nappa', 'Broly']],
  ['¿De qué planeta es Piccolo?', 'Namekusei', ['Vegeta', 'Yardrat']],
  ['¿De qué color se vuelve el cabello en Super Saiyajin?', 'Dorado', ['Plateado', 'Rojo']],
  ['¿Qué semilla recupera toda la energía al instante?', 'Semilla del ermitaño', ['Semilla solar', 'Semilla lunar']],
  ['¿Quién destruyó el planeta Vegeta?', 'Freezer', ['Cell', 'Majin Boo']],
  ['¿Cómo se llama el primer saiyajin que llega a la Tierra?', 'Raditz', ['Nappa', 'Turles']],
  ['¿Cómo se llama el hijo de Vegeta y Bulma?', 'Trunks', ['Goten', 'Gohan']],
  ['¿Qué amigo calvo de Goku es famoso por el Kienzan?', 'Krillin', ['Yamcha', 'Tien']],
  ['¿Quién creó a los androides 19 y 20?', 'Dr. Gero', ['Dr. Brief', 'Kami']],
  ['¿Cómo se llama la hija de Gohan y Videl?', 'Pan', ['Bra', 'Chi-Chi']],
  ['¿Cómo se llama el torneo de artes marciales más famoso de la serie?', 'Tenkaichi Budokai', ['Torneo del Poder', 'Copa Kame']]
]

const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1])
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

// Agrupa las categorías del menú en 3 submenús (WhatsApp limita las listas a ~10 filas).
const GROUPS = [
  ['🎮 Juegos y RPG', ['Universo Goku', 'Saiyajin RPG', 'Personajes', 'Guerreros originales', 'Juegos Z', 'Interactivo', 'Diario y mascota', 'Torneo']],
  ['🛠️ Herramientas', ['YouTube', 'Descargas', 'Subbots', 'Imagen y audio', 'Imagen y animación', 'IA Goku', 'WhatsApp', 'Utilidades']]
]

function menuItems(prefix) {
  const cats = require('./menu').CATEGORIES(prefix)
  const used = new Set()
  const toItem = ([name, cmds]) => ({ title: name.slice(0, 24), text: `*${name}*\n\n${cmds.join('\n')}` })
  const groups = GROUPS.map(([title, names]) => {
    const items = cats.filter(([n]) => names.includes(n)).map(c => { used.add(c[0]); return toItem(c) })
    return { title, items }
  })
  groups.push({ title: '👑 Grupos y dueño', items: cats.filter(([n]) => !used.has(n)).map(toItem) })
  return groups.filter(g => g.items.length)
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const id = m.key.participant || m.key.remoteJid

  if (cmd === 'menui') {
    await sock.menu(m, { title: 'Menú de GokuBot', text: 'Elige una categoría para ver sus comandos:', items: menuItems(prefix) })
    return true
  }

  if (cmd === 'encuesta') {
    const [question, ...options] = text.split('|').map(x => x.trim()).filter(Boolean)
    if (!question || options.length < 2 || options.length > 12) {
      await say(sock, jid, m, 'info', `Uso: ${prefix}encuesta pregunta | opción 1 | opción 2 ...\n(de 2 a 12 opciones)`)
      return true
    }
    await sock.sendPoll(jid, question.slice(0, 200), options.map(o => o.slice(0, 80)))
    return true
  }

  if (cmd === 'recordar') {
    const match = text.trim().match(/^(\d+)\s*(s|m|h|d)\b\s*(.*)$/is)
    const memo = match && match[3].trim()
    if (!match || !memo) {
      await say(sock, jid, m, 'info', `Uso: ${prefix}recordar <tiempo> <texto>\nEj: ${prefix}recordar 30m sacar la pizza\nTiempo: 30s, 15m, 2h o 1d (máximo 7 días).`)
      return true
    }
    const ms = Number(match[1]) * { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[match[2].toLowerCase()]
    if (ms < 30e3 || ms > 7 * 864e5) { await say(sock, jid, m, 'warn', 'El tiempo debe estar entre 30 segundos y 7 días.'); return true }
    const mine = sock.schedule.list().filter(job => job.content?.mentions?.includes(id)).length
    if (mine >= 5) { await say(sock, jid, m, 'warn', 'Ya tienes 5 recordatorios pendientes. Espera a que salga alguno.'); return true }
    sock.schedule.after(ms, jid, { text: `⏰ *Recordatorio* para @${id.split('@')[0].split(':')[0]}:\n${memo.slice(0, 300)}`, mentions: [id] })
    await say(sock, jid, m, 'ok', `Listo, te lo recordaré en ${match[1]}${match[2].toLowerCase()}. (Solo sale si el bot está conectado en ese momento.)`)
    return true
  }

  // trivia
  const wait = TRIVIA_COOLDOWN - (Date.now() - (lastTrivia.get(id) || 0))
  if (wait > 0) { await say(sock, jid, m, 'wait', `Espera ${Math.ceil(wait / 1000)}s para otra pregunta.`); return true }
  lastTrivia.set(id, Date.now())
  const [question, right, wrong] = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
  const options = shuffle([right, ...wrong])
  await sock.sendGuardedButtons(m, {
    text: `🧠 *TRIVIA DRAGON BALL*\n\n${question}`,
    footer: `Acierta y gana ${REWARD} Zenis`,
    buttons: options.map((option, i) => ({ id: `t${i}`, text: option })),
    who: 'sender', once: true
  }, async ({ msg, id: tapped }) => {
    const choice = options[Number(tapped.slice(1))]
    if (choice !== right) { await sock.reply(msg, T.msg('err', `Incorrecto. La respuesta era *${right}*.`)); return }
    const day = new Date().toISOString().slice(0, 10)
    const rec = daily.get(id)?.day === day ? daily.get(id) : { day, n: 0 }
    daily.set(id, rec)
    if (rec.n >= DAILY_CAP) { await sock.reply(msg, T.msg('ok', '¡Correcto! Ya llegaste al límite de premios de hoy, vuelve mañana.')); return }
    rec.n++
    const balance = await require('./goku/rpg').adjustCoins(id, m.pushName || id.split('@')[0], REWARD)
    await sock.reply(msg, T.msg('ok', `¡Correcto! +${REWARD} Zenis. 💰 Saldo: ${balance}`))
  })
  return true
}

module.exports = handler
