'use strict'
// Herramientas de imagen y audio: filtros, memes y efectos de voz (todo local con ffmpeg).
const T = require('../lib/theme')
const { Canvas, clamp } = require('../lib/canvas')
const video = require('../lib/video')

const MAX_BYTES = 25 * 1024 * 1024
const COOLDOWN = 6000
const last = new Map()

const SCALE = "scale='min(1024,iw)':-2"
const IMAGE_FILTERS = {
  bn: 'hue=s=0',
  negativo: 'negate',
  espejo: 'hflip',
  blur: 'gblur=sigma=10',
  pixelar: 'scale=trunc(iw/24):trunc(ih/24),scale=iw*24:ih*24:flags=neighbor'
}
const AUDIO_FILTERS = {
  rapido: 'atempo=1.5',
  lento: 'atempo=0.75',
  ardilla: 'asetrate=44100*1.45,aresample=44100,atempo=0.6897',
  grave: 'asetrate=44100*0.75,aresample=44100,atempo=1.3333',
  eco: 'aecho=0.8:0.88:60:0.4'
}
const COMMANDS = new Set(['meme', 'mp3', ...Object.keys(IMAGE_FILTERS), ...Object.keys(AUDIO_FILTERS)])

const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

// Busca el archivo en el propio mensaje o en el mensaje al que se responde.
async function getMedia(sock, m, kinds) {
  const { downloadMediaMessage } = await import('@yui-bails/yui-bails')
  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  for (const [holder, message] of [[m, m.message], [{ key: m.key }, quoted]]) {
    if (!message) continue
    for (const kind of kinds) {
      const part = message[kind]
      if (part) {
        if (Number(part.fileLength) > MAX_BYTES) throw Object.assign(new Error('BIG'), { code: 'BIG' })
        const buffer = await downloadMediaMessage({ key: holder.key, message }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage })
        return { buffer, kind }
      }
    }
  }
  return null
}

function memeImage(photo, top, bottom) {
  const c = new Canvas(512, 512)
  c.blit(photo, 512, 512, 0, 0)
  const draw = (str, y) => {
    if (!str) return
    const lines = []
    let line = ''
    for (const word of str.trim().split(/\s+/)) {
      if ((line + ' ' + word).trim().length > 16) { lines.push(line); line = word } else line = (line + ' ' + word).trim()
    }
    if (line) lines.push(line)
    const shown = lines.slice(0, 3)
    const longest = Math.max(...shown.map(l => l.length), 1)
    const scale = clamp(Math.floor(480 / (longest * 6)), 3, 7)
    const h = shown.length * (8 * scale)
    shown.forEach((l, i) => {
      const yy = (y < 0 ? 512 - h - 14 : 14) + i * 8 * scale
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [2, 0], [-2, 0], [0, -2]]) {
        c.text(l, 256 + dx * scale * 0.4, yy + dy * scale * 0.4, { scale, align: 'center', color: [0, 0, 0], spacing: 1 })
      }
      c.text(l, 256, yy, { scale, align: 'center', color: [255, 255, 255], spacing: 1 })
    })
  }
  draw(top, 1)
  draw(bottom, -1)
  return c.toPNG()
}

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  const isImageCmd = cmd === 'meme' || cmd in IMAGE_FILTERS
  const need = isImageCmd ? ['imageMessage', 'stickerMessage'] : ['audioMessage', 'videoMessage']

  if (!video.hasFfmpeg()) { await say(sock, jid, m, 'err', 'Este servidor no tiene ffmpeg, no puedo procesar archivos.'); return true }
  if (cmd === 'meme' && !text.trim()) {
    await say(sock, jid, m, 'info', `Uso: envía o responde a una foto con\n${prefix}meme texto de arriba | texto de abajo`)
    return true
  }
  const wait = COOLDOWN - (Date.now() - (last.get(jid) || 0))
  if (wait > 0) { await say(sock, jid, m, 'wait', `Espera ${Math.ceil(wait / 1000)}s.`); return true }
  last.set(jid, Date.now())

  try {
    await video.exclusive(async () => {
      const media = await getMedia(sock, m, need)
      if (!media) {
        await say(sock, jid, m, 'info', isImageCmd ? `Envía una foto con ${prefix}${cmd} o responde a una foto.` : `Envía o responde a un audio o video con ${prefix}${cmd}.`)
        return
      }
      if (cmd === 'meme') {
        const [top, bottom] = text.split('|').map(x => x.trim())
        const photo = await video.decodeImage(media.buffer, 512)
        await sock.sendMessage(jid, { image: memeImage(photo, top, bottom), caption: '😂 Meme listo' }, { quoted: m })
      } else if (cmd in IMAGE_FILTERS) {
        const out = await video.convert(media.buffer, { ext: 'jpg', args: ['-frames:v', '1', '-vf', `${SCALE},${IMAGE_FILTERS[cmd]}`, '-q:v', '3'] })
        await sock.sendMessage(jid, { image: out, caption: `🎨 Filtro ${cmd}` }, { quoted: m })
      } else if (cmd === 'mp3') {
        const out = await video.convert(media.buffer, { ext: 'mp3', args: ['-vn', '-t', '600', '-c:a', 'libmp3lame', '-b:a', '128k'] })
        await sock.sendMessage(jid, { audio: out, mimetype: 'audio/mpeg' }, { quoted: m })
      } else {
        const out = await video.convert(media.buffer, { ext: 'ogg', args: ['-vn', '-t', '180', '-af', AUDIO_FILTERS[cmd], '-c:a', 'libopus', '-b:a', '48k', '-ar', '48000'] })
        await sock.sendMessage(jid, { audio: out, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
      }
    })
  } catch (error) {
    last.delete(jid)
    const kind = error.code === 'BUSY' ? 'wait' : 'err'
    const msg = error.code === 'BUSY' ? 'Estoy procesando otro archivo, intenta en unos segundos.'
      : error.code === 'BIG' ? 'Ese archivo es demasiado grande (máximo 25 MB).'
      : 'No pude procesar ese archivo. Prueba con otro.'
    if (error.code !== 'BUSY' && error.code !== 'BIG') console.error('[herramientas]', cmd, error.message)
    await say(sock, jid, m, kind, msg)
  }
  return true
}
