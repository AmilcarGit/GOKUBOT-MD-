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
    enabled: read('SEASONS_ENABLED', 'true').toLowerCase() !== 'false',
    mode: read('SEASON_MODE', 'auto').toLowerCase(),
    manual: read('ACTIVE_SEASON', 'navidad').toLowerCase(),
    timezone: read('SEASON_TIMEZONE', 'America/Lima')
  }
};
