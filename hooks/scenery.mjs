// Background effects for the strip: falling leaves, snow, flowers, sun and clouds, bats, fireworks and so on.
// They are drawn behind Clawd across the whole strip, in screen pixels, and never stuck to him.
// Pure drawing code. Positions come from a seeded generator, so a scene looks the same every time it is drawn.

const px = (value) => +value.toFixed(2)

function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

import { digitsSvg } from './pixelfont.mjs'

const r = (x, y, w, h, fill, extra = '') => `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${fill}"${extra}/>`
const between = (rand, low, high) => low + rand() * (high - low)
const pick = (rand, list) => list[Math.floor(rand() * list.length)]

// A group that moves along a path forever. points: [[x, y], ...] spread evenly over `dur` seconds, starting `offset` seconds in
function drift(inner, points, dur, offset) {
  const values = points.map(([x, y]) => `${px(x)} ${px(y)}`).join(';')
  return `<g>${inner}<animateTransform attributeName="transform" type="translate" dur="${px(dur)}s" begin="-${px(offset)}s" repeatCount="indefinite" values="${values}"/></g>`
}
const fade = (inner, values, dur, offset) => `<g>${inner}<animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(offset)}s" repeatCount="indefinite" values="${values}"/></g>`

// Leaves turn over as they fall: a slow swing around their middle
function tumble(inner, spin, rand, wind = 0) {
  if (!spin) return inner
  const dur = between(rand, 2.4, 4) / (1 + wind * 0.2)
  const a = Math.round(between(rand, 25, 55))
  return `<g>${inner}<animateTransform attributeName="transform" type="rotate" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="${-a} 5 5;${a} 5 5;${-a} 5 5"/></g>`
}

// In wind a falling thing is swept across the strip in a fluttering flight: far sideways, bobbing, and only slowly down
function flight(x, floor, wind, rand) {
  const top = between(rand, -4, floor * 0.35)
  const bob = between(rand, 5, 11)
  const run = wind * 55
  return [[x, top], [x + run, top + floor * 0.12 + bob], [x + run * 2, top + floor * 0.2 - bob], [x + run * 3, Math.min(floor + 4, top + floor * 0.55 + bob)]]
}

// Where something falling at x comes to rest
function floorAt(area, x) {
  if (x >= area.groundFrom) return area.ground
  const perch = (area.perches ?? []).find((p) => x >= p.x + 4 && x <= p.x + p.w - 4)
  return perch ? perch.y : area.bottom
}

// ---- falling things: leaves, snow, shamrocks, petals ----
function falling(rand, area, count, make, speed = [6, 10], sway = 14, size = 1, spin = false) {
  const { to, height, groundFrom } = area
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, 0, to)
    // Over a pill they land on its top; between pills they fall to the bottom edge; elsewhere to the ground
    const floor = floorAt(area, x)
    const wind = area.wind ?? 0
    // In wind things fall faster and are blown a long way across
    const dur = between(rand, speed[0], speed[1]) * (wind ? 1.15 : 1)
    const offset = rand() * dur
    const s = between(rand, 0.6, 1) * sway
    out.push(
      fade(
        drift(tumble(size === 1 ? make(rand, i) : `<g transform="scale(${size})">${make(rand, i)}</g>`, spin, rand, area.wind ?? 0), wind ? flight(x, floor, wind, rand) : [[x, -8], [x + s, floor * 0.35], [x - s, floor * 0.7], [x + s * 0.5, floor + 4]], dur, offset),
        '0;1;1;0',
        dur,
        offset,
      ),
    )
  }
  return out.join('')
}

// A leaf: a slanted oval with a darker vein down the middle and a stem, so it reads as a leaf and not a flower
const leafShape = (colour) => (rand) => {
  const fill = typeof colour === 'string' ? colour : pick(rand, colour)
  const vein = '#7A3F12'
  return (
    r(4, 0, 3, 1, fill) + r(2, 1, 6, 1, fill) + r(1, 2, 8, 2, fill) + r(1, 4, 7, 2, fill) + r(2, 6, 5, 1, fill) + r(3, 7, 3, 1, fill) +
    r(1, 6, 7, 1, vein, ' fill-opacity=".55"') + r(2, 5, 1, 1, vein, ' fill-opacity=".55"') + r(4, 3, 1, 3, vein, ' fill-opacity=".55"') + r(0, 8, 2, 1, '#6B4F3A') + r(1, 7, 1, 1, '#6B4F3A')
  )
}
// A maple leaf drawn on a small grid (11 wide), pointed lobes and a stem, so it reads as the leaf on the flag
const MAPLE_ROWS = [
  '.....X.....',
  '....XXX....',
  '..X.XXX.X..',
  '..XXXXXXX..',
  '.XXXXXXXXX.',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..XXXXXXX..',
  '...XXXXX...',
  '.....X.....',
  '.....X.....',
]
const mapleShape = (colour = '#D6252B') => () =>
  MAPLE_ROWS.map((row, y) => [...row.matchAll(/X+/g)].map((run) => r(run.index, y, run[0].length, 1, y >= 9 ? '#6B4F3A' : colour)).join('')).join('')
const AUTUMN = ['#D9822B', '#C8372D', '#E8B93C', '#A8571F']
const GREENS = ['#4CAF50', '#2E7D3A', '#6CC070', '#8FD99A']
const snowflake = (rand) => {
  const size = pick(rand, [3, 3, 4])
  return r(0, 0, size, size, '#F7F5F0', ' fill-opacity=".9"')
}
const shamrockShape = () => r(2, 0, 3, 3, '#2E9E55') + r(0, 3, 3, 3, '#2E9E55') + r(4, 3, 3, 3, '#2E9E55') + r(2, 5, 3, 3, '#2E9E55') + r(3, 7, 1, 4, '#1E7A3C')
const petalShape = () => r(0, 0, 5, 5, '#C8372D') + r(2, 2, 1, 1, '#1B1B1B')

// ---- leaves, snow and petals piling up, a little at a time: on the ground, on top of each pill, and under the pills ----
const MOUNDS = {
  snow: (rand) => snowMound(rand),
  leaves: (rand) => leafMound(rand, AUTUMN),
  maple: (rand) => leafMound(rand, ['#D6252B', '#B81F25', '#E8554F']),
  poppies: (rand) => r(-7, -3, 5, 3, '#C8372D') + r(-2, -5, 5, 4, '#C8372D') + r(3, -3, 5, 3, '#C8372D') + r(-1, -3, 1, 1, '#1B1B1B') + r(-5, -2, 1, 1, '#1B1B1B') + r(5, -2, 1, 1, '#1B1B1B'),
}
// A snow drift of its own size: anywhere from a low, long smear to a tall, short heap, built in tapering layers
function snowMound(rand) {
  const width = between(rand, 10, 44)
  const height = between(rand, 3, 11)
  const layers = Math.max(2, Math.round(height / 2))
  let out = r(-width / 2, -1, width, 1, '#C9D6E6')
  for (let i = 0; i < layers; i++) {
    const w = Math.max(4, width * (1 - i / (layers + 0.6)))
    out += r(-w / 2 + (i % 2) * 1.5, -2 - i * 2, w, 2, '#F7F5F0')
  }
  return out
}

const leafMound = (rand, colours) =>
  r(-7, -3, 7, 3, pick(rand, colours)) + r(-1, -5, 7, 4, pick(rand, colours)) + r(4, -3, 6, 3, pick(rand, colours)) + r(-4, -2, 5, 2, pick(rand, colours)) + r(2, -2, 5, 2, pick(rand, colours))

// A bit of the pile lifts off and is carried away on the wind
const BITS = { snow: () => snowflake, leaves: () => leafShape(AUTUMN), maple: () => mapleShape(), poppies: () => petalShape }
function blownBit(rand, kind, x, y, wind) {
  const dur = between(rand, 5, 8)
  const offset = rand() * dur
  const bit = `<g transform="scale(${kind === 'snow' ? 1 : 1.3})">${BITS[kind]()(rand)}</g>`
  return fade(drift(tumble(bit, kind !== 'snow', rand), [[x, y - 2], [x + wind * 40, y - 16], [x + wind * 85, y - 6], [x + wind * 135, y - 22]], dur, offset), '0;1;1;0', dur, offset)
}

function pile(rand, area, kind) {
  const { groundFrom: from, to, ground, perches = [], bottom, pillsEnd = 0 } = area
  const make = MOUNDS[kind]
  const spots = []
  // On the ground to the right of the pills
  const count = Math.max(4, Math.round((to - from) / 24))
  for (let i = 0; i < count; i++) spots.push([from + ((i + 0.5) / count) * (to - from) + between(rand, -5, 5), ground])
  // On top of each pill, away from its rounded ends
  for (const perch of perches) {
    const n = Math.max(1, Math.round((perch.w - 16) / 34))
    for (let i = 0; i < n; i++) spots.push([perch.x + 8 + ((i + 0.5) / n) * (perch.w - 16) + between(rand, -3, 3), perch.y])
  }
  // Under the pills, along the bottom edge
  if (pillsEnd > 20) {
    const under = Math.max(2, Math.round(pillsEnd / 30))
    for (let i = 0; i < under; i++) spots.push([((i + 0.5) / under) * pillsEnd + between(rand, -4, 4), bottom])
  }
  const blownBits = (area.wind ?? 0) > 0 ? spots.filter((_, i) => i % 2 === 0).map(([x, y]) => blownBit(rand, kind, x, y, area.wind)).join('') : ''
  return blownBits + spots
    .map(([x, y]) => {
      const dur = between(rand, 26, 40)
      // It grows slowly, stays a while, then settles away and starts again
      return `<g transform="translate(${px(x)} ${px(y)})"><g>${make(rand)}` +
        `<animateTransform attributeName="transform" type="scale" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" keyTimes="0;.75;.93;1" values="1 0;1 1;1 1;1 0"/></g></g>`
    })
    .join('')
}

// A petal torn off a flower and carried away
function blownPetal(rand, colour, x, y, wind) {
  const dur = between(rand, 4, 6.5)
  const offset = rand() * dur
  return fade(drift(tumble(r(0, 0, 3, 2, colour), true, rand), [[x, y], [x + wind * 30, y - 10], [x + wind * 62, y + 2], [x + wind * 95, y - 8]], dur, offset), '0;1;1;0', dur, offset)
}

// ---- flowers growing from the ground ----
function flowers(rand, area, count) {
  const { groundFrom: from, to, ground } = area
  const colours = ['#F4A6B8', '#F2C94C', '#B58CE0', '#F7F5F0', '#8FC7F2']
  const out = []
  for (let i = 0; i < count; i++) {
    const x = from + ((i + 0.5) / count) * (to - from) + between(rand, -6, 6)
    const tall = between(rand, 9, 17)
    const colour = pick(rand, colours)
    // The stem rises first, with a small overshoot, then the head pops open on top of it; each flower waits its own turn
    const D = 4
    const start = between(rand, 0.1, 1.2) / D
    const top = start + 1.2 / D
    const stalk = r(-1, -tall, 2, tall, '#2E9E55') + r(1, -tall * 0.5, 4, 2, '#2E9E55')
    const head = r(-3, -3, 6, 2, colour) + r(-3, 1, 6, 2, colour) + r(-5, -1, 2, 4, colour) + r(3, -1, 2, 4, colour) + r(-1, -1, 2, 2, '#F2C94C')
    // `age` is how long this day's flowers have already been growing, so a redraw never makes a standing flower grow again
    const grow = (times, values, splines) =>
      `<animateTransform attributeName="transform" type="scale" dur="${D}s" begin="-${px(area.age ?? 0)}s" repeatCount="1" fill="freeze" calcMode="spline" keyTimes="${times.map(px).join(';')}" keySplines="${splines}" values="${values}"/>`
    const bloom =
      `<g>${stalk}${grow([0, start, top, top + 0.08, top + 0.14, 1], '1 0;1 0;1 1.1;1 .96;1 1;1 1', '0 0 1 1;.2 .7 .3 1;.4 0 .6 1;.4 0 .6 1;0 0 1 1')}</g>` +
      `<g transform="translate(0 ${-tall})"><g>${head}${grow([0, top, top + 0.1, top + 0.17, 1], '0 0;0 0;1.35 1.35;.92 .92;1 1', '0 0 1 1;.2 .8 .3 1;.4 0 .6 1;.4 0 .6 1')}</g></g>`
    const wind = area.wind ?? 0
    // Still air: a slow nod. In wind: leaning hard downwind, snapping back and fluttering, shedding petals.
    const lean = wind ? Math.round(10 + wind * 8) : 3
    const sway = wind
      ? `<animateTransform attributeName="transform" type="rotate" dur="${px(between(rand, 2.6, 3.8))}s" begin="-${px(rand() * 3)}s" repeatCount="indefinite" values="${lean * 0.5} 0 0;${lean} 0 0;${lean * 0.65} 0 0;${lean} 0 0;${lean * 0.5} 0 0"/>`
      : `<animateTransform attributeName="transform" type="rotate" dur="${px(between(rand, 4, 6))}s" begin="-${px(rand() * 4)}s" repeatCount="indefinite" values="-${lean} 0 0;${lean} 0 0;-${lean} 0 0"/>`
    const petal = wind ? blownPetal(rand, colour, x, ground - tall - 2, wind) : ''
    out.push(
      petal +
        `<g transform="translate(${px(x)} ${px(ground)})"><g>${bloom}${sway}</g></g>`,
    )
  }
  return out.join('')
}

