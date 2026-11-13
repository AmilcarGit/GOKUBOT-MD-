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

const BASE_COMMANDS = new Set(['goku', 'ki', 'transformacion', 'transformación']);
const EVENT_COMMANDS = new Set(['evento', 'temporada', 'navidad', 'frase', 'regalo', 'arbol', 'felicitar', 'sorteo']);

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  if (!BASE_COMMANDS.has(cmd) && !EVENT_COMMANDS.has(cmd)) return false;
  const event = seasonal.getEvent();
  if (EVENT_COMMANDS.has(cmd) && !event) {
    await sock.sendMessage(jid, { text: 'No hay una temporada activa en el tema actual. Usa BOT_THEME=navidad o cambia el modo de temporadas en config.js.' }, { quoted: m });
    return true;
  }

  const reply = value => sock.sendMessage(jid, { text: seasonal.decorate(value) }, { quoted: m });

  switch (cmd) {
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
      await reply(`${event.emoji} *MODO ${event.name.toUpperCase()}* ${event.emoji}\n${countdown(event.countdown, event.name)}\n\n${pick(event.phrases)}\n\n${event.greeting}\n\n⚙️ Tema: ${cfg.theme} • Zona: ${cfg.seasons.timezone}`);
      return true;
    case 'frase':
      await reply(`${event.emoji} ${pick(event.phrases)}`);
      return true;
    case 'regalo':
      await reply(`🎁 *REGALO SORPRESA*\n\n${pick(event.gifts)}\n\n${event.greeting}`);
      return true;
    case 'arbol':
      await reply(`${tree(event)}\n\n${event.greeting}`);
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

