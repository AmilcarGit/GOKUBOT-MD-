'use strict'
// Escenas dibujadas a mano: tarjeta navideña, ranking, nevada, fuegos, dragón, duelo y sticker.
// Todas las animaciones reciben t en [0,1) y son cíclicas (el último cuadro enlaza con el primero).
const { Canvas, mix, hsl, rng, clamp } = require('./canvas')

const TAU = Math.PI * 2
const GOLD = [255, 205, 64]
const RED = [220, 48, 56]
const GREEN = [34, 139, 84]
const WHITE = [255, 255, 255]
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3)

function night(c, t = 0) {
  c.gradient([8, 14, 46], [24, 70, 98])
  const r = rng(7)
  for (let i = 0; i < 80; i++) {
    const x = r() * c.w, y = r() * c.h * 0.72
    const tw = 0.5 + 0.5 * Math.sin(TAU * (t * (1 + (i % 3)) + r()))
    c.pixel(x, y, [255, 255, 230], 0.35 + 0.65 * tw)
    if (i % 10 === 0) c.glow(x, y, 6, [255, 255, 210], 0.5 * tw)
  }
}

function ground(c, y = c.h * 0.84) {
  c.ellipse(c.w * 0.25, y + c.h * 0.12, c.w * 0.5, c.h * 0.2, [236, 244, 255])
  c.ellipse(c.w * 0.8, y + c.h * 0.14, c.w * 0.55, c.h * 0.2, [220, 233, 250])
}

function snow(c, t, count = 90, seed = 3) {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    const x0 = r() * c.w, y0 = r() * c.h
    const speed = 1 + Math.floor(r() * 3), size = 1 + r() * 2.2, phase = r()
    const y = (y0 + t * speed * c.h) % c.h
    const x = x0 + Math.sin(TAU * (t * speed + phase)) * 9
    c.circle(x, y, size, WHITE, 0.55 + size * 0.15)
  }
}

function tree(c, cx, baseY, h, t = 0) {
  const w = h * 0.62
  c.rect(cx - h * 0.04, baseY - h * 0.1, h * 0.08, h * 0.1, [110, 70, 40])
  const tiers = [[0.1, 0.48, 1], [0.32, 0.72, 0.78], [0.55, 1, 0.55]]
  tiers.forEach(([from, to, width], i) => {
    const top = baseY - h * to, bottom = baseY - h * from
    const half = (w / 2) * width
    c.polygon([[cx, top], [cx + half, bottom], [cx - half, bottom]], mix([24, 110, 70], [46, 160, 96], i / 2))
  })
  const r = rng(11)
  for (let i = 0; i < 16; i++) {
    const y = baseY - h * (0.16 + r() * 0.7)
    const spread = ((baseY - y) / h < 0.45 ? 0.5 : 0.5 * (1 - ((baseY - y) / h - 0.1) * 0.9)) * w * 0.85
    const x = cx + (r() * 2 - 1) * Math.max(4, spread * (1 - (baseY - y) / h * 0.8))
    const blink = 0.5 + 0.5 * Math.sin(TAU * (t * (1 + (i % 2)) + i * 0.13))
    const col = hsl(i * 47, 0.9, 0.58)
    c.glow(x, y, h * 0.05, col, 0.5 * blink)
    c.circle(x, y, Math.max(2, h * 0.016), col)
  }
  const sp = 0.7 + 0.3 * Math.sin(TAU * t * 2)
  c.glow(cx, baseY - h, h * 0.14, GOLD, 0.7 * sp)
  c.star(cx, baseY - h, h * 0.07, GOLD)
}

// ───────────────────────── Tarjeta navideña (imagen fija) ─────────────────────────
const GREETINGS = [
  'QUE ESTA NAVIDAD TE LLENE DE PAZ Y ALEGRIA',
  'QUE TU PODER SUBA TANTO COMO TUS DESEOS',
  'FELICES FIESTAS DE PARTE DE GOKUBOT',
  'QUE EL DRAGON TE CONCEDA TODOS TUS DESEOS',
  'CELEBRA CON LOS TUYOS Y SIGUE ENTRENANDO'
]

