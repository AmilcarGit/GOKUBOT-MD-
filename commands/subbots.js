'use strict'
// Sistema de subbots: vincula otro número con un código y usa los mismos comandos.
const T = require('../lib/theme')
const subs = require('../lib/subbots')
const scenes = require('../lib/scenes2')

const COMMANDS = new Set(['serbot', 'jadibot', 'subbot', 'subbots', 'misubbot', 'borrarsubbot', 'detenersubbot'])
const COOLDOWN = 2 * 60 * 1000
const last = new Map()
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })
const mask = n => (n.length > 6 ? n.slice(0, 3) + '•'.repeat(n.length - 6) + n.slice(-3) : n)
const pretty = n => '+' + n.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, '$1 $2 $3 $4')

function uptime(since) {
  if (!since) return ''
  const min = Math.floor((Date.now() - since) / 60000)
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const { isOwner } = require('./dueno')
  const owner = await isOwner(sock, m)
  const who = await sock.getSender(m).catch(() => ({}))
  const mineIds = [who.number, who.id, (m.key.participant || m.key.remoteJid)].map(subs.digits).filter(Boolean)
  const isMine = s => mineIds.includes(subs.digits(s.owner)) || mineIds.includes(s.number)

  if (cmd === 'subbots' || cmd === 'misubbot') {
    const all = subs.list().filter(s => owner || isMine(s))
    const rows = all.map(s => ({ label: pretty(owner ? s.number : mask(s.number)), state: s.state, uptime: s.state === 'conectado' ? uptime(s.since) : '' }))
    await sock.sendMessage(jid, {
      image: scenes.subPanel(rows, subs.max()).toPNG(),
      caption: `🛰️ *Radar de subbots*\n${owner ? 'Vista de dueño: todos los subbots.' : 'Tus subbots.'}\nSubbots máximos: ${subs.max()}`
    }, { quoted: m })
    if (!all.length) {
      await sock.sendMessage(jid, { text: '¿Quieres tener tu propio bot con mis comandos?', footer: 'Es gratis', buttons: [{ id: `${prefix}serbot`, text: '🤖 Crear mi subbot' }] }, { quoted: m }).catch(() => {})
    }
    return true
  }

  if (cmd === 'borrarsubbot' || cmd === 'detenersubbot') {
    const arg = subs.digits(text)
    const target = subs.list().find(s => (arg ? s.number === arg : isMine(s)) && (owner || isMine(s)))
    if (!target) { await say(sock, jid, m, 'info', owner ? `Uso: ${prefix}borrarsubbot <número>` : 'No tienes ningún subbot.'); return true }
    await subs.remove(target.number)
    await say(sock, jid, m, 'ok', `Subbot ${pretty(target.number)} eliminado. Su sesión se borró.`)
    return true
  }

  // serbot / jadibot / subbot
  if (sock.isSub) { await say(sock, jid, m, 'warn', 'Solo el bot principal puede crear subbots.'); return true }
  if (jid.endsWith('@g.us')) { await say(sock, jid, m, 'info', `Por seguridad el código se pide en privado. Escríbeme al chat privado: ${prefix}serbot`); return true }
  const arg = subs.digits(text)
  const own = subs.digits(who.number)
  const number = arg || own
  if (!number) { await say(sock, jid, m, 'info', `No pude leer tu número. Usa: ${prefix}serbot 51999888777 (con código de país, solo dígitos).`); return true }
  // Solo el dueño puede vincular un número distinto al suyo (evita molestar a otras personas con códigos).
  if (!owner && own && arg && arg !== own) { await say(sock, jid, m, 'warn', 'Solo puedes vincular tu propio número.'); return true }
  const key = subs.digits(who.id || jid)
  if (!owner && Date.now() - (last.get(key) || 0) < COOLDOWN) { await say(sock, jid, m, 'wait', 'Espera un par de minutos antes de pedir otro código.'); return true }
  last.set(key, Date.now())

  try {
    await say(sock, jid, m, 'wait', 'Preparando tu cápsula de vinculación...')
    const code = await subs.create(number, {
      owner: m.key.participant || m.key.remoteJid, name: m.pushName || number, isOwner: owner,
      notify: msg => sock.sendMessage(jid, { text: msg })
    })
    await sock.sendMessage(jid, {
      image: scenes.linkCard(code, number).toPNG(),
      caption: `🤖 *Subbot +${number}*\n\n1️⃣ Abre WhatsApp en ese número\n2️⃣ Dispositivos vinculados > *Vincular con número de teléfono*\n3️⃣ Escribe el código de la imagen\n\n⏳ Caduca en 4 minutos. No compartas este código con nadie.`
    }, { quoted: m })
    await sock.sendMessage(jid, { text: `🔑 Código: *${code.slice(0, 4)}-${code.slice(4)}*`, footer: 'Toca para copiarlo', buttons: [{ text: '📋 Copiar código', copy: code }] }, { quoted: m }).catch(() => {})
  } catch (e) {
    last.delete(key)
    console.error('[subbots]', e.message)
    await say(sock, jid, m, e.friendly ? 'warn' : 'err', e.friendly ? e.message : 'No pude generar el código ahora. Intenta de nuevo en un minuto.')
  }
  return true
}

module.exports = handler
