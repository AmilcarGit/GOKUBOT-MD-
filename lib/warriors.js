'use strict'
// Guerreros ORIGINALES del bot: plantel, retratos dibujados en código y cartas.
const { Canvas, mix, hsl, rng, clamp } = require('./canvas')

const TAU = Math.PI * 2
const RARITY = {
  comun:      { label: 'COMUN',      stars: 1, weight: 55, color: [150, 160, 175], bg: [[40, 46, 66], [70, 80, 100]] },
  raro:       { label: 'RARO',       stars: 2, weight: 28, color: [70, 150, 255],  bg: [[20, 40, 100], [40, 90, 170]] },
  epico:      { label: 'EPICO',      stars: 3, weight: 13, color: [190, 90, 255],  bg: [[50, 20, 100], [110, 50, 170]] },
  legendario: { label: 'LEGENDARIO', stars: 4, weight: 4,  color: [255, 200, 60],  bg: [[110, 50, 10], [200, 120, 30]] }
}

// Todos los nombres, razas y diseños son invención propia.
const ROSTER = [
  { id: 'taro',    name: 'Taro',     title: 'El Aprendiz',          race: 'Terrano',   rarity: 'comun', power: 120, skin: [240, 200, 160], hair: [90, 60, 40],    style: 'spikes',   outfit: [60, 150, 90],   trim: [230, 230, 120], aura: [120, 230, 140], feature: 'headband', accent: [220, 60, 60] },
  { id: 'kyla',    name: 'Kyla',     title: 'Corredora del Alba',   race: 'Terrana',   rarity: 'comun', power: 130, skin: [235, 190, 150], hair: [255, 120, 170], style: 'ponytail', outfit: [40, 160, 170],  trim: [255, 255, 255], aura: [255, 160, 200], feature: 'none' },
  { id: 'bruk',    name: 'Bruk',     title: 'Muro de Piedra',       race: 'Korvan',    rarity: 'comun', power: 140, skin: [170, 150, 130], hair: [0, 0, 0],       style: 'bald',     outfit: [110, 110, 125], trim: [200, 200, 210], aura: [200, 200, 220], feature: 'none' },
  { id: 'zeph',    name: 'Zeph',     title: 'Mensajero del Viento', race: 'Aerin',     rarity: 'comun', power: 135, skin: [225, 235, 245], hair: [245, 245, 255], style: 'flow',     outfit: [110, 180, 235], trim: [255, 255, 255], aura: [170, 230, 255], feature: 'none' },
  { id: 'sorin',   name: 'Sorin',    title: 'Cazador Lunar',        race: 'Lunari',    rarity: 'raro',  power: 210, skin: [190, 210, 240], hair: [215, 220, 235], style: 'long',     outfit: [50, 60, 120],   trim: [170, 200, 255], aura: [150, 180, 255], feature: 'crest',    accent: [255, 220, 120] },
  { id: 'mira',    name: 'Mira',     title: 'Hechicera Carmesi',    race: 'Infernal',  rarity: 'raro',  power: 225, skin: [245, 205, 190], hair: [190, 30, 60],   style: 'flow',     outfit: [110, 20, 40],   trim: [255, 140, 100], aura: [255, 80, 90],   feature: 'horns' },
  { id: 'dhax',    name: 'Dhax',     title: 'Lanza de Fuego',       race: 'Korvan',    rarity: 'raro',  power: 230, skin: [200, 120, 100], hair: [230, 50, 160],  style: 'mohawk',   outfit: [40, 40, 50],    trim: [255, 120, 40],  aura: [255, 110, 60],  feature: 'none' },
  { id: 'oru',     name: 'Oru',      title: 'Monje del Vacio',      race: 'Etereo',    rarity: 'raro',  power: 215, skin: [210, 190, 230], hair: [0, 0, 0],       style: 'bald',     outfit: [100, 60, 150],  trim: [230, 200, 255], aura: [200, 150, 255], feature: 'eye' },
  { id: 'valkor',  name: 'Valkor',   title: 'Rey de la Tormenta',   race: 'Tempestad', rarity: 'epico', power: 340, skin: [225, 205, 210], hair: [150, 90, 255],  style: 'spikes',   outfit: [30, 30, 80],    trim: [120, 220, 255], aura: [140, 120, 255], feature: 'none' },
  { id: 'serafina', name: 'Serafina', title: 'Guardiana Astral',    race: 'Astral',    rarity: 'epico', power: 350, skin: [245, 220, 200], hair: [80, 220, 235],  style: 'long',     outfit: [240, 240, 255], trim: [255, 220, 120], aura: [140, 240, 255], feature: 'halo' },
  { id: 'gorath',  name: 'Gorath',   title: 'Titan de Magma',       race: 'Pirian',    rarity: 'epico', power: 360, skin: [150, 50, 40],   hair: [30, 20, 20],    style: 'bald',     outfit: [60, 30, 30],    trim: [255, 140, 30],  aura: [255, 90, 30],   feature: 'horns' },
  { id: 'nyx',     name: 'Nyx Omega', title: 'Devoradora de Estrellas', race: 'Cosmica', rarity: 'legendario', power: 520, skin: [210, 190, 230], hair: [20, 14, 40], style: 'flow', outfit: [25, 20, 55], trim: [200, 120, 255], aura: [170, 90, 255], feature: 'crown', accent: [255, 220, 120] },
  { id: 'aurelio', name: 'Aurelio',  title: 'El Ascendido',         race: 'Celeste',   rarity: 'legendario', power: 540, skin: [250, 225, 195], hair: [255, 215, 110], style: 'long', outfit: [250, 248, 240], trim: [255, 205, 90], aura: [255, 220, 120], feature: 'halo' }
]

