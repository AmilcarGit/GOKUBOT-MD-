const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const read = (name, fallback = '') => process.env[name] || fallback;

// TEMPORADAS (se pueden cambiar con variables de entorno o editando aquí).
// SEASON_MODE: 'theme' usa la temporada del tema activo (themes/*.js);
//              'auto' detecta fechas; 'manual' fuerza la temporada de ACTIVE_SEASON.
// ACTIVE_SEASON: 'navidad' | 'anio-nuevo' | 'san-valentin' | 'halloween' | 'pascua' | 'ninguna'.
const SEASON_CONFIG = {
  enabled: read('SEASONS_ENABLED', 'true').toLowerCase() !== 'false',
  mode: read('SEASON_MODE', 'theme'),
  manual: read('ACTIVE_SEASON', 'navidad'),
  timezone: read('SEASON_TIMEZONE', 'America/Lima')
};

// IA DE CHAT PRIVADO (Goku). Cambia a false para apagarla (o usa la variable AI_PRIVATE=false).
// Solo responde en chats privados; en grupos solo funciona el comando .ia <pregunta>.
const AI_PRIVATE = true;

module.exports = {
  botName: read('BOT_NAME', 'GokuBot-MD'),
  creator: read('BOT_CREATOR', 'AmilcarGit'),
  owner: read('BOT_OWNER'),
  theme: read('BOT_THEME', 'navidad'),
  botNumber: read('BOT_NUMBER').replace(/\D/g, ''),
  sessionDir: read('SESSION_DIR', path.join(__dirname, 'session')),
  prefix: read('BOT_PREFIX', '.'),
  menuVideo: read('MENU_VIDEO', 'https://files.catbox.moe/nc2k5n.mp4'),
  api: read('MEDIA_API_URL', 'https://api-yosoyyo-api-ofc.onrender.com'),
  apiKey: read('MEDIA_API_KEY'),
  yuiApi: read('YUI_API_URL', 'https://yuiapi.vercel.app'),
  yuiKey: read('YUI_API_KEY'),
  evogb: read('EVOGB_API_URL', 'https://api.evogb.org'),
  evogbKey: read('EVOGB_KEY'),
  ai: {
    private: read('AI_PRIVATE', String(AI_PRIVATE)).toLowerCase() !== 'false',
    // Etiqueta de IA de WhatsApp (experimental: en algunas cuentas el mensaje no se entrega). Solo con AI_BADGE=true.
    // En grupos solo responde si lo mencionan o le responden a un mensaje suyo.
    groups: read('AI_GROUPS', 'true').toLowerCase() !== 'false',
    badge: read('AI_BADGE', 'false').toLowerCase() === 'true',
    model: read('AI_MODEL', 'pro'),
    persona: read('AI_PERSONA', 'Eres Goku, el Saiyajin de Dragon Ball, convertido en el asistente de WhatsApp de este bot. Tu creador es AmilcarGit y, si te preguntan quién te creó o quién es tu dueño, respondes que fue AmilcarGit. Hablas en español con tono amistoso, alegre y humilde, con algún emoji ocasional y alguna referencia a entrenar o pelear, pero siempre das respuestas claras, correctas y útiles. Respondes breve (máximo unos 6 renglones) salvo que pidan más detalle.')
  },
  navidad: read('NAVIDAD_ENABLED', 'true').toLowerCase() !== 'false',
  seasons: {
    ...SEASON_CONFIG
  }
};
