const cfg = require('../../config');
const seasonal = require('./temporadas');

const pick = items => items[Math.floor(Math.random() * items.length)];

function countdown(target, eventName) {
  if (!target) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let date = new Date(now.getFullYear(), target.month, target.day);
  if (today > date) date = new Date(now.getFullYear() + 1, target.month, target.day);
  const days = Math.round((date - today) / 86400000);
  return days === 0 ? '🎉 ¡¡HOY ES EL DÍA!!' : `⏳ Faltan *${days}* día${days === 1 ? '' : 's'} para ${eventName}.`;
}

function tree(event) {
  const decorations = event.name === 'Halloween' ? ['🎃', '👻', '🦇', '💀', '✨']
    : event.name === 'San Valentín' ? ['💘', '🌹', '💝', '❤️', '✨']
    : event.name === 'Año Nuevo' ? ['🎆', '🎉', '🥂', '⭐', '✨']
    : event.name === 'Pascua' ? ['🐰', '🥚', '🌷', '🐣', '✨']
    : ['🎄', '🎁', '🔴', '🟡', '✨'];
  let result = '          ⭐\n';
  for (let i = 1; i <= 6; i++) {
    let row = '';
    for (let j = 0; j < i * 2 - 1; j++) row += pick(decorations);
    result += ' '.repeat((7 - i) * 2) + row + '\n';
  }
  return result + '          🟫🟫';
}

function menu(p) {
  const event = seasonal.getEvent();
  const goku = `╭━━〔 🐉 UNIVERSO GOKU 〕━━╮
│ ${p}goku
│ ${p}ki
│ ${p}transformacion
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ⚔️ SAIYAJIN RPG 〕━━╮
│ ${p}perfil / ${p}nivel
│ ${p}entrenar / ${p}transformar
│ ${p}duelo @usuario
│ ${p}ranking / ${p}misiones
│ ${p}reclamar
│ ${p}tienda / ${p}comprar <id>
│ ${p}inventario / ${p}shenlong
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👥 PERSONAJES 〕━━╮
│ ${p}personajes
│ ${p}invocar
│ ${p}misguerreros
│ ${p}mejorar <id>
╰━━━━━━━━━━━━━━━━━━━━╯`;
  const festive = event ? `\n\n╭━━〔 ${event.emoji} ${event.name.toUpperCase()} 〕━━╮
│ ${p}evento
│ ${p}frase
│ ${p}regalo
│ ${p}arbol
│ ${p}felicitar <nombre>
│ ${p}sorteo
╰━━━━━━━━━━━━━━━━━━━━╯` : '';
  return `╔════════════════════════════════╗
║       🐉 *GOKUBOT-MD*          ║
╚════════════════════════════════╝

* ${cfg.botName} *
🔥 PODER SAIYAJIN 🔥

${goku}${festive}

╭━━〔 🎬 YOUTUBE 〕━━╮
│ ${p}yts <texto> / ${p}play <texto>
│ ${p}ytmp3 <texto|link>
│ ${p}ytmp4 <texto|link>
╰━━━━━━━━━━━━━━━━━━╯

╭━━〔 🌐 UTILIDADES 〕━━╮
│ ${p}menuapi
│ ${p}ping
│ ${p}owner
╰━━━━━━━━━━━━━━━━━━╯

👑 ${cfg.creator} • Prefijo: ${p}`;
}

const BASE_COMMANDS = new Set(['menu', 'help', 'menú', 'goku', 'ki', 'transformacion', 'transformación']);
const EVENT_COMMANDS = new Set(['evento', 'temporada', 'navidad', 'frase', 'regalo', 'arbol', 'felicitar', 'sorteo']);

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!BASE_COMMANDS.has(cmd) && !EVENT_COMMANDS.has(cmd)) return false;
  const event = seasonal.getEvent();
  if (EVENT_COMMANDS.has(cmd) && !event) {
    await sock.sendMessage(jid, { text: 'No hay una temporada activa. Cambia SEASON_MODE a manual y elige ACTIVE_SEASON en config.js si quieres activar una.' }, { quoted: m });
    return true;
  }

  const reply = value => sock.sendMessage(jid, { text: seasonal.decorate(value) }, { quoted: m });

  switch (cmd) {
    case 'menu': case 'help': case 'menú': {
      const caption = menu(prefix);
      try {
        const response = await fetch(cfg.menuVideo, { signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error('No se pudo obtener el video del menú');
        const video = Buffer.from(await response.arrayBuffer());
        await sock.sendMessage(jid, { video, mimetype: 'video/mp4', gifPlayback: true, caption }, { quoted: m });
      } catch {
        await reply(caption);
      }
      return true;
    }
    case 'goku':
      await reply(`🐉 *¡HEY! SOY GOKU* 🐉\n\n${pick(seasonal.goku.greetings)}${event ? `\n\n${event.emoji} ${event.greeting}` : ''}`);
      return true;
    case 'ki':
      await reply(`╭━━〔 🔥 LECTURA DE KI 〕━━╮\n┃ ${pick(seasonal.goku.ki)}\n┃ ⚡ Nivel: ${Math.floor(50 + Math.random() * 950)}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
      return true;
    case 'transformacion': case 'transformación':
      await reply(`🐉 *TRANSFORMACIONES SAIYAJIN*\n\n${seasonal.goku.transformations.join('\n\n')}`);
      return true;
    case 'evento': case 'temporada': case 'navidad':
      await reply(`${event.emoji} *MODO ${event.name.toUpperCase()}* ${event.emoji}\n${countdown(event.countdown, event.name)}\n\n${pick(event.phrases)}\n\n${event.greeting}\n\n⚙️ Modo: ${cfg.seasons.mode} • Zona: ${cfg.seasons.timezone}`);
      return true;
    case 'frase':
      await reply(`${event.emoji} ${pick(event.phrases)}`);
      return true;
    case 'regalo':
      await reply(`🎁 *REGALO SORPRESA*\n\n${pick(event.gifts)}\n\n${event.greeting}`);
      return true;
    case 'arbol':
      await reply(`${tree()}\n\n${event.greeting}`);
      return true;
    case 'felicitar':
      if (!text) { await reply(`Ejemplo: ${prefix}felicitar nombre`); return true; }
      await reply(`${event.emoji} *¡Feliz ${event.name}, ${text.trim()}!*\n\n${pick(event.phrases)}\n\nDe parte de ${cfg.creator} y ${cfg.botName}.`);
      return true;
    case 'sorteo': {
      if (!jid.endsWith('@g.us')) { await reply('🎲 Este comando solo funciona en grupos.'); return true; }
      const metadata = await sock.groupMetadata(jid);
      if (!metadata.participants?.length) { await reply('No hay participantes para el sorteo.'); return true; }
      const winner = pick(metadata.participants).id;
      await sock.sendMessage(jid, {
        text: `🎁 ¡${event.name}! La suerte eligió a @${winner.split('@')[0]}.`,
        mentions: [winner]
      }, { quoted: m });
      return true;
    }
  }
  return true;
};

module.exports.menu = menu;
