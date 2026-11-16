'use strict'
// IA de Goku: `.ia <pregunta>` en cualquier chat y respuesta automática en chats privados.
const cfg = require('../config')
const T = require('../lib/theme')
const evogb = require('../lib/evogb')
const settings = require('../lib/settings')
const voice = require('../lib/voice')
const video = require('../lib/video')

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

// En privado, si está activado, responde con nota de voz. Devuelve false si hay que mandar texto.
async function sendVoice(sock, m, jid, reply) {
  if (!cfg.ai.voice || !isPrivate(jid) || !settings.voiceOn(jid) || reply.length > cfg.ai.voiceMax || reply.includes('```') || !video.hasFfmpeg()) return false
  try {
    sock.sendPresenceUpdate('recording', jid).catch(() => {})
    const audio = await voice.speak(reply)
    await sock.sendMessage(jid, { audio, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
    return true
  } catch (error) {
    console.error('[voz]', error.message)
    return false
  }
}

// ───── Código con botón de copiar ─────
const CODE_BLOCK = /```[\w+#.-]*\n?([\s\S]*?)```/g
const MAX_COPY = 2000   // WhatsApp limita el texto que puede llevar un botón de copiar
function codeBlocks(reply) {
  return [...reply.matchAll(CODE_BLOCK)].map(x => x[1].trim()).filter(code => code && code.length <= MAX_COPY).slice(0, 3)
}

// ───── Acciones: la IA puede pedirle cosas al bot ─────
// Solo comandos inofensivos y gratuitos: nada que gaste Zenis, borre datos o sea del dueño.
const ACTIONS = {
  poder: 'poder', esferas: 'esferas', perfil: 'perfil', tarjeta: 'tarjeta', nevada: 'nevada', fuegos: 'fuegos',
  dragon: 'dragon', onda: 'onda', top: 'top', coleccion: 'coleccion', trivia: 'trivia', menu: 'menu', menui: 'menui'
}
const ACTIONS_PROMPT = ` ACCIONES: si el usuario te pide mostrar su poder, sus esferas, su perfil, una tarjeta navideña (con su nombre), una animación de nevada, fuegos artificiales, dragón u onda de energía, el ranking, su colección de guerreros, una trivia o el menú, responde con una frase corta y añade AL FINAL, en una línea nueva, la etiqueta [[accion:nombre]] o [[accion:tarjeta|nombre]]. Nombres válidos: ${Object.keys(ACTIONS).join(', ')}. No inventes otras acciones ni uses la etiqueta si no te lo piden. También puedes explicar qué hace el bot: juegos RPG, guerreros originales, imágenes y animaciones, audios, grupos, trivia y recordatorios (si piden un recordatorio, diles que escriban por ejemplo "recuérdame en 10 minutos sacar la pizza").`
const ACTION_TAG = /\[\[\s*accion\s*:\s*([a-z]+)\s*(?:\|([^\]]*))?\]\]/i

// Recordatorios en lenguaje natural: "recuérdame en 10 minutos sacar la pizza".
const UNITS = { s: 's', seg: 's', segundo: 's', segundos: 's', m: 'm', min: 'm', minuto: 'm', minutos: 'm', h: 'h', hora: 'h', horas: 'h', d: 'd', dia: 'd', dias: 'd', día: 'd', días: 'd' }
function parseReminder(text) {
  const time = '(?:en|dentro de)\\s+(\\d+|un|una)\\s*(segundos?|seg|minutos?|min|horas?|h|d[ií]as?|s|m|d)\\b'
  const verb = '(?:recu[eé]rda(?:me)?|av[ií]sa(?:me)?|recordarme|ponme un recordatorio)'
  const a = text.match(new RegExp(`^\\s*${verb}\\s+${time}\\s*(?:de|que|para)?\\s*(.+)$`, 'is'))
  const b = text.match(new RegExp(`^\\s*${time}\\s*,?\\s*${verb}\\s*(?:de|que|para)?\\s*(.+)$`, 'is'))
  const hit = a || b
  if (!hit) return null
  const n = /^un/i.test(hit[1]) ? 1 : Number(hit[1])
  const unit = UNITS[hit[2].toLowerCase()]
  return unit && hit[3].trim() ? { n, unit, memo: hit[3].trim() } : null
}

async function runAction(sock, m, jid, name, args) {
  const cmd = ACTIONS[String(name).toLowerCase()]
  if (!cmd) return
  try {
    await require('./index')(sock, m, jid, cmd, (args || '').trim(), cfg.prefix)
  } catch (error) {
    console.error('[ia] acción', cmd, error.message)
  }
}

async function answer(sock, m, jid, question) {
  if (!evogb.hasKey()) {
    await sock.sendMessage(jid, { text: T.msg('warn', 'La IA no está configurada todavía (falta EVOGB_KEY).') }, { quoted: m })
    return
  }
  if (busy.has(jid)) return
  if (Date.now() - (lastUse.get(jid) || 0) < COOLDOWN) return
  const reminder = parseReminder(question)
  if (reminder) {
    await require('./interactivo')(sock, m, jid, 'recordar', `${reminder.n}${reminder.unit} ${reminder.memo}`, cfg.prefix)
    return
  }
  busy.add(jid)
  lastUse.set(jid, Date.now())
  try {
    sock.sendPresenceUpdate('composing', jid).catch(() => {})
    let reply = await evogb.ai(buildPrompt(jid, clip(question, MAX_INPUT)), cfg.ai.persona + ACTIONS_PROMPT)
    const tag = reply.match(ACTION_TAG)
    reply = reply.replace(new RegExp(ACTION_TAG.source, 'gi'), '').trim() || '¡Claro, va!'
    const turns = history.get(jid) || []
    turns.push({ q: question, a: reply })
    history.set(jid, turns.slice(-HISTORY_TURNS))
    if (!(await sendVoice(sock, m, jid, reply))) {
      const blocks = cfg.ai.copyButton ? codeBlocks(reply) : []
      let sent = false
      if (blocks.length) {
        try {
          await sock.sendMessage(jid, {
            text: reply,
            footer: 'Toca el botón para copiar el código',
            buttons: blocks.map((code, i) => ({ text: blocks.length > 1 ? `📋 Copiar código ${i + 1}` : '📋 Copiar código', copy: code }))
          }, { quoted: m })
          sent = true
        } catch (error) {
          console.error('[ia] botón de copiar:', error.message)
        }
      }
      if (!sent) await sock.sendMessage(jid, cfg.ai.badge ? { text: reply, ai: true } : { text: reply }, { quoted: m })
    }
    if (tag) await runAction(sock, m, jid, tag[1], tag[2])
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
  if (cmd === 'voz') {
    const arg = text.trim().toLowerCase()
    if (!['on', 'off'].includes(arg)) {
      await sock.sendMessage(jid, { text: T.msg('info', `Voz de Goku: ${settings.voiceOn(jid) ? 'activada 🔊' : 'desactivada 🔇'}\nUso: ${prefix}voz on | off\n${prefix}hablar <texto> hace que Goku lo diga.`) }, { quoted: m })
      return true
    }
    settings.setVoice(jid, arg === 'on')
    await sock.sendMessage(jid, { text: T.msg('ok', `Voz de Goku ${arg === 'on' ? 'activada' : 'desactivada'} para este chat.`) }, { quoted: m })
    return true
  }
  if (cmd === 'hablar') {
    if (!text.trim()) { await sock.sendMessage(jid, { text: T.msg('info', `Uso: ${prefix}hablar <texto>`) }, { quoted: m }); return true }
    if (!video.hasFfmpeg()) { await sock.sendMessage(jid, { text: T.msg('err', 'Este servidor no tiene ffmpeg.') }, { quoted: m }); return true }
    if (Date.now() - (lastUse.get('v' + jid) || 0) < 5000) return true
    lastUse.set('v' + jid, Date.now())
    try {
      const audio = await voice.speak(text.trim().slice(0, 300))
      await sock.sendMessage(jid, { audio, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
    } catch (error) {
      console.error('[voz]', error.message)
      await sock.sendMessage(jid, { text: T.msg('err', 'No pude generar la voz ahora. Intenta de nuevo.') }, { quoted: m })
    }
    return true
  }
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
const digits = id => String(id || '').split('@')[0].split(':')[0]

// En grupos solo contesta si lo mencionan o si responden a un mensaje suyo.
function addressedToBot(sock, m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo
  if (!ctx) return false
  const mine = [digits(sock.user?.id), digits(sock.user?.lid)].filter(Boolean)
  return (ctx.mentionedJid || []).some(id => mine.includes(digits(id))) || mine.includes(digits(ctx.participant))
}

async function autoReply(sock, m, jid, body) {
  if (m.key.fromMe || !body.trim()) return false
  if (isPrivate(jid)) {
    if (!cfg.ai.private) return false
    await answer(sock, m, jid, body.trim())
    return true
  }
  if (jid.endsWith('@g.us') && cfg.ai.groups && addressedToBot(sock, m)) {
    const question = body.replace(/@\d+/g, '').trim()
    if (!question) return false
    await answer(sock, m, jid, question)
    return true
  }
  return false
}

module.exports = handler
module.exports.autoReply = autoReply