// ---- a Christmas tree with twinkling lights and a star, standing on the ground at the right ----
const twinkle = (inner, dur, begin) =>
  `<g>${inner}<animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(begin)}s" repeatCount="indefinite" values="1;.25;1"/></g>`
function christmasTree(rand, area) {
  const { to, ground } = area
  const scale = Math.min(1.5, Math.max(0.8, (ground + 2) / 33))
  const greens = ['#1F6B3F', '#2E8A52']
  const tier = (w, y, h, i) => r(-w / 2, y - h, w, h, greens[0]) + r(-w / 2, y - h, w, 2, greens[1]) + r(-w / 2 + 2, y - h + 2, 2, h - 3, greens[1])
  const lights = [[-6, -8, '#F2C94C'], [5, -9, '#E5484D'], [-3, -15, '#6FC8F2'], [4, -16, '#F2C94C'], [0, -21, '#E5484D'], [-7, -5, '#6FC8F2'], [2, -12, '#F7F5F0'], [-1, -25, '#F2C94C']]
    .map(([x, y, c], i) => twinkle(r(x - 1, y - 1, 2, 2, c), between(rand, 1.2, 2.4), rand() * 2))
    .join('')
  const star = twinkle(r(-1.5, -33, 3, 3, '#F2C94C') + r(-0.5, -34.5, 1, 6, '#FFE27A') + r(-3, -32, 6, 1, '#FFE27A'), 1.8, 0)
  return `<g transform="translate(${px(to - 18)} ${px(ground)}) scale(${px(scale)})">` +
    r(-2, -3, 4, 3, '#6B4423') + tier(20, -3, 8, 0) + tier(15, -10, 8, 1) + tier(11, -17, 7, 2) + tier(7, -23, 6, 3) + lights + star + `</g>`
}

// ---- wrapped presents with ribbons and bows, a few under the tree and a few along the ground ----
function presents(rand, area, count) {
  const { groundFrom: from, to, ground } = area
  const papers = [['#D8283A', '#F7F5F0'], ['#2E8A52', '#F2C94C'], ['#3C6FD1', '#F7F5F0'], ['#F2C94C', '#D8283A'], ['#8E4BC4', '#F7F5F0']]
  const box = (x, w, h, [paper, ribbon]) =>
    `<g transform="translate(${px(x)} ${px(ground)})">` +
    r(0, -h, w, h, paper) + r(0, -h, w, 1.5, ribbon === '#F7F5F0' ? '#FFFFFF' : ribbon, ' fill-opacity=".35"') +
    r(w / 2 - 1, -h, 2, h, ribbon) + r(0, -h / 2 - 1, w, 2, ribbon) +
    r(w / 2 - 3, -h - 2, 3, 2, ribbon) + r(w / 2, -h - 2, 3, 2, ribbon) + r(w / 2 - 1, -h - 1, 2, 1, ribbon) + `</g>`
  const out = []
  // A little pile beside the tree
  const treeX = to - 18
  for (const [dx, w, h] of [[-30, 12, 11], [-16, 9, 8], [14, 11, 9]]) out.push(box(treeX + dx, w, h, pick(rand, papers)))
  // And a few spread along the ground to the left of it
  const room = treeX - 34 - from
  const n = Math.max(0, Math.min(count, Math.floor(room / 46)))
  for (let i = 0; i < n; i++) {
    const w = between(rand, 9, 13)
    out.push(box(from + ((i + 0.5) / n) * room + between(rand, -6, 6), w, between(rand, 8, 12), pick(rand, papers)))
  }
  return out.join('')
}

// ---- a green slime ghost floating by, bobbing and drooling ----
function slimer(rand, area) {
  const { from, to } = area
  const body = r(2, 0, 10, 2, '#7DDB5A') + r(0, 2, 14, 8, '#7DDB5A') + r(2, 10, 3, 3, '#7DDB5A') + r(8, 10, 4, 4, '#7DDB5A') + r(11, 2, 3, 8, '#4FAE3A') +
    r(3, 3, 3, 3, '#F7F5F0') + r(8, 3, 3, 3, '#F7F5F0') + r(4, 4, 1.5, 2, '#14121C') + r(9, 4, 1.5, 2, '#14121C') + r(3, 7, 8, 3, '#2B4A22') + r(6, 9, 3, 3, '#E86A8A') +
    r(-2, 5, 3, 2, '#7DDB5A') + r(13, 5, 3, 2, '#7DDB5A')
  const y = Math.max(2, Math.min(area.height * 0.25, 14))
  const start = to - 26
  const dur = between(rand, 16, 22)
  return drift(drift(body, [[0, 0], [0, -4], [0, 0], [0, 3], [0, 0]], 2.6, 0), [[start, y], [(start + from) / 2, y + 4], [from + 8, y], [(start + from) / 2, y - 3], [start, y]], dur, 0)
}

// ---- painted eggs resting in the grass ----
function eggs(rand, area, count) {
  const { groundFrom: from, to, ground } = area
  const palette = [['#F4A6B8', '#F7F5F0'], ['#8FC7F2', '#F2C94C'], ['#B7E08A', '#F7F5F0'], ['#F2C94C', '#C8372D']]
  const out = []
  for (let i = 0; i < count; i++) {
    const x = from + ((i + 0.3 + rand() * 0.4) / count) * (to - from)
    const [base, stripe] = pick(rand, palette)
    const egg = r(2, -9, 5, 2, base) + r(0, -7, 9, 5, base) + r(2, -2, 5, 2, base) + r(0, -5, 9, 1, stripe)
    out.push(`<g transform="translate(${px(x)} ${px(ground)})">${egg}</g>`)
  }
  return out.join('')
}

// ---- sun in the corner and clouds drifting by ----
function sun(area) {
  const x = area.to - 30
  const rays = [[-8, 6], [24, 6], [8, -8], [8, 24], [-3, -3], [21, -3], [-3, 15], [21, 15]].map(([dx, dy]) => r(dx, dy, 3, 3, '#F2C94C')).join('')
  return `<g transform="translate(${px(x)} 10) scale(1.3)">` +
    `<g>${r(0, 0, 16, 16, '#F2C94C') + r(3, 3, 10, 10, '#F7DC6F') + rays}` +
    `<animateTransform attributeName="transform" type="rotate" dur="40s" repeatCount="indefinite" values="0 8 8;360 8 8"/></g></g>`
}
function clouds(rand, area) {
  const out = []
  for (let i = 0; i < 3; i++) {
    const y = between(rand, 4, Math.max(6, area.height * 0.4))
    const dur = between(rand, 50, 80)
    const cloud = r(6, 0, 18, 5, '#F2F2EE') + r(0, 4, 32, 6, '#F2F2EE') + r(8, 9, 20, 3, '#DADAD4') + r(12, -3, 8, 4, '#F2F2EE')
    out.push(drift(`<g transform="scale(1.25)">${cloud}</g>`, [[area.from - 40, y], [area.to + 10, y]], dur, rand() * dur))
  }
  return out.join('')
}

// ---- grey clouds, for rain and storms. Dark storm clouds carry a lightning bolt that strikes from underneath them. ----
const FLASH_TIMES = '0;.60;.62;.66;.68;.74;1'
const FLASH_OPACITY = '0;0;1;.25;1;0;0'

// A jagged bolt from the cloud's underside down to the given length, with a fork part-way
function bolt(rand, length) {
  const core = '#FFF8C4'
  const glow = '#FFE066'
  let x = 0
  let y = 0
  let core_ = ''
  let glow_ = ''
  let fork = ''
  let step = 0
  while (y < length) {
    const run = Math.min(between(rand, 5, 8), length - y)
    core_ += r(x, y, 3, run + 1, core)
    glow_ += r(x - 1.5, y, 6, run + 1, glow)
    if (step === 2) fork = r(x + 3, y + run * 0.5, 6, 2, core) + r(x + 8, y + run * 0.5 + 2, 3, 6, core)
    x += (step % 2 === 0 ? -1 : 1) * between(rand, 2, 4)
    y += run
    step++
  }
  return `<g opacity=".55">${glow_}</g>${core_}${fork}`
}

function stormClouds(rand, area, dark) {
  const fill = dark ? '#4B5260' : '#8D96A3'
  const shade = dark ? '#3A404B' : '#6F7885'
  const out = []
  const flashes = []
  for (let i = 0; i < (dark ? 3 : 4); i++) {
    const y = between(rand, 2, Math.max(4, area.height * 0.2))
    const dur = between(rand, 40, 70)
    const offset = rand() * dur
    const cloud = r(6, 0, 20, 6, fill) + r(0, 5, 36, 7, fill) + r(8, 11, 22, 3, shade) + r(14, -3, 9, 4, fill)
    let strike = ''
    if (dark) {
      const flashDur = between(rand, 4, 7)
      const flashOffset = rand() * flashDur
      const length = Math.max(12, area.bottom - (y + 20))
      // The bolt rides along under its cloud and flashes on and off, a double flash each time
      strike =
        `<g transform="translate(24 19)"><g>${bolt(rand, length)}<animate attributeName="opacity" dur="${px(flashDur)}s" begin="-${px(flashOffset)}s" repeatCount="indefinite" keyTimes="${FLASH_TIMES}" values="${FLASH_OPACITY}"/></g></g>`
      flashes.push(
        `<rect x="0" y="0" width="${px(area.to + 4)}" height="${px(area.bottom + 1)}" fill="#FFF3A8" opacity="0"><animate attributeName="opacity" dur="${px(flashDur)}s" begin="-${px(flashOffset)}s" repeatCount="indefinite" keyTimes="${FLASH_TIMES}" values="0;0;.14;.04;.12;0;0"/></rect>`,
      )
    }
    out.push(drift(`<g transform="scale(1.4)">${cloud}</g>${strike}`, [[area.from - 60, y], [area.to + 10, y]], dur, offset))
  }
  return out.join('') + flashes.join('')
}

// ---- rain: quick slanted drops that land on the pills, the ground and the bottom edge ----
function rain(rand, area, count) {
  const out = []
  const slant = 4 + (area.wind ?? 0) * 12
  for (let i = 0; i < count; i++) {
    const x = between(rand, 0, area.to)
    const floor = floorAt(area, x)
    const dur = between(rand, 0.55, 0.95)
    const offset = rand() * dur
    out.push(
      fade(drift(r(0, 0, 1.5, 5, '#8FB4E3'), [[x, 2], [x - slant, floor]], dur, offset), '0;1;1;0', dur, offset),
    )
  }
  return out.join('')
}

// Wind has no drawn marks: it shows in what it moves (falling leaves, snow and petals, blown bits lifting off the piles, leaning flowers).

