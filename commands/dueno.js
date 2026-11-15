'use strict'
// Panel del dueño: IA on/off, anuncios a todos los grupos, baneos y reinicio.
const cfg = require('../config')
const T = require('../lib/theme')
const settings = require('../lib/settings')

// El ajuste guardado (si existe) manda sobre config.js.
if (typeof settings.data.aiPrivate === 'boolean') cfg.ai.private = settings.data.aiPrivate

const COMMANDS = new Set(['panel', 'ia', 'anuncio', 'ban', 'unban', 'reiniciar', 'miid'])
const OWNER_ONLY = new Set(['panel', 'anuncio', 'ban', 'unban', 'reiniciar'])
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

const ownerIds = () => String(cfg.owner || '').split(/[,\s]+/).map(settings.digits).filter(Boolean)

async function isOwner(sock, m) {
  if (m.key.fromMe) return true
  const who = await sock.getSender(m)
  return [who.number, who.id].filter(Boolean).some(id => ownerIds().includes(settings.digits(id)))
}

// Quién es el objetivo de .ban: mención, mensaje citado o número escrito.
function target(m, text) {
  const ctx = m.message?.extendedTextMessage?.contextInfo
  return ctx?.mentionedJid?.[0] || ctx?.participant || (text.match(/\d{6,}/) || [])[0] || ''
}

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false

  if (cmd === 'miid') {
    const who = await sock.getSender(m)
    await say(sock, jid, m, 'info', `Tu número: ${who.number || 'no disponible'}\nTu ID interno: ${who.id || 'no disponible'}\nDueño: ${(await isOwner(sock, m)) ? 'sí ✅' : 'no ❌'}\n\nPara darte permisos pon uno de esos valores en la variable BOT_OWNER.`)
    return true
  }

  // `.ia` sin on/off lo atiende el comando de la IA para cualquiera.
  const toggle = cmd === 'ia' && /^(on|off)$/i.test(text.trim())
  if (cmd === 'ia' && !toggle) return false
  if ((OWNER_ONLY.has(cmd) || toggle) && !(await isOwner(sock, m))) {
    await say(sock, jid, m, 'warn', 'Este comando es solo para el dueño del bot.')
    return true
  }

  if (toggle) {
    cfg.ai.private = text.trim().toLowerCase() === 'on'
    settings.data.aiPrivate = cfg.ai.private
    settings.save()
    await say(sock, jid, m, 'ok', `IA de chat privado ${cfg.ai.private ? 'activada ✅' : 'desactivada ❌'}.`)
    return true
  }

  if (cmd === 'panel') {
    const groups = await sock.groupFetchAllParticipating().catch(() => ({}))
    await say(sock, jid, m, 'info', [
      '👑 *PANEL DEL DUEÑO*', '',
      `🤖 IA en privado: ${cfg.ai.private ? 'activada ✅' : 'desactivada ❌'}`,
      `🔑 EvoGB: ${cfg.evogbKey ? '✅' : '❌'}   YuiAPI: ${cfg.yuiKey ? '✅' : '❌'}`,
      `👥 Grupos: ${Object.keys(groups).length}`,
      `🚫 Baneados: ${settings.data.banned.length}`, '',
      `${prefix}ia on/off · ${prefix}anuncio <texto>`,
      `${prefix}ban / ${prefix}unban (mención, respuesta o número)`,
      `${prefix}reiniciar · ${prefix}estado`
    ].join('\n'))
    return true
  }

  if (cmd === 'anuncio') {
    if (!text.trim()) { await say(sock, jid, m, 'info', `Uso: ${prefix}anuncio <texto>`); return true }
    const groups = Object.keys(await sock.groupFetchAllParticipating())
    await say(sock, jid, m, 'wait', `Enviando a ${groups.length} grupo(s)...`)
    let sent = 0
    for (const id of groups) {
      try { await sock.sendMessage(id, { text: `📢 *Anuncio del bot*\n\n${text.trim()}` }); sent++ } catch (error) { console.error('[anuncio]', id, error.message) }
      await wait(2500) // pausa entre grupos para no parecer spam
    }
    await say(sock, jid, m, 'ok', `Anuncio enviado a ${sent} de ${groups.length} grupo(s).`)
    return true
  }

  if (cmd === 'ban' || cmd === 'unban') {
    const id = target(m, text)
    if (!id) { await say(sock, jid, m, 'info', `Uso: ${prefix}${cmd} @usuario, respondiendo a su mensaje o con el número.`); return true }
    if (ownerIds().includes(settings.digits(id))) { await say(sock, jid, m, 'warn', 'No puedes banear al dueño.'); return true }
    if (cmd === 'ban') { settings.ban(id); await say(sock, jid, m, 'ok', `Usuario ${settings.digits(id)} baneado: el bot ya no le responde.`) }
    else await say(sock, jid, m, 'ok', settings.unban(id) ? `Usuario ${settings.digits(id)} desbaneado.` : 'Ese usuario no estaba baneado.')
    return true
  }

  if (cmd === 'reiniciar') {
    await say(sock, jid, m, 'wait', 'Reiniciando... vuelvo en un momento.')
    // Código distinto de 0: así Railway lo reinicia solo.
    setTimeout(() => process.exit(1), 1500)
    return true
  }
  return false
}

module.exports.isOwner = isOwner
