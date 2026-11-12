const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../goku/data');
const DATA_FILE = path.join(DATA_DIR, 'characters.json');
const COST = 250;
const MAX_LEVEL = 5;

const CHARACTERS = [
  { id: 'goku', name: 'Goku', rarity: 'Común', stars: '⭐', power: 100, fragments: 5, weight: 30 },
  { id: 'vegeta', name: 'Vegeta', rarity: 'Común', stars: '⭐', power: 105, fragments: 5, weight: 25 },
  { id: 'piccolo', name: 'Piccolo', rarity: 'Raro', stars: '⭐⭐', power: 145, fragments: 10, weight: 18 },
  { id: 'trunks', name: 'Trunks', rarity: 'Raro', stars: '⭐⭐', power: 155, fragments: 10, weight: 12 },
  { id: 'gohan', name: 'Gohan', rarity: 'Épico', stars: '⭐⭐⭐', power: 220, fragments: 20, weight: 8 },
  { id: 'freezer', name: 'Freezer', rarity: 'Épico', stars: '⭐⭐⭐', power: 235, fragments: 20, weight: 4 },
  { id: 'cell', name: 'Cell perfecto', rarity: 'Legendario', stars: '⭐⭐⭐⭐', power: 340, fragments: 35, weight: 2 },
  { id: 'broly', name: 'Broly', rarity: 'Legendario', stars: '⭐⭐⭐⭐', power: 380, fragments: 35, weight: 1 }
];

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { users: {} };
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data && data.users ? data : { users: {} };
  } catch (error) {
    console.error('[PERSONAJES] Error leyendo colección:', error.message);
    return { users: {} };
  }
}

let db = loadDB();
let saveQueue = Promise.resolve();

function saveDB() {
  saveQueue = saveQueue.then(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temp = DATA_FILE + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(db, null, 2));
    fs.renameSync(temp, DATA_FILE);
  }).catch(error => console.error('[PERSONAJES] Error guardando colección:', error.message));
  return saveQueue;
}

function getUser(id) {
  db.users[id] ||= { characters: {}, fragments: 0, summons: 0 };
  const user = db.users[id];
  user.characters ||= {};
  user.fragments = Number.isFinite(user.fragments) ? user.fragments : 0;
  user.summons = Number.isFinite(user.summons) ? user.summons : 0;
  return user;
}

function chooseCharacter() {
  const total = CHARACTERS.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const character of CHARACTERS) {
    roll -= character.weight;
    if (roll < 0) return character;
  }
  return CHARACTERS[0];
}

function buttonMessage(text, buttons, footer) {
  return {
    text,
    footer,
    buttons: buttons.map(item => ({
      buttonId: item.id,
      buttonText: { displayText: item.label },
      type: 1
    })),
    headerType: 1
  };
}

async function send(sock, jid, payload, m) {
  try {
    await sock.sendMessage(jid, payload, { quoted: m });
  } catch {
    await sock.sendMessage(jid, { text: payload.text || 'Sistema de personajes' }, { quoted: m });
  }
}

