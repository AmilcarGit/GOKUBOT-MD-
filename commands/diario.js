'use strict'
// Recompensa diaria con racha: más días seguidos = más Zenis; el día 7 regala una esfera del dragón.
const T = require('../lib/theme')
const store = require('../lib/store')
const scenes = require('../lib/scenes2')
const video = require('../lib/video')
const visual = require('./visual')

const COMMANDS = new Set(['diario', 'racha'])
const db = store.open('diario.json', {})
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })
const idOf = m => m.key.participant || m.key.remoteJid
const dayIn = streak => ((streak - 1) % 7) + 1
const rewardFor = streak => 100 + 50 * dayIn(streak) * (dayIn(streak) === 7 ? 2 : 1)

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const rpg = require('./goku/rpg')
  const id = idOf(m), name = m.pushName || id.split('@')[0]
  const rec = db.data[id] ||= { last: '', streak: 0, best: 0 }
  const today = store.today()
  const claimed = rec.last === today
  // Si faltó un día, la racha se rompe (solo se aplica al reclamar o consultar).
  const alive = rec.last === today || rec.last === store.today(-1)
  const current = alive ? rec.streak : 0

  if (cmd === 'racha') {
    const next = claimed ? current + 1 : current + 1
    await sock.sendMessage(jid, {
      text: `🔥 *TU RACHA*\n\nDías seguidos: *${current}*\nMejor racha: *${Math.max(rec.best, current)}*\nPróxima recompensa: *${rewardFor(next)} Zenis*${dayIn(next) === 7 ? ' + 🐉 esfera del dragón' : ''}\n\n${claimed ? '✅ Hoy ya reclamaste. ¡Vuelve mañana!' : '🎁 ¡Aún puedes reclamar hoy!'}`,
      footer: 'Cada día seguido paga más',
      buttons: [{ id: `${prefix}diario`, text: '🎁 Reclamar' }, { id: `${prefix}misiones`, text: '📜 Misiones' }, { id: `${prefix}mascota`, text: '🐾 Mascota' }]
    }, { quoted: m })
    return true
  }

  if (claimed) { await say(sock, jid, m, 'wait', `Ya reclamaste hoy (racha de ${rec.streak} días). Vuelve mañana.`); return true }
  rec.streak = current + 1
  rec.best = Math.max(rec.best, rec.streak)
  rec.last = today
  const pet = require('./mascota').bonus(id)
  const base = rewardFor(rec.streak)
  const reward = Math.round(base * (1 + pet / 100))
  await rpg.adjustCoins(id, name, reward)
  let extra = ''
  if (dayIn(rec.streak) === 7) {
    const owned = rpg.statsFor(id, name).balls
    const missing = [1, 2, 3, 4, 5, 6, 7].filter(n => !owned.includes(n))
    if (missing.length) { const n = missing[Math.floor(Math.random() * missing.length)]; await rpg.admin.ball(id, n); extra = `\n🐉 ¡Bonus de semana completa: esfera de ${n} estrella${n > 1 ? 's' : ''}!` }
    else { await rpg.admin.xp(id, 150); extra = '\n⭐ ¡Bonus de semana completa: +150 XP!' }
  }
  await db.save()
  const cap = `🎁 *RECOMPENSA DIARIA*\n\n🔥 Racha: *${rec.streak}* día${rec.streak > 1 ? 's' : ''}\n💰 +${reward} Zenis${pet ? ` (incluye +${pet}% de tu mascota)` : ''}${extra}`
  const info = { streak: rec.streak, day: dayIn(rec.streak), reward, name }
  try {
    await video.exclusive(() => visual.sendClip(sock, jid, m, { draw: (c, t) => scenes.streak(c, t, info), count: 36, caption: cap, stillAt: 0.4 }))
  } catch (error) {
    if (error.code !== 'BUSY') console.error('[diario]', error.message)
    await say(sock, jid, m, 'ok', cap)
  }
  await sock.sendMessage(jid, { text: '¿Qué sigue?', footer: 'Toca un botón', buttons: [{ id: `${prefix}misiones`, text: '📜 Misiones' }, { id: `${prefix}trivia`, text: '🧠 Trivia' }, { id: `${prefix}mascota`, text: '🐾 Mascota' }] }, { quoted: m }).catch(() => {})
  return true
}

module.exports = handler
