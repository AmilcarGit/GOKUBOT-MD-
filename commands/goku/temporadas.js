const cfg = require('../../config');

function dateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: cfg.seasons.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return { month, day: (h + l - 7 * m + 114) % 31 + 1 };
}

function autoSeason() {
  const { year, month, day } = dateParts();
  if (month === 12 && day <= 25) return 'navidad';
  if ((month === 12 && day >= 26) || (month === 1 && day <= 5)) return 'anio-nuevo';
  if (month === 2 && day <= 14) return 'san-valentin';
  if (month === 10) return 'halloween';
  const easter = easterDate(year);
  const current = new Date(year, month - 1, day);
  const start = new Date(year, easter.month - 1, easter.day - 3);
  const end = new Date(year, easter.month - 1, easter.day + 1);
  if (current >= start && current <= end) return 'pascua';
  return 'ninguna';
}

const definitions = {
  seasons: {
    navidad: {
      name: 'Navidad',
      emoji: '🎄',
      greeting: '¡Felices fiestas, Guerrero Z!',
      countdown: { month: 11, day: 25 },
      phrases: [
        'La Navidad no es un día, es un estado del corazón. ❤️',
        'Que la magia de la Navidad llene tu hogar de paz y alegría. ✨',
        'El mejor regalo es compartir con quienes amas. 🎁',
        'Que tu Navidad brille más que todas las luces del árbol. 🎄',
        'Un abrazo sincero vale más que cualquier regalo. 🤗'
      ],
      gifts: ['🎧 Unos audífonos', '📱 Un celular nuevo', '🎮 Una consola', '🍫 Una caja de chocolates', '🎁 ¡Una caja misteriosa!']
    },

    'anio-nuevo': {
      name: 'Año Nuevo',
      emoji: '🎆',
      greeting: '¡Feliz Año Nuevo, Guerrero Z!',
      countdown: { month: 0, day: 1 },
      phrases: [
        'Un nuevo año, nuevas metas y más poder para superarte. ⚡',
        'Que este año esté lleno de salud, logros y buenos momentos. 🌟',
        'Cada día es una nueva oportunidad para mejorar. 🥋'
      ],
      gifts: ['🍀 Un año de buena suerte', '🚀 Nuevas oportunidades', '💎 Éxitos y prosperidad', '🎁 Una sorpresa para empezar el año']
    },

    'san-valentin': {
      name: 'San Valentín',
      emoji: '💘',
      greeting: '¡Feliz San Valentín!',
      countdown: { month: 1, day: 14 },
      phrases: [
        'El cariño verdadero se demuestra con pequeños detalles. ❤️',
        'Que nunca falten motivos para compartir y sonreír. 🌹',
        'El mejor poder es cuidar a las personas que quieres. 💞'
      ],
      gifts: ['🌹 Un ramo de rosas', '🍫 Una caja de chocolates', '💌 Una carta especial', '🧸 Un peluche']
    },

    halloween: {
      name: 'Halloween',
      emoji: '🎃',
      greeting: '¡Feliz Halloween, Guerrero Z!',
      countdown: { month: 9, day: 31 },
      phrases: [
        'Esta noche hasta los Saiyajin sienten escalofríos. 👻',
        'Que tengas una noche llena de sustos y diversión. 🎃',
        'No temas a los monstruos: entrena para superarlos. 💀'
      ],
      gifts: ['🍬 Una bolsa de dulces', '🎃 Una calabaza misteriosa', '👻 Un susto sorpresa', '🦇 Un amuleto oscuro']
    },

    pascua: {
      name: 'Pascua',
      emoji: '🐰',
      greeting: '¡Feliz Pascua!',
      countdown: null,
      phrases: [
        'Que esta fecha traiga esperanza y buenos momentos. 🌷',
        'Un día para compartir, agradecer y renovar energías. 🐣',
        'La mejor recompensa es compartir con quienes aprecias. 💛'
      ],
      gifts: ['🍫 Un huevo de chocolate', '🐰 Un conejo de peluche', '🌷 Un ramo de flores', '🎁 Una sorpresa de Pascua']
    }
  },

  goku: {
    greetings: [
      '🐉 ¡Hola! Soy Goku. ¿Listo para entrenar y superar tus límites?',
      '🥋 Siempre hay un nuevo nivel por alcanzar.',
      '🔥 ¡El espíritu Saiyajin nunca se rinde!',
      '⭐ ¡Un guerrero también sabe compartir!'
    ],
    ki: [
      '🔥 Tu ki está aumentando...',
      '⚡ ¡Poder de combate en ascenso!',
      '💥 ¡Has liberado todo tu ki! ¡KAMEHAMEHA!',
      '🌟 Tu energía está brillando.'
    ],
    transformations: [
      '🟡 *SUPER SAIYAJIN* — El primer despertar.',
      '🔴 *SUPER SAIYAJIN GOD* — El poder divino.',
      '🔵 *SUPER SAIYAJIN BLUE* — Poder y control.',
      '⚪ *ULTRA INSTINTO* — Movimiento sin pensar.',
      '🐉 *MODO GUERRERO Z* — Poder, amistad y espíritu de lucha.'
    ]
  }
};

function getActiveSeason() {
  if (!cfg.seasons.enabled || cfg.navidad === false) return 'ninguna';
  if (cfg.seasons.mode === 'manual') {
    return Object.prototype.hasOwnProperty.call(definitions.seasons, cfg.seasons.manual)
      ? cfg.seasons.manual
      : 'ninguna';
  }
  return autoSeason();
}

function getEvent() {
  const key = getActiveSeason();
  return key === 'ninguna' ? null : definitions.seasons[key];
}

function decorate(message) {
  const event = getEvent();
  if (!event) return message;
  return `${event.emoji} ${message}\n\n_${event.greeting}_`;
}

module.exports = { ...definitions, getActiveSeason, getEvent, decorate };