// ---- hearts floating up, swaying, in pinks and reds ----
const HEART_GRID = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
const heartShape = (rand) => {
  const fill = pick(rand, ['#F58CAB', '#E0334F', '#FFB3C6', '#E8607F'])
  return HEART_GRID.map((row, y) => [...row.matchAll(/X+/g)].map((run) => r(run.index, y, run[0].length, 1, fill)).join('')).join('')
}
function hearts(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, 0, area.to)
    const size = between(rand, 0.8, 1.5)
    const dur = between(rand, 7, 12)
    const offset = rand() * dur
    const sway = between(rand, 6, 12)
    out.push(
      fade(
        drift(`<g transform="scale(${px(size)})">${heartShape(rand)}</g>`, [[x, area.bottom], [x + sway, area.bottom * 0.65], [x - sway, area.bottom * 0.3], [x + sway * 0.5, -6]], dur, offset),
        '0;.9;.9;0',
        dur,
        offset,
      ),
    )
  }
  return out.join('')
}

// ---- The cordillera (the Andes) as seen from central Chile: layered, jagged ridges fading into the haze, the nearest ones
// darker, with snow on the high peaks and one great snow-covered massif, dry golden foothills at the base. Drawn as pixel columns. ----
function ridge(area, { base, amp, wavesA, wavesB, phase, fill, opacity, snowAbove, snowFill = '#EEF2F8' }) {
  const step = 3
  let out = ''
  for (let x = 0; x < area.to; x += step) {
    const t = x / area.to
    // jagged: two sets of sharp, folded waves
    const h = amp * (0.62 * Math.abs(Math.sin(t * wavesA * Math.PI + phase)) ** 0.8 + 0.38 * Math.abs(Math.sin(t * wavesB * Math.PI + phase * 1.7)) ** 1.1)
    const total = base + h
    const y = area.ground - 6 - total
    out += r(x, y, step, total + 2, fill, ` fill-opacity="${opacity}"`)
    // snow on the parts that rise above the snow line, a little deeper on the lit left sides
    if (snowAbove !== undefined && h > snowAbove) out += r(x, y, step, Math.min(h - snowAbove, 7) + 1, snowFill, ` fill-opacity="${Math.min(1, opacity + 0.25)}"`)
  }
  return out
}
function cordillera(rand, area) {
  const top = area.ground * 0.8
  const far = ridge(area, { base: 6, amp: top * 0.55, wavesA: 5.2, wavesB: 11, phase: 0.4, fill: '#B7BFD6', opacity: 0.4 })
  const mid = ridge(area, { base: 4, amp: top * 0.72, wavesA: 3.6, wavesB: 8.5, phase: 1.9, fill: '#8591AD', opacity: 0.55, snowAbove: top * 0.42 })
  // the great massif: one tall broad snow-covered peak with a lit left face
  let massif = ''
  const centre = area.to * 0.66
  const half = area.to * 0.14
  for (let x = Math.max(0, centre - half); x < Math.min(area.to, centre + half); x += 3) {
    // never below 0: on a narrow strip the loop starts at the left edge, beyond the peak's foot
    const k = Math.max(0, 1 - Math.abs(x - centre) / half)
    const h = top * (0.35 + 0.65 * k ** 0.9) * (0.92 + 0.08 * Math.sin(x * 0.5))
    const y = area.ground - 6 - h
    const lit = x < centre
    massif += r(x, y, 3, h + 2, lit ? '#7C88A6' : '#5E6985', ' fill-opacity=".68"') + r(x, y, 3, Math.min(h * 0.45, 20), lit ? '#F4F7FB' : '#D5DCE8', ' fill-opacity=".9"')
  }
  const near = ridge(area, { base: 3, amp: top * 0.42, wavesA: 4.4, wavesB: 13, phase: 3.1, fill: '#5A6682', opacity: 0.6, snowAbove: top * 0.3 })
  // dry golden-brown foothills along the bottom
  let foothills = ''
  for (let x = 0; x < area.to; x += 3) foothills += r(x, area.ground - 9 - 2.5 * Math.sin(x / 34) - 1.5 * Math.sin(x / 11), 3, 12, '#9C8355', ' fill-opacity=".5"')
  return far + mid + massif + near + foothills
}

// ---- graduation: confetti falling, and mortarboards tossed into the air ----
const confettiBit = (rand) => {
  const fill = pick(rand, ['#E8B93C', '#9B1B30', '#F7F5F0', '#2F5FA8', '#2E9E55'])
  return r(0, 0, 3, 2, fill) + r(1, 2, 1, 2, fill)
}
function cap() {
  const tassel = r(12, 2, 1.2, 5, '#E8B93C') + r(11.2, 7, 3, 3, '#E8B93C')
  return r(0, 2, 13, 3, '#15181F') + r(3, 5, 7, 3, '#15181F') + r(6, 1, 2, 1.4, '#E8B93C') + tassel
}
function caps(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, area.to * 0.1, area.to * 0.9)
    const dur = between(rand, 3.6, 5.2)
    const offset = rand() * dur
    const lift = Math.max(20, area.bottom * 0.75)
    const spin = `<animateTransform attributeName="transform" type="rotate" dur="${px(dur)}s" begin="-${px(offset)}s" repeatCount="indefinite" values="0 6 4;200 6 4;360 6 4"/>`
    out.push(
      fade(drift(`<g transform="scale(1.3)"><g>${cap()}${spin}</g></g>`, [[x, area.bottom], [x + 10, area.bottom - lift], [x + 22, area.bottom - lift * 0.55], [x + 30, area.bottom + 4]], dur, offset), '0;1;1;0', dur, offset),
    )
  }
  return out.join('')
}

// ---- Chinese New Year: red lanterns swaying from above ----
function lanterns(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, area.to * 0.05, area.to * 0.95)
    const cord = between(rand, 2, 9)
    const sway = `<animateTransform attributeName="transform" type="rotate" dur="${px(between(rand, 2.6, 3.8))}s" begin="-${px(rand() * 3)}s" repeatCount="indefinite" values="-5 6 0;5 6 0;-5 6 0"/>`
    const body = r(5.5, 0, 1, cord, '#6B4F3A') + r(2, cord, 8, 1.6, '#F2C230') + r(0, cord + 1.6, 12, 9, '#C8102E') + r(2, cord + 3, 8, 6, '#E23A4E') + r(5.4, cord + 1.6, 1.2, 9, '#F2C230') + r(2, cord + 10.6, 8, 1.6, '#F2C230') + r(5.4, cord + 12.2, 1.2, 4, '#F2C230')
    out.push(`<g transform="translate(${px(x)} 0)"><g>${body}${sway}</g></g>`)
  }
  return out.join('')
}

// ---- the sky of the hour: a moon and twinkling stars at night, the sun rising or setting on the horizon ----
// How far through its cycle the moon is on a date: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter
// (counted from a known new moon, January 6, 2000 at 18:14 UTC, in average lunar months; within about a day)
const SYNODIC_DAYS = 29.530588853
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
export function moonPhase(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000
  return (((days / SYNODIC_DAYS) % 1) + 1) % 1
}

// The moon as it really looks tonight, row by row in chunky pixels: the lit part grows from the right as it waxes and
// shrinks to the left as it wanes, with the dark part faintly showing. A blood moon, supermoon or Harvest Moon is full.
function moon(area, palette = null, scale = 1) {
  const colours = palette ?? { body: '#F5F0D6', rim: '#E3DFC4', crater: '#D6D1B3' }
  const real = moonPhase(new Date(Date.now()))
  // A blood moon, supermoon or Harvest Moon only happens at full moon: on its real night it shows its real phase
  // (nearly full, a sliver either side); tried out on another night with /krab sky it shows full
  const phase = palette && Math.abs(real - 0.5) > 0.12 ? 0.5 : real
  const R = 8
  const cell = 2 * scale
  const k = Math.cos(phase * 2 * Math.PI)
  const waxing = phase < 0.5
  const rows = []
  for (let i = 0; i < R * 2; i++) {
    const y = i + 0.5 - R
    const half = Math.sqrt(Math.max(0, R * R - y * y))
    // the dark disc behind, so the whole moon's outline shows faintly
    rows.push(r((R - half) * cell, i * cell, half * 2 * cell, cell, '#5A6078', ' fill-opacity=".35"'))
    const [from, to] = waxing ? [k * half, half] : [-half, -k * half]
    if (to > from + 0.2) rows.push(r((from + R) * cell, i * cell, (to - from) * cell, cell, i < 3 || i > 12 ? colours.rim : colours.body))
  }
  // craters only show where the moon is lit
  const lit = (x) => (waxing ? x > R + k * R * 0.8 : x < R - k * R * 0.8)
  const crater = [[5, 6], [10, 9.5], [7, 11]].filter(([x]) => lit(x)).map(([x, y]) => r(x * cell, y * cell, 2 * scale, 2 * scale, colours.crater)).join('')
  return `<g transform="translate(${px(area.to - 32 * scale - 8)} 1)">${rows.join('') + crater}</g>`
}
function stars(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, 4, area.to - 4)
    const y = between(rand, 2, Math.max(8, area.height - 4))
    const big = rand() < 0.4
    const dur = between(rand, 1.6, 3.4)
    const shape = big ? r(1, 0, 1, 3, '#FFF6C8') + r(0, 1, 3, 1, '#FFF6C8') : r(0, 0, 1.4, 1.4, '#FFF6C8')
    out.push(`<g transform="translate(${px(x)} ${px(y)})"><g>${shape}<animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values=".2;1;.2"/></g></g>`)
  }
  return out.join('')
}
// A half sun sitting on the horizon (ground line) with warm bands of light above it
// A round disc made of chunky rows, centred on (cx, cy)
function discRows(cx, cy, R, cell, fill, opacity = 1) {
  return Array.from({ length: R * 2 }, (_, i) => {
    const y = i + 0.5 - R
    const half = Math.sqrt(Math.max(0, R * R - y * y))
    return r(cx - half * cell, cy - R * cell + i * cell, half * 2 * cell, cell, fill, opacity < 1 ? ` fill-opacity="${opacity}"` : '')
  }).join('')
}
function horizonSun(area, { sun, rim, bands, wash }) {
  const cx = area.to / 2
  // Over mountains the sun hangs high in the sky above the peaks, in a tinted sky, so it is never muddied by the ridges in front of it
  if (area.scenes?.includes('cordillera')) {
    const cy = Math.max(11, area.height * 0.2)
    const tint = r(0, 0, area.to, area.height * 0.62, wash, ' fill-opacity=".13"') + r(0, 0, area.to, area.height * 0.34, wash, ' fill-opacity=".1"')
    return `<g>${tint}${discRows(cx, cy, 9, 2.4, wash, 0.14)}${discRows(cx, cy, 7, 2.4, sun)}${discRows(cx, cy - 1.5, 3, 2.4, rim, 0.55)}<animate attributeName="opacity" dur="6s" repeatCount="indefinite" values=".85;1;.85"/></g>`
  }
  // Otherwise a half sun in the middle of the strip, sitting just above the progress bars (a pill row is about 16 tall)
  const R = 9
  const cell = 2.4
  const horizon = area.ground - 18
  const top = horizon - R * cell
  const disc = Array.from({ length: R }, (_, i) => {
    const half = Math.sqrt(R * R - (R - i - 0.5) ** 2)
    return r(cx - half * cell, top + i * cell, half * 2 * cell, cell, i < 2 ? rim : sun)
  }).join('')
  // Warm light fading upward from the horizon, in several soft layers
  const light = bands.map((color, i) => r(0, horizon - 4 - i * 5, area.to, 5, color, ` fill-opacity="${px(0.2 - 0.035 * i)}"`)).join('')
  return `<g>${light}<animate attributeName="opacity" dur="6s" repeatCount="indefinite" values=".8;1;.8"/></g>${disc}`
}
const sunrise = (area) => horizonSun(area, { sun: '#F9B04A', rim: '#FFD27A', wash: '#FFB36B', bands: ['#FFB36B', '#FFA66B', '#FF9A6B', '#F6B87A', '#F6D27A'] })
const sunset = (area) => horizonSun(area, { sun: '#E8553A', rim: '#F58A4A', wash: '#E8553A', bands: ['#E8553A', '#E0524A', '#B5457A', '#8E4A8E', '#6E4A9E'] })

