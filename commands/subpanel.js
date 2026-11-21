'use strict'
// Panel y personalización de subbots (para su dueño) + herramientas del dueño del bot principal.
const T = require('../lib/theme')
const subs = require('../lib/subbots')
const scenes = require('../lib/scenes2')
const { isOwner } = require('./dueno')

const OWNER_CMDS = new Set(['avisosub', 'bansub', 'unbansub', 'limitesub', 'usosub', 'reiniciarsub', 'pausarsub'])
const MINE_CMDS = new Set(['mibot', 'configbot', 'miprefijo', 'mibienvenida', 'miia', 'mipersona', 'pausarbot', 'reanudarbot', 'reiniciarbot'])
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })
const pretty = n => '+' + n.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, '$1 $2 $3 $4')
const upFmt = since => { if (!since) return ''; const min = Math.floor((Date.now() - since) / 60000); return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m` }

async function handler(sock, m, jid, cmd, text, prefix) {
  const owner = OWNER_CMDS.has(cmd) || MINE_CMDS.has(cmd) ? await isOwner(sock, m) : false

  // ───────── Herramientas del dueño del bot ─────────
  if (OWNER_CMDS.has(cmd)) {
    if (!owner || sock.isSub) { await say(sock, jid, m, 'warn', 'Solo el dueño del bot principal puede usar este comando.'); return true }
    const num = subs.digits(text)
    if (cmd === 'usosub') {
      const rows = subs.usage()
      await say(sock, jid, m, 'info', rows.length ? '📊 *USO DE SUBBOTS*\n\n' + rows.map(x => `• ${pretty(x.number)} — ${x.state}\n   💬 ${x.messages} mensajes · ⚙️ ${x.commands} comandos${x.top.length ? '\n   🔝 ' + x.top.map(t => `${t[0]} (${t[1]})`).join(', ') : ''}`).join('\n\n') : 'No hay subbots.')
    } else if (cmd === 'avisosub') {
      if (!text.trim()) { await say(sock, jid, m, 'info', `Uso: ${prefix}avisosub <mensaje para todos los dueños de subbots>`); return true }
      const n = await subs.broadcast('📣 *Aviso del administrador*\n\n' + text.trim().slice(0, 800), (to, msg) => sock.sendMessage(to, { text: msg }))
      await say(sock, jid, m, 'ok', `Aviso enviado a ${n} dueño(s) de subbots.`)
    } else if (cmd === 'limitesub') {
      const n = Number(text)
      if (!Number.isFinite(n) || n < 0) { await say(sock, jid, m, 'info', `Uso: ${prefix}limitesub <0-20>\nActual: ${subs.max()}`); return true }
      await say(sock, jid, m, 'ok', `Límite de subbots: ${await subs.setMax(n)}.`)
    } else if (cmd === 'bansub' || cmd === 'unbansub') {
      if (!num) { await say(sock, jid, m, 'info', `Uso: ${prefix}${cmd} <número con código de país>\nBaneados: ${subs.banned().join(', ') || 'ninguno'}`); return true }
      if (cmd === 'bansub') await subs.ban(num); else await subs.unban(num)
      await say(sock, jid, m, 'ok', cmd === 'bansub' ? `${pretty(num)} baneado: no puede tener subbot.` : `${pretty(num)} ya puede crear subbots.`)
    } else {
      const target = subs.get(num)
      if (!target) { await say(sock, jid, m, 'info', `Uso: ${prefix}${cmd} <número del subbot>`); return true }
      if (cmd === 'reiniciarsub') await say(sock, jid, m, (await subs.restart(num)) ? 'ok' : 'err', `Subbot ${pretty(num)} reiniciado.`)
      else { const paused = !target.cfg?.paused; await subs.setting(num, 'paused', paused || null); await say(sock, jid, m, 'ok', `Subbot ${pretty(num)} ${paused ? 'pausado' : 'reanudado'}.`) }
    }
    return true
  }

  if (!MINE_CMDS.has(cmd)) return false

  // ───────── Panel del dueño del subbot (se usa desde el subbot o desde el bot principal) ─────────
  const who = await sock.getSender(m).catch(() => ({}))
  const ids = [who.number, who.id, m.key.participant || m.key.remoteJid].map(subs.digits).filter(Boolean)
  const mine = subs.list().filter(s => ids.includes(subs.digits(s.owner)) || ids.includes(s.number))
  const target = sock.isSub ? subs.list().find(s => s.number === sock.subNumber) : mine[0]
  if (!target) { await say(sock, jid, m, 'info', `No tienes un subbot. Crea uno con ${prefix}serbot.`); return true }
  // Dentro de un subbot solo manda quien lo vinculó (o el dueño del bot principal).
  const allowed = !sock.isSub || m.key.fromMe || owner || mine.some(s => s.number === target.number)
  if (!allowed) { await say(sock, jid, m, 'warn', 'Solo el dueño de este subbot puede cambiar su configuración.'); return true }
  const n = target.number

  if (cmd === 'mibot') {
    const st = subs.usage().find(x => x.number === n)
    await sock.sendMessage(jid, {
      image: scenes.subStats({ label: pretty(n), state: target.state, uptime: target.state === 'conectado' ? upFmt(target.since) : '', messages: st.messages, commands: st.commands, top: st.top }).toPNG(),
      caption: `🛰️ *Panel de tu subbot*\nPrefijo: *${target.cfg.prefix || prefix}* · IA: *${target.cfg.ai === false ? 'apagada' : 'encendida'}* · Bienvenida: *${target.cfg.welcome ? 'activa' : 'no'}*`
    }, { quoted: m })
    await sock.sendMessage(jid, {
      text: 'Control rápido:', footer: 'Toca un botón',
      buttons: [{ id: `${prefix}configbot`, text: '⚙️ Configuración' }, { id: `${prefix}${target.cfg.paused ? 'reanudarbot' : 'pausarbot'}`, text: target.cfg.paused ? '▶️ Reanudar' : '⏸️ Pausar' }, { id: `${prefix}reiniciarbot`, text: '🔄 Reiniciar' }]
    }, { quoted: m }).catch(() => {})
  } else if (cmd === 'configbot') {
    await say(sock, jid, m, 'info', `⚙️ *CONFIGURACIÓN DE TU SUBBOT*\n\n• ${prefix}miprefijo <símbolo> — ahora: ${target.cfg.prefix || prefix}\n• ${prefix}mibienvenida <texto|off> — usa {usuario}\n• ${prefix}miia on/off — IA en privado: ${target.cfg.ai === false ? 'off' : 'on'}\n• ${prefix}mipersona <texto|reset> — personalidad de tu IA\n• ${prefix}pausarbot / ${prefix}reanudarbot\n• ${prefix}reiniciarbot\n• ${prefix}borrarsubbot`)
  } else if (cmd === 'miprefijo') {
    const p = text.trim()
    if (!/^[.!#$%&\/+\-*~?]$/.test(p)) { await say(sock, jid, m, 'info', `Usa un solo símbolo: . ! # $ % & / + - * ~ ?\nEjemplo: ${prefix}miprefijo !`); return true }
    await subs.setting(n, 'prefix', p)
    await say(sock, jid, m, 'ok', `Prefijo cambiado a *${p}*. Ahora usa ${p}menu`)
  } else if (cmd === 'mibienvenida') {
    const t = text.trim()
    if (!t) { await say(sock, jid, m, 'info', `Uso: ${prefix}mibienvenida ¡Bienvenido {usuario}!\nPara apagarla: ${prefix}mibienvenida off`); return true }
    if (/^off$/i.test(t)) { await subs.setting(n, 'welcome', null); await say(sock, jid, m, 'ok', 'Bienvenida apagada.') }
    else { await subs.setting(n, 'welcome', t.slice(0, 400)); await say(sock, jid, m, 'ok', 'Bienvenida guardada. Se envía cuando alguien entra a un grupo donde está tu subbot.') }
  } else if (cmd === 'miia') {
    const on = /^(on|si|sí|1)$/i.test(text.trim()), off = /^(off|no|0)$/i.test(text.trim())
    if (!on && !off) { await say(sock, jid, m, 'info', `Uso: ${prefix}miia on/off`); return true }
    await subs.setting(n, 'ai', on ? null : false)
    await say(sock, jid, m, 'ok', `IA en privado ${on ? 'encendida' : 'apagada'} en tu subbot.`)
  } else if (cmd === 'mipersona') {
    const t = text.trim()
    if (!t) { await say(sock, jid, m, 'info', `Uso: ${prefix}mipersona Eres un bot alegre que habla como pirata\nPara volver al original: ${prefix}mipersona reset`); return true }
    if (/^reset$/i.test(t)) { await subs.setting(n, 'persona', null); await say(sock, jid, m, 'ok', 'Personalidad restablecida (Goku).') }
    else { await subs.setting(n, 'persona', t.slice(0, 500)); await say(sock, jid, m, 'ok', 'Personalidad guardada. Pruébala escribiéndole a tu subbot por privado.') }
  } else if (cmd === 'pausarbot' || cmd === 'reanudarbot') {
    const pause = cmd === 'pausarbot'
    await subs.setting(n, 'paused', pause || null)
    await say(sock, jid, m, 'ok', pause ? `Subbot pausado. Para despertarlo usa ${prefix}reanudarbot (también desde el bot principal).` : 'Subbot reanudado.')
  } else if (cmd === 'reiniciarbot') {
    await say(sock, jid, m, 'wait', 'Reiniciando tu subbot...')
    await say(sock, jid, m, (await subs.restart(n)) ? 'ok' : 'err', 'Listo, se está reconectando.').catch(() => {})
  }
  return true
}

module.exports = handler
