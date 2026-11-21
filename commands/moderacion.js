'use strict'
// Moderación de grupos: advertencias, expulsar, silenciar, antispam, reglas y panel con ajustes.
const T = require('../lib/theme')
const groups = require('../lib/groupdb')

const COMMANDS = new Set(['warn', 'unwarn', 'warns', 'kick', 'promover', 'degradar', 'cerrar', 'abrir', 'silenciar', 'desilenciar',
  'antispam', 'reglas', 'setreglas', 'admins', 'link', 'eliminar', 'moderar'])
const MAX_WARNS = 3
const SPAM_COUNT = 6, SPAM_WINDOW = 8000, SPAM_MUTE = 3 * 60000
const flood = new Map() // "grupo:usuario" -> marcas de tiempo
const digits = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')
const say = (sock, jid, m, kind, text, extra) => sock.sendMessage(jid, { text: T.msg(kind, text), ...extra }, { quoted: m })
const variants = p => [p.id, p.lid, p.phoneNumber].map(digits).filter(Boolean)
const isAdminP = p => p && (p.admin === 'admin' || p.admin === 'superadmin')

function setup(g) {
  g.warns ||= {}; g.muted ||= {}; g.antispam ||= false; g.rules ||= ''
  return g
}

// Objetivo de un comando: mención, respuesta a un mensaje o número escrito. Devuelve el participante del grupo.
async function targetOf(sock, m, jid, text) {
  const ctx = m.message?.extendedTextMessage?.contextInfo
  const raw = ctx?.mentionedJid?.[0] || ctx?.participant || (text.match(/\d{8,15}/) || [])[0]
  if (!raw) return null
  const want = digits(raw)
  const meta = await sock.groupMetadata(jid)
  const p = meta.participants.find(x => variants(x).includes(want))
  return p ? { p, meta } : { p: { id: String(raw).includes('@') ? raw : `${want}@s.whatsapp.net` }, meta }
}

const keyOf = p => digits(p.id)
const tag = p => '@' + digits(p.phoneNumber || p.id)

