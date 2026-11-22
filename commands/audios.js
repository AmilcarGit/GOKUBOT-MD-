'use strict'
// Audio real de Goku (archivo en assets/). Sale como audio normal en WhatsApp y con reproductor en la app.
const fs = require('fs')
const path = require('path')
const T = require('../lib/theme')

const FILE = path.join(__dirname, '..', 'assets', 'goku-audio.mp3')
const COMMANDS = new Set(['audiogoku', 'gokuaudio', 'vozgoku'])
const last = new Map()
let cache = null

module.exports = async function (sock, m, jid, cmd) {
  if (!COMMANDS.has(cmd)) return false
  if (Date.now() - (last.get(jid) || 0) < 4000) return true
  last.set(jid, Date.now())
  try {
    cache ||= await fs.promises.readFile(FILE)
    await sock.sendMessage(jid, { audio: cache, mimetype: 'audio/mpeg', fileName: 'Goku - Uno ya no puede estar tranquilo.mp3' }, { quoted: m })
  } catch (error) {
    console.error('[audios]', error.message)
    await sock.sendMessage(jid, { text: T.msg('err', 'No pude enviar el audio ahora.') }, { quoted: m })
  }
  return true
}
