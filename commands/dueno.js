'use strict'
// Panel del dueño: IA on/off, anuncios a todos los grupos, baneos y reinicio.
const cfg = require('../config')
const T = require('../lib/theme')
const settings = require('../lib/settings')

// El ajuste guardado (si existe) manda sobre config.js.
if (typeof settings.data.aiPrivate === 'boolean') cfg.ai.private = settings.data.aiPrivate

const GIFTS = new Set(['dar', 'quitar', 'darxp', 'daresfera', 'darguerrero', 'jugador', 'resetjugador'])
const COMMANDS = new Set(['panel', 'ia', 'anuncio', 'ban', 'unban', 'reiniciar', 'miid', ...GIFTS])
const OWNER_ONLY = new Set(['panel', 'anuncio', 'ban', 'unban', 'reiniciar', ...GIFTS])
const MAX_GIFT = 10000000
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

// Destinatario de un regalo: mención, mensaje citado, número largo o, si no hay, el propio dueño.
function recipient(m, text) {
  const ctx = m.message?.extendedTextMessage?.contextInfo
  const explicit = ctx?.mentionedJid?.[0] || ctx?.participant
  if (explicit) return explicit
  const number = (text.match(/\d{9,}/) || [])[0]
  if (number) {
    const rpg = require('./goku/rpg')
    return rpg.admin.find(number) || `${number}@s.whatsapp.net`
  }
  return m.key.participant || m.key.remoteJid
}

// Quita menciones y números largos para quedarnos con los argumentos reales.
const args = text => text.replace(/@\d+/g, ' ').replace(/\d{9,}/g, ' ').trim().split(/\s+/).filter(Boolean)

async function gift(sock, m, jid, cmd, text, prefix) {
  const rpg = require('./goku/rpg')
  const who = recipient(m, text)
  const tag = `@${settings.digits(who)}`
  const [first] = args(text)
  const amount = Math.floor(Number(first))
  const announce = msg => sock.sendMessage(jid, { text: T.msg('ok', msg), mentions: [who] }, { quoted: m })
  const usage = {
    dar: `${prefix}dar <cantidad> [@usuario]`, quitar: `${prefix}quitar <cantidad> [@usuario]`, darxp: `${prefix}darxp <cantidad> [@usuario]`,
    daresfera: `${prefix}daresfera <1-7|todas> [@usuario]`, darguerrero: `${prefix}darguerrero <nombre|nº> [@usuario]`, resetjugador: `${prefix}resetjugador @usuario confirmar`
  }

  if (cmd === 'jugador') {
    const v = rpg.admin.view(who)
    await sock.sendMessage(jid, { text: T.msg('info', `👤 ${tag}\n🏷️ ${v.name} • nivel ${v.level} (${v.rank})\n⚡ Poder: ${v.power}\n💰 Zenis: ${v.coins}\n🐉 Esferas: ${v.balls}/7\n⚔️ Victorias: ${v.wins} • Derrotas: ${v.losses}`), mentions: [who] }, { quoted: m })
    return
  }
  if (cmd === 'resetjugador') {
    if (!/confirmar/i.test(text)) { await say(sock, jid, m, 'warn', `Esto borra todo el progreso RPG de ese jugador.\nUso: ${usage.resetjugador}`); return }
    await rpg.admin.reset(who)
    await announce(`Progreso RPG de ${tag} reiniciado.`)
    return
  }
  if (cmd === 'daresfera') {
    const which = /^todas?$/i.test(first || '') ? 'todas' : Math.floor(Number(first))
    if (which !== 'todas' && !(which >= 1 && which <= 7)) { await say(sock, jid, m, 'info', `Uso: ${usage.daresfera}`); return }
    const total = await rpg.admin.ball(who, which)
    await announce(`${tag} recibió ${which === 'todas' ? 'las 7 esferas' : `la esfera ${which}`} (${total}/7). ${total === 7 ? '🐉 ¡Ya puede invocar a Shenlong!' : ''}`)
    return
  }
  if (cmd === 'darguerrero') {
    const granted = require('./guerreros').grant(who, args(text).join(' '))
    if (!granted) { await say(sock, jid, m, 'info', `No encontré ese guerrero.\nUso: ${usage.darguerrero}\nLista: ${prefix}guerreros`); return }
    await announce(`${tag} recibió a ${granted.warrior.name} ${granted.count > 1 ? `(repetido x${granted.count})` : '(nuevo en su colección)'}.`)
    return
  }
  // dar, quitar, darxp
  if (!(amount >= 1) || amount > MAX_GIFT) { await say(sock, jid, m, 'info', `Cantidad entre 1 y ${MAX_GIFT}.\nUso: ${usage[cmd]}`); return }
  if (cmd === 'dar') await announce(`${tag} recibió ${amount} Zenis. 💰 Saldo: ${await rpg.admin.coins(who, amount)}`)
  else if (cmd === 'quitar') await announce(`A ${tag} se le quitaron ${amount} Zenis. 💰 Saldo: ${await rpg.admin.coins(who, -amount)}`)
  else {
    const r = await rpg.admin.xp(who, amount)
    await announce(`${tag} recibió ${amount} XP. ⭐ Nivel ${r.level}${r.levels ? ` (subió ${r.levels})` : ''}`)
  }
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

  if (GIFTS.has(cmd)) { await gift(sock, m, jid, cmd, text, prefix); return true }

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
