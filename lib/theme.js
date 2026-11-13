const cfg = require('../config');

// Carga el tema indicado en BOT_THEME (carpeta /themes). Si no existe, usa navidad.
function load(name) {
  try { return require(`../themes/${String(name).replace(/[^a-z0-9_-]/gi, '')}`); }
  catch { return null; }
}
const theme = load(cfg.theme) || load('navidad');

// Marca invisible: evita aplicar el tema dos veces al mismo mensaje.
const MARK = '⁣';
const HEADER = /^(\S+)\s+\*([^*\n]+)\*(.*)$/u;

// Convierte la primera línea "🐉 *TÍTULO*" de cualquier mensaje en el encabezado del tema
// y agrega el pie. Así todos los comandos (incluso los nuevos) cambian con el tema.
function skin(text) {
  if (typeof text !== 'string' || !text || text.startsWith(MARK)) return text;
  const lines = text.split('\n');
  const match = lines[0].match(HEADER);
  if (!match) return text;
  let rest = match[3].trim();
  if (!/[\p{L}\p{N}]/u.test(rest)) rest = '';
  let name = match[2].trim();
  if (name === name.toUpperCase()) name = name.toLowerCase().replace(/(^|[\s¡¿(])(\p{L})/gu, (_, sp, ch) => sp + ch.toUpperCase());
  const head = theme.title(name) + (rest ? `\n${rest}` : '');
  return `${MARK}${head}\n${lines.slice(1).join('\n')}\n\n${theme.footer()}`.replace(/\n{3,}/g, '\n\n');
}

const mark = text => MARK + text;

// Envuelve el socket para que todo texto o caption saliente pase por el tema.
function wrapSock(sock) {
  const send = (jid, content, ...rest) => {
    if (content && typeof content === 'object') {
      if (typeof content.text === 'string') content = { ...content, text: skin(content.text) };
      else if (typeof content.caption === 'string') content = { ...content, caption: skin(content.caption) };
    }
    return sock.sendMessage(jid, content, ...rest);
  };
  return new Proxy(sock, {
    get(target, prop) {
      if (prop === 'sendMessage') return send;
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

module.exports = {
  theme,
  skin,
  wrapSock,
  mark,
  font: theme.font,
  title: theme.title,
  section: theme.section,
  card: (name, lines) => mark(theme.card(name, lines)),
  msg: (kind, text) => theme.msg(kind, text),
  footer: theme.footer,
  emoji: theme.emoji,
  deco: theme.deco,
  tree: theme.tree
};