async function guard(sock, jid, m, needBot) {
  if (!jid.endsWith('@g.us')) { await say(sock, jid, m, 'warn', 'Este comando solo funciona en grupos.'); return false }
  if (!(await sock.isAdmin(jid, m))) { await say(sock, jid, m, 'warn', 'Solo los administradores pueden usar este comando.'); return false }
  if (needBot && !(await sock.isBotAdmin(jid))) { await say(sock, jid, m, 'warn', 'Necesito ser administrador del grupo para hacer eso. Hazme admin y vuelve a intentarlo.'); return false }
  return true
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  // Reglas, administradores y enlace pueden verlos todos.
  if (['reglas', 'admins', 'link'].includes(cmd)) {
    if (!jid.endsWith('@g.us')) { await say(sock, jid, m, 'warn', 'Este comando solo funciona en grupos.'); return true }
    const g = setup(groups.group(jid))
    if (cmd === 'reglas') {
      await say(sock, jid, m, g.rules ? 'info' : 'warn', g.rules ? `📜 *REGLAS DEL GRUPO*\n\n${g.rules}` : `Este grupo aún no tiene reglas. Un admin puede crearlas con ${prefix}setreglas <texto>.`)
    } else if (cmd === 'admins') {
      const meta = await sock.groupMetadata(jid)
      const ids = meta.participants.filter(isAdminP).map(p => p.id)
      await sock.sendMessage(jid, { text: `🛡️ *ADMINISTRADORES*\n\n${ids.map(id => '👑 @' + digits(id)).join('\n')}${text.trim() ? '\n\n📣 ' + text.trim() : ''}`, mentions: ids }, { quoted: m })
    } else {
      if (!(await sock.isAdmin(jid, m))) { await say(sock, jid, m, 'warn', 'Solo los administradores pueden pedir el enlace.'); return true }
      if (!(await sock.isBotAdmin(jid))) { await say(sock, jid, m, 'warn', 'Necesito ser administrador para ver el enlace del grupo.'); return true }
      const code = await sock.groupInviteCode(jid)
      const url = `https://chat.whatsapp.com/${code}`
      await sock.sendMessage(jid, { text: `🔗 *Enlace del grupo*\n${url}`, footer: 'Compártelo con cuidado', buttons: [{ text: '📋 Copiar enlace', copy: url }] }, { quoted: m })
    }
    return true
  }

  const needBot = ['kick', 'promover', 'degradar', 'cerrar', 'abrir', 'eliminar'].includes(cmd)
  if (!(await guard(sock, jid, m, needBot))) return true
  const g = setup(groups.group(jid))

  try {
    if (cmd === 'moderar') {
      const meta = await sock.groupMetadata(jid)
      const on = v => (v ? '✅' : '❌')
      await sock.sendMessage(jid, {
        text: `🛡️ *PANEL DE MODERACIÓN*\n\n${on(g.antilink)} Antilink\n${on(g.antispam)} Antispam\n${on(g.welcome)} Bienvenida\n${meta.announce ? '🔒' : '🔓'} Grupo ${meta.announce ? 'cerrado' : 'abierto'}\n⚠️ Con advertencias: ${Object.keys(g.warns).length}\n🔇 Silenciados: ${Object.values(g.muted).filter(t => t > Date.now()).length}`,
        footer: 'Abre la cajita para cambiar un ajuste',
        buttons: [{
          text: '⚙️ Ajustes', sections: [{ title: 'Moderación', rows: [
            { title: g.antilink ? 'Apagar antilink' : 'Activar antilink', description: 'Borra enlaces de no admins', id: `${prefix}antilink ${g.antilink ? 'off' : 'on'}` },
            { title: g.antispam ? 'Apagar antispam' : 'Activar antispam', description: 'Silencia a quien inunde el chat', id: `${prefix}antispam ${g.antispam ? 'off' : 'on'}` },
            { title: g.welcome ? 'Apagar bienvenida' : 'Activar bienvenida', description: 'Imagen al entrar/salir', id: `${prefix}bienvenida ${g.welcome ? 'off' : 'on'}` },
            { title: meta.announce ? 'Abrir grupo' : 'Cerrar grupo', description: meta.announce ? 'Todos pueden escribir' : 'Solo admins escriben', id: `${prefix}${meta.announce ? 'abrir' : 'cerrar'}` },
            { title: 'Ver advertencias', description: 'Miembros advertidos', id: `${prefix}warns` },
            { title: 'Ver reglas', description: 'Reglas del grupo', id: `${prefix}reglas` }
          ] }]
        }]
      }, { quoted: m })
    } else if (cmd === 'antispam') {
      const a = text.trim().toLowerCase()
      if (!['on', 'off'].includes(a)) { await say(sock, jid, m, 'info', `Antispam: ${g.antispam ? 'activado ✅' : 'desactivado ❌'}\nUso: ${prefix}antispam on | off`); return true }
      if (a === 'on' && !(await sock.isBotAdmin(jid))) { await say(sock, jid, m, 'warn', 'Para borrar mensajes necesito ser administrador. Hazme admin y vuelve a activarlo.'); return true }
      g.antispam = a === 'on'; groups.save()
      await say(sock, jid, m, 'ok', `Antispam ${g.antispam ? `activado: quien envíe ${SPAM_COUNT} mensajes en ${SPAM_WINDOW / 1000} s queda silenciado ${SPAM_MUTE / 60000} min` : 'desactivado'}.`)
    } else if (cmd === 'setreglas') {
      if (!text.trim()) { await say(sock, jid, m, 'info', `Uso: ${prefix}setreglas <texto de las reglas>`); return true }
      g.rules = text.trim().slice(0, 1200); groups.save()
      await say(sock, jid, m, 'ok', `Reglas guardadas. Cualquiera las ve con ${prefix}reglas.`)
    } else if (cmd === 'cerrar' || cmd === 'abrir') {
      await sock.groupSettingUpdate(jid, cmd === 'cerrar' ? 'announcement' : 'not_announcement')
      await say(sock, jid, m, 'ok', cmd === 'cerrar' ? '🔒 Grupo cerrado: solo los administradores pueden escribir.' : '🔓 Grupo abierto: todos pueden escribir.')
    } else if (cmd === 'eliminar') {
      const ctx = m.message?.extendedTextMessage?.contextInfo
      if (!ctx?.stanzaId) { await say(sock, jid, m, 'info', `Responde al mensaje que quieres borrar con ${prefix}eliminar.`); return true }
      await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant } })
    } else {
      const t = await targetOf(sock, m, jid, text)
      if (!t) { await say(sock, jid, m, 'info', `Menciona a alguien o responde a su mensaje.\nEjemplo: ${prefix}${cmd} @usuario`); return true }
      const { p } = t
      const protect = isAdminP(p) && ['warn', 'kick', 'silenciar', 'degradar'].includes(cmd) && cmd !== 'degradar'
      if (protect) { await say(sock, jid, m, 'warn', 'No puedo aplicar eso a un administrador. Primero quítale el rango con ' + prefix + 'degradar.'); return true }
      if (digits(p.id) === digits(sock.user?.id) || digits(p.id) === digits(sock.user?.lid)) { await say(sock, jid, m, 'warn', 'Eso no se puede hacer con el bot.'); return true }
      const key = keyOf(p), mention = [p.id]

      if (cmd === 'kick') {
        await sock.groupParticipantsUpdate(jid, [p.id], 'remove')
        await say(sock, jid, m, 'ok', `🥾 ${tag(p)} fue expulsado del grupo.`, { mentions: mention })
      } else if (cmd === 'promover' || cmd === 'degradar') {
        await sock.groupParticipantsUpdate(jid, [p.id], cmd === 'promover' ? 'promote' : 'demote')
        await say(sock, jid, m, 'ok', cmd === 'promover' ? `👑 ${tag(p)} ahora es administrador.` : `⬇️ ${tag(p)} ya no es administrador.`, { mentions: mention })
      } else if (cmd === 'warn') {
        const rec = g.warns[key] ||= { n: 0, reasons: [] }
        rec.n++; rec.reasons.push((text.replace(/@\d+|\d{8,15}/g, '').trim() || 'sin motivo').slice(0, 80)); groups.save()
        if (rec.n >= MAX_WARNS && (await sock.isBotAdmin(jid))) {
          delete g.warns[key]; groups.save()
          await sock.groupParticipantsUpdate(jid, [p.id], 'remove')
          await say(sock, jid, m, 'warn', `🚫 ${tag(p)} llegó a ${MAX_WARNS} advertencias y fue expulsado.`, { mentions: mention })
        } else {
          await sock.sendMessage(jid, {
            text: T.msg('warn', `⚠️ ${tag(p)} recibió una advertencia (${rec.n}/${MAX_WARNS}).\nMotivo: ${rec.reasons[rec.reasons.length - 1]}`), mentions: mention,
            footer: 'Solo administradores', buttons: [{ id: `${prefix}unwarn ${digits(p.phoneNumber || p.id)}`, text: '✅ Perdonar' }, { id: `${prefix}kick ${digits(p.phoneNumber || p.id)}`, text: '🥾 Expulsar' }]
          }, { quoted: m })
        }
      } else if (cmd === 'unwarn') {
        const rec = g.warns[key]
        if (!rec) { await say(sock, jid, m, 'info', `${tag(p)} no tiene advertencias.`, { mentions: mention }); return true }
        rec.n--; rec.reasons.pop(); if (rec.n <= 0) delete g.warns[key]; groups.save()
        await say(sock, jid, m, 'ok', `✅ Se quitó una advertencia a ${tag(p)}.`, { mentions: mention })
      } else if (cmd === 'warns') {
        await say(sock, jid, m, 'info', `${tag(p)} tiene ${g.warns[key]?.n || 0}/${MAX_WARNS} advertencias.`, { mentions: mention })
      } else if (cmd === 'silenciar') {
        const mins = Math.max(1, Math.min(1440, Number((text.match(/(?:^|\s)(\d{1,4})(?:\s|$)/) || [])[1]) || 10))
        if (!(await sock.isBotAdmin(jid))) { await say(sock, jid, m, 'warn', 'Para borrar sus mensajes necesito ser administrador.'); return true }
        for (const v of variants(p).length ? variants(p) : [key]) g.muted[v] = Date.now() + mins * 60000
        groups.save()
        await say(sock, jid, m, 'ok', `🔇 ${tag(p)} silenciado ${mins} min: borraré sus mensajes.`, { mentions: mention })
      } else if (cmd === 'desilenciar') {
        for (const v of variants(p).length ? variants(p) : [key]) delete g.muted[v]
        groups.save()
        await say(sock, jid, m, 'ok', `🔊 ${tag(p)} ya puede escribir.`, { mentions: mention })
      }
    }
  } catch (error) {
    console.error('[moderacion]', cmd, error.message)
    await say(sock, jid, m, 'err', 'WhatsApp rechazó la acción. Revisa que yo sea administrador y que la persona siga en el grupo.')
  }
  return true
}

