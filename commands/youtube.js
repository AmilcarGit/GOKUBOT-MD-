const T = require('../lib/theme')
const yt = require('../lib/youtube')

// Últimos resultados de .yts por chat, para poder usar .ytmp3 1 / .ytmp4 2
const lastSearch = new Map()
const CACHE_MS = 15 * 60 * 1000

const AUDIO = new Set(['ytmp3', 'yta', 'ytaudio'])
const VIDEO = new Set(['ytmp4', 'ytv', 'ytvideo'])
const SEARCH = new Set(['yts', 'ytsearch'])

const safeName = s => String(s || 'GokuBot').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 80) || 'GokuBot'
const info = v => [`🎬 *${v.title}*`, v.channel && `👤 ${v.channel}`, (v.duration || v.views) && `⏱️ ${v.duration || '—'}${v.views ? `  👁️ ${v.views}` : ''}`, `🔗 ${v.url}`].filter(Boolean).join('\n')

function explain(e) {
  const s = String(e.message || e)
  if (s === 'TOO_BIG') return T.msg('err', 'El archivo es demasiado pesado para WhatsApp (máx. 90 MB).')
  if (s === 'NO_RESULTS') return T.msg('err', 'No encontré resultados. Prueba con otras palabras.')
  if (/401|403/.test(s)) return T.msg('err', 'La clave de la API no es válida. Revisa YUI_API_KEY / MEDIA_API_KEY.')
  if (/429/.test(s)) return T.msg('warn', 'Límite de la API alcanzado. Intenta de nuevo en unos minutos.')
  return T.msg('err', 'No pude completar la descarga ahora mismo. Intenta con otro video o más tarde.')
}

async function sendCard(sock, jid, v, m) {
  const caption = T.card('YouTube', [info(v)])
  if (v.thumb) {
    try { return await sock.sendMessage(jid, { image: { url: v.thumb }, caption }, { quoted: m }) } catch {}
  }
  return sock.sendMessage(jid, { text: caption }, { quoted: m })
}

async function resolve(jid, text) {
  const arg = text.trim()
  if (/^\d{1,2}$/.test(arg)) {
    const cached = lastSearch.get(jid)
    if (!cached || Date.now() - cached.time > CACHE_MS) throw Object.assign(new Error('Busca primero con .yts'), { friendly: true })
    const item = cached.results[Number(arg) - 1]
    if (!item) throw Object.assign(new Error(`Elige un número del 1 al ${cached.results.length}`), { friendly: true })
    return item
  }
  if (yt.isUrl(arg)) return { title: '', url: arg.split(/\s+/)[0] }
  return (await yt.search(arg, 1))[0]
}

async function send(sock, jid, m, v, kind) {
  const { buf } = await yt.download(v.url, kind)
  const name = safeName(v.title)
  if (kind === 'mp3') {
    await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', fileName: name + '.mp3' }, { quoted: m })
  } else if (buf.length > 60 * 1024 * 1024) {
    await sock.sendMessage(jid, { document: buf, mimetype: 'video/mp4', fileName: name + '.mp4' }, { quoted: m })
  } else {
    await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: T.msg('ok', name) }, { quoted: m })
  }
}

module.exports = async function (sock, m, jid, cmd, text, p) {
  const isSearch = SEARCH.has(cmd), isPlay = cmd === 'play', isAudio = AUDIO.has(cmd), isVideo = VIDEO.has(cmd)
  if (!isSearch && !isPlay && !isAudio && !isVideo) return false
  const reply = value => sock.sendMessage(jid, { text: value }, { quoted: m })

  if (!text.trim()) {
    await reply(T.msg('info', `Ejemplo: ${p}${cmd} ${isAudio || isVideo ? 'gura  /  ' + p + cmd + ' 1' : 'villancicos navideños'}`))
    return true
  }

  try {
    if (isSearch) {
      await reply(T.msg('wait', 'Buscando en YouTube...'))
      const results = await yt.search(text.trim(), 5)
      lastSearch.set(jid, { results, time: Date.now() })
      const lines = results.flatMap((v, i) => [
        `*${i + 1}.* ${v.title}`,
        `   ${[v.channel && '👤 ' + v.channel, v.duration && '⏱️ ' + v.duration, v.views && '👁️ ' + v.views].filter(Boolean).join('  ')}`.trimEnd()
      ].filter(l => l.trim()))
      lines.push('', `🎵 ${p}ytmp3 1   •   🎬 ${p}ytmp4 1`, `_Cambia el 1 por el número del resultado._`)
      const caption = T.card('YouTube', lines)
      let sent = false
      if (results[0].thumb) {
        try { await sock.sendMessage(jid, { image: { url: results[0].thumb }, caption }, { quoted: m }); sent = true } catch {}
      }
      if (!sent) await sock.sendMessage(jid, { text: caption }, { quoted: m })
      return true
    }

    if (isPlay) {
      await reply(T.msg('wait', 'Buscando tu canción...'))
      const v = (await yt.search(text.trim(), 1))[0]
      await sendCard(sock, jid, v, m)
      await send(sock, jid, m, v, 'mp3')
      return true
    }

    const kind = isAudio ? 'mp3' : 'mp4'
    const v = await resolve(jid, text)
    await reply(T.msg('wait', isAudio ? 'Descargando audio...' : 'Descargando video...'))
    await send(sock, jid, m, v, kind)
  } catch (e) {
    console.error(`[youtube] .${cmd} "${text.slice(0, 60)}":`, e.message)
    await reply(e.friendly ? T.msg('warn', e.message) : explain(e)).catch(() => {})
  }
  return true
}
