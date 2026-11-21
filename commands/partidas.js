'use strict'
// Juegos multijugador: tres en raya, ahorcado, piedra-papel-tijera y combate 1 vs 1 con apuesta.
const T = require('../lib/theme')
const store = require('../lib/store')
const scenes3 = require('../lib/scenes3')
const visual = require('./visual')

const COMMANDS = new Set(['3enraya', 'ttt', 'tictactoe', 'jugar', 'ahorcado', 'letra', 'ppt', 'combate', 'aceptar', 'rechazar', 'rendirse'])
const CHALLENGE_MS = 90000, GAME_MS = 10 * 60000, MAX_BET = 500
const WIN_REWARD = 40, DAILY_REWARD_WINS = 5
const db = store.open('partidas.json', { days: {} })
const challenges = new Map() // chat -> { type, from, to, bet, expires }
const ttt = new Map()        // chat -> partida
const hang = new Map()       // chat -> partida
const WORDS = ['GUERRERO', 'PLANETA', 'ENERGIA', 'TORNEO', 'MAESTRO', 'DESIERTO', 'CAPSULA', 'GRAVEDAD', 'ENTRENAMIENTO', 'TRANSFORMACION', 'DRAGON', 'ESFERAS',
  'POTENCIA', 'MONTANA', 'NAVE', 'ARMADURA', 'RADAR', 'MISION', 'LEYENDA', 'COMBATE', 'VICTORIA', 'TESORO', 'CAMPEON', 'ESTRELLA', 'GALAXIA', 'NEBULOSA', 'AVENTURA', 'HEROE']
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

const digits = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')
const say = (sock, jid, m, kind, text, extra) => sock.sendMessage(jid, { text: T.msg(kind, text), ...extra }, { quoted: m })
const pick = list => list[Math.floor(Math.random() * list.length)]

// Identidad de quien escribe: todas las formas de su id (número, lid) para compararlas con menciones.
async function me(sock, m) {
  const who = await sock.getSender(m).catch(() => ({}))
  const id = m.key.participant || m.key.remoteJid
  return { id, name: m.pushName || digits(id), ids: [...new Set([who.id, who.number, id].map(digits).filter(Boolean))] }
}
const sameP = (p, ids) => p.ids.some(x => ids.includes(x))
function mentionOf(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo
  const raw = ctx?.mentionedJid?.[0] || ctx?.participant
  return raw ? { jid: raw, id: digits(raw) } : null
}

// Premio limitado por día para que no se pueda abusar jugando con cuentas propias.
async function reward(user, amount) {
  const day = store.today()
  const rec = db.data.days[day] ||= {}
  rec[user.id] = (rec[user.id] || 0)
  if (rec[user.id] >= DAILY_REWARD_WINS) return 0
  rec[user.id]++
  for (const d of Object.keys(db.data.days)) if (d !== day) delete db.data.days[d]
  await db.save()
  await require('./goku/rpg').adjustCoins(user.id, user.name, amount)
  return amount
}

function expire(map, chat, ms) {
  const g = map.get(chat)
  if (g && g.expires && g.expires < Date.now()) map.delete(chat)
}

