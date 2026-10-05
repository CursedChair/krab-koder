// Pure drawing code: turns a pose into pixels, then into terminal cells or an SVG.
// It never calls Claude Code, so plain node can test it.

export const SKIN = 0xdd775b
export const EYE = 0x191919
export const EYE_CLOSED = 0x7a2e1c
export const SWEAT = 0x6ec6ff
export const ALERT = 0xe03c31
export const SPARK = 0xf5d547
export const PENCIL = 0xe7b04a
export const ZZZ = 0xb8c4ff
export const DOT = 0x9aa0a6
export const DUST = 0x8a8f98
export const CREAM = 0xf3efe6
export const BOOK_COVER = 0x9a7b5c
export const SCREEN = 0x3a3a37
export const GREEN = 0x7cc47f
export const CAP = 0x5b63c8
export const BLANKET = 0x6c8fd6
export const BLANKET_STRIPE = 0x4f6fb8
export const PAPER_SPINE = 0xcfc8b8
export const IRON = 0x4a4a47
export const POLE = 0x8b6b4a
export const BELL_PIXEL = 0xc9c6bc
export const RED_DAY = 0xc4553d

export const SPRITE_COLUMNS = 12
export const SPRITE_ROWS = 5
const PIXEL_ROWS = SPRITE_ROWS * 2
const DEFAULT_COLOR = 0x01000000

// Clawd's body sits at x 2..9 and y 2..7; the spare pixels around it hold props.
const LEG_COLUMNS = [2, 4, 7, 9]

function blank() {
  return Array.from({ length: PIXEL_ROWS }, () => Array(SPRITE_COLUMNS).fill(null))
}

function paint(grid, x, y, color) {
  if (y < 0 || y >= PIXEL_ROWS || x < 0 || x >= SPRITE_COLUMNS) return
  grid[y][x] = color
}

const EYE_SPOTS = {
  open: [[3, 3], [8, 3]],
  left: [[2, 3], [7, 3]],
  right: [[4, 3], [9, 3]],
  up: [[3, 2], [8, 2]],
  down: [[3, 4], [8, 4]],
  downLeft: [[2, 4], [7, 4]],
  downRight: [[4, 4], [9, 4]],
}

function paintEyes(grid, eyes, dx, dy) {
  const color = eyes === 'closed' ? EYE_CLOSED : EYE
  for (const [x, y] of EYE_SPOTS[eyes] ?? EYE_SPOTS.open) paint(grid, x + dx, y + dy, color)
}

// hands: [leftTop, rightTop], the top row of each two-pixel hand
function paintHands(grid, hands, dx, dy) {
  const [left, right] = hands
  paint(grid, 1 + dx, left + dy, SKIN)
  paint(grid, 1 + dx, left + 1 + dy, SKIN)
  paint(grid, 10 + dx, right + dy, SKIN)
  paint(grid, 10 + dx, right + 1 + dy, SKIN)
}

// legs: the height in pixels (0, 1 or 2) of each of the four legs
function paintLegs(grid, legs, dx, dy) {
  LEG_COLUMNS.forEach((x, index) => {
    for (let k = 0; k < legs[index]; k++) paint(grid, x + dx, 8 + dy + k, SKIN)
  })
}

