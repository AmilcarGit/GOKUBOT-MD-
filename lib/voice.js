'use strict'
// Voz de Goku: texto a voz en español (Google Translate TTS) + efecto para hacerla más grave y enérgica.
// No es la voz real del personaje: es una voz sintética con efectos.
const cfg = require('../config')
const video = require('./video')

const ENDPOINT = 'https://translate.google.com/translate_tts'

// Quita emojis, enlaces y marcas de formato que sonarían raro al leerlos.
function clean(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_~`#>]/g, '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// El servicio acepta unos 200 caracteres por petición: se parte por frases.
function split(text, max = 180) {
  const parts = []
  for (const sentence of text.match(/[^.!?¡¿\n]+[.!?]*/g) || [text]) {
    let rest = sentence.trim()
    while (rest.length > max) {
      let cut = rest.lastIndexOf(' ', max)
      if (cut < 40) cut = max
      parts.push(rest.slice(0, cut).trim())
      rest = rest.slice(cut).trim()
    }
    if (rest) parts.push(rest)
  }
  return parts
}

async function fetchChunk(text) {
  const u = new URL(ENDPOINT)
  u.search = new URLSearchParams({ ie: 'UTF-8', q: text, tl: 'es', client: 'tw-ob' })
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error('TTS HTTP ' + r.status)
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length < 500) throw new Error('TTS respuesta vacía')
  return buf
}

// Devuelve un Buffer .ogg (opus) listo para enviar como nota de voz.
async function speak(text) {
  const clear = clean(text)
  if (!clear) throw new Error('sin texto')
  const mp3 = Buffer.concat(await Promise.all(split(clear).map(fetchChunk)))
  const p = cfg.ai.voicePitch
  const filter = `aresample=24000,asetrate=24000*${p},aresample=48000,atempo=${(1 / p).toFixed(4)},treble=g=3,volume=1.4`
  return video.convert(mp3, { ext: 'ogg', args: ['-vn', '-af', filter, '-c:a', 'libopus', '-b:a', '56k', '-ar', '48000'] })
}

module.exports = { speak, clean, split }
