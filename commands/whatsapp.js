'use strict'
// Funciones nativas de WhatsApp: botón de copiar, tarjeta de contacto, ubicación, enlaces, mensaje editable y reacciones.
const cfg = require('../config')
const T = require('../lib/theme')

const COMMANDS = new Set(['copiar', 'contacto', 'creador', 'ubicacion', 'repo', 'cargar'])
const REPO = 'https://github.com/AmilcarGit/GOKUBOT-MD-'
const say = (sock, jid, m, kind, text) => sock.sendMessage(jid, { text: T.msg(kind, text) }, { quoted: m })
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Lugares ficticios del universo Z con coordenadas reales de islas (solo para el mensaje de ubicación).
const PLACES = [
  ['Isla Tortuga (Casa Kame)', 'Mar del Sur — entrenamiento del Maestro Roshi', 21.3069, -157.8583],
  ['Monte Paozu', 'Hogar de Goku', 35.3606, 138.7274],
  ['Torre Karin', 'Semillas del ermitaño', 27.9881, 86.925]
]

function ownerNumber() {
  return String(cfg.owner || '').split(/[,\s]+/).map(x => x.replace(/\D/g, '')).find(x => x.length >= 8 && x.length <= 14) || ''
}

async function handler(sock, m, jid, cmd, text, prefix) {
  if (!COMMANDS.has(cmd)) return false
  try {
    if (cmd === 'copiar') {
      const body = (text || '').trim() || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || ''
      if (!body) return await say(sock, jid, m, 'info', `Uso: ${prefix}copiar <texto> (o responde a un mensaje con ${prefix}copiar).`), true
      await sock.sendMessage(jid, {
        text: '📋 Listo para copiar:\n\n' + body.slice(0, 1500),
        footer: 'Toca el botón para copiarlo al portapapeles',
        buttons: [{ text: '📋 Copiar texto', copy: body.slice(0, 2000) }]
      }, { quoted: m })
    } else if (cmd === 'contacto' || cmd === 'creador') {
      const num = ownerNumber()
      const vcard = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:AmilcarGit (Creador de GokuBot-MD)', 'ORG:GokuBot-MD', num ? `TEL;type=CELL;type=VOICE;waid=${num}:+${num}` : '', 'END:VCARD'].filter(Boolean).join('\n')
      await sock.sendMessage(jid, { contacts: { displayName: 'AmilcarGit', contacts: [{ vcard }] } }, { quoted: m })
      await sock.sendMessage(jid, {
        text: T.msg('info', 'Creador del bot: *AmilcarGit*'),
        footer: 'GokuBot-MD',
        buttons: [{ text: '🌐 Ver repositorio', url: REPO }]
      }, { quoted: m })
    } else if (cmd === 'ubicacion') {
      const [name, address, lat, lon] = PLACES[Math.floor(Math.random() * PLACES.length)]
      await sock.sendMessage(jid, { location: { degreesLatitude: lat, degreesLongitude: lon, name, address } }, { quoted: m })
    } else if (cmd === 'repo') {
      await sock.sendMessage(jid, {
        text: T.msg('info', `*${cfg.botName}* es de código abierto.`),
        footer: 'Toca un botón',
        buttons: [{ text: '🌐 Abrir repositorio', url: REPO }, { text: '📋 Copiar enlace', copy: REPO }]
      }, { quoted: m })
    } else if (cmd === 'cargar') {
      // Un solo mensaje que se va editando mientras el ki sube.
      const bar = n => '▰'.repeat(n) + '▱'.repeat(10 - n)
      const sent = await sock.sendMessage(jid, { text: `⚡ Cargando ki...\n${bar(0)} 0%` }, { quoted: m })
      for (let n = 2; n <= 10; n += 2) {
        await sleep(900)
        await sock.sendMessage(jid, { text: `⚡ Cargando ki...\n${bar(n)} ${n * 10}%`, edit: sent.key })
      }
      await sleep(700)
      await sock.sendMessage(jid, { text: `💥 ¡KI AL MÁXIMO!\n${bar(10)} 100%`, edit: sent.key })
    }
  } catch (error) {
    console.error('[whatsapp]', cmd, error.message)
    await say(sock, jid, m, 'err', 'WhatsApp no aceptó ese mensaje. Intenta de nuevo.').catch(() => {})
  }
  return true
}

module.exports = handler
