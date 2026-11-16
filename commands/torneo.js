'use strict'
// Torneo Tenkaichi en grupos: inscripción con botones, cuadro de eliminación en imagen y final animada.
const T = require('../lib/theme')
const store = require('../lib/store')
const scenes = require('../lib/scenes2')
const visual = require('./visual')

const COMMANDS = new Set(['torneo', 'unirme', 'empezar', 'cancelartorneo'])
const MAX_PLAYERS = 8, SIGNUP_MS = 120000
const db = store.open('torneos.json', { wins: {} })
const open = new Map() // grupo -> { host, players: Map(id -> name), timer, sock, m }
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })
const idOf = m => m.key.participant || m.key.remoteJid
const short = name => String(name).split(/\s+/)[0].slice(0, 11)
const num = id => id.split('@')[0].split(':')[0]

const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1])
const fight = (a, b) => {
  const score = x => Math.pow(Math.max(1, x.power), 1.2) * (0.6 + Math.random() * 0.8)
  return score(a) >= score(b) ? 0 : 1
}

async function run(sock, jid, m, state) {
  open.delete(jid)
  clearTimeout(state.timer)
  const rpg = require('./goku/rpg')
  const fighters = shuffle([...state.players].map(([id, name]) => ({ id, name, power: rpg.statsFor(id, name).power })))
  let size = 2; while (size < fighters.length) size *= 2
  const byes = size - fighters.length
  const slots = []
  for (let i = 0; i < size / 2; i++) slots.push(i < byes ? [fighters.pop(), null] : [fighters.pop(), fighters.pop()])
  const rounds = []
  let current = slots, lastMatch
  while (true) {
    const round = current.map(([a, b]) => {
      const w = b ? fight(a, b) : 0
      return { a, b, w }
    })
    rounds.push(round)
    if (round.length === 1) { lastMatch = round[0]; break }
    const winners = round.map(x => (x.w === 0 ? x.a : x.b))
    current = []
    for (let i = 0; i < winners.length; i += 2) current.push([winners[i], winners[i + 1]])
  }
  const champ = lastMatch.w === 0 ? lastMatch.a : lastMatch.b
  const runner = lastMatch.w === 0 ? lastMatch.b : lastMatch.a
  const view = rounds.map(r => r.map(x => ({ a: short(x.a.name), b: x.b && short(x.b.name), w: x.w })))
  await sock.sendMessage(jid, { image: scenes.bracket(view, short(champ.name)).toPNG(), caption: '🏆 *CUADRO DEL TORNEO TENKAICHI*\nLa final se viene...' }, { quoted: m })

  const prize = 300 + 150 * state.players.size
  const caption = `🥇 ¡El campeón del Torneo Tenkaichi es @${num(champ.id)}!\n\n💰 Premio: *${prize} Zenis* + 100 XP\n🥈 Subcampeón: @${num(runner.id)} (+100 Zenis)\n🎟️ Los demás participantes ganan +30 Zenis.`
  const mentions = [champ.id, runner.id]
  const animated = await visual.sendDuel(sock, jid, m, {
    a: { name: short(lastMatch.a.name), power: lastMatch.a.power, hue: 200 },
    b: { name: short(lastMatch.b.name), power: lastMatch.b.power, hue: 20 },
    winner: lastMatch.w
  }, caption, mentions)
  const sent = animated ? null : await sock.sendMessage(jid, { text: caption, mentions }, { quoted: m })

  for (const [id, name] of state.players) {
    const delta = id === champ.id ? prize : id === runner.id ? 100 : 30
    await rpg.adjustCoins(id, name, delta)
  }
  await rpg.admin.xp(champ.id, 100)
  db.data.wins[champ.id] = (db.data.wins[champ.id] || 0) + 1
  await db.save()
  // Fija el mensaje del campeón en el grupo (necesita que el bot sea admin; si no, se ignora).
  if (sent?.key) sock.sendMessage(jid, { pin: sent.key, type: 1, time: 86400 }).catch(() => {})
  await sock.sendMessage(jid, { text: `🏅 ${short(champ.name)} ya suma *${db.data.wins[champ.id]}* torneo${db.data.wins[champ.id] > 1 ? 's' : ''} ganado${db.data.wins[champ.id] > 1 ? 's' : ''}.`, footer: '¿Otra ronda?', buttons: [{ id: '.torneo', text: '🏆 Nuevo torneo' }] }).catch(() => {})
}

