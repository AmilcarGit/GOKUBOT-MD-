'use strict'
// Subbots: otros números de WhatsApp que se vinculan con código y usan los mismos comandos del bot.
const fs = require('fs')
const path = require('path')
const cfg = require('../config')
const store = require('./store')
const { DATA_DIR } = require('./paths')

const ROOT = path.join(DATA_DIR, 'subbots')
const MAX = Math.max(0, Number(process.env.MAX_SUBBOTS || 3))
const PAIR_TIMEOUT = 4 * 60 * 1000          // tiempo para escribir el código en WhatsApp
const db = store.open('subbots.json', {})   // número -> { owner, name, createdAt }
const live = new Map()                      // número -> { sock, state, since, attempts, timers, notify }

const digits = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')
const dirOf = number => path.join(ROOT, number)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let baileys
async function lib() {
  if (baileys) return baileys
  const B = await import('@yui-bails/yui-bails')
  const D = B.default && typeof B.default === 'object' ? { ...B.default, ...B } : B
  baileys = {
    make: (typeof B.default === 'function' ? B.default : B.default?.default) || B.makeWASocket,
    useMultiFileAuthState: D.useMultiFileAuthState, DisconnectReason: D.DisconnectReason,
    fetchLatestBaileysVersion: D.fetchLatestBaileysVersion, Browsers: D.Browsers,
    makeCacheableSignalKeyStore: D.makeCacheableSignalKeyStore
  }
  return baileys
}

function clearTimers(entry) { for (const t of entry.timers) clearTimeout(t); entry.timers = [] }

async function start(number, { pair = false, notify } = {}) {
  const B = await lib()
  const { state, saveCreds } = await B.useMultiFileAuthState(dirOf(number))
  let version
  try { version = (await B.fetchLatestBaileysVersion()).version } catch {}
  const logger = require('pino')({ level: 'silent' })
  const sock = B.make({
    ...(version ? { version } : {}),
    logger,
    printQRInTerminal: false,
    browser: B.Browsers ? B.Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
    auth: B.makeCacheableSignalKeyStore ? { creds: state.creds, keys: B.makeCacheableSignalKeyStore(state.keys, logger) } : state,
    markOnlineOnConnect: false
  })
  const prev = live.get(number)
  const entry = { sock, state: 'conectando', since: Date.now(), attempts: prev?.attempts || 0, timers: [], notify: notify || prev?.notify, number }
  if (prev) clearTimers(prev)
  live.set(number, entry)
  require('./handlers').attach(sock, { isSub: true, label: 'subbot ' + number })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (live.get(number) !== entry) return
    if (connection === 'open') {
      clearTimers(entry)
      const first = entry.state !== 'conectado' && !db.data[number]?.linkedAt
      entry.state = 'conectado'; entry.since = Date.now(); entry.attempts = 0
      if (db.data[number]) { db.data[number].linkedAt = db.data[number].linkedAt || Date.now(); await db.save() }
      console.log(`✅ Subbot ${number} conectado`)
      if (first && entry.notify) entry.notify('✅ *Tu subbot ya está conectado.* Escríbele `' + cfg.prefix + 'menu` desde cualquier chat.').catch(() => {})
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === B.DisconnectReason.loggedOut) { console.log(`❌ Subbot ${number} cerró sesión`); await remove(number, 'Cerraste la sesión desde WhatsApp.'); return }
      entry.state = 'reconectando'
      entry.attempts++
      const wait = Math.min(30000, 2000 * entry.attempts)
      entry.timers.push(setTimeout(() => { if (live.get(number) === entry) start(number, { notify: entry.notify }).catch(e => console.error('[subbots] reconectar', number, e.message)) }, wait))
    }
  })

  if (pair && !sock.authState.creds.registered) {
    await sleep(2500)
    const raw = await sock.requestPairingCode(number)
    entry.timers.push(setTimeout(() => {
      if (live.get(number) === entry && entry.state !== 'conectado') remove(number, 'Se acabó el tiempo para vincular. Pide otro código con ' + cfg.prefix + 'serbot.').catch(() => {})
    }, PAIR_TIMEOUT))
    return String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  }
  return null
}

// Detiene un subbot. keep=true conserva la sesión (por ejemplo al reiniciar el proceso).
async function stop(number, keep = false) {
  const entry = live.get(number)
  if (entry) { clearTimers(entry); live.delete(number); try { entry.sock.end?.(undefined) } catch {} try { entry.sock.ws?.close() } catch {} }
  if (!keep) { fs.rmSync(dirOf(number), { recursive: true, force: true }) }
}

async function remove(number, reason) {
  const entry = live.get(number)
  const info = db.data[number]
  await stop(number)
  delete db.data[number]
  await db.save()
  if (reason && entry?.notify) entry.notify('🛑 ' + reason).catch(() => {})
  return info
}

const reasonFor = (number, requesterId, isOwner) => {
  if (!MAX) return 'Los subbots están desactivados en este bot.'
  if (live.has(number)) return 'Ese número ya tiene un subbot activo.'
  if (digits(cfg.botNumber) === number) return 'Ese es el número del bot principal.'
  if (!isOwner && Object.values(db.data).some(x => digits(x.owner) === digits(requesterId))) return 'Ya tienes un subbot. Usa .borrarsubbot para quitarlo y crear otro.'
  if (Object.keys(db.data).length >= MAX) return `Se alcanzó el máximo de subbots (${MAX}).`
  return ''
}

// Crea un subbot nuevo y devuelve el código de vinculación.
async function create(number, { owner, name, notify, isOwner }) {
  if (!/^\d{8,15}$/.test(number)) throw Object.assign(new Error('Número inválido. Usa código de país y solo dígitos.'), { friendly: true })
  const why = reasonFor(number, owner, isOwner)
  if (why) throw Object.assign(new Error(why), { friendly: true })
  fs.rmSync(dirOf(number), { recursive: true, force: true })
  fs.mkdirSync(dirOf(number), { recursive: true })
  db.data[number] = { owner, name: name || number, createdAt: Date.now() }
  await db.save()
  try {
    return await start(number, { pair: true, notify })
  } catch (e) {
    await remove(number)
    throw e
  }
}

// Al arrancar: reconecta los subbots cuya sesión quedó guardada en el volumen.
async function restore() {
  if (!MAX || !fs.existsSync(ROOT)) return
  for (const number of fs.readdirSync(ROOT)) {
    if (live.has(number) || !fs.existsSync(path.join(dirOf(number), 'creds.json'))) continue
    const creds = JSON.parse(fs.readFileSync(path.join(dirOf(number), 'creds.json'), 'utf8'))
    if (!creds.registered) { fs.rmSync(dirOf(number), { recursive: true, force: true }); delete db.data[number]; continue }
    db.data[number] ||= { owner: number + '@s.whatsapp.net', name: number, createdAt: Date.now() }
    await start(number).catch(e => console.error('[subbots] restore', number, e.message))
    await sleep(1500)
  }
  await db.save()
}

const list = () => Object.entries(db.data).map(([number, info]) => {
  const e = live.get(number)
  return { number, name: info.name, owner: info.owner, state: e?.state || 'detenido', since: e?.since || null, createdAt: info.createdAt }
})

module.exports = { create, remove, restore, list, max: () => MAX, digits }
