const readline = require('readline')
const pino = require('pino')
const cfg = require('./config')

const ask = q => new Promise(r => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(q, a => { rl.close(); r(a) })
})

async function api(path, params = {}) {
  const u = new URL(cfg.api + path)
  for (const k in params) u.searchParams.set(k, params[k])
  if (cfg.apiKey) u.searchParams.set('apiKey', cfg.apiKey)
  const r = await fetch(u, { signal: AbortSignal.timeout(90000) })
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

const fmtViews = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0)

function getBody(m) {
  const msg = m.message?.ephemeralMessage?.message || m.message?.viewOnceMessage?.message || m.message
  if (!msg) return ''
  let id = msg.buttonsResponseMessage?.selectedButtonId
    || msg.templateButtonReplyMessage?.selectedId
    || msg.listResponseMessage?.singleSelectReply?.selectedRowId
  if (!id && msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try { id = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id } catch {}
  }
  return id || msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || ''
}

async function main() {
  const B = await import('@yui-bails/yui-bails')
  const makeWASocket = (typeof B.default === 'function' ? B.default : B.default?.default) || B.makeWASocket
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, delay } = B.default && typeof B.default === 'object' ? { ...B.default, ...B } : B

  const { state, saveCreds } = await useMultiFileAuthState('session')
  let version
  try { version = (await fetchLatestBaileysVersion()).version } catch {}
  const logger = pino({ level: 'silent' })

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    logger,
    printQRInTerminal: false,
    browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
    auth: makeCacheableSignalKeyStore ? { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) } : state,
    markOnlineOnConnect: false
  })

  if (!sock.authState.creds.registered) {
    const num = (await ask('📱 Número del bot con código de país (ej: 519XXXXXXXX): ')).replace(/\D/g, '')
    await delay(2500)
    const code = await sock.requestPairingCode(num)
    console.log('\n🔑 Código de vinculación: ' + (code?.match(/.{1,4}/g)?.join('-') || code))
    console.log('WhatsApp > Dispositivos vinculados > Vincular con número de teléfono\n')
  }

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log(`✅ ${cfg.botName} conectado`)
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Sesión cerrada. Borra la carpeta session y vuelve a iniciar.')
        process.exit(0)
      }
      console.log('🔄 Reconectando...')
      main()
    }
  })

  const p = cfg.prefix
  const menuText = () => `╔════════════════════════════════╗
║   🐉 *GOKUBOT-MD • SAIYAN XMAS* 🎄
╚════════════════════════════════╝

       ❄️  ⭐  🎄  ⭐  ❄️
       *${cfg.botName}*
   🔥 PODER SAIYAJIN • ESPÍRITU NAVIDEÑO 🔥

╭━━━〔 🐉 *UNIVERSO GOKU* 〕━━━╮
┃ ⚡ ${p}goku → saludo Saiyajin
┃ 🔥 ${p}ki → libera tu energía
┃ 💥 ${p}transformacion → niveles Saiyajin
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🎅 *MODO NAVIDAD* 〕━━╮
┃ 🎄 ${p}navidad → cuenta regresiva
┃ ✨ ${p}frase → frase navideña
┃ 🎁 ${p}regalo → regalo sorpresa
┃ 🌲 ${p}arbol → árbol navideño
┃ 💌 ${p}felicitar <nombre>
┃ 🎲 ${p}sorteo → sorteo grupal
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎬 *YOUTUBE* 〕━━━╮
┃ 🔎 ${p}yts <texto> / ${p}play <texto>
┃ 🎵 ${p}ytmp3 <texto|link>
┃ 🎥 ${p}ytmp4 <texto|link>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🌐 *UTILIDADES* 〕━━━╮
┃ ${p}menuapi → comandos de YuiAPI
┃ ${p}ping → velocidad del bot
┃ ${p}owner → contacto del creador
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🎄❄️ *FELICES FIESTAS, GUERRERO Z* ❄️🎄
👑 ${cfg.creator}  •  🔰 Prefijo: ${p}`


  async function search(jid, q, m) {
    const d = await api('/api/ytsearch', { q })
    const list = (d.result || d.results || d.data || []).slice(0, 3)
    if (!list.length) return sock.sendMessage(jid, { text: '❌ No encontré resultados.' }, { quoted: m })
    for (const v of list) {
      const caption = `🎬 *${v.title}*\n👤 ${v.channelName}\n⏱️ ${v.duration}  👁️ ${fmtViews(v.views)}\n🔗 ${v.videoUrl}`
      try {
        await sock.sendMessage(jid, {
          image: { url: v.thumbnailUrl },
          caption,
          footer: cfg.botName,
          buttons: [
            { buttonId: `${p}ytmp3 ${v.videoUrl}`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
            { buttonId: `${p}ytmp4 ${v.videoUrl}`, buttonText: { displayText: '🎬 Video' }, type: 1 }
          ],
          headerType: 4
        }, { quoted: m })
      } catch {
        await sock.sendMessage(jid, { text: `${caption}\n\n${p}ytmp3 ${v.videoUrl}\n${p}ytmp4 ${v.videoUrl}` }, { quoted: m })
      }
    }
  }

  async function download(jid, q, kind, m) {
    await sock.sendMessage(jid, { text: kind === 'mp3' ? '⏳ Descargando audio...' : '⏳ Descargando video...' }, { quoted: m })
    const d = await api('/api/youtube', { q, type: kind })
    const url = findMediaUrl(d, kind)
    if (!url) return sock.sendMessage(jid, { text: '❌ La API no devolvió un enlace de descarga.' }, { quoted: m })
    const title = d.title || d.result?.title || 'GokuBot'
    if (kind === 'mp3') {
      await sock.sendMessage(jid, { audio: { url }, mimetype: 'audio/mpeg', fileName: title + '.mp3' }, { quoted: m })
    } else {
      await sock.sendMessage(jid, { video: { url }, mimetype: 'video/mp4', caption: `🎬 ${title}\n_${cfg.botName}_` }, { quoted: m })
    }
  }

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const m = messages[0]
    console.log('MSG', type, m?.key?.fromMe, m?.key?.remoteJid, getBody(m || {}).slice(0, 40))
    if (!m?.message || m.key.remoteJid === 'status@broadcast') return
    const jid = m.key.remoteJid
    const body = getBody(m).trim()
    if (!body.startsWith(p)) return
    const [cmdRaw, ...rest] = body.slice(p.length).split(/\s+/)
    const cmd = cmdRaw.toLowerCase()
    const text = rest.join(' ')
    try {
      if (await require('./navidad')(sock, m, jid, cmd, text, p)) return
      if (await require('./yui')(sock, m, jid, cmd, text, p)) return
      switch (cmd) {
        case 'menu': case 'help': case 'menú':
          try {
            await sock.sendMessage(jid, { video: { url: cfg.menuVideo }, gifPlayback: true, caption: menuText() }, { quoted: m })
          } catch { await sock.sendMessage(jid, { text: menuText() }, { quoted: m }) }
          break
        case 'ping': {
          const t = Date.now()
          await sock.sendMessage(jid, { text: `🏓 Pong! ${Date.now() - t}ms` }, { quoted: m })
          break
        }
        case 'owner': {
          if (!cfg.owner) return sock.sendMessage(jid, { text: 'Configura BOT_OWNER en .env.' }, { quoted: m })
          const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${cfg.creator}\nTEL;type=CELL;waid=${cfg.owner}:+${cfg.owner}\nEND:VCARD`
          await sock.sendMessage(jid, { contacts: { displayName: cfg.creator, contacts: [{ vcard }] } }, { quoted: m })
          break
        }
        case 'yts': case 'play': case 'ytsearch':
          if (!text) return sock.sendMessage(jid, { text: `Ejemplo: ${p}${cmd} gura` }, { quoted: m })
          await search(jid, text, m)
          break
        case 'ytmp3': case 'ytmp4': case 'ytv': case 'yta': {
          if (!text) return sock.sendMessage(jid, { text: `Ejemplo: ${p}${cmd} gura` }, { quoted: m })
          const kind = (cmd === 'ytmp3' || cmd === 'yta') ? 'mp3' : 'mp4'
          await download(jid, text, kind, m)
          break
        }
      }
    } catch (e) {
      console.error(e)
      await sock.sendMessage(jid, { text: '⚠️ Ocurrió un error, intenta de nuevo.' }, { quoted: m }).catch(() => {})
    }
  })
}

main()