function paintProp(grid, prop, tick, pose = {}) {
  const flip = tick % 2 === 0
  switch (prop) {
    case 'sweat':
      paint(grid, 0, 3, SWEAT)
      paint(grid, 0, 4, SWEAT)
      break
    case 'alert':
      paint(grid, 5, 0, ALERT)
      paint(grid, 5, 1, ALERT)
      paint(grid, 6, 0, ALERT)
      paint(grid, 6, 1, ALERT)
      break
    case 'zzz': {
      // Three Zs rise one after another, then start over
      const step = tick % 8
      if (step >= 1) paint(grid, 9, 2, ZZZ)
      if (step >= 3) paint(grid, 10, 1, ZZZ)
      if (step >= 5) paint(grid, 11, 0, ZZZ)
      break
    }
    case 'dots':
      for (let i = 0; i < 3; i++) if (i <= tick % 4) paint(grid, 4 + i * 2, 0, DOT)
      break
    case 'pencil':
      paint(grid, 11, flip ? 4 : 5, PENCIL)
      paint(grid, 11, flip ? 3 : 4, SPARK)
      break
    case 'spark':
      paint(grid, 11, 3, SPARK)
      paint(grid, 11, 5, flip ? SPARK : 0xffffff)
      paint(grid, 0, 5, flip ? 0xffffff : SPARK)
      break
    case 'confetti': {
      // Pieces thrown from the raised hand: out and up, then down. Each starts a little after the last.
      const colours = [0xdd775b, 0xe7b04a, 0x5e8c6a, 0xf3efe6, 0xc4553d, 0x6ec6ff]
      const side = pose.throwSide ?? 1
      const hand = side > 0 ? 10 : 1
      for (let i = 0; i < 9; i++) {
        const age = (tick + i * 3) % 12
        const x = hand + side * Math.round((age * (1 + (i % 3))) / 3.5)
        const y = 2 - Math.round(age * 1.1 - 0.17 * age * age) + (i % 2)
        if (age < 11) paint(grid, x, y, colours[i % colours.length])
      }
      break
    }
    case 'barbell': {
      // The bar across the whole sprite with a plate at each end
      const y = pose.barY ?? 4
      for (let x = 0; x < SPRITE_COLUMNS; x++) paint(grid, x, y, IRON)
      for (const x of [0, 11]) {
        paint(grid, x, y - 1, 0x2f2f2a)
        paint(grid, x, y + 1, 0x2f2f2a)
      }
      break
    }
    case 'flag': {
      // A pole in his right hand and a cloth that ripples above his head
      for (let y = 0; y <= 7; y++) paint(grid, 11, y, POLE)
      const ripple = [0, 1, 1, 0][tick % 4]
      for (let x = 7; x <= 10; x++) {
        paint(grid, x, 0, SKIN)
        paint(grid, x, 1, x === 10 && ripple ? null : CREAM)
      }
      paint(grid, 6 + ripple, 1, CREAM)
      break
    }
    case 'clock': {
      // A round clock held at the belly; red cells fill clockwise as the five hours are used up
      const used = Math.round((Math.min(100, pose.percent ?? 0) / 100) * 8)
      const ring = [[4, 5], [5, 5], [6, 5], [7, 5], [3, 6], [8, 6], [3, 7], [8, 7], [4, 8], [5, 8], [6, 8], [7, 8]]
      for (const [x, y] of ring) paint(grid, x, y, POLE)
      const inside = [[4, 6], [5, 6], [6, 6], [7, 6], [7, 7], [6, 7], [5, 7], [4, 7]]
      inside.forEach(([x, y], i) => paint(grid, x, y, i < used ? RED_DAY : CREAM))
      paint(grid, 5, 4, BELL_PIXEL)
      paint(grid, 6, 4, BELL_PIXEL)
      if (tick % 2 === 0) paint(grid, 5, 7, 0x191919)
      break
    }
    case 'calendar': {
      // A header and six day boxes, filled in as the week is used up
      const used = Math.round((Math.min(100, pose.percent ?? 0) / 100) * 6)
      for (let x = 3; x <= 8; x++) {
        paint(grid, x, 5, RED_DAY)
        paint(grid, x, 6, CREAM)
        paint(grid, x, 7, x - 3 < used ? RED_DAY : PAPER_SPINE)
      }
      break
    }
    case 'book': {
      // An open book held at the belly; a dark pixel reads along the middle line
      for (let x = 3; x <= 8; x++) {
        paint(grid, x, 5, BOOK_COVER)
        paint(grid, x, 6, x === 5 || x === 6 ? PAPER_SPINE : CREAM)
        paint(grid, x, 7, x === 5 || x === 6 ? PAPER_SPINE : CREAM)
      }
      paint(grid, 3 + (Math.floor(tick / 2) % 5), 6, DUST)
      break
    }
    case 'terminal': {
      // A tiny screen: green prompt, a command typed along the row, a green check at the end
      for (let x = 3; x <= 8; x++) for (let y = 5; y <= 7; y++) paint(grid, x, y, SCREEN)
      paint(grid, 3, 6, GREEN)
      const typed = tick % 10
      for (let x = 4; x < 4 + Math.min(typed, 4); x++) paint(grid, x, 6, 0xd9d9d4)
      if (typed >= 6) paint(grid, 4, 7, DUST)
      if (typed >= 8) paint(grid, 8, 7, GREEN)
      break
    }
    case 'sleepwear': {
      // Nightcap on his head and a striped blanket over his lap
      for (let x = 3; x <= 8; x++) paint(grid, x, 3, CREAM)
      for (let x = 4; x <= 7; x++) paint(grid, x, 2, CAP)
      paint(grid, 5, 1, CAP)
      paint(grid, 6, 1, CAP)
      paint(grid, 9, 2, CREAM)
      for (let x = 1; x <= 10; x++) {
        const color = x % 2 === 0 ? BLANKET : BLANKET_STRIPE
        paint(grid, x, 7, color)
        paint(grid, x, 8, color)
        paint(grid, x, 9, color)
      }
      break
    }
    case 'wake':
      paint(grid, 0, 1, flip ? SPARK : 0xffffff)
      paint(grid, 11, 1, flip ? 0xffffff : SPARK)
      break
    default:
      break
  }
}

