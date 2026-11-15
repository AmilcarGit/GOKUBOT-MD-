'use strict'
// Guerreros originales: invocación animada, colección y cartas. Cuesta Zenis del RPG.
const fs = require('fs')
const path = require('path')
const T = require('../lib/theme')
const { Canvas } = require('../lib/canvas')
const W = require('../lib/warriors')
const video = require('../lib/video')
const { DATA_DIR } = require('../lib/paths')

const FILE = path.join(DATA_DIR, 'warriors.json')
const COST = 250, COOLDOWN = 10000
const COMMANDS = new Set(['invocar', 'coleccion', 'guerrero', 'guerreros'])
const last = new Map()

let db = { users: {} }
try { db = { users: {}, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) } } catch { /* primera vez */ }
let saving = Promise.resolve()
const save = () => { saving = saving.then(() => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE + '.tmp', JSON.stringify(db)); fs.renameSync(FILE + '.tmp', FILE) }).catch(e => console.error('[guerreros]', e.message)) }
const userOf = (id, name) => { const u = db.users[id] || (db.users[id] = { name: name || id.split('@')[0], owned: {} }); if (name) u.name = name; return u }

const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const id = m.key.participant || m.key.remoteJid
  const name = m.pushName || id.split('@')[0]
  const user = userOf(id, name)

  if (cmd === 'guerreros') {
    const lines = W.ROSTER.map((w, i) => `${String(i + 1).padStart(2, ' ')}. ${w.name} — ${w.title} (${W.RARITY[w.rarity].label.toLowerCase()})`)
    await say(sock, jid, m, 'info', `⚔️ *GUERREROS ORIGINALES*\n\n${lines.join('\n')}\n\nInvoca con ${prefix}invocar (${COST} Zenis). Mira tu colección con ${prefix}coleccion.`)
    return true
  }

  if (cmd === 'coleccion') {
    const have = W.ROSTER.filter(w => user.owned[w.id]).length
    await sock.sendMessage(jid, { image: W.drawCollection(user.owned, name).toPNG(), caption: `🃏 Tienes ${have} de ${W.ROSTER.length} guerreros.\n⚡ Bonus de equipo: +${W.teamBonus(user.owned)} de poder (20% de tus 3 mejores).\nInvoca más con ${prefix}invocar` }, { quoted: m })
    return true
  }

  if (cmd === 'guerrero') {
    const w = W.find(text)
    if (!w) { await say(sock, jid, m, 'info', `Uso: ${prefix}guerrero <nombre o número>\nLista: ${prefix}guerreros`); return true }
    if (!user.owned[w.id]) { await say(sock, jid, m, 'warn', 'Todavía no tienes a ese guerrero. ¡Invócalo!'); return true }
    await sock.sendMessage(jid, { image: W.drawCard(w, 2, user.owned[w.id]).toPNG(), caption: `${w.name} — ${w.title}` }, { quoted: m })
    return true
  }

  // invocar
  const rpg = require('./goku/rpg')
  const st = rpg.statsFor(id, name)
  if (st.coins < COST) { await say(sock, jid, m, 'warn', `Invocar cuesta ${COST} Zenis y tienes ${st.coins}. Entrena con ${prefix}entrenar.`); return true }
  const wait = COOLDOWN - (Date.now() - (last.get(id) || 0))
  if (wait > 0) { await say(sock, jid, m, 'wait', `Espera ${Math.ceil(wait / 1000)}s para otra invocación.`); return true }

  try {
    await video.exclusive(async () => {
      last.set(id, Date.now())
      if ((await rpg.adjustCoins(id, name, -COST)) === null) { await say(sock, jid, m, 'warn', 'No te alcanzan los Zenis.'); return }
      const w = W.roll()
      const count = (user.owned[w.id] || 0) + 1
      user.owned[w.id] = count
      save()
      const R = W.RARITY[w.rarity]
      const caption = `🌟 *¡INVOCASTE A ${w.name.toUpperCase()}!*\n${'⭐'.repeat(R.stars)} ${R.label.toLowerCase()} — ${w.title}\n⚡ Poder: ${Math.floor(w.power * (1 + 0.1 * (count - 1)))}${count > 1 ? `\n🔁 Repetido (x${count}): +10% de poder en su carta` : '\n✨ ¡Nuevo en tu colección!'}\n💰 Gastaste ${COST} Zenis`
      const card = W.drawCard(w, 0.78, count)
      if (video.hasFfmpeg()) {
        try {
          const c = new Canvas(480, 270)
          const buffer = await video.encode({ width: 480, height: 270, fps: 12, count: 40, format: 'mp4', frame: i => { c.clear([0, 0, 0], 1); W.summon(c, i / 40, w, card); return c.data } })
          await sock.sendMessage(jid, { video: buffer, gifPlayback: true, mimetype: 'video/mp4', caption }, { quoted: m })
          return
        } catch (error) { console.error('[guerreros] video:', error.message) }
      }
      await sock.sendMessage(jid, { image: W.drawCard(w, 2, count).toPNG(), caption }, { quoted: m })
    })
  } catch (error) {
    const busy = error.code === 'BUSY'
    if (!busy) console.error('[guerreros]', error.message)
    await say(sock, jid, m, busy ? 'wait' : 'err', busy ? 'Hay otra animación en curso, intenta en unos segundos.' : 'No pude invocar, inténtalo de nuevo.')
  }
  return true
}

// Regalo del dueño: entrega un guerrero (o suma una repetición).
module.exports.grant = (id, query) => {
  const w = W.find(query)
  if (!w) return null
  const u = userOf(id)
  u.owned[w.id] = (u.owned[w.id] || 0) + 1
  save()
  return { warrior: w, count: u.owned[w.id] }
}

// Poder extra que aporta la colección al RPG.
module.exports.bonusFor = id => W.teamBonus(db.users[id]?.owned)
