const fs = require('fs')
const os = require('os')
const path = require('path')
const { monitorEventLoopDelay } = require('perf_hooks')
const cfg = require('../config')
const { DATA_DIR } = require('./paths')

// Contadores en memoria desde que arrancó el proceso (se reinician con cada despliegue).
const state = {
  startedAt: Date.now(),
  connectedAt: null,
  connection: 'iniciando',
  reconnects: 0,
  messages: 0,
  commands: 0,
  errors: 0,
  lastError: '',
  lastErrorAt: null,
  top: new Map()
}

const loop = monitorEventLoopDelay({ resolution: 20 })
loop.enable()

function onConnection(connection) {
  if (connection === 'open') {
    state.connection = 'open'
    state.connectedAt = Date.now()
  } else if (connection === 'close') {
    state.connection = 'close'
    state.reconnects++
  } else if (connection === 'connecting') {
    state.connection = 'connecting'
  }
}

const countMessage = () => { state.messages++ }

function countCommand(cmd) {
  state.commands++
  state.top.set(cmd, (state.top.get(cmd) || 0) + 1)
}

function countError(error) {
  state.errors++
  state.lastError = String((error && error.message) || error).slice(0, 80)
  state.lastErrorAt = Date.now()
}

function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`, `${s % 60}s`].filter(Boolean).join(' ')
}

function bytes(n) {
  if (!Number.isFinite(n)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

// Barra de uso: ▰▰▰▱▱▱▱▱▱▱
function bar(fraction, size = 10) {
  const filled = Math.max(0, Math.min(size, Math.round(fraction * size)))
  return '▰'.repeat(filled) + '▱'.repeat(size - filled)
}

// Uso de CPU del proceso entre dos muestras (porcentaje de un núcleo).
let lastCpu = { usage: process.cpuUsage(), time: process.hrtime.bigint() }
function cpuPercent() {
  const usage = process.cpuUsage()
  const time = process.hrtime.bigint()
  const elapsedUs = Number(time - lastCpu.time) / 1000
  const usedUs = (usage.user - lastCpu.usage.user) + (usage.system - lastCpu.usage.system)
  lastCpu = { usage, time }
  // Con muestras de menos de 1 s el resultado no es fiable: se devuelve 0.
  return elapsedUs > 1e6 ? Math.min(100, (usedUs / elapsedUs) * 100) : 0
}

function countPlayers() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'players.json'), 'utf8'))
    return Object.keys(data.players || data).length
  } catch {
    return 0
  }
}

function disk(dir) {
  try {
    const s = fs.statfsSync(dir)
    const total = s.blocks * s.bsize
    return { total, free: s.bavail * s.bsize }
  } catch {
    return null
  }
}

// Toma una muestra completa del estado actual del bot.
function snapshot() {
  const mem = process.memoryUsage()
  const lag = Number.isFinite(loop.mean) ? loop.mean / 1e6 : 0
  loop.reset()
  const diskInfo = disk(fs.existsSync(DATA_DIR) ? DATA_DIR : cfg.sessionDir) || disk(__dirname)
  return {
    uptime: Date.now() - state.startedAt,
    connectedFor: state.connectedAt ? Date.now() - state.connectedAt : 0,
    connection: state.connection,
    reconnects: state.reconnects,
    messages: state.messages,
    commands: state.commands,
    errors: state.errors,
    lastError: state.lastError,
    lastErrorAt: state.lastErrorAt,
    top: [...state.top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    cpu: cpuPercent(),
    lag,
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    sysTotal: os.totalmem(),
    sysFree: os.freemem(),
    cores: os.cpus().length,
    load: os.loadavg()[0],
    disk: diskInfo,
    node: process.version,
    platform: `${os.platform()} ${os.arch()}`,
    host: process.env.RAILWAY_ENVIRONMENT_NAME ? 'Railway' : 'Local',
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA || '').slice(0, 7),
    sessionSaved: fs.existsSync(path.join(cfg.sessionDir, 'creds.json')),
    players: countPlayers()
  }
}

module.exports = { state, onConnection, countMessage, countCommand, countError, snapshot, duration, bytes, bar }