function paintDust(grid, dust, tick) {
  if (dust === 0) return
  const x = dust < 0 ? 0 : 11
  paint(grid, x, tick % 2 === 0 ? 9 : 8, DUST)
}

// pose: { eyes, hands: [l, r], legs: [h0..h3], prop, tick, dx, dy, dust }
export function pixelsFor(pose) {
  const dx = pose.dx ?? 0
  const dy = pose.dy ?? 0
  const grid = blank()
  for (let y = 2; y <= 7; y++) for (let x = 2; x <= 9; x++) paint(grid, x + dx, y + dy, SKIN)
  paintEyes(grid, pose.eyes, dx, dy)
  paintHands(grid, pose.hands, dx, dy)
  paintLegs(grid, pose.legs, dx, dy)
  for (const prop of [].concat(pose.prop ?? [])) paintProp(grid, prop, pose.tick ?? 0, pose)
  paintDust(grid, pose.dust ?? 0, pose.tick ?? 0)
  return grid
}

// Two pixel rows share one terminal row, using the upper and lower half blocks.
function cellFor(top, bottom) {
  if (top === null && bottom === null) return [' '.codePointAt(0), DEFAULT_COLOR, DEFAULT_COLOR]
  if (top !== null && bottom === null) return ['▀'.codePointAt(0), top, DEFAULT_COLOR]
  if (top === null) return ['▄'.codePointAt(0), bottom, DEFAULT_COLOR]
  if (top === bottom) return ['█'.codePointAt(0), top, DEFAULT_COLOR]
  return ['▀'.codePointAt(0), top, bottom]
}

// Returns the numbers a terminal Raster packs: columns * SPRITE_ROWS triplets.
export function cellNumbers(pixels, columns, offset) {
  const numbers = []
  for (let row = 0; row < SPRITE_ROWS; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col - offset
      const inside = x >= 0 && x < SPRITE_COLUMNS
      const top = inside ? pixels[row * 2][x] : null
      const bottom = inside ? pixels[row * 2 + 1][x] : null
      numbers.push(...cellFor(top, bottom))
    }
  }
  return numbers
}

export function packCells(numbers) {
  const bytes = new Uint8Array(Uint32Array.from(numbers).buffer)
  // Claude Code's runtime has toBase64; older node builds only have Buffer
  if (typeof bytes.toBase64 === 'function') return bytes.toBase64()
  return globalThis.Buffer.from(bytes).toString('base64')
}

const SVG_COLUMN_PX = 8
const SVG_PIXEL_PX = 6

function hex(color) {
  return '#' + color.toString(16).padStart(6, '0')
}

// The desktop app has no Raster, so it draws the same pixels as SVG squares.
export function svgFor(pixels, columns, offset) {
  const width = columns * SVG_COLUMN_PX
  const height = PIXEL_ROWS * SVG_PIXEL_PX
  const left = offset * SVG_COLUMN_PX
  const rects = []
  pixels.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color === null) return
      rects.push(
        `<rect x="${left + x * SVG_PIXEL_PX}" y="${y * SVG_PIXEL_PX}" width="${SVG_PIXEL_PX}" height="${SVG_PIXEL_PX}" fill="${hex(color)}"/>`,
      )
    })
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">` +
    rects.join('') +
    '</svg>'
  )
}
