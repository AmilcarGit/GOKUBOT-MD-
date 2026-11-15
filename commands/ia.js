'use strict'
// IA de Goku: `.ia <pregunta>` en cualquier chat y respuesta automática en chats privados.
const cfg = require('../config')
const T = require('../lib/theme')
const evogb = require('../lib/evogb')

const COOLDOWN = 3000
const MAX_INPUT = 600
const HISTORY_TURNS = 3
const history = new Map()  // chat -> [{ q, a }]
const lastUse = new Map()  // chat -> timestamp
const busy = new Set()

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)

function buildPrompt(jid, question) {
  const turns = history.get(jid) || []
  if (!turns.length) return question
  const context = turns.map(t => `Usuario: ${clip(t.q, 200)}\nGoku: ${clip(t.a, 250)}`).join('\n')
  return `Conversación anterior:\n${context}\n\nNuevo mensaje del usuario: ${question}`
}

async function answer(sock, m, jid, question) {
  if (!evogb.hasKey()) {
    await sock.sendMessage(jid, { text: T.msg('warn', 'La IA no está configurada todavía (falta EVOGB_KEY).') }, { quoted: m })
    return
  }
  if (busy.has(jid)) return
  if (Date.now() - (lastUse.get(jid) || 0) < COOLDOWN) return
  busy.add(jid)
  lastUse.set(jid, Date.now())
  try {
    sock.sendPresenceUpdate('composing', jid).catch(() => {})
    const reply = await evogb.ai(buildPrompt(jid, clip(question, MAX_INPUT)), cfg.ai.persona)
    const turns = history.get(jid) || []
    turns.push({ q: question, a: reply })
    history.set(jid, turns.slice(-HISTORY_TURNS))
    await sock.sendMessage(jid, cfg.ai.badge ? { text: reply, ai: true } : { text: reply }, { quoted: m })
  } catch (error) {
    console.error('[ia]', error.message)
    await sock.sendMessage(jid, { text: T.msg('err', 'Goku se quedó sin ki un momento. Intenta de nuevo en unos segundos.') }, { quoted: m })
  } finally {
    busy.delete(jid)
    sock.sendPresenceUpdate('paused', jid).catch(() => {})
  }
}

// Comando .ia / .goku-ia / .ask
async function handler(sock, m, jid, cmd, text, prefix) {
  if (!['ia', 'ai', 'ask', 'goku-ia'].includes(cmd)) return false
  if (cmd === 'ia' && /^(reset|borrar|olvidar)$/i.test(text.trim())) {
    history.delete(jid)
    await sock.sendMessage(jid, { text: T.msg('ok', 'Conversación reiniciada.') }, { quoted: m })
    return true
  }
  if (!text.trim()) {
    await sock.sendMessage(jid, { text: T.msg('info', `Pregúntale algo a Goku: ${prefix}ia <pregunta>\nUsa ${prefix}ia reset para borrar la conversación.`) }, { quoted: m })
    return true
  }
  await answer(sock, m, jid, text.trim())
  return true
}

// Mensaje normal (sin prefijo) en un chat privado.
const isPrivate = jid => jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')
async function autoReply(sock, m, jid, body) {
  if (!cfg.ai.private || m.key.fromMe || !isPrivate(jid) || !body.trim()) return false
  await answer(sock, m, jid, body.trim())
  return true
}

module.exports = handler
module.exports.autoReply = autoReply
