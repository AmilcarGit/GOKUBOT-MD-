'use strict'
// Escenas de la racha diaria, la mascota y el cuadro del torneo (dibujadas en código, diseños originales).
const { Canvas, mix, hsl, rng, clamp } = require('./canvas')

const TAU = Math.PI * 2
const GOLD = [255, 205, 64], WHITE = [255, 255, 255]
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3)

// ───────────── Racha diaria (480x270, animada) ─────────────
function streak(c, t, info) {
  const { streak: n, day, reward, name } = info
  c.gradient([14, 10, 50], [70, 30, 90])
  const r = rng(7)
  for (let i = 0; i < 50; i++) {
    const x = r() * c.w, y = r() * c.h * 0.7, tw = 0.5 + 0.5 * Math.sin(t * TAU * 2 + i)
    c.circle(x, y, 1.2, WHITE, 0.3 + tw * 0.5)
  }
  c.text('RACHA DIARIA', c.w / 2, 12, { scale: 4, align: 'center', color: GOLD, shadow: [80, 30, 0] })
  c.text(name, c.w / 2, 46, { scale: 2, align: 'center', color: [200, 230, 255], maxChars: 20 })
  // Llama y contador
  const fl = Math.sin(t * TAU * 3) * 3
  c.glow(70, 150, 50, [255, 140, 30], 0.6)
  c.polygon([[70, 108 + fl], [92, 140], [86, 178], [70, 192], [54, 178], [48, 140]], [255, 120, 30])
  c.polygon([[70, 130 + fl], [82, 152], [78, 180], [70, 188], [62, 180], [58, 152]], [255, 220, 90])
  c.text(String(n), 70, 205, { scale: 5, align: 'center', color: WHITE, shadow: [90, 30, 0] })
  c.text('DIAS', 70, 242, { scale: 2, align: 'center', color: [255, 200, 140] })
  // 7 cofres
  const open = ease((t - 0.1) / 0.5)
  for (let i = 1; i <= 7; i++) {
    const x = 130 + (i - 1) * 48, y = 150
    const done = i < day, cur = i === day
    const col = done || cur ? [235, 170, 40] : [70, 70, 110]
    const bob = cur ? Math.sin(t * TAU * 2) * 4 : 0
    if (cur) c.glow(x + 18, y + 16 + bob, 34, GOLD, 0.7)
    c.rect(x, y + 10 + bob, 36, 26, col)
    c.rect(x, y + 10 + bob, 36, 6, mix(col, WHITE, 0.3))
    c.rect(x - 2, y - 4 + bob - (cur ? open * 10 : 0), 40, 14, mix(col, [0, 0, 0], 0.15))
    c.rect(x + 15, y + 18 + bob, 6, 8, [60, 40, 10])
    if (done) c.star(x + 18, y - 18, 7, [120, 255, 160])
    c.text(i === 7 ? 'x2' : String(i), x + 18, y + 44, { scale: 2, align: 'center', color: cur ? GOLD : [170, 180, 220] })
    if (cur && open > 0.2) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + t * 4, d = 14 + open * 26
        c.circle(x + 18 + Math.cos(a) * d, y - 6 - Math.abs(Math.sin(a)) * d, 2.2, GOLD, 1 - open * 0.4)
      }
    }
  }
  c.rect(120, 230, 340, 28, [0, 0, 0], 0.5)
  c.text(`+${reward} ZENIS`, 290, 236, { scale: 3, align: 'center', color: GOLD, shadow: [80, 30, 0] })
}

// ───────────── Mascota ─────────────
const SPECIES = {
  draki: { label: 'DRAKI', body: [90, 200, 120], belly: [230, 245, 160], accent: [255, 150, 60] },
  kori:  { label: 'KORI',  body: [140, 190, 255], belly: [240, 248, 255], accent: [255, 255, 255] },
  nimbo: { label: 'NIMBO', body: [190, 150, 255], belly: [250, 235, 255], accent: [255, 200, 240] }
}
const SKINS = {
  cielo:     { label: 'Cielo',     price: 0,    top: [100, 170, 255], bottom: [190, 230, 255] },
  atardecer: { label: 'Atardecer', price: 300,  top: [255, 120, 90],  bottom: [255, 210, 130] },
  nebulosa:  { label: 'Nebulosa',  price: 700,  top: [30, 10, 80],    bottom: [140, 60, 170] },
  dorado:    { label: 'Dorado',    price: 1500, top: [150, 100, 10],  bottom: [255, 215, 90] }
}
const stageFor = level => (level >= 10 ? 3 : level >= 5 ? 2 : 1)