module.exports = async function charactersCommand(sock, m, jid, cmd, text, prefix) {
  const commands = new Set(['personajes', 'coleccion', 'colección', 'invocar', 'misguerreros', 'mejorar']);
  if (!commands.has(cmd)) return false;

  const senderId = m.key.participant || m.key.remoteJid;
  const user = getUser(senderId);
  const owned = Object.entries(user.characters);
  const totalPower = owned.reduce((sum, entry) => {
    const character = CHARACTERS.find(item => item.id === entry[0]);
    return sum + (character ? character.power * (Number(entry[1]) || 1) : 0);
  }, 0);

  if (cmd === 'personajes' || cmd === 'coleccion' || cmd === 'colección') {
    const lines = CHARACTERS.map(item => item.stars + ' *' + item.name + '* — ' + item.rarity + ' — ' + item.power + ' poder').join('\n');
    const message = '🐉 *COLECCIÓN DE GUERREROS*\n\n' + lines + '\n\n🎴 Invocación: ' + COST + ' Zenis\n🧩 Tus fragmentos: ' + user.fragments + '\n👥 Coleccionados: ' + owned.length + '/' + CHARACTERS.length;
    await send(sock, jid, buttonMessage(message, [
      { id: prefix + 'invocar', label: '🎴 Invocar guerrero' },
      { id: prefix + 'misguerreros', label: '👥 Mi colección' }
    ], 'GOKUBOT-MD • PERSONAJES'), m);
    return true;
  }

  if (cmd === 'invocar') {
    const rpg = require('../../goku/rpg');
    const player = rpg.getPlayer(senderId, m.pushName || senderId.split('@')[0]);
    if ((Number(player.coins) || 0) < COST) {
      await send(sock, jid, { text: 'Necesitas ' + COST + ' Zenis para invocar. Tu saldo: ' + (player.coins || 0) + '. Entrena con ' + prefix + 'entrenar.' }, m);
      return true;
    }

    const character = chooseCharacter();
    const currentLevel = Number(user.characters[character.id]) || 0;
    player.coins -= COST;
    user.summons++;

    let result;
    if (currentLevel) {
      user.fragments += character.fragments;
      result = '♻️ *¡DUPLICADO CONVERTIDO!*\n\n' + character.stars + ' ' + character.name + '\n🧩 +' + character.fragments + ' fragmentos\n🧩 Total: ' + user.fragments;
    } else {
      user.characters[character.id] = 1;
      result = '✨ *¡NUEVO GUERRERO OBTENIDO!*\n\n' + character.stars + ' *' + character.name + '*\n🏷️ Rareza: ' + character.rarity + '\n⚡ Poder: ' + character.power;
    }

    await rpg.saveDB();

    const response = '🎴 *INVOCACIÓN SAIYAJIN*\n\n' + result + '\n\n💰 Coste: ' + COST + ' Zenis\n💳 Saldo: ' + player.coins;
    await send(sock, jid, buttonMessage(response, [
      { id: prefix + 'invocar', label: '🔁 Invocar otra vez' },
      { id: prefix + 'misguerreros', label: '👥 Ver colección' }
    ], 'GOKUBOT-MD • SUMMON'), m);
    return true;
  }

  if (cmd === 'misguerreros') {
    const lines = owned.length ? owned.map(entry => {
      const item = CHARACTERS.find(character => character.id === entry[0]);
      return item ? item.stars + ' *' + item.name + '* — Nv.' + entry[1] + '/' + MAX_LEVEL + ' — ' + item.power * entry[1] + ' poder' : null;
    }).filter(Boolean) : ['Todavía no tienes guerreros. Usa el botón de invocación para conseguir el primero.'];
    const message = '👥 *TUS GUERREROS*\n\n' + lines.join('\n') + '\n\n🧩 Fragmentos: ' + user.fragments + '\n⚡ Poder de colección: ' + totalPower + '\n🎴 Invocaciones: ' + user.summons;
    await send(sock, jid, buttonMessage(message, [
      { id: prefix + 'invocar', label: '🎴 Invocar' },
      { id: prefix + 'personajes', label: '📖 Ver personajes' }
    ], 'GOKUBOT-MD • COLECCIÓN'), m);
    return true;
  }

  if (cmd === 'mejorar') {
    const id = String(text || '').trim().toLowerCase();
    const character = CHARACTERS.find(item => item.id === id);
    if (!character) {
      await send(sock, jid, { text: 'Indica el ID del personaje. IDs: ' + CHARACTERS.map(item => item.id).join(', ') + '\nEjemplo: ' + prefix + 'mejorar goku' }, m);
      return true;
    }
    const level = Number(user.characters[id]) || 0;
    if (!level) {
      await send(sock, jid, { text: 'No tienes a ' + character.name + '. Consíguelo con ' + prefix + 'invocar.' }, m);
      return true;
    }
    if (level >= MAX_LEVEL) {
      await send(sock, jid, { text: character.name + ' ya alcanzó el nivel máximo.' }, m);
      return true;
    }
    const cost = character.fragments * level;
    if (user.fragments < cost) {
      await send(sock, jid, { text: 'Necesitas ' + cost + ' fragmentos para mejorar a ' + character.name + '. Tienes ' + user.fragments + '.' }, m);
      return true;
    }
    user.fragments -= cost;
    user.characters[id] = level + 1;
    await saveDB();
    const message = '⬆️ *PERSONAJE MEJORADO*\n\n' + character.stars + ' ' + character.name + '\n⭐ Nivel: ' + level + ' → ' + (level + 1) + '\n⚡ Poder: ' + character.power * level + ' → ' + character.power * (level + 1) + '\n🧩 Fragmentos restantes: ' + user.fragments;
    await send(sock, jid, buttonMessage(message, [
      { id: prefix + 'misguerreros', label: '👥 Mi colección' },
      { id: prefix + 'personajes', label: '📖 Personajes' }
    ], 'GOKUBOT-MD • MEJORAS'), m);
    return true;
  }

  return false;
};

module.exports.CHARACTERS = CHARACTERS;
