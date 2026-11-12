const cfg = require('./config')
const BASE = (cfg.yuiApi || 'https://yuiapi.vercel.app').replace(/\/$/, '')
const hasKey = () => !!cfg.yuiKey

async function call(path, params = {}, o = {}) {
  const u = new URL(BASE + '/api/v1' + path)
  for (const k in params) if (params[k] !== undefined && params[k] !== '') u.searchParams.set(k, params[k])
  const r = await fetch(u, {
    method: o.method || 'GET',
    headers: { ...(cfg.yuiKey ? { 'x-api-key': cfg.yuiKey } : {}), ...(o.headers || {}) },
    body: o.body,
    signal: AbortSignal.timeout(180000)
  })
  const type = r.headers.get('content-type') || ''
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 150))
  if (type.includes('json')) {
    const json = await r.json()
    if (json.ok === false) throw new Error(json.error || 'error de la API')
    return { json, type }
  }
  if (o.max && Number(r.headers.get('content-length') || 0) > o.max) throw new Error('TOO_BIG')
  return { buf: Buffer.from(await r.arrayBuffer()), type }
}

function findUrl(o) {
  let best = ''
  const walk = (v, k = '') => {
    if (typeof v === 'string' && /^https?:\/\//.test(v) && !best && !/thumb|image|cover/i.test(k)) best = v
    else if (v && typeof v === 'object') for (const x in v) walk(v[x], x)
  }
  walk(o)
  return best
}

async function media(path, params, max) {
  const r = await call(path, params, { max })
  if (r.buf) return r
  const url = findUrl(r.json)
  if (!url) throw new Error('La API no devolvió archivo')
  const x = await fetch(url, { signal: AbortSignal.timeout(180000) })
  if (!x.ok) throw new Error('HTTP ' + x.status)
  return { buf: Buffer.from(await x.arrayBuffer()), type: x.headers.get('content-type') || '' }
}

const first = (o, keys) => { for (const k of keys) if (o && o[k]) return String(o[k]); return '' }

function listOf(d) {
  if (Array.isArray(d)) return d
  for (const k in d) if (Array.isArray(d[k])) return d[k]
  if (d && d.data && typeof d.data === 'object') return listOf(d.data)
  return []
}

function pretty(o, ind = '', depth = 0) {
  if (o === null || typeof o !== 'object') return ind + String(o)
  if (depth > 2) return ind + JSON.stringify(o).slice(0, 80)
  const e = Array.isArray(o) ? o.slice(0, 5).map((v, i) => [i + 1, v]) : Object.entries(o).filter(([k]) => k !== 'ok')
  return e.map(([k, v]) => v && typeof v === 'object'
    ? `${ind}*${k}*:\n${pretty(v, ind + '  ', depth + 1)}`
    : `${ind}*${k}*: ${v}`).join('\n')
}

function fmtItem(o, i) {
  const t = first(o, ['title', 'name', 'titulo', 'label'])
  const sub = first(o, ['artist', 'artistName', 'author', 'channel', 'channelName', 'capital', 'summary', 'extract', 'description', 'synopsis'])
  const link = first(o, ['url', 'link', 'videoUrl', 'previewUrl'])
  return `${i + 1}. *${t || '—'}*` + (sub ? `\n   ${sub.slice(0, 160)}` : '') + (link ? `\n   ${link}` : '')
}

async function getImage(sock, m) {
  const B = await import('@yui-bails/yui-bails')
  const dl = B.downloadMediaMessage || B.default?.downloadMediaMessage
  const msg = m.message?.ephemeralMessage?.message || m.message
  const ctx = msg.extendedTextMessage?.contextInfo
  let target = null
  if (msg.imageMessage) target = m
  else if (ctx?.quotedMessage && (ctx.quotedMessage.imageMessage || ctx.quotedMessage.stickerMessage)) {
    target = { key: { remoteJid: m.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage }
  }
  if (!target) return null
  return dl(target, 'buffer', {}, { logger: require('pino')({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
}

const SEARCH = {
  wiki: ['/search/wiki', { lang: 'es' }], anime: ['/search/anime'], libro: ['/search/books'],
  serie: ['/search/shows'], pais: ['/search/countries'], paper: ['/search/papers'],
  ebook: ['/search/ebooks'], musica: ['/search/music']
}
const IMGS = { imagen: '/search/images', pinterest: '/search/pinterest' }
const YT = ['ytmp3', 'yta', 'ytaudio', 'ytmp4', 'ytv', 'ytvideo']
const OTHERS = ['sticker', 's', 'stickertxt', 'rmbg', 'qr', 'clima', 'cambio', 'traducir', 'hash', 'uuid', 'password', 'pindl', 'plan', 'menuapi']
const NAMES = new Set([...Object.keys(SEARCH), ...Object.keys(IMGS), ...YT, ...OTHERS])

module.exports = async function (sock, m, jid, cmd, text, p) {
  if (!NAMES.has(cmd)) return false
  const reply = t => sock.sendMessage(jid, { text: t }, { quoted: m })
  const usage = s => reply(`Ejemplo: ${p}${cmd} ${s}`)
  if (!hasKey()) {
    if (YT.includes(cmd)) return false
    await reply('⚠️ Falta YUI_API_KEY en .env.')
    return true
  }
  const sender = (m.key.participant || m.key.remoteJid || '').split('@')[0].split(':')[0]
  try {
    if (YT.includes(cmd)) {
      if (!text) return (await usage('gura'), true)
      const audio = ['ytmp3', 'yta', 'ytaudio'].includes(cmd)
      let url = text.split(/\s+/)[0]
      if (!/^https?:\/\//.test(url)) {
        const it = listOf((await call('/search/youtube', { q: text, limit: 1 })).json)[0]
        url = first(it, ['url', 'link', 'videoUrl'])
        if (!url) return (await reply('❌ No encontré resultados.'), true)
      }
      await reply(audio ? '⏳ Descargando audio...' : '⏳ Descargando video...')
      const r = await media(audio ? '/download/ytaudio' : '/download/ytvideo', { url }, 90 * 1024 * 1024)
      if (r.buf.length > 90 * 1024 * 1024) throw new Error('TOO_BIG')
      if (audio) await sock.sendMessage(jid, { audio: r.buf, mimetype: 'audio/mpeg' }, { quoted: m })
      else await sock.sendMessage(jid, { video: r.buf, mimetype: 'video/mp4', caption: `🎬 ${cfg.botName}` }, { quoted: m })
      return true
    }
    if (SEARCH[cmd]) {
      if (!text) return (await usage('texto'), true)
      const [path, extra] = SEARCH[cmd]
      const d = (await call(path, { q: text, limit: 5, ...(extra || {}) })).json
      const l = listOf(d).slice(0, 5)
      await reply(l.length ? l.map(fmtItem).join('\n\n') : pretty(d))
      return true
    }
    if (IMGS[cmd]) {
      if (!text) return (await usage('gatos'), true)
      const l = listOf((await call(IMGS[cmd], { q: text, limit: 3 })).json).slice(0, 3)
      let sent = 0
      for (const it of l) {
        const img = first(it, cmd === 'imagen' ? ['url', 'image', 'thumbnail'] : ['image', 'preview', 'thumbnail', 'url'])
        if (!img) continue
        try { await sock.sendMessage(jid, { image: { url: img }, caption: first(it, ['title', 'name']) || text }, { quoted: m }); sent++ } catch {}
      }
      if (!sent) await reply('❌ No encontré imágenes.')
      return true
    }
    switch (cmd) {
      case 'sticker': case 's': case 'rmbg': {
        const img = await getImage(sock, m)
        if (!img) return (await reply(`📸 Envía o responde a una imagen con ${p}${cmd}`), true)
        const r = await call(cmd === 'rmbg' ? '/sticker/remove-bg' : '/sticker', {}, { method: 'POST', body: img, headers: { 'content-type': 'application/octet-stream' } })
        await sock.sendMessage(jid, { sticker: r.buf }, { quoted: m })
        break
      }
      case 'stickertxt': {
        if (!text) return (await usage('Hola'), true)
        await sock.sendMessage(jid, { sticker: (await call('/sticker/text', { text: text.slice(0, 120) })).buf }, { quoted: m })
        break
      }
      case 'qr': {
        if (!text) return (await usage('https://google.com'), true)
        await sock.sendMessage(jid, { image: (await call('/tools/qr', { text, size: 512 })).buf, caption: '✅ QR listo' }, { quoted: m })
        break
      }
      case 'pindl': {
        if (!/^https?:\/\//.test(text)) return (await usage('https://pin.it/xxxx'), true)
        const r = await media('/download/pinterest', { url: text }, 90 * 1024 * 1024)
        await sock.sendMessage(jid, r.type.startsWith('video') ? { video: r.buf } : { image: r.buf }, { quoted: m })
        break
      }
      case 'clima':
        if (!text) return (await usage('Lima'), true)
        await reply(pretty((await call('/weather', { city: text, lang: 'es' })).json))
        break
      case 'cambio': {
        const [a, f, t] = text.split(/\s+/)
        if (!a || !f || !t) return (await usage('100 usd pen'), true)
        await reply(pretty((await call('/exchange', { amount: a, from: f.toUpperCase(), to: t.toUpperCase() })).json))
        break
      }
      case 'traducir': {
        const [to, ...rest] = text.split(/\s+/)
        if (!to || !rest.length) return (await usage('en hola mundo'), true)
        await reply(pretty((await call('/translate', { text: rest.join(' '), to })).json))
        break
      }
      case 'hash': {
        const [algo, ...rest] = text.split(/\s+/)
        const hasAlgo = /^(md5|sha1|sha256|sha512)$/i.test(algo)
        const t = hasAlgo ? rest.join(' ') : text
        if (!t) return (await usage('sha256 texto'), true)
        await reply(pretty((await call('/tools/hash', { text: t, algo: hasAlgo ? algo.toLowerCase() : 'sha256' })).json))
        break
      }
      case 'uuid':
        await reply(pretty((await call('/tools/uuid', { count: Math.min(parseInt(text) || 1, 10) })).json))
        break
      case 'password':
        await reply(pretty((await call('/tools/password', { length: Math.min(Math.max(parseInt(text) || 16, 8), 64), symbols: 'true' })).json))
        break
      case 'plan':
        if (sender !== cfg.owner) return (await reply('🔒 Solo el owner.'), true)
        await reply(pretty((await call('/me')).json))
        break
      case 'menuapi':
        await reply(`╭─〔 🌐 *API YUI* 〕
│ ${p}ytmp3 / ${p}ytmp4 <texto|link>
│ ${p}sticker (imagen o respondiendo)
│ ${p}stickertxt <texto>
│ ${p}rmbg (imagen, quita fondo liso)
│ ${p}qr <texto>
│ ${p}clima <ciudad>
│ ${p}cambio 100 usd pen
│ ${p}traducir en <texto>
│ ${p}wiki ${p}anime ${p}libro ${p}serie
│ ${p}pais ${p}paper ${p}ebook ${p}musica <q>
│ ${p}imagen ${p}pinterest <q>
│ ${p}pindl <link>
│ ${p}hash ${p}uuid ${p}password
│ ${p}plan (owner)
╰────────────`)
        break
    }
  } catch (e) {
    const s = String(e.message)
    await reply(s === 'TOO_BIG' ? '❌ El archivo es muy pesado para WhatsApp.'
      : s.includes('HTTP 401') ? '❌ apiKey de Yui inválida.'
      : s.includes('HTTP 429') ? '⏳ Límite de la API alcanzado, intenta más tarde.'
      : '⚠️ Error: ' + s.slice(0, 120)).catch(() => {})
  }
  return true
}