async function sendBoard(sock, jid, m, g, caption, win) {
  await sock.sendMessage(jid, { image: scenes3.tttBoard(g.board, win).toPNG(), caption, mentions: g.players.map(p => p.id) }, { quoted: m })
  if (win || g.board.every(Boolean)) return
  const free = g.board.map((v, i) => (v ? null : i + 1)).filter(Boolean)
  await sock.sendMessage(jid, {
    text: `🎯 Turno de @${digits(g.players[g.turn].id)} (${g.turn === 0 ? '❌' : '⭕'})`, mentions: [g.players[g.turn].id],
    footer: 'Abre la cajita o escribe .jugar <número>',
    buttons: [{ text: '🎯 Elegir casilla', sections: [{ title: 'Casillas libres', rows: free.map(n => ({ title: `Casilla ${n}`, description: 'Toca para marcar', id: `.jugar ${n}` })) }] }]
  }, { quoted: m }).catch(() => {})
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const isGroup = jid.endsWith('@g.us')
  const player = await me(sock, m)
  expire(challenges, jid); expire(ttt, jid); expire(hang, jid)

  // ───────── Retos: tres en raya y combate ─────────
  if (['3enraya', 'ttt', 'tictactoe', 'combate'].includes(cmd)) {
    if (!isGroup) { await say(sock, jid, m, 'info', 'Este juego es para dos personas dentro de un grupo.'); return true }
    const target = mentionOf(m)
    if (!target) { await say(sock, jid, m, 'info', `Menciona a tu rival.\nEjemplo: ${prefix}${cmd === 'combate' ? 'combate @usuario 100' : '3enraya @usuario'}`); return true }
    if (player.ids.includes(target.id)) { await say(sock, jid, m, 'warn', 'No puedes retarte a ti mismo.'); return true }
    if (challenges.has(jid) || ttt.has(jid)) { await say(sock, jid, m, 'wait', 'Ya hay un reto o una partida en curso en este chat.'); return true }
    const isCombat = cmd === 'combate'
    const bet = isCombat ? Math.max(0, Math.min(MAX_BET, Number((text.match(/(?:^|\s)(\d{1,4})(?:\s|$)/) || [])[1]) || 0)) : 0
    challenges.set(jid, { type: isCombat ? 'combate' : 'ttt', from: player, to: target, bet, expires: Date.now() + CHALLENGE_MS })
    await sock.sendMessage(jid, {
      text: T.msg('info', `${isCombat ? '⚔️ *COMBATE 1 VS 1*' : '❌⭕ *TRES EN RAYA*'}\n\n@${digits(player.id)} reta a @${target.id}${bet ? `\n💰 Apuesta: ${bet} Zenis cada uno` : ''}\n\n⏳ Tiene 90 segundos para aceptar.`),
      mentions: [player.id, target.jid],
      footer: 'Solo el retado puede responder',
      buttons: [{ id: `${prefix}aceptar`, text: '✅ Aceptar' }, { id: `${prefix}rechazar`, text: '❌ Rechazar' }]
    }, { quoted: m })
    return true
  }

  if (cmd === 'rechazar') {
    const c = challenges.get(jid)
    if (c && sameP(player, [c.to.id])) { challenges.delete(jid); await say(sock, jid, m, 'info', 'Reto rechazado.') }
    return true
  }

  if (cmd === 'aceptar') {
    const c = challenges.get(jid)
    if (!c) { await say(sock, jid, m, 'info', 'No hay ningún reto pendiente.'); return true }
    if (!sameP(player, [c.to.id])) { await say(sock, jid, m, 'warn', 'Este reto no es para ti.'); return true }
    challenges.delete(jid)
    const rpg = require('./goku/rpg')
    const a = c.from, b = { ...player, jid: m.key.participant }
    if (c.type === 'ttt') {
      const first = Math.random() < 0.5
      const g = { board: Array(9).fill(null), players: first ? [a, b] : [b, a], turn: 0, expires: Date.now() + GAME_MS }
      ttt.set(jid, g)
      await sendBoard(sock, jid, m, g, `❌⭕ *TRES EN RAYA*\n❌ @${digits(g.players[0].id)}  vs  ⭕ @${digits(g.players[1].id)}`)
      return true
    }
    // Combate con apuesta
    const sa = rpg.statsFor(a.id, a.name), sb = rpg.statsFor(b.id, b.name)
    if (c.bet && (sa.coins < c.bet || sb.coins < c.bet)) { await say(sock, jid, m, 'warn', `Alguno de los dos no tiene ${c.bet} Zenis para la apuesta. Combate cancelado.`); return true }
    const score = s => Math.pow(Math.max(1, s.power), 1.15) * (0.7 + Math.random() * 0.6)
    const winA = score(sa) >= score(sb)
    const [win, lose, sw] = winA ? [a, b, sa] : [b, a, sb]
    if (c.bet) { await rpg.adjustCoins(lose.id, lose.name, -c.bet); await rpg.adjustCoins(win.id, win.name, c.bet) }
    await rpg.admin.xp(win.id, 30)
    const caption = `⚔️ *COMBATE 1 VS 1*\n\n🥊 ${sa.name}: ${Math.floor(sa.power).toLocaleString('es-PE')}\n🥊 ${sb.name}: ${Math.floor(sb.power).toLocaleString('es-PE')}\n\n🏆 ¡Ganó @${digits(win.id)}!${c.bet ? `\n💰 Se lleva ${c.bet} Zenis` : ''}\n⭐ +30 XP`
    const mentions = [a.id, b.id]
    const animated = await visual.sendDuel(sock, jid, m, { a: { name: sa.name, power: sa.power, hue: 200 }, b: { name: sb.name, power: sb.power, hue: 20 }, winner: winA ? 0 : 1 }, caption, mentions)
    if (!animated) await sock.sendMessage(jid, { text: caption, mentions }, { quoted: m })
    return true
  }

  // ───────── Jugadas del tres en raya ─────────
  if (cmd === 'jugar' || cmd === 'rendirse') {
    const g = ttt.get(jid)
    if (!g) { await say(sock, jid, m, 'info', `No hay partida de tres en raya. Reta a alguien con ${prefix}3enraya @usuario.`); return true }
    const idx = g.players.findIndex(p => sameP(player, [digits(p.id), ...(p.ids || [])]))
    if (idx < 0) { await say(sock, jid, m, 'warn', 'Solo los jugadores de la partida pueden jugar.'); return true }
    if (cmd === 'rendirse') {
      ttt.delete(jid)
      const win = g.players[1 - idx]
      await sock.sendMessage(jid, { text: T.msg('info', `🏳️ @${digits(g.players[idx].id)} se rindió. ¡Gana @${digits(win.id)}!`), mentions: g.players.map(p => p.id) }, { quoted: m })
      return true
    }
    if (idx !== g.turn) { await say(sock, jid, m, 'wait', 'Todavía no es tu turno.'); return true }
    const n = Number(text.trim())
    if (!Number.isInteger(n) || n < 1 || n > 9 || g.board[n - 1]) { await say(sock, jid, m, 'warn', 'Elige una casilla libre del 1 al 9.'); return true }
    g.board[n - 1] = idx === 0 ? 'X' : 'O'
    g.expires = Date.now() + GAME_MS
    const line = LINES.find(l => l.every(i => g.board[i] === g.board[l[0]] && g.board[i]))
    if (line) {
      ttt.delete(jid)
      const win = g.players[idx]
      const got = await reward(win, WIN_REWARD)
      await sendBoard(sock, jid, m, g, `🏆 ¡@${digits(win.id)} ganó el tres en raya!${got ? `\n💰 +${got} Zenis` : ''}`, line)
    } else if (g.board.every(Boolean)) {
      ttt.delete(jid)
      await sendBoard(sock, jid, m, g, '🤝 ¡Empate! Nadie gana esta vez.')
    } else {
      g.turn = 1 - g.turn
      await sendBoard(sock, jid, m, g, `❌ @${digits(g.players[0].id)}  vs  ⭕ @${digits(g.players[1].id)}`)
    }
    return true
  }

  // ───────── Piedra, papel o tijera contra el bot ─────────
  if (cmd === 'ppt') {
    const choice = { piedra: '🪨', papel: '📄', tijera: '✂️' }
    const mine = text.trim().toLowerCase()
    if (!choice[mine]) {
      await sock.sendMessage(jid, { text: T.msg('info', '🪨📄✂️ *PIEDRA, PAPEL O TIJERA*\nElige tu jugada contra el bot:'), footer: 'Toca un botón', buttons: Object.entries(choice).map(([k, e]) => ({ id: `${prefix}ppt ${k}`, text: `${e} ${k[0].toUpperCase()}${k.slice(1)}` })) }, { quoted: m })
      return true
    }
    const bot = pick(Object.keys(choice))
    const beats = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' }
    const result = mine === bot ? 'draw' : beats[mine] === bot ? 'win' : 'lose'
    const got = result === 'win' ? await reward(player, 15) : 0
    await sock.sendMessage(jid, {
      text: T.msg(result === 'win' ? 'ok' : 'info', `${choice[mine]} vs ${choice[bot]}\n\n${result === 'win' ? `🏆 ¡Ganaste!${got ? ` +${got} Zenis` : ''}` : result === 'lose' ? '💥 Perdiste esta vez.' : '🤝 Empate.'}`),
      footer: '¿Revancha?', buttons: [{ id: `${prefix}ppt`, text: '🔁 Jugar otra vez' }]
    }, { quoted: m })
    return true
  }

  // ───────── Ahorcado ─────────
  if (cmd === 'ahorcado') {
    if (hang.has(jid)) { await say(sock, jid, m, 'wait', `Ya hay un ahorcado en curso. Adivina con ${prefix}letra <letra>.`); return true }
    const g = { word: pick(WORDS), used: [], wrong: 0, expires: Date.now() + GAME_MS }
    hang.set(jid, g)
    await sock.sendMessage(jid, { image: scenes3.hangman(0, g.word.replace(/./g, '_'), []).toPNG(), caption: `🔤 *AHORCADO* — ${g.word.length} letras\nAdivina con ${prefix}letra <letra> o arriesga la palabra completa.` }, { quoted: m })
    return true
  }

  if (cmd === 'letra') {
    const g = hang.get(jid)
    if (!g) { await say(sock, jid, m, 'info', `No hay ahorcado en curso. Empieza uno con ${prefix}ahorcado.`); return true }
    const guess = text.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (!/^[A-Z]+$/.test(guess)) { await say(sock, jid, m, 'info', `Uso: ${prefix}letra a`); return true }
    let finished = null
    if (guess.length > 1) {
      if (guess === g.word) finished = 'win'; else { g.wrong++; if (g.wrong >= 6) finished = 'lose' }
    } else if (g.used.includes(guess)) { await say(sock, jid, m, 'warn', 'Esa letra ya se usó.'); return true }
    else {
      g.used.push(guess)
      if (!g.word.includes(guess)) { g.wrong++; if (g.wrong >= 6) finished = 'lose' }
      else if ([...g.word].every(ch => g.used.includes(ch))) finished = 'win'
    }
    const shown = finished === 'lose' || finished === 'win' ? g.word : [...g.word].map(ch => (g.used.includes(ch) ? ch : '_')).join('')
    if (finished) hang.delete(jid)
    const got = finished === 'win' ? await reward(player, WIN_REWARD) : 0
    await sock.sendMessage(jid, {
      image: scenes3.hangman(g.wrong, shown, g.used).toPNG(),
      caption: finished === 'win' ? `🏆 ¡@${digits(player.id)} adivinó *${g.word}*!${got ? `\n💰 +${got} Zenis` : ''}` : finished === 'lose' ? `💀 Perdieron. La palabra era *${g.word}*.` : `🔤 Quedan ${6 - g.wrong} intentos.`,
      mentions: [player.id]
    }, { quoted: m })
    return true
  }
  return true
}

module.exports = handler