// `.warns` sin objetivo: lista de advertidos (se maneja aquí para no exigir mención).
const baseHandler = handler
async function wrapped(sock, m, jid, cmd, text, prefix) {
  if (cmd === 'warns' && jid.endsWith('@g.us') && !m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length && !m.message?.extendedTextMessage?.contextInfo?.participant && !/\d{8,15}/.test(text)) {
    if (!(await guard(sock, jid, m, false))) return true
    const g = setup(groups.group(jid))
    const rows = Object.entries(g.warns)
    await sock.sendMessage(jid, {
      text: rows.length ? `⚠️ *ADVERTENCIAS*\n\n${rows.map(([k, r]) => `• @${k} — ${r.n}/${MAX_WARNS} (${r.reasons.slice(-1)[0]})`).join('\n')}` : '✅ Nadie tiene advertencias en este grupo.',
      mentions: rows.map(([k]) => `${k}@s.whatsapp.net`)
    }, { quoted: m })
    return true
  }
  return baseHandler(sock, m, jid, cmd, text, prefix)
}

// Cada mensaje de grupo: silencios y antispam. Devuelve true si el mensaje fue borrado.
async function enforce(sock, m, jid) {
  if (m.key.fromMe || !jid.endsWith('@g.us')) return false
  const g = groups.group(jid)
  const who = digits(m.key.participant)
  if (!who || (!g.antispam && !g.muted)) return false
  setup(g)
  const until = g.muted[who]
  if (until && until > Date.now()) {
    if (await sock.isAdmin(jid, m)) return false
    if (await sock.isBotAdmin(jid)) { await sock.sendMessage(jid, { delete: m.key }).catch(() => {}); return true }
    return false
  }
  if (until) { delete g.muted[who]; groups.save() }
  if (!g.antispam) return false
  const key = `${jid}:${who}`, now = Date.now()
  const marks = (flood.get(key) || []).filter(t => now - t < SPAM_WINDOW)
  marks.push(now); flood.set(key, marks)
  if (marks.length < SPAM_COUNT) return false
  flood.delete(key)
  if (await sock.isAdmin(jid, m) || !(await sock.isBotAdmin(jid))) return false
  g.muted[who] = now + SPAM_MUTE; groups.save()
  await sock.sendMessage(jid, { delete: m.key }).catch(() => {})
  await sock.sendMessage(jid, { text: T.msg('warn', `🚨 @${who} escribe demasiado rápido: silenciado ${SPAM_MUTE / 60000} min.`), mentions: [m.key.participant] }).catch(() => {})
  return true
}

module.exports = wrapped
module.exports.enforce = enforce