function wrap(text, max) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max) { lines.push(line); line = word } else line = (line + ' ' + word).trim()
  }
  if (line) lines.push(line)
  return lines
}

function card(name, message) {
  const c = new Canvas(800, 500)
  night(c, 0.3)
  ground(c, 420)
  snow(c, 0.35, 110, 5)
  tree(c, 150, 470, 300, 0.2)
  tree(c, 655, 475, 230, 0.6)
  c.rect(0, 0, 800, 6, GOLD); c.rect(0, 494, 800, 6, GOLD); c.rect(0, 0, 6, 500, GOLD); c.rect(794, 0, 6, 500, GOLD)
  c.text('FELIZ NAVIDAD', 400, 40, { scale: 8, align: 'center', color: [255, 90, 90], shadow: [60, 0, 10] })
  c.text(name || 'GUERRERO', 400, 130, { scale: name && name.length > 12 ? 5 : 7, align: 'center', color: GOLD, shadow: [70, 40, 0], maxChars: 18 })
  const text = message || GREETINGS[Math.abs([...(name || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % GREETINGS.length]
  wrap(text.toUpperCase(), 26).slice(0, 4).forEach((line, i) => c.text(line, 400, 225 + i * 34, { scale: 3, align: 'center', color: WHITE, shadow: [0, 20, 40] }))
  c.text('GOKUBOT-MD * AMILCARGIT EDITION PLUS', 400, 466, { scale: 2, align: 'center', color: [20, 50, 100] })
  return c
}

// ───────────────────────── Ranking (imagen fija) ─────────────────────────
function ranking(players) {
  const rowH = 52, headH = 96
  const c = new Canvas(800, headH + players.length * rowH + 50)
  night(c, 0.1)
  snow(c, 0.5, 70, 9)
  c.text('TOP GUERREROS Z', 400, 22, { scale: 7, align: 'center', color: GOLD, shadow: [70, 40, 0] })
  c.text('RANKING DE PODER', 400, 74, { scale: 2, align: 'center', color: [200, 230, 255] })
  const best = Math.max(...players.map(p => p.power), 1)
  const medal = [GOLD, [200, 208, 220], [205, 127, 50]]
  players.forEach((p, i) => {
    const y = headH + i * rowH
    c.rect(30, y, 740, rowH - 8, [10, 20, 55], 0.78)
    c.rect(30, y, 6, rowH - 8, medal[i] || [90, 140, 200])
    c.circle(68, y + 22, 18, medal[i] || [60, 100, 160])
    c.text(String(i + 1), 68, y + 14, { scale: 3, align: 'center', color: i < 3 ? [40, 30, 0] : WHITE })
    c.text(p.name, 102, y + 6, { scale: 3, maxChars: 14, color: WHITE })
    c.text(`NV.${p.level}`, 102, y + 31, { scale: 2, color: [160, 200, 255] })
    const barW = 260 * (p.power / best)
    c.rect(400, y + 12, 260, 14, [20, 30, 70])
    c.rect(400, y + 12, barW, 14, i === 0 ? GOLD : [64, 168, 120])
    c.text(Math.floor(p.power).toLocaleString('en-US').replace(/,/g, '.'), 750, y + 12, { scale: 2, align: 'right', color: GOLD, maxChars: 12 })
  })
  c.text('GOKUBOT-MD * AMILCARGIT EDITION PLUS', 400, c.h - 30, { scale: 2, align: 'center', color: [200, 230, 255] })
  return c
}

// ───────────────────────── Animaciones de 480x270 ─────────────────────────
function snowScene(c, t) {
  night(c, t)
  c.glow(c.w * 0.82, c.h * 0.2, 70, [255, 245, 200], 0.35)
  c.circle(c.w * 0.82, c.h * 0.2, 20, [255, 250, 225])
  ground(c)
  tree(c, c.w * 0.3, c.h * 0.92, c.h * 0.7, t)
  tree(c, c.w * 0.68, c.h * 0.94, c.h * 0.48, t + 0.4)
  snow(c, t, 130, 21)
  c.text('FELIZ NAVIDAD', c.w / 2, 14, { scale: 4, align: 'center', color: [255, 110, 110], shadow: [50, 0, 10] })
}

function fireworks(c, t) {
  c.gradient([4, 6, 24], [18, 22, 58])
  const r = rng(5)
  for (let i = 0; i < 40; i++) c.pixel(r() * c.w, r() * c.h * 0.6, WHITE, 0.3 + 0.5 * Math.abs(Math.sin(TAU * (t + r()))))
  c.ellipse(c.w / 2, c.h + 30, c.w * 0.7, 60, [10, 14, 30])
  const origins = [[0.25, 0.35], [0.7, 0.3], [0.5, 0.45], [0.85, 0.5], [0.15, 0.55], [0.55, 0.25]]
  const burstLife = 0.42, rocketLife = 0.12
  origins.forEach(([ox, oy], k) => {
    const u = (t - k / origins.length + 1 + rocketLife) % 1
    const X = ox * c.w, Y = oy * c.h, hue = k * 61 + 10
    if (u < rocketLife) {
      const p = u / rocketLife, ry = c.h + (Y - c.h) * ease(p)
      c.glow(X, ry, 10, [255, 220, 150], 0.9)
      c.line(X, ry, X, ry + 18, [255, 200, 120], 2, 0.6)
    } else if (u < rocketLife + burstLife) {
      const p = (u - rocketLife) / burstLife
      const pr = rng(100 + k)
      for (let i = 0; i < 44; i++) {
        const angle = (i / 44) * TAU, speed = 0.55 + pr() * 0.45
        for (let trail = 0; trail < 4; trail++) {
          const q = Math.max(0, p - trail * 0.025)
          const dist = ease(q) * speed * c.h * 0.42
          const x = X + Math.cos(angle) * dist, y = Y + Math.sin(angle) * dist + q * q * c.h * 0.22
          const a = (1 - p) * (1 - trail * 0.25)
          c.circle(x, y, trail ? 1.3 : 2.1, hsl(hue + (i % 2) * 40, 1, 0.62), a)
          if (!trail && i % 4 === 0) c.glow(x, y, 8, hsl(hue, 1, 0.6), a * 0.5)
        }
      }
      c.glow(X, Y, 70 * (1 - p), hsl(hue, 1, 0.7), 0.35 * (1 - p))
    }
  })
  c.text('FELIZ AÑO NUEVO', c.w / 2, 14, { scale: 4, align: 'center', color: GOLD, shadow: [50, 30, 0] })
}

function dragon(c, t) {
  const flash = Math.max(0, Math.sin(TAU * t * 3)) ** 40
  c.gradient(mix([10, 12, 34], [90, 100, 140], flash), mix([28, 18, 60], [120, 120, 170], flash))
  const r = rng(13)
  for (let i = 0; i < 50; i++) c.pixel(r() * c.w, r() * c.h, WHITE, 0.2 + 0.5 * Math.abs(Math.sin(TAU * (t + r()))))
  const N = 54
  const pos = []
  for (let i = 0; i <= N; i++) {
    const s = i / N
    pos.push([c.w * (0.06 + 0.80 * s), c.h * 0.54 + Math.sin(TAU * (s * 1.6 - t)) * c.h * (0.12 + 0.12 * s)])
  }
  for (let i = 0; i < N; i++) {
    const s = i / N, radius = 3 + 15 * Math.sin(Math.min(1, s * 1.1) * Math.PI * 0.5) ** 0.8
    const [x, y] = pos[i]
    c.circle(x, y, radius, mix([14, 110, 62], [60, 190, 100], s))
    c.circle(x, y + radius * 0.35, radius * 0.55, [224, 220, 140], 0.9)
    if (i % 5 === 0) c.polygon([[x - 5, y - radius + 2], [x + 5, y - radius + 2], [x, y - radius - 9]], [220, 60, 50])
  }
  const [hx, hy] = pos[N], [px, py] = pos[N - 3]
  const ang = Math.atan2(hy - py, hx - px)
  const fx = hx + Math.cos(ang) * 8, fy = hy + Math.sin(ang) * 8
  c.ellipse(fx, fy, 24, 17, [40, 170, 95])
  c.ellipse(fx + 14, fy + 4, 14, 10, [60, 200, 110])
  c.circle(fx + 3, fy - 6, 4.5, WHITE); c.circle(fx + 4, fy - 6, 2.4, [220, 30, 30])
  c.line(fx - 4, fy - 14, fx - 20, fy - 30, GOLD, 4)
  c.line(fx + 6, fy - 14, fx - 6, fy - 32, GOLD, 4)
  c.line(fx + 20, fy + 6, fx + 44, fy + 16 + Math.sin(TAU * t * 2) * 4, GOLD, 2)
  c.line(fx + 20, fy + 8, fx + 40, fy + 28 + Math.sin(TAU * t * 2 + 1) * 4, GOLD, 2)
  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 62, y = c.h - 26 + Math.sin(TAU * (t + i / 7)) * 4
    c.glow(x, y, 22, [255, 160, 30], 0.55)
    c.circle(x, y, 11, [255, 150, 30]); c.circle(x - 3, y - 3, 4, [255, 220, 150], 0.7)
    for (let k = 0; k <= i; k++) {
      const a = (k / (i + 1)) * TAU + t * TAU * 0.5
      c.circle(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 1.3, [200, 30, 30])
    }
  }
  c.text('SHENLONG', c.w / 2, 12, { scale: 5, align: 'center', color: GOLD, shadow: [80, 20, 0] })
  c.text('PIDE TU DESEO', c.w / 2, 52, { scale: 2, align: 'center', color: [200, 255, 220] })
}

// ───────────────────────── Duelo animado ─────────────────────────
// info: { a: {name, power, hue}, b: {name, power, hue}, winner: 0 | 1 }
function duel(c, t, info) {
  const { a, b, winner } = info
  c.gradient([20, 10, 45], [70, 30, 70])
  c.rect(0, c.h * 0.78, c.w, c.h * 0.22, [30, 20, 40])
  const ax = c.w * 0.16, bx = c.w * 0.84, gy = c.h * 0.78
  const approach = ease(t / 0.2)
  const clash = clamp((t - 0.2) / 0.55, 0, 1)
  const end = clamp((t - 0.75) / 0.25, 0, 1)
  const total = a.power + b.power
  const lead = (a.power - b.power) / total
  const mid = c.w / 2 + lead * c.w * 0.18 * ease(clash) + (winner === 0 ? 1 : -1) * c.w * 0.3 * end
  const shake = clash > 0 && end < 1 ? Math.sin(t * 150) * 2 : 0
  const fighters = [
    { f: a, x: ax + (c.w * 0.04) * approach, dir: 1, win: winner === 0 },
    { f: b, x: bx - (c.w * 0.04) * approach, dir: -1, win: winner === 1 }
  ]
  for (const { f, x, dir, win } of fighters) {
    const lost = end > 0 && !win
    const fx = x + (lost ? -dir * end * 40 : 0) + shake
    const col = hsl(f.hue, 1, 0.6), pulse = 0.6 + 0.4 * Math.sin(t * 40 + f.hue)
    c.glow(fx, gy - 40, 70 + pulse * 10, col, (lost ? 0.15 : 0.55) * (0.5 + approach))
    c.rect(fx - 9, gy - 40, 18, 26, win ? col : [60, 90, 170])
    c.rect(fx - 9, gy - 14, 7, 14, [40, 40, 90]); c.rect(fx + 2, gy - 14, 7, 14, [40, 40, 90])
    c.circle(fx, gy - 52, 11, [250, 205, 160])
    c.polygon([[fx - 11, gy - 56], [fx - 6, gy - 78 - pulse * 4], [fx - 1, gy - 60], [fx + 4, gy - 80 - pulse * 4], [fx + 9, gy - 60], [fx + 14, gy - 74], [fx + 11, gy - 54]], mix(col, [255, 240, 140], 0.5))
    c.line(fx + dir * 8, gy - 34, fx + dir * 26, gy - 40 + (clash > 0 ? -4 : 6), [250, 205, 160], 5)
    c.text(f.name, fx, gy + 8, { scale: 2, align: 'center', color: WHITE, maxChars: 10 })
  }
  if (clash > 0 && end < 1) {
    const hy = gy - 38
    const sx = ax + c.w * 0.04 + 26, ex = bx - c.w * 0.04 - 26
    c.line(sx, hy, mid, hy, hsl(a.hue, 1, 0.6), 14 + Math.sin(t * 60) * 3, 0.9)
    c.line(sx, hy, mid, hy, [255, 255, 255], 5, 0.8)
    c.line(ex, hy, mid, hy, hsl(b.hue, 1, 0.6), 14 + Math.cos(t * 60) * 3, 0.9)
    c.line(ex, hy, mid, hy, [255, 255, 255], 5, 0.8)
    c.glow(mid, hy, 34 + Math.sin(t * 80) * 6, [255, 255, 255], 0.9)
    const r = rng(Math.floor(t * 40) + 1)
    for (let i = 0; i < 14; i++) {
      const ang = r() * TAU, d = 10 + r() * 36
      c.circle(mid + Math.cos(ang) * d, hy + Math.sin(ang) * d, 1.6, GOLD, 0.9)
    }
  }
  if (end > 0) {
    const lx = winner === 0 ? bx : ax
    c.glow(lx, gy - 40, 120 * (1 - end * 0.5), [255, 200, 120], 0.9 * (1 - end))
  }
  // Barras de poder
  const barW = c.w * 0.38
  c.rect(14, 12, barW, 12, [30, 20, 60]); c.rect(14, 12, barW * (a.power / Math.max(a.power, b.power)), 12, hsl(a.hue, 1, 0.55))
  c.rect(c.w - 14 - barW, 12, barW, 12, [30, 20, 60]); c.rect(c.w - 14 - barW, 12, barW * (b.power / Math.max(a.power, b.power)), 12, hsl(b.hue, 1, 0.55))
  c.text(String(Math.floor(a.power)), 14, 30, { scale: 2, color: WHITE })
  c.text(String(Math.floor(b.power)), c.w - 14, 30, { scale: 2, align: 'right', color: WHITE })
  c.text('VS', c.w / 2, 14, { scale: 4, align: 'center', color: GOLD, shadow: [80, 20, 0] })
  if (end > 0.2) {
    const win = winner === 0 ? a : b
    c.rect(0, c.h * 0.38, c.w, 50, [0, 0, 0], 0.6 * ease(end))
    c.text('GANA ' + win.name, c.w / 2, c.h * 0.38 + 10, { scale: 4, align: 'center', color: GOLD, shadow: [80, 20, 0], maxChars: 14 })
  }
}

// ───────────────────────── Sticker animado (512x512, fondo transparente) ─────────────────────────
function stickerText(c, t, text) {
  c.clear([0, 0, 0], 0)
  const lines = wrap(String(text).toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 36), 10).slice(0, 4)
  const longest = Math.max(...lines.map(l => Math.max(1, l.length)))
  const scale = clamp(Math.floor(470 / (longest * 6)), 3, 12)
  const lineH = 9 * scale, top = (512 - lines.length * lineH) / 2
  lines.forEach((line, li) => {
    const width = c.textWidth(line, scale)
    let x = 256 - width / 2
    ;[...line].forEach((ch, i) => {
      const phase = t * TAU - i * 0.55 - li * 0.8
      const y = top + li * lineH + Math.sin(phase) * scale * 1.8
      const col = hsl(t * 360 + i * 28 + li * 40, 1, 0.62)
      c.text(ch, x, y, { scale, color: col, shadow: [0, 0, 0], spacing: 0 })
      x += 6 * scale
    })
  })
  const r = rng(2)
  for (let i = 0; i < 7; i++) {
    const x = 30 + r() * 452, y = 20 + r() * 472
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + r()))
    c.star(x, y, 6 + pulse * 8, hsl(t * 360 + i * 50, 1, 0.75), 0.4 + 0.6 * pulse)
  }
}

module.exports = { card, ranking, snowScene, fireworks, dragon, duel, stickerText, GREETINGS }
