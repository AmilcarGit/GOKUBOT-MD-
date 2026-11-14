'use strict'
// Motor de dibujo 2D en JavaScript puro (RGBA), sin dependencias.
// Sirve para generar imágenes PNG y cuadros de video/sticker.
const zlib = require('zlib')

// Fuente bitmap 5x7. Mayúsculas, números y signos básicos. ^ = corazón, ~ = estrella.
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ':': ['00000', '00110', '00110', '00000', '00110', '00110', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '^': ['01010', '11111', '11111', '11111', '01110', '00100', '00000'],
  '~': ['00100', '00100', '11111', '01110', '01110', '11011', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
}

// Convierte cualquier texto a los caracteres que la fuente sabe dibujar.
function normalizeText(value) {
  return String(value)
    .replace(/[❤♥💖💗💝]/gu, '^')
    .replace(/[★☆⭐🌟]/gu, '~')
    .replace(/¡/g, '!').replace(/¿/g, '?')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split('')
    .map(ch => (GLYPHS[ch] ? ch : ' '))
    .join('')
    .replace(/ {2,}/g, ' ')
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t))

// Color a partir de matiz (0-360), saturación y luminosidad (0-1).
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([name, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

class Canvas {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = Buffer.alloc(w * h * 4)
  }

  copyFrom(other) { other.data.copy(this.data); return this }
  clone() { const c = new Canvas(this.w, this.h); this.data.copy(c.data); return c }
  clear(color = [0, 0, 0], alpha = 0) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = color[0]; this.data[i + 1] = color[1]; this.data[i + 2] = color[2]; this.data[i + 3] = Math.round(alpha * 255)
    }
    return this
  }

  // Mezcla un píxel (índice de byte) con transparencia "over".
  blend(i, color, a) {
    if (a <= 0) return
    const d = this.data
    if (a >= 1) { d[i] = color[0]; d[i + 1] = color[1]; d[i + 2] = color[2]; d[i + 3] = 255; return }
    const da = d[i + 3] / 255
    const oa = a + da * (1 - a)
    d[i] = (color[0] * a + d[i] * da * (1 - a)) / oa
    d[i + 1] = (color[1] * a + d[i + 1] * da * (1 - a)) / oa
    d[i + 2] = (color[2] * a + d[i + 2] * da * (1 - a)) / oa
    d[i + 3] = oa * 255
  }

  pixel(x, y, color, alpha = 1) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.blend((y * this.w + x) * 4, color, alpha)
  }

  gradient(top, bottom, y0 = 0, y1 = this.h) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      const col = mix(top, bottom, (y - y0) / Math.max(1, y1 - y0 - 1))
      for (let x = 0; x < this.w; x++) this.blend((y * this.w + x) * 4, col, 1)
    }
    return this
  }

  rect(x, y, w, h, color, alpha = 1) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y))
    const x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h))
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this.blend((yy * this.w + xx) * 4, color, alpha)
    return this
  }

  circle(cx, cy, r, color, alpha = 1) {
    const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(this.w - 1, Math.ceil(cx + r + 1))
    const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(this.h - 1, Math.ceil(cy + r + 1))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cover = clamp(r - Math.hypot(x - cx, y - cy) + 0.5, 0, 1)
        if (cover > 0) this.blend((y * this.w + x) * 4, color, alpha * cover)
      }
    }
    return this
  }

  ellipse(cx, cy, rx, ry, color, alpha = 1) {
    const x0 = Math.max(0, Math.floor(cx - rx - 1)), x1 = Math.min(this.w - 1, Math.ceil(cx + rx + 1))
    const y0 = Math.max(0, Math.floor(cy - ry - 1)), y1 = Math.min(this.h - 1, Math.ceil(cy + ry + 1))
    const edge = Math.min(rx, ry)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
        const cover = clamp((1 - d) * edge + 0.5, 0, 1)
        if (cover > 0) this.blend((y * this.w + x) * 4, color, alpha * cover)
      }
    }
    return this
  }

  // Resplandor circular que se desvanece hacia afuera.
  glow(cx, cy, r, color, intensity = 1) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.w - 1, Math.ceil(cx + r))
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.h - 1, Math.ceil(cy + r))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const f = 1 - Math.hypot(x - cx, y - cy) / r
        if (f > 0) this.blend((y * this.w + x) * 4, color, f * f * intensity)
      }
    }
    return this
  }

  line(x1, y1, x2, y2, color, thick = 1, alpha = 1) {
    const len = Math.max(1, Math.hypot(x2 - x1, y2 - y1))
    const steps = Math.ceil(len / Math.max(0.5, thick / 3))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (thick <= 1.5) this.pixel(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, color, alpha)
      else this.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, thick / 2, color, alpha)
    }
    return this
  }

  // Relleno de polígono simple (regla par-impar por líneas de escaneo).
  polygon(points, color, alpha = 1) {
    const ys = points.map(p => p[1])
    const yMin = Math.max(0, Math.floor(Math.min(...ys))), yMax = Math.min(this.h - 1, Math.ceil(Math.max(...ys)))
    for (let y = yMin; y <= yMax; y++) {
      const yc = y + 0.5
      const xs = []
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length]
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax))
      }
      xs.sort((a, b) => a - b)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(this.w - 1, Math.round(xs[k + 1]) - 1)
        for (let x = xa; x <= xb; x++) this.blend((y * this.w + x) * 4, color, alpha)
      }
    }
    return this
  }

  star(cx, cy, outer, color, alpha = 1, inner = outer * 0.45, rotation = -Math.PI / 2) {
    const pts = []
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = rotation + (i * Math.PI) / 5
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
    return this.polygon(pts, color, alpha)
  }

  textWidth(str, scale = 1, spacing = 1) {
    const s = normalizeText(str)
    return s.length ? s.length * (5 + spacing) * scale - spacing * scale : 0
  }

  // opts: scale, color, alpha, align ('left' | 'center' | 'right'), shadow (color), spacing, maxChars
  text(str, x, y, opts = {}) {
    const { scale = 2, color = [255, 255, 255], alpha = 1, align = 'left', shadow = null, spacing = 1, maxChars = 60 } = opts
    const s = normalizeText(str).slice(0, maxChars)
    const width = s.length * (5 + spacing) * scale - spacing * scale
    let px = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x)
    const py = Math.round(y)
    const draw = (ox, oy, col, a) => {
      for (let n = 0; n < s.length; n++) {
        const glyph = GLYPHS[s[n]]
        const gx0 = px + n * (5 + spacing) * scale + ox
        for (let gy = 0; gy < 7; gy++) {
          for (let gx = 0; gx < 5; gx++) {
            if (glyph[gy][gx] === '1') this.rect(gx0 + gx * scale, py + oy + gy * scale, scale, scale, col, a)
          }
        }
      }
    }
    if (shadow) draw(Math.max(1, Math.round(scale * 0.6)), Math.max(1, Math.round(scale * 0.6)), shadow, alpha * 0.9)
    draw(0, 0, color, alpha)
    return width
  }

  toPNG() {
    const { w, h } = this
    const raw = Buffer.alloc((w * 4 + 1) * h)
    for (let y = 0; y < h; y++) {
      const offset = y * (w * 4 + 1)
      raw[offset] = 0
      this.data.copy(raw, offset + 1, y * w * 4, (y + 1) * w * 4)
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4)
    header[8] = 8; header[9] = 6
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
      chunk('IEND', Buffer.alloc(0))
    ])
  }
}

// Generador de números pseudoaleatorios con semilla (mismo resultado en cada cuadro).
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

module.exports = { Canvas, normalizeText, mix, hsl, clamp, rng }
