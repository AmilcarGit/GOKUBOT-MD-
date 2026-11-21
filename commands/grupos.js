'use strict'
// Grupos: bienvenida/despedida con imagen, antilink, mencionar a todos y ranking de actividad.
const T = require('../lib/theme')
const scenes = require('../lib/scenes')
const groups = require('../lib/groupdb')

const COMMANDS = new Set(['bienvenida', 'antilink', 'todos', 'tagall', 'actividad'])
const LINK = /(https?:\/\/\S+|chat\.whatsapp\.com\/\S+|wa\.me\/\S+)/i
const clean = jid => String(jid || '').split('@')[0].split(':')[0]
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  if (!jid.endsWith('@g.us')) { await say(sock, jid, m, 'warn', 'Este comando solo funciona en grupos.'); return true }

  if (cmd === 'actividad') {
    const g = groups.group(jid)
    const rows = Object.entries(g.counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, n]) => ({ name: g.names[id] || id, power: n, level: 0 }))
    if (!rows.length) { await say(sock, jid, m, 'info', 'Todavía no hay mensajes registrados en este grupo.'); return true }
    const png = scenes.ranking(rows, { title: 'GUERREROS ACTIVOS', subtitle: 'MENSAJES DEL GRUPO', tag: () => '' }).toPNG()
    await sock.sendMessage(jid, { image: png, caption: '🔥 Los guerreros más activos del grupo' }, { quoted: m })
    return true
  }

  if (!(await sock.isAdmin(jid, m))) { await say(sock, jid, m, 'warn', 'Solo los administradores pueden usar este comando.'); return true }

  if (cmd === 'todos' || cmd === 'tagall') {
    const meta = await sock.groupMetadata(jid)
    const ids = meta.participants.map(p => p.id)
    const lines = ids.map(id => `🐉 @${clean(id)}`).join('\n')
    await sock.sendMessage(jid, { text: `📣 *${text.trim() || 'Atención, guerreros'}*\n\n${lines}`, mentions: ids }, { quoted: m })
    return true
  }

  const g = groups.group(jid)
  const arg = text.trim().toLowerCase()
  const key = cmd === 'bienvenida' ? 'welcome' : 'antilink'
  if (!['on', 'off'].includes(arg)) {
    await say(sock, jid, m, 'info', `${cmd === 'bienvenida' ? 'Bienvenida' : 'Antilink'}: ${g[key] ? 'activado ✅' : 'desactivado ❌'}\nUso: ${prefix}${cmd} on | off`)
    return true
  }
  if (key === 'antilink' && arg === 'on' && !(await sock.isBotAdmin(jid))) {
    await say(sock, jid, m, 'warn', 'Para borrar enlaces necesito ser administrador del grupo. Hazme admin y vuelve a activarlo.')
    return true
  }
  g[key] = arg === 'on'
  groups.save()
  await say(sock, jid, m, 'ok', `${cmd === 'bienvenida' ? 'Bienvenida y despedida' : 'Antilink'} ${g[key] ? 'activado' : 'desactivado'}.`)
  return true
}

// Cada mensaje de grupo: cuenta la actividad y aplica antilink.
async function onMessage(sock, m, jid) {
  if (m.key.fromMe || !jid.endsWith('@g.us')) return
  const sender = clean(m.key.participant)
  if (!sender) return
  groups.count(jid, sender, m.pushName)
  // Silencios y antispam (moderación): si borró el mensaje, no hay más que revisar.
  if (await require('./moderacion').enforce(sock, m, jid).catch(() => false)) return
  const g = groups.group(jid)
  if (!g.antilink) return
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || ''
  if (!LINK.test(body)) return
  if (await sock.isAdmin(jid, m) || !(await sock.isBotAdmin(jid))) return
  await sock.sendMessage(jid, { delete: m.key })
  await sock.sendMessage(jid, { text: T.msg('warn', `@${sender} los enlaces no están permitidos en este grupo.`), mentions: [m.key.participant] })
}

// Entradas y salidas de miembros.
async function onParticipants(sock, event) {
  if (!['add', 'remove'].includes(event.action)) return
  const g = groups.group(event.id)
  if (!g.welcome) return
  const meta = await sock.groupMetadata(event.id).catch(() => null)
  const subject = meta?.subject || ''
  for (const p of event.participants || []) {
    const id = typeof p === 'string' ? p : p.id
    const number = clean(typeof p === 'string' ? p : (p.phoneNumber || p.id))
    const display = /^\d{6,15}$/.test(number) ? number : 'GUERRERO'
    const added = event.action === 'add'
    const png = scenes.welcome(added ? 'welcome' : 'bye', (typeof p === 'object' && (p.name || p.notify)) || display, subject).toPNG()
    const caption = added
      ? `🐉 ¡Bienvenido @${clean(id)} a *${subject}*! Un nuevo guerrero se une.`
      : `👋 @${clean(id)} dejó el grupo. ¡Sigue entrenando fuerte!`
    await sock.sendMessage(event.id, { image: png, caption, mentions: [id] })
  }
}

module.exports = handler
module.exports.onMessage = onMessage
module.exports.onParticipants = onParticipants