const byId = id => ROSTER.find(w => w.id === id)
function find(query) {
  const q = String(query || '').trim().toLowerCase()
  if (/^\d+$/.test(q)) return ROSTER[Number(q) - 1]
  return ROSTER.find(w => w.id === q || w.name.toLowerCase() === q || w.name.toLowerCase().startsWith(q))
}
function roll() {
  let r = Math.random() * Object.values(RARITY).reduce((a, x) => a + x.weight, 0), pick = 'comun'
  for (const [key, x] of Object.entries(RARITY)) { r -= x.weight; if (r <= 0) { pick = key; break } }
  const pool = ROSTER.filter(w => w.rarity === pick)
  return pool[Math.floor(Math.random() * pool.length)]
}

// Bonus de equipo: 20% del poder de tus 3 mejores guerreros (las repeticiones suman +10% cada una).
function teamBonus(owned) {
  const powers = ROSTER.filter(w => owned && owned[w.id]).map(w => w.power * (1 + 0.1 * (owned[w.id] - 1))).sort((a, b) => b - a)
  return Math.floor(powers.slice(0, 3).reduce((a, b) => a + b, 0) * 0.2)
}

// Retrato de busto: cabeza y hombros. silhouette = true lo dibuja como sombra.
function drawWarrior(c, cx, baseY, s, w, silhouette = false) {
  const K = col => (silhouette ? [44, 44, 84] : col)
  const headY = baseY - 108 * s, r = 27 * s
  if (!silhouette) c.glow(cx, headY + 20 * s, 120 * s, w.aura, 0.5)
  const hair = K(w.hair)
  // pelo trasero
  if (w.style === 'flow') c.ellipse(cx, headY + 14 * s, r * 1.35, r * 1.9, hair)
  if (w.style === 'long') c.polygon([[cx - r * 1.3, headY], [cx + r * 1.3, headY], [cx + r * 1.55, baseY - 8 * s], [cx - r * 1.55, baseY - 8 * s]], hair)
  if (w.style === 'ponytail') {
    c.line(cx + r * 0.5, headY - r * 0.6, cx + r * 1.5, headY + r * 0.3, hair, r * 0.55)
    c.circle(cx + r * 1.55, headY + r * 0.45, r * 0.5, hair)
  }
  // cuello y torso
  c.rect(cx - 9 * s, headY + r * 0.8, 18 * s, 30 * s, K(w.skin))
  c.polygon([[cx - 50 * s, baseY], [cx - 40 * s, baseY - 50 * s], [cx - 14 * s, baseY - 66 * s], [cx + 14 * s, baseY - 66 * s], [cx + 40 * s, baseY - 50 * s], [cx + 50 * s, baseY]], K(w.outfit))
  if (!silhouette) {
    c.line(cx, baseY - 66 * s, cx, baseY, w.trim, Math.max(1, 3 * s))
    c.line(cx - 14 * s, baseY - 66 * s, cx - 40 * s, baseY - 50 * s, w.trim, Math.max(1, 2.4 * s))
    c.line(cx + 14 * s, baseY - 66 * s, cx + 40 * s, baseY - 50 * s, w.trim, Math.max(1, 2.4 * s))
  }
  // cabeza
  c.circle(cx - r * 0.98, headY + r * 0.1, r * 0.2, K(w.skin)); c.circle(cx + r * 0.98, headY + r * 0.1, r * 0.2, K(w.skin))
  c.circle(cx, headY, r, K(w.skin))
  // pelo frontal
  if (w.style !== 'bald') {
    c.ellipse(cx, headY - r * 0.8, r * 1.05, r * 0.6, hair)
    if (w.style === 'spikes') {
      const pts = [[cx - r * 1.05, headY - r * 0.4]]
      for (let i = 0; i < 5; i++) {
        const bx = cx - r + (i + 0.5) * (2 * r / 5)
        pts.push([bx + (i - 2) * r * 0.18, headY - r * (i % 2 ? 1.5 : 1.95)], [bx + r / 5, headY - r * 0.8])
      }
      pts.push([cx + r * 1.05, headY - r * 0.4])
      c.polygon(pts, hair)
    } else if (w.style === 'mohawk') {
      c.polygon([[cx - r * 0.4, headY - r * 0.7], [cx - r * 0.25, headY - r * 1.9], [cx - r * 0.02, headY - r * 1.25], [cx + r * 0.2, headY - r * 2.1], [cx + r * 0.42, headY - r * 0.7]], hair)
    } else {
      c.polygon([[cx - r, headY - r * 0.6], [cx + r, headY - r * 0.6], [cx + r * 0.92, headY - r * 0.12], [cx + r * 0.22, headY - r * 0.5], [cx - r * 0.3, headY - r * 0.04], [cx - r * 0.92, headY - r * 0.3]], hair)
    }
  }
  // rostro
  if (!silhouette) {
    for (const sx of [-1, 1]) {
      const ex = cx + sx * r * 0.42, ey = headY + r * 0.08
      c.ellipse(ex, ey, r * 0.22, r * 0.15, [255, 255, 255])
      c.circle(ex, ey, r * 0.1, w.id === 'nyx' ? [200, 90, 255] : [40, 40, 70])
      c.line(ex - sx * r * 0.26, ey - r * 0.2, ex + sx * r * 0.3, ey - r * 0.38, hair[0] + hair[1] + hair[2] < 60 ? [70, 60, 80] : hair, Math.max(1, r * 0.11))
    }
    c.line(cx - r * 0.18, headY + r * 0.56, cx + r * 0.18, headY + r * 0.56, [130, 60, 60], Math.max(1, r * 0.08))
  }
  // detalles
  const gold = K([255, 205, 70]), acc = K(w.accent || gold)
  if (w.feature === 'horns') for (const sx of [-1, 1]) c.polygon([[cx + sx * r * 0.45, headY - r * 0.9], [cx + sx * r * 0.95, headY - r * 0.7], [cx + sx * r * 0.85, headY - r * 1.75]], K([235, 225, 200]))
  if (w.feature === 'crest') c.polygon([[cx - r * 0.2, headY - r * 0.9], [cx + r * 0.2, headY - r * 0.9], [cx, headY - r * 1.75]], acc)
  if (w.feature === 'eye') c.circle(cx, headY - r * 0.32, r * 0.1, K([255, 60, 60]))
  if (w.feature === 'headband') c.rect(cx - r * 1.0, headY - r * 0.55, r * 2, r * 0.22, acc)
  if (w.feature === 'crown') c.polygon([[cx - r * 0.7, headY - r * 0.75], [cx - r * 0.7, headY - r * 1.45], [cx - r * 0.35, headY - r * 1.05], [cx, headY - r * 1.6], [cx + r * 0.35, headY - r * 1.05], [cx + r * 0.7, headY - r * 1.45], [cx + r * 0.7, headY - r * 0.75]], gold)
  if (w.feature === 'halo') for (let a = 0; a < 48; a++) c.circle(cx + Math.cos((a / 48) * TAU) * r * 0.95, headY - r * 1.75 + Math.sin((a / 48) * TAU) * r * 0.26, Math.max(1, s * 1.5), gold)
}

