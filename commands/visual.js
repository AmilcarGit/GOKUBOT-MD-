'use strict'
// Comandos visuales: imágenes, videos cortos y stickers animados generados por el propio bot.
const cfg = require('../config')
const T = require('../lib/theme')
const { Canvas } = require('../lib/canvas')
const scenes = require('../lib/scenes')
const video = require('../lib/video')

const W = 480, H = 270
const COMMANDS = new Set(['tarjeta', 'top', 'nevada', 'fuegos', 'dragon', 'shenlong', 'stickeranim', 'sanim'])
const COOLDOWN = 15000
const last = new Map() // chat -> última vez que se pidió un render

const note = (type, text) => T.msg(type, text)

// Dibuja `count` cuadros de una escena y los devuelve como Buffers RGBA.
function renderFrames(w, h, count, draw) {
  const c = new Canvas(w, h)
  return { count, frame: i => { c.clear([0, 0, 0], 1); draw(c, i / count); return c.data } }
}

async function sendClip(sock, jid, m, { draw, count = 36, fps = 12, caption, still }) {
  if (!video.hasFfmpeg()) {
    const c = new Canvas(W, H); draw(c, 0.35)
    await sock.sendMessage(jid, { image: c.toPNG(), caption: caption + '\n\n_(Este servidor no tiene ffmpeg: se envía imagen fija.)_' }, { quoted: m })
    return
  }
  const r = renderFrames(W, H, count, draw)
  const buffer = await video.encode({ width: W, height: H, fps, count: r.count, frame: r.frame, format: 'mp4' })
  await sock.sendMessage(jid, { video: buffer, gifPlayback: true, mimetype: 'video/mp4', caption }, { quoted: m })
}

async function getMedia(sock, m) {
  const { downloadMediaMessage } = await import('@yui-bails/yui-bails')
  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const own = m.message?.videoMessage || m.message?.imageMessage ? m : null
  const target = own || (quoted && (quoted.videoMessage || quoted.imageMessage)
    ? { key: m.key, message: quoted } : null)
  if (!target) return null
  const isVideo = !!(target.message.videoMessage)
  const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage })
  return { buffer, isVideo }
}

// Animación del duelo RPG. Devuelve true si se pudo enviar el video.
async function sendDuel(sock, jid, m, info, caption, mentions) {
  if (!video.hasFfmpeg()) return false
  try {
    return await video.exclusive(async () => {
      const r = renderFrames(W, H, 40, (c, t) => scenes.duel(c, t, info))
      const buffer = await video.encode({ width: W, height: H, fps: 12, count: r.count, frame: r.frame, format: 'mp4' })
      await sock.sendMessage(jid, { video: buffer, gifPlayback: true, mimetype: 'video/mp4', caption, mentions }, { quoted: m })
      return true
    })
  } catch (error) {
    console.error('[visual] duelo animado falló:', error.message)
    return false
  }
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false

  const now = Date.now()
  if (now - (last.get(jid) || 0) < COOLDOWN) {
    await sock.sendMessage(jid, { text: note('wait', 'Espera unos segundos antes de pedir otra imagen o animación.') }, { quoted: m })
    return true
  }
  last.set(jid, now)

  try {
    await video.exclusive(async () => {
      if (cmd === 'tarjeta') {
        const name = (text || '').trim() || m.pushName || 'Guerrero'
        const png = scenes.card(name.slice(0, 18)).toPNG()
        await sock.sendMessage(jid, { image: png, caption: `🎄 Tarjeta navideña para *${name.slice(0, 18)}*` }, { quoted: m })
      } else if (cmd === 'top') {
        const rpg = require('./goku/rpg')
        const players = rpg.topPlayers(10)
        if (!players.length) {
          await sock.sendMessage(jid, { text: note('info', `Todavía no hay guerreros. Usa ${prefix}entrenar para comenzar.`) }, { quoted: m })
          return
        }
        await sock.sendMessage(jid, { image: scenes.ranking(players).toPNG(), caption: '🏆 Top guerreros Z' }, { quoted: m })
      } else if (cmd === 'nevada') {
        await sendClip(sock, jid, m, { draw: scenes.snowScene, caption: '❄️ ¡Feliz Navidad!' })
      } else if (cmd === 'fuegos') {
        await sendClip(sock, jid, m, { draw: scenes.fireworks, count: 48, caption: '🎆 ¡Feliz Año Nuevo!' })
      } else if (cmd === 'dragon' || cmd === 'shenlong') {
        await sendClip(sock, jid, m, { draw: scenes.dragon, count: 48, caption: '🐉 ¡Shenlong ha sido invocado!' })
      } else {
        // stickeranim
        if (!video.hasFfmpeg()) {
          await sock.sendMessage(jid, { text: note('err', 'Este servidor no tiene ffmpeg, no puedo crear stickers animados.') }, { quoted: m })
          return
        }
        const media = await getMedia(sock, m)
        let sticker
        if (media) {
          sticker = await video.videoToSticker(media.buffer)
        } else if (text && text.trim()) {
          const c = new Canvas(512, 512)
          const count = 16
          const frames = Array.from({ length: count }, (_, i) => { scenes.stickerText(c, i / count, text); return Buffer.from(c.data) })
          sticker = await video.encodeSticker(frames, 12)
        } else {
          await sock.sendMessage(jid, { text: note('info', `Uso:\n• ${prefix}stickeranim <texto>\n• Responde a un video o GIF con ${prefix}stickeranim`) }, { quoted: m })
          return
        }
        await sock.sendMessage(jid, { sticker }, { quoted: m })
      }
    })
  } catch (error) {
    last.delete(jid)
    const busy = error.code === 'BUSY'
    console.error('[visual]', cmd, error.message)
    await sock.sendMessage(jid, { text: note(busy ? 'wait' : 'err', busy ? 'Estoy creando otra animación, intenta en unos segundos.' : 'No pude crear la imagen o animación. Intenta de nuevo.') }, { quoted: m })
  }
  return true
}

module.exports = handler
module.exports.sendDuel = sendDuel
