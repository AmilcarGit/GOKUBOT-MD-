const cfg = require('../config')
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

module.exports = { hasKey, call, findUrl, media, first, listOf }
