/**
 * Dependency-free PWA icon generator for MarekLifts.
 *
 * Draws a flat dumbbell glyph on the brand blue with 4x supersampling for
 * smooth edges, then writes real PNGs (no binary assets checked in by hand).
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public')

const ACCENT = [37, 99, 235]
const WHITE = [255, 255, 255]

/** Point-in-rounded-rect test in the 0..100 design space. */
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  if (x >= x0 + r && x <= x1 - r) return true
  if (y >= y0 + r && y <= y1 - r) return true
  const R = r * r
  const corners = [
    [x0 + r, y0 + r],
    [x1 - r, y0 + r],
    [x0 + r, y1 - r],
    [x1 - r, y1 - r],
  ]
  for (const [cx, cy] of corners) {
    const dx = x - cx
    const dy = y - cy
    if (dx * dx + dy * dy <= R) return true
  }
  return false
}

/** Everything is expressed in a 0..100 square so icons scale cleanly. */
function dumbbellGlyph(scale) {
  const s = (v) => 50 + (v - 50) * scale
  return {
    bar: [s(14), s(46), s(86), s(54)],
    inner: [
      [s(25), s(33), s(33), s(67)],
      [s(67), s(33), s(75), s(67)],
    ],
    outer: [
      [s(36), s(23), s(46), s(77)],
      [s(54), s(23), s(64), s(77)],
    ],
  }
}

/** Returns [r,g,b,a] for a point in the 0..100 design space. */
function sample(x, y, { maskable, scale }) {
  const radius = maskable ? 0 : 22
  if (!inRoundedRect(x, y, 0, 0, 100, 100, radius)) return [0, 0, 0, 0]
  const g = dumbbellGlyph(scale)
  const boxes = [g.bar, ...g.inner, ...g.outer]
  for (const [x0, y0, x1, y1] of boxes) {
    if (inRoundedRect(x, y, x0, y0, x1, y1, 2.2)) return [...WHITE, 255]
  }
  return [...ACCENT, 255]
}

function renderIcon(size, { maskable = false, scale = 1 } = {}) {
  const SS = 4 // supersample factor
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let py = 0; py < size; py++) {
    const rowStart = py * (size * 4 + 1)
    raw[rowStart] = 0 // filter: none
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 100
          const y = ((py + (sy + 0.5) / SS) / size) * 100
          const [cr, cg, cb, ca] = sample(x, y, { maskable, scale })
          r += cr * ca
          g += cg * ca
          b += cb * ca
          a += ca
        }
      }
      const n = SS * SS
      const idx = rowStart + 1 + px * 4
      if (a === 0) {
        raw[idx] = 0
        raw[idx + 1] = 0
        raw[idx + 2] = 0
        raw[idx + 3] = 0
      } else {
        raw[idx] = Math.round(r / a)
        raw[idx + 1] = Math.round(g / a)
        raw[idx + 2] = Math.round(b / a)
        raw[idx + 3] = Math.round(a / n)
      }
    }
  }
  return encodePng(size, size, raw)
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, raw) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // truecolour with alpha
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#2563eb"/>
  <g fill="#fff">
    <rect x="14" y="46" width="72" height="8" rx="2.2"/>
    <rect x="25" y="33" width="8" height="34" rx="2.2"/>
    <rect x="67" y="33" width="8" height="34" rx="2.2"/>
    <rect x="36" y="23" width="10" height="54" rx="2.2"/>
    <rect x="54" y="23" width="10" height="54" rx="2.2"/>
  </g>
</svg>
`

mkdirSync(join(OUT, 'icons'), { recursive: true })
const files = [
  ['icons/icon-192.png', renderIcon(192, { scale: 1 })],
  ['icons/icon-512.png', renderIcon(512, { scale: 1 })],
  ['icons/icon-maskable-512.png', renderIcon(512, { maskable: true, scale: 0.62 })],
  ['apple-touch-icon.png', renderIcon(180, { scale: 1 })],
]
for (const [name, buf] of files) {
  writeFileSync(join(OUT, name), buf)
  console.log(`wrote public/${name} (${buf.length} bytes)`)
}
writeFileSync(join(OUT, 'favicon.svg'), FAVICON)
console.log('wrote public/favicon.svg')