async function begin(sock, jid, m, state) {
  if (state.players.size < 2) {
    open.delete(jid); clearTimeout(state.timer)
    await say(sock, jid, m, 'warn', 'El torneo se canceló: hacen falta al menos 2 guerreros.')
    return
  }
  await sock.sendMessage(jid, { text: `🥋 *¡COMIENZA EL TORNEO!*\n${[...state.players.values()].map(short).join(', ')}`, mentions: [...state.players.keys()] }, { quoted: m })
  await run(sock, jid, m, state)
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  if (!jid.endsWith('@g.us')) { await say(sock, jid, m, 'info', 'El torneo solo funciona en grupos.'); return true }
  const state = open.get(jid)

  if (cmd === 'torneo') {
    if (/^top$/i.test((text || '').trim())) {
      const rows = Object.entries(db.data.wins).sort((a, b) => b[1] - a[1]).slice(0, 5)
      await sock.sendMessage(jid, { text: rows.length ? `🏅 *CAMPEONES*\n\n${rows.map(([id, n], i) => `${i + 1}. @${num(id)} — ${n}`).join('\n')}` : 'Aún no hay campeones.', mentions: rows.map(r => r[0]) }, { quoted: m })
      return true
    }
    if (state) { await say(sock, jid, m, 'info', `Ya hay un torneo abierto (${state.players.size}/${MAX_PLAYERS}). Usa ${prefix}unirme.`); return true }
    if (!(await sock.isAdmin(jid, m))) { await say(sock, jid, m, 'warn', 'Solo los administradores pueden abrir un torneo.'); return true }
    const st = { players: new Map(), timer: null }
    open.set(jid, st)
    st.timer = setTimeout(() => { if (open.get(jid) === st) begin(sock, jid, m, st).catch(e => console.error('[torneo]', e.message)) }, SIGNUP_MS)
    await sock.sendMessage(jid, {
      text: `🏆 *TORNEO TENKAICHI*\n\nInscripciones abiertas por 2 minutos (máx. ${MAX_PLAYERS} guerreros).\nGana el que tenga más poder... ¡y suerte!\n\n💰 Premio: 300 Zenis + 150 por participante.`,
      footer: 'Un admin puede iniciar antes con el botón',
      buttons: [{ id: `${prefix}unirme`, text: '🥋 Inscribirme' }, { id: `${prefix}empezar`, text: '▶️ Iniciar (admin)' }, { id: `${prefix}torneo top`, text: '🏅 Campeones' }]
    }, { quoted: m })
    return true
  }

  if (!state) { await say(sock, jid, m, 'info', `No hay torneo abierto. Un admin puede abrirlo con ${prefix}torneo.`); return true }

  if (cmd === 'unirme') {
    const id = idOf(m)
    if (state.players.has(id)) { await say(sock, jid, m, 'info', 'Ya estás inscrito.'); return true }
    if (state.players.size >= MAX_PLAYERS) { await say(sock, jid, m, 'warn', 'El torneo está lleno.'); return true }
    state.players.set(id, m.pushName || num(id))
    sock.sendMessage(jid, { react: { text: '🥋', key: m.key } }).catch(() => {})
    await sock.sendMessage(jid, { text: `🥋 @${num(id)} se inscribió (${state.players.size}/${MAX_PLAYERS}).`, mentions: [id] }, { quoted: m })
    if (state.players.size >= MAX_PLAYERS) await begin(sock, jid, m, state)
    return true
  }

  if (!(await sock.isAdmin(jid, m))) { await say(sock, jid, m, 'warn', 'Solo los administradores pueden hacer eso.'); return true }
  if (cmd === 'empezar') await begin(sock, jid, m, state)
  else { clearTimeout(state.timer); open.delete(jid); await say(sock, jid, m, 'ok', 'Torneo cancelado.') }
  return true
}

module.exports = handler
