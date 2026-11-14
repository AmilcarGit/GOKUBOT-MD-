'use strict'
// Codificación de video y stickers animados con ffmpeg.
// Si el servidor no tiene ffmpeg, hasFfmpeg() devuelve false y los comandos envían una imagen fija.
const { spawn, spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { once } = require('events')

let available = null
function hasFfmpeg() {
  if (available === null) {
    try { available = spawnSync('ffmpeg', ['-version'], { timeout: 5000 }).status === 0 } catch { available = false }
  }
  return available
}

// Solo se permite un render a la vez: dibujar en JS y codificar usa CPU y el servidor es pequeño.
let busy = false
async function exclusive(task) {
  if (busy) throw Object.assign(new Error('BUSY'), { code: 'BUSY' })
  busy = true
  try { return await task() } finally { busy = false }
}

const tmpFile = ext => path.join(os.tmpdir(), `gokubot-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`)
const remove = file => fs.promises.unlink(file).catch(() => {})

function run(args, { input, timeout = 90000 } = {}) {
  const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'ignore', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr += chunk })
  child.stdin.on('error', () => {})
  const timer = setTimeout(() => child.kill('SIGKILL'), timeout)
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', code => {
      clearTimeout(timer)
      code === 0 ? resolve() : reject(new Error(`ffmpeg: ${stderr.trim().split('\n').pop() || 'código ' + code}`))
    })
  })
  return { child, done }
}

const CODECS = {
  mp4: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-movflags', '+faststart', '-an'],
  webp: q => ['-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', String(q), '-loop', '0', '-preset', 'default', '-an', '-vsync', '0']
}

// Convierte una lista de cuadros RGBA en un archivo. frames: Buffer[] o función (i) => Buffer.
async function encode({ width, height, fps, count, frame, format = 'mp4', quality = 50 }) {
  const out = tmpFile(format)
  const codec = format === 'webp' ? CODECS.webp(quality) : CODECS.mp4
  const { child, done } = run(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0', ...codec, out])
  try {
    for (let i = 0; i < count; i++) {
      const buf = typeof frame === 'function' ? frame(i) : frame[i]
      // Copia: el motor de dibujo reutiliza su búfer en el siguiente cuadro.
      if (!child.stdin.write(Buffer.from(buf))) await once(child.stdin, 'drain')
    }
    child.stdin.end()
    await done
    return await fs.promises.readFile(out)
  } catch (error) {
    child.kill('SIGKILL')
    throw error
  } finally {
    await remove(out)
  }
}

const MAX_STICKER = 480 * 1024

// Sticker animado: prueba calidades decrecientes hasta que pese menos de ~480 KB (límite de WhatsApp).
async function encodeSticker(frames, fps = 12) {
  let last
  for (const quality of [60, 42, 28, 18]) {
    last = await encode({ width: 512, height: 512, fps, count: frames.length, frame: frames, format: 'webp', quality })
    if (last.length <= MAX_STICKER) return last
  }
  return last
}

// Convierte un video o GIF recibido en sticker animado (máx. 6 s).
async function videoToSticker(buffer) {
  const input = tmpFile('bin')
  await fs.promises.writeFile(input, buffer)
  try {
    let last
    for (const quality of [55, 38, 24, 15]) {
      const out = tmpFile('webp')
      try {
        const vf = 'fps=12,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
        await run(['-i', input, '-t', '6', '-vf', vf, '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', String(quality), '-loop', '0', '-an', '-vsync', '0', out]).done
        last = await fs.promises.readFile(out)
      } finally {
        await remove(out)
      }
      if (last.length <= MAX_STICKER) return last
    }
    return last
  } finally {
    await remove(input)
  }
}

module.exports = { hasFfmpeg, exclusive, encode, encodeSticker, videoToSticker }
