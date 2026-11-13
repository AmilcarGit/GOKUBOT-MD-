const cfg = require('../config')
const yui = require('./yuiapi')

const MAX_BYTES = 90 * 1024 * 1024
const isUrl = s => /^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i.test(String(s || '').trim())

const str = v => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
const pick = (o, keys) => { for (const k of keys) { const v = str(o && o[k]); if (v) return v } return '' }

function fmtDuration(v) {
  if (v === undefined || v === null || v === '') return ''
  if (/^\d+$/.test(String(v))) {
    const s = Number(v), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0')
  }
  return String(v)
}

function fmtViews(n) {
  const v = Number(String(n).replace(/[^\d.]/g, ''))
  if (!v) return ''
  return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v)
}

// Unifica el formato de resultados de las distintas APIs.
function normalize(it) {
  const id = pick(it, ['id', 'videoId', 'video_id'])
  let url = pick(it, ['url', 'link', 'videoUrl', 'video_url', 'webpage_url'])
  if (!url && /^[\w-]{11}$/.test(id)) url = 'https://www.youtube.com/watch?v=' + id
  return {
    title: pick(it, ['title', 'name', 'titulo']) || 'Sin título',
    url,
    duration: fmtDuration(pick(it, ['duration', 'timestamp', 'duration_string', 'lengthText', 'seconds'])),
    channel: pick(it, ['channelName', 'channel', 'author', 'uploader', 'artist']),
    views: fmtViews(pick(it, ['views', 'viewCount', 'view_count'])),
    thumb: pick(it, ['thumbnailUrl', 'thumbnail', 'thumb', 'image', 'cover'])
  }
}

async function mediaApi(path, params = {}) {
  const u = new URL(cfg.api + path)
  for (const k in params) u.searchParams.set(k, params[k])
  if (cfg.apiKey) u.searchParams.set('apiKey', cfg.apiKey)
  const r = await fetch(u, { signal: AbortSignal.timeout(90000) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
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

// Prueba cada proveedor en orden y devuelve el primero que funcione.
async function firstOf(providers) {
  const errors = []
  for (const [name, fn] of providers) {
    try {
      const value = await fn()
      if (value) return value
      errors.push(`${name}: sin datos`)
    } catch (e) {
      if (e.message === 'TOO_BIG') throw e
      errors.push(`${name}: ${e.message}`)
      console.error(`[youtube] ${name} falló:`, e.message)
    }
  }
  const error = new Error(errors.length ? errors.join(' | ') : 'sin proveedores')
  error.code = 'ALL_FAILED'
  throw error
}

async function search(q, limit = 5) {
  const providers = []
  if (yui.hasKey()) providers.push(['YuiAPI', async () => {
    const r = await yui.call('/search/youtube', { q, limit })
    return yui.listOf(r.json).map(normalize).filter(v => v.url).slice(0, limit)
  }])
  providers.push(['API multimedia', async () => {
    const d = await mediaApi('/api/ytsearch', { q })
    const list = Array.isArray(d) ? d : d.result || d.results || d.data || []
    return list.map(normalize).filter(v => v.url).slice(0, limit)
  }])
  const results = await firstOf(providers.map(([n, f]) => [n, async () => { const v = await f(); return v.length ? v : null }]))
  return results
}

async function download(url, kind) {
  const providers = []
  if (yui.hasKey()) providers.push(['YuiAPI', async () => {
    const r = await yui.media(kind === 'mp3' ? '/download/ytaudio' : '/download/ytvideo', { url }, MAX_BYTES)
    if (r.buf.length > MAX_BYTES) throw new Error('TOO_BIG')
    return { buf: r.buf, source: 'YuiAPI' }
  }])
  providers.push(['API multimedia', async () => {
    const d = await mediaApi('/api/youtube', { q: url, type: kind })
    const link = findMediaUrl(d, kind)
    if (!link) throw new Error('la API no devolvió enlace de descarga')
    const x = await fetch(link, { signal: AbortSignal.timeout(180000) })
    if (!x.ok) throw new Error('HTTP ' + x.status)
    if (Number(x.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('TOO_BIG')
    const buf = Buffer.from(await x.arrayBuffer())
    if (buf.length > MAX_BYTES) throw new Error('TOO_BIG')
    return { buf, source: 'API multimedia' }
  }])
  return firstOf(providers)
}

module.exports = { search, download, isUrl, normalize, MAX_BYTES }
