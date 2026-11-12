const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'players.json');
const TRAIN_COOLDOWN = 30 * 1000;
const DUEL_COOLDOWN = 60 * 1000;
const MAX_LEVEL = 100;

const RANKS = [
  { min: 1, name: 'Aprendiz', power: 1 },
  { min: 5, name: 'Guerrero Z', power: 1.2 },
  { min: 10, name: 'Saiyajin', power: 1.5 },
  { min: 20, name: 'Super Saiyajin', power: 2 },
  { min: 35, name: 'Saiyajin Divino', power: 2.8 },
  { min: 50, name: 'Super Saiyajin Blue', power: 4 },
  { min: 75, name: 'Ultra Instinto', power: 6 },
  { min: 100, name: 'Leyenda Saiyajin', power: 10 }
];

const TRANSFORMS = [
  { level: 1, name: 'Base', multiplier: 1 },
  { level: 5, name: 'Kaioken', multiplier: 1.2 },
  { level: 10, name: 'Super Saiyajin', multiplier: 1.5 },
  { level: 20, name: 'Super Saiyajin 2', multiplier: 2 },
  { level: 35, name: 'Super Saiyajin God', multiplier: 2.8 },
  { level: 50, name: 'Super Saiyajin Blue', multiplier: 4 },
  { level: 75, name: 'Ultra Instinto', multiplier: 6 }
];

const SHOP = [
  { id: 'senzu', name: 'Semilla del ermitaño', price: 120, description: 'Recuperación y +50 XP' },
  { id: 'armor', name: 'Armadura Saiyajin', price: 250, description: '+10% poder en duelos' },
  { id: 'gravity', name: 'Cámara de gravedad', price: 400, description: '+25 XP al entrenar' },
  { id: 'radar', name: 'Radar del dragón', price: 600, description: 'Ayuda a encontrar esferas' }
];

const MISSIONS = [
  { id: 'train', name: 'Entrenamiento', goal: 3, reward: 100, description: 'Entrena 3 veces' },
  { id: 'duel', name: 'Rival Saiyajin', goal: 1, reward: 150, description: 'Participa en un duelo' },
  { id: 'social', name: 'Guerrero activo', goal: 2, reward: 60, description: 'Completa 2 acciones RPG' }
];

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { players: {} };
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data && data.players ? data : { players: {} };
  } catch (error) {
    console.error('[RPG] No se pudo leer la base local:', error.message);
    return { players: {} };
  }
}

let db = loadDB();
let saveQueue = Promise.resolve();

function saveDB() {
  saveQueue = saveQueue.then(async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temp = DATA_FILE + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(db, null, 2));
    fs.renameSync(temp, DATA_FILE);
  }).catch(error => console.error('[RPG] Error guardando datos:', error.message));
  return saveQueue;
}

function newPlayer(id, name) {
  return {
    id, name: cleanName(name), level: 1, xp: 0, coins: 100,
    wins: 0, losses: 0, training: 0, power: 100,
    balls: [], inventory: {}, transform: 'Base',
    cooldowns: {}, missionDate: '', missionProgress: {}, claimedMissions: [],
    createdAt: Date.now()
  };
}

function cleanName(value) {
  return String(value || 'Guerrero').replace(/[\r\n<>]/g, '').slice(0, 22);
}

function getPlayer(id, name) {
  if (!db.players[id]) db.players[id] = newPlayer(id, name);
  if (name) db.players[id].name = cleanName(name);
  const p = db.players[id];
  p.inventory ||= {};
  p.balls ||= [];
  p.cooldowns ||= {};
  p.missionProgress ||= {};
  return p;
}

function rankFor(level) {
  return [...RANKS].reverse().find(rank => level >= rank.min) || RANKS[0];
}

function transformFor(level) {
  return [...TRANSFORMS].reverse().find(t => level >= t.level) || TRANSFORMS[0];
}

function xpNeeded(level) {
  return 100 + (level - 1) * 35;
}

function powerFor(player) {
  const rank = rankFor(player.level);
  const transform = transformFor(player.level);
  return Math.floor((player.power + player.level * 35) * rank.power * transform.multiplier / Math.max(1, rank.power));
}

function progressMission(player, key, amount = 1) {
  const today = new Date().toISOString().slice(0, 10);
  if (player.missionDate !== today) {
    player.missionDate = today;
    player.missionProgress = {};
    player.claimedMissions = [];
  }
  player.missionProgress[key] = (player.missionProgress[key] || 0) + amount;
}

