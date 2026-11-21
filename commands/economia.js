'use strict'
// Economía: banco con interés, trabajos, robos con riesgo y un mercado de objetos con ventajas.
const T = require('../lib/theme')
const store = require('../lib/store')

const COMMANDS = new Set(['banco', 'cartera', 'depositar', 'retirar', 'trabajar', 'robar', 'mercado', 'adquirir', 'mochila'])
const WORK_CD = 45 * 60000, ROB_CD = 30 * 60000
const INTEREST = 0.01, INTEREST_CAP = 200, INTEREST_DAYS = 5   // 1% diario, máx. 200 por día, hasta 5 días acumulados
const db = store.open('economia.json', {})
const say = (sock, jid, m, kind, text, extra) => sock.sendMessage(jid, { text: T.msg(kind, text), ...extra }, { quoted: m })
const digits = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')
const fmt = n => Math.floor(n).toLocaleString('es-PE')
const left = ms => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s` }
const rpg = () => require('./goku/rpg')

const ITEMS = {
  escudo:  { name: 'Escudo de ki', price: 300, hours: 12, desc: 'Nadie puede robarte durante 12 horas' },
  llave:   { name: 'Ganzúa maestra', price: 250, uses: 1, desc: '+20% de éxito en tu próximo robo' },
  amuleto: { name: 'Amuleto del trabajador', price: 450, hours: 24, desc: '+15% de paga al trabajar durante 24 horas' }
}
const JOBS = ['repartiste cápsulas por Ciudad Capital', 'entrenaste a un grupo de aprendices', 'cazaste dinosaurios para el restaurante', 'reparaste una nave en Capsule Corp.',
  'ayudaste en el torneo como árbitro', 'recolectaste semillas del ermitaño', 'protegiste un convoy de los Esbirros del Vacío', 'cocinaste ramen para cien guerreros']

function account(id) {
  const rec = db.data[id] ||= { bank: 0, interestDay: store.today(), workAt: 0, robAt: 0, items: {} }
  // Interés diario del banco (se calcula al consultar: días transcurridos, tope de días acumulados).
  const days = Math.min(INTEREST_DAYS, Math.max(0, Math.round((Date.parse(store.today()) - Date.parse(rec.interestDay)) / 86400000)))
  if (days > 0) { if (rec.bank > 0) rec.bank += Math.min(INTEREST_CAP * days, Math.floor(rec.bank * INTEREST * days)); rec.interestDay = store.today() }
  return rec
}
const active = (rec, key) => (rec.items[key] || 0) > Date.now()

async function me(sock, m) {
  const who = await sock.getSender(m).catch(() => ({}))
  const id = m.key.participant || m.key.remoteJid
  return { id, name: m.pushName || digits(id), ids: [...new Set([who.id, who.number, id].map(digits).filter(Boolean))] }
}
// Busca al jugador del RPG por su número (las menciones pueden venir en otro formato de id).
function playerOf(jid) {
  const r = rpg(); const d = digits(jid)
  const id = r.admin.find(d) || jid
  return { id, name: r.admin.get(id).name }
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const u = await me(sock, m)
  const r = rpg()
  const st = r.statsFor(u.id, u.name)
  const acc = account(u.id)
  const now = Date.now()

  if (cmd === 'banco' || cmd === 'cartera') {
    const effects = [active(acc, 'escudo') && `🛡️ Escudo ${left(acc.items.escudo - now)}`, active(acc, 'amuleto') && `🍀 Amuleto ${left(acc.items.amuleto - now)}`, acc.items.llave > 0 && `🗝️ Ganzúa x${acc.items.llave}`].filter(Boolean)
    await sock.sendMessage(jid, {
      text: T.msg('info', `🏦 *BANCO DE ${st.name.toUpperCase()}*\n\n👛 Cartera: *${fmt(st.coins)}* Zenis\n🏛️ Banco: *${fmt(acc.bank)}* Zenis (interés ${INTEREST * 100}% diario)\n💎 Total: *${fmt(st.coins + acc.bank)}*${effects.length ? '\n\n' + effects.join('\n') : ''}\n\n_Lo guardado en el banco no se puede robar._`),
      footer: 'Toca un botón',
      buttons: [{ id: `${prefix}trabajar`, text: '💼 Trabajar' }, { id: `${prefix}depositar todo`, text: '🏛️ Depositar todo' }, { id: `${prefix}mercado`, text: '🛒 Mercado' }]
    }, { quoted: m })
    await db.save(); return true
  }

  if (cmd === 'depositar' || cmd === 'retirar') {
    const dep = cmd === 'depositar'
    const arg = text.trim().toLowerCase()
    const amount = arg === 'todo' || arg === 'all' ? (dep ? st.coins : acc.bank) : Math.floor(Number(arg))
    if (!Number.isFinite(amount) || amount <= 0) { await say(sock, jid, m, 'info', `Uso: ${prefix}${cmd} <cantidad|todo>`); return true }
    if (dep ? amount > st.coins : amount > acc.bank) { await say(sock, jid, m, 'err', dep ? 'No tienes tantos Zenis en la cartera.' : 'No tienes tantos Zenis en el banco.'); return true }
    await r.adjustCoins(u.id, u.name, dep ? -amount : amount)
    acc.bank += dep ? amount : -amount
    await db.save()
    await say(sock, jid, m, 'ok', `${dep ? '🏛️ Depositaste' : '👛 Retiraste'} *${fmt(amount)}* Zenis.\nCartera: ${fmt(st.coins + (dep ? -amount : amount))} · Banco: ${fmt(acc.bank)}`)
    return true
  }

  if (cmd === 'trabajar') {
    const wait = WORK_CD - (now - acc.workAt)
    if (wait > 0) { await say(sock, jid, m, 'wait', `Estás cansado. Vuelve a trabajar en ${left(wait)}.`); return true }
    let pay = 70 + Math.floor(Math.random() * 90) + st.level * 3
    const bonus = active(acc, 'amuleto')
    if (bonus) pay = Math.round(pay * 1.15)
    acc.workAt = now
    await r.adjustCoins(u.id, u.name, pay)
    await db.save()
    await sock.sendMessage(jid, { text: T.msg('ok', `💼 ${u.name} ${JOBS[Math.floor(Math.random() * JOBS.length)]}.\n\n💰 +${pay} Zenis${bonus ? ' (con amuleto 🍀)' : ''}`), footer: 'Vuelve en 45 min', buttons: [{ id: `${prefix}banco`, text: '🏦 Mi banco' }] }, { quoted: m })
    return true
  }

  if (cmd === 'robar') {
    if (!jid.endsWith('@g.us')) { await say(sock, jid, m, 'info', 'Solo puedes robar en grupos.'); return true }
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const raw = ctx?.mentionedJid?.[0] || ctx?.participant
    if (!raw) { await say(sock, jid, m, 'info', `Menciona a tu víctima.\nEjemplo: ${prefix}robar @usuario`); return true }
    if (u.ids.includes(digits(raw))) { await say(sock, jid, m, 'warn', 'No puedes robarte a ti mismo.'); return true }
    const wait = ROB_CD - (now - acc.robAt)
    if (wait > 0) { await say(sock, jid, m, 'wait', `La policía te vigila. Espera ${left(wait)}.`); return true }
    const v = playerOf(raw)
    const vs = r.statsFor(v.id, v.name), vacc = account(v.id)
    if (vs.coins < 100) { await say(sock, jid, m, 'info', `${vs.name} tiene muy poco en la cartera (menos de 100). No vale la pena.`); return true }
    acc.robAt = now
    if (active(vacc, 'escudo')) {
      const fine = Math.min(st.coins, Math.max(20, Math.floor(st.coins * 0.05)))
      if (fine) { await r.adjustCoins(u.id, u.name, -fine) }
      await db.save()
      await say(sock, jid, m, 'warn', `🛡️ ${vs.name} tiene un escudo de ki. ¡Saliste volando y pagaste ${fine} Zenis de multa!`)
      return true
    }
    let chance = 0.45
    if ((acc.items.llave || 0) > 0) { chance += 0.2; acc.items.llave--; if (acc.items.llave <= 0) delete acc.items.llave }
    if (Math.random() < chance) {
      const loot = Math.min(400, Math.max(30, Math.floor(vs.coins * (0.1 + Math.random() * 0.15))))
      await r.adjustCoins(v.id, v.name, -loot); await r.adjustCoins(u.id, u.name, loot)
      await db.save()
      await sock.sendMessage(jid, { text: T.msg('ok', `🥷 ¡${u.name} le robó *${loot}* Zenis a ${vs.name}!\n\n💡 Guarda tu dinero en el banco para que no te roben.`), mentions: [raw] }, { quoted: m })
    } else {
      const fine = Math.min(st.coins, Math.max(20, Math.floor(st.coins * 0.08)))
      if (fine) { await r.adjustCoins(u.id, u.name, -fine); await r.adjustCoins(v.id, v.name, fine) }
      await db.save()
      await sock.sendMessage(jid, { text: T.msg('warn', `🚔 ¡${u.name} fue atrapado! Paga *${fine}* Zenis de multa a ${vs.name}.`), mentions: [raw] }, { quoted: m })
    }
    return true
  }

  if (cmd === 'mercado') {
    await sock.sendMessage(jid, {
      text: T.msg('info', `🛒 *MERCADO DE OBJETOS*\n\n${Object.entries(ITEMS).map(([id, i]) => `• *${i.name}* — ${i.price} Zenis\n  ${i.desc}`).join('\n\n')}\n\n💰 Tu cartera: ${fmt(st.coins)} Zenis`),
      footer: 'Abre la cajita para comprar',
      buttons: [{ text: '🛒 Comprar', sections: [{ title: 'Objetos', rows: Object.entries(ITEMS).map(([id, i]) => ({ title: `${i.name} (${i.price})`, description: i.desc, id: `${prefix}adquirir ${id}` })) }] }]
    }, { quoted: m })
    return true
  }

  if (cmd === 'adquirir') {
    const item = ITEMS[text.trim().toLowerCase()]
    if (!item) { await say(sock, jid, m, 'info', `Usa ${prefix}mercado para ver los objetos.`); return true }
    if ((await r.adjustCoins(u.id, u.name, -item.price)) === null) { await say(sock, jid, m, 'err', `Necesitas ${item.price} Zenis.`); return true }
    const key = Object.keys(ITEMS).find(k => ITEMS[k] === item)
    if (item.hours) acc.items[key] = Math.max(now, acc.items[key] || 0) + item.hours * 3600000
    else acc.items[key] = (acc.items[key] || 0) + item.uses
    await db.save()
    await say(sock, jid, m, 'ok', `🛍️ Compraste *${item.name}*.\n${item.desc}`)
    return true
  }

  if (cmd === 'mochila') {
    const lines = [active(acc, 'escudo') && `🛡️ Escudo de ki — ${left(acc.items.escudo - now)}`, active(acc, 'amuleto') && `🍀 Amuleto del trabajador — ${left(acc.items.amuleto - now)}`, acc.items.llave > 0 && `🗝️ Ganzúa maestra x${acc.items.llave}`].filter(Boolean)
    await say(sock, jid, m, 'info', lines.length ? `🎒 *OBJETOS ACTIVOS*\n\n${lines.join('\n')}` : `Tu mochila está vacía. Mira el ${prefix}mercado.`)
    return true
  }
  return true
}

module.exports = handler
