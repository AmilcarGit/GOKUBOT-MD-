'use strict'
// Escenas del menú, el tres en raya y el ahorcado (diseños originales dibujados en código).
const { Canvas, mix, hsl, rng, clamp } = require('./canvas')

const TAU = Math.PI * 2
const GOLD = [255, 205, 64], WHITE = [255, 255, 255]

// ───────────── Banner animado del menú (480x270) ─────────────
function menuBanner(c, t, info) {
  const cx = c.w / 2, cy = 120
  c.gradient([10, 6, 40], [58, 20, 92])
  const r = rng(3)
  for (let i = 0; i < 46; i++) c.circle(r() * c.w, r() * c.h, 1.2, WHITE, 0.2 + 0.6 * Math.abs(Math.sin(TAU * (t * 2 + r()))))
  // Rayos de energía que giran despacio
  const rays = 18
  for (let i = 0; i < rays; i += 2) {
    const a0 = (i / rays) * TAU + t * TAU * 0.25, a1 = ((i + 1) / rays) * TAU + t * TAU * 0.25
    const R = 420
    c.polygon([[cx, cy], [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R], [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R]], [255, 190, 70], 0.07)
  }
  c.glow(cx, cy, 150 + Math.sin(t * TAU * 2) * 10, [255, 150, 40], 0.4)
  // Esferas que orbitan el título
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + t * TAU, x = cx + Math.cos(a) * 190, y = cy + Math.sin(a) * 44
    c.glow(x, y, 16, [255, 160, 40], 0.5)
    c.circle(x, y, 8, [255, 150, 30]); c.circle(x - 2, y - 2, 3, [255, 230, 160])
  }
  c.text(info.name, cx, 84, { scale: 6, align: 'center', color: WHITE, shadow: [130, 50, 0], maxChars: 14 })
  c.text('MENU PRINCIPAL', cx, 142, { scale: 3, align: 'center', color: GOLD, shadow: [80, 30, 0] })
  const boxes = [[`${info.commands}`, 'COMANDOS'], [`${info.categories}`, 'SECCIONES'], ['24/7', 'EN LINEA']]
  boxes.forEach(([v, k], i) => {
    const x = 36 + i * 142
    c.rect(x, 196, 130, 52, [255, 255, 255], 0.09); c.rect(x, 196, 130, 4, GOLD)
    c.text(v, x + 65, 207, { scale: 3, align: 'center', color: WHITE })
    c.text(k, x + 65, 232, { scale: 1, align: 'center', color: [190, 200, 240] })
  })
}

// ───────────── Tres en raya (360x360) ─────────────
function tttBoard(board, win) {
  const S = 360, cell = 110, off = 15
  const c = new Canvas(S, S)
  c.gradient([14, 10, 50], [64, 24, 96])
  for (let i = 1; i < 3; i++) {
    c.rect(off + i * cell - 3, off + 6, 6, 3 * cell - 12, [140, 120, 255], 0.9)
    c.rect(off + 6, off + i * cell - 3, 3 * cell - 12, 6, [140, 120, 255], 0.9)
  }
  board.forEach((v, i) => {
    const x = off + (i % 3) * cell + cell / 2, y = off + Math.floor(i / 3) * cell + cell / 2
    const hot = win && win.includes(i)
    if (hot) c.glow(x, y, 60, GOLD, 0.45)
    if (v === 'X') {
      const col = hot ? GOLD : [80, 220, 255]
      c.line(x - 28, y - 28, x + 28, y + 28, col, 10); c.line(x + 28, y - 28, x - 28, y + 28, col, 10)
    } else if (v === 'O') {
      const col = hot ? GOLD : [255, 140, 70]
      c.circle(x, y, 32, col); c.circle(x, y, 20, mix([14, 10, 50], [64, 24, 96], 0.5))
    } else {
      c.text(String(i + 1), x, y - 8, { scale: 3, align: 'center', color: [150, 150, 210] })
    }
  })
  return c
}

// ───────────── Ahorcado (480x270) ─────────────
function hangman(wrong, shown, used) {
  const c = new Canvas(480, 270)
  c.gradient([12, 10, 44], [44, 22, 80])
  const W = [210, 190, 255]
  c.rect(30, 230, 150, 8, W); c.rect(70, 40, 8, 192, W); c.rect(70, 40, 100, 8, W); c.rect(160, 40, 6, 28, W)
  const body = [150, 235, 255]
  if (wrong > 0) { c.circle(163, 82, 16, body); c.circle(163, 82, 11, [20, 14, 56]) }
  if (wrong > 1) c.rect(160, 98, 6, 56, body)
  if (wrong > 2) c.line(163, 108, 138, 134, body, 5)
  if (wrong > 3) c.line(163, 108, 188, 134, body, 5)
  if (wrong > 4) c.line(163, 154, 142, 192, body, 5)
  if (wrong > 5) c.line(163, 154, 184, 192, body, 5)
  c.text('AHORCADO', 330, 18, { scale: 4, align: 'center', color: GOLD, shadow: [80, 30, 0] })
  const letters = shown.split('')
  const size = Math.min(32, Math.floor(280 / Math.max(1, letters.length)))
  const x0 = 330 - (letters.length * size) / 2
  letters.forEach((ch, i) => {
    const x = x0 + i * size
    c.rect(x + 3, 128, size - 6, 4, [180, 170, 240])
    if (ch !== '_') c.text(ch, x + size / 2, 100, { scale: size > 24 ? 3 : 2, align: 'center', color: WHITE })
  })
  c.text('FALLOS ' + wrong + '/6', 330, 160, { scale: 3, align: 'center', color: wrong > 3 ? [255, 110, 110] : [200, 210, 255] })
  c.text(used.length ? 'USADAS: ' + used.join(' ') : 'SIN LETRAS USADAS', 330, 205, { scale: 2, align: 'center', color: [170, 180, 230], maxChars: 24 })
  return c
}

module.exports = { menuBanner, tttBoard, hangman }
