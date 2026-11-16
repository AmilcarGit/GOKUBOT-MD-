'use strict'
// Descargas de TikTok, Instagram y Facebook con APIs gratuitas (sin clave por defecto).
//  • TikTok:    tikwm.com (gratis, sin clave)       → respaldo: downaria
//  • IG / FB:   downaria.vercel.app (playground gratis: 5 pedidos / 2 min; con DOWNARIA_KEY sube el límite)
const MAX_BYTES = 90 * 1024 * 1024
const hosts = {
  tiktok: /(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$/i,
  instagram: /(^|\.)instagram\.com$|(^|\.)instagr\.am$/i,
  facebook: /(^|\.)facebook\.com$|(^|\.)fb\.watch$|(^|\.)fb\.com$/i
}

function platformOf(link) {
  try {
    const host = new URL(link).hostname
    return Object.keys(hosts).find(k => hosts[k].test(host)) || null
  } catch { return null }
}

const get = async (url, opts = {}) => {
  const r = await fetch(url, { ...opts, headers: { 'user-agent': 'Mozilla/5.0 GokuBot', ...(opts.headers || {}) }, signal: AbortSignal.timeout(45000) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

// Resultado unificado: { title, author, video, audio, images[] }
async function tikwm(link) {
  const d = await get('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(link))
  if (d.code !== 0 || !d.data) throw new Error(d.msg || 'tikwm sin datos')
  const x = d.data
  return { title: x.title || '', author: x.author?.nickname || x.author?.unique_id || '', video: x.hdplay || x.play || '', audio: x.music || '', images: Array.isArray(x.images) ? x.images : [] }
}

async function downaria(link) {
  const key = process.env.DOWNARIA_KEY
  const d = key
    ? await get('https://downaria.vercel.app/api/v1', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key }, body: JSON.stringify({ url: link }) })
    : await get('https://downaria.vercel.app/api/playground?url=' + encodeURIComponent(link))
  if (d.success === false || !d.data) throw new Error(d.error || d.message || 'downaria sin datos')
  const formats = Array.isArray(d.data.formats) ? d.data.formats.filter(f => f && f.url) : []
  const rank = f => (/hd|1080|720/i.test(f.quality || '') ? 2 : 1)
  const videos = formats.filter(f => !f.type || /video/i.test(f.type)).sort((a, b) => rank(b) - rank(a))
  const audio = formats.find(f => /audio/i.test(f.type || ''))
  const images = formats.filter(f => /image|photo/i.test(f.type || '')).map(f => f.url)
  if (!videos.length && !images.length && !audio) throw new Error('downaria sin formatos')
  return { title: d.data.title || '', author: d.data.author || '', video: videos[0]?.url || '', audio: audio?.url || '', images }
}

async function info(link) {
  const platform = platformOf(link)
  if (!platform) throw Object.assign(new Error('Ese enlace no es de TikTok, Instagram ni Facebook.'), { friendly: true })
  const providers = platform === 'tiktok' ? [['tikwm', tikwm], ['downaria', downaria]] : [['downaria', downaria]]
  const errors = []
  for (const [name, fn] of providers) {
    try { return { platform, ...(await fn(link)) } } catch (e) { errors.push(`${name}: ${e.message}`); console.error(`[social] ${name}:`, e.message) }
  }
  throw Object.assign(new Error(errors.join(' | ')), { code: 'ALL_FAILED' })
}

async function fetchFile(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  if (Number(r.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('TOO_BIG')
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length > MAX_BYTES) throw new Error('TOO_BIG')
  return { buf, type: r.headers.get('content-type') || '' }
}

module.exports = { platformOf, info, fetchFile, MAX_BYTES }
