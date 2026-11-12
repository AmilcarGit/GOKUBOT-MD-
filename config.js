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
  navidad: read('NAVIDAD_ENABLED', 'true').toLowerCase() !== 'false'
};
