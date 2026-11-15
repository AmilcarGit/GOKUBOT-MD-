'use strict'
// Juegos con Zenis del RPG: tragamonedas de esferas y ruleta del dragón.
const T = require('../lib/theme')
const scenes = require('../lib/scenes')
const video = require('../lib/video')

const COMMANDS = new Set(['slot', 'tragamonedas', 'ruleta', 'regalar', 'ricos'])
const MIN_BET = 10, MAX_BET = 5000, COOLDOWN = 8000
const last = new Map()
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

function parseBet(raw, coins) {
  if (/^(todo|all)$/i.test(raw)) return Math.min(coins, MAX_BET)
  const n = Math.floor(Number(String(raw).replace(/[.,_]/g, '')))
  return Number.isFinite(n) ? n : NaN
}

// 3 iguales paga x10 (x25 con la esfera de 7 estrellas), 2 iguales paga x2.
function spinSlot() {
  const reels = [0, 1, 2].map(() => 1 + Math.floor(Math.random() * 7))
  const [a, b, c] = reels
  const mult = a === b && b === c ? (a === 7 ? 25 : 10) : (a === b || b === c || a === c ? 2 : 0)
  return { reels, mult }
}

function spinWheel() {
  const index = Math.floor(Math.random() * scenes.WHEEL.length)
  return { index, color: scenes.WHEEL[index] }
}

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const rpg = require('./goku/rpg')
  const { sendClip } = require('./visual')
  const id = m.key.participant || m.key.remoteJid
  const name = m.pushName || id.split('@')[0]

  if (cmd === 'ricos') {
    const rows = rpg.richest(10)
    if (!rows.length) { await say(sock, jid, m, 'info', 'Todavía no hay jugadores.'); return true }
    const png = scenes.ranking(rows, { title: 'LOS MAS RICOS', subtitle: 'ZENIS ACUMULADOS', tag: p => `NV.${p.level}` }).toPNG()
    await sock.sendMessage(jid, { image: png, caption: '💰 Los guerreros con más Zenis' }, { quoted: m })
    return true
  }

  if (cmd === 'regalar') {
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const target = ctx?.mentionedJid?.[0] || ctx?.participant
    const amount = Math.floor(Number(text.replace(/@\d+/g, ' ').trim().split(/\s+/).find(x => /^\d+$/.test(x))))
    if (!target || !(amount >= 10)) { await say(sock, jid, m, 'info', `Uso: ${prefix}regalar @usuario <zenis> (mínimo 10, comisión del 5%)\nTambién puedes responder a su mensaje con ${prefix}regalar <zenis>.`); return true }
    const r = await rpg.transfer(id, target, target.split('@')[0], amount)
    if (typeof r === 'string') { await say(sock, jid, m, 'warn', r); return true }
    await sock.sendMessage(jid, { text: T.msg('ok', `Enviaste ${r.sent} Zenis a @${target.split('@')[0]} (recibe ${r.received}, comisión ${r.fee}).\n💰 Tu saldo: ${r.balance}`), mentions: [target] }, { quoted: m })
    return true
  }
  const isRoulette = cmd === 'ruleta'
  const args = text.trim().split(/\s+/).filter(Boolean)

  const usage = isRoulette
    ? `🎡 Uso: ${prefix}ruleta <apuesta> <rojo|negro|verde>\nRojo/negro pagan x2 y verde x12. Ej: ${prefix}ruleta 100 rojo`
    : `🎰 Uso: ${prefix}slot <apuesta>\n2 esferas iguales pagan x2, 3 iguales x10 y tres de 7 estrellas x25.\nEj: ${prefix}slot 100 o ${prefix}slot todo`
  if (!args.length) { await say(sock, jid, m, 'info', usage); return true }

  const st = rpg.statsFor(id, name)
  const bet = parseBet(args[0], st.coins)
  const pick = isRoulette ? (args[1] || '').toLowerCase() : null
  if (!Number.isFinite(bet) || bet < MIN_BET) { await say(sock, jid, m, 'warn', `La apuesta mínima es ${MIN_BET} Zenis.\n${usage}`); return true }
  if (bet > MAX_BET) { await say(sock, jid, m, 'warn', `La apuesta máxima es ${MAX_BET} Zenis.`); return true }
  if (isRoulette && !['rojo', 'negro', 'verde'].includes(pick)) { await say(sock, jid, m, 'warn', usage); return true }
  if (bet > st.coins) { await say(sock, jid, m, 'warn', `No te alcanzan los Zenis. Tienes ${st.coins}. Entrena con ${prefix}entrenar para ganar más.`); return true }

  const wait = COOLDOWN - (Date.now() - (last.get(id) || 0))
  if (wait > 0) { await say(sock, jid, m, 'wait', `Espera ${Math.ceil(wait / 1000)}s para volver a jugar.`); return true }

  try {
    await video.exclusive(async () => {
      last.set(id, Date.now())
      let info, mult, label
      if (isRoulette) {
        const w = spinWheel()
        mult = w.color !== pick ? 0 : (w.color === 'verde' ? 12 : 2)
        info = { index: w.index, color: w.color, pick, bet }
        label = `🎡 Cayó *${w.color.toUpperCase()}*`
      } else {
        const s = spinSlot()
        mult = s.mult
        info = { reels: s.reels, bet }
        label = `🎰 ${s.reels.map(n => `${n}⭐`).join(' | ')}`
      }
      info.net = bet * mult - bet
      const balance = await rpg.adjustCoins(id, name, info.net)
      const caption = `${label}\n${info.net > 0 ? `🏆 ¡Ganaste ${info.net} Zenis!` : `💸 Perdiste ${bet} Zenis.`}\n💰 Saldo: ${balance}`
      await sendClip(sock, jid, m, {
        draw: (c, t) => (isRoulette ? scenes.roulette(c, t, info) : scenes.slot(c, t, info)),
        count: 40, caption, stillAt: 0.99
      }).catch(async error => {
        console.error('[juegos]', error.message)
        await sock.sendMessage(jid, { text: caption }, { quoted: m })
      })
    })
  } catch (error) {
    const busy = error.code === 'BUSY'
    if (!busy) console.error('[juegos]', error.message)
    await say(sock, jid, m, busy ? 'wait' : 'err', busy ? 'Hay otra animación en curso, intenta en unos segundos.' : 'No pude completar el juego, no se descontó nada.')
  }
  return true
}