// ---- Cinco de Mayo: confetti in the Mexican colours ----
const mexBit = (rand) => {
  const fill = pick(rand, ['#1E8A4C', '#F7F5F0', '#D8283A', '#F2C230'])
  return r(0, 0, 3, 2, fill) + r(1, 2, 1, 2, fill)
}
// ---- May the Fourth: a starfield and a distant moon-sized battle station ----
function deathStar(area) {
  const cx = area.to * 0.3
  const cy = 13
  return `<g>${discRows(cx, cy, 5, 2.4, '#8E939C')}${r(cx - 12, cy - 0.6, 24, 1.2, '#6C717A')}${discRows(cx + 4.5, cy - 4.5, 1.5, 2.4, '#5F646D')}${r(cx + 3, cy - 6, 3, 3, '#7DE29A', ' fill-opacity=".8"')}</g>`
}

// ---- Birthday: bright party confetti ----
const partyBit = (rand) => {
  const fill = pick(rand, ['#F25C8B', '#F7D046', '#4FB6F2', '#7BD36B', '#B58CE0'])
  return r(0, 0, 3, 2, fill) + r(1, 2, 1, 2, fill)
}

// Balloons floating up through the background
function balloons(rand, area, count) {
  const colours = [['#F25C8B', '#FFD0DE'], ['#4FB6F2', '#D6F0FF'], ['#F7D046', '#FFF3B8'], ['#7BD36B', '#D9F7D2'], ['#B58CE0', '#EAD9FA']]
  const out = []
  for (let i = 0; i < count; i++) {
    const [fill, shine] = colours[i % colours.length]
    const x = between(rand, area.to * 0.04, area.to * 0.96)
    const dur = between(rand, 9, 15)
    const body = r(1, 0, 8, 2, fill) + r(0, 2, 10, 9, fill) + r(1, 11, 8, 2, fill) + r(4, 13, 3, 2, fill) + r(2, 2, 2, 4, shine, ' fill-opacity=".7"') + r(5, 15, 0.8, 12, '#E8E4DA')
    out.push(drift(`<g transform="scale(1.1)">${body}</g>`, [[x, area.bottom + 16], [x + 10, area.bottom * 0.5], [x - 6, -34]], dur, rand() * dur))
  }
  return out.join('')
}

// ---- Father's Day: blue, navy and gold confetti ----
const dadBit = (rand) => {
  const fill = pick(rand, ['#3A78C8', '#1F3A6E', '#F2C230', '#F7F5F0', '#D8283A'])
  return r(0, 0, 3, 2, fill) + r(1, 2, 1, 2, fill)
}

// ---- Pi Day: the digits of pi drifting down ----
const PI_DIGITS = '31415926535897932384626433832795'
const piBit = (rand) => {
  const n = Math.floor(rand() * PI_DIGITS.length)
  return digitsSvg(PI_DIGITS[n], 0, 0, 1.4, pick(rand, ['#7FD6F2', '#B8E3A0', '#F7F5F0', '#F2C230']))
}
// ---- New Year's Eve: gold and silver confetti ----
const goldBit = (rand) => {
  const fill = pick(rand, ['#F2C230', '#D9DEE6', '#FFF3A8', '#F7F5F0'])
  return r(0, 0, 3, 2, fill) + r(1, 2, 1, 2, fill)
}
// ---- Groundhog Day: a groundhog pops out of its burrow, sees its shadow on the snow, and ducks back down ----
function burrow(rand, area) {
  const cx = area.to - 74
  const g = area.ground
  const dur = 9
  const rows = [8, 14, 20, 24, 26].map((w, i) => r(cx - w, g - 5 + i - 1 + 0, w * 2, 1.2, '#7A5530')).join('')
  const mound = r(cx - 26, g - 4, 52, 4, '#7A5530') + r(cx - 20, g - 7, 40, 3, '#8A6238') + r(cx - 13, g - 10, 26, 3, '#9A7040') + r(cx - 8, g - 4, 16, 4, '#2A1C10')
  const head = r(cx - 6, g - 17, 12, 11, '#8A5A32') + r(cx - 8, g - 19, 4, 4, '#8A5A32') + r(cx + 4, g - 19, 4, 4, '#8A5A32') + r(cx - 3, g - 13, 2, 2, '#14121C') + r(cx + 2, g - 13, 2, 2, '#14121C') + r(cx - 1, g - 10, 3, 2, '#14121C') + r(cx - 2, g - 8, 4, 3, '#F7F5F0') + r(cx - 6, g - 7, 12, 2, '#9C6A3C')
  const popped = `<g>${head}<animateTransform attributeName="transform" type="translate" dur="${dur}s" repeatCount="indefinite" values="0 16;0 0;0 0;0 16;0 16" keyTimes="0;.12;.55;.67;1"/></g>`
  const shadow = `<g>${r(cx - 46, g - 3, 40, 3, '#0B0E14', ' fill-opacity=".45"') + r(cx - 40, g - 6, 24, 3, '#0B0E14', ' fill-opacity=".3"')}<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;.15;.55;.67;1"/></g>`
  return `<g>${shadow}${popped}${mound}</g>`
}

// ---- Day of the Dead: a string of papel picado flags across the top, and marigold petals falling ----
function papelPicado(rand, area) {
  const colours = ['#F25C8B', '#F28A2E', '#2FB5C8', '#F7D046', '#8A5CC8', '#7BD36B']
  const out = [r(0, 2, area.to, 1, '#E8E4DA', ' fill-opacity=".6"')]
  const step = 20
  for (let x = 4, i = 0; x < area.to - 14; x += step, i++) {
    const fill = colours[i % colours.length]
    const sway = `<animateTransform attributeName="transform" type="rotate" dur="${px(between(rand, 2.4, 3.6))}s" begin="-${px(rand() * 3)}s" repeatCount="indefinite" values="-3 8 0;3 8 0;-3 8 0"/>`
    const flag = r(0, 0, 16, 14, fill) + r(3, 3, 3, 3, '#14121C', ' fill-opacity=".35"') + r(10, 3, 3, 3, '#14121C', ' fill-opacity=".35"') + r(6, 8, 4, 3, '#14121C', ' fill-opacity=".35"') + r(0, 14, 4, 2, fill) + r(6, 14, 4, 3, fill) + r(12, 14, 4, 2, fill)
    out.push(`<g transform="translate(${x} 3)"><g>${flag}${sway}</g></g>`)
  }
  return out.join('')
}
const marigoldPetal = (rand) => {
  const fill = pick(rand, ['#F28A2E', '#FFB534', '#E8700F'])
  return r(0, 1, 5, 3, fill) + r(1, 0, 3, 5, fill) + r(2, 2, 1.4, 1.4, '#FFE08A')
}

// ---- Veterans Day (US): small red, white and blue stars falling ----
const starBit = (rand) => {
  const fill = pick(rand, ['#C8283A', '#F7F5F0', '#3A6FE0'])
  return r(2, 0, 2, 6, fill) + r(0, 2, 6, 2, fill) + r(1, 1, 4, 4, fill)
}

// ---- Anniversary: red rose petals drifting down ----
const rosePetal = (rand) => {
  const fill = pick(rand, ['#D8283A', '#B01E30', '#E23A4E'])
  return r(0, 1, 4, 3, fill) + r(1, 0, 2, 5, fill)
}

// ---- Northern lights: green, teal and purple curtains rippling across the sky ----
function aurora(rand, area) {
  const bands = [
    { color: '#4ADE80', y: 6, h: 18, a: 0.26 },
    { color: '#2DD4BF', y: 12, h: 16, a: 0.2 },
    { color: '#A855F7', y: 2, h: 14, a: 0.22 },
  ]
  return bands.map((b, bi) => {
    const phase = rand() * 6
    let columns = ''
    for (let x = 0; x < area.to; x += 3) {
      const y = b.y + 5 * Math.sin(x / 26 + phase) + 3 * Math.sin(x / 9 + phase * 2)
      const h = b.h + 7 * Math.sin(x / 17 + phase)
      columns += r(x, y, 3, h, b.color, ` fill-opacity="${px(b.a * (0.7 + 0.3 * Math.sin(x / 31 + bi)))}"`)
    }
    const dur = 5 + bi * 1.7
    return `<g>${columns}<animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values=".55;1;.55"/></g>`
  }).join('')
}
// ---- Perseid meteor shower: shooting stars streaking down and across ----
function meteors(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, area.to * 0.1, area.to * 0.85)
    const y = between(rand, 2, Math.max(10, area.height * 0.4))
    const dur = between(rand, 5, 9)
    const streak = `<g transform="rotate(28)">${r(-16, 0, 16, 1.2, '#FFF6C8', ' fill-opacity=".3"') + r(-8, 0, 8, 1.2, '#FFF6C8', ' fill-opacity=".7"') + r(0, 0, 2.4, 1.4, '#FFFFFF')}</g>`
    out.push(`<g opacity="0">${streak}<animateTransform attributeName="transform" type="translate" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="${px(x)} ${px(y)};${px(x + 70)} ${px(y + 38)};${px(x + 70)} ${px(y + 38)}" keyTimes="0;.16;1"/><animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="0;1;0;0" keyTimes="0;.04;.16;1"/></g>`)
  }
  return out.join('')
}
// ---- A rainbow after the rain ----
function rainbow(rand, area) {
  const colours = ['#E23A4E', '#F28A2E', '#F7D046', '#4DB86B', '#3F9BE0', '#8A5CC8']
  const R = Math.min(70, area.height * 0.85)
  const cx = area.to * 0.58
  const base = area.ground - 4
  const out = colours.map((fill, i) => {
    const radius = R - i * 3.2
    let arc = ''
    for (let dx = -radius; dx <= radius; dx += 1.6) arc += r(cx + dx, base - Math.sqrt(Math.max(0, radius * radius - dx * dx)), 1.8, 3.4, fill, ' fill-opacity=".55"')
    return arc
  }).join('')
  return `<g>${out}<animate attributeName="opacity" dur="7s" repeatCount="indefinite" values=".8;1;.8"/></g>`
}
// ---- GTA VI release day, in a retro Vice City style: a striped neon sunset and palm trees ----
function viceCity(rand, area) {
  const horizon = area.ground - 18
  const cx = area.to / 2
  const R = 11
  const cell = 2.2
  const colours = ['#FFE45E', '#FFD24A', '#FFB84A', '#FF9A55', '#FF7A6A', '#FF5F8E', '#E8489F', '#C23AA8', '#9B30B0', '#7B2FBE', '#6A2DB8']
  let sun = ''
  for (let i = 0; i < R; i++) {
    if (i > 5 && i % 2 === 1) continue
    const half = Math.sqrt(R * R - (R - i - 0.5) ** 2)
    sun += r(cx - half * cell, horizon - R * cell + i * cell, half * 2 * cell, cell, colours[i])
  }
  const wash = r(0, 0, area.to, horizon, '#7B2FBE', ' fill-opacity=".14"') + r(0, horizon * 0.5, area.to, horizon * 0.5, '#FF5F8E', ' fill-opacity=".1"')
  const palm = (x, lean) => {
    const g = horizon + 14
    return `<g fill="#2A1250">` +
      r(x, g - 34, 3, 34, '#2A1250') + r(x + lean, g - 38, 3, 6, '#2A1250') +
      r(x - 13 + lean, g - 40, 14, 3, '#2A1250') + r(x + 3 + lean, g - 40, 14, 3, '#2A1250') +
      r(x - 17 + lean, g - 37, 5, 3, '#2A1250') + r(x + 15 + lean, g - 37, 5, 3, '#2A1250') +
      r(x - 8 + lean, g - 45, 9, 3, '#2A1250') + r(x + 3 + lean, g - 45, 9, 3, '#2A1250') + r(x - 2 + lean, g - 48, 7, 3, '#2A1250') +
      `</g>`
  }
  const neon = r(0, horizon + 1, area.to, 1.5, '#FF5FC8', ' fill-opacity=".85"')
  return `<g>${wash}${sun}${neon}<animate attributeName="opacity" dur="6s" repeatCount="indefinite" values=".85;1;.85"/></g>${palm(area.to * 0.1, 3)}${palm(area.to * 0.9, -3)}`
}