function applyXP(player, amount) {
  player.xp += amount;
  let levels = 0;
  while (player.level < MAX_LEVEL && player.xp >= xpNeeded(player.level)) {
    player.xp -= xpNeeded(player.level);
    player.level++;
    levels++;
  }
  if (player.level >= MAX_LEVEL) player.xp = Math.min(player.xp, xpNeeded(MAX_LEVEL) - 1);
  return levels;
}

function cooldownLeft(player, key, duration) {
  return Math.max(0, (player.cooldowns[key] || 0) + duration - Date.now());
}

function fmtTime(ms) {
  const sec = Math.ceil(ms / 1000);
  return sec >= 60 ? Math.floor(sec / 60) + 'm ' + (sec % 60) + 's' : sec + 's';
}

function mentionedJid(m) {
  const msg = m.message?.ephemeralMessage?.message || m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
  const ctx = m.message?.extendedTextMessage?.contextInfo || m.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo;
  return ctx?.mentionedJid?.[0] || null;
}

function makeCard(player) {
  const W = 960, H = 540;
  const pixels = Buffer.alloc(W * H * 4);
  const put = (x, y, color) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = 255;
  };
  const rect = (x, y, w, h, color) => {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) put(xx, yy, color);
  };
  const line = (x, y, w, h, color) => rect(x, y, w, h, color);
  const C = {
    bg1: [8, 13, 31], bg2: [17, 34, 65], panel: [18, 29, 53],
    gold: [255, 190, 65], orange: [255, 111, 35], white: [240, 246, 255],
    muted: [147, 169, 202], cyan: [69, 202, 255], green: [75, 220, 154],
    bar: [37, 54, 83], red: [255, 88, 88]
  };
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const col = C.bg1.map((v, i) => Math.round(v * (1 - t) + C.bg2[i] * t));
    rect(0, y, W, 1, col);
  }
  for (let i = 0; i < 18; i++) {
    const x = (i * 137 + 47) % W, y = (i * 83 + 29) % H;
    rect(x, y, 3, 3, [35, 73, 112]);
  }
  rect(30, 30, W - 60, H - 60, C.panel);
  rect(30, 30, W - 60, 6, C.orange);
  rect(58, 78, 5, 350, C.gold);
  rect(80, 82, 800, 2, [49, 76, 112]);

  const FONT = {
    'A':['01110','10001','10001','11111','10001','10001','10001'],
    'B':['11110','10001','10001','11110','10001','10001','11110'],
    'C':['01111','10000','10000','10000','10000','10000','01111'],
    'D':['11110','10001','10001','10001','10001','10001','11110'],
    'E':['11111','10000','10000','11110','10000','10000','11111'],
    'F':['11111','10000','10000','11110','10000','10000','10000'],
    'G':['01111','10000','10000','10111','10001','10001','01111'],
    'H':['10001','10001','10001','11111','10001','10001','10001'],
    'I':['11111','00100','00100','00100','00100','00100','11111'],
    'J':['00111','00010','00010','00010','10010','10010','01100'],
    'K':['10001','10010','10100','11000','10100','10010','10001'],
    'L':['10000','10000','10000','10000','10000','10000','11111'],
    'M':['10001','11011','10101','10101','10001','10001','10001'],
    'N':['10001','11001','10101','10011','10001','10001','10001'],
    'O':['01110','10001','10001','10001','10001','10001','01110'],
    'P':['11110','10001','10001','11110','10000','10000','10000'],
    'Q':['01110','10001','10001','10001','10101','10010','01101'],
    'R':['11110','10001','10001','11110','10100','10010','10001'],
    'S':['01111','10000','10000','01110','00001','00001','11110'],
    'T':['11111','00100','00100','00100','00100','00100','00100'],
    'U':['10001','10001','10001','10001','10001','10001','01110'],
    'V':['10001','10001','10001','10001','10001','01010','00100'],
    'W':['10001','10001','10001','10101','10101','10101','01010'],
    'X':['10001','10001','01010','00100','01010','10001','10001'],
    'Y':['10001','10001','01010','00100','00100','00100','00100'],
    'Z':['11111','00001','00010','00100','01000','10000','11111'],
    '0':['01110','10001','10011','10101','11001','10001','01110'],
    '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','10001','00001','00010','00100','01000','11111'],
    '3':['11110','00001','00001','01110','00001','00001','11110'],
    '4':['00010','00110','01010','10010','11111','00010','00010'],
    '5':['11111','10000','10000','11110','00001','00001','11110'],
    '6':['01110','10000','10000','11110','10001','10001','01110'],
    '7':['11111','00001','00010','00100','01000','01000','01000'],
    '8':['01110','10001','10001','01110','10001','10001','01110'],
    '9':['01110','10001','10001','01111','00001','00001','01110'],
    '.':['00000','00000','00000','00000','00000','00110','00110'],
    '-':['00000','00000','00000','11111','00000','00000','00000'],
    ':':['00000','00110','00110','00000','00110','00110','00000'],
    '/':['00001','00010','00010','00100','01000','01000','10000'],
    ' ':['00000','00000','00000','00000','00000','00000','00000']
  };
  function text(str, x, y, scale, color, maxChars) {
    const normalized = String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 .:/-]/g, ' ');
    const chars = normalized.slice(0, maxChars || 40);
    for (let n = 0; n < chars.length; n++) {
      const glyph = FONT[chars[n]] || FONT[' '];
      for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++)
        if (glyph[gy][gx] === '1') rect(x + n * 6 * scale + gx * scale, y + gy * scale, scale, scale, color);
    }
  }

  text('GOKUBOT SAIYAN PROFILE', 82, 52, 3, C.gold, 34);
  text(player.name, 92, 115, 5, C.white, 22);
  text('LEVEL ' + player.level + '  /  100', 92, 170, 3, C.cyan, 26);
  text(rankFor(player.level).name, 92, 220, 3, C.gold, 28);
  text('TRANSFORMATION', 92, 285, 2, C.muted, 24);
  text(transformFor(player.level).name, 92, 310, 3, C.orange, 26);
  text('COMBAT POWER', 92, 380, 2, C.muted, 22);
  text(String(powerFor(player)), 92, 410, 4, C.white, 18);

  const needed = xpNeeded(player.level);
  const pct = Math.min(1, player.xp / needed);
  text('EXPERIENCE ' + player.xp + ' / ' + needed, 580, 150, 2, C.muted, 28);
  rect(580, 178, 300, 18, C.bar);
  rect(580, 178, Math.round(300 * pct), 18, C.green);
  text('COINS ' + player.coins, 580, 235, 3, C.gold, 20);
  text('WINS ' + player.wins + '   LOSSES ' + player.losses, 580, 290, 2, C.white, 28);
  text('DRAGON BALLS ' + player.balls.length + ' / 7', 580, 340, 2, C.cyan, 25);
  for (let i = 0; i < 7; i++) {
    const x = 590 + i * 39;
    rect(x, 385, 27, 27, i < player.balls.length ? C.gold : C.bar);
    rect(x + 7, 392, 4, 4, i < player.balls.length ? C.orange : C.muted);
    rect(x + 16, 398, 4, 4, i < player.balls.length ? C.orange : C.muted);
  }
  text('TRAIN HARD. BREAK YOUR LIMITS.', 92, 475, 2, C.muted, 36);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (const byte of buf) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const name = Buffer.from(type);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([name, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    const offset = y * (W * 4 + 1);
    raw[offset] = 0;
    pixels.copy(raw, offset + 1, y * W * 4, (y + 1) * W * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(W, 0); header.writeUInt32BE(H, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

async function sendCard(sock, jid, player, m) {
  const image = makeCard(player);
  await sock.sendMessage(jid, {
    image,
    mimetype: 'image/png',
    caption: `🐉 *PERFIL SAIYAJIN*\n👤 ${player.name}\n⭐ Nivel: ${player.level}\n🏅 Rango: ${rankFor(player.level).name}\n⚡ Poder: ${powerFor(player).toLocaleString('es-PE')}\n🔥 Transformación: ${transformFor(player.level).name}\n💰 Zenis: ${player.coins}`
  }, { quoted: m });
}

module.exports = async function (sock, m, jid, cmd, text, prefix) {
  const allowed = new Set(['perfil','nivel','entrenar','transformar','duelo','ranking','misiones','reclamar','tienda','comprar','inventario','shenlong']);
  if (!allowed.has(cmd)) return false;

  const sender = (m.key.participant || m.key.remoteJid || '').split('@')[0].split(':')[0];
  const senderId = m.key.participant || m.key.remoteJid;
  const displayName = m.pushName || sender;
  const player = getPlayer(senderId, displayName);
  const reply = value => sock.sendMessage(jid, { text: value }, { quoted: m });

  if (cmd === 'perfil') {
    await saveDB();
    await sendCard(sock, jid, player, m);
    return true;
  }

  if (cmd === 'nivel') {
    await reply(`🐉 *PROGRESO SAIYAJIN*\n⭐ Nivel: ${player.level}/${MAX_LEVEL}\n✨ XP: ${player.xp}/${xpNeeded(player.level)}\n⚡ Poder: ${powerFor(player).toLocaleString('es-PE')}\n🏅 Rango: ${rankFor(player.level).name}\n🔥 Siguiente transformación: ${TRANSFORMS.find(t => t.level > player.level)?.name || 'Nivel máximo'}`);
    return true;
  }

  if (cmd === 'entrenar') {
    const left = cooldownLeft(player, 'train', TRAIN_COOLDOWN);
    if (left) { await reply(`⏳ Descansa ${fmtTime(left)} antes de volver a entrenar.`); return true; }
    player.cooldowns.train = Date.now();
    const bonus = player.inventory.gravity ? 25 : 0;
    const xp = 35 + Math.floor(Math.random() * 26) + bonus;
    const coins = 15 + Math.floor(Math.random() * 16);
    const levels = applyXP(player, xp);
    player.coins += coins;
    player.training++;
    progressMission(player, 'train');
    progressMission(player, 'social');
    if (Math.random() < 0.22 && player.balls.length < 7) {
      const ball = Math.floor(Math.random() * 7) + 1;
      if (!player.balls.includes(ball)) player.balls.push(ball);
    }
    await saveDB();
    await reply(`🥋 *¡ENTRENAMIENTO COMPLETADO!*\n✨ +${xp} XP\n💰 +${coins} Zenis${bonus ? '\n🧪 Bonus de cámara de gravedad: +25 XP' : ''}${levels ? `\n🎉 ¡SUBISTE ${levels} NIVEL(ES)! Ahora eres nivel ${player.level}.` : ''}\n⚡ Poder actual: ${powerFor(player).toLocaleString('es-PE')}\n🐉 Esferas: ${player.balls.length}/7`);
    return true;
  }

  if (cmd === 'transformar') {
    const unlocked = TRANSFORMS.filter(t => player.level >= t.level);
    const current = transformFor(player.level);
    await reply(`🔥 *TRANSFORMACIONES DESBLOQUEADAS*\n\n${unlocked.map(t => `${t.name === current.name ? '▶️' : '✅'} ${t.name} — nivel ${t.level} — x${t.multiplier}`).join('\n')}\n\n🔒 Siguiente: ${TRANSFORMS.find(t => t.level > player.level)?.name || 'Todas desbloqueadas'}`);
    return true;
  }

  if (cmd === 'duelo') {
    const targetId = mentionedJid(m);
    if (!targetId) { await reply(`Menciona a un rival. Ejemplo: ${prefix}duelo @usuario`); return true; }
    if (targetId === senderId) { await reply('No puedes luchar contra ti mismo.'); return true; }
    const left = cooldownLeft(player, 'duel', DUEL_COOLDOWN);
    if (left) { await reply(`⏳ Espera ${fmtTime(left)} para iniciar otro duelo.`); return true; }
    const target = getPlayer(targetId, targetId.split('@')[0]);
    const targetLeft = cooldownLeft(target, 'duel', DUEL_COOLDOWN);
    if (targetLeft) { await reply('Ese guerrero todavía está recuperándose de otro duelo.'); return true; }
    player.cooldowns.duel = Date.now();
    target.cooldowns.duel = Date.now();
    const a = powerFor(player) * (0.9 + Math.random() * 0.2) * (player.inventory.armor ? 1.1 : 1);
    const b = powerFor(target) * (0.9 + Math.random() * 0.2) * (target.inventory.armor ? 1.1 : 1);
    const winner = a >= b ? player : target;
    const loser = winner === player ? target : player;
    winner.wins++; loser.losses++;
    winner.coins += 80;
    const levels = applyXP(winner, 45);
    progressMission(player, 'duel');
    progressMission(target, 'duel');
    progressMission(player, 'social');
    progressMission(target, 'social');
    await saveDB();
    await sock.sendMessage(jid, {
      text: `⚔️ *DUELO SAIYAJIN*\n\n🥊 ${player.name}: ${Math.floor(a).toLocaleString('es-PE')} poder\n🥊 ${target.name}: ${Math.floor(b).toLocaleString('es-PE')} poder\n\n🏆 ¡Ganador: @${winner.id.split('@')[0]}!\n💰 +80 Zenis y +45 XP\n${levels ? '⭐ ¡Subió de nivel!' : ''}`,
      mentions: [player.id, target.id]
    }, { quoted: m });
    return true;
  }

  if (cmd === 'ranking') {
    const top = Object.values(db.players).sort((a, b) => powerFor(b) - powerFor(a)).slice(0, 10);
    if (!top.length) { await reply('Todavía no hay guerreros registrados. Usa .entrenar para comenzar.'); return true; }
    const lines = top.map((p, i) => `${i + 1}. ${p.name} — Nv.${p.level} — ${powerFor(p).toLocaleString('es-PE')} poder`);
    await reply(`🏆 *TOP 10 GUERREROS Z*\n\n${lines.join('\n')}\n\n🥋 Entrena para subir en el ranking.`);
    return true;
  }

  if (cmd === 'misiones') {
    const today = new Date().toISOString().slice(0, 10);
    if (player.missionDate !== today) { player.missionDate = today; player.missionProgress = {}; player.claimedMissions = []; }
    const lines = MISSIONS.map(mission => {
      const count = Math.min(mission.goal, player.missionProgress[mission.id] || 0);
      return `${count >= mission.goal ? '✅' : '▫️'} ${mission.name}: ${count}/${mission.goal} — ${mission.description} — recompensa ${mission.reward} Zenis`;
    });
    await saveDB();
    await reply(`📜 *MISIONES DIARIAS*\n\n${lines.join('\n\n')}\n\nLas recompensas se acreditan al reclamar con ${prefix}reclamar.`);
    return true;
  }

  if (cmd === 'reclamar') {
    const today = new Date().toISOString().slice(0, 10);
    if (player.missionDate !== today) { player.missionDate = today; player.missionProgress = {}; player.claimedMissions = []; }
    player.claimedMissions ||= [];
    const completed = MISSIONS.filter(mission => (player.missionProgress[mission.id] || 0) >= mission.goal && !player.claimedMissions.includes(mission.id));
    if (!completed.length) { await reply(`No tienes recompensas nuevas. Completa misiones con ${prefix}misiones y vuelve a intentarlo.`); return true; }
    const reward = completed.reduce((sum, mission) => sum + mission.reward, 0);
    player.coins += reward;
    player.claimedMissions.push(...completed.map(mission => mission.id));
    await saveDB();
    await reply(`🎉 *RECOMPENSAS RECLAMADAS*\n\n${completed.map(mission => '✅ ' + mission.name).join('\n')}\n\n💰 +${reward} Zenis\n💳 Saldo: ${player.coins}`);
    return true;
  }

  if (cmd === 'tienda') {
    await reply(`🛒 *TIENDA CAPSULE CORP.*\n\n${SHOP.map(item => `• *${item.name}* — ${item.price} Zenis\n  ID: ${item.id} | ${item.description}`).join('\n\n')}\n\nCompra con ${prefix}comprar <id>\n💰 Tu saldo: ${player.coins} Zenis`);
    return true;
  }

  if (cmd === 'comprar') {
    const item = SHOP.find(entry => entry.id === text.trim().toLowerCase());
    if (!item) { await reply(`ID no válido. Usa ${prefix}tienda para ver los artículos.`); return true; }
    if (player.inventory[item.id]) { await reply('Ya tienes este artículo.'); return true; }
    if (player.coins < item.price) { await reply(`Te faltan ${item.price - player.coins} Zenis.`); return true; }
    player.coins -= item.price;
    player.inventory[item.id] = 1;
    await saveDB();
    await reply(`✅ Compraste *${item.name}*.\n💰 Saldo restante: ${player.coins} Zenis.`);
    return true;
  }

  if (cmd === 'inventario') {
    const items = SHOP.filter(item => player.inventory[item.id]).map(item => `• ${item.name} x${player.inventory[item.id]}`);
    await reply(`🎒 *INVENTARIO DE ${player.name}*\n\n${items.length ? items.join('\n') : 'Todavía no tienes objetos.'}\n\n🐉 Esferas del dragón: ${player.balls.length}/7`);
    return true;
  }

  if (cmd === 'shenlong') {
    if (player.balls.length < 7) {
      await reply(`🐉 *SHENLONG*\n\nTe faltan ${7 - player.balls.length} esfera(s) del dragón.\nTienes ${player.balls.length}/7.\n\nEntrena para tener una probabilidad de encontrar una esfera.`);
      return true;
    }
    player.balls = [];
    player.coins += 1000;
    const levels = applyXP(player, 250);
    await saveDB();
    await reply(`🐉✨ *¡SHENLONG HA CONCEDIDO TU DESEO!*\n\n💰 +1000 Zenis\n✨ +250 XP${levels ? `\n⭐ ¡Subiste ${levels} nivel(es)!` : ''}\n\nLas siete esferas se han dispersado por el mundo.`);
    return true;
  }

  return false;
};

module.exports.makeCard = makeCard;