function pet(c, t, info) {
  const { species = 'draki', skin = 'cielo', level = 1, name = 'Mascota', egg = false, mood = 1 } = info
  const sp = SPECIES[species] || SPECIES.draki, bg = SKINS[skin] || SKINS.cielo
  c.gradient(bg.top, bg.bottom)
  const dark = skin === 'nebulosa'
  const r = rng(11)
  for (let i = 0; i < 40; i++) {
    const x = r() * c.w, y = r() * c.h * 0.8, tw = 0.5 + 0.5 * Math.sin(t * TAU * 2 + i * 1.7)
    c.circle(x, y, dark || skin === 'dorado' ? 1.6 : 1, WHITE, (dark ? 0.35 : 0.18) + tw * 0.4)
  }
  c.ellipse(c.w / 2, 236, 90, 14, [0, 0, 0], 0.25)
  const cx = c.w / 2
  const bounce = Math.abs(Math.sin(t * TAU * 2)) * 12 * (mood > 0.3 ? 1 : 0.3)
  if (egg) {
    const tilt = Math.sin(t * TAU * 3) * 4
    c.ellipse(cx + tilt, 168 - bounce * 0.3, 50, 64, mix(sp.body, WHITE, 0.55))
    for (const [dx, dy, s] of [[-18, -20, 10], [14, 0, 12], [-8, 26, 9], [22, -34, 7]]) c.circle(cx + tilt + dx, 168 + dy, s, sp.body)
    c.text('HUEVO', cx, 14, { scale: 3, align: 'center', color: WHITE, shadow: [0, 0, 0] })
    return
  }
  const stage = stageFor(level), k = 0.8 + stage * 0.18
  const y0 = 170 - bounce, rx = 54 * k, ry = 50 * k
  if (stage >= 3) c.glow(cx, y0, 120, sp.body, 0.5)
  // alas / orejas / cola según especie
  const flap = Math.sin(t * TAU * 4) * 8
  if (species === 'draki' && stage >= 2) {
    c.polygon([[cx - rx * 0.6, y0 - 10], [cx - rx - 34, y0 - 50 + flap], [cx - rx * 0.8, y0 + 20]], sp.accent)
    c.polygon([[cx + rx * 0.6, y0 - 10], [cx + rx + 34, y0 - 50 + flap], [cx + rx * 0.8, y0 + 20]], sp.accent)
  }
  if (species === 'nimbo') {
    c.circle(cx - rx * 0.85, y0 + 22, 22 * k, sp.belly); c.circle(cx + rx * 0.85, y0 + 22, 22 * k, sp.belly)
    c.circle(cx, y0 + ry * 0.9, 26 * k, sp.belly)
  }
  const wag = Math.sin(t * TAU * 3) * 10
  c.polygon([[cx + rx * 0.7, y0 + 20], [cx + rx + 30 * k, y0 + wag], [cx + rx * 0.7, y0 + 38]], sp.body)
  c.ellipse(cx, y0, rx, ry, sp.body)
  c.ellipse(cx, y0 + ry * 0.25, rx * 0.62, ry * 0.62, sp.belly)
  c.ellipse(cx - rx * 0.55, y0 + ry * 0.95, 18 * k, 10 * k, mix(sp.body, [0, 0, 0], 0.15))
  c.ellipse(cx + rx * 0.55, y0 + ry * 0.95, 18 * k, 10 * k, mix(sp.body, [0, 0, 0], 0.15))
  if (species === 'draki') {
    c.polygon([[cx - 22, y0 - ry + 4], [cx - 14, y0 - ry - 18 * k], [cx - 6, y0 - ry + 4]], sp.accent)
    c.polygon([[cx + 6, y0 - ry + 4], [cx + 14, y0 - ry - 18 * k], [cx + 22, y0 - ry + 4]], sp.accent)
  } else if (species === 'kori') {
    c.polygon([[cx - rx * 0.8, y0 - ry * 0.5], [cx - rx * 0.7, y0 - ry - 22 * k], [cx - rx * 0.2, y0 - ry * 0.9]], sp.body)
    c.polygon([[cx + rx * 0.8, y0 - ry * 0.5], [cx + rx * 0.7, y0 - ry - 22 * k], [cx + rx * 0.2, y0 - ry * 0.9]], sp.body)
  } else {
    c.circle(cx - rx * 0.55, y0 - ry * 0.85, 14 * k, sp.belly); c.circle(cx + rx * 0.55, y0 - ry * 0.85, 14 * k, sp.belly)
  }
  const blink = (t * 3) % 1 > 0.94
  for (const s of [-1, 1]) {
    const ex = cx + s * 20 * k, ey = y0 - 8
    if (blink) c.rect(ex - 7, ey, 14, 3, [30, 20, 40])
    else { c.circle(ex, ey, 8 * k, WHITE); c.circle(ex + s * 1.5, ey + 1, 5 * k, [30, 20, 50]); c.circle(ex - 1, ey - 2, 1.8, WHITE) }
    c.circle(cx + s * 34 * k, y0 + 8, 6 * k, [255, 140, 160], 0.6)
  }
  if (mood > 0.3) c.ellipse(cx, y0 + 16, 8 * k, 4 * k, [120, 40, 60]); else c.rect(cx - 8, y0 + 18, 16, 3, [120, 40, 60])
  if (stage >= 3) { c.star(cx, y0 - ry - 40 * k, 12, GOLD); }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + t * TAU, d = 90 + 10 * Math.sin(t * TAU * 2 + i)
    c.star(cx + Math.cos(a) * d, y0 - 10 + Math.sin(a) * d * 0.55, 4, [255, 255, 255], 0.7)
  }
  c.rect(0, 0, c.w, 34, [0, 0, 0], 0.35)
  c.text(`${name} - ${sp.label}`, 12, 10, { scale: 2, color: WHITE, maxChars: 24 })
  c.text(`NV.${level}`, c.w - 12, 10, { scale: 2, align: 'right', color: GOLD })
}

