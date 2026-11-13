// ⚡ TEMA CLÁSICO (sin decoración festiva). Úsalo con BOT_THEME=clasico.
// Sirve también como plantilla para crear tus propios temas.
const emoji = { main: '🐉', star: '⭐', gift: '🎁', snow: '', bell: '🔔', santa: '', deer: '', snowman: '', candle: '', sparkle: '✨', sock: '' };
const deco = ['🐉', '⚡', '🔥', '⭐', '💥'];
const kinds = { ok: '✅', err: '❌', warn: '⚠️', wait: '⏳', info: '🐉' };
const garland = '⚡🔥⚡🔥⚡';
const font = text => String(text);

const title = text => `╔═══════════════════╗\n   🐉 *${String(text).toUpperCase()}* 🐉\n╚═══════════════════╝`;
const section = (name, lines = []) => `╭━━〔 *${String(name).toUpperCase()}* 〕━━╮\n${lines.map(l => `┃ ${l}`).join('\n')}\n╰━━━━━━━━━━━━━━━━━━━╯`;

module.exports = {
  id: 'clasico',
  name: 'Clásico',
  season: null, // sin temporada: los comandos festivos se desactivan
  emoji, deco, kinds, garland,
  font, title, section,
  card: (name, lines = []) => `${title(name)}\n\n${lines.join('\n')}\n\n${garland}`,
  msg: (kind, text) => `${kinds[kind] || kinds.info} ${text}`,
  footer: () => '_🔥 GokuBot-MD • Poder Saiyajin_',
  tree: () => '🌲',
  menuBanner: botName => `${title('GOKUBOT-MD')}\n\n      *${botName}*\n   🔥 PODER SAIYAJIN 🔥`,
  menuFooter: (creator, prefix) => `${garland}\n👑 ${creator}  •  🔰 Prefijo: ${prefix}`
};
