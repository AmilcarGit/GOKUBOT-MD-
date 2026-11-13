const cfg = require('../config')
const T = require('../lib/theme')

// Comandos generales: ping y owner. El menú vive en commands/goku/index.js.
module.exports = async function (sock, m, jid, cmd) {
  switch (cmd) {
    case 'ping': {
      const t = Date.now()
      await sock.sendMessage(jid, { text: T.msg('ok', `¡Pong! ${Date.now() - t}ms`) }, { quoted: m })
      return true
    }
    case 'owner': {
      if (!cfg.owner) { await sock.sendMessage(jid, { text: T.msg('warn', 'Configura BOT_OWNER en las variables del bot.') }, { quoted: m }); return true }
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${cfg.creator}\nTEL;type=CELL;waid=${cfg.owner}:+${cfg.owner}\nEND:VCARD`
      await sock.sendMessage(jid, { contacts: { displayName: cfg.creator, contacts: [{ vcard }] } }, { quoted: m })
      return true
    }
  }
  return false
}
