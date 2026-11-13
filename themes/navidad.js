// 🎄 TEMA NAVIDAD
// Todo el aspecto visual del bot (emojis, marcos, letras, pies de mensaje) sale de este archivo.
// Para cambiar de tema crea otro archivo en /themes con esta misma forma y pon BOT_THEME=<nombre>.

// Letras navideñas: alfabeto cursivo (𝓐𝓑𝓒…). Conserva tildes y la ñ.
const A = 0x1d4d0; // 𝓐
const a = 0x1d4ea; // 𝓪
function font(text) {
  return String(text).normalize('NFD').replace(/[A-Za-z]/g, c => {
    const code = c.charCodeAt(0);
    return String.fromCodePoint(code <= 90 ? A + code - 65 : a + code - 97);
  }).normalize('NFC');
}

const emoji = {
  main: '🎄', star: '⭐', gift: '🎁', snow: '❄️', bell: '🔔', santa: '🎅',
  deer: '🦌', snowman: '⛄', candle: '🕯️', sparkle: '✨', sock: '🧦'
};

// Decoración al azar para guirnaldas y árboles.
const deco = ['🎄', '🎁', '❄️', '⭐', '🔔', '🎅', '🦌', '⛄', '🕯️', '✨'];

// Prefijos por tipo de mensaje.
const kinds = {
  ok: '🎁',
  err: '🧊',
  warn: '🔔',
  wait: '🕯️',
  info: '🎄'
};

const garland = '🎄❄️⭐❄️🎄';
const pick = items => items[Math.floor(Math.random() * items.length)];

const footers = [
  '🎅 ¡Felices fiestas, Guerrero Z!',
  '❄️ Que la magia de la Navidad te acompañe.',
  '🎁 Comparte alegría esta Navidad.',
  '⭐ Que brille tu Navidad.',
  '🔔 Paz, amor y mucho poder Saiyajin.'
];

function title(text) {
  return `╔═══ ❄️ ═══ 🎄 ═══ ❄️ ═══╗\n   ✨ *${font(text)}* ✨\n╚═══ 🎁 ═══ ⭐ ═══ 🎁 ═══╝`;
}

function section(name, lines = []) {
  const body = lines.map(line => `┃ 🎁 ${line}`).join('\n');
  return `╭━━〔 🎅 *${font(name)}* 〕━━╮\n${body}\n╰━━━━ ❄️ ⭐ ❄️ ━━━━╯`;
}

function card(name, lines = []) {
  return `${title(name)}\n\n${lines.join('\n')}\n\n${garland}`;
}

function msg(kind, text) {
  return `${kinds[kind] || kinds.info} ${text}`;
}

function footer() {
  return `_${pick(footers)}_`;
}

function tree() {
  let result = '          ⭐\n';
  for (let i = 1; i <= 6; i++) {
    let row = '';
    for (let j = 0; j < i * 2 - 1; j++) row += pick(['🎄', '🎁', '🔴', '🟡', '✨', '❄️']);
    result += ' '.repeat((7 - i) * 2) + row + '\n';
  }
  return result + '          🟫🟫';
}

module.exports = {
  id: 'navidad',
  name: 'Navidad',
  season: 'navidad', // temporada que activa este tema (ver commands/goku/temporadas.js)
  emoji, deco, kinds, garland,
  font, title, section, card, msg, footer, tree,
  menuBanner: botName => `${title('GOKUBOT-MD • SAIYAN XMAS')}\n\n      ❄️  ⭐  🎄  ⭐  ❄️\n      *${font(botName)}*\n  🔥 PODER SAIYAJIN • ESPÍRITU NAVIDEÑO 🔥`,
  menuFooter: (creator, prefix) => `${garland}\n🎅 *${font('Felices fiestas, Guerrero Z')}* 🎅\n👑 ${creator}  •  🔰 Prefijo: ${prefix}`
};
