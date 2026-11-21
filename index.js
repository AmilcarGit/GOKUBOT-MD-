const readline = require('readline')
const pino = require('pino')
const cfg = require('./config')
const { attach } = require('./lib/handlers')
const status = require('./lib/status')

const ask = q => new Promise(r => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(q, a => { rl.close(); r(a) })
})

async function main() {
  const B = await import('@yui-bails/yui-bails')
  const makeWASocket = (typeof B.default === 'function' ? B.default : B.default?.default) || B.makeWASocket
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, delay } = B.default && typeof B.default === 'object' ? { ...B.default, ...B } : B

  const { state, saveCreds } = await useMultiFileAuthState(cfg.sessionDir)
  let version
  try { version = (await fetchLatestBaileysVersion()).version } catch {}
  const logger = pino({ level: 'silent' })

  require('fs').mkdirSync(require('./lib/paths').DATA_DIR, { recursive: true })
  const sock = makeWASocket({
    ...(version ? { version } : {}),
    logger,
    printQRInTerminal: false,
    browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
    auth: makeCacheableSignalKeyStore ? { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) } : state,
    markOnlineOnConnect: false,
    // Recordatorios (.recordar) guardados en el volumen para que sobrevivan reinicios.
    schedulerFile: require('path').join(require('./lib/paths').DATA_DIR, 'programados.json')
  })

  if (!sock.authState.creds.registered) {
    let num = cfg.botNumber
    if (!num) {
      if (!process.stdin.isTTY) {
        console.log('❌ Falta BOT_NUMBER (número del bot con código de país, solo dígitos) para generar el código de vinculación.')
        process.exit(1)
      }
      num = (await ask('📱 Número del bot con código de país (ej: 519XXXXXXXX): ')).replace(/\D/g, '')
    }
    await delay(2500)
    const code = await sock.requestPairingCode(num)
    console.log('\n🔑 Código de vinculación: ' + (code?.match(/.{1,4}/g)?.join('-') || code))
    console.log('WhatsApp > Dispositivos vinculados > Vincular con número de teléfono\n')
  }

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection) status.onConnection(connection)
    if (connection === 'open') console.log(`✅ ${cfg.botName} conectado`)
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Sesión cerrada. Borra la carpeta de sesión (SESSION_DIR) y vuelve a iniciar.')
        process.exit(0)
      }
      console.log('🔄 Reconectando...')
      main()
    }
  })

  attach(sock)

  // Subbots guardados: se reconectan solos al arrancar.
  require('./lib/subbots').restore().catch(e => console.error('[subbots] restore:', e.message))
}

main()