// ---- Weather: a soft grey fog drifting past ----
function fog(rand, area) {
  const bands = [0, 1, 2, 3].map((i) => {
    const y = (area.height / 5) * (i + 0.6)
    const dur = between(rand, 40, 70)
    const cloud = r(0, 0, area.to * 0.7, 9, '#C3C9D4', ' fill-opacity=".16"') + r(area.to * 0.1, -3, area.to * 0.5, 15, '#C3C9D4', ' fill-opacity=".11"')
    return drift(cloud, [[-area.to * 0.4, y], [area.to * 0.4, y + 2], [-area.to * 0.4, y]], dur, rand() * dur)
  })
  return `<g>${r(0, 0, area.to, area.height, '#AEB5C2', ' fill-opacity=".12"')}${bands.join('')}</g>`
}
// ---- Weather: a blizzard, snow blowing hard sideways ----
function blizzard(rand, area) {
  const out = []
  for (let i = 0; i < 46; i++) {
    const y = between(rand, 0, area.height)
    const dur = between(rand, 0.9, 2.2)
    const streak = r(0, 0, between(rand, 4, 11), 1.2, '#F4F8FF', ` fill-opacity="${px(between(rand, 0.5, 0.95))}"`)
    out.push(`<g>${streak}<animateTransform attributeName="transform" type="translate" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="${px(area.to + 12)} ${px(y)};${px(-14)} ${px(y + 9)}"/></g>`)
  }
  return `<g>${r(0, 0, area.to, area.height, '#DCE4F0', ' fill-opacity=".1"')}${out.join('')}</g>`
}
// ---- Extreme cold: ice crystals glittering in the freezing air ----
function frost(rand, area) {
  const out = []
  for (let i = 0; i < 26; i++) {
    const x = between(rand, 2, area.to - 4)
    const y = between(rand, 2, area.height - 4)
    const dur = between(rand, 1.4, 3.2)
    const crystal = r(1, 0, 1.2, 3.4, '#DFF4FF') + r(0, 1, 3.4, 1.2, '#DFF4FF')
    out.push(`<g transform="translate(${px(x)} ${px(y)})"><g>${crystal}<animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values=".1;1;.1"/></g></g>`)
  }
  return out.join('')
}
// ---- A total solar eclipse: the sun blacked out with a glowing corona, the day dimmed ----
// ---- A total solar eclipse, played out over 20 seconds and repeated: the moon's dark disc slides across the sun, the sky
// darkens and stars come out, the white corona flares around the black disc with a bright "diamond ring" at each edge,
// then the moon slides off and daylight returns ----
function eclipse(rand, area) {
  const D = 20
  const cx = area.to - 44
  const cy = 26
  const R = 7
  const cell = 2
  const loop = (attr, values, keyTimes) => `<animate attributeName="${attr}" dur="${D}s" repeatCount="indefinite" values="${values}" keyTimes="${keyTimes}"/>`
  const totality = '0;0;1;1;0;0'
  const totalityTimes = '0;.37;.42;.58;.63;1'
  // the sky dims, darkest at totality, and stars come out
  const dim = `<rect x="0" y="0" width="${px(area.to + 4)}" height="${px(area.bottom + 1)}" fill="#0A1030" fill-opacity=".6">${loop('opacity', '.15;.15;1;1;.15;.15', totalityTimes)}</rect>`
  const starsOut = `<g opacity="0">${stars(rand, area, Math.max(16, Math.round(area.to / 14)))}${loop('opacity', totality, totalityTimes)}</g>`
  // the sun, glowing
  const sun = discRows(cx, cy, R + 2, cell, '#FFE58A', 0.3) + discRows(cx, cy, R, cell, '#FFD23F') + discRows(cx, cy, R - 3, cell, '#FFE58A')
  // the corona at totality: soft rings and long streamers
  const streamers = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    const len = i % 3 === 0 ? 12 : i % 2 ? 6 : 9
    return Array.from({ length: Math.round(len / 2) }, (_, k) => r(cx + Math.cos(a) * (R * cell + 2 + k * 2) - 1, cy + Math.sin(a) * (R * cell + 2 + k * 2) - 1, 2, 2, '#FFFFFF', ` fill-opacity="${px(0.85 - k * 0.12)}"`)).join('')
  }).join('')
  const corona = `<g opacity="0">${discRows(cx, cy, R + 5, cell, '#FFF6D8', 0.22) + discRows(cx, cy, R + 2, cell, '#FFFFFF', 0.6) + streamers}${loop('opacity', totality, totalityTimes)}</g>`
  // the moon slides across from the right, holds over the sun, and slides off to the left
  const reach = R * cell * 2 + 4
  const moonDisc = `<g>${discRows(cx, cy, R, cell, '#0B0B12')}<animateTransform attributeName="transform" type="translate" dur="${D}s" repeatCount="indefinite" values="${reach} 0;0 0;0 0;${-reach} 0" keyTimes="0;.4;.6;1" calcMode="spline" keySplines=".3 .1 .7 .9;0 0 1 1;.3 .1 .7 .9"/></g>`
  // the moon only shows where it covers the sun (against the daytime sky it is invisible)
  const clip = `<clipPath id="suncover${px(cx)}">${discRows(cx, cy, R, cell, '#000')}</clipPath>`
  // the diamond ring: a bright flash on the sun's edge just before and just after totality
  const ring = (x, at) => `<g opacity="0">${r(x - 2, cy - 2, 4, 4, '#FFFFFF') + r(x - 7, cy - 0.6, 14, 1.2, '#FFFFFF') + r(x - 0.6, cy - 7, 1.2, 14, '#FFFFFF')}<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;${at - 0.025};${at};${at + 0.025};1"/></g>`
  return `<defs>${clip}</defs>` + dim + starsOut + corona + sun + `<g clip-path="url(#suncover${px(cx)})">${moonDisc}</g>` + ring(cx - R * cell + 1, 0.4) + ring(cx + R * cell - 1, 0.6)
}

// ---- A total lunar eclipse (a blood moon), played out over 24 seconds and repeated: the earth's shadow slides across the
// bright full moon and turns it a deep coppery red, with a red glow and brighter stars at totality, then moves off ----
function lunarEclipse(rand, area) {
  const D = 24
  const cell = 2
  const R = 8
  const cx = area.to - 36
  const cy = 26
  const loop = (attr, values, keyTimes) => `<animate attributeName="${attr}" dur="${D}s" repeatCount="indefinite" values="${values}" keyTimes="${keyTimes}"/>`
  const totality = '0;0;1;1;0;0'
  const totalityTimes = '0;.4;.45;.62;.67;1'
  const starsBright = `<g>${stars(rand, area, Math.max(28, Math.round(area.to / 8)))}${loop('opacity', '.6;.6;1;1;.6;.6', totalityTimes)}</g>`
  const moonFull = discRows(cx, cy, R, cell, '#F5F0D6') + r(cx - 6, cy - 4, 4, 4, '#D6D1B3') + r(cx + 4, cy + 2, 4, 4, '#D6D1B3') + r(cx - 2, cy + 7, 2, 2, '#D6D1B3')
  // the earth's shadow: a bigger disc, coppery red in the middle and darker toward its edge, sliding across from the left
  const S = R * 1.7
  const shadow = discRows(cx, cy, S, cell, '#5A1A12', 0.9) + discRows(cx, cy, S - 4, cell, '#8E2A1C') + discRows(cx, cy, R, cell, '#B23A22', 0.85)
  const reach = (S + R) * cell
  const sliding = `<g>${shadow}<animateTransform attributeName="transform" type="translate" dur="${D}s" repeatCount="indefinite" values="${-reach} 0;0 0;0 0;${reach} 0" keyTimes="0;.45;.62;1" calcMode="spline" keySplines=".35 .05 .65 .95;0 0 1 1;.35 .05 .65 .95"/></g>`
  const clip = `<clipPath id="moonshadow${px(cx)}">${discRows(cx, cy, R, cell, '#000')}</clipPath>`
  const glow = `<g opacity="0">${discRows(cx, cy, R + 3, cell, '#C8392B', 0.2) + discRows(cx, cy, R + 1, cell, '#E0503A', 0.25)}${loop('opacity', totality, totalityTimes)}</g>`
  const tint = `<rect x="0" y="0" width="${px(area.to + 4)}" height="${px(area.bottom + 1)}" fill="#4A0E0A" fill-opacity=".25">${loop('opacity', '0;0;1;1;0;0', totalityTimes)}</rect>`
  return `<defs>${clip}</defs>` + starsBright + tint + glow + moonFull + `<g clip-path="url(#moonshadow${px(cx)})">${sliding}</g>`
}

// ---- Binary rain, for Cyber Monday ----
const binaryBit = (rand) => digitsSvg(rand() < 0.5 ? '0' : '1', 0, 0, 1.4, pick(rand, ['#F4F1EA', '#B8B8C2', '#8A8A94', '#5E5E68']))
// ---- Black Friday: red, black and yellow sale confetti ----
const saleBit = (rand) => {
  const fill = pick(rand, ['#14121C', '#D8283A', '#F2C230', '#F7F5F0'])
  return r(0, 0, 3, 2, fill) + r(1, 2, 1, 2, fill)
}

// ---- bats ----
function bats(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const y = between(rand, 6, Math.max(10, area.height * 0.45))
    const dur = between(rand, 9, 14)
    const body = r(0, 0, 6, 4, '#5A4A78') + r(1, -1, 1, 1, '#5A4A78') + r(4, -1, 1, 1, '#5A4A78') + r(2, 1, 1, 1, '#E8833A') + r(3, 1, 1, 1, '#E8833A')
    const wings = `<g>${r(-9, -2, 8, 3, '#5A4A78') + r(7, -2, 8, 3, '#5A4A78')}<animateTransform attributeName="transform" type="scale" dur="0.45s" repeatCount="indefinite" values="1 1;1 .35;1 1"/></g>`
    out.push(drift(body + wings, [[area.from - 20, y], [(area.from + area.to) / 2, y + 12], [area.to + 20, y - 4]], dur, rand() * dur))
  }
  return out.join('')
}

