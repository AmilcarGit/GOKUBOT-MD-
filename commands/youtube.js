const cfg = require('../config')

async function api(path, params = {}) {
  const u = new URL(cfg.api + path)
  for (const k in params) u.searchParams.set(k, params[k])
  if (cfg.apiKey) u.searchParams.set('apiKey', cfg.apiKey)
  const r = await fetch(u, { signal: AbortSignal.timeout(90000) })
  return r.json()
}

function findMediaUrl(obj, kind) {
  const found = []
  const walk = (o, key = '') => {
    if (typeof o === 'string') { if (/^https?:\/\//.test(o)) found.push([key.toLowerCase(), o]) }
    else if (Array.isArray(o)) o.forEach(v => walk(v, key))
    else if (o && typeof o === 'object') for (const k in o) walk(o[k], k)
  }
  walk(obj)
  const good = found.filter(([k, v]) => !/thumb|image|cover|avatar|channel/.test(k) && !/ytimg|youtube\.com|youtu\.be/.test(v))
  const byKind = good.find(([k, v]) => k.includes(kind) || v.includes('.' + kind))
  return (byKind || good[0] || [])[1]
}

const fmtViews = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0)

async function search(sock, p, jid, q, m) {
  const d = await api('/api/ytsearch', { q })
  const list = (d.result || d.results || d.data || []).slice(0, 3)
  if (!list.length) return sock.sendMessage(jid, { text: '❌ No encontré resultados.' }, { quoted: m })
  for (const v of list) {
    const caption = `🎬 *${v.title}*\n👤 ${v.channelName}\n⏱️ ${v.duration}  👁️ ${fmtViews(v.views)}\n🔗 ${v.videoUrl}`
    try {
      await sock.sendMessage(jid, {
        image: { url: v.thumbnailUrl },
        caption,
        footer: cfg.botName,
        buttons: [
          { buttonId: `${p}ytmp3 ${v.videoUrl}`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
          { buttonId: `${p}ytmp4 ${v.videoUrl}`, buttonText: { displayText: '🎬 Video' }, type: 1 }
        ],
        headerType: 4
      }, { quoted: m })
    } catch {
      await sock.sendMessage(jid, { text: `${caption}\n\n${p}ytmp3 ${v.videoUrl}\n${p}ytmp4 ${v.videoUrl}` }, { quoted: m })
    }
  }
}

async function download(sock, jid, q, kind, m) {
  await sock.sendMessage(jid, { text: kind === 'mp3' ? '⏳ Descargando audio...' : '⏳ Descargando video...' }, { quoted: m })
  const d = await api('/api/youtube', { q, type: kind })
  const url = findMediaUrl(d, kind)
  if (!url) return sock.sendMessage(jid, { text: '❌ La API no devolvió un enlace de descarga.' }, { quoted: m })
  const title = d.title || d.result?.title || 'GokuBot'
  if (kind === 'mp3') {
    await sock.sendMessage(jid, { audio: { url }, mimetype: 'audio/mpeg', fileName: title + '.mp3' }, { quoted: m })
  } else {
    await sock.sendMessage(jid, { video: { url }, mimetype: 'video/mp4', caption: `🎬 ${title}\n_${cfg.botName}_` }, { quoted: m })
  }
}

// Comandos de YouTube (API multimedia). YuiAPI (commands/yui.js) tiene prioridad si hay YUI_API_KEY.
module.exports = async function (sock, m, jid, cmd, text, p) {
  switch (cmd) {
    case 'yts': case 'play': case 'ytsearch':
      if (!text) { await sock.sendMessage(jid, { text: `Ejemplo: ${p}${cmd} gura` }, { quoted: m }); return true }
      await search(sock, p, jid, text, m)
      return true
    case 'ytmp3': case 'ytmp4': case 'ytv': case 'yta': {
      if (!text) { await sock.sendMessage(jid, { text: `Ejemplo: ${p}${cmd} gura` }, { quoted: m }); return true }
      const kind = (cmd === 'ytmp3' || cmd === 'yta') ? 'mp3' : 'mp4'
      await download(sock, jid, text, kind, m)
      return true
    }
  }
  return false
}