// ───────────── Cuadro del torneo ─────────────
// rounds: [[{a,b,w}]] donde a/b son nombres (b puede ser null = pase directo) y w es 0|1.
function bracket(rounds, champion, title = 'TORNEO TENKAICHI') {
  const W = 760, H = 420
  const c = new Canvas(W, H)
  c.gradient([20, 10, 50], [80, 30, 60])
  c.text(title, W / 2, 14, { scale: 5, align: 'center', color: GOLD, shadow: [80, 30, 0] })
  const colW = 170, boxW = 138, boxH = 22, top = 70, area = H - top - 20
  const positions = []
  rounds.forEach((round, ri) => {
    positions[ri] = round.map((match, mi) => {
      const slots = rounds[0].length
      const span = area / slots * Math.pow(2, ri)
      const cy = top + span * mi + span / 2
      const x = 20 + ri * colW
      for (const [side, name] of [[0, match.a], [1, match.b]]) {
        const y = cy + (side === 0 ? -boxH - 2 : 2)
        const win = match.w === side
        c.rect(x, y, boxW, boxH, win ? [60, 120, 70] : [30, 30, 70], 0.9)
        c.rect(x, y, 4, boxH, win ? [120, 255, 150] : [90, 90, 150])
        c.text(name || 'PASE', x + 10, y + 5, { scale: 2, maxChars: 11, color: name ? (win ? WHITE : [170, 175, 210]) : [110, 110, 150] })
      }
      c.line(x + boxW, cy - boxH / 2 - 1, x + boxW + 16, cy, [130, 130, 190], 2)
      c.line(x + boxW, cy + boxH / 2 + 1, x + boxW + 16, cy, [130, 130, 190], 2)
      return cy
    })
  })
  const fx = 20 + rounds.length * colW, fy = top + area / 2
  c.glow(fx + 60, fy, 90, GOLD, 0.5)
  c.star(fx + 60, fy - 40, 26, GOLD)
  c.text('CAMPEON', fx + 60, fy - 4, { scale: 2, align: 'center', color: [255, 230, 150] })
  c.text(champion, fx + 60, fy + 18, { scale: 3, align: 'center', color: WHITE, shadow: [80, 30, 0], maxChars: 9 })
  return c
}


// ───────────── Subbots ─────────────
function linkCard(code, number) {
  const W = 640, H = 360
  const c = new Canvas(W, H)
  c.gradient([12, 8, 44], [96, 28, 110])
  const r = rng(5)
  for (let i = 0; i < 60; i++) c.circle(r() * W, r() * H, 1.3, WHITE, 0.2 + r() * 0.5)
  c.glow(W / 2, 150, 260, [120, 80, 255], 0.35)
  c.text('CAPSULA DE VINCULACION', W / 2, 18, { scale: 4, align: 'center', color: GOLD, shadow: [70, 30, 0] })
  c.text('SUBBOT +' + String(number).slice(0, 15), W / 2, 56, { scale: 2, align: 'center', color: [190, 210, 255] })
  const chars = String(code).padEnd(8, ' ').slice(0, 8).split('')
  const slot = 56, gap = 8, group = 18
  const total = 8 * slot + 6 * gap + group
  let x = (W - total) / 2
  chars.forEach((ch, i) => {
    if (i === 4) x += group - gap
    c.rect(x - 2, 92, slot + 4, 84, [255, 205, 64], 0.9)
    c.rect(x, 94, slot, 80, [24, 16, 70])
    c.rect(x, 94, slot, 8, [255, 255, 255], 0.12)
    c.text(ch, x + slot / 2, 108, { scale: 7, align: 'center', color: WHITE, shadow: [90, 40, 160] })
    x += slot + gap
  })
  const steps = ['1. WHATSAPP > DISPOSITIVOS VINCULADOS', '2. VINCULAR CON NUMERO DE TELEFONO', '3. ESCRIBE EL CODIGO DE ARRIBA']
  steps.forEach((t, i) => c.text(t, W / 2, 204 + i * 28, { scale: 2, align: 'center', color: [215, 225, 255] }))
  c.rect(60, 310, W - 120, 10, [255, 255, 255], 0.15)
  c.rect(60, 310, W - 120, 10, GOLD, 0.9)
  c.text('EL CODIGO CADUCA EN 4 MINUTOS', W / 2, 330, { scale: 2, align: 'center', color: [255, 190, 120] })
  return c
}

