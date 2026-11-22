'use strict'
// API web: la app instalable (PWA) usa los mismos comandos del bot sin pasar por WhatsApp.
// Cada cuenta web es un jugador independiente. Nunca es dueño del bot.
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const cfg = require('../config')
const store = require('./store')

const db = store.open('webusers.json', { users: {}, byHash: {} })
const hash = t => crypto.createHash('sha256').update(t).digest('hex')
const ORIGIN = process.env.WEB_ORIGIN || '*'
const MAX_BODY = 20 * 1024
const MAX_REPLY = 14 * 1024 * 1024
const limits = new Map() // clave -> [marcas de tiempo]

function allow(key, max, windowMs) {
  const now = Date.now()
  const list = (limits.get(key) || []).filter(t => now - t < windowMs)
  if (list.length >= max) { limits.set(key, list); return false }
  list.push(now); limits.set(key, list); return true
}
setInterval(() => { const now = Date.now(); for (const [k, v] of limits) if (!v.some(t => now - t < 3600000)) limits.delete(k) }, 600000).unref()

const mediaUrl = (buf, mime) => `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
function readMedia(value) { return Buffer.isBuffer(value) ? value : value?.url && Buffer.isBuffer(value.url) ? value.url : null }

// Convierte un mensaje saliente de WhatsApp en algo que la app pueda dibujar.
function normalize(content) {
  const out = {}
  if (!content || typeof content !== 'object') return null
  if (content.react || content.delete || content.edit || content.pin) return null
  const text = content.text ?? content.caption
  if (typeof text === 'string') out.text = text
  if (typeof content.footer === 'string') out.footer = content.footer
  const image = readMedia(content.image), video = readMedia(content.video), audio = readMedia(content.audio), sticker = readMedia(content.sticker)
  if (image) out.image = mediaUrl(image, 'image/png')
  if (video) out.video = mediaUrl(video, content.mimetype || 'video/mp4')
  if (audio) out.audio = mediaUrl(audio, content.mimetype || 'audio/mpeg')
  if (sticker) out.image = mediaUrl(sticker, 'image/webp')
  if (content.poll) out.poll = { name: content.poll.name, options: content.poll.values }
  if (content.buttons?.length) {
    out.buttons = content.buttons.map(b => b.sections
      ? { text: b.text, sections: b.sections.map(s => ({ title: s.title, rows: (s.rows || []).map(r => ({ title: r.title, description: r.description, command: r.id })) })) }
      : { text: b.text, command: b.id, copy: b.copy, url: b.url })
  }
  return Object.keys(out).length ? out : null
}

// Socket falso: guarda lo que el bot "enviaría" por WhatsApp.
function fakeSock(user, inbox) {
  const sent = []
  const base = {
    isWeb: true,
    user: { id: 'web@s.whatsapp.net' },
    sendMessage: async (jid, content) => { const n = normalize(content); if (n) sent.push(n); return { key: { id: crypto.randomBytes(6).toString('hex') } } },
    getSender: async () => ({ number: user.number, id: `${user.number}@s.whatsapp.net` }),
    isAdmin: async () => false,
    isBotAdmin: async () => false,
    groupMetadata: async () => { throw new Error('No disponible en la app') },
    sendPoll: async (jid, name, values) => { sent.push({ poll: { name, options: values } }) },
    menu: async (m, { title, text, items }) => {
      sent.push({ text: `*${title}*\n${text}`, buttons: [{ text: 'Elegir', sections: (items || []).map(g => ({ title: g.title, rows: (g.items || []).map(i => ({ title: i.title, description: '', command: null, info: i.text })) })) }] })
    }
  }
  const sock = new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (prop === 'then') return undefined
      return async () => undefined
    }
  })
  return { sock, sent, inbox }
}

function newUser(name, ip) {
  const number = '99' + String(crypto.randomInt(0, 1e11)).padStart(11, '0')
  const token = crypto.randomBytes(24).toString('hex')
  db.data.users[number] = { number, name, createdAt: Date.now(), inbox: [] }
  db.data.byHash[hash(token)] = number
  return { token, user: db.data.users[number] }
}
const authUser = req => {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const n = t && db.data.byHash[hash(t)]
  return n ? db.data.users[n] : null
}

async function runForUser(user, rawText) {
  const prefix = cfg.prefix
  let body = String(rawText || '').trim().slice(0, 500)
  if (!body) return []
  if (!body.startsWith(prefix)) body = `${prefix}ia ${body}`   // texto libre = conversa con la IA Goku
  const [cmdRaw, ...rest] = body.slice(prefix.length).split(/\s+/)
  const jid = `${user.number}@s.whatsapp.net`
  const m = { key: { remoteJid: jid, fromMe: false, id: crypto.randomBytes(8).toString('hex') }, pushName: user.name, message: { conversation: body }, messageTimestamp: Math.floor(Date.now() / 1000) }
  const { sock, sent } = fakeSock(user)
  const run = require('../commands')
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 90000))
  const handled = await Promise.race([run(sock, m, jid, cmdRaw.toLowerCase(), rest.join(' '), prefix), timeout])
  if (!handled) sent.push({ text: `No conozco ese comando. Escribe ${prefix}menu para ver la lista.` })
  return sent
}

// Archivos de la app instalable (carpeta web/) e íconos dibujados en código.
const STATIC = { 'index.html': 'text/html; charset=utf-8', 'manifest.webmanifest': 'application/manifest+json', 'sw.js': 'text/javascript; charset=utf-8' }
const icons = new Map()
function icon(size) {
  if (icons.has(size)) return icons.get(size)
  const { Canvas } = require('./canvas')
  const c = new Canvas(size, size), k = size / 192
  c.gradient([20, 10, 60], [70, 24, 110])
  c.glow(size / 2, size / 2, 86 * k, [255, 150, 40], 0.55)
  c.circle(size / 2, size / 2, 60 * k, [255, 160, 40]); c.circle(size / 2 - 10 * k, size / 2 - 10 * k, 22 * k, [255, 225, 150], 0.55)
  c.text('G', size / 2, size / 2 - 22 * k, { scale: Math.max(1, Math.round(7 * k)), align: 'center', color: [255, 255, 255], shadow: [140, 50, 0] })
  const png = c.toPNG(); icons.set(size, png); return png
}
function serveApp(url, res) {
  const rel = url.pathname.replace(/^\/app\/?/, '') || 'index.html'
  const headers = { 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }
  if (/^icon-(192|512)\.png$/.test(rel)) { res.writeHead(200, { ...headers, 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); return res.end(icon(Number(rel.match(/\d+/)[0]))) }
  if (!STATIC[rel]) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('No existe') }
  const extra = rel === 'sw.js' ? { 'Service-Worker-Allowed': '/app/' } : {}
  res.writeHead(200, { ...headers, ...extra, 'Content-Type': STATIC[rel] })
  fs.createReadStream(path.join(__dirname, '..', 'web', rel)).pipe(res)
}

function send(res, code, body, extra = {}) {
  const data = JSON.stringify(body)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', ...extra })
  res.end(data)
}
const readBody = req => new Promise((resolve, reject) => {
  let size = 0; const chunks = []
  req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too big')); req.destroy() } else chunks.push(c) })
  req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}) } catch { reject(new Error('bad json')) } })
  req.on('error', reject)
})

async function route(req, res) {
  const url = new URL(req.url, 'http://x')
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
  if (url.pathname === '/app') { res.writeHead(302, { Location: '/app/' }); return res.end() }
  if (url.pathname.startsWith('/app/') && req.method === 'GET') return serveApp(url, res)
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (url.pathname === '/' || url.pathname === '/api/ping') return send(res, 200, { ok: true, bot: cfg.botName })

  if (url.pathname === '/api/login' && req.method === 'POST') {
    if (!allow('login:' + ip, 8, 3600000)) return send(res, 429, { error: 'Demasiados registros desde tu red. Intenta más tarde.' })
    const body = await readBody(req)
    const name = String(body.name || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 20)
    if (name.length < 2) return send(res, 400, { error: 'Elige un nombre de al menos 2 letras.' })
    const { token, user } = newUser(name, ip)
    await db.save()
    return send(res, 200, { token, name: user.name, id: user.number })
  }

  const user = authUser(req)
  if (!user) return send(res, 401, { error: 'Sesión no válida. Vuelve a entrar.' })

  if (url.pathname === '/api/me') return send(res, 200, { name: user.name, id: user.number, inbox: user.inbox.splice(0) })

  if (url.pathname === '/api/menu') {
    const menu = require('../commands/menu')
    const sections = menu.SECTIONS.map(s => ({ key: s.key, title: s.title, desc: s.desc, commands: menu.CATEGORIES(cfg.prefix).filter(([n]) => s.cats.includes(n)).flatMap(([, l]) => l) }))
    return send(res, 200, { prefix: cfg.prefix, sections })
  }

  if (url.pathname === '/api/cmd' && req.method === 'POST') {
    if (!allow('cmd:' + user.number, 25, 60000)) return send(res, 429, { error: 'Vas muy rápido, espera un momento.' })
    const body = await readBody(req)
    let messages
    try { messages = await runForUser(user, body.text) } catch (e) {
      console.error('[web] cmd', e.message)
      return send(res, 200, { messages: [{ text: e.message === 'timeout' ? '⌛ Tardó demasiado, intenta de nuevo.' : '⚠️ Ocurrió un error, intenta de nuevo.' }] })
    }
    await db.save().catch(() => {})
    let size = 0
    messages = messages.filter(msg => { size += JSON.stringify(msg).length; return size < MAX_REPLY })
    return send(res, 200, { messages })
  }

  if (url.pathname === '/api/vincular' && req.method === 'POST') {
    // Pide el código de vinculación para crear un subbot con el número de la persona.
    if (!allow('link:' + user.number, 3, 3600000) || !allow('linkip:' + ip, 6, 3600000)) return send(res, 429, { error: 'Demasiados intentos. Espera un rato.' })
    const body = await readBody(req)
    const number = String(body.number || '').replace(/\D/g, '')
    try {
      const code = await require('./subbots').create(number, {
        owner: `${user.number}@s.whatsapp.net`, name: user.name, isOwner: false,
        notify: msg => { user.inbox.push({ text: msg, at: Date.now() }); db.save().catch(() => {}) }
      })
      return send(res, 200, { code: typeof code === 'string' ? code : code?.code || String(code), number })
    } catch (e) {
      return send(res, e.friendly ? 400 : 500, { error: e.friendly ? e.message : 'No pude generar el código ahora. Intenta de nuevo en un minuto.' })
    }
  }
  return send(res, 404, { error: 'No existe.' })
}

function start() {
  if (process.env.WEB_API === 'off') return null
  const port = Number(process.env.PORT) || 3000
  const server = http.createServer((req, res) => {
    route(req, res).catch(e => { console.error('[web]', e.message); if (!res.headersSent) send(res, e.message === 'too big' ? 413 : 400, { error: 'Solicitud no válida.' }) })
  })
  server.listen(port, '0.0.0.0', () => console.log(`[web] API de la app escuchando en :${port}`))
  return server
}

module.exports = { start }