// Carta completa. Tamaño base 240x340 multiplicado por s.
function drawCard(w, s = 1, count = 1) {
  const W = Math.round(240 * s), H = Math.round(340 * s), R = RARITY[w.rarity]
  const c = new Canvas(W, H)
  c.gradient(R.bg[0], R.bg[1])
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU
    c.polygon([[W / 2, 120 * s], [W / 2 + Math.cos(a) * W, 120 * s + Math.sin(a) * W], [W / 2 + Math.cos(a + 0.11) * W, 120 * s + Math.sin(a + 0.11) * W]], [255, 255, 255], 0.06)
  }
  drawWarrior(c, W / 2, 215 * s, s, w)
  c.rect(8 * s, 222 * s, W - 16 * s, 110 * s, [8, 8, 24], 0.62)
  const t = n => Math.max(1, Math.round(n * s))
  c.text(w.name, W / 2, 228 * s, { scale: t(2.4), align: 'center', color: [255, 255, 255], shadow: [0, 0, 0], maxChars: 12 })
  c.text(w.title, W / 2, 254 * s, { scale: t(1.2), align: 'center', color: R.color, maxChars: 24 })
  c.text('RAZA ' + w.race, W / 2, 270 * s, { scale: t(1.2), align: 'center', color: [190, 200, 230] })
  const power = Math.floor(w.power * (1 + 0.1 * (count - 1)))
  c.text('PODER ' + power, W / 2, 286 * s, { scale: t(1.6), align: 'center', color: [255, 215, 90], shadow: [60, 30, 0] })
  for (let i = 0; i < R.stars; i++) c.star(W / 2 + (i - (R.stars - 1) / 2) * 20 * s, 316 * s, 7 * s, [255, 215, 90])
  c.text(R.label, 12 * s, 10 * s, { scale: t(1.2), color: R.color, shadow: [0, 0, 0] })
  if (count > 1) c.text('X' + count, W - 12 * s, 10 * s, { scale: t(1.6), align: 'right', color: [255, 255, 255], shadow: [0, 0, 0] })
  const b = Math.max(2, Math.round(5 * s))
  for (const [x, y, ww, hh] of [[0, 0, W, b], [0, H - b, W, b], [0, 0, b, H], [W - b, 0, b, H]]) c.rect(x, y, ww, hh, R.color)
  return c
}

