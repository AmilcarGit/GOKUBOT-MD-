'use strict'
// Engancha los eventos de mensajes a un socket. Lo usan el bot principal y cada subbot.
const cfg = require('../config')
const runCommand = require('../commands')
const { wrapSock } = require('./theme')
const { getBody } = require('./message')
const status = require('./status')
const settings = require('./settings')

// Si el bot principal y un subbot están en el mismo grupo, solo responde uno:
// el principal reclama el mensaje al instante y los subbots esperan un poco antes de revisar.
const claimed = new Map()
setInterval(() => { const cut = Date.now() - 120000; for (const [k, t] of claimed) if (t < cut) claimed.delete(k) }, 60000).unref()
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function claim(m, isSub) {
  const key = `${m.key.remoteJid}:${m.key.id}`
  if (isSub) await sleep(700)
  if (claimed.has(key)) return false
  claimed.set(key, Date.now())
  return true
}

function attach(sock, { isSub = false, label = 'principal' } = {}) {
  sock.isSub = isSub
  const subs = () => require('./subbots')

  sock.ev.on('group-participants.update', event => {
    if (isSub) return subs().welcome(sock, event).catch(e => console.error('[subbot bienvenida]', e.message)) // el principal no repite su bienvenida en subbots
    require('../commands/grupos').onParticipants(wrapSock(sock), event).catch(e => console.error('[bienvenida]', e.message))
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const m = messages[0]
    if (!isSub) console.log('MSG', type, m?.key?.fromMe, m?.key?.remoteJid, getBody(m || {}).slice(0, 40))
    if (!m?.message || m.key.remoteJid === 'status@broadcast') return
    if (!(await claim(m, isSub))) return
    status.countMessage()
    if (!m.key.fromMe) {
      const who = await sock.getSender(m).catch(() => null)
      if (who && [who.number, who.id].some(id => settings.isBannedId(id))) return
    }
    const jid = m.key.remoteJid
    const body = getBody(m).trim()
    const cfgSub = isSub ? sock.subSettings || {} : null
    const p = (cfgSub && cfgSub.prefix) || cfg.prefix
    const stats = isSub ? subs().statsFor(sock.subNumber) : null
    if (stats) stats.messages++
    // Subbot pausado: ignora todo salvo .reanudarbot.
    if (cfgSub?.paused && !body.toLowerCase().startsWith(p + 'reanudarbot')) return
    if (jid.endsWith('@g.us') && !isSub) require('../commands/grupos').onMessage(wrapSock(sock), m, jid).catch(e => console.error('[grupos]', e.message))
    if (!body.startsWith(p)) {
      // Chat privado sin prefijo: responde la IA de Goku (config.js -> AI_PRIVATE).
      if (type === 'notify') require('../commands/ia').autoReply(sock, m, jid, body).catch(e => status.countError(e))
      return
    }
    const [cmdRaw, ...rest] = body.slice(p.length).split(/\s+/)
    const cmd = cmdRaw.toLowerCase()
    const text = rest.join(' ')
    if (stats) { stats.commands++; stats.top.set(cmd, (stats.top.get(cmd) || 0) + 1) }
    // Reacción ⚡ al recibir un comando (función nativa de WhatsApp).
    if (cfg.reactions && !m.key.fromMe) sock.sendMessage(jid, { react: { text: '⚡', key: m.key } }).catch(() => {})
    try {
      await runCommand(sock, m, jid, cmd, text, p)
    } catch (e) {
      status.countError(e)
      console.error(`[${label}]`, e)
      await sock.sendMessage(jid, { text: '⚠️ Ocurrió un error, intenta de nuevo.' }, { quoted: m }).catch(() => {})
    }
  })
}

module.exports = { attach }
