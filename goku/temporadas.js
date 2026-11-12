// PERSONALIZA AQUÍ LOS EVENTOS Y TEMPORADAS DE GOKUBOT-MD.
// Cambia ACTIVE_SEASON por: 'navidad', 'anio-nuevo', 'san-valentin', 'halloween' o 'pascua'.
// También puedes usar 'ninguna' para desactivar los comandos festivos.

module.exports = {
  ACTIVE_SEASON: 'navidad',

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