// ---- Everyday life in the sky: birds by day, butterflies in spring and summer, fireflies on summer nights ----
// A few birds flap across, high up, in a loose line
function birds(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const y = between(rand, 6, Math.max(12, area.height * 0.4))
    const dur = between(rand, 16, 24)
    const colour = '#3A3A48'
    const body = r(0, 0, 3, 2, colour)
    const wings = `<g>${r(-5, -2, 5, 1.6, colour) + r(3, -2, 5, 1.6, colour) + r(-2, -1, 2, 1.4, colour) + r(3, -1, 2, 1.4, colour)}<animateTransform attributeName="transform" type="translate" dur="0.5s" repeatCount="indefinite" values="0 0;0 2.4;0 0"/></g>`
    const bird = (dx, dy) => `<g transform="translate(${dx} ${dy})">${body + wings}</g>`
    // two or three together, the way birds fly
    const flock = bird(0, 0) + bird(-11, 4) + (rand() < 0.6 ? bird(-21, -1) : '')
    out.push(drift(flock, [[area.from - 30, y], [(area.from + area.to) / 2, y - 5], [area.to + 30, y + 3]], dur, rand() * dur))
  }
  return out.join('')
}
// Butterflies flutter low, wandering back and forth, their wings opening and closing
function butterflies(rand, area, count) {
  const colours = [['#F2A33A', '#B8641E'], ['#8FC7F2', '#3F7FBF'], ['#F7D046', '#C79A1E']]
  const out = []
  for (let i = 0; i < count; i++) {
    const [wing, edge] = colours[i % colours.length]
    const x = between(rand, area.groundFrom + 30, area.to - 30)
    const y = between(rand, area.height * 0.4, Math.max(area.height * 0.45, area.ground - 14))
    const dur = between(rand, 10, 15)
    const flap = `<g>${r(-5, -4, 4, 4, wing) + r(1, -4, 4, 4, wing) + r(-4, 0, 3, 3, edge) + r(1, 0, 3, 3, edge)}<animateTransform attributeName="transform" type="scale" dur="0.32s" repeatCount="indefinite" values="1 1;.2 1;1 1"/></g>`
    const fly = flap + r(-0.5, -4, 1, 7, '#2B2B2B')
    out.push(drift(fly, [[x, y], [x + 26, y - 9], [x + 44, y + 2], [x + 18, y - 4], [x - 14, y + 5], [x, y]], dur, rand() * dur))
  }
  return out.join('')
}
// Fireflies: soft yellow-green lights that glow on and off as they drift
function fireflies(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, area.from + 8, area.to - 8)
    const y = between(rand, area.height * 0.3, area.ground - 4)
    const dur = between(rand, 3, 5.5)
    const glow = r(-2, -2, 5, 5, '#D8F27A', ' fill-opacity=".25"') + r(0, 0, 1.6, 1.6, '#F2FF9E')
    out.push(drift(fade(glow, '0;0;1;1;0', dur, rand() * dur), [[x, y], [x + 8, y - 5], [x + 3, y + 4], [x, y]], dur * 3, rand() * dur * 3))
  }
  return out.join('')
}
// Spring blossoms: pale pink petals drifting down
const blossomPetal = (rand) => (rand() < 0.5 ? r(0, 0, 3, 2, '#F7C6D6') + r(1, 0, 1, 1, '#FFFFFF') : r(0, 0, 2, 3, '#F2A9C2'))

// ---- Rare sights at night ----
// A little flying saucer zips across now and then, lights blinking, and briefly shines its beam down
function ufo(rand, area) {
  const D = 18
  const y = Math.max(10, area.height * 0.22)
  const lights = ['#FF5A5A', '#7CF2B0', '#FFE27A'].map((fill, i) => `<g>${r(-6 + i * 5, 3, 2, 1.5, fill)}<animate attributeName="opacity" dur="0.6s" begin="-${i * 0.2}s" repeatCount="indefinite" values="1;.2;1"/></g>`).join('')
  const saucer = r(-4, -4, 8, 4, '#9FD8E8', ' fill-opacity=".8"') + r(-10, 0, 20, 3, '#A8ADB8') + r(-7, 3, 14, 2, '#7A7F8C') + lights
  const beam = `<g opacity="0"><path d="M-4 5 L4 5 L10 ${px(area.ground - y)} L-10 ${px(area.ground - y)} Z" fill="#B8F2C8" fill-opacity=".22"/><animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;.42;.45;.55;.58;1"/></g>`
  const x0 = area.from - 30
  const mid = area.to * 0.45
  return `<g opacity="0">${`<g>${beam + saucer}<animateTransform attributeName="transform" type="translate" dur="${D}s" repeatCount="indefinite" values="${px(x0)} ${px(y)};${px(mid)} ${px(y)};${px(mid)} ${px(y)};${px(area.to + 30)} ${px(y - 8)};${px(area.to + 30)} ${px(y - 8)}" keyTimes="0;.4;.6;.75;1"/></g>`}<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;.75;.76;1"/></g>`
}
// A comet: a bright head with a long, faint, shimmering tail. Comets creep across the sky over weeks, so it hangs still.
function comet(rand, area) {
  const x = area.to * 0.7
  const y = Math.max(12, area.height * 0.25)
  let tail = ''
  for (let i = 1; i <= 16; i++) tail += r(x - i * 3, y - i * 1.1, 3, 1.6 + i * 0.1, '#CFE8FF', ` fill-opacity="${px(0.55 - i * 0.03)}"`)
  const head = r(x - 2, y - 2, 5, 5, '#E8F4FF', ' fill-opacity=".35"') + r(x - 0.5, y - 0.5, 2.4, 2.4, '#FFFFFF')
  return `<g><g>${tail}<animate attributeName="opacity" dur="4s" repeatCount="indefinite" values=".75;1;.75"/></g>${head}</g>`
}

// ---- Holi: clouds of coloured powder thrown into the air, puffing up and fading, with specks drifting down ----
function holiColours(rand, area) {
  const colours = ['#E8338A', '#F7C21E', '#2EB872', '#3F8CE8', '#9B4FD6', '#F2622E']
  const out = []
  const count = Math.max(5, Math.round(area.to / 70))
  for (let i = 0; i < count; i++) {
    const fill = colours[i % colours.length]
    const x = between(rand, area.from + 14, area.to - 14)
    const y = between(rand, 10, Math.max(14, area.height * 0.6))
    const dur = between(rand, 3.5, 6)
    const puff = r(-9, -5, 18, 10, fill, ' fill-opacity=".35"') + r(-6, -8, 12, 16, fill, ' fill-opacity=".35"') + r(-4, -4, 8, 8, fill, ' fill-opacity=".6"')
    out.push(`<g transform="translate(${px(x)} ${px(y)})"><g opacity="0">${puff}<animateTransform attributeName="transform" type="scale" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values=".3;1.2;1.5"/><animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="0;1;0"/></g></g>`)
  }
  const specks = falling(rand, area, 12, (rnd) => r(0, 0, 2, 2, colours[Math.floor(rnd() * colours.length)]), [6, 10], 10)
  return out.join('') + specks
}
// ---- Oktoberfest: a string of blue and white diamond flags (the Bavarian colours) swaying across the top ----
function bunting(rand, area) {
  const step = 12
  let flags = r(0, 3, area.to + 4, 1, '#8A8A86')
  for (let x = 4, i = 0; x < area.to; x += step, i++) {
    const fill = i % 2 ? '#F7F5F0' : '#2F7FD0'
    flags += r(x, 4, 8, 3, fill) + r(x + 1, 7, 6, 3, fill) + r(x + 2.5, 10, 3, 3, fill)
  }
  return `<g>${flags}<animateTransform attributeName="transform" type="translate" dur="4s" repeatCount="indefinite" values="0 0;0 1;0 0"/></g>`
}

// ---- fireworks bursting in the sky, in different sizes ----
function fireworks(rand, area, count, colours = ['#D6252B', '#F7F5F0', '#F2C94C', '#B58CE0', '#8FC7F2']) {
  const out = []
  for (let i = 0; i < count; i++) {
    const radius = between(rand, 6, 17)
    const x = between(rand, area.from + 20, area.to - 20)
    const y = between(rand, radius + 4, Math.max(radius + 8, area.height * 0.5))
    // Cycle through the colours so each one shows up
    const colour = colours[i % colours.length]
    const dur = between(rand, 3.2, 5)
    const offset = rand() * dur
    const spokes = radius > 11 ? 12 : 8
    const size = radius > 11 ? 4 : 3
    const sparks = Array.from({ length: spokes }, (_, k) => {
      const angle = (k / spokes) * Math.PI * 2
      return r(Math.cos(angle) * radius - size / 2, Math.sin(angle) * radius - size / 2, size, size, colour)
    }).join('')
    out.push(
      `<g transform="translate(${px(x)} ${px(y)})"><g>${sparks + r(-2, -2, 4, 4, colour)}` +
        `<animateTransform attributeName="transform" type="scale" dur="${px(dur)}s" begin="-${px(offset)}s" repeatCount="indefinite" values="0.2;1;1.15;1.15" keyTimes="0;.3;.7;1"/>` +
        `<animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(offset)}s" repeatCount="indefinite" values="0;1;.6;0" keyTimes="0;.3;.7;1"/></g></g>`,
    )
  }
  return out.join('')
}

// What each scene is made of. `area` is { from, to, height, ground }: where things may go, in screen pixels.
// ---- Diwali: a row of little clay lamps (diyas) along the ground, each flame flickering ----
function diyas(rand, area) {
  const count = Math.max(3, Math.round((area.to - area.groundFrom) / 46))
  const out = []
  for (let i = 0; i < count; i++) {
    const x = area.groundFrom + ((i + 0.5) * (area.to - area.groundFrom)) / count + between(rand, -6, 6)
    const y = area.ground - 6
    const flame = `<g>${r(4, -7, 3, 6, '#F7A33A')}${r(4.6, -5, 1.8, 4, '#FFE27A')}<animate attributeName="opacity" dur="${px(between(rand, 0.5, 0.9))}s" begin="-${px(rand())}s" repeatCount="indefinite" values=".7;1;.8;1;.7"/></g>`
    out.push(`<g transform="translate(${px(x)} ${px(y)})">${r(0, 0, 11, 3, '#B5652D')}${r(1, 3, 9, 2, '#8A4A22')}${r(2, -1, 7, 1.5, '#C97A3A')}${flame}</g>`)
  }
  return out.join('')
}

// ---- Hanukkah: a menorah standing beside him, with the helper candle in the middle and one more candle lit each night ----
function menorah(area, nights) {
  const lit = Math.max(1, Math.min(8, nights))
  const x0 = Math.max(area.groundFrom + 4, area.to - 86)
  const base = area.ground
  const GOLD = '#E8B93C'
  const flame = (x, y, i) => `<g>${r(x, y - 6, 2.4, 5, '#F7A33A')}${r(x + 0.5, y - 4, 1.4, 3, '#FFE27A')}<animate attributeName="opacity" dur="0.8s" begin="-${px(i * 0.13)}s" repeatCount="indefinite" values=".75;1;.85;1;.75"/></g>`
  let out = r(x0 + 24, base - 4, 14, 4, GOLD) + r(x0 + 29, base - 20, 4, 16, GOLD) + r(x0, base - 22, 62, 3, GOLD)
  // eight branches, four each side, and the taller helper candle (the shamash) in the middle
  const branchX = [0, 7, 14, 21, 39, 46, 53, 60]
  branchX.forEach((bx, i) => {
    const x = x0 + bx
    out += r(x, base - 28, 3, 6, GOLD) + r(x, base - 36, 3, 8, '#F7F5F0')
    // candles are lit from the left, one more each night
    if (i < lit) out += flame(x + 0.3, base - 36, i)
  })
  out += r(x0 + 29.5, base - 34, 3, 12, GOLD) + r(x0 + 29.5, base - 42, 3, 8, '#F7F5F0') + flame(x0 + 29.8, base - 42, 9)
  return out
}

// ---- Eid: a thin crescent moon and a few stars in the sky ----
function crescent(rand, area) {
  const x = Math.max(area.groundFrom + 20, area.to - 70)
  const rows = ['..XXX..', '.XX....', 'XX.....', 'XX.....', 'XX.....', '.XX....', '..XXX..']
  const c = 3.4
  const moonShape = rows.map((row, j) => [...row].map((ch, i) => (ch === 'X' ? r(px(x + i * c), px(6 + j * c), c, c, '#F5E7A8') : '')).join('')).join('')
  return stars(rand, area, Math.max(10, Math.round(area.to / 30))) + moonShape + r(px(x + 9 * c), px(6 + 2 * c), c, c, '#F5E7A8')
}

// ---- Eid: lanterns in gold and green, swaying from above ----
function eidLanterns(rand, area, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = between(rand, area.to * 0.05, area.to * 0.9)
    const cord = between(rand, 2, 9)
    const sway = `<animateTransform attributeName="transform" type="rotate" dur="${px(between(rand, 2.6, 3.8))}s" begin="-${px(rand() * 3)}s" repeatCount="indefinite" values="-5 6 0;5 6 0;-5 6 0"/>`
    const glow = i % 2 ? '#7FD3A8' : '#FFE9A0'
    const body = r(5.5, 0, 1, cord, '#6B4F3A') + r(2, cord, 8, 2, '#C9A13A') + r(1, cord + 2, 10, 10, '#C9A13A') + r(2.5, cord + 3.5, 7, 7, glow) + r(5.4, cord + 2, 1.2, 10, '#C9A13A') + r(3, cord + 12, 6, 2, '#C9A13A') + r(5, cord + 14, 2, 3, '#C9A13A')
    out.push(`<g transform="translate(${px(x)} 0)"><g>${body}${sway}</g></g>`)
  }
  return out.join('')
}

