'use strict'
// Mascota original: se adopta, se alimenta, evoluciona y se le compran fondos (skins). Todo con animación.
const T = require('../lib/theme')
const store = require('../lib/store')
const scenes = require('../lib/scenes2')
const video = require('../lib/video')
const { Canvas } = require('../lib/canvas')
const visual = require('./visual')

const COMMANDS = new Set(['mascota', 'adoptar', 'alimentar', 'acariciar', 'skins', 'skin', 'nombrarmascota'])
const ADOPT_COST = 300, FEED_COST = 40, FEED_CD = 2 * 3600e3, PLAY_CD = 3600e3
const db = store.open('mascotas.json', {})
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })
const idOf = m => m.key.participant || m.key.remoteJid
const need = level => 60 * level
const moodOf = p => Math.max(0, Math.min(1, 1 - (Date.now() - (p.fedAt || 0)) / (24 * 3600e3)))
const bar = v => '▰'.repeat(Math.round(v * 10)) + '▱'.repeat(10 - Math.round(v * 10))

function addXp(p, amount) {
  const before = scenes.stageFor(p.level)
  p.xp += amount
  while (p.xp >= need(p.level)) { p.xp -= need(p.level); p.level++ }
  return scenes.stageFor(p.level) > before
}

// % extra de Zenis en el .diario (2% por nivel, máx 20%, solo si no tiene hambre).
function bonus(id) {
  const p = db.data[id]
  return p && moodOf(p) > 0.3 ? Math.min(20, p.level * 2) : 0
}

const info = p => ({ species: p.species, skin: p.skin, level: p.level, name: p.name, egg: p.level < 2 && p.xp < 20, mood: moodOf(p) })
const caption = p => {
  const sp = scenes.SPECIES[p.species].label
  return `🐾 *${p.name}* (${sp}) — Nv.${p.level}\n❤️ Ánimo: ${bar(moodOf(p))}\n✨ XP: ${p.xp}/${need(p.level)}\n🎁 Bonus en .diario: +${bonus(p.owner)}%`
}

