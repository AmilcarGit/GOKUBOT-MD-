'use strict'
// Respaldo de YouTube sin APIs de terceros (paquete opcional youtubei.js).
// Sirve para búsquedas y para descargas largas (30-40 min): baja directo desde YouTube.
// Si el paquete no está instalado, los demás proveedores siguen funcionando igual.
let clientPromise = null
let failedAt = 0

async function client() {
  if (clientPromise) return clientPromise
  clientPromise = (async () => {
    const mod = await import('youtubei.js')
    const Innertube = mod.Innertube || mod.default?.Innertube || mod.default
    return Innertube.create({ lang: 'es', location: 'PE', generate_session_locally: true })
  })().catch(e => { clientPromise = null; throw e })
  return clientPromise
}
// Si falló por completo (paquete ausente), no insistir en cada petición.
async function ready() {
  if (Date.now() - failedAt < 10 * 60000) throw new Error('youtubei.js no disponible')
  try { return await client() } catch (e) { failedAt = Date.now(); throw new Error('youtubei.js no disponible: ' + e.message) }
}

const text = v => (v && (v.text || (typeof v === 'string' ? v : ''))) || ''
const idOf = url => (String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(url) ? url : '')

async function search(q, limit = 5) {
  const yt = await ready()
  const res = await yt.search(q, { type: 'video' })
  const out = []
  for (const v of res.results || []) {
    const id = v.id || v.video_id
    if (!id || !/^[\w-]{11}$/.test(id) || (v.type && !/Video/.test(v.type))) continue
    out.push({
      title: text(v.title) || 'Sin título', url: 'https://www.youtube.com/watch?v=' + id,
      duration: text(v.duration) || '', channel: v.author?.name || '', views: text(v.short_view_count) || text(v.view_count) || '',
      thumb: v.thumbnails?.[0]?.url || ''
    })
    if (out.length >= limit) break
  }
  return out
}

// Lee el stream completo con tope de tamaño.
async function collect(stream, max) {
  const chunks = []; let size = 0
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > max) { await reader.cancel().catch(() => {}); throw new Error('TOO_BIG') }
      chunks.push(Buffer.from(value))
    }
  } finally { reader.releaseLock?.() }
  return Buffer.concat(chunks)
}

const CLIENTS = ['ANDROID', 'IOS', 'TV', 'WEB_EMBEDDED', 'WEB']

async function download(url, kind, max) {
  const yt = await ready()
  const id = idOf(url)
  if (!id) throw new Error('enlace de YouTube no válido')
  const errors = []
  for (const c of CLIENTS) {
    try {
      const opts = kind === 'mp3'
        ? { type: 'audio', quality: 'best', format: 'mp4', client: c }
        : { type: 'video+audio', quality: '360p', format: 'mp4', client: c }
      const stream = await yt.download(id, opts)
      const buf = await collect(stream, max)
      if (buf.length < 20000) throw new Error('archivo vacío')
      return kind === 'mp3' ? { buf, mime: 'audio/mp4', ext: 'm4a' } : { buf, mime: 'video/mp4', ext: 'mp4' }
    } catch (e) {
      if (e.message === 'TOO_BIG') throw e
      errors.push(`${c}: ${String(e.message).slice(0, 80)}`)
    }
  }
  throw new Error(errors.join(' | '))
}

module.exports = { search, download, idOf }