// ---- Earth Hour: the lights go out, the strip goes dark behind him ----
function blackout(area) {
  return `<rect x="0" y="0" width="${px(area.to + 4)}" height="${px(area.bottom + 1)}" fill="#05060A" fill-opacity=".82"/>`
}

// ---- Extreme cold: an icy blue tint and frozen ground ----
function icicles(rand, area) {
  const out = [r(0, 0, area.to + 4, area.bottom + 1, '#9FD3FF', ' fill-opacity=".1"')]
  for (let x = area.groundFrom; x < area.to; x += between(rand, 22, 40)) {
    const w = between(rand, 12, 24)
    out.push(r(x, area.ground - 2, w, 2.5, '#CDEBFF', ' fill-opacity=".8"') + r(x + 2, area.ground - 2, w * 0.3, 1, '#FFFFFF'))
  }
  return out.join('')
}

// ---- A heat wave: a huge blazing sun with a pulsing glow ----
function scorcher(area) {
  const x = area.to - 62
  // round, pulsing rings of glow around the sun
  const glow = (radius, opacity, dur) => `<g>${discRows(8, 8, radius, 1, '#FFB347', opacity)}<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values=".5;1;.5"/></g>`
  const rays = [[-9, 6], [25, 6], [8, -9], [8, 25], [-4, -4], [22, -4], [-4, 18], [22, 18]].map(([dx, dy]) => r(dx, dy, 3, 3, '#FF9F1C')).join('')
  return `<g transform="translate(${px(x)} 8) scale(1.6)">` + glow(19, 0.1, 2.4) + glow(14, 0.16, 1.8) +
    `<g>${r(0, 0, 16, 16, '#FF9F1C') + r(2, 2, 12, 12, '#FFC93C') + r(4, 4, 8, 8, '#FFE58A') + rays}` +
    `<animateTransform attributeName="transform" type="rotate" dur="30s" repeatCount="indefinite" values="0 8 8;360 8 8"/></g></g>`
}

// ---- A heat wave: the air ripples like a mirage. Rows of wavy light sway side to side, out of step with each other,
// thickest near the ground, over a warm orange haze ----
function shimmer(rand, area) {
  const haze = [0.45, 0.6, 0.75, 0.9].map((top, i) => `<rect x="0" y="${px(area.ground * top)}" width="${px(area.to + 4)}" height="${px(area.ground * 0.15 + (i === 3 ? area.bottom - area.ground + 1 : 0))}" fill="#FF8C2A" fill-opacity="${[0.06, 0.1, 0.15, 0.21][i]}"/>`).join('')
  const out = [haze]
  const rows = 5
  for (let row = 0; row < rows; row++) {
    const y = area.ground * (0.5 + row * 0.11)
    const strength = 0.1 + row * 0.05
    const dur = between(rand, 1.6, 2.6)
    // a ripple: short dashes along a gentle wave
    let dashes = ''
    for (let x = -10 + row * 7; x < area.to + 10; x += between(rand, 20, 34)) {
      const lift = Math.sin((x / 22) + row) * 1.6
      dashes += r(x, y + lift, between(rand, 8, 16), 1.3, '#FFE2B8', ` fill-opacity="${px(strength)}"`)
    }
    out.push(`<g><g>${dashes}<animateTransform attributeName="transform" type="translate" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="0 0;5 -0.8;0 0;-5 0.8;0 0"/></g><animate attributeName="opacity" dur="${px(dur * 1.3)}s" repeatCount="indefinite" values=".6;1;.6"/></g>`)
  }
  return out.join('')
}

