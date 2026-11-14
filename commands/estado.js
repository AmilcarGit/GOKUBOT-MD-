const cfg = require('../config')
const T = require('../lib/theme')
const S = require('../lib/status')

// .estado: tarjeta con el estado del bot que se actualiza sola (editando el mismo mensaje).
const FRAMES = 6          // cuántas veces se actualiza
const INTERVAL = 4000     // milisegundos entre actualizaciones
const COOLDOWN = 20000    // espera mínima entre usos en el mismo chat

const live = new Map()    // chat -> { until }: evita varios monitoreos a la vez

const COMMANDS = new Set(['estado', 'status', 'botstatus'])
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function render(s, ping, frame, total) {
  const ramPct = s.rss / s.sysTotal
  const heapPct = s.heapTotal ? s.heapUsed / s.heapTotal : 0
  const online = s.connection === 'open'
  const lines = [
    `${online ? '🟢' : '🔴'} *Conexión:* ${online ? 'En línea' : 'Reconectando'}`,
    `🏓 *Ping:* ${ping} ms ${ping < 400 ? '⚡' : ping < 1000 ? '🟡' : '🔴'}`,
    `⏱️ *Activo:* ${S.duration(s.uptime)}`,
    s.connectedFor ? `🔗 *Conectado hace:* ${S.duration(s.connectedFor)}` : null,
    '',
    `🧠 *CPU:* ${s.cpu.toFixed(1)}%  ${S.bar(s.cpu / 100)}`,
    `💾 *RAM:* ${S.bytes(s.rss)} / ${S.bytes(s.sysTotal)}  ${S.bar(ramPct)}`,
    `📦 *Heap:* ${S.bytes(s.heapUsed)} / ${S.bytes(s.heapTotal)}  ${S.bar(heapPct)}`,
    `⏳ *Retraso interno:* ${s.lag.toFixed(1)} ms`,
    s.disk ? `💽 *Disco libre:* ${S.bytes(s.disk.free)} de ${S.bytes(s.disk.total)}` : null,
    '',
    `📨 *Mensajes:* ${s.messages}   ⚙️ *Comandos:* ${s.commands}`,
    s.top.length ? `🔥 *Más usados:* ${s.top.map(([name, n]) => `${cfg.prefix}${name} (${n})`).join(', ')}` : null,
    `🔄 *Reconexiones:* ${s.reconnects}   ⚠️ *Errores:* ${s.errors}`,
    s.lastError ? `🧊 *Último error:* ${s.lastError}` : null,
    '',
    `👥 *Jugadores RPG:* ${s.players}`,
    `🔐 *Sesión guardada:* ${s.sessionSaved ? '✅' : '❌'}`,
    `🔑 *YuiAPI:* ${cfg.yuiKey ? '✅' : '❌'}   *API multimedia:* ${cfg.apiKey ? '✅' : '➖'}`,
    '',
    `🖥️ *Servidor:* ${s.host}${s.commit ? ` • ${s.commit}` : ''}`,
    `🟩 *Node:* ${s.node} • ${s.platform} • ${s.cores} núcleo${s.cores === 1 ? '' : 's'}`,
    `🎨 *Tema:* ${T.theme.name} • 🔰 *Prefijo:* ${cfg.prefix}`,
    '',
    frame < total
      ? `🔄 _Actualizando en vivo (${frame}/${total})..._`
      : `⏹️ _Monitoreo finalizado. Escribe ${cfg.prefix}estado para verlo otra vez._`
  ]
  return T.card('Estado del Bot', lines.filter(line => line !== null))
}

async function monitor(sock, jid, m, chatKey) {
  try {
    let t0 = Date.now()
    const sent = await sock.sendMessage(jid, { text: render(S.snapshot(), 0, 1, FRAMES) }, { quoted: m })
    let ping = Date.now() - t0
    if (!sent || !sent.key) return

    for (let frame = 2; frame <= FRAMES; frame++) {
      await wait(INTERVAL)
      const snap = S.snapshot()
      t0 = Date.now()
      // El ping real es lo que tarda WhatsApp en aceptar la edición del mensaje.
      await sock.sendMessage(jid, { text: render(snap, ping, frame, FRAMES), edit: sent.key })
      ping = Date.now() - t0
    }
  } catch (error) {
    console.error('[estado] monitoreo detenido:', error.message)
  } finally {
    live.delete(chatKey)
  }
}

module.exports = async function (sock, m, jid, cmd) {
  if (!COMMANDS.has(cmd)) return false

  const active = live.get(jid)
  if (active && Date.now() < active.until) {
    const seconds = Math.ceil((active.until - Date.now()) / 1000)
    await sock.sendMessage(jid, { text: T.msg('wait', `Ya hay un monitoreo en vivo en este chat. Espera ${seconds}s.`) }, { quoted: m })
    return true
  }

  live.set(jid, { until: Date.now() + FRAMES * INTERVAL + COOLDOWN })
  // No se espera: el monitoreo sigue en segundo plano y no bloquea otros mensajes.
  monitor(sock, jid, m, jid)
  return true
}