function subPanel(rows, max) {
  const W = 640, H = Math.max(240, 110 + Math.max(1, rows.length) * 52)
  const c = new Canvas(W, H)
  c.gradient([8, 14, 40], [30, 20, 70])
  c.circle(W - 70, 62, 36, [0, 255, 170], 0.12); c.circle(W - 70, 62, 22, [0, 255, 170], 0.18)
  c.text('RADAR DE SUBBOTS', 24, 20, { scale: 4, color: [120, 255, 200], shadow: [0, 60, 50] })
  c.text(`${rows.filter(x => x.state === 'conectado').length} EN LINEA / ${rows.length} DE ${max}`, 24, 62, { scale: 2, color: [180, 200, 255] })
  if (!rows.length) c.text('SIN SUBBOTS TODAVIA', W / 2, 150, { scale: 3, align: 'center', color: [150, 160, 200] })
  rows.forEach((x, i) => {
    const y = 100 + i * 52
    const col = x.state === 'conectado' ? [60, 255, 140] : x.state === 'detenido' ? [255, 80, 80] : [255, 205, 64]
    c.rect(18, y, W - 36, 44, [255, 255, 255], 0.07)
    c.rect(18, y, 5, 44, col)
    c.glow(46, y + 22, 18, col, 0.6); c.circle(46, y + 22, 8, col)
    c.text(x.label, 70, y + 6, { scale: 2, color: WHITE, maxChars: 24 })
    c.text(String(x.state).toUpperCase() + (x.uptime ? '  -  ' + x.uptime : ''), 70, y + 26, { scale: 2, color: [170, 185, 230], maxChars: 40 })
  })
  return c
}

// Tarjeta de estado de un subbot: estado, uptime, mensajes, comandos y los más usados.
function subStats(info) {
  const W = 640, H = 330
  const c = new Canvas(W, H)
  c.gradient([8, 14, 40], [40, 18, 80])
  const col = info.state === 'conectado' ? [60, 255, 140] : info.state === 'pausado' ? [255, 205, 64] : [255, 90, 90]
  c.glow(50, 58, 30, col, 0.6); c.circle(50, 58, 12, col)
  c.text('MI SUBBOT', 78, 22, { scale: 4, color: [120, 255, 200], shadow: [0, 60, 50] })
  c.text(String(info.label), 78, 60, { scale: 2, color: WHITE, maxChars: 26 })
  const boxes = [['ESTADO', String(info.state).toUpperCase()], ['ACTIVO', info.uptime || '-'], ['MENSAJES', String(info.messages)], ['COMANDOS', String(info.commands)]]
  boxes.forEach(([k, v], i) => {
    const x = 20 + i * 154
    c.rect(x, 100, 144, 70, [255, 255, 255], 0.08); c.rect(x, 100, 144, 4, col)
    c.text(k, x + 72, 114, { scale: 2, align: 'center', color: [170, 185, 230] })
    c.text(v, x + 72, 138, { scale: 3, align: 'center', color: WHITE, maxChars: 8 })
  })
  c.text('COMANDOS MAS USADOS', 20, 190, { scale: 2, color: GOLD })
  const top = info.top.length ? info.top : []
  const max = Math.max(1, ...top.map(x => x[1]))
  if (!top.length) c.text('AUN NO HAY USO', 20, 224, { scale: 2, color: [150, 160, 200] })
  top.forEach(([name, n], i) => {
    const y = 216 + i * 34
    c.text(String(name).slice(0, 10).toUpperCase(), 20, y + 4, { scale: 2, color: WHITE })
    c.rect(170, y, 440, 22, [255, 255, 255], 0.08)
    c.rect(170, y, Math.max(8, 440 * n / max), 22, [120, 80, 255], 0.9)
    c.text(String(n), 178, y + 4, { scale: 2, color: WHITE })
  })
  return c
}

module.exports = { subStats, linkCard, subPanel, streak, pet, bracket, SPECIES, SKINS, stageFor }