// ---- Extreme cold: the screen frosts over like a frozen window. Feathery frost ferns grow in from every edge,
// thickest in the corners and thinning toward a clear middle, in pale cyan and white pixels ----
function frostedGlass(rand, area) {
  const W = area.to + 4
  const H = area.bottom + 1
  const cx = W / 2
  const cy = H / 2
  const CELL = 1.6
  // How far toward the edge a point is: 0 in the middle, 1 at the edge of the clear oval and beyond
  const edgeness = (x, y) => Math.max(Math.abs(x - cx) / (W / 2), Math.abs(y - cy) / (H / 2)) ** 2 * 0.7 + (((x - cx) / (W / 2)) ** 2 + ((y - cy) / (H / 2)) ** 2) * 0.3
  const snap = (v) => Math.round(v / CELL) * CELL
  // One fern: a stem reaching inward with feathery side branches, as tiny pixel squares gathered into one path
  const fern = (x0, y0, angle, length) => {
    const cells = new Set()
    const dot = (x, y) => cells.add(`${snap(x)},${snap(y)}`)
    const ux = Math.cos(angle)
    const uy = Math.sin(angle)
    for (let t = 0; t < length; t += CELL) {
      dot(x0 + ux * t, y0 + uy * t)
      if (Math.round(t / CELL) % 3 === 0 && t > CELL) {
        const side = (length - t) * 0.45
        for (const turn of [0.8, -0.8]) {
          const bx = Math.cos(angle + turn)
          const by = Math.sin(angle + turn)
          for (let k = CELL; k < side; k += CELL) dot(x0 + ux * t + bx * k, y0 + uy * t + by * k)
        }
      }
    }
    return [...cells].map((key) => { const [x, y] = key.split(','); return `M${x} ${y}h${CELL}v${CELL}h-${CELL}z` }).join('')
  }
  let pale = ''
  let bright = ''
  // Seed ferns along all four edges; more of them, and longer, near the corners
  const seeds = []
  const along = (count, place) => { for (let i = 0; i < count; i++) seeds.push(place(rand())) }
  along(Math.round(W / 5), (t) => [t * W, between(rand, -2, 4)])
  along(Math.round(W / 5), (t) => [t * W, H - between(rand, -2, 4)])
  along(Math.round(H / 3.5), (t) => [between(rand, -2, 4), t * H])
  along(Math.round(H / 3.5), (t) => [W - between(rand, -2, 4), t * H])
  // extra clusters packed into the four corners
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) for (let k = 0; k < 6; k++) seeds.push([x + (x ? -1 : 1) * between(rand, 0, 14), y + (y ? -1 : 1) * between(rand, 0, 10)])
  for (const [x, y] of seeds) {
    const cornerness = Math.min(1, edgeness(x, y) - 0.4)
    const angle = Math.atan2(cy - y, cx - x) + between(rand, -0.7, 0.7)
    const length = between(rand, 8, 16) + Math.max(0, cornerness) * between(rand, 8, 22)
    const path = fern(x, y, angle, length)
    if (rand() < 0.35) bright += path
    else pale += path
  }
  // a soft glow of frost along the very edges, under the ferns
  // a frosty fog over the whole screen, softly thicker toward the edges (blurred, so it has no hard lines)
  const fog = `<defs><filter id="frostfog" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
    `<rect x="0" y="0" width="${px(W)}" height="${px(H)}" fill="#DCF3FF" fill-opacity=".09"/>` +
    `<rect x="0" y="0" width="${px(W)}" height="${px(H)}" fill="none" stroke="#DCF3FF" stroke-opacity=".35" stroke-width="${px(Math.min(W, H) * 0.35)}" filter="url(#frostfog)"/>`
  const rim = fog
  const frost = rim + `<path d="${pale}" fill="#7FDDF5" fill-opacity=".85"/><path d="${bright}" fill="#F2FDFF" fill-opacity=".95"/>`
  // It frosts over gradually, a few seconds after the cold arrives (not restarted by each redraw)
  return `<g>${frost}<animate attributeName="opacity" dur="5s" begin="-${area.age}s" fill="freeze" values="0;1" keyTimes="0;1" calcMode="spline" keySplines=".3 0 .4 1"/></g>`
}

// ---- A heat wave turned to fire: a row of pixel flames licking up along the bottom, embers drifting up, and a red-orange
// glow that is strongest at the ground ----
function fire(rand, area) {
  const glow = [0.35, 0.55, 0.75, 0.9].map((top, i) => `<rect x="0" y="${px(area.ground * top)}" width="${px(area.to + 4)}" height="${px(area.bottom - area.ground * top + 1)}" fill="#FF4A1A" fill-opacity="${[0.04, 0.06, 0.08, 0.1][i]}"/>`).join('')
  const out = [glow]
  // flames: each a stack of shrinking blocks, red outside to yellow inside, flickering taller and shorter from its base
  for (let x = -4; x < area.to + 4; x += between(rand, 7, 12)) {
    const h = between(rand, 10, 22)
    const w = between(rand, 6, 10)
    const tongue = r(0, -h, w, h, '#E0301E') + r(w * 0.18, -h * 0.75, w * 0.64, h * 0.75, '#FF7A1A') + r(w * 0.32, -h * 0.45, w * 0.36, h * 0.45, '#FFD23F') + r(w * 0.3, -h - 3, w * 0.4, 3, '#E0301E')
    const dur = between(rand, 0.45, 0.9)
    out.push(`<g transform="translate(${px(x)} ${px(area.bottom + 1)})"><g>${tongue}<animateTransform attributeName="transform" type="scale" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="1 1;0.9 1.25;1.05 0.8;1 1"/></g></g>`)
  }
  // embers rising and winking out
  for (let i = 0; i < Math.max(8, Math.round(area.to / 30)); i++) {
    const x = between(rand, 0, area.to)
    const dur = between(rand, 1.8, 3.4)
    const ember = r(0, 0, 2, 2, rand() < 0.5 ? '#FFB347' : '#FFD23F')
    out.push(`<g transform="translate(${px(x)} ${px(area.bottom - 8)})"><g>${ember}<animateTransform attributeName="transform" type="translate" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="0 0;${px(between(rand, -8, 8))} ${px(-area.ground * 0.6)};${px(between(rand, -12, 12))} ${px(-area.ground * 0.95)}"/><animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="1;.8;0"/></g></g>`)
  }
  return out.join('')
}

// ---- Hail: icy balls falling fast and bouncing off the pills and the ground ----
function hail(rand, area) {
  const out = []
  const count = Math.max(10, Math.round(area.to / 24))
  for (let i = 0; i < count; i++) {
    const x = between(rand, 0, area.to)
    const floor = floorAt(area, x)
    const dur = between(rand, 0.9, 1.4)
    const offset = rand() * dur
    const ball = r(0, 0, 3.5, 3.5, '#E8F4FF') + r(0.6, 0.6, 1.4, 1.4, '#FFFFFF') + r(2.2, 2.2, 1.2, 1.2, '#B9D7F2')
    const bounce = between(rand, 5, 10)
    const side = between(rand, -6, 6)
    out.push(fade(drift(ball, [[x, -4], [x, floor - 3.5], [x + side * 0.6, floor - 3.5 - bounce], [x + side, floor - 3.5]], dur, offset), '1;1;1;0', dur, offset))
  }
  return out.join('')
}

// ---- An ice storm: freezing rain, and a glaze of ice over the ground that glints ----
function freezingRain(rand, area) {
  const out = [r(0, 0, area.to + 4, area.bottom + 1, '#BFE3FF', ' fill-opacity=".07"')]
  for (let i = 0; i < Math.min(40, Math.round(area.to / 14)); i++) {
    const x = between(rand, 0, area.to)
    const floor = floorAt(area, x)
    const dur = between(rand, 0.6, 1)
    const offset = rand() * dur
    out.push(fade(drift(r(0, 0, 1.4, 5, '#CFE8FF'), [[x, 2], [x - 3, floor]], dur, offset), '0;1;1;0', dur, offset))
  }
  // the glaze: a shiny strip of ice along the ground with a glint sliding across it
  const glaze = r(area.groundFrom, area.ground - 2, area.to - area.groundFrom, 2.5, '#DDF1FF', ' fill-opacity=".75"')
  const glint = `<g>${r(0, area.ground - 2, 10, 1.2, '#FFFFFF')}<animateTransform attributeName="transform" type="translate" dur="3.2s" repeatCount="indefinite" values="${px(area.groundFrom)} 0;${px(area.to)} 0"/></g>`
  return out.join('') + glaze + glint
}

// ---- A downpour: puddles that slowly fill along the bottom, with rings rippling out where the rain lands ----
function puddles(rand, area) {
  const out = [rain(rand, area, Math.min(70, Math.round(area.to / 9)))]
  const depth = 1.5 + Math.min(1, area.age / 8) * 2.5
  for (let x = area.groundFrom + between(rand, 0, 20); x < area.to - 10; x += between(rand, 30, 60)) {
    const w = between(rand, 18, 34)
    out.push(r(x, area.ground - depth + 1, w, depth, '#5F8FC4', ' fill-opacity=".55"') + r(x + 3, area.ground - depth + 1, w * 0.3, 0.8, '#B9D7F2'))
    for (let k = 0; k < 2; k++) {
      const cx = x + between(rand, 4, w - 4)
      const dur = between(rand, 0.9, 1.5)
      out.push(`<g transform="translate(${px(cx)} ${px(area.ground - depth + 1)})"><g>${r(-1, -0.6, 2, 0.8, '#D6E8FA')}<animateTransform attributeName="transform" type="scale" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="1 1;5 1"/><animate attributeName="opacity" dur="${px(dur)}s" begin="-${px(rand() * dur)}s" repeatCount="indefinite" values="1;0"/></g></g>`)
    }
  }
  return out.join('')
}

// ---- Wildfire smoke: an orange-grey haze over everything (the sun shows through it dim and red) and ash drifting down ----
function smoke(rand, area) {
  // the sun, dim and red through the smoke
  const sunX = area.to - 34
  const dimSun = discRows(sunX, 16, 9, 1.4, '#E2552E', 0.75) + discRows(sunX, 16, 6, 1.4, '#F07A45', 0.5)
  const haze = r(0, 0, area.to + 4, area.bottom + 1, '#B0733F', ' fill-opacity=".3"') + r(0, 0, area.to + 4, area.bottom * 0.5, '#C9874E', ' fill-opacity=".14"')
  const out = [dimSun, haze]
  for (let i = 0; i < Math.max(10, Math.round(area.to / 26)); i++) {
    const x = between(rand, 0, area.to)
    const dur = between(rand, 4, 7)
    const offset = rand() * dur
    const ash = r(0, 0, 2, 1.4, rand() < 0.5 ? '#D9D2C8' : '#8A847C')
    out.push(fade(drift(ash, [[x, -2], [x + between(rand, 6, 20), area.bottom * 0.5], [x + between(rand, 10, 30), area.bottom]], dur, offset), '0;.9;.9;0', dur, offset))
  }
  return out.join('')
}

const SCENES = {
  leaves: (rand, area) => pile(rand, area, 'leaves') + falling(rand, area, 10, leafShape(AUTUMN), [6, 10], 14, 1.6, true),
  snow: (rand, area) => pile(rand, area, 'snow') + falling(rand, area, 22, snowflake, [5, 9], 8),
  flowers: (rand, area) => flowers(rand, area, Math.max(3, Math.round((area.to - area.groundFrom) / 38))),
  summer: (rand, area) => clouds(rand, area) + sun(area),
  sun: (rand, area) => sun(area),
  clouds: (rand, area) => clouds(rand, area),
  raincloud: (rand, area) => stormClouds(rand, area, false),
  rain: (rand, area) => rain(rand, area, Math.min(46, Math.round(area.to / 16))),
  storm: (rand, area) => stormClouds(rand, area, true) + rain(rand, area, Math.min(70, Math.round(area.to / 10))),
  hearts: (rand, area) => hearts(rand, area, 10),
  confetti: (rand, area) => falling(rand, area, 20, confettiBit, [4, 8], 8, 1.3, true),
  caps: (rand, area) => caps(rand, area, 2),
  cordillera: (rand, area) => cordillera(rand, area),
  'fireworks-chile': (rand, area) => fireworks(rand, area, 5, ['#D52B1E', '#2F6FE0', '#F7F5F0']),
  lanterns: (rand, area) => lanterns(rand, area, Math.max(3, Math.round(area.to / 110))),
  'fireworks-usa': (rand, area) => fireworks(rand, area, 6, ['#D8283A', '#F7F5F0', '#3A6FE0']),
  'fireworks-cny': (rand, area) => fireworks(rand, area, 5, ['#E8283E', '#F2C230', '#F7F5F0']),
  'leaves-green': (rand, area) => falling(rand, area, 10, leafShape(GREENS), [6, 10], 14, 1.6, true),
  balloons: (rand, area) => balloons(rand, area, Math.max(4, Math.round(area.to / 90))),
  'confetti-dad': (rand, area) => falling(rand, area, 20, dadBit, [4, 8], 8, 1.3, true),
  pi: (rand, area) => falling(rand, area, 20, piBit, [4, 8], 6, 1.2),
  'confetti-gold': (rand, area) => falling(rand, area, 22, goldBit, [4, 8], 8, 1.3, true),
  'fireworks-ny': (rand, area) => fireworks(rand, area, 6, ['#F2C230', '#D9DEE6', '#F7F5F0']),
  burrow: (rand, area) => burrow(rand, area),
  'papel-picado': (rand, area) => papelPicado(rand, area),
  marigolds: (rand, area) => falling(rand, area, 16, marigoldPetal, [5, 9], 10, 1.4, true),
  'stars-usa': (rand, area) => falling(rand, area, 16, starBit, [5, 9], 10, 1.2, true),
  'rose-petals': (rand, area) => falling(rand, area, 14, rosePetal, [5, 9], 10, 1.4, true),
  party: (rand, area) => falling(rand, area, 26, partyBit, [4, 8], 8, 1.3, true),
  'confetti-mx': (rand, area) => falling(rand, area, 20, mexBit, [4, 8], 8, 1.3, true),
  'fireworks-mx': (rand, area) => fireworks(rand, area, 5, ['#1E8A4C', '#F7F5F0', '#D8283A']),
  galaxy: (rand, area) => stars(rand, area, Math.max(34, Math.round(area.to / 7))) + deathStar(area),
  aurora: (rand, area) => aurora(rand, area),
  meteors: (rand, area) => meteors(rand, area, 4),
  rainbow: (rand, area) => rainbow(rand, area),
  vicecity: (rand, area) => viceCity(rand, area),
  bloodmoon: (rand, area) => lunarEclipse(rand, area),
  fog: (rand, area) => fog(rand, area),
  slimer: (rand, area) => slimer(rand, area),
  blizzard: (rand, area) => blizzard(rand, area),
  frost: (rand, area) => frost(rand, area),
  eclipse: (rand, area) => eclipse(rand, area),
  supermoon: (rand, area) => stars(rand, area, Math.max(28, Math.round(area.to / 8))) + moon(area, { body: '#FFFBE8', rim: '#F1ECCB', crater: '#DAD3AE' }, 1.55),
  harvestmoon: (rand, area) => stars(rand, area, Math.max(28, Math.round(area.to / 8))) + moon(area, { body: '#F2A33A', rim: '#D98A2B', crater: '#BF741F' }, 1.55),
  binary: (rand, area) => falling(rand, area, 24, binaryBit, [4, 8], 4, 1.2),
  'confetti-bf': (rand, area) => falling(rand, area, 22, saleBit, [4, 8], 8, 1.3, true),
  night: (rand, area) => stars(rand, area, Math.max(28, Math.round(area.to / 8))) + moon(area),
  sunrise: (rand, area) => sunrise(area),
  sunset: (rand, area) => sunset(area),
  bats: (rand, area) => bats(rand, area, 3),
  birds: (rand, area) => birds(rand, area, Math.max(1, Math.round(area.to / 260))),
  butterflies: (rand, area) => butterflies(rand, area, 2),
  fireflies: (rand, area) => fireflies(rand, area, Math.max(6, Math.round(area.to / 45))),
  blossoms: (rand, area) => falling(rand, area, 10, blossomPetal, [7, 11], 16, 1.2, true),
  ufo: (rand, area) => ufo(rand, area),
  holi: (rand, area) => holiColours(rand, area),
  bunting: (rand, area) => bunting(rand, area),
  comet: (rand, area) => comet(rand, area),
  fireworks: (rand, area) => fireworks(rand, area, 4),
  'fireworks-canada': (rand, area) => fireworks(rand, area, 5, ['#D6252B', '#F7F5F0']),
  maple: (rand, area) => pile(rand, area, 'maple') + falling(rand, area, 7, mapleShape(), [6, 10], 14, 1.5, true),
  shamrocks: (rand, area) => falling(rand, area, 8, shamrockShape, [7, 11], 12, 1.4),
  tree: (rand, area) => christmasTree(rand, area),
  presents: (rand, area) => presents(rand, area, 3),
  eggs: (rand, area) => eggs(rand, area, Math.max(2, Math.round((area.to - area.groundFrom) / 90))),
  poppies: (rand, area) => pile(rand, area, 'poppies') + falling(rand, area, 8, petalShape, [8, 12], 10, 1.3),
  diyas: (rand, area) => diyas(rand, area),
  'fireworks-diwali': (rand, area) => fireworks(rand, area, 5, ['#F2C230', '#F25C8B', '#F28A2E', '#F7F5F0']),
  crescent: (rand, area) => crescent(rand, area),
  'lanterns-eid': (rand, area) => eidLanterns(rand, area, Math.max(3, Math.round(area.to / 110))),
  blackout: (rand, area) => blackout(area),
  icicles: (rand, area) => icicles(rand, area),
  scorcher: (rand, area) => scorcher(area),
  shimmer: (rand, area) => shimmer(rand, area),
  frostedglass: (rand, area) => frostedGlass(rand, area),
  fire: (rand, area) => fire(rand, area),
  hail: (rand, area) => hail(rand, area),
  freezingrain: (rand, area) => freezingRain(rand, area),
  puddles: (rand, area) => puddles(rand, area),
  smoke: (rand, area) => smoke(rand, area),
  // menorah-1 to menorah-8: the menorah with that many candles lit
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((lit) => [`menorah-${lit}`, (rand, area) => menorah(area, lit)])),
}

export const SCENE_IDS = Object.keys(SCENES)
// Scenes drawn in front of him instead of behind: the frost on the window he is behind, the flames he stands behind
export const FRONT_SCENES = new Set(['frostedglass', 'fire'])
// Scenes whose things pile up on the pills and along the bottom: they need a little room under the pills
export const PILING_SCENES = new Set(['leaves', 'snow', 'maple', 'poppies'])

// The scene each season shows when no holiday outfit is on
export const SEASON_SCENES = { fall: ['leaves'], winter: ['snow'], spring: ['flowers', 'blossoms'], summer: ['summer'] }

// Draw the scenes behind him. width and height are the strip's; from is where things may start (right of the pills);
// ground is the line his feet are on.
// How long the current set of scenes has been showing, so one-off growth is not restarted by each redraw
const sceneClock = { key: '', since: 0 }
const GROWN_AFTER = 8

// clockScenes: the day's whole set of scenes, when only some of them are drawn here (the rest are drawn in front of him),
// so splitting them does not restart the clock
export function sceneSvg(scenes, { width, height, from = 0, ground = height, perches = [], pillsEnd = 0, wind = 0, clockScenes = scenes }) {
  if (!scenes || scenes.length === 0) return ''
  // Things in the sky and falling may be anywhere; things on the ground keep right of the pills (from)
  const key = (clockScenes ?? scenes).join('|')
  if (key !== sceneClock.key) {
    sceneClock.key = key
    sceneClock.since = Date.now()
  }
  const age = Math.min(GROWN_AFTER, Math.floor((Date.now() - sceneClock.since) / 1000))
  const area = { age, from: 0, groundFrom: Math.max(0, from), to: width - 4, height: ground, ground, perches, pillsEnd, wind, bottom: height - 1, scenes }
  if (area.to - area.groundFrom < 40) return ''
  const body = scenes.map((id, index) => SCENES[id]?.(seeded(7919 * (index + 1) + id.length * 31), area) ?? '').join('')
  return `<g shape-rendering="crispEdges" pointer-events="none">${body}</g>`
}
