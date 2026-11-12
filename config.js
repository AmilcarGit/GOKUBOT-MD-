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

// CONFIGURA AQUÍ LAS TEMPORADAS.\n// mode: 'auto' detecta fechas; 'manual' fuerza la temporada indicada.\n// manual: 'navidad' | 'anio-nuevo' | 'san-valentin' | 'halloween' | 'pascua' | 'ninguna'.\nconst SEASON_CONFIG = {
  enabled: true,
  mode: 'auto',
  manual: 'navidad',
  timezone: 'America/Lima'
};

module.exports = {
  botName: read('BOT_NAME', 'GokuBot-MD'),
  creator: read('BOT_CREATOR', 'AmilcarGit'),
  owner: read('BOT_OWNER'),
  prefix: read('BOT_PREFIX', '.'),
  menuVideo: read('MENU_VIDEO', 'https://files.catbox.moe/nc2k5n.mp4'),
  api: read('MEDIA_API_URL', 'https://api-yosoyyo-api-ofc.onrender.com'),
  apiKey: read('MEDIA_API_KEY'),
  yuiApi: read('YUI_API_URL', 'https://yuiapi.vercel.app'),
  yuiKey: read('YUI_API_KEY'),
  navidad: read('NAVIDAD_ENABLED', 'true').toLowerCase() !== 'false',
  seasons: {
    ...SEASON_CONFIG
  }
};
