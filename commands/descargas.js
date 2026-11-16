'use strict'
// Descargas de redes sociales: TikTok, Instagram, Facebook (y .dl que detecta el enlace solo).
const T = require('../lib/theme')
const social = require('../lib/social')

const ALIAS = { tiktok: 'tiktok', tt: 'tiktok', instagram: 'instagram', ig: 'instagram', facebook: 'facebook', fb: 'facebook', dl: 'auto', ttmp3: 'audio' }
const ICON = { tiktok: '🎵', instagram: '📸', facebook: '📘' }
const COOLDOWN = 6000
const last = new Map()
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })

async function handler(sock, m, jid, cmd, text, prefix) {
  const mode = ALIAS[cmd]
  if (!mode) return false
  const link = (text || '').match(/https?:\/\/\S+/)?.[0]
  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const fromQuote = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').match(/https?:\/\/\S+/)?.[0]
  const url = link || fromQuote
  if (!url) {
    await say(sock, jid, m, 'info', `Pega un enlace después del comando.\nEjemplos:\n• ${prefix}tiktok https://vm.tiktok.com/xxxx\n• ${prefix}ig https://instagram.com/reel/xxxx\n• ${prefix}fb https://fb.watch/xxxx\n• ${prefix}dl <cualquier enlace>\n• ${prefix}ttmp3 <enlace de TikTok> (solo audio)`)
    return true
  }
  if (Date.now() - (last.get(jid) || 0) < COOLDOWN) { await say(sock, jid, m, 'wait', 'Un momento, estoy terminando otra descarga.'); return true }
  last.set(jid, Date.now())

  try {
    await say(sock, jid, m, 'wait', 'Descargando...')
    const d = await social.info(url)
    const head = `${ICON[d.platform]} *${d.platform.toUpperCase()}*${d.author ? `\n👤 ${String(d.author).slice(0, 60)}` : ''}${d.title ? `\n📝 ${String(d.title).slice(0, 150)}` : ''}`
    if (mode === 'audio') {
      if (!d.audio) throw Object.assign(new Error('Este enlace no tiene audio separado.'), { friendly: true })
      const f = await social.fetchFile(d.audio)
      await sock.sendMessage(jid, { audio: f.buf, mimetype: 'audio/mpeg', fileName: 'audio.mp3' }, { quoted: m })
    } else if (d.video) {
      const f = await social.fetchFile(d.video)
      const buttons = [{ text: '🔗 Abrir original', url }]
      if (d.audio) buttons.unshift({ id: `${prefix}ttmp3 ${url}`, text: '🎵 Solo audio' })
      if (f.buf.length > 60 * 1024 * 1024) await sock.sendMessage(jid, { document: f.buf, mimetype: 'video/mp4', fileName: d.platform + '.mp4', caption: head }, { quoted: m })
      else await sock.sendMessage(jid, { video: f.buf, mimetype: 'video/mp4', caption: head, footer: 'GokuBot-MD', ...(d.platform === 'tiktok' ? { buttons } : {}) }, { quoted: m })
    } else if (d.images.length) {
      for (const [i, img] of d.images.slice(0, 6).entries()) {
        await sock.sendMessage(jid, { image: { url: img }, caption: i === 0 ? head : undefined }, { quoted: m })
      }
    } else {
      throw Object.assign(new Error('No encontré nada para descargar en ese enlace (¿es privado?).'), { friendly: true })
    }
  } catch (e) {
    last.delete(jid)
    console.error('[descargas]', cmd, e.message)
    const s = String(e.message)
    await say(sock, jid, m, e.friendly ? 'warn' : 'err',
      e.friendly ? s : s === 'TOO_BIG' ? 'El archivo pesa demasiado para WhatsApp (máx. 90 MB).'
        : /429/.test(s) ? 'Límite de la API gratuita alcanzado. Intenta de nuevo en un par de minutos.'
        : 'No pude descargarlo ahora. Revisa que el enlace sea público e intenta de nuevo.').catch(() => {})
  }
  return true
}

module.exports = handler