// Cuadrícula de colección (imagen 800 de ancho). owned: { id: cantidad }.
function drawCollection(owned, owner) {
  const rows = Math.ceil(ROSTER.length / 4), H = 100 + rows * 215 + 40
  const c = new Canvas(800, H)
  c.gradient([10, 10, 40], [40, 20, 80])
  const r = rng(4)
  for (let i = 0; i < 60; i++) c.pixel(r() * 800, r() * H, [255, 255, 255], 0.2 + r() * 0.5)
  const have = ROSTER.filter(w => owned[w.id]).length
  c.text('COLECCION DE GUERREROS', 400, 18, { scale: 5, align: 'center', color: [255, 205, 70], shadow: [80, 30, 0] })
  c.text(`${(owner || '').toUpperCase().slice(0, 14)}  ${have}/${ROSTER.length}`, 400, 62, { scale: 3, align: 'center', color: [255, 255, 255] })
  ROSTER.forEach((w, i) => {
    const x0 = 20 + (i % 4) * 195, y0 = 100 + Math.floor(i / 4) * 215, has = !!owned[w.id]
    const R = RARITY[w.rarity]
    c.rect(x0, y0, 185, 205, has ? R.bg[0] : [18, 18, 40], 0.9)
    c.rect(x0, y0, 185, 4, has ? R.color : [60, 60, 90]); c.rect(x0, y0 + 201, 185, 4, has ? R.color : [60, 60, 90])
    drawWarrior(c, x0 + 92, y0 + 160, 0.9, w, !has)
    c.text(has ? w.name : '???', x0 + 92, y0 + 172, { scale: 2, align: 'center', color: has ? [255, 255, 255] : [90, 90, 130], maxChars: 12 })
    c.text(String(i + 1), x0 + 8, y0 + 10, { scale: 2, color: [160, 170, 200] })
    if (has && owned[w.id] > 1) c.text('X' + owned[w.id], x0 + 177, y0 + 10, { scale: 2, align: 'right', color: [255, 215, 90] })
  })
  return c
}

// Video de invocación (480x270): energía que converge, destello y la carta aparece.
function summon(c, t, w, card) {
  const R = RARITY[w.rarity]
  c.gradient([8, 8, 30], [30, 16, 60])
  const cx = c.w / 2, cy = c.h / 2
  const rr = rng(9)
  if (t < 0.55) {
    const p = t / 0.55
    for (let i = 0; i < 70; i++) {
      const a = rr() * TAU + p * 3, d = (1 - p) * (40 + rr() * 200) + 6
      c.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + rr() * 1.5, R.color, 0.5 + 0.5 * p)
    }
    c.glow(cx, cy, 30 + p * 90, R.color, 0.5 + 0.5 * p)
    c.circle(cx, cy, 6 + p * 22, [255, 255, 255])
  } else {
    const p = clamp((t - 0.55) / 0.2, 0, 1)
    c.glow(cx, cy, 200, R.color, 0.4 * (1 - p * 0.5))
    c.blit(card.data, card.w, card.h, cx - card.w / 2, 2 + (1 - p) * 40, p)
    if (t - 0.55 < 0.08) c.rect(0, 0, c.w, c.h, [255, 255, 255], 0.9 - (t - 0.55) * 11)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + t * 2, d = 110 + 12 * Math.sin(t * 20 + i)
      c.star(cx + Math.cos(a) * d * 1.1, cy + Math.sin(a) * d * 0.9, 4 + (i % 3), R.color, 0.8)
    }
  }
}

module.exports = { teamBonus, ROSTER, RARITY, byId, find, roll, drawWarrior, drawCard, drawCollection, summon }
