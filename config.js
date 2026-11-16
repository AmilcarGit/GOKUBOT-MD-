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
  // Reacciona con ⚡ a cada comando (REACTIONS=false lo apaga).
  reactions: read('REACTIONS', 'true').toLowerCase() !== 'false',
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
    // Respuestas de la IA en nota de voz (solo en privado). Cada usuario puede apagarlo con .voz off
    voice: read('AI_VOICE', 'true').toLowerCase() !== 'false',
    voicePitch: Math.min(1.2, Math.max(0.6, Number(read('AI_VOICE_PITCH', '0.82')) || 0.82)),
    voiceMax: Number(read('AI_VOICE_MAX', '450')) || 450,
    // Botón "Copiar código" cuando la respuesta trae bloques de código (AI_COPY_BUTTON=false lo apaga).
    copyButton: read('AI_COPY_BUTTON', 'true').toLowerCase() !== 'false',
    badge: read('AI_BADGE', 'false').toLowerCase() === 'true',
    model: read('AI_MODEL', 'pro'),
    persona: read('AI_PERSONA', 'Eres Goku, un amigo cercano que atiende este WhatsApp. Tu creador es AmilcarGit y, si te preguntan quién te creó o quién es tu dueño, dices que fue AmilcarGit. Escribes como una persona real en WhatsApp: español natural y relajado, frases cortas, sin sonar a manual ni a asistente, sin listas ni títulos salvo que pidan algo técnico, sin empezar siempre con saludos ni cerrar con "¿en qué más puedo ayudarte?". Reaccionas a lo que siente la persona, usas algún emoji de vez en cuando (no en todas las frases) y de vez en cuando una broma o referencia a entrenar. Respondes breve (1 a 4 renglones) salvo que pidan detalle, siempre con información correcta. Si te preguntan en serio si eres una IA o un bot, lo admites con naturalidad. Si te piden programar, entregas el código completo en un bloque y lo explicas en pocas líneas.')
  },
  navidad: read('NAVIDAD_ENABLED', 'true').toLowerCase() !== 'false',
  seasons: {
    ...SEASON_CONFIG
  }
};