async function show(sock, jid, m, p, text, buttons) {
  const draw = (c, t) => scenes.pet(c, t, info(p))
  try {
    await video.exclusive(() => visual.sendClip(sock, jid, m, { draw, count: 36, caption: text, stillAt: 0.2 }))
  } catch (error) {
    if (error.code !== 'BUSY') console.error('[mascota]', error.message)
    await say(sock, jid, m, 'info', text)
  }
  if (buttons) await sock.sendMessage(jid, { text: '¿Qué hacemos ahora?', footer: 'Toca un botón', buttons }, { quoted: m }).catch(() => {})
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const id = idOf(m)
  const pushName = m.pushName || id.split('@')[0]
  const rpg = require('./goku/rpg')
  let p = db.data[id]

  if (cmd === 'adoptar') {
    if (p) { await say(sock, jid, m, 'info', `Ya tienes a *${p.name}*. Usa ${prefix}mascota para verla.`); return true }
    const species = String(text || '').trim().toLowerCase()
    if (!scenes.SPECIES[species]) {
      await sock.sendMessage(jid, {
        text: `🥚 *ADOPCIÓN DE MASCOTAS*\n\nCuesta ${ADOPT_COST} Zenis. Elige tu especie:\n• Draki (dragoncito)\n• Kori (zorrito de hielo)\n• Nimbo (nube con orejas)`,
        footer: 'Toca para adoptar',
        buttons: Object.keys(scenes.SPECIES).map(s => ({ id: `${prefix}adoptar ${s}`, text: `🥚 ${scenes.SPECIES[s].label}` }))
      }, { quoted: m })
      return true
    }
    const left = await rpg.adjustCoins(id, pushName, -ADOPT_COST)
    if (left === null) { await say(sock, jid, m, 'err', `Necesitas ${ADOPT_COST} Zenis para adoptar.`); return true }
    p = db.data[id] = { owner: id, species, name: scenes.SPECIES[species].label[0] + scenes.SPECIES[species].label.slice(1).toLowerCase(), xp: 0, level: 1, fedAt: Date.now() - FEED_CD, playedAt: 0, skin: 'cielo', skins: ['cielo'] }
    await db.save()
    await show(sock, jid, m, p, `🥚 ¡Adoptaste un huevo de *${p.name}*!\nAlimenta y juega con él para que eclosione.\n\n${caption(p)}`, [
      { id: `${prefix}alimentar`, text: '🍖 Alimentar' }, { id: `${prefix}acariciar`, text: '🤗 Acariciar' }])
    return true
  }

  if (!p) { await say(sock, jid, m, 'info', `Aún no tienes mascota. Adopta una con ${prefix}adoptar (${ADOPT_COST} Zenis).`); return true }

  if (cmd === 'mascota') {
    await show(sock, jid, m, p, caption(p), [
      { id: `${prefix}alimentar`, text: '🍖 Alimentar' }, { id: `${prefix}acariciar`, text: '🤗 Acariciar' }, { id: `${prefix}skins`, text: '🎨 Skins' }])
  } else if (cmd === 'alimentar' || cmd === 'acariciar') {
    const feed = cmd === 'alimentar', key = feed ? 'fedAt' : 'playedAt', cd = feed ? FEED_CD : PLAY_CD
    const wait = cd - (Date.now() - (p[key] || 0))
    if (wait > 0 && (!feed || moodOf(p) > 0.85)) { await say(sock, jid, m, 'wait', `${p.name} no quiere más por ahora. Vuelve en ${Math.ceil(wait / 60000)} min.`); return true }
    if (feed && (await rpg.adjustCoins(id, pushName, -FEED_COST)) === null) { await say(sock, jid, m, 'err', `La comida cuesta ${FEED_COST} Zenis.`); return true }
    p[key] = Date.now()
    const evolved = addXp(p, feed ? 30 : 12)
    await db.save()
    await show(sock, jid, m, p, `${feed ? '🍖 ¡Ñam! Le diste de comer' : '🤗 Jugaste con'} *${p.name}* (+${feed ? 30 : 12} XP)${evolved ? '\n\n🌟 *¡EVOLUCIONÓ!* Ahora luce más poderoso.' : ''}\n\n${caption(p)}`)
  } else if (cmd === 'nombrarmascota') {
    const name = String(text || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 12)
    if (!name) { await say(sock, jid, m, 'info', `Uso: ${prefix}nombrarmascota <nombre>`); return true }
    p.name = name; await db.save()
    await say(sock, jid, m, 'ok', `Tu mascota ahora se llama *${name}*.`)
  } else if (cmd === 'skins' || cmd === 'skin') {
    const want = String(text || '').trim().toLowerCase()
    const skin = scenes.SKINS[want]
    if (cmd === 'skin' && skin) {
      if (!p.skins.includes(want)) {
        if ((await require('./goku/rpg').adjustCoins(id, pushName, -skin.price)) === null) { await say(sock, jid, m, 'err', `Esa skin cuesta ${skin.price} Zenis.`); return true }
        p.skins.push(want)
      }
      p.skin = want; await db.save()
      await show(sock, jid, m, p, `🎨 Skin *${skin.label}* equipada.\n\n${caption(p)}`)
      return true
    }
    const rows = Object.entries(scenes.SKINS).map(([k, s]) => `${p.skin === k ? '✅' : p.skins.includes(k) ? '🔓' : '🔒'} *${s.label}* — ${s.price ? s.price + ' Zenis' : 'gratis'}`)
    const next = Object.keys(scenes.SKINS).filter(k => k !== p.skin).slice(0, 3)
    await sock.sendMessage(jid, {
      text: `🎨 *SKINS DE FONDO*\n\n${rows.join('\n')}`,
      footer: 'Toca para comprar o equipar',
      buttons: next.map(k => ({ id: `${prefix}skin ${k}`, text: `🎨 ${scenes.SKINS[k].label}` }))
    }, { quoted: m })
  }
  return true
}

module.exports = handler
module.exports.bonus = bonus
