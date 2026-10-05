// Pure drawing code for the desktop app: Clawd as a smooth vector drawing that animates
// itself with SVG animation, so the mod only redraws when his look changes.
//
// The shapes are the same plain rectangles as the website's Clawd (credit: ayotomcs.me/claude-mascot).
// The motion borrows the ideas from the Codrops write-up of those animations: anticipation before a
// jump, body, eyes and legs moving as one beat, legs planted on a floor, hands moving against the body,
// and frames held longer where the effort is.
//
// It never calls Claude Code, so plain node can test it.
import { bigCanadianFlag, bigChileanFlag, bigChineseFlag, bigMexicanFlag, bigUsFlag, heartEye, OUTFITS } from './outfits.mjs'
import { FRONT_SCENES, PILING_SCENES, sceneSvg } from './scenery.mjs'
import { CHIP_HEIGHT, chipsSvg, fitChips, GLOW_PAD } from './chips.mjs'
import { COLOURS as SHEET_COLOURS, FLAG, GYM } from './sheets.mjs'
import { digitsSvg } from './pixelfont.mjs'
import { EVENT_MS } from './life.mjs'

const EVENT_SECONDS = Object.fromEntries(Object.entries(EVENT_MS).map(([name, ms]) => [name, ms / 1000]))

// One grid cell of his body is 5.25 drawing units. At each size a cell is a whole number of half-pixels, so his
// pixel art stays crisp on a sharp display: small 2px, normal 2.5px, big 3px.
export const SIZES = { small: 2 / 5.25, normal: 2.5 / 5.25, big: 3 / 5.25 }
export const UNIT = SIZES.normal
export const COLUMN_PX = 8
// How far above his feet the drawing reaches: enough for the dots, cap, alarm, plates and confetti. The flag
// pole is taller, so the flag gets a taller picture while it plays.
export const TOP = -46
export const TOP_TALL = -74
const TALL_LOOKS = new Set(['flag', 'think', 'task', 'permission', 'asking', 'pop', 'hello', 'bye', 'folder', 'auto', 'send', 'receive', 'glitch', 'buff', 'ascend', 'fall', 'firstsnow', 'cheer', 'rocket', 'trophy', 'startled', 'unbox', 'mail', 'music', 'blush', 'listen', 'mog'])
export const topFor = (state) => (TALL_LOOKS.has(state) ? TOP_TALL : TOP)
export const SPRITE_UNITS = 107

const SKIN = '#DD775B'
const DARK = '#C4553D'
const EYE = '#191919'
const CREAM = '#F3EFE6'
const PAPER_SHADE = '#D9D3C3'
const GREEN = '#7CC47F'
const SWEAT = '#6EC6FF'
const SLEEP_BLUE = '#5B63C8'
const BLANKET = '#6C8FD6'
const BLANKET_STRIPE = '#4F6FB8'
const Z_COLOR = '#AFC0FF'
const CONFETTI = ['#DD775B', '#E7B04A', '#5E8C6A', '#2F2F2A', '#C4553D']

const LEG_X = [11, 32, 64, 85]
const LEG_H = 26
const HIP = 60
const FLOOR = 86

// Easings as cubic curves for SVG animation, named after the GSAP eases they stand in for
const EASE = {
  lin: '0 0 1 1',
  p2out: '.25 .46 .45 .94',
  p2in: '.55 .085 .68 .53',
  p2io: '.455 .03 .515 .955',
  p3in: '.55 .055 .675 .19',
  sout: '.39 .575 .565 1',
  sin: '.47 0 .745 .715',
  sio: '.445 .05 .55 .95',
  back: '.2 .9 .35 1',
}

const n = (value) => +value.toFixed(3)

function rect(x, y, w, h, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra ? ' ' + extra : ''}/>`
}

// One animation. frames: [[seconds, value, easeIntoThisFrame?], ...], first at 0, last at dur.
// type: translate | rotate | scale (moves the group) or the name of an attribute such as opacity or width.
function anim(type, dur, frames, o = {}) {
  const times = frames.map((f) => n(f[0] / dur))
  const values = frames.map((f) => f[1])
  const splines = frames.slice(1).map((f) => EASE[f[2] ?? 'lin'])
  const tag = ['translate', 'rotate', 'scale'].includes(type)
    ? `<animateTransform attributeName="transform" type="${type}"`
    : `<animate attributeName="${type}"`
  const repeat = o.once ? ' fill="freeze"' : ' repeatCount="indefinite"'
  return (
    `${tag} dur="${n(dur)}s" begin="${n(o.begin ?? 0)}s"${repeat} calcMode="spline" ` +
    `keyTimes="${times.join(';')}" keySplines="${splines.join(';')}" values="${values.join(';')}"/>`
  )
}

// Wrap drawing in a static transform (outermost) and then in animated groups (first = outer).
function wrap(inner, staticTransform, ...anims) {
  let current = inner
  for (let i = anims.length - 1; i >= 0; i--) current = `<g>${current}${anims[i]}</g>`
  return staticTransform ? `<g transform="${staticTransform}">${current}</g>` : current
}

function legs(o = {}) {
  const k = o.k ?? 1
  const hip = HIP + (o.hipDy ?? 0)
  const parts = LEG_X.map((x, i) => {
    const cx = x + 5.5
    if (o.perLeg) return wrap(rect(-5.5, -LEG_H, 11, LEG_H, SKIN), `translate(${cx} ${FLOOR})`, ...o.perLeg(i))
    const shape = rect(-5.5, 0, 11, LEG_H, SKIN)
    if (o.hipAnim) return wrap(shape, `translate(${cx} ${hip})`, ...o.hipAnim(i))
    if (!o.period) return wrap(shape, `translate(${cx} ${hip}) scale(1 ${k})`)
    const period = o.period
    const low = n(k * (o.squash ?? 0.45))
    const frames = [
      [0, `1 ${k}`],
      [period / 4, `1 ${low}`, 'p2out'],
      [period / 2, `1 ${k}`, 'p2in'],
      [period, `1 ${k}`],
    ]
    return wrap(shape, `translate(${cx} ${hip})`, anim('scale', period, frames, { begin: i % 2 ? period / 2 : 0 }))
  })
  return `<g clip-path="url(#floor)">${parts.join('')}</g>`
}

function blink(cycle, at) {
  return anim('scale', cycle, [
    [0, '1 1'],
    [at, '1 1'],
    [at + 0.07, '1 .12', 'p2out'],
    [at + 0.14, '1 1', 'p2in'],
    [cycle, '1 1'],
  ])
}

// eyes: { gaze: [anims], size: static scale of each eye, blinkCycle, blinkAt }
// An X for an eye: two diagonals of small blocks, for when he has run out of limit
function crossEye() {
  const step = 2.2
  const blocks = Array.from({ length: 5 }, (_, i) => rect(-5.5 + i * step, -5.5 + i * step, 2.8, 2.8, EYE) + rect(-5.5 + i * step, 2.7 - i * step, 2.8, 2.8, EYE)).join('')
  return `<g data-eyes="x">${blocks}</g>`
}

function eyes(o = {}) {
  const size = o.size ?? 1
  const scaleAnims = o.scaleAnims ?? (o.blink === false ? [] : [blink(o.blinkCycle ?? 3.7, o.blinkAt ?? 2.2)])
  const eyeAt = (x) =>
    wrap(
      wrap(o.cross ? crossEye() : activeOutfit?.heartEyes ? heartEye() : o.colour ? rect(-5.5, -5.5, 11, 11, EYE).replace('/>', `>${o.colour}</rect>`) : rect(-5.5, -5.5, 11, 11, EYE), `scale(${size} ${o.lid ?? size})`, ...scaleAnims),
      `translate(${x + 5.5} 16.5)`,
    )
  return wrap(eyeAt(21) + eyeAt(75), '', ...(o.gaze ?? []))
}

function hand(side, o = {}) {
  const x = side === 'left' ? 0 : 85
  const stroke = o.hold ? ` stroke="${DARK}" stroke-width="1.6"` : ''
  // An outfit with sleeves puts them over the inner part of the hand, inside the hand's own group so they move with it
  const block = o.shape ?? rect(x, 21, 22, 23, SKIN, stroke.trim()) + (activeOutfit?.sleeve?.(side) ?? '')
  return wrap((o.attach ?? '') + block + (o.carry ?? ''), o.at ?? '', ...(o.anims ?? []))
}

// The whole figure. o: { legs, eyes, left, right, worn, held, upperAt, upper: [anims], props }
// A hand with over: true is drawn on top of the held item (the hand with the pencil).
const HELD_FIT = 'translate(53.5 52) scale(1.12) translate(-53.5 -52)'

// The outfit being drawn right now (set by figureFor, which draws one figure at a time). A hat gives way to a nightcap.
let activeOutfit = null
// Which worried look is being drawn (tired, strained or critical), so the hat can react to it
let activeMood = null

// A hat droops when he is tired, trembles when he is strained, and jumps when the alert goes off
function hatReacts(head) {
  if (!head || activeMood === null) return head
  // Out of limit, the hat has been knocked askew and hangs there
  if (activeMood === 'limit') return wrap(head, 'rotate(14 54 0) translate(3 3)')
  const loopAnim = (type, dur, values) => `<animateTransform attributeName="transform" type="${type}" dur="${dur}s" repeatCount="indefinite" values="${values}"/>`
  if (activeMood === 'tired') return `<g>${head}${loopAnim('rotate', 4, '0 54 0;6 54 0;0 54 0')}</g>`
  if (activeMood === 'strained') return `<g>${head}${loopAnim('translate', 0.3, '0 0;-1.5 0;1.5 0;0 0')}</g>`
  return `<g>${head}${loopAnim('translate', 0.8, '0 0;0 -7;0 0;0 0')}</g>`
}

function figure(o) {
  const outfit = activeOutfit
  const left = o.left ?? {}
  const right = o.right ?? {}
  // o.behind is drawn first, so it is hidden by his body (the antenna rising from behind his head)
  const core = (o.behind ?? '') + rect(11, 0, 85, 65, SKIN) + (o.worn ?? '') + (outfit?.body ?? '') + eyes(o.eyes) + (o.worn ? '' : wrap(hatReacts((activeMood === 'limit' && outfit?.limitHead !== undefined ? outfit.limitHead : outfit?.head) ?? ''), '', ...(o.headAnims ?? [])))
  const held = (o.held ? wrap(o.held, HELD_FIT, ...(o.heldAnims ?? [])) : '') + (o.heldRaw ?? '')
  // What the outfit has him hold (a flag, a lantern, a rose) rides in his right hand, so it goes wherever the hand goes, with the pole through his grip
  const carry = right.carry ?? (o.ownProps || !outfit?.props ? '' : `<g transform="translate(-6 0)">${outfit.props}</g>`)
  const rightHand = { ...right, carry }
  const under = (left.over ? '' : hand('left', left)) + (right.over ? '' : hand('right', rightHand))
  const over = (left.over ? hand('left', left) : '') + (right.over ? hand('right', rightHand) : '')
  const upper = wrap(core + under + held + over, o.upperAt ?? '', ...(o.upper ?? []))
  const whole = legs(o.legs) + upper + (o.props ?? '')
  // A hopping outfit (Leap Day) bounces the whole figure now and then
  // A heat wave makes him waver, as things do through hot air
  // An ice storm makes him slip now and then, arms out, then catch himself (around his feet)
  const slipping = (inner) => outfit?.slip ? wrap(inner, '', anim('rotate', 3, [[0, '0 53 86'], [1.6, '0 53 86'], [1.8, '-9 53 86', 'p2out'], [2.0, '7 53 86', 'sio'], [2.25, '-3 53 86', 'sio'], [2.5, '0 53 86', 'sio'], [3, '0 53 86']])) : inner
  const wavering = outfit?.wobble ? `<g>${whole}<animateTransform attributeName="transform" type="skewX" dur="1.4s" repeatCount="indefinite" values="0;-2.5;0;2.5;0"/></g>` : whole
  return outfit?.hop ? wrap(slipping(wavering), '', anim('translate', 2, [[0, '0 0'], [0.5, '0 0'], [0.8, '0 -10', 'p2out'], [1.1, '0 0', 'p2in'], [2, '0 0']])) : slipping(wavering)
}

const bob = (period, amount = 2) =>
  anim('translate', period, [
    [0, '0 0'],
    [period / 4, `0 ${-amount}`, 'sio'],
    [period / 2, '0 0', 'sio'],
    [(3 * period) / 4, `0 ${-amount}`, 'sio'],
    [period, '0 0', 'sio'],
  ])

const swing = (period, amount, swap) =>
  anim(
    'translate',
    period,
    [
      [0, '0 0'],
      [period / 2, `0 ${amount}`, 'sio'],
      [period, '0 0', 'sio'],
    ],
    { begin: swap ? period / 2 : 0 },
  )

const dust = (period) =>
  [0, 1, 2]
    .map((i) =>
      wrap(
        wrap(rect(0, 0, 7, 7, '#8A8F98'), '', anim('opacity', period, [[0, '0'], [period * 0.2, '.8', 'lin'], [period, '0', 'p2out']], { begin: (i * period) / 3 })),
        `translate(${-6 - i * 4} ${FLOOR - 10 - i * 2})`,
        anim('translate', period, [[0, '0 0'], [period, '-12 -4', 'p2out']], { begin: (i * period) / 3 }),
      ),
    )
    .join('')

function drop(x, y, begin = 0) {
  const shape = rect(3, 0, 2, 2, SWEAT) + rect(1, 2, 6, 2, SWEAT) + rect(0, 4, 8, 6, SWEAT) + rect(1, 10, 6, 2, SWEAT)
  return wrap(
    wrap(shape, '', anim('opacity', 1.6, [[0, '0'], [0.1, '1', 'lin'], [1.1, '1'], [1.6, '0', 'lin']], { begin })),
    `translate(${x} ${y})`,
    anim('translate', 1.6, [[0, '0 0'], [1.6, '0 34', 'p2in']], { begin }),
  )
}

const HOLD_LEFT = 'translate(5 30)'
const HOLD_RIGHT = 'translate(-5 30)'

// ---- looks ----

function calmIdle() {
  const T = 4.6
  const lean = (left, right, ease = 'p2io') => [
    [0, left[0]],
    [0.4, left[1], 'p2out'],
    [1.5, left[1]],
    [1.9, right, ease],
    [3.0, right],
    [3.4, left[0], ease],
    [T, left[0]],
  ]
  const rotL = [-7, -8, -8, -9]
  const sclL = [1.35, 1.3, 1.2, 1.15]
  const rotR = [9, 8, 8, 7]
  const sclR = [1.15, 1.2, 1.3, 1.35]
  return figure({
    legs: {
      perLeg: (i) => [
        anim('rotate', T, lean(['0', `${rotL[i]}`], `${rotR[i]}`)),
        anim('scale', T, lean(['1 1', `1 ${sclL[i]}`], `1 ${sclR[i]}`)),
      ],
    },
    upper: [
      anim('translate', T, lean(['0 0', '-3 -5'], '3 -5')),
      anim('rotate', T, lean(['0 53 65', '-3 53 65'], '3 53 65')),
    ],
    eyes: { gaze: [anim('translate', T, lean(['0 0', '-3 0'], '3 0'))], blinkCycle: T, blinkAt: 3.95 },
  })
}

function calmRun(period = 0.4) {
  return figure({
    legs: { period },
    upper: [bob(period)],
    left: { anims: [swing(period, 3, false)] },
    right: { anims: [swing(period, 3, true)] },
    eyes: { blinkCycle: 3.3, blinkAt: 1.4 },
    props: dust(period * 2),
  })
}

function tired(isRun) {
  const period = 0.8
  return figure({
    legs: isRun ? { period, squash: 0.6 } : {},
    upperAt: 'translate(0 5)',
    upper: [isRun ? bob(period, 1.5) : anim('translate', 3.4, [[0, '0 0'], [1.7, '0 2', 'sio'], [3.4, '0 0', 'sio']])],
    left: { at: 'translate(0 7)', anims: isRun ? [swing(period, 3, false)] : [] },
    right: { at: 'translate(0 7)', anims: isRun ? [swing(period, 3, true)] : [] },
    eyes: { lid: 0.55, blinkCycle: 4.1, blinkAt: 2.6 },
    props: drop(100, 2),
  })
}

function strained(isRun) {
  const period = 0.34
  const tremble = anim('translate', 0.18, [[0, '0 0'], [0.045, '-1.4 0', 'sio'], [0.09, '0 0', 'sio'], [0.135, '1.4 0', 'sio'], [0.18, '0 0', 'sio']])
  return figure({
    legs: isRun ? { period, k: 0.55, squash: 0.55, hipDy: 11.7 } : { k: 0.55, hipDy: 11.7 },
    upperAt: 'translate(0 12)',
    upper: [tremble, ...(isRun ? [bob(period, 1.5)] : [])],
    left: { at: 'translate(0 8)' },
    right: { at: 'translate(0 8)' },
    eyes: { lid: 0.5, blinkCycle: 3.1, blinkAt: 1.1 },
    props: drop(100, 6) + drop(-10, 12, 0.8),
  })
}

function critical(isRun) {
  const period = 0.26
  const shake = anim('translate', 0.14, [[0, '0 0'], [0.035, '-1.6 0', 'sio'], [0.07, '0 0', 'sio'], [0.105, '1.6 0', 'sio'], [0.14, '0 0', 'sio']])
  const wave = (begin) => anim('rotate', 0.32, [[0, '-20 11 33'], [0.16, '20 11 33', 'sio'], [0.32, '-20 11 33', 'sio']], { begin })
  const alarm =
    rect(50, -30, 12, 18, '#E03C31') + rect(50, -9, 12, 9, '#E03C31')
  return figure({
    legs: isRun ? { period } : {},
    upper: [shake, ...(isRun ? [bob(period, 2.5)] : [])],
    left: { at: 'translate(0 -19)', anims: [wave(0)] },
    right: { at: 'translate(0 -19)', anims: [wave(0.16)] },
    eyes: { size: 1.35, blinkCycle: 2.4, blinkAt: 1.6 },
    // The alarm mark floats above a hat instead of being hidden behind it
    props: wrap(wrap(alarm, 'translate(-56 10)'), `translate(${activeOutfit?.alarmX ?? 56} ${activeOutfit?.head ? -52 : -10})`, anim('scale', 1.2, [[0, '0.2 0.2'], [0.28, '1.25 1.25', 'back'], [0.45, '1 1', 'p2out'], [1.0, '1 1'], [1.2, '1 1']])),
  })
}

// Out of limit: X eyes, slumped and swaying, arms hanging limp, with dizzy stars circling over his head
function limitReached() {
  const sway = anim('rotate', 3.2, [[0, '-2.5 53.5 65'], [1.6, '2.5 53.5 65', 'sio'], [3.2, '-2.5 53.5 65', 'sio']])
  // Proper stars circling over his head on an oval: each one is bigger and brighter as it swings round the front, smaller and dimmer behind, and twinkles
  const STAR_ROWS = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '.XXX.XXX.', '.XX...XX.', '.X.....X.']
  const cell = 1.6
  const half = (9 * cell) / 2
  const starShape = STAR_ROWS.map((row, i) => [...row.matchAll(/X+/g)].map((run) => rect(-half + run.index * cell, -half + i * cell, run[0].length * cell, cell, i >= 3 && i <= 5 ? '#FFEF8A' : '#FFD23F')).join('')).join('') + rect(-cell / 2, -cell, cell, cell * 2, '#FFFFFF')
  const PERIOD = 2.4
  const path = 'M 46,0 A 46,11 0 1,1 -46,0 A 46,11 0 1,1 46,0 Z'
  const star = (begin) => {
    const depth = anim('scale', PERIOD, [[0, '0.85'], [PERIOD * 0.25, '1.25', 'sio'], [PERIOD * 0.5, '0.85', 'sio'], [PERIOD * 0.75, '0.55', 'sio'], [PERIOD, '0.85', 'sio']], { begin: -begin })
    const shimmer = anim('opacity', 0.9, [[0, '0.8'], [0.45, '1', 'sio'], [0.9, '0.8', 'sio']], { begin: -begin })
    return `<g>${wrap(starShape, '', depth, shimmer)}<animateMotion dur="${PERIOD}s" begin="-${begin}s" repeatCount="indefinite" path="${path}"/></g>`
  }
  const dizzy = `<g transform="translate(53.5 ${activeOutfit?.head ? -46 : -12})">${[0, 0.6, 1.2, 1.8].map(star).join('')}</g>`
  return figure({
    legs: {},
    upperAt: 'translate(0 7)',
    upper: [sway],
    left: { at: 'translate(0 9)' },
    right: { at: 'translate(0 9)' },
    eyes: { cross: true, blink: false },
    props: dizzy,
  })
}

// A proper thought bubble: two small bubbles rising from his head into a big cloud holding three dots that take turns lighting up
const CLOUD_FILL = '#F3EFE6'
const CLOUD_EDGE = '#C9C3B2'
function thoughtBubble() {
  const C = 2.6
  const showAt = (at) => anim('opacity', C, [[0, '0'], [at, '0'], [at + 0.15, '1', 'lin'], [2.1, '1'], [2.3, '0', 'lin'], [C, '0']])
  // The cloud is built from blocks the same size as the ones Clawd is made of, so it looks drawn by the same hand
  const B = 10.5
  const [cx, cy] = [100, -70]
  const cloud = [[1, 0, 4, 1], [0, 1, 6, 1], [1, 2, 4, 1]].map(([c, r, w, h]) => [cx + c * B, cy + r * B, w * B, h * B])
  const grown = cloud.map(([x, y, w, h]) => rect(x - 3, y - 3, w + 6, h + 6, CLOUD_EDGE)).join('')
  const body = cloud.map(([x, y, w, h]) => rect(x, y, w, h, CLOUD_FILL)).join('')
  // Two small bubbles rising from his head, growing as they near the cloud; the one by his head comes first
  const trail = [[98, -14, 5, 0], [103, -28, 8, 0.45]]
    .map(([x, y, size, at]) => wrap(rect(x - 2, y - 2, size + 4, size + 4, CLOUD_EDGE) + rect(x, y, size, size, CLOUD_FILL), '', showAt(at)))
    .join('')
  const dots = [2, 3, 4]
    .map((c, i) => rect(cx + c * B - 2.5, cy + B + (B - 5) / 2, 5, 5, '#6B6A64').replace('/>', `>${anim('opacity', C, [[0, '.3'], [1.2 + i * 0.25, '.3'], [1.35 + i * 0.25, '1', 'lin'], [1.65 + i * 0.25, '.3', 'lin'], [C, '.3']])}</rect>`))
    .join('')
  return trail + wrap(grown + body + dots, '', showAt(0.9))
}

function think(isRun) {
  const period = 0.5
  return figure({
    legs: isRun ? { period } : {},
    upper: [anim('rotate', 3.6, [[0, '-3 53 65'], [1.8, '-5 53 65', 'sio'], [3.6, '-3 53 65', 'sio']]), ...(isRun ? [bob(period, 1.5)] : [])],
    eyes: { gaze: [anim('translate', 3.6, [[0, '-4 -5'], [1.2, '-4 -5'], [1.5, '3 -6', 'p2io'], [2.7, '3 -6'], [3.0, '-4 -5', 'p2io'], [3.6, '-4 -5']])], blinkCycle: 3.6, blinkAt: 3.2 },
    props: thoughtBubble(),
  })
}

// Background tasks running: Claude's coral spark spins beside him with a count badge, and he keeps glancing up at it,
// tapping a foot while he waits for the work to come back
const SPARK = '#D97757'
function spark() {
  const B = 4.5
  const arms = rect(-B / 2, -B * 3.5, B, B * 7, SPARK) + rect(-B * 3.5, -B / 2, B * 7, B, SPARK)
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sy]) => [1.5, 2.5].map((k) => rect(sx * k * B - B / 2, sy * k * B - B / 2, B, B, SPARK)).join('')).join('')
  const core = rect(-B, -B, B * 2, B * 2, '#E8957A')
  return wrap(arms + diag + core, '', anim('rotate', 2.4, [[0, '0 0 0'], [2.4, '360 0 0', 'lin']]), anim('scale', 1.2, [[0, '1 1'], [0.6, '0.86 0.86', 'sio'], [1.2, '1 1', 'sio']]))
}
function taskBadge(count) {
  const text = count > 9 ? '9+' : String(Math.max(1, count))
  const w = text.length * 8 + 6
  return rect(0, 0, w, 15, '#1F1E1D') + rect(1, 1, w - 2, 13, '#2E3A57') + digitsSvg(text, 4, 2.5, 2.2, '#A9C1F5')
}
// The morning version: a mug of coffee in his free hand, sipped every few seconds, with steam curling up
function coffeeMug() {
  const steam = [0, 1].map((i) => wrap(rect(1 + i * 6, 0, 2, 5, '#E9E4D8') + rect(2 + i * 6, -5, 2, 4, '#E9E4D8'), '',
    anim('translate', 2.2, [[0, '0 8'], [2.2, '0 -6', 'lin']], { begin: i * 1.1 }),
    anim('opacity', 2.2, [[0, '0'], [0.5, '.8', 'lin'], [1.6, '.5'], [2.2, '0', 'lin']], { begin: i * 1.1 })))
  return wrap(
    steam.join('') +
    rect(-9, 17, 5, 10, '#F3EFE6') + rect(-6, 20, 2, 4, '#26241F') +
    rect(-4, 12, 17, 18, '#F3EFE6') + rect(-4, 12, 17, 2, '#FFFFFF') + rect(-2, 14, 13, 3, '#5A3A22') + rect(-4, 22, 17, 3, SPARK) + rect(10, 14, 3, 16, '#D8D2C4'),
    'translate(-3 -9) scale(1.4)',
  )
}
function task(isRun, count = 1, coffee = false) {
  const period = 0.5
  const C = 4
  // Every five seconds he brings the mug right up in front of his face, tips it back to drink with his eyes
  // shut happily, then lowers it again
  const S = 5
  const sip = anim('translate', S, [[0, '0 0'], [2.6, '0 0'], [3.05, '34 -7', 'p2io'], [4.0, '34 -7'], [4.45, '0 0', 'p2io'], [S, '0 0']])
  const tip = anim('rotate', S, [[0, '0 3 18'], [2.9, '0 3 18'], [3.2, '48 3 18', 'p2io'], [3.9, '48 3 18'], [4.2, '0 3 18', 'p2io'], [S, '0 3 18']])
  const happyEyes = anim('scale', S, [[0, '1 1'], [3.05, '1 1'], [3.2, '1 .18', 'p2io'], [3.95, '1 .18'], [4.1, '1 1', 'p2io'], [S, '1 1']])
  return figure({
    legs: isRun ? { period } : {},
    // a little tap on the spot while he waits
    upper: isRun ? [bob(period, 1.5)] : [anim('translate', 0.8, [[0, '0 0'], [0.2, '0 -1.5', 'p2out'], [0.4, '0 0', 'p2in'], [0.8, '0 0']])],
    eyes: coffee
      ? { gaze: [anim('translate', S, [[0, '-5 -6'], [2.4, '-5 -6'], [2.8, '0 0', 'p2io'], [4.3, '0 0'], [4.7, '-5 -6', 'p2io'], [S, '-5 -6']])], scaleAnims: [happyEyes] }
      : { gaze: [anim('translate', C, [[0, '-5 -6'], [2.4, '-5 -6'], [2.7, '1 -1', 'p2io'], [3.1, '1 -1'], [3.4, '-5 -6', 'p2io'], [C, '-5 -6']])], blinkCycle: C, blinkAt: 2.3 },
    left: coffee ? { carry: wrap(coffeeMug(), '', tip), anims: [sip], over: true } : {},
    // on his left, clear of the sun and the moon that sit in the right-hand corner of the strip
    props: wrap(spark(), 'translate(-20 -26)') + wrap(taskBadge(count), 'translate(-46 -54)'),
  })
}

function book(isRun) {
  const C = 6.4
  const lines = [
    [26, 41, 22],
    [26, 48, 25],
    [26, 55, 18],
    [26, 62, 23],
  ]
  const begins = [0.3, 1.5, 2.7, 3.9]
  const highlights = lines
    .map(([x, y, w], j) =>
      rect(x, y, w, 3, DARK, `opacity=".9"`).replace('<rect ', '<rect ').replace('/>', `>${anim('width', C, [[0, '0'], [begins[j], '0'], [begins[j] + 1.0, `${w}`, 'lin'], [5.2, `${w}`], [5.3, '0', 'lin'], [C, '0']])}</rect>`),
    )
    .join('')
  const text = lines.map(([x, y, w]) => rect(x, y, w, 3, PAPER_SHADE) + rect(x + 31, y, w - 2, 3, PAPER_SHADE)).join('')
  const flip = wrap(
    rect(0, 36, 30, 34, '#E9E4D6') + rect(4, 41, 20, 3, PAPER_SHADE) + rect(4, 48, 22, 3, PAPER_SHADE),
    'translate(54 0)',
    anim('scale', C, [[0, '1 1'], [5.2, '1 1'], [5.45, '0.02 1', 'sin'], [5.7, '-1 1', 'sout'], [C, '-1 1'], ]),
  )
  const gaze = [[0, '-4 5']]
  begins.forEach((b, j) => {
    gaze.push([b, `-4 ${5 + j}`, 'p2io'], [b + 1.0, `4 ${5 + j}`, 'lin'])
  })
  gaze.push([5.3, '0 5', 'p2io'], [C, '0 5'])
  const held =
    rect(21, 34, 65, 38, '#6B4F3A') + rect(23, 36, 30, 34, CREAM) + rect(54, 36, 30, 34, CREAM) + rect(52.5, 36, 2, 34, PAPER_SHADE) + text + highlights + flip
  const period = 0.4
  return figure({
    legs: isRun ? { period } : {},
    upper: isRun ? [bob(period, 1.5)] : [anim('translate', 3.2, [[0, '0 0'], [1.6, '0 1.5', 'sio'], [3.2, '0 0', 'sio']])],
    held,
    left: { hold: true, at: HOLD_LEFT },
    right: { hold: true, at: HOLD_RIGHT },
    eyes: { gaze: [anim('translate', C, gaze)], blinkCycle: C, blinkAt: 5.0 },
  })
}

function terminal(isRun) {
  const C = 4.4
  const typed = rect(38, 49, 0, 4, '#D9D9D4').replace('/>', `>${anim('width', C, [[0, '0'], [0.3, '0'], [1.5, '30', 'lin'], [4.1, '30'], [4.2, '0', 'lin'], [C, '0']])}</rect>`)
  const cursor = wrap(
    wrap(rect(0, 48, 3, 6, '#D9D9D4'), '', anim('opacity', 0.6, [[0, '1'], [0.3, '1'], [0.3001, '0'], [0.6, '0']])),
    'translate(39 0)',
    anim('translate', C, [[0, '0 0'], [0.3, '0 0'], [1.5, '30 0', 'lin'], [4.1, '30 0'], [4.2, '0 0', 'lin'], [C, '0 0']]),
  )
  const appear = (inner, at) => wrap(inner, '', anim('opacity', C, [[0, '0'], [at, '0'], [at + 0.08, '1', 'lin'], [4.1, '1'], [4.2, '0', 'lin'], [C, '0']]))
  const out =
    appear(rect(28, 57, 34, 3, '#8A8F98'), 1.8) +
    appear(rect(28, 62, 22, 3, '#8A8F98'), 2.0) +
    wrap(
      appear([[70, 62], [73, 65], [76, 62], [79, 59], [82, 56]].map(([x, y]) => rect(x - 4, y, 3, 3, GREEN)).join(''), 2.6),
      '',
    )
  const chevron = rect(28, 47, 3, 3, GREEN) + rect(31, 50, 3, 3, GREEN) + rect(28, 53, 3, 3, GREEN)
  const held =
    rect(23, 34, 62, 38, '#262624') + rect(23, 34, 62, 7, '#3A3A37') + rect(27, 36.5, 2.5, 2.5, '#E5584B') + rect(32, 36.5, 2.5, 2.5, '#E7B04A') + rect(37, 36.5, 2.5, 2.5, '#5E8C6A') +
    chevron + typed + cursor + out
  const tap = (begin) => anim('translate', 0.24, [[0, '0 0'], [0.06, '0 -1.2', 'p2out'], [0.12, '0 0', 'p2in'], [0.24, '0 0']], { begin })
  const period = 0.4
  return figure({
    legs: isRun ? { period } : {},
    upper: isRun ? [bob(period, 1.2)] : [],
    held,
    heldAnims: [tap(0)],
    left: { hold: true, at: HOLD_LEFT },
    right: { hold: true, at: HOLD_RIGHT },
    eyes: { gaze: [anim('translate', C, [[0, '-3 5'], [0.3, '-3 5'], [1.5, '3 5', 'lin'], [1.8, '0 5', 'p2io'], [4.2, '0 5'], [C, '-3 5', 'p2io']])], blinkCycle: C, blinkAt: 3.3 },
  })
}

function notepad(isRun) {
  const C = 5
  const written = [
    [30, 44, 40, 0.2],
    [30, 51, 34, 1.6],
    [30, 58, 38, 3.0],
  ]
    .map(([x, y, w, b]) =>
      rect(x, y, 0, 3, '#3A3A37').replace('/>', `>${anim('width', C, [[0, '0'], [b, '0'], [b + 1.2, `${w}`, 'lin'], [4.7, `${w}`], [4.8, '0', 'lin'], [C, '0']])}</rect>`),
    )
    .join('')
  const held = rect(26, 32, 56, 40, CREAM) + rect(26, 32, 56, 6, '#555') + [32, 40, 48, 56, 64, 72].map((x) => rect(x, 30, 2.4, 6, '#9AA0A6')).join('') + rect(30, 47, 48, 1.4, PAPER_SHADE) + rect(30, 54, 48, 1.4, PAPER_SHADE) + rect(30, 61, 48, 1.4, PAPER_SHADE) + written
  const pencil = wrap(rect(8, -10, 5, 28, '#E7B04A') + rect(8, 18, 5, 6, '#2F2F2A') + rect(8, -14, 5, 4, DARK), 'rotate(32 11 33)')
  const scribble = anim('translate', 0.3, [[0, '0 0'], [0.075, '-5 1.5', 'sio'], [0.15, '0 -1', 'sio'], [0.225, '-5 1.5', 'sio'], [0.3, '0 0', 'sio']])
  const period = 0.4
  return figure({
    legs: isRun ? { period } : {},
    upper: isRun ? [bob(period, 1.2)] : [],
    held,
    left: { hold: true, at: HOLD_LEFT },
    right: { hold: true, over: true, at: HOLD_RIGHT, anims: [scribble] },
    eyes: { gaze: [anim('translate', C, [[0, '-3 5'], [0.2, '-3 5'], [1.4, '3 5', 'lin'], [1.6, '-3 6', 'p2io'], [2.8, '3 6', 'lin'], [3.0, '-3 7', 'p2io'], [4.2, '3 7', 'lin'], [4.8, '0 5', 'p2io'], [C, '0 5']])], blinkCycle: C, blinkAt: 4.4 },
  })
}

// A small seeded generator, so a burst is the same every time it is drawn
function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

// A spray of paper pieces thrown from (x, y): they fly outward and up, tumble, then drop and fade.
// side: 1 throws to the right, -1 to the left, 0 straight up. All of it repeats every `cycle` seconds.
function burst({ x, y, begin, cycle, side, count = 24, seed = 7 }) {
  const rnd = seeded(seed)
  return Array.from({ length: count }, (_, i) => {
    const colour = CONFETTI[i % CONFETTI.length]
    const dx = side * (8 + rnd() * 52) + (rnd() - 0.5) * (side === 0 ? 70 : 22)
    const rise = 14 + rnd() * 14
    const drop = 14 + rnd() * 34
    const flight = 1.0 + rnd() * 0.45
    const t0 = begin + rnd() * 0.07
    const w = 5 + Math.floor(rnd() * 4)
    const h = rnd() < 0.4 ? w + 4 : w
    const flutter = 0.22 + rnd() * 0.16
    const end = Math.min(cycle, t0 + flight)
    const piece = wrap(
      wrap(
        rect(-w / 2, -h / 2, w, h, colour),
        '',
        anim('scale', flutter, [[0, '1 1'], [flutter / 2, '0.15 1', 'sio'], [flutter, '1 1', 'sio']], { begin: rnd() * flutter }),
      ),
      '',
      anim('opacity', cycle, [[0, '0'], [t0, '0'], [t0 + 0.02, '1', 'lin'], [end - 0.25, '1'], [end, '0', 'lin'], [cycle, '0']]),
    )
    return wrap(
      piece,
      `translate(${x} ${y})`,
      anim('translate', cycle, [
        [0, '0 0'],
        [t0, '0 0'],
        [t0 + flight * 0.4, `${n(dx * 0.75)} ${n(-rise)}`, 'sout'],
        [end, `${n(dx)} ${n(drop)}`, 'sin'],
        [cycle, `${n(dx)} ${n(drop)}`],
      ]),
    )
  }).join('')
}

// Reply ready: he winds up, swings an arm up and throws confetti from that hand, then does it with the
// other arm. Standing, he leans into each throw; running, he jumps and throws with both.
// Each 2 second loop ends with both arms down, so the look can hand over to the idle one between throws
function done(isRun) {
  const C = 2.0
  if (!isRun) {
    const throwArm = (at) => [
      [at, '0 0'],
      [at + 0.09, '0 7', 'p2out'],
      [at + 0.3, '0 -40', 'sout'],
      [at + 0.72, '0 -34'],
      [at + 1.0, '0 0', 'p2io'],
    ]
    const arm = (first) => {
      const frames = first ? [...throwArm(0), [1.0, '0 0'], [C, '0 0']] : [[0, '0 0'], [0.8, '0 0'], ...throwArm(0.8).slice(1), [C, '0 0']]
      return anim('translate', C, frames)
    }
    const lean = anim('rotate', C, [
      [0, '0 53 65'], [0.09, '3 53 65', 'p2out'], [0.3, '-5 53 65', 'sout'], [0.72, '-3 53 65'], [0.9, '-1 53 65', 'p2io'],
      [1.1, '5 53 65', 'sout'], [1.52, '3 53 65'], [1.8, '0 53 65', 'p2io'], [C, '0 53 65'],
    ])
    const stomp = (at) => [[at, '1 1'], [at + 0.09, '1 .9', 'p2out'], [at + 0.3, '1 1.04', 'sout'], [at + 0.45, '1 1', 'p2io']]
    return figure({
      legs: {
        hipAnim: (i) => [anim('scale', C, [[0, '1 1'], ...stomp(i < 2 ? 0.8 : 0), [C, '1 1']].sort((p, q) => p[0] - q[0]))],
      },
      upper: [lean],
      left: { anims: [arm(false)] },
      right: { anims: [arm(true)] },
      eyes: { blinkCycle: C, blinkAt: 1.7 },
      props:
        burst({ x: 96, y: -14, begin: 0.3, cycle: C, side: 1, seed: 11 }) +
        burst({ x: 11, y: -14, begin: 1.1, cycle: C, side: -1, seed: 23 }),
    })
  }
  const jump = anim('translate', C, [
    [0, '0 0'], [0.1, '0 8', 'p3in'], [0.2, '0 8'], [0.62, '0 -28', 'sout'], [0.82, '0 0', 'p3in'], [0.9, '0 4', 'p2out'], [1.0, '0 0', 'p2io'], [C, '0 0'],
  ])
  const handsUp = anim('translate', C, [
    [0, '0 0'], [0.1, '0 10', 'p3in'], [0.2, '0 10'], [0.4, '0 -32', 'sout'], [0.82, '0 -32'], [0.9, '0 -16', 'p2out'], [1.0, '0 0', 'p2io'], [C, '0 0'],
  ])
  const stretch = () => [
    anim('scale', C, [[0, '1 1'], [0.1, '1 .6', 'p3in'], [0.2, '1 .6'], [0.4, '1 1.12', 'sout'], [0.82, '1 1.12'], [0.9, '1 .7', 'p2out'], [1.0, '1 1', 'p2io'], [C, '1 1']]),
  ]
  return wrap(
    figure({
      legs: { perLeg: stretch },
      left: { anims: [handsUp] },
      right: { anims: [handsUp] },
      eyes: { blinkCycle: C, blinkAt: 1.5 },
    }),
    '',
    jump,
  ).concat(
    burst({ x: 96, y: -10, begin: 0.45, cycle: C, side: 1, seed: 31 }) + burst({ x: 11, y: -10, begin: 0.45, cycle: C, side: -1, seed: 47 }),
  )
}

function zGlyph(size, color) {
  const u = size
  return [rect(0, 0, 14 * u, 3 * u, color), rect(9 * u, 3 * u, 4 * u, 3 * u, color), rect(5 * u, 6 * u, 4 * u, 3 * u, color), rect(1 * u, 9 * u, 4 * u, 3 * u, color), rect(0, 11 * u, 14 * u, 3 * u, color)].join('')
}

// The nightcap, with its floppy tail swinging a little. Shared by sleeping and by getting into bed.
function sleepCap(swing) {
  return (
    rect(19, -19, 69, 10, SLEEP_BLUE) + rect(30, -29, 47, 10, SLEEP_BLUE) +
    wrap(
      rect(0, 0, 14, 8, SLEEP_BLUE) + rect(12, 4, 12, 8, SLEEP_BLUE) + rect(22, 12, 10, 8, SLEEP_BLUE) + rect(26, 20, 16, 16, CREAM),
      'translate(58 -37)',
      swing,
    ) +
    rect(11, -9, 85, 10, CREAM)
  )
}

function sleepBlanket() {
  return rect(-4, 50, 115, 40, BLANKET) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(4 + i * 14, 50, 7, 40, BLANKET_STRIPE)).join('') + [0, 1, 2, 3, 4, 5].map((i) => rect(6 + i * 19, 46, 14, 5, BLANKET)).join('')
}

function asleep() {
  const C = 4.4
  const breathe = anim('translate', C, [[0, '0 0'], [2.2, '0 2.5', 'sio'], [C, '0 0', 'sio']])
  const cap = sleepCap(anim('rotate', C, [[0, '4 0 8'], [2.2, '-3 0 8', 'sio'], [C, '4 0 8', 'sio']]))
  const blanket = wrap(sleepBlanket(), '', anim('translate', C, [[0, '0 0'], [2.2, '0 1.4', 'sio'], [C, '0 0', 'sio']]))
  const zs = [
    // Each Z sits well clear of the one below it (a glyph is 14 units tall times its size) and only drifts a little
    [104, 10, 0.7, 0],
    [112, -12, 1.0, 1.3],
    [122, -38, 1.3, 2.6],
  ]
    .map(([x, y, s, begin]) =>
      wrap(
        wrap(zGlyph(s, Z_COLOR), '', anim('opacity', 4, [[0, '0'], [0.5, '1', 'lin'], [3, '1'], [4, '0', 'lin']], { begin })),
        `translate(${x} ${y})`,
        anim('translate', 4, [[0, '0 0'], [4, '4 -6', 'sout']], { begin }),
      ),
    )
    .join('')
  return figure({
    legs: { k: 0.3, hipDy: 18.2 },
    upperAt: 'translate(0 21)',
    upper: [breathe],
    left: { at: 'translate(0 12)' },
    right: { at: 'translate(0 12)' },
    worn: cap,
    eyes: { lid: 0.12, blink: false },
    props: blanket + zs,
  })
}

// Looping about 3.2 seconds: a fresh sheet of paper, both hands squeeze it into a ball, he tosses it away, repeat.
function compact() {
  const C = 3.2
  const sheet = wrap(
    rect(-28, -20, 56, 40, CREAM) + [-10, -3, 4, 11].map((y) => rect(-22, y, 44, 1.6, PAPER_SHADE)).join(''),
    'translate(53 52)',
    anim('scale', C, [[0, '1 1'], [0.5, '1 1'], [0.8, '.9 .75', 'p2out'], [1.0, '.8 .85', 'p2io'], [1.2, '.6 .55', 'p2out'], [1.4, '.62 .6', 'p2io'], [1.65, '.4 .4', 'p2out'], [C, '.4 .4']]),
    anim('rotate', C, [[0, '0'], [0.5, '0'], [1.0, '12', 'p2io'], [1.4, '-14', 'p2io'], [1.65, '6', 'p2io'], [C, '6']]),
  )
  const fresh = wrap(sheet, '', anim('opacity', C, [[0, '0'], [0.25, '1', 'lin'], [1.7, '1'], [1.72, '0', 'lin'], [C, '0']]))
  const lump = rect(-9, -8, 18, 16, CREAM) + rect(-12, -4, 24, 9, CREAM) + rect(-5, -12, 11, 6, CREAM) + rect(-9, 2, 10, 5, PAPER_SHADE) + rect(1, -7, 7, 4, PAPER_SHADE) + rect(-6, -3, 5, 2, '#B9B29F')
  const ball = wrap(
    wrap(lump, 'translate(53 52)', anim('translate', C, [[0, '0 0'], [1.7, '0 0'], [2.05, '0 -2', 'p2out'], [2.5, '30 -48', 'p2out'], [2.95, '60 12', 'p2in'], [C, '60 12']]), anim('rotate', C, [[0, '0'], [2.05, '0'], [2.95, '540', 'lin'], [C, '540']])),
    '',
    anim('opacity', C, [[0, '0'], [1.7, '0'], [1.72, '1', 'lin'], [2.8, '1'], [2.95, '0', 'lin'], [C, '0']]),
  )
  const pump = (dx) => anim('translate', C, [[0, '0 0'], [0.5, '0 0'], [0.7, `${dx} -3`, 'p2io'], [0.9, '0 2', 'p2io'], [1.1, `${dx} -3`, 'p2io'], [1.3, '0 2', 'p2io'], [1.5, `${dx} -3`, 'p2io'], [1.7, '0 0', 'p2io'], [C, '0 0']])
  const fling = anim('translate', C, [[0, '0 0'], [0.5, '0 0'], [0.7, '4 -3', 'p2io'], [0.9, '0 2', 'p2io'], [1.1, '4 -3', 'p2io'], [1.3, '0 2', 'p2io'], [1.5, '4 -3', 'p2io'], [1.7, '0 0', 'p2io'], [2.05, '-4 6', 'p2in'], [2.35, '8 -26', 'p2out'], [2.8, '0 0', 'p2io'], [C, '0 0']])
  return figure({
    held: fresh + ball,
    left: { hold: true, at: HOLD_LEFT, anims: [pump(-4)] },
    right: { hold: true, over: true, at: HOLD_RIGHT, anims: [fling] },
    eyes: { gaze: [anim('translate', C, [[0, '0 5'], [1.7, '0 5'], [2.5, '2 -3', 'p2io'], [C, '0 5', 'p2io']])], blinkCycle: C, blinkAt: 2.9 },
  })
}

// Going to bed, one shot of 2.4 seconds: he stands as he is, a nightcap drops onto his head, he settles down
// with his legs tucked, the blanket slides up over him and his eyes droop shut. It ends exactly where the
// sleeping loop begins, so the two join without a jump.
export const BEDTIME_SECONDS = 2.4
function bedtime() {
  const D = BEDTIME_SECONDS
  const once = { once: true }
  const settle = (to) => anim('translate', D, [[0, '0 0'], [1.0, '0 0'], [1.7, to, 'p2io'], [D, to]], once)
  const cap = wrap(
    wrap(
      sleepCap(anim('rotate', 4.4, [[0, '4 0 8'], [2.2, '-3 0 8', 'sio'], [4.4, '4 0 8', 'sio']])),
      '',
      anim('translate', D, [[0, '0 -46'], [0.4, '0 -46'], [0.95, '0 2', 'p3in'], [1.1, '0 -4', 'sout'], [1.25, '0 0', 'p2io'], [D, '0 0']], once),
    ),
    '',
    anim('opacity', D, [[0, '0'], [0.4, '0'], [0.45, '1', 'lin'], [D, '1']], once),
  )
  const blanket = wrap(
    wrap(sleepBlanket(), '', anim('translate', D, [[0, '0 56'], [1.1, '0 56'], [1.8, '0 -3', 'p2out'], [2.1, '0 0', 'p2io'], [D, '0 0']], once)),
    '',
    anim('opacity', D, [[0, '0'], [1.1, '0'], [1.12, '1', 'lin'], [D, '1']], once),
  )
  return figure({
    legs: {
      hipAnim: () => [
        settle('0 18.2'),
        anim('scale', D, [[0, '1 1'], [1.0, '1 1'], [1.7, '1 .3', 'p2io'], [D, '1 .3']], once),
      ],
    },
    upper: [settle('0 21')],
    left: { anims: [settle('0 12')] },
    right: { anims: [settle('0 12')] },
    worn: cap,
    eyes: {
      blink: false,
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.5, '1 .6', 'p2io'], [0.8, '1 1', 'p2io'], [1.2, '1 1'], [1.7, '1 .12', 'p2out'], [D, '1 .12']], once)],
    },
    props: blanket,
  })
}

// One shot, about 1.5 seconds: the cap flies off, the blanket drops, he stretches and ends standing.
function wake() {
  const D = 1.5
  const once = { once: true }
  const rise = anim('translate', D, [[0, '0 21'], [0.45, '0 -4', 'p2out'], [0.9, '0 -4'], [D, '0 0', 'p2io']], once)
  const cap = wrap(
    wrap(
      rect(19, -19, 69, 10, SLEEP_BLUE) + rect(30, -29, 47, 10, SLEEP_BLUE) + rect(11, -9, 85, 10, CREAM) + rect(84, -22, 16, 16, CREAM),
      '',
      anim('rotate', D, [[0, '0 53 -10'], [0.7, '-210 53 -10', 'p2out'], [D, '-210 53 -10']], once),
    ),
    '',
    anim('translate', D, [[0, '0 21'], [0.35, '0 21'], [0.9, '-22 -40', 'sout'], [D, '-26 -14', 'p3in']], once),
    anim('opacity', D, [[0, '1'], [1.1, '1'], [D, '0', 'lin']], once),
  )
  const fade = (from) => anim('opacity', D, [[0, '1'], [from, '1'], [from + 0.3, '0', 'lin'], [D, '0']], once)
  const blanket = wrap(
    wrap(rect(-4, 50, 115, 40, BLANKET) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(4 + i * 14, 50, 7, 40, BLANKET_STRIPE)).join(''), '', fade(0.3)),
    '',
    anim('translate', D, [[0, '0 0'], [0.3, '0 0'], [D, '0 50', 'p3in']], once),
  )
  const handsUp = anim('translate', D, [[0, '0 10'], [0.45, '0 -34', 'p2out'], [0.9, '0 -34'], [D, '0 0', 'p2io']], once)
  const legStretch = anim('scale', D, [[0, '1 .3'], [0.45, '1 1.15', 'p2out'], [0.9, '1 1.15'], [D, '1 1', 'p2io']], once)
  const eyeOpen = anim('scale', D, [[0, '1 .12'], [0.3, '1 .12'], [0.45, '1.25 1.25', 'back'], [0.9, '1.25 1.25'], [D, '1 1', 'p2io']], once)
  return (
    figure({
      legs: { perLeg: () => [legStretch] },
      upper: [rise],
      left: { anims: [handsUp] },
      right: { anims: [handsUp] },
      eyes: { blink: false, gaze: [eyeOpen] },
    }) + cap + blanket
  )
}


// ---- reactions to what Claude Code is doing ----

// Pixel letters, one string per row, X for a filled cell
const PIXEL = {
  '?': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  '!': ['X', 'X', 'X', '.', 'X'],
  check: ['........XX', '.......XX.', 'XX....XX..', '.XX..XX...', '..XXXX....', '...XX.....'],
}
function pixels(rows, x, y, cell, fill) {
  return rows.map((row, r) => [...row.matchAll(/X+/g)].map((run) => rect(n(x + run.index * cell), n(y + r * cell), n(run[0].length * cell), cell, fill)).join('')).join('')
}
// A row of pixel letters with one cell between them
function word(text, x, y, cell, fill) {
  let cursor = x
  return [...text].map((ch) => {
    const out = pixels(PIXEL[ch], cursor, y, cell, fill)
    cursor += (PIXEL[ch][0].length + 1) * cell
    return out
  }).join('')
}
function wordWidth(text, cell) {
  return [...text].reduce((sum, ch) => sum + (PIXEL[ch][0].length + 1) * cell, -cell)
}
// A speech bubble up to his right, with a tail pointing down at his head, holding a short word
function speech(text, cell = 3.4) {
  const w = Math.max(30, wordWidth(text, cell) + 14)
  const h = 7 * cell + 8
  const [x, y] = [100, -38 - h]
  return rect(x - 2, y - 2, w + 4, h + 4, CLOUD_EDGE) + rect(x, y, w, h, CLOUD_FILL) + rect(x + 2, y + h, 9, 5, CLOUD_FILL) + rect(x - 2, y + h + 4, 7, 5, CLOUD_FILL) +
    word(text, n(x + (w - wordWidth(text, cell)) / 2), n(y + (h - (PIXEL[text[0]].length) * cell) / 2), cell, text === '?' ? SPARK : '#3A3A37')
}
const ONCE = { once: true }
const WOOD = '#8B5A3C'
const STEEL = '#9AA0A6'
const INK = '#2F2F2A'

// Waiting for your permission: he holds a "?" sign up high on a stick, swaying it, and keeps checking his watch
function permission() {
  const C = 3.2
  const sway = anim('rotate', 2.4, [[0, '-6 96 32'], [1.2, '6 96 32', 'sio'], [2.4, '-6 96 32', 'sio']])
  const sign = rect(96, -2, 5, 30, WOOD) + rect(81.5, -34, 34, 34, INK) + rect(84, -31.5, 29, 29, CREAM) + pixels(PIXEL['?'], 90, -29, 3.4, SPARK)
  const watch = rect(-1, 30, 24, 6, INK) + rect(6, 27, 10, 11, INK) + rect(7.5, 28.5, 7, 8, '#E7E2D3') + rect(10.5, 29.5, 1.2, 4, INK)
  // He keeps his arm down and turns his wrist up a little, glancing down at the watch
  const check = anim('translate', C, [[0, '0 0'], [1.0, '0 0'], [1.2, '2 -3', 'p2io'], [2.2, '2 -3'], [2.5, '0 0', 'p2io'], [C, '0 0']])
  const tap = (i) => (i === 3 ? [anim('scale', 0.6, [[0, '1 1'], [0.12, '1 .55', 'p2out'], [0.3, '1 1', 'p2in'], [0.6, '1 1']])] : [])
  return figure({
    legs: { hipAnim: tap },
    left: { carry: watch, anims: [check] },
    right: { at: 'translate(6 -34)', over: true, anims: [sway] },
    ownProps: true,
    heldRaw: wrap(sign, 'translate(6 -34)', sway),
    eyes: { gaze: [anim('translate', C, [[0, '0 0'], [1.1, '0 0'], [1.3, '-5 6', 'p2io'], [2.2, '-5 6'], [2.45, '0 0', 'p2io'], [C, '0 0']])], blinkCycle: C, blinkAt: 2.9 },
  })
}

// Claude has questions for you: a speech bubble with a "?" pops over his head while he points at it and tilts his
// head; several questions stack up as several bubbles, with how many on a little badge
function asking(count = 1) {
  const C = 2.8
  const extra = Math.min(2, Math.max(0, count - 1))
  const behind = Array.from({ length: extra }, (_, i) => wrap(rect(98, -68, 38, 32, CLOUD_EDGE) + rect(100, -66, 34, 28, CLOUD_FILL), `translate(${(extra - i) * 7} ${-(extra - i) * 3})`)).join('')
  const badge = count > 1 ? rect(138, -72, 17, 15, '#1F1E1D') + rect(139, -71, 15, 13, SPARK) + digitsSvg(String(Math.min(9, count)), 142.5, -69.5, 2.2, '#FFFFFF') : ''
  const bubble = wrap(behind + speech('?', 3.6) + badge, '', anim('translate', C, [[0, '0 0'], [C / 2, '0 -3', 'sio'], [C, '0 0', 'sio']]))
  const point = anim('translate', 0.7, [[0, '0 0'], [0.35, '1 -3', 'sio'], [0.7, '0 0', 'sio']])
  const finger = rect(99, 6, 6, 16, SKIN)
  return figure({
    upper: [anim('rotate', C, [[0, '-3 53 65'], [C / 2, '3 53 65', 'sio'], [C, '-3 53 65', 'sio']])],
    right: { at: 'translate(8 -34)', over: true, anims: [point] },
    ownProps: true,
    heldRaw: wrap(finger, 'translate(8 -34)', point),
    eyes: { gaze: [anim('translate', C, [[0, '0 0'], [1.4, '0 0'], [1.6, '4 -5', 'p2io'], [2.3, '4 -5'], [2.5, '0 0', 'p2io'], [C, '0 0']])], blinkCycle: C, blinkAt: 1.1 },
    props: bubble,
  })
}

// You said no: a big red rubber stamp comes down and slams an X onto his face, he winces, then shakes it off
function shrug() {
  const D = EVENT_SECONDS.shrug
  const RED = '#E03C31'
  const HIT = 0.5
  const tool = rect(-6, -26, 12, 10, WOOD) + rect(-3, -16, 6, 6, WOOD) + rect(-17, -10, 34, 8, '#7A2E26') + rect(-17, -2, 34, 3, RED)
  const stampDown = wrap(wrap(tool, '', anim('translate', D, [[0, '53.5 -70'], [0.3, '53.5 -40', 'p2out'], [HIT, '53.5 22', 'p3in'], [0.7, '53.5 22'], [0.95, '53.5 -60', 'p2out'], [D, '53.5 -60']], ONCE)), '',
    anim('opacity', D, [[0, '0'], [0.05, '1', 'lin'], [0.85, '1'], [0.95, '0', 'lin'], [D, '0']], ONCE))
  // The X, in blocks along both diagonals across his face; it fades as he shakes it off
  const cross = Array.from({ length: 7 }, (_, i) => rect(n(29 + i * 7.3), n(13 + i * 5.3), 6, 6, RED) + rect(n(29 + i * 7.3), n(45 - i * 5.3), 6, 6, RED)).join('')
  const mark = wrap(cross, '', anim('opacity', D, [[0, '0'], [HIT, '0'], [HIT + 0.02, '.9', 'lin'], [1.3, '.9'], [2.1, '0', 'p2in'], [D, '0']], ONCE))
  const shake = anim('translate', D, [[0, '0 0'], [HIT, '0 0'], [HIT + 0.06, '0 5', 'p2out'], [0.9, '0 0', 'p2io'], [1.2, '0 0'],
    ...[0, 1, 2, 3, 4, 5].map((k) => [n(1.3 + k * 0.12), `${k % 2 ? 4 : -4} 0`, 'sio']), [2.1, '0 0', 'sio'], [D, '0 0']], ONCE)
  return figure({
    upper: [shake],
    left: { anims: [anim('translate', D, [[0, '0 0'], [HIT, '0 0'], [HIT + 0.06, '0 6', 'p2out'], [1.0, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    right: { anims: [anim('translate', D, [[0, '0 0'], [HIT, '0 0'], [HIT + 0.06, '0 6', 'p2out'], [1.0, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    heldRaw: mark,
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 -5', 'p2io'], [HIT, '0 -5'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.25, '1.25 1.25', 'p2out'], [HIT - 0.02, '1.25 1.25'], [HIT, '1 .12', 'lin'], [1.3, '1 .12'], [1.45, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
    props: stampDown,
  })
}

// A command failed: a puff of smoke rises off his head and he droops, then he dusts himself off and perks up
function oops() {
  const D = EVENT_SECONDS.oops
  const puffs = [[34, 0.05, '#8E8E88'], [52, 0.2, '#B3B3AD'], [70, 0.35, '#9E9E98'], [46, 0.55, '#C8C8C2']]
    .map(([x, begin, fill]) => wrap(
      wrap(rect(-7, -7, 14, 14, fill) + rect(-10, -3, 20, 7, fill), '', anim('scale', D, [[0, '.3 .3'], [begin, '.3 .3'], [begin + 1.1, '1.6 1.6', 'p2out'], [D, '1.6 1.6']], ONCE)),
      `translate(${x} -4)`,
      anim('translate', D, [[0, '0 0'], [begin, '0 0'], [begin + 1.2, `${x > 50 ? 6 : -6} -38`, 'p2out'], [D, `${x > 50 ? 6 : -6} -38`]], ONCE),
      anim('opacity', D, [[0, '0'], [begin, '0'], [begin + 0.1, '.85', 'lin'], [begin + 1.2, '0', 'p2in'], [D, '0']], ONCE),
    )).join('')
  const brush = (dx, at) => anim('translate', D, [[0, '0 0'], [0.25, '0 6', 'p2out'], [1.5, '0 6'], [at, '0 0', 'p2io'], [at + 0.15, `${dx} 4`, 'p2io'], [at + 0.3, '0 0', 'p2io'], [at + 0.45, `${dx} 4`, 'p2io'], [at + 0.6, '0 0', 'p2io'], [D, '0 0']], ONCE)
  const specks = [0, 1, 2].map((i) => wrap(rect(0, 0, 4, 4, '#A8A49A'), `translate(${30 + i * 22} 40)`,
    anim('translate', D, [[0, '0 0'], [1.75 + i * 0.12, '0 0'], [2.3 + i * 0.12, `${(i - 1) * 14} 26`, 'p2in'], [D, `${(i - 1) * 14} 26`]], ONCE),
    anim('opacity', D, [[0, '0'], [1.75 + i * 0.12, '0'], [1.8 + i * 0.12, '1', 'lin'], [2.3 + i * 0.12, '0', 'lin'], [D, '0']], ONCE))).join('')
  return figure({
    upper: [anim('translate', D, [[0, '0 0'], [0.3, '0 4', 'p2out'], [1.5, '0 4'], [2.5, '0 -2', 'p2io'], [D, '0 0', 'p2io']], ONCE)],
    left: { anims: [brush(16, 1.6)] },
    right: { anims: [brush(-16, 1.75)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [1.5, '0 5'], [1.7, '0 3', 'p2io'], [2.5, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .5', 'p2io'], [2.4, '1 .5'], [2.6, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
    props: puffs + specks,
  })
}

// Claude's reply failed: he glitches out like a bad video signal (slices jumping sideways, colour ghosts, flicker)
// while his eyes roll round dizzily
function jitter(dur, values, begin = 0) {
  const count = values.split(';').length
  const times = Array.from({ length: count }, (_, i) => n(i / (count - 1))).join(';')
  return `<animateTransform attributeName="transform" type="translate" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times}" values="${values}"/>`
}
function glitch() {
  const roll = anim('translate', 0.9, [[0, '3 0'], [0.225, '0 3', 'sio'], [0.45, '-3 0', 'sio'], [0.675, '0 -3', 'sio'], [0.9, '3 0', 'sio']])
  const body = figure({
    upper: [anim('rotate', 1.6, [[0, '-4 53 65'], [0.8, '4 53 65', 'sio'], [1.6, '-4 53 65', 'sio']])],
    eyes: { gaze: [roll], blink: false },
  })
  const ghost = (colour) => body.replace(/(fill|stroke)="#[0-9A-Fa-f]{6}"/g, `$1="${colour}"`)
  const bands = [[-74, 96, '0 0;-7 0;0 0;0 0;5 0;0 0;0 0;0 0', 0.9], [22, 26, '0 0;0 0;9 0;0 0;0 0;-6 0;0 0;0 0', 0.7], [48, 60, '0 0;0 0;0 0;-5 0;0 0;0 0;8 0;0 0', 1.1]]
  const cuts = bands.map(([y, h], i) => `<clipPath id="glitch${i}"><rect x="-200" y="${y}" width="500" height="${h}"/></clipPath>`).join('')
  const sliced = bands.map(([, , values, dur], i) => `<g clip-path="url(#glitch${i})">${wrap(body, '', jitter(dur, values))}</g>`).join('')
  const lines = [10, 34, 58].map((y, i) => wrap(rect(-10, y, 130, 3, '#38E1FF'), '', anim('opacity', 0.5, [[0, '0'], [0.1, '.5', 'lin'], [0.2, '0', 'lin'], [0.5, '0']], { begin: i * 0.17 }))).join('')
  return `<defs>${cuts}</defs>` +
    `<g opacity=".5">${wrap(ghost('#38E1FF'), '', jitter(0.6, '-4 0;-2 1;-5 0;-3 -1'))}</g>` +
    `<g opacity=".5">${wrap(ghost('#FF3D8B'), '', jitter(0.7, '4 0;3 -1;5 1;2 0'))}</g>` +
    sliced + lines
}

// A task in your list got done: he holds up a sheet and draws a big green check mark on it with a pencil,
// the short stroke down and then the long one up, the line appearing right behind the pencil's tip
function stamp() {
  const D = EVENT_SECONDS.stamp
  // Where the tip rests in his hand, and the three corners of the check on the sheet
  const REST = [83, 59]
  const corners = [[39, 50], [48, 60], [69, 38]]
  const [T0, T1, T2] = [0.5, 0.85, 1.5]
  const segments = [[corners[0], corners[1], T0, T1], [corners[1], corners[2], T1, T2]]
  const ink = segments.flatMap(([[x0, y0], [x1, y1], t0, t1]) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2)
    return Array.from({ length: steps + 1 }, (_, i) => {
      const k = i / steps
      const at = n(t0 + (t1 - t0) * k)
      return wrap(rect(n(x0 + (x1 - x0) * k - 2.5), n(y0 + (y1 - y0) * k - 2.5), 5, 5, '#3FA34D'), '', anim('opacity', D, [[0, '0'], [at, '0'], [at + 0.02, '1', 'lin'], [D, '1']], ONCE))
    })
  }).join('')
  const path = (dx, dy) => anim('translate', D, [[0, `${REST[0] + dx} ${REST[1] + dy}`], [T0 - 0.1, `${corners[0][0] + dx} ${corners[0][1] + dy}`, 'p2io'], [T0, `${corners[0][0] + dx} ${corners[0][1] + dy}`],
    [T1, `${corners[1][0] + dx} ${corners[1][1] + dy}`, 'p2in'], [T2, `${corners[2][0] + dx} ${corners[2][1] + dy}`, 'p2out'], [T2 + 0.15, `${corners[2][0] + dx} ${corners[2][1] + dy}`], [2.0, `${REST[0] + dx} ${REST[1] + dy}`, 'p2io'], [D, `${REST[0] + dx} ${REST[1] + dy}`]], ONCE)
  // A pencil drawn tip-down from its own origin, leaning back toward his hand
  const pencil = wrap(rect(-2.5, 0, 5, 5, '#E58A8A') + rect(-2.5, 5, 5, 2, '#B9B29F') + rect(-2.5, 7, 5, 35, '#E7B04A') + rect(-2.5, 42, 5, 4, '#F3D9A4') + rect(-1.2, 45.5, 2.4, 2.5, INK), 'rotate(25) translate(0 -48)')
  const sheet = rect(26, 30, 56, 44, CREAM) + [38, 45, 66].map((y) => rect(31, y, 46, 2, PAPER_SHADE)).join('')
  return figure({
    held: sheet,
    left: { hold: true, at: HOLD_LEFT },
    // The hand moves exactly with the pencil, holding it a little way up from the tip
    right: { over: true, hold: true, anims: [path(-REST[0], -REST[1])] },
    ownProps: true,
    heldRaw: ink + wrap(pencil, '', path(0, 0)),
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [T0, '-3 5', 'p2io'], [T1, '-2 7', 'p2io'], [T2, '2 3', 'p2io'], [D, '0 2', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [1.6, '1 1'], [1.75, '1 .3', 'p2io'], [2.4, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// Claude sent you a file or published a page: he pulls out a document tied with a bow and holds it out to you,
// with a little sparkle when it is handed over
function present() {
  const D = EVENT_SECONDS.present
  const doc = rect(26, 30, 48, 48, INK) + rect(28.5, 32.5, 43, 43, CREAM) + rect(60, 32.5, 11.5, 11.5, PAPER_SHADE) + [44, 51, 58, 65].map((y, i) => rect(33, y, i === 3 ? 18 : 30, 2.5, PAPER_SHADE)).join('') +
    rect(26, 51, 48, 5, SPARK) + rect(47.5, 30, 5, 48, SPARK) + rect(41, 46, 8, 7, '#E8957A') + rect(51, 46, 8, 7, '#E8957A') + rect(47, 48, 6, 6, '#C4553D')
  const rise = anim('translate', D, [[0, '0 40'], [0.25, '0 40'], [0.65, '0 -4', 'back'], [0.8, '0 0', 'p2io'], [D, '0 0']], ONCE)
  const offer = anim('scale', D, [[0, '1 1'], [1.0, '1 1'], [1.3, '1.18 1.18', 'back'], [2.2, '1.18 1.18'], [D, '1 1', 'p2io']], ONCE)
  const held = wrap(wrap(wrap(doc, 'translate(-50 -54)'), 'translate(50 54)', offer), '', rise, anim('opacity', D, [[0, '0'], [0.25, '0'], [0.3, '1', 'lin'], [D, '1']], ONCE))
  const hands = (dx) => anim('translate', D, [[0, '0 0'], [0.25, '0 40'], [0.65, '0 -4', 'back'], [0.8, '0 0', 'p2io'], [1.0, '0 0'], [1.3, `${dx} -3`, 'back'], [2.2, `${dx} -3`], [D, '0 0', 'p2io']], ONCE)
  const sparkles = [[14, 20], [92, 18], [20, 78], [88, 80]].map(([x, y], i) => wrap(rect(-1.5, -6, 3, 12, '#FFD23F') + rect(-6, -1.5, 12, 3, '#FFD23F'), `translate(${x} ${y})`,
    anim('scale', D, [[0, '0 0'], [1.2 + i * 0.08, '0 0'], [1.4 + i * 0.08, '1.2 1.2', 'p2out'], [1.8 + i * 0.08, '0 0', 'p2in'], [D, '0 0']], ONCE))).join('')
  return figure({
    heldRaw: held,
    left: { hold: true, at: HOLD_LEFT, over: true, anims: [hands(-3)] },
    right: { hold: true, at: HOLD_RIGHT, over: true, anims: [hands(3)] },
    ownProps: true,
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [0.9, '0 4'], [1.2, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [1.25, '1 1'], [1.4, '1 .3', 'p2io'], [2.2, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
    props: sparkles,
  })
}

// Background work came back: the spinning spark bursts like a firework and he gives a thumbs up
function pop() {
  const D = EVENT_SECONDS.pop
  const sparkGone = wrap(wrap(spark(), '', anim('scale', D, [[0, '1 1'], [0.3, '1.5 1.5', 'p2out'], [0.42, '.1 .1', 'p2in'], [D, '.1 .1']], ONCE)), 'translate(-20 -26)',
    anim('opacity', D, [[0, '1'], [0.4, '1'], [0.45, '0', 'lin'], [D, '0']], ONCE))
  const rays = Array.from({ length: 8 }, (_, i) => wrap(wrap(rect(-1.5, -24, 3, 9, i % 2 ? '#FFD23F' : SPARK), '', anim('translate', D, [[0, '0 0'], [0.42, '0 0'], [1.0, '0 -16', 'p2out'], [D, '0 -16']], ONCE),
    anim('opacity', D, [[0, '0'], [0.42, '0'], [0.45, '1', 'lin'], [1.0, '0', 'p2in'], [D, '0']], ONCE)), `translate(-20 -26) rotate(${i * 45})`)).join('')
  const lift = anim('translate', D, [[0, '0 0'], [0.5, '0 0'], [0.75, '8 -36', 'back'], [2.2, '8 -36'], [D, '0 0', 'p2io']], ONCE)
  return wrap(figure({
    right: { anims: [lift] },
    ownProps: true,
    // A thumbs up: the thumb sticks up from the left edge of his fist, and lines across the fist are the curled fingers
    heldRaw: wrap(rect(85, 7, 8, 15, SKIN) + [27, 32, 37].map((y) => rect(95, y, 12, 1.6, DARK)).join(''), '', lift),
    eyes: {
      gaze: [anim('translate', D, [[0, '-5 -6'], [0.6, '-5 -6'], [0.85, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.8, '1 1'], [0.95, '1 .3', 'p2io'], [2.2, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
  }), '', anim('translate', D, [[0, '0 0'], [0.55, '0 0'], [0.72, '0 -8', 'p2out'], [0.9, '0 0', 'p2in'], [D, '0 0']], ONCE)) +
    sparkGone + rays + burst({ x: -20, y: -26, begin: 0.42, cycle: D, side: 0, count: 26, seed: 5 })
}

// ---- Reactions to the work itself ----

// The tests passed: he pumps both fists in the air and hops, and confetti bursts above him
function cheer() {
  const D = EVENT_SECONDS.cheer
  const pump = (dx) => anim('translate', D, [[0, '0 0'], [0.25, `${dx} -34`, 'back'], [0.6, `${dx} -26`, 'sio'], [0.9, `${dx} -34`, 'sio'], [1.2, `${dx} -26`, 'sio'], [1.5, `${dx} -34`, 'sio'], [2.3, `${dx} -34`], [D, '0 0', 'p2io']], ONCE)
  const hop = anim('translate', D, [[0, '0 0'], [0.2, '0 0'], [0.4, '0 -10', 'p2out'], [0.6, '0 0', 'p2in'], [0.8, '0 -8', 'p2out'], [1.0, '0 0', 'p2in'], [D, '0 0']], ONCE)
  return wrap(figure({
    ownProps: true,
    left: { hold: true, anims: [pump(-4)] },
    right: { hold: true, anims: [pump(4)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.2, '1 .3', 'p2io'], [2.4, '1 .3'], [D, '1 1', 'p2io']], ONCE)] },
  }), '', hop) + burst({ x: 53, y: -16, begin: 0.3, cycle: D, side: 0, count: 30, seed: 11 })
}

// The tests failed: he slaps a hand over his face, sags, shakes his head, and a bead of sweat runs down
function facepalm() {
  const D = EVENT_SECONDS.facepalm
  const palm = anim('translate', D, [[0, '0 0'], [0.35, '-17 -15', 'p2out'], [2.4, '-17 -15'], [D, '0 0', 'p2io']], ONCE)
  const sag = anim('translate', D, [[0, '0 0'], [0.4, '0 3', 'p2io'], [0.9, '-1.5 3', 'sio'], [1.4, '1.5 3', 'sio'], [1.9, '-1.5 3', 'sio'], [2.4, '0 3', 'sio'], [D, '0 0', 'p2io']], ONCE)
  return figure({
    ownProps: true,
    right: { hold: true, over: true, anims: [palm] },
    upper: [sag],
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.35, '1 .2', 'p2io'], [2.4, '1 .2'], [D, '1 1', 'p2io']], ONCE)] },
    props: drop(8, -4, 0.5),
  })
}

// A commit: he holds a cardboard box, folds its flaps shut, tapes it, and a green check seal stamps onto it
function ship() {
  const D = EVENT_SECONDS.ship
  const BOX = '#C8935A'
  const BOX_DARK = '#A8743F'
  const box = rect(28, 36, 52, 38, BOX) + rect(28, 36, 52, 3, BOX_DARK) + rect(53, 39, 2, 35, BOX_DARK)
  const flaps = wrap(wrap(rect(28, 22, 25, 14, BOX_DARK) + rect(55, 22, 25, 14, BOX_DARK), 'translate(0 -36)'), 'translate(0 36)',
    anim('scale', D, [[0, '1 1'], [0.5, '1 1'], [0.85, '1 0', 'p2in'], [D, '1 0']], ONCE))
  const tape = wrap(rect(26, 34, 56, 5, '#E8D9A8'), '', anim('opacity', D, [[0, '0'], [1.0, '0'], [1.05, '1', 'lin'], [D, '1']], ONCE))
  const seal = rect(46, 48, 16, 16, '#3FA34D') + rect(48, 46, 12, 20, '#3FA34D') + rect(44, 50, 20, 12, '#3FA34D') + rect(49, 56, 3, 3, CREAM) + rect(51, 58, 3, 3, CREAM) + rect(53, 55, 3, 3, CREAM) + rect(55, 52, 3, 3, CREAM)
  const stamped = wrap(wrap(seal, 'translate(-54 -56)'), 'translate(54 56)', anim('scale', D, [[0, '0 0'], [1.5, '0 0'], [1.7, '1.25 1.25', 'p2out'], [1.85, '1 1', 'p2io'], [D, '1 1']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: box + flaps + tape + stamped,
    left: { hold: true, at: HOLD_LEFT, over: true },
    right: { hold: true, at: HOLD_RIGHT, over: true },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [1.9, '0 5'], [2.2, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [2.1, '1 1'], [2.25, '1 .3', 'p2io'], [2.9, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// A push: a little rocket on a launch pad beside him; he points, the engine lights, and it blasts off up out of sight
function rocket() {
  const D = EVENT_SECONDS.rocket
  const X = 120
  const body = rect(-5, 0, 10, 22, '#F3EFE6') + rect(-3, -6, 6, 6, '#E8574A') + rect(-1.5, -9, 3, 3, '#E8574A') + rect(-2.5, 6, 5, 5, '#6EC6FF') + rect(-9, 14, 4, 9, '#E8574A') + rect(5, 14, 4, 9, '#E8574A')
  const flicker = wrap(wrap(rect(-3, 22, 6, 6, '#FFD23F') + rect(-2, 28, 4, 5, '#F28A2E'), 'translate(0 -22)'), 'translate(0 22)', anim('scale', 0.18, [[0, '1 1'], [0.09, '1 1.5'], [0.18, '1 1']]))
  const flame = wrap(flicker, '', anim('opacity', D, [[0, '0'], [0.8, '0'], [0.85, '1', 'lin'], [D, '1']], ONCE))
  const launch = anim('translate', D, [[0, `${X} 52`], [1.1, `${X} 52`], [1.3, `${X} 49`, 'sin'], [D - 0.4, `${X} -150`, 'p3in'], [D, `${X} -150`]], ONCE)
  const puffs = [-12, -4, 4, 12].map((dx, i) => wrap(wrap(rect(-5, -5, 10, 10, '#C9CDD6'), '', anim('scale', D, [[0, '0 0'], [0.9 + i * 0.05, '0 0'], [1.6, '1.4 1', 'p2out'], [D, '1.8 1.2']], ONCE),
    anim('opacity', D, [[0, '0'], [0.9, '0'], [1.0, '.9', 'lin'], [D, '0', 'p2in']], ONCE)), `translate(${X + dx} 80)`)).join('')
  const pad = rect(X - 13, 84, 26, 2.5, '#8A8F98')
  const point = anim('translate', D, [[0, '0 0'], [0.3, '6 -10', 'p2out'], [1.2, '6 -10'], [1.6, '0 0', 'p2io'], [D, '0 0']], ONCE)
  return figure({
    ownProps: true,
    right: { anims: [point] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '5 3', 'p2io'], [1.2, '5 3'], [1.8, '4 -6', 'p2io'], [D, '3 -7']], ONCE)] },
  }) + pad + wrap(body + flame, '', launch) + puffs
}

// A web search: he opens a laptop with its screen facing him, types away with his hands peeking out at the sides,
// and the screen's blue glow lights up his face
const CLAUDE_SPARK = ['....X....', '.X..X..X.', '..X.X.X..', '...XXX...', 'XXXXXXXXX', '...XXX...', '..X.X.X..', '.X..X..X.', '....X....']
function browse() {
  const D = EVENT_SECONDS.browse
  const LID = '#B8BDC4'
  // The back of the lid (the screen faces him), with the Claude spark on it.
  // The spark is Anthropic's mark: fine on your own copy, and the one line to swap before a public release.
  const lid = rect(24, 34, 60, 39, '#8E949C') + rect(26, 36, 56, 35, LID) + rect(26, 36, 56, 2, '#D3D7DC') + pixels(CLAUDE_SPARK, 47.7, 46.7, 1.4, SPARK)
  const laptop = lid + rect(16, 73, 76, 5, '#9AA0A6') + rect(16, 77, 76, 2, '#6F737A')
  const open = anim('scale', D, [[0, '1 0.05'], [0.4, '1 1', 'back'], [D, '1 1']], ONCE)
  const on = (inner, at = 0.45) => wrap(inner, '', anim('opacity', D, [[0, '0'], [at, '0'], [at + 0.1, '1', 'lin'], [D, '1']], ONCE))
  // The screen's light on his face, flickering a little as pages change, and spilling over the top of the lid
  const glow = on(wrap(rect(11, 0, 85, 36, '#9FD8FF', 'fill-opacity=".2"') + rect(11, 22, 85, 14, '#9FD8FF', 'fill-opacity=".12"'), '',
    anim('opacity', 1.1, [[0, '1'], [0.3, '.7', 'sio'], [0.5, '1', 'sio'], [0.8, '.85', 'sio'], [1.1, '1', 'sio']]))) +
    on(rect(28, 31, 52, 3, '#CFEFFF', 'fill-opacity=".7"'))
  // Typing like mad: each hand hammers the keys on its own beat, popping up high over the lid, and his whole body bounces along
  const T = 0.22
  const typing = (begin) => anim('translate', T, [[0, '0 0'], [0.08, '0 -18', 'p2out'], [T, '0 1', 'p2in']], { begin })
  const atKeys = (dx) => `translate(${dx} 26)`
  // Little strike lines flash beside each hand as it comes down
  const strikes = (x, begin) => wrap(rect(x, 44, 2, 5, CREAM) + rect(x + 5, 42, 2, 5, CREAM), '', anim('opacity', T, [[0, '0'], [0.15, '0'], [0.17, '1', 'lin'], [T, '0', 'lin']], { begin }))
  return figure({
    ownProps: true,
    heldRaw: glow + wrap(wrap(laptop, 'translate(-54 -73)'), 'translate(54 73)', open) + on(strikes(4, 0) + strikes(97, T / 2), 0.5),
    left: { hold: true, at: atKeys(8), anims: [typing(0)] },
    right: { hold: true, at: atKeys(-8), anims: [typing(T / 2)] },
    upper: [anim('translate', T / 2, [[0, '0 0'], [T / 4, '0 -1.5', 'sio'], [T / 2, '0 0', 'sio']])],
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '0 5', 'p2io'], [1.4, '-2 5', 'sio'], [2.2, '2 5', 'sio'], [D, '0 5', 'sio']], ONCE)], blinkCycle: 2.6, blinkAt: 1.9 },
  })
}

// A milestone (your 100th message, 1,000th and so on): he lifts a gold trophy over his head, with sparkles and confetti
function trophy() {
  const D = EVENT_SECONDS.trophy
  const GOLD = '#F2C230'
  const cup = rect(38, -8, 30, 6, GOLD) + rect(40, -2, 26, 16, GOLD) + rect(32, 0, 6, 10, GOLD) + rect(68, 0, 6, 10, GOLD) + rect(44, 0, 3, 10, '#FFF3B0') +
    rect(50, 14, 6, 8, '#D6A21C') + rect(44, 22, 18, 5, '#8A5A2B')
  // Held up over his head by its handles, the base clear of the top of his head
  const lift = (dx, dy) => anim('translate', D, [[0, `${dx} 0`], [0.3, `${dx} 0`], [0.75, `${dx} ${dy}`, 'back'], [3.3, `${dx} ${dy}`], [D, `${dx} 0`, 'p2io']], ONCE)
  const raised = wrap(cup, 'translate(0 30)', lift(0, -59), anim('opacity', D, [[0, '0'], [0.25, '0'], [0.3, '1', 'lin'], [D, '1']], ONCE))
  const sparkles = [[30, -40], [78, -44], [22, -20], [86, -22]].map(([x, y], i) => wrap(rect(-1.5, -6, 3, 12, '#FFD23F') + rect(-6, -1.5, 12, 3, '#FFD23F'), `translate(${x} ${y + 40})`,
    anim('translate', D, [[0, '0 -40'], [D, '0 -40']], ONCE), anim('scale', D, [[0, '0 0'], [0.9 + i * 0.15, '0 0'], [1.1 + i * 0.15, '1.2 1.2', 'p2out'], [1.5 + i * 0.15, '0 0', 'p2in'], [D, '0 0']], ONCE))).join('')
  return figure({
    ownProps: true,
    heldRaw: raised,
    left: { hold: true, over: true, anims: [lift(12, -55)] },
    right: { hold: true, over: true, anims: [lift(-13, -55)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.6, '0 -6', 'p2io'], [D, '0 -6']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [1.0, '1 1'], [1.15, '1 .3', 'p2io'], [3.4, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
  }) + sparkles + burst({ x: 53, y: -30, begin: 0.8, cycle: D, side: 0, count: 26, seed: 17 })
}

// ---- Idle fidgets, now and then in a quiet spell before he dozes off ----

// A yo-yo: down and back up into his hand, three times, his eyes following it
function yoyo() {
  const D = EVENT_SECONDS.yoyo
  const DOWN = 28
  const beats = [[0, 0], [0.3, 0], [0.8, 1, 'p2in'], [1.3, 0, 'p2out'], [1.8, 1, 'p2in'], [2.3, 0, 'p2out'], [2.8, 1, 'p2in'], [3.3, 0, 'p2out'], [D, 0]]
  const drop = anim('translate', D, beats.map(([t, v, e]) => [t, `0 ${v * DOWN}`, e]), ONCE)
  const string = wrap(rect(95.4, 0, 1.2, DOWN + 4, INK), 'translate(0 44)', anim('scale', D, beats.map(([t, v, e]) => [t, `1 ${v ? 1 : 0.01}`, e]), ONCE))
  const toy = wrap(rect(91, 44, 10, 10, '#E8574A') + rect(91, 48, 10, 2, '#B83A30') + rect(94, 47, 4, 4, '#F3EFE6'), '', drop)
  return figure({
    ownProps: true,
    heldRaw: string + toy,
    eyes: { gaze: [anim('translate', D, beats.map(([t, v, e]) => [t, `3 ${v ? 6 : 2}`, e]), ONCE)] },
  })
}

// Juggling three balls in an arc over his head for a few rounds, then he fumbles: the balls drop out of his hands and bounce on the floor
function juggle() {
  const D = EVENT_SECONDS.juggle
  const P = 1.2
  const FUMBLE = 2.8
  const REST = 82.5
  const step = 0.05
  // Where a ball is u of the way round: thrown up from the left hand over his head to the right, then passed back low
  const at = (u) => {
    const k = ((u % 1) + 1) % 1
    const s = k < 0.5 ? k / 0.5 : (k - 0.5) / 0.5
    return k < 0.5 ? [14 + 78 * s, 26 - 200 * s * (1 - s)] : [92 - 78 * s, 26 + 24 * s * (1 - s)]
  }
  const ball = (fill, i) => {
    const lead = i / 3
    const frames = []
    for (let t = 0; t < FUMBLE; t += step) frames.push([n(t), at(t / P + lead).map(n).join(' ')])
    // The fumble: each ball, a moment apart, falls from where it was to the floor, bounces once and comes to rest
    const drop = n(FUMBLE + i * 0.12)
    const [x, y] = at(drop / P + lead)
    const side = i === 1 ? 6 : i === 0 ? -8 : 10
    frames.push([drop, `${n(x)} ${n(y)}`], [n(drop + 0.35), `${n(x + side * 0.6)} ${REST}`, 'p2in'], [n(drop + 0.5), `${n(x + side * 0.8)} ${REST - 7}`, 'p2out'],
      [n(drop + 0.65), `${n(x + side)} ${REST}`, 'p2in'], [D, `${n(x + side)} ${REST}`])
    return wrap(rect(-3.5, -3.5, 7, 7, fill), '', anim('translate', D, frames, ONCE))
  }
  const balls = ['#E8574A', '#3F8CE8', '#F2C230'].map(ball).join('')
  // Hands toss on alternate beats while he juggles, then go still
  const toss = (offset) => {
    const frames = [[0, '0 0']]
    for (let t = offset; t + 0.3 < FUMBLE; t += 0.6) frames.push([n(t), '0 0'], [n(t + 0.15), '0 -5', 'p2out'], [n(t + 0.3), '0 0', 'p2in'])
    frames.push([D, '0 0'])
    return anim('translate', D, frames, ONCE)
  }
  return figure({
    ownProps: true,
    heldRaw: balls,
    left: { anims: [toss(0.05)] },
    right: { anims: [toss(0.35)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 -5'], [FUMBLE, '0 -5'], [FUMBLE + 0.3, '0 7', 'p2io'], [D, '0 7']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [FUMBLE + 0.2, '1 1'], [FUMBLE + 0.35, '1.15 1.15', 'p2out'], [D, '1.15 1.15']], ONCE)],
    },
  })
}

// A big stretch: arms high over his head, standing up tall with his eyes shut, then he relaxes
function stretch() {
  const D = EVENT_SECONDS.stretch
  const reach = (dx) => anim('translate', D, [[0, '0 0'], [0.6, `${dx} -38`, 'p2out'], [2.3, `${dx} -40`], [D, '0 0', 'p2io']], ONCE)
  const tall = anim('scale', D, [[0, '1 1'], [0.6, '.96 1.07', 'p2out'], [2.3, '.95 1.08'], [D, '1 1', 'p2io']], ONCE)
  return wrap(wrap(figure({
    ownProps: true,
    left: { hold: true, anims: [reach(-3)] },
    right: { hold: true, anims: [reach(3)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.5, '1 .15', 'p2io'], [2.4, '1 .15'], [D, '1 1', 'p2io']], ONCE)] },
  }), `translate(-53.5 -${FLOOR})`), `translate(53.5 ${FLOOR})`, tall)
}

// ---- Things he does on his own when it's quiet, and more reactions to you and to Claude's work ----

const STAR = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..']
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
const NOTE = ['.XXX', '.X.X', '.X.X', 'XX.X', 'XX..']
// A filled circle out of one-unit rows, the way he is drawn
const disc = (cx, cy, R, fill, extra = '') =>
  Array.from({ length: R * 2 }, (_, i) => {
    const y = i + 0.5 - R
    const half = Math.sqrt(Math.max(0, R * R - y * y))
    return rect(n(cx - half), n(cy - R + i), n(half * 2), 1, fill, extra)
  }).join('')
// Shown from one moment to another (seconds), once
const between = (inner, D, from, to) => wrap(inner, '', anim('opacity', D, [[0, '0'], [from, '0'], [from + 0.05, '1', 'lin'], [to, '1'], [to + 0.05, '0', 'lin'], [D, '0']], ONCE))
// A hand that moves to a spot and back again: [seconds, 'dx dy'] in between
const holdAt = (D, dx, dy, from = 0.3, back = D - 0.4) => anim('translate', D, [[0, '0 0'], [from, `${dx} ${dy}`, 'p2out'], [back, `${dx} ${dy}`], [D, '0 0', 'p2io']], ONCE)
const SCREEN_LIGHT = '#9FD8FF'

// Scrolling his phone (its screen toward him): thumb flicking, the screen's glow on his face, and a little laugh at something
function phone() {
  const D = EVENT_SECONDS.phone
  const PX = 60
  const PY = 28
  // The back of the phone faces you (the screen faces him): a case, the camera, and his thumb flicking at the top edge
  const device = rect(PX, PY, 16, 26, '#2B2D33') + rect(PX + 1.5, PY + 1.5, 13, 23, '#3F8CE8') + rect(PX + 3, PY + 3, 5, 5, '#2B2D33') + rect(PX + 4, PY + 4, 3, 3, '#6F7C8C') + rect(PX + 5.5, PY + 15, 5, 5, '#2E6FC0')
  const thumb = wrap(rect(PX + 8, PY - 3, 6, 5, SKIN, `stroke="${DARK}" stroke-width="1"`), '', anim('translate', 0.9, [[0, '0 3'], [0.35, '0 -1', 'p2out'], [0.9, '0 3', 'p2io']]))
  const glow = rect(11, 20, 85, 16, SCREEN_LIGHT, 'fill-opacity=".14"') + rect(11, 10, 85, 10, SCREEN_LIGHT, 'fill-opacity=".07"')
  const laugh = anim('translate', D, [[0, '0 0'], [2.6, '0 0'], [2.75, '0 -2.5', 'p2out'], [2.9, '0 0', 'p2in'], [3.05, '0 -2.5', 'p2out'], [3.2, '0 0', 'p2in'], [D, '0 0']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: between(glow + device + thumb, D, 0.3, D - 0.45),
    right: { hold: true, anims: [holdAt(D, -24, 14)] },
    upper: [laugh],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '3 6', 'p2io'], [D - 0.4, '3 6'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [2.55, '1 1'], [2.65, '1 .3', 'p2io'], [3.3, '1 .3'], [3.45, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
  })
}

// Sipping a coffee: brings the steaming mug up, sips with his eyes shut, and lets out a happy sigh
function coffee() {
  const D = EVENT_SECONDS.coffee
  const mug = rect(0, 0, 16, 16, CREAM) + rect(0, 0, 16, 3, '#5A3A22') + rect(16, 3, 5, 3, CREAM) + rect(19, 3, 3, 9, CREAM) + rect(16, 9, 5, 3, CREAM) + rect(4, 7, 8, 5, SPARK)
  const steam = [2, 7, 12].map((x, i) => wrap(rect(x, -6, 2, 4, '#E8E4DA') + rect(x + 1.5, -11, 2, 4, '#E8E4DA'), '',
    anim('translate', 1.2, [[0, '0 2'], [1.2, '0 -8']], { begin: i * 0.4 }), anim('opacity', 1.2, [[0, '0'], [0.3, '.8', 'lin'], [1.2, '0', 'lin']], { begin: i * 0.4 }))).join('')
  // Where the mug is (its top left corner) over time; the hand holds it from the left
  const path = [[0, 18, 23], [0.5, 30, 32, 'p2io'], [1.5, 30, 32], [1.8, 38, 18, 'p2io'], [2.5, 38, 18], [2.8, 30, 32, 'p2io'], [D - 0.5, 30, 32], [D, 18, 23, 'p2io']]
  const mugAt = anim('translate', D, path.map(([t, x, y, e]) => [t, `${x} ${y}`, e]), ONCE)
  const handAt = anim('translate', D, path.map(([t, x, y, e]) => [t, `${x - 18} ${y - 23}`, e]), ONCE)
  const tilt = anim('rotate', D, [[0, '0 8 8'], [1.5, '0 8 8'], [1.8, '-28 8 8', 'p2io'], [2.5, '-28 8 8'], [2.8, '0 8 8', 'p2io'], [D, '0 8 8']], ONCE)
  const held = wrap(wrap(mug + between(steam, D, 0, 1.6), '', tilt), '', mugAt)
  const sigh = between(rect(64, 30, 8, 5, '#E8E4DA', 'fill-opacity=".8"') + rect(70, 27, 6, 4, '#E8E4DA', 'fill-opacity=".6"'), D, 2.9, 3.6)
  return figure({
    ownProps: true,
    heldRaw: held + sigh,
    left: { hold: true, over: true, anims: [handAt] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '-2 4', 'p2io'], [1.7, '-2 4'], [1.8, '0 0'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [1.7, '1 1'], [1.8, '1 .15', 'p2io'], [2.6, '1 .15'], [2.8, '1 .3', 'p2io'], [3.6, '1 .3'], [3.8, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
  })
}

// A handheld game: hunched over it, mashing buttons, a little hero hopping on the screen, and a star when he wins
function game() {
  const D = EVENT_SECONDS.game
  const GX = 34
  const GY = 38
  const device = rect(GX, GY, 40, 20, '#8A8F98') + rect(GX + 11, GY + 3, 18, 13, '#2E3B2A') + rect(GX + 13, GY + 5, 14, 9, '#9BBC0F') +
    rect(GX + 3, GY + 8, 6, 2, INK) + rect(GX + 5, GY + 6, 2, 6, INK) + rect(GX + 32, GY + 6, 3, 3, '#C4553D') + rect(GX + 35, GY + 10, 3, 3, '#C4553D')
  const hero = wrap(rect(0, 0, 3, 3, '#306230'), '', anim('translate', 0.8, [[0, `${GX + 14} ${GY + 10}`], [0.2, `${GX + 18} ${GY + 6}`, 'p2out'], [0.4, `${GX + 22} ${GY + 10}`, 'p2in'], [0.8, `${GX + 14} ${GY + 10}`]]))
  const mash = (begin) => anim('translate', 0.18, [[0, '0 0'], [0.09, '0 -1.5'], [0.18, '0 0']], { begin })
  const win = wrap(pixels(STAR, -5, -5, 2, '#FFD23F'), 'translate(54 -10)', anim('scale', D, [[0, '0 0'], [3.2, '0 0'], [3.4, '1.3 1.3', 'p2out'], [3.9, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const hop = anim('translate', D, [[0, '0 0'], [3.2, '0 0'], [3.35, '0 -6', 'p2out'], [3.5, '0 0', 'p2in'], [D, '0 0']], ONCE)
  return wrap(figure({
    ownProps: true,
    heldRaw: between(device + hero, D, 0.3, D - 0.45),
    left: { hold: true, over: true, anims: [holdAt(D, 22, 18), mash(0)] },
    right: { hold: true, over: true, anims: [holdAt(D, -22, 18), mash(0.09)] },
    upper: [anim('translate', D, [[0, '0 0'], [0.3, '0 3', 'p2out'], [3.1, '0 3'], [3.3, '0 0', 'p2io'], [D, '0 0']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2io'], [3.1, '0 6'], [3.3, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .65', 'p2io'], [3.2, '1 .65'], [3.3, '1 .3', 'p2io'], [3.9, '1 .3'], [4.1, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
  }), '', hop) + win
}

// Bubble gum: blows a big pink bubble that grows and grows, until it pops all over his face, and he wipes it off
function gum() {
  const D = EVENT_SECONDS.gum
  const PINK = '#F28AB8'
  const bubble = wrap(wrap(disc(0, 0, 11, PINK) + rect(-6, -7, 3, 3, '#FFFFFF'), '', anim('scale', D, [[0, '0 0'], [0.5, '.15 .15'], [1.4, '.6 .6', 'sio'], [1.6, '.55 .55', 'sio'], [2.5, '1.1 1.1', 'sio'], [2.6, '1.3 1.3', 'p2out'], [D, '1.3 1.3']], ONCE),
    anim('opacity', D, [[0, '1'], [2.6, '1'], [2.62, '0', 'lin'], [D, '0']], ONCE)), 'translate(53 33)')
  const splat = [[18, 26, 14, 5], [40, 30, 22, 4], [70, 25, 14, 6], [30, 20, 6, 3], [66, 33, 9, 3]].map(([x, y, w, h]) => rect(x, y, w, h, PINK)).join('')
  const wipe = anim('translate', D, [[0, '0 0'], [3.2, '0 0'], [3.5, '60 10', 'p2io'], [3.7, '60 10'], [D, '0 0', 'p2io']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: bubble + between(splat, D, 2.6, 3.6),
    left: { anims: [anim('translate', D, [[0, '0 0'], [3.0, '0 0'], [3.2, '4 -6', 'p2out'], [3.7, '64 4', 'p2io'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.6, '0 5', 'p2io'], [2.6, '0 5'], [2.7, '0 0'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [1.6, '1 1'], [2.5, '1.2 1.2', 'sio'], [2.62, '1 .1', 'p2out'], [3.6, '1 .1'], [3.8, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
  }) + wrap('', '', wipe)
}

// Music: headphones on, eyes shut, bopping to the beat with notes floating up from the ear cups
function music() {
  const D = EVENT_SECONDS.music
  const RED = '#C4553D'
  const BAND = '#8A8F98'
  const phones = rect(10, -12, 87, 4, BAND) + rect(4, -9, 6, 15, BAND) + rect(97, -9, 6, 15, BAND) + rect(-3, 4, 12, 18, RED) + rect(98, 4, 12, 18, RED) + rect(-3, 4, 12, 3, '#E5584B') + rect(98, 4, 12, 3, '#E5584B')
  const notes = [[-6, 0, '#8FC7F2'], [108, 0.5, '#F2C230'], [-10, 1.0, '#E5584B'], [112, 1.5, '#5E8C6A']].map(([x, begin, fill]) =>
    wrap(pixels(NOTE, 0, 0, 2, fill), '', anim('translate', 2, [[0, `${x} 6`], [1, `${x + (x < 50 ? -4 : 4)} -14`, 'sio'], [2, `${x} -30`, 'sio']], { begin }),
      anim('opacity', 2, [[0, '0'], [0.2, '1', 'lin'], [1.6, '1'], [2, '0', 'lin']], { begin }))).join('')
  return figure({
    ownProps: true,
    legs: { period: 0.5 },
    upper: [bob(0.5, 2)],
    heldRaw: between(phones + notes, D, 0.2, D - 0.35),
    left: { anims: [swing(0.5, 3, false)] },
    right: { anims: [swing(0.5, 3, true)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .3', 'p2io'], [D - 0.4, '1 .3'], [D, '1 1', 'p2io']], ONCE)] },
  })
}

// Reading: puts on his reading glasses, holds up a book (its cover toward you, the pages toward him), reads, and turns a page
function readbook() {
  const D = EVENT_SECONDS.readbook
  const glasses = wrap(readingGlasses(), '', anim('translate', D, [[0, '0 -34'], [0.5, '0 0', 'p2out'], [D - 0.5, '0 0'], [D, '0 -34', 'p2in']], ONCE),
    anim('opacity', D, [[0, '0'], [0.05, '1', 'lin'], [D - 0.05, '1'], [D, '0', 'lin']], ONCE))
  const COVER = '#6B4F3A'
  const cover = rect(24, 30, 60, 34, '#4E3828') + rect(26, 32, 56, 30, COVER) + rect(26, 29, 56, 3, CREAM) + rect(36, 38, 36, 6, '#E7B04A') + rect(40, 40, 28, 2, COVER) +
    rect(48, 50, 12, 7, SPARK) + rect(50, 52, 2, 2, INK) + rect(56, 52, 2, 2, INK)
  // a page going over, seen from behind the book: its top edge sweeps across in an arc
  const page = wrap(rect(-3, -5, 6, 6, CREAM), '', anim('translate', D, [[0, '78 30'], [2.9, '78 30'], [3.15, '54 18', 'p2out'], [3.4, '30 30', 'p2in'], [D, '30 30']], ONCE),
    anim('opacity', D, [[0, '0'], [2.9, '0'], [2.92, '1', 'lin'], [3.4, '1'], [3.42, '0', 'lin'], [D, '0']], ONCE))
  const read = [[0.6, '-4 5'], [1.4, '4 5', 'lin'], [1.5, '-4 6', 'p2io'], [2.3, '4 6', 'lin'], [2.9, '4 6'], [3.1, '0 3', 'p2io'], [3.6, '-4 5', 'p2io'], [4.3, '4 5', 'lin']]
  return figure({
    ownProps: true,
    heldRaw: between(cover + page, D, 0.5, D - 0.5) + glasses,
    left: { hold: true, over: true, anims: [holdAt(D, 22, 16, 0.5, D - 0.5)] },
    right: { hold: true, over: true, anims: [holdAt(D, -22, 16, 0.5, D - 0.5)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], ...read, [D - 0.4, '0 5'], [D, '0 0', 'p2io']], ONCE)], blinkCycle: 3.1, blinkAt: 2.95 },
  })
}

// You stopped Claude mid-reply: he jumps, startled, hands up, with a "!" over his head
function startled() {
  const D = EVENT_SECONDS.startled
  const jump = anim('translate', D, [[0, '0 0'], [0.12, '0 -16', 'p2out'], [0.4, '0 0', 'p2in'], [0.5, '0 -3', 'p2out'], [0.6, '0 0', 'p2in'], [D, '0 0']], ONCE)
  const handsUp = (dx) => anim('translate', D, [[0, '0 0'], [0.12, `${dx} -20`, 'p2out'], [1.2, `${dx} -20`], [1.5, '0 0', 'p2io'], [D, '0 0']], ONCE)
  const bang = wrap(pixels(PIXEL['!'], -1.5, -7.5, 3, '#E5584B'), 'translate(54 -30)', anim('scale', D, [[0, '0 0'], [0.1, '0 0'], [0.25, '1.3 1.3', 'p2out'], [0.35, '1 1', 'p2io'], [1.3, '1 1'], [1.5, '0 0', 'p2in'], [D, '0 0']], ONCE))
  return wrap(figure({
    ownProps: true,
    left: { hold: true, anims: [handsUp(-6)] },
    right: { hold: true, anims: [handsUp(6)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.08, '1.35 1.35', 'p2out'], [1.1, '1.35 1.35'], [1.4, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
  }), '', jump) + bang
}

// You said thanks: he blushes, a heart floats up, and he sways shyly with his hands together
function blush() {
  const D = EVENT_SECONDS.blush
  const cheeks = rect(15, 25, 14, 4, '#F28A8A', 'fill-opacity=".75"') + rect(78, 25, 14, 4, '#F28A8A', 'fill-opacity=".75"')
  const heart = wrap(pixels(HEART, -8.4, -6, 2.4, '#E5584B'), '', anim('translate', D, [[0, '54 -4'], [0.3, '54 -4'], [2.2, '58 -40', 'sio'], [D, '58 -40']], ONCE),
    anim('scale', D, [[0, '0 0'], [0.3, '0 0'], [0.5, '1.2 1.2', 'p2out'], [0.6, '1 1', 'p2io'], [D, '1 1']], ONCE),
    anim('opacity', D, [[0, '1'], [1.9, '1'], [2.3, '0', 'lin'], [D, '0']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: between(cheeks, D, 0.15, D - 0.3) + heart,
    left: { hold: true, over: true, anims: [holdAt(D, 24, 10, 0.3, D - 0.3)] },
    right: { hold: true, over: true, anims: [holdAt(D, -24, 10, 0.3, D - 0.3)] },
    upper: [anim('rotate', D, [[0, '0 53 86'], [0.6, '-3 53 86', 'sio'], [1.2, '3 53 86', 'sio'], [1.8, '-3 53 86', 'sio'], [D, '0 53 86', 'sio']], ONCE)],
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.2, '1 .3', 'p2io'], [D - 0.3, '1 .3'], [D, '1 1', 'p2io']], ONCE)] },
  })
}

// You sound frustrated: he sweats, his eyes dart about, and he fidgets with his hands
function nervous() {
  const D = EVENT_SECONDS.nervous
  const jitter = anim('translate', 0.16, [[0, '0 0'], [0.04, '-0.8 0'], [0.08, '0.8 0'], [0.12, '-0.5 0'], [0.16, '0 0']])
  const dart = [0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1].map((t, i) => [t + 0.05, `${i % 2 ? 5 : -5} ${i % 3 === 0 ? 2 : 0}`, 'p2io'])
  return figure({
    ownProps: true,
    left: { hold: true, over: true, anims: [holdAt(D, 26, 12, 0.25, D - 0.3), jitter] },
    right: { hold: true, over: true, anims: [holdAt(D, -26, 12, 0.25, D - 0.3), anim('translate', 0.16, [[0, '0 0'], [0.08, '0 -1'], [0.16, '0 0']])] },
    upper: [jitter],
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], ...dart, [D - 0.2, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    props: drop(4, -6, 0.1) + drop(96, -2, 0.9),
  })
}

// You wrote in ALL CAPS: he flinches, squashed down with his eyes squeezed shut, shock lines around his head
function flinch() {
  const D = EVENT_SECONDS.flinch
  const shock = rect(-10, -6, 9, 2.5, INK) + rect(108, -6, 9, 2.5, INK) + rect(52, -18, 2.5, 9, INK) + rect(-6, 14, 7, 2.5, INK) + rect(106, 14, 7, 2.5, INK)
  const squash = anim('scale', D, [[0, '1 1'], [0.08, '1.1 .82', 'p2out'], [0.9, '1.06 .88'], [1.2, '1 1', 'back'], [D, '1 1']], ONCE)
  return wrap(wrap(figure({
    ownProps: true,
    heldRaw: between(shock, D, 0.05, 0.8),
    left: { hold: true, anims: [holdAt(D, 10, -10, 0.08, 1.0)] },
    right: { hold: true, anims: [holdAt(D, -10, -10, 0.08, 1.0)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.06, '1 .1', 'p2out'], [1.0, '1 .1'], [1.2, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
  }), `translate(-53.5 -${FLOOR})`), `translate(53.5 ${FLOOR})`, squash)
}

// You pasted a picture or a file: he holds up a camera, the flash goes off, and a photo slides out
function camera() {
  const D = EVENT_SECONDS.camera
  const body = rect(34, 14, 40, 24, INK) + rect(36, 16, 36, 4, '#4A4E57') + disc(54, 27, 7, '#6F7C8C') + disc(54, 27, 4, '#2B2D33') + rect(52, 24, 2, 2, '#FFFFFF') + rect(64, 10, 7, 4, '#E8E4DA')
  const photo = wrap(rect(44, 30, 20, 20, CREAM) + rect(46, 32, 16, 13, '#8FC7F2') + rect(48, 39, 6, 6, '#5E8C6A'), '', anim('translate', D, [[0, '0 0'], [1.4, '0 0'], [2.0, '0 18', 'p2out'], [D, '0 18']], ONCE))
  const flash = wrap(disc(67, 12, 44, '#FFFFFF', 'fill-opacity=".25"') + disc(67, 12, 28, '#FFFFFF', 'fill-opacity=".45"') + disc(67, 12, 14, '#FFFFFF', 'fill-opacity=".8"'), '', anim('opacity', D, [[0, '0'], [1.0, '0'], [1.05, '1', 'lin'], [1.4, '0', 'p2out'], [D, '0']], ONCE))
  const sparkle = wrap(pixels(STAR, -5, -5, 2, '#FFF3B0'), 'translate(67 8)', anim('scale', D, [[0, '0 0'], [1.0, '0 0'], [1.1, '1.4 1.4', 'p2out'], [1.5, '0 0', 'p2in'], [D, '0 0']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: between(photo + body, D, 0.3, D - 0.35) + sparkle,
    left: { hold: true, over: true, anims: [holdAt(D, 16, -2, 0.3, D - 0.35)] },
    right: { hold: true, over: true, anims: [holdAt(D, -16, -2, 0.3, D - 0.35)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [1.0, '1 1'], [1.05, '1 .1', 'p2out'], [1.6, '1 .1'], [1.8, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
  }) + flash
}

// Claude has been working for a while: he checks his watch and taps his foot
function tapfoot() {
  const D = EVENT_SECONDS.tapfoot
  const watch = rect(0, 36, 22, 4, INK) + rect(7, 33, 8, 9, INK) + rect(8.5, 34.5, 5, 6, '#E8E4DA') + rect(10.5, 35.5, 1, 3, INK)
  const tap = anim('translate', 0.4, [[0, '0 0'], [0.12, '0 -4', 'p2out'], [0.24, '0 0', 'p2in'], [0.4, '0 0']])
  const marks = wrap(rect(100, 80, 4, 1.5, INK) + rect(100, 84, 5, 1.5, INK), '', anim('opacity', 0.4, [[0, '0'], [0.22, '0'], [0.24, '1', 'lin'], [0.34, '0', 'lin'], [0.4, '0']]))
  return figure({
    ownProps: true,
    legs: { perLeg: (i) => (i === 3 ? [tap] : []) },
    heldRaw: '',
    left: { hold: true, carry: watch, anims: [holdAt(D, 24, 6)] },
    props: marks,
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '-3 7', 'p2io'], [2.2, '-3 7'], [2.5, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [2.4, '1 1'], [2.5, '1 .5', 'p2io'], [3.0, '1 .5'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// Coding late at night: a big yawn behind his hand, eyes shut, stretching up, and a little tear
function yawn() {
  const D = EVENT_SECONDS.yawn
  const tear = wrap(rect(0, 0, 2.5, 3.5, SWEAT), 'translate(86 22)', anim('translate', D, [[0, '0 0'], [2.0, '0 0'], [2.8, '0 8', 'p2in'], [D, '0 8']], ONCE), anim('opacity', D, [[0, '0'], [2.0, '0'], [2.05, '1', 'lin'], [2.8, '1'], [2.9, '0', 'lin'], [D, '0']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: tear,
    right: { hold: true, over: true, anims: [holdAt(D, -40, 2, 0.6, 2.0)] },
    upper: [anim('translate', D, [[0, '0 0'], [0.9, '0 -3', 'sio'], [2.1, '0 -3'], [2.6, '0 0', 'sio'], [D, '0 0']], ONCE)],
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1 .1', 'p2io'], [2.3, '1 .1'], [2.7, '1 .5', 'p2io'], [D, '1 .5']], ONCE)] },
  })
}

// Installing packages: a delivery box drops from the sky, he opens the flaps, and the new packages pop out
function unbox() {
  const D = EVENT_SECONDS.unbox
  const BOX = '#C8935A'
  const BOX_DARK = '#A8743F'
  const box = rect(28, 42, 52, 30, BOX) + rect(28, 42, 52, 3, BOX_DARK) + rect(40, 52, 28, 4, BOX_DARK, 'fill-opacity=".5"')
  const flap = (x, pivot, deg) => wrap(rect(x, 38, 26, 5, BOX_DARK), '', anim('rotate', D, [[0, `0 ${pivot} 42`], [1.1, `0 ${pivot} 42`], [1.4, `${deg} ${pivot} 42`, 'p2out'], [D, `${deg} ${pivot} 42`]], ONCE))
  const drop_ = anim('translate', D, [[0, '0 -110'], [0.45, '0 0', 'p2in'], [0.55, '0 -5', 'p2out'], [0.65, '0 0', 'p2in'], [D, '0 0']], ONCE)
  const cubes = [[38, -6, CONFETTI[1]], [54, -18, CONFETTI[2]], [70, -8, CONFETTI[4]]].map(([x, y, fill], i) =>
    wrap(rect(-4, -4, 8, 8, fill) + rect(-4, -4, 8, 2, '#FFFFFF', 'fill-opacity=".4"'), '', anim('translate', D, [[0, '54 50'], [1.5 + i * 0.12, '54 50'], [2.0 + i * 0.12, `${x} ${y}`, 'p2out'], [D, `${x} ${y}`]], ONCE),
      anim('opacity', D, [[0, '0'], [1.5 + i * 0.12, '0'], [1.55 + i * 0.12, '1', 'lin'], [D, '1']], ONCE))).join('')
  return figure({
    ownProps: true,
    heldRaw: wrap(cubes + box + flap(28, 28, -130) + flap(54, 80, 130), '', drop_),
    left: { hold: true, over: true, anims: [holdAt(D, 24, 20, 0.6, D - 0.3)] },
    right: { hold: true, over: true, anims: [holdAt(D, -24, 20, 0.6, D - 0.3)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 -6'], [0.45, '0 6', 'p2in'], [1.6, '0 6'], [2.0, '0 -5', 'p2out'], [D, '0 -5']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [1.9, '1 1'], [2.0, '1.3 1.3', 'p2out'], [2.6, '1.3 1.3'], [2.8, '1 .3', 'p2io'], [D, '1 .3']], ONCE)],
    },
  })
}

// Searching the code: he peers through a big magnifying glass, his eye huge behind the lens, sweeping side to side
function magnify() {
  const D = EVENT_SECONDS.magnify
  const glass = rect(88, 26, 5, 18, '#6B4F3A') + disc(80, 16, 14, INK) + disc(80, 16, 11, '#BFE3FF') + rect(73, 9, 15, 15, EYE) + rect(75, 11, 4, 4, '#FFFFFF') + rect(72, 6, 5, 3, '#FFFFFF', 'fill-opacity=".7"')
  const scan = anim('translate', D, [[0, '0 0'], [0.4, '-8 0', 'p2io'], [1.1, '-36 2', 'sio'], [1.8, '-8 0', 'sio'], [2.4, '-30 2', 'sio'], [D, '0 0', 'p2io']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: between(wrap(glass, '', scan), D, 0.2, D - 0.25),
    right: { hold: true, over: true, anims: [scan] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [1.1, '-3 0', 'sio'], [1.8, '2 0', 'sio'], [2.4, '-3 0', 'sio'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Opening a pull request: he folds an envelope shut, a coral seal stamps it, and it flies off
function mail() {
  const D = EVENT_SECONDS.mail
  const env = rect(32, 34, 44, 28, CREAM) + rect(32, 34, 44, 2, PAPER_SHADE) +
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(32 + i * 2.75, 36 + i * 1.6, 2.75, 1.6, PAPER_SHADE) + rect(73.25 - i * 2.75, 36 + i * 1.6, 2.75, 1.6, PAPER_SHADE)).join('')
  const flap = wrap(wrap([0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(32 + i * 2.75, 34 - (8 - i) * 1.6, 44 - i * 5.5, 1.6, '#E9E4D6')).join(''), 'translate(0 -34)'), 'translate(0 34)',
    anim('scale', D, [[0, '1 1'], [0.6, '1 1'], [0.9, '1 -1', 'p2io'], [D, '1 -1']], ONCE))
  const seal = wrap(disc(0, 0, 5, SPARK) + rect(-1, -1, 2, 2, '#F2A08A'), 'translate(54 47)', anim('scale', D, [[0, '0 0'], [1.1, '0 0'], [1.25, '1.4 1.4', 'p2out'], [1.4, '1 1', 'p2io'], [D, '1 1']], ONCE))
  const away = anim('translate', D, [[0, '0 0'], [1.8, '0 0'], [1.9, '0 4', 'p2out'], [2.7, '90 -110', 'p2in'], [D, '90 -110']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: wrap(env + flap + seal, '', away, anim('opacity', D, [[0, '0'], [0.2, '1', 'lin'], [2.6, '1'], [2.7, '0', 'lin'], [D, '0']], ONCE)),
    left: { hold: true, over: true, anims: [holdAt(D, 24, 14, 0.25, 1.8)] },
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.25, '-24 14', 'p2out'], [1.8, '-24 14'], [2.1, '6 -22', 'p2out'], [2.6, '6 -22'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2io'], [1.8, '0 6'], [2.4, '5 -6', 'p2io'], [D, '5 -6']], ONCE)] },
  })
}

// A risky command (rm -rf, a force push, sudo): he hides behind his hands, peeking through, sweating
function risky() {
  const D = EVENT_SECONDS.risky
  const tremble = anim('translate', 0.2, [[0, '0 0'], [0.05, '-0.7 0'], [0.1, '0.7 0'], [0.15, '-0.4 0'], [0.2, '0 0']])
  const cover = (dx, peek) => anim('translate', D, [[0, '0 0'], [0.2, `${dx} -10`, 'p2out'], [0.9, `${dx} -10`], [1.1, `${dx + peek} -10`, 'p2io'], [1.9, `${dx + peek} -10`], [2.1, `${dx} -10`, 'p2io'], [D - 0.3, `${dx} -10`], [D, '0 0', 'p2io']], ONCE)
  return figure({
    ownProps: true,
    left: { hold: true, over: true, anims: [cover(20, -5)] },
    right: { hold: true, over: true, anims: [cover(-10, 5)] },
    upper: [tremble],
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [1.1, '-3 0', 'p2io'], [1.9, '3 0', 'p2io'], [D, '0 0', 'p2io']], ONCE)] },
    props: drop(4, -6, 0.2) + drop(98, -4, 1.0),
  })
}

// A message from your phone, or an audio clip: a comically huge ear grows out of the side of his head,
// and he holds a flat hand up behind it to listen in, one brow raised and the other lowered
// An ear seen from the side: the rim curling over the top and down the back, the groove inside it, the bowl with the
// ear hole at its front edge (toward his face), and the lobe at the bottom
const EAR_ROWS = [
  '.....OOOOO....',
  '...OOSSRRSOO..',
  '..OSSRRRRSSSO.',
  '.OSSHHHHHHSSSO',
  '.OSHHSSSSHHSSO',
  'OSHHSSSSSSHHSO',
  'SSHSSKKKSSSHSO',
  'SSHSKKKKKSSHSO',
  'SSSSKKKKKKSHSO',
  'SDDKKKKKKSSHSO',
  'SDDKKKKKSSHHSO',
  'SSSSKKKSSHHSO.',
  'SSSSSSSSHHSO..',
  '.OSSSSSHHSSO..',
  '..OSSSHHSSSO..',
  '..OSSSSSSSO...',
  '...OSSSSSSO...',
  '...OSSSSSO....',
  '....OSSSO.....',
  '.....OOO......',
]
function listen() {
  const D = EVENT_SECONDS.listen
  const CELL = 3.5
  const colours = { O: '#A03C28', S: SKIN, R: '#F2A88E', H: '#A9452F', K: '#8E3524', D: '#4A1A12' }
  const ear = Object.entries(colours).map(([key, fill]) => pixels(EAR_ROWS.map((row) => row.replace(new RegExp(`[^${key}]`, 'g'), '.').replaceAll(key, 'X')), 0, 0, CELL, fill)).join('')
  // It grows from where it joins his head
  const grow = anim('scale', D, [[0, '0 0'], [0.2, '0 0'], [0.6, '1.15 1.15', 'back'], [0.75, '1 1', 'p2io'], [2.6, '1 1'], [2.9, '0 0', 'p2in'], [D, '0 0']], ONCE)
  const sprout = wrap(wrap(ear, 'translate(0 -35)'), 'translate(92 26)', grow)
  // A flat hand held up just behind the ear: fingers together and pointing up, the lines between them, a thumb toward the ear
  const line = `stroke="${DARK}" stroke-width="1.6"`
  const HX = 135
  const HY = -14
  const flatHand = rect(HX - 5, HY + 30, 8, 11, SKIN, line) +
    [[0, 4], [5.5, 0], [11, 2], [16.5, 8]].map(([dx, dy]) => rect(HX + dx, HY + dy, 5.5, 34 - dy, SKIN, line)).join('') +
    rect(HX, HY + 26, 22, 24, SKIN, line) + rect(HX + 1, HY + 22, 20, 8, SKIN) + rect(HX + 4, HY + 48, 15, 10, SKIN, line) +
    rect(HX + 17, HY + 10, 3, 38, '#C96A50', 'fill-opacity=".6"')
  const raise = anim('translate', D, [[0, '-50 35'], [0.5, '0 0', 'p2out'], [2.7, '0 0'], [D, '-50 35', 'p2io']], ONCE)
  const waves = [0, 0.27, 0.54].map((begin) => wrap(rect(0, 0, 3, 6, '#8FC7F2') + rect(3, 6, 3, 16, '#8FC7F2') + rect(0, 22, 3, 6, '#8FC7F2'), '',
    anim('translate', 0.8, [[0, '192 0'], [0.8, '164 4']], { begin }), anim('opacity', 0.8, [[0, '0'], [0.2, '1', 'lin'], [0.8, '0', 'lin']], { begin }))).join('')
  // The look from the photos, without a mouth: one brow raised, the other lowered
  const face = rect(19, 4, 15, 3, INK) + rect(31, 2, 4, 3, INK) + rect(73, 7, 15, 3, INK)
  // He leans in toward you from the side, ear first: bigger, tipped toward the ear, and a little narrower as he turns, then settles back
  const leanIn = anim('scale', D, [[0, '1 1'], [0.3, '1 1'], [0.8, '1.1 1.1', 'p2out'], [2.6, '1.1 1.1'], [3.0, '1 1', 'p2io'], [D, '1 1']], ONCE)
  // tipped like the photo: the ear side up and toward you, his face down toward the other side
  const tilt = anim('rotate', D, [[0, '0'], [0.3, '0'], [0.8, '-8', 'p2out'], [2.6, '-8'], [3.0, '0', 'p2io'], [D, '0']], ONCE)
  return wrap(wrap(figure({
    ownProps: true,
    heldRaw: sprout + between(waves, D, 0.6, 2.6) + between(face, D, 0.45, 2.75),
    right: { shape: flatHand, carry: '', anims: [raise] },
    // his other hand drops a little, clear of his eye
    left: { anims: [anim('translate', D, [[0, '0 0'], [0.5, '0 6', 'p2io'], [2.6, '0 6'], [2.9, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    // His head comes closer than his feet: the top of him grows extra, around the middle of his head, for a wide-angle look
    upper: [
      anim('translate', D, [[0, '0 0'], [0.3, '0 0'], [0.8, '-16 -13', 'p2out'], [2.6, '-16 -13'], [3.0, '0 0', 'p2io'], [D, '0 0']], ONCE),
      anim('scale', D, [[0, '1 1'], [0.3, '1 1'], [0.8, '1.3 1.3', 'p2out'], [2.6, '1.3 1.3'], [3.0, '1 1', 'p2io'], [D, '1 1']], ONCE),
    ],
    // his legs farther away, so smaller
    legs: { perLeg: () => [anim('scale', D, [[0, '1 1'], [0.3, '1 1'], [0.8, '.85 .85', 'p2out'], [2.6, '.85 .85'], [3.0, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
    // Looking straight out at you, eyes a little wider
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '4 -1', 'p2io'], [2.6, '4 -1'], [2.9, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1.2 1.2', 'p2out'], [2.6, '1.2 1.2'], [2.9, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
  }), `translate(-53.5 -${FLOOR})`), `translate(53.5 ${FLOOR})`, leanIn, tilt)
}

// Mogging: he leans in close and slow, eyes heavy-lidded, one brow furrowed and the other arched, a sharp jawline and a
// jutting chin, sizing you up side to side, and a glint flashes off his jaw. No mouth needed.
function mog() {
  const D = EVENT_SECONDS.mog
  const lids = rect(18, 10, 17, 7.5, SKIN) + rect(18, 16.5, 17, 1.8, DARK) + rect(72, 10, 17, 7.5, SKIN) + rect(72, 16.5, 17, 1.8, DARK)
  // The face: a scrunched brow, forehead lines, cheekbones, stubble along the jaw and a cleft chin
  const shade = (x, y, w, h, op) => rect(x, y, w, h, '#7A2E22', `fill-opacity="${op}"`)
  const face = shade(47, 8, 2.4, 9, '.75') + shade(57.5, 8, 2.4, 9, '.75') + shade(40, 1.5, 27, 1.8, '.45') + shade(43, 4.8, 21, 1.8, '.45') +
    [0, 1, 2, 3].map((k) => shade(13 + k * 4, 29 + k * 3, 5.5, 2.4, '.55') + shade(88.5 - k * 4, 29 + k * 3, 5.5, 2.4, '.55')).join('') +
    Array.from({ length: 14 }, (_, k) => shade(16 + (k % 7) * 4.2 + (k >= 7 ? 1.5 : 0), 49 + (k % 7) * 3 + (k >= 7 ? 3 : 0), 1.8, 1.8, '.6') +
      shade(88 - (k % 7) * 4.2 - (k >= 7 ? 1.5 : 0), 49 + (k % 7) * 3 + (k >= 7 ? 3 : 0), 1.8, 1.8, '.6')).join('') +
    shade(53, 63, 1.8, 4.5, '.65')
  const brows = rect(16, 6, 7, 3, INK) + rect(22, 7.2, 7, 3, INK) + rect(28, 8.6, 7, 3, INK) +          // furrowed, sloping down toward the middle
    rect(72, 2.6, 6, 3, INK) + rect(77, 1, 7, 3, INK) + rect(83, 2.2, 6, 3, INK)                         // arched up
  const jaw = Array.from({ length: 7 }, (_, k) => rect(12 + k * 4.2, 45 + k * 3, 5.5, 3, DARK) + rect(89.5 - k * 4.2, 45 + k * 3, 5.5, 3, DARK)).join('') +
    rect(40, 62, 27, 6, SKIN) + rect(40, 66.5, 27, 1.8, DARK) + rect(46, 64, 15, 1.5, DARK, 'fill-opacity=".35"')
  const glint = wrap(pixels(STAR, -5, -5, 2, '#FFFFFF'), 'translate(66 63)', anim('scale', D, [[0, '0 0'], [2.7, '0 0'], [2.85, '1.3 1.3', 'p2out'], [3.2, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const show = (inner) => between(inner, D, 0.35, D - 0.35)
  const closer = anim('scale', D, [[0, '1 1'], [0.2, '1 1'], [1.4, '1.15 1.15', 'sio'], [D - 0.5, '1.15 1.15'], [D, '1 1', 'p2io']], ONCE)
  return wrap(wrap(figure({
    ownProps: true,
    heldRaw: show(lids + brows + jaw + face) + glint,
    upper: [
      anim('translate', D, [[0, '0 0'], [0.2, '0 0'], [1.4, '-6 -6', 'sio'], [1.9, '-9 -6', 'sio'], [2.5, '-3 -6', 'sio'], [2.9, '-6 -6', 'sio'], [D - 0.5, '-6 -6'], [D, '0 0', 'p2io']], ONCE),
      anim('scale', D, [[0, '1 1'], [0.2, '1 1'], [1.4, '1.1 1.1', 'sio'], [D - 0.5, '1.1 1.1'], [D, '1 1', 'p2io']], ONCE),
    ],
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '0 2', 'p2io'], [1.9, '-2 2', 'sio'], [2.5, '2 2', 'sio'], [2.9, '0 2', 'sio'], [D, '0 0', 'p2io']], ONCE)] },
  }), `translate(-53.5 -${FLOOR})`), `translate(53.5 ${FLOOR})`, closer)
}

// Reading glasses that sit over his eyes (frames wide enough for his eyes to look around inside them)
function readingGlasses() {
  const frame = (x) => `<rect x="${x}" y="8" width="22" height="17" fill="#BFE3FF" fill-opacity=".25" stroke="${INK}" stroke-width="2.6"/>`
  return frame(15.5) + frame(69.5) + rect(37.5, 13, 32, 2.6, INK) + rect(9, 13, 6.5, 2.6, INK) + rect(91.5, 13, 6.5, 2.6, INK)
}

// You saved a file yourself: a page pops up beside him, he looks over, puts on his reading glasses and leans in to read it
function peek() {
  const D = EVENT_SECONDS.peek
  const page = wrap(
    rect(-14, -36, 28, 36, INK) + rect(-12, -34, 24, 32, CREAM) + rect(4, -34, 8, 8, PAPER_SHADE) + [-24, -18, -12, -6].map((y, i) => rect(-8, y, i === 3 ? 10 : 16, 2.5, PAPER_SHADE)).join(''),
    'translate(132 86)',
    anim('scale', D, [[0, '0 0'], [0.1, '0 0'], [0.35, '1 1', 'back'], [D, '1 1']], ONCE),
  )
  const glasses = wrap(readingGlasses(), '',
    anim('translate', D, [[0, '0 -40'], [0.75, '0 -40'], [1.1, '0 0', 'p2out'], [D, '0 0']], ONCE),
    anim('opacity', D, [[0, '0'], [0.75, '0'], [0.8, '1', 'lin'], [D, '1']], ONCE))
  return figure({
    upper: [anim('rotate', D, [[0, '0 53 65'], [1.1, '0 53 65'], [1.4, '5 53 65', 'p2io'], [3.0, '5 53 65'], [3.4, '0 53 65', 'p2io'], [D, '0 53 65']], ONCE)],
    right: { anims: [anim('translate', D, [[0, '0 0'], [0.7, '0 0'], [0.9, '-8 -22', 'p2io'], [1.1, '-8 -18'], [1.3, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    ownProps: true,
    heldRaw: glasses,
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '5 2', 'p2io'], [1.4, '5 2'], [1.8, '6 3', 'p2io'], [2.2, '5 5', 'p2io'], [2.6, '6 6', 'p2io'], [3.3, '0 0', 'p2io'], [D, '0 0']], ONCE)], blinkCycle: D, blinkAt: 1.2 },
    props: page,
  })
}

// A new worktree (a separate copy of your project): he hammers away while a little house goes up beside him
function house() {
  const D = EVENT_SECONDS.house
  const drop = (inner, at) => wrap(wrap(inner, '', anim('translate', D, [[0, '0 -30'], [at, '0 -30'], [at + 0.25, '0 0', 'p2in'], [at + 0.33, '0 -3', 'p2out'], [at + 0.4, '0 0', 'p2in'], [D, '0 0']], ONCE)), '',
    anim('opacity', D, [[0, '0'], [at, '0'], [at + 0.05, '1', 'lin'], [D, '1']], ONCE))
  const RED = '#C4553D'
  const parts = [
    [rect(112, 82, 52, 4, '#8A6A4F'), 0.2],
    [rect(116, 56, 6, 26, '#B98A5E'), 0.6],
    [rect(154, 56, 6, 26, '#B98A5E'), 0.9],
    [rect(122, 56, 32, 26, '#E9C9A0'), 1.2],
    [rect(110, 50, 56, 7, RED) + rect(116, 43, 44, 7, RED) + rect(123, 36, 30, 7, RED) + rect(130, 29, 16, 7, RED), 1.7],
    [rect(150, 30, 7, 14, '#8A6A4F'), 2.2],
    [rect(131, 66, 12, 16, '#6B4F3A') + rect(140, 73, 2, 2, '#E7B04A'), 2.6],
    [rect(146, 62, 7, 7, '#9BD3F5') + rect(124, 62, 5, 7, '#9BD3F5'), 3.0],
  ].map(([inner, at]) => drop(inner, at)).join('')
  const sparkles = burst({ x: 138, y: 40, begin: 3.4, cycle: D, side: 0, count: 14, seed: 9 })
  const swing = anim('rotate', 0.5, [[0, '-35 96 32'], [0.28, '35 96 32', 'p3in'], [0.5, '-35 96 32', 'p2out']])
  const hammer = rect(94, -2, 4, 34, WOOD) + rect(86, -8, 20, 9, '#6F737A')
  return figure({
    upper: [anim('translate', 0.5, [[0, '0 0'], [0.28, '0 1.5', 'p3in'], [0.5, '0 0', 'p2out']])],
    right: { over: true, at: 'translate(8 -24)', anims: [swing] },
    ownProps: true,
    heldRaw: wrap(hammer, 'translate(8 -24)', swing),
    eyes: { gaze: [anim('translate', 2, [[0, '5 3'], [1, '6 4', 'sio'], [2, '5 3', 'sio']])], blinkCycle: 2.5, blinkAt: 1.4 },
    props: parts + sparkles,
  })
}

// Waving with his right hand, used for hello and goodbye
function waving(D, wordText, extra = {}) {
  const wave = anim('rotate', 0.5, [[0, '-22 96 44'], [0.25, '22 96 44', 'sio'], [0.5, '-22 96 44', 'sio']])
  const bubble = wrap(wrap(speech(wordText), '', anim('scale', D, [[0, '0 0'], [0.15, '0 0'], [0.4, '1 1', 'back'], [D, '1 1']], ONCE)), 'translate(0 0)')
  return figure({
    upper: [anim('translate', D, [[0, '0 0'], [0.2, '0 -6', 'p2out'], [0.4, '0 0', 'p2in'], [D, '0 0']], ONCE)],
    right: { at: 'translate(8 -40)', anims: [wave] },
    ownProps: true,
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .35', 'p2io'], [D, '1 .35']], ONCE)] },
    props: bubble,
    ...extra,
  })
}

// A new session: he hops and waves hello
function hello() {
  return waving(EVENT_SECONDS.hello, 'HI!')
}

// The session is ending: he waves goodbye, then turns and walks off to the right
function bye() {
  const D = EVENT_SECONDS.bye
  const show = (from, to) => anim('opacity', D, [[0, from], [1.6, from], [1.62, to, 'lin'], [D, to]], ONCE)
  const away = anim('translate', D, [[0, '0 0'], [1.6, '0 0'], [D, '170 0', 'p2in']], ONCE)
  const fade = anim('opacity', D, [[0, '1'], [2.4, '1'], [D, '0', 'lin']], ONCE)
  return wrap(waving(D, 'BYE'), '', show('1', '0')) + wrap(wrap(calmRun(0.35), '', away), '', show('0', '1'), fade)
}

// Switching folders: a folder opens under him, he jumps in, it snaps shut and vanishes, and he drops back down from the sky
function folder() {
  const D = EVENT_SECONDS.folder
  const appear = anim('scale', D, [[0, '0 0'], [0.35, '1 1', 'back'], [1.2, '1 1'], [1.5, '0 0', 'p2in'], [D, '0 0']], ONCE)
  const back = wrap(wrap(rect(-40, -44, 30, 8, '#B9862C') + rect(-40, -38, 80, 38, '#C99A3B'), '', appear), 'translate(54 86)')
  const front = wrap(wrap(rect(-44, -26, 88, 26, '#F2C14E') + rect(-44, -26, 88, 3, '#F8D77E'), '', appear), 'translate(54 86)')
  const move = anim('translate', D, [[0, '0 0'], [0.35, '0 0'], [0.5, '0 6', 'p2out'], [0.75, '0 -34', 'sout'], [1.0, '0 30', 'p3in'], [1.15, '0 56', 'lin'], [1.16, '0 -190', 'lin'], [1.7, '0 -190'], [2.25, '0 0', 'p3in'], [2.35, '0 5', 'p2out'], [2.5, '0 0', 'p2io'], [D, '0 0']], ONCE)
  const seen = anim('opacity', D, [[0, '1'], [1.0, '1'], [1.12, '0', 'lin'], [1.68, '0'], [1.7, '1', 'lin'], [D, '1']], ONCE)
  const puffs = [-1, 1].map((side) => wrap(rect(-6, -6, 12, 9, '#A8A49A'), `translate(${54 + side * 40} 82)`,
    anim('translate', D, [[0, '0 0'], [2.25, '0 0'], [2.8, `${side * 18} -6`, 'p2out'], [D, `${side * 18} -6`]], ONCE),
    anim('opacity', D, [[0, '0'], [2.25, '0'], [2.3, '.8', 'lin'], [2.8, '0', 'lin'], [D, '0']], ONCE))).join('')
  return back + wrap(figure({ eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.45, '1 1'], [0.55, '1.3 1.3', 'p2out'], [1.7, '1.3 1.3'], [2.3, '1 1', 'p2io'], [D, '1 1']], ONCE)] } }), '', move, seen) + front + puffs
}

// Plan mode switched on: he unrolls a blue blueprint and studies it
function modePlan() {
  const D = EVENT_SECONDS.plan
  const unroll = anim('scale', D, [[0, '0.05 1'], [0.2, '0.05 1'], [0.7, '1 1', 'back'], [D, '1 1']], ONCE)
  const grid = [0, 1, 2, 3].map((i) => rect(-26 + i * 14, -18, 1, 36, '#7FA7DA')).join('') + [0, 1, 2].map((i) => rect(-27, -12 + i * 12, 54, 1, '#7FA7DA')).join('')
  const sketch = `<rect x="-16" y="-10" width="20" height="16" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>` + rect(8, -4, 12, 1.6, '#FFFFFF') + rect(8, 2, 8, 1.6, '#FFFFFF')
  const sheet = wrap(rect(-30, -21, 60, 42, '#2D5DA8') + grid + sketch, 'translate(53.5 52)', unroll) + rect(19, 31, 6, 42, '#E9E4D6') + rect(82, 31, 6, 42, '#E9E4D6')
  return figure({
    held: sheet,
    left: { hold: true, at: HOLD_LEFT, anims: [anim('translate', D, [[0, '22 0'], [0.2, '22 0'], [0.7, '0 0', 'back'], [D, '0 0']], ONCE)] },
    right: { hold: true, at: HOLD_RIGHT, anims: [anim('translate', D, [[0, '-22 0'], [0.2, '-22 0'], [0.7, '0 0', 'back'], [D, '0 0']], ONCE)] },
    ownProps: true,
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.7, '-4 5', 'p2io'], [1.6, '4 5', 'sio'], [2.4, '-2 6', 'sio'], [D, '0 4', 'sio']], ONCE)], blinkCycle: D, blinkAt: 2.0 },
  })
}

// Auto mode switched on: a little robot antenna pops up on his head, his eyes flash and he gives a quick beep-boop bounce
function modeAuto() {
  const D = EVENT_SECONDS.auto
  const antenna = wrap(rect(51, -18, 5, 18, '#6F737A') + rect(46, -26, 15, 9, '#6F737A') + wrap(rect(48, -32, 11, 8, '#FF5A4E'), '', anim('opacity', 0.5, [[0, '1'], [0.25, '.2', 'lin'], [0.5, '1', 'lin']])), '',
    anim('translate', D, [[0, '0 20'], [0.2, '0 20'], [0.45, '0 0', 'back'], [D, '0 0']], ONCE))
  const flash = anim('scale', D, [[0, '1 1'], [0.5, '1 1'], [0.6, '1.35 1.35', 'p2out'], [0.75, '1 .2', 'p2io'], [0.9, '1.35 1.35', 'p2io'], [1.1, '1 1', 'p2io'], [D, '1 1']], ONCE)
  const bounce = anim('translate', D, [[0, '0 0'], [0.9, '0 0'], [1.05, '0 -8', 'p2out'], [1.2, '0 0', 'p2in'], [1.35, '0 -5', 'p2out'], [1.5, '0 0', 'p2in'], [D, '0 0']], ONCE)
  const arms = (dx) => anim('translate', D, [[0, '0 0'], [0.9, '0 0'], [1.05, `${dx} -10`, 'p2out'], [1.5, `${dx} -10`], [1.8, '0 0', 'p2io'], [D, '0 0']], ONCE)
  // Drawn over the outfit, so a hat or hood stays on and the antenna sticks out of it
  return wrap(figure({
    behind: antenna,
    // A hat or hood gets knocked off by the antenna popping up, and drops back on once he settles
    headAnims: activeOutfit?.head ? [
      anim('translate', D, [[0, '0 0'], [0.3, '0 0'], [0.55, '26 -46', 'p2out'], [0.85, '60 -120', 'p2in'], [1.75, '60 -120'], [1.76, '0 -120', 'lin'], [2.15, '0 3', 'p3in'], [2.25, '0 0', 'p2out'], [D, '0 0']], ONCE),
      anim('opacity', D, [[0, '1'], [0.75, '1'], [0.85, '0', 'lin'], [1.76, '0'], [1.78, '1', 'lin'], [D, '1']], ONCE),
    ] : [],
    ownProps: true,
    left: { anims: [arms(-4)] },
    right: { anims: [arms(4)] },
    eyes: { blink: false, scaleAnims: [flash] },
  }), '', bounce)
}

// Back to asking before each step (the default or accept-edits mode): he holds up a clipboard and ticks down a checklist
function modeAsk() {
  const D = EVENT_SECONDS.ask
  const tick = (y, at) => wrap(pixels(['..X', 'XX.', '.X.'].map((r) => r), 33, y, 2.4, '#3FA34D'), '', anim('opacity', D, [[0, '0'], [at, '0'], [at + 0.05, '1', 'lin'], [D, '1']], ONCE))
  const board = rect(28, 30, 52, 44, WOOD) + rect(31, 35, 46, 37, CREAM) + rect(46, 27, 16, 7, '#6F737A') +
    [42, 52, 62].map((y) => rect(31, y, 8, 8, '#FFFFFF') + rect(42, y + 3, 30, 2, PAPER_SHADE)).join('') + tick(42.5, 0.6) + tick(52.5, 1.2) + tick(62.5, 1.8)
  // The pencil's tip goes to each box (where the board shows them, a little enlarged) right as its tick appears
  const REST = [83, 59]
  const boxes = [0, 1, 2].map((i) => [36, 47 + 11.2 * i])
  const frames = (dx, dy) => {
    const at = ([x, y]) => `${x + dx} ${y + dy}`
    const out = [[0, at(REST)]]
    boxes.forEach((box, i) => out.push([0.45 + i * 0.6, at(box), 'p2io'], [0.65 + i * 0.6, at([box[0] + 3, box[1] - 2]), 'p2out']))
    out.push([2.3, at(REST), 'p2io'], [D, at(REST)])
    return anim('translate', D, out, ONCE)
  }
  const pencil = wrap(rect(-2.5, 0, 5, 5, '#E58A8A') + rect(-2.5, 5, 5, 2, '#B9B29F') + rect(-2.5, 7, 5, 35, '#E7B04A') + rect(-2.5, 42, 5, 4, '#F3D9A4') + rect(-1.2, 45.5, 2.4, 2.5, INK), 'rotate(25) translate(0 -48)')
  return figure({
    held: board,
    left: { hold: true, at: HOLD_LEFT },
    right: { over: true, hold: true, anims: [frames(-REST[0], -REST[1])] },
    ownProps: true,
    heldRaw: wrap(pencil, '', frames(0, 0)),
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.5, '-3 3', 'p2io'], [1.1, '-3 5', 'p2io'], [1.7, '-3 7', 'p2io'], [2.3, '0 0', 'p2io'], [D, '0 0']], ONCE)], blinkCycle: D, blinkAt: 2.5 },
  })
}

// Messages between sessions: he opens a laptop and video-calls another Clawd, a blue one, on the screen.
// talker 'me' (this session sent it): sound waves come from him; 'them' (it arrived): the blue Clawd waves and talks.
const CALLER = '#5B8DEF'
function caller(talks) {
  const C = 1.2
  const wave = wrap(rect(85, 21, 22, 23, CALLER), '', anim('rotate', 0.5, [[0, '-25 96 44'], [0.25, '15 96 44', 'sio'], [0.5, '-25 96 44', 'sio']]))
  const body = rect(11, 0, 85, 65, CALLER) + rect(21, 11, 11, 11, EYE) + rect(75, 11, 11, 11, EYE) + rect(0, 21, 22, 23, CALLER) + wrap(wave, 'translate(0 -22)') +
    LEG_X.map((x) => rect(x, 60, 11, 26, CALLER)).join('')
  return wrap(body, '', anim('translate', C, [[0, '0 0'], [C / 2, `0 ${talks ? -4 : -2}`, 'sio'], [C, '0 0', 'sio']]))
}
// Three little bars that pulse, as if someone is speaking
function soundWaves(x, y, side) {
  return [0, 1, 2].map((i) => wrap(rect(x + side * i * 5, y - 3 - i * 2, 3, 6 + i * 4, '#ECE8DE'), '',
    anim('opacity', 0.9, [[0, '0'], [0.15 + i * 0.12, '1', 'lin'], [0.6, '1'], [0.9, '0', 'lin']], { begin: i * 0.1 }))).join('')
}
function videoCall(talker) {
  const D = EVENT_SECONDS[talker === 'me' ? 'send' : 'receive']
  const connect = (inner) => wrap(inner, '', anim('opacity', D, [[0, '0'], [0.6, '0'], [0.7, '1', 'lin'], [D, '1']], ONCE))
  const ringing = wrap([0, 1, 2].map((i) => rect(44 + i * 8, 51, 5, 5, '#8A8F98')).join(''), '', anim('opacity', D, [[0, '1'], [0.6, '1'], [0.65, '0', 'lin'], [D, '0']], ONCE))
  const screen = rect(22, 33, 64, 40, '#3A3A37') + rect(25, 36, 58, 34, '#1E2A3F') + ringing +
    connect(wrap(caller(talker === 'them'), 'translate(36 40) scale(.33)') + (talker === 'them' ? soundWaves(72, 50, 1) : '') + rect(74, 38, 6, 4, '#E5584B'))
  const laptop = screen + rect(16, 73, 76, 5, '#9AA0A6') + rect(16, 77, 76, 2, '#6F737A')
  const open = anim('scale', D, [[0, '1 0.05'], [0.4, '1 1', 'back'], [D, '1 1']], ONCE)
  return figure({
    // The lid opens upward from the hinge at the bottom
    held: wrap(wrap(laptop, 'translate(-54 -73)'), 'translate(54 73)', open),
    left: { hold: true, at: HOLD_LEFT },
    right: { hold: true, at: HOLD_RIGHT },
    ownProps: true,
    upper: [anim('translate', 1.2, [[0, '0 0'], [0.6, `0 ${talker === 'me' ? -2.5 : -1}`, 'sio'], [1.2, '0 0', 'sio']])],
    eyes: { gaze: [anim('translate', D, [[0, '0 3'], [0.7, '0 5', 'p2io'], [D, '0 5']], ONCE)], blinkCycle: 2.2, blinkAt: 1.6 },
    props: talker === 'me' ? connect(soundWaves(104, 18, 1)) : '',
  })
}
// This session sent a message to another one: he video-calls and does the talking
function sendMessage() {
  return videoCall('me')
}
// Another session sent this one a message: the blue Clawd on the screen waves and talks while he listens
function receiveMessage() {
  return videoCall('them')
}

// The first snowfall of the season: he looks up and holds his hands out, a big snowflake drifts down onto his head, and he gives a happy shiver
function firstSnow() {
  const D = EVENT_SECONDS.firstsnow
  const FLAKE = ['..X..', 'X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X', '..X..']
  const flake = wrap(wrap(pixels(FLAKE, -6, -8.4, 2.4, '#FFFFFF'), '', anim('rotate', D, [[0, '0'], [2.2, '200', 'p2out'], [D, '200']], ONCE)), '',
    anim('translate', D, [[0, '78 -70'], [0.6, '70 -50', 'sio'], [1.2, '60 -38', 'sio'], [1.8, '56 -22', 'sio'], [2.2, '53.5 -8', 'p2out'], [D, '53.5 -8']], ONCE),
    anim('opacity', D, [[0, '0'], [0.2, '1', 'lin'], [3.4, '1'], [D, '0', 'lin']], ONCE))
  const handsOut = (dx) => anim('translate', D, [[0, '0 0'], [0.4, `${dx} -10`, 'p2io'], [2.2, `${dx} -10`], [2.5, '0 0', 'p2io'], [D, '0 0']], ONCE)
  const shiver = anim('translate', D, [[0, '0 0'], [2.3, '0 0'], ...[0, 1, 2, 3, 4, 5].map((k) => [n(2.4 + k * 0.08), `${k % 2 ? 2 : -2} 0`, 'sio']), [2.95, '0 0', 'sio'], [D, '0 0']], ONCE)
  return figure({
    upper: [shiver],
    left: { anims: [handsOut(-6)] },
    right: { anims: [handsOut(6)] },
    ownProps: true,
    heldRaw: flake,
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '2 -6', 'p2io'], [1.4, '0 -6', 'sio'], [2.2, '0 -6'], [2.5, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [2.2, '1.2 1.2', 'p2out'], [2.35, '1 .3', 'p2io'], [3.4, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// ---- switching models ----

// Down to a smaller model (Sonnet or Haiku): he shrinks with a squish, then puts on a pair of glasses and pushes them up his nose
function modelShrink() {
  const D = EVENT_SECONDS.shrink
  const size = anim('scale', D, [[0, '1 1'], [0.3, '1 1'], [0.55, '1.08 .88', 'p2out'], [1.0, '.68 .68', 'back'], [3.2, '.68 .68'], [D, '1 1', 'p2io']], ONCE)
  const glasses = wrap(readingGlasses(), '', anim('translate', D, [[0, '0 -40'], [1.3, '0 -40'], [1.65, '0 0', 'p2out'], [D, '0 0']], ONCE), anim('opacity', D, [[0, '0'], [1.3, '0'], [1.35, '1', 'lin'], [D, '1']], ONCE))
  const push = anim('translate', D, [[0, '0 0'], [2.0, '0 0'], [2.3, '-46 -22', 'p2io'], [2.45, '-46 -24'], [2.75, '0 0', 'p2io'], [D, '0 0']], ONCE)
  return wrap(wrap(figure({
    right: { anims: [push] },
    ownProps: true,
    heldRaw: glasses,
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.6, '0 -4', 'p2io'], [1.2, '0 -4'], [1.7, '0 0', 'p2io'], [D, '0 0']], ONCE)], blinkCycle: D, blinkAt: 1.8 },
  }), 'translate(-53.5 -86)'), 'translate(53.5 86)', size)
}

// Up to Opus: he pumps himself up bigger, muscle lines show on his chest and belly, and he flexes his bicep
function modelBuff() {
  const D = EVENT_SECONDS.buff
  const SHADE = DARK
  const pump = anim('scale', D, [[0, '1 1'], [0.2, '1 1'], [0.45, '.94 .9', 'p2out'], [0.9, '1.16 1.06', 'back'], [3.8, '1.16 1.06'], [D, '1 1', 'p2io']], ONCE)
  const muscles = wrap(rect(23, 30, 26, 3, SHADE) + rect(58, 30, 26, 3, SHADE) + rect(51, 28, 4, 30, SHADE) +
    [38, 46].map((y) => rect(41, y, 8, 3, SHADE) + rect(58, y, 8, 3, SHADE)).join(''), '', anim('opacity', D, [[0, '0'], [0.6, '0'], [0.9, '.55', 'lin'], [D, '.55']], ONCE))
  const raise = anim('translate', D, [[0, '0 0'], [1.0, '0 0'], [1.35, '10 -34', 'back'], [3.7, '10 -34'], [D, '0 0', 'p2io']], ONCE)
  // The bulge sits under his raised fist and swells each time he flexes
  const flex = anim('scale', D, [[0, '1 1'], [1.4, '1 1'], [1.6, '1.4 1.4', 'back'], [2.1, '1.1 1.1', 'p2io'], [2.4, '1.45 1.45', 'back'], [2.9, '1.1 1.1', 'p2io'], [3.2, '1.45 1.45', 'back'], [3.7, '1 1', 'p2io'], [D, '1 1']], ONCE)
  const bicep = wrap(wrap(rect(-10, -8, 20, 15, SKIN) + rect(-6, -8, 10, 3, '#E8957A'), '', flex), 'translate(88 46)')
  const shine = [[118, -14, 1.65], [104, -26, 2.45], [122, 0, 3.25]].map(([x, y, at]) => wrap(rect(-1.5, -6, 3, 12, '#FFD23F') + rect(-6, -1.5, 12, 3, '#FFD23F'), `translate(${x} ${y})`,
    anim('scale', D, [[0, '0 0'], [at, '0 0'], [at + 0.15, '1 1', 'p2out'], [at + 0.45, '0 0', 'p2in'], [D, '0 0']], ONCE))).join('')
  return wrap(wrap(figure({
    left: { anims: [anim('translate', D, [[0, '0 0'], [1.0, '0 0'], [1.3, '6 10', 'p2io'], [3.7, '6 10'], [D, '0 0', 'p2io']], ONCE)] },
    right: { over: true, anims: [raise] },
    ownProps: true,
    heldRaw: muscles + wrap(bicep, '', raise),
    eyes: { lid: 0.6, gaze: [anim('translate', D, [[0, '0 0'], [1.4, '0 0'], [1.7, '4 -4', 'p2io'], [D, '4 -4']], ONCE)], blinkCycle: D, blinkAt: 3.0 },
    props: shine,
  }), 'translate(-53.5 -86)'), 'translate(53.5 86)', pump)
}

// The divine look for Fable: white light over him, glowing white eyes, a halo and a pair of white wings
const LIGHT = '#FFFFFF'
const HALO = '#FFF3B0'
// A feathered wing reaching out and up from his shoulder, drawn for his right side (the left one is a mirror image)
const WING = ['......XXXX', '....XXXXXX', '..XXXXXXXX', '.XXXXXXXX.', 'XXXXXXXXX.', 'XXXXXXX...', 'XXXX.XX...', 'XX...X....']
function wing(flap) {
  const feathers = [3, 5].map((r) => rect(4 * 2, -28 + r * 4 + 3, 24, 1.2, '#D9D4F5')).join('')
  return wrap(pixels(WING, 1.5, -26.5, 4, '#CFC8F2') + pixels(WING, 0, -28, 4, LIGHT) + feathers, '', flap)
}
function divine({ shown, wingsShown, haloShown, D }) {
  const flap = anim('rotate', 0.7, [[0, '-14 0 0'], [0.35, '8 0 0', 'sio'], [0.7, '-14 0 0', 'sio']])
  const wings = wrap(wrap(wing(flap), 'translate(92 22)') + wrap(wing(flap), 'translate(15 22) scale(-1 1)'), '', wingsShown)
  const haloY = activeOutfit?.head ? -46 : -24
  const halo = wrap(rect(35, haloY - 2, 37, 3, HALO) + rect(35, haloY + 7, 37, 3, HALO) + rect(31, haloY + 1, 4, 6, HALO) + rect(72, haloY + 1, 4, 6, HALO), '', haloShown)
  // A soft glow in steps around his outline, brightest closest to him
  const aura = wrap([12, 8, 4].map((k) => rect(11 - k, -k, 85 + 2 * k, 86 + k, LIGHT, 'fill-opacity=".14"')).join('') + [12, 8, 4].map((k) => rect(-k, 21 - k, 107 + 2 * k, 23 + 2 * k, LIGHT, 'fill-opacity=".14"')).join(''),
    '', shown(1), anim('opacity', 1.2, [[0, '.75'], [0.6, '1', 'sio'], [1.2, '.75', 'sio']]))
  // A white wash over his body and hands, so he glows whatever he is wearing
  const wash = wrap(rect(11, 0, 85, 65, LIGHT) + rect(0, 21, 22, 23, LIGHT) + rect(85, 21, 22, 23, LIGHT), '', shown(0.5))
  const legsWash = wrap(LEG_X.map((x) => rect(x, 60, 11, 26, LIGHT)).join(''), '', shown(0.5))
  return { behind: aura + wings, over: wash, front: legsWash + halo, D }
}
// Opacity that follows a list of [time, amount] steps, scaled by how bright the glow is meant to be
const glowSteps = (D, steps) => (max) => anim('opacity', D, steps.map(([t, v], i) => [t, String(n(v * max)), i ? 'lin' : undefined]), ONCE)

// Up to Fable: a beam of light falls on him, he lights up white, his eyes glow, wings unfold, a halo appears and he rises up
function modelAscend() {
  const D = EVENT_SECONDS.ascend
  const shown = glowSteps(D, [[0, 0], [0.3, 0], [1.0, 1], [D, 1]])
  const unfold = anim('scale', D, [[0, '0 0'], [1.0, '0 0'], [1.5, '1 1', 'back'], [D, '1 1']], ONCE)
  const look = divine({ shown, wingsShown: unfold, haloShown: anim('opacity', D, [[0, '0'], [1.4, '0'], [1.7, '1', 'lin'], [D, '1']], ONCE), D })
  // The beam widens as it comes down, in steps
  const beam = wrap([0, 1, 2, 3, 4].map((i) => rect(n(23 - i * 9), -74 + i * 32, n(61 + i * 18), 32, LIGHT)).join(''), '', anim('opacity', D, [[0, '0'], [0.1, '0'], [0.6, '.1', 'lin'], [D, '.1']], ONCE))
  const rise = anim('translate', D, [[0, '0 0'], [1.8, '0 0'], [3.2, '0 -28', 'sio'], [3.8, '0 -24', 'sio'], [D, '0 -28', 'sio']], ONCE)
  const whiteEyes = anim('fill', D, [[0, EYE], [0.6, EYE], [1.1, LIGHT, 'lin'], [D, LIGHT]], ONCE)
  return beam + wrap(figure({
    behind: look.behind,
    heldRaw: look.over,
    ownProps: true,
    eyes: { colour: whiteEyes, blink: false, gaze: [anim('translate', D, [[0, '0 0'], [0.5, '0 -5', 'p2io'], [D, '0 -5']], ONCE)] },
    props: look.front,
  }), '', rise)
}

// Down from Fable: hovering in the light, the glow flickers out, the wings fold away, the halo drops, and he falls with a thump
function modelFall() {
  const D = EVENT_SECONDS.fall
  const shown = glowSteps(D, [[0, 1], [0.3, 1], [0.4, 0.2], [0.5, 0.9], [0.6, 0.1], [0.7, 0.6], [0.9, 0], [D, 0]])
  const fold = anim('scale', D, [[0, '1 1'], [0.6, '1 1'], [0.95, '0 0', 'p2in'], [D, '0 0']], ONCE)
  const look = divine({ shown, wingsShown: fold, haloShown: anim('opacity', D, [[0, '1'], [0.8, '1'], [1.2, '0', 'lin'], [D, '0']], ONCE), D })
  const drop = anim('translate', D, [[0, '0 -28'], [1.0, '0 -30', 'p2out'], [1.35, '0 0', 'p3in'], [D, '0 0']], ONCE)
  const thump = anim('scale', D, [[0, '1 1'], [1.35, '1 1'], [1.45, '1.12 .82', 'p2out'], [1.7, '1 1', 'back'], [D, '1 1']], ONCE)
  const darkEyes = anim('fill', D, [[0, LIGHT], [0.5, LIGHT], [0.9, EYE, 'lin'], [D, EYE]], ONCE)
  const puffs = [-1, 1].map((side) => wrap(rect(-7, -6, 14, 10, '#A8A49A'), `translate(${54 + side * 44} 82)`,
    anim('translate', D, [[0, '0 0'], [1.35, '0 0'], [1.9, `${side * 20} -6`, 'p2out'], [D, `${side * 20} -6`]], ONCE),
    anim('opacity', D, [[0, '0'], [1.35, '0'], [1.4, '.85', 'lin'], [1.9, '0', 'lin'], [D, '0']], ONCE))).join('')
  return wrap(wrap(wrap(figure({
    behind: look.behind,
    heldRaw: look.over,
    eyes: {
      colour: darkEyes,
      blink: false,
      gaze: [anim('translate', D, [[0, '0 -5'], [0.9, '0 4', 'p2io'], [1.3, '0 4'], [2.4, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.9, '1.3 1.3', 'p2out'], [1.35, '1.3 1.3'], [1.4, '1 .15', 'lin'], [2.2, '1 .15'], [2.4, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
    props: look.front,
  }), 'translate(-53.5 -86)'), 'translate(53.5 86)', thump), '', drop) + puffs
}

// ---- the corner readout: time, day, weather and how many sessions are open ----

// A 3x5 pixel alphabet (M, N and W are 5 wide) for the day names and AM/PM
const LETTERS = {
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'], E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'], H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'], I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'], N: ['X..X', 'XX.X', 'X.XX', 'X..X', 'X..X'], O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'], R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'], S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.'], U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'], W: ['X...X', 'X...X', 'X.X.X', 'XX.XX', 'X...X'],
  ':': ['.', 'X', '.', 'X', '.'], '°': ['XX', 'XX', '..', '..', '..'], ' ': ['.'],
  '-': ['...', '...', 'XXX', '...', '...'],
}
function hudText(text, x, y, cell, fill) {
  let cursor = x
  let out = ''
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      out += digitsSvg(ch, cursor, y, cell, fill)
      cursor += 4 * cell
      continue
    }
    const rows = LETTERS[ch]
    if (!rows) continue
    out += pixels(rows, cursor, y, cell, fill)
    cursor += (rows[0].length + 1) * cell
  }
  return { svg: out, end: cursor - cell }
}
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
function weatherIcon(sky, isDay, x, y, c) {
  const cloud = (fill) => rect(x + c, y + 2 * c, 6 * c, 2 * c, fill) + rect(x + 2 * c, y + c, 3 * c, c, fill)
  if (sky === 'sunny' || !sky) return isDay === false ? rect(x + 2 * c, y, 3 * c, 5 * c, '#F2E6A6') + rect(x + c, y + c, c, 3 * c, '#F2E6A6') + rect(x + 3 * c, y + c, 2 * c, 2 * c, '#1F1E1D') : rect(x + 2 * c, y + c, 3 * c, 3 * c, '#FFD23F') + rect(x + 3 * c, y, c, 5 * c, '#FFD23F') + rect(x + c, y + 2 * c, 5 * c, c, '#FFD23F')
  if (sky === 'cloudy') return cloud('#C9C6BC')
  if (sky === 'rain') return cloud('#A9A69C') + [1, 3, 5].map((k) => rect(x + k * c, y + 4 * c, c * 0.8, c, '#6EC6FF')).join('')
  if (sky === 'storm') return cloud('#8A877E') + rect(x + 3 * c, y + 4 * c, c, c, '#FFD23F') + rect(x + 2.5 * c, y + 5 * c, c, c * 0.8, '#FFD23F')
  if (sky === 'snow') return rect(x + 3 * c, y, c, 5 * c, '#DDEEFF') + rect(x + c, y + 2 * c, 5 * c, c, '#DDEEFF') + [[1.6, 0.6], [4.4, 0.6], [1.6, 3.4], [4.4, 3.4]].map(([dx, dy]) => rect(x + dx * c, y + dy * c, c, c, '#DDEEFF')).join('')
  if (sky === 'fog') return [0, 2, 4].map((k) => rect(x + (k % 4 ? 0 : c), y + k * c, 6 * c, c * 0.8, '#C9C6BC')).join('')
  return ''
}
// One small dark tag: e.g. "SAT 9:41 AM ☀ 12°  ▮2". hour/minute/day as numbers; weather may be null; sessions counts this one
export function hudSvg({ hour, minute, day, weather = null, sessions = 1, cell = 1.6 }) {
  const fill = '#ECE8DE'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const pad = 3
  let { svg, end } = hudText(`${DAYS[day]} ${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`, pad, pad, cell, fill)
  if (weather) {
    svg += weatherIcon(weather.sky, weather.isDay, end + 3 * cell, pad, cell)
    end += 10 * cell
    if (typeof weather.temp === 'number') {
      const t = hudText(`${Math.round(weather.temp)}°`, end + cell, pad, cell, fill)
      svg += t.svg
      end = t.end
    }
  }
  if (sessions > 1) {
    // A tiny Clawd and how many sessions are open right now
    const x = end + 4 * cell
    svg += rect(x + cell * 0.5, pad, cell * 4, cell * 3, SKIN) + rect(x, pad + cell, cell * 5, cell, SKIN) + rect(x + cell, pad + cell * 3, cell * 0.8, cell * 2, SKIN) + rect(x + cell * 3.2, pad + cell * 3, cell * 0.8, cell * 2, SKIN) +
      rect(x + cell * 1.2, pad + cell, cell * 0.6, cell * 0.6, EYE) + rect(x + cell * 3.2, pad + cell, cell * 0.6, cell * 0.6, EYE)
    const t = hudText(`${Math.min(99, sessions)}`, x + 6 * cell, pad, cell, fill)
    svg += t.svg
    end = t.end
  }
  const w = n(end + pad)
  const h = n(5 * cell + pad * 2)
  return { svg: `<rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="#1F1E1D" fill-opacity=".72"/>${svg}`, width: w, height: h }
}

// Helper agents at work: little Clawds in hard hats bob along beside him, and one waves goodbye and walks off when it finishes
function miniClawd(begin = 0) {
  const body = rect(11, 0, 85, 65, SKIN) + rect(21, 11, 11, 11, EYE) + rect(75, 11, 11, 11, EYE) + rect(0, 21, 22, 23, SKIN) + rect(85, 21, 22, 23, SKIN) +
    LEG_X.map((x) => rect(x, 60, 11, 26, SKIN)).join('') + rect(22, -14, 63, 14, '#E7B04A') + rect(11, -3, 85, 5, '#C99A3B')
  return wrap(body, '', anim('translate', 0.6, [[0, '0 0'], [0.3, '0 -5', 'sio'], [0.6, '0 0', 'sio']], { begin: -begin }))
}
export const HELPER_LEAVE_SECONDS = 1.8
export function helpersSvg(count, isLeaving = false) {
  const MINI = 0.34
  const at = (x) => `translate(${x} ${n(FLOOR - FLOOR * MINI)}) scale(${MINI})`
  const shown = Math.min(2, count)
  const minis = Array.from({ length: shown }, (_, i) => wrap(miniClawd(i * 0.23), at(112 + i * 38))).join('')
  const more = count > 2 ? pixels(['X.X', '.X.', 'X.X'], 188, 66, 2.2, '#A9A69C') + digitsSvg(String(Math.min(9, count - 2)), 196, 62, 2.2, '#A9A69C') : ''
  const D = HELPER_LEAVE_SECONDS
  const leaving = isLeaving
    ? wrap(wrap(miniClawd() + wrap(rect(85, 21, 22, 23, SKIN), '', anim('rotate', 0.4, [[0, '-30 96 44'], [0.2, '10 96 44', 'sio'], [0.4, '-30 96 44', 'sio']])), at(112 + shown * 38)), '',
      anim('translate', D, [[0, '0 0'], [0.7, '0 0'], [D, '60 0', 'p2in']], ONCE), anim('opacity', D, [[0, '1'], [1.2, '1'], [D, '0', 'lin']], ONCE))
    : ''
  return minis + more + leaving
}

// ---- events and limit warnings ----

const BROWN = '#6B4F3A'
const BELL = '#C9C6BC'

// Model switch (gym) and five-hour reset (flag) are frame-by-frame animations measured from recordings
// of the pixel-art originals (see tools/). Each frame is a set of rectangles; the animation shows one
// frame at a time and holds each for as long as the original did.
const SHEETS = { gym: GYM, flag: FLAG }
// How fast he lifts at each effort level: a higher effort, faster reps
export const EFFORT_SPEED = { low: 0.7, medium: 1, high: 1.4, xhigh: 1.8, max: 2.4 }

// Back to front. Ink is the dumbbell plates, always black.
const SHEET_LAYERS = ['skin', 'navy', 'gray', 'white', 'black', 'ink', 'eye']

function outline(rects) {
  let d = ''
  for (let i = 0; i < rects.length; i += 4) {
    const [x, y, w, h] = rects.slice(i, i + 4)
    d += `M${x} ${y}h${w}v${h}h${-w}z`
  }
  return d
}

// Where his body is in a recorded frame, as a shift from his usual place: the body is the one 85 wide row of skin blocks
function bodyShift(frame) {
  let best = null
  const skin = frame.skin ?? []
  for (let i = 0; i < skin.length; i += 4) {
    const [x, y, w] = skin.slice(i, i + 4)
    if (w >= 80 && w <= 90 && (best === null || y < best.y)) best = { x, y }
  }
  return best === null ? [0, 0] : [n(best.x - 11), n(best.y)]
}

// The white middle of the flag, worked out from the frame itself. A recorded frame can be front on, dipped or turned sideways,
// so the stripe is not at a fixed spot: for every row of his body it is the middle half of that row's own width.
// Returns { d, centre, width, top } or null. Rows are his skin plus his eyes (which sit inside his head), joined where they touch.
function stripeOf(frame) {
  // Turned or tilted (his eyes are at different heights), the head sits off to one side, so the white keeps to the body below it
  const eyes = frame.eye ?? []
  const isProfile = eyes.length >= 8 && Math.abs(eyes[1] - eyes[5]) > 3
  const headBottom = isProfile ? Math.max(eyes[1] + eyes[3], eyes[5] + eyes[7]) : -Infinity
  const rows = new Map()
  for (const colour of ['skin', 'eye']) {
    const list = frame[colour] ?? []
    for (let i = 0; i < list.length; i += 4) {
      const [x, y, w, h] = list.slice(i, i + 4)
      if (isProfile && y < headBottom) continue
      const key = `${y}|${h}`
      if (!rows.has(key)) rows.set(key, { y, h, spans: [] })
      rows.get(key).spans.push([x, x + w])
    }
  }
  const joined = [...rows.values()].map(({ y, h, spans }) => {
    spans.sort((p, q) => p[0] - q[0])
    const merged = []
    for (const span of spans) {
      const last = merged[merged.length - 1]
      if (last && span[0] <= last[1] + 0.6) last[1] = Math.max(last[1], span[1])
      else merged.push([...span])
    }
    return { y, h, spans: merged.filter(([from, to]) => to - from >= 30) }
  }).filter((row) => row.spans.length > 0)
  if (joined.length === 0) return null
  // The torso rows are the ones no wider than his body; arms and raised hands make some rows wider
  const widthOf = ([from, to]) => to - from
  const torso = joined.flatMap((row) => row.spans.filter((span) => widthOf(span) <= 90))
  const reference = (torso.length ? torso : joined.flatMap((row) => row.spans)).reduce((best, span) => (widthOf(span) > widthOf(best) ? span : best))
  const centre = (reference[0] + reference[1]) / 2
  const width = widthOf(reference) / 2
  const from = centre - width / 2
  const to = centre + width / 2
  let d = ''
  for (const row of joined) {
    for (const [a, b] of row.spans) {
      const left = Math.max(a, from)
      const right = Math.min(b, to)
      if (right - left > 0.5) d += `M${n(left)} ${row.y}h${n(right - left)}v${row.h}h${n(left - right)}z`
    }
  }
  return { d, centre, width, top: Math.min(...joined.map((row) => row.y)), isProfile }
}

function sheetPaths(frame, outfit, coloursOnly) {
  const path = (colour) => `<path fill="${colour === 'skin' && outfit?.skin ? outfit.skin : SHEET_COLOURS[colour]}" d="${outline(frame[colour])}"/>`
  const [dx, dy] = outfit ? bodyShift(frame) : [0, 0]
  const worn = (art) => (art ? `<g transform="translate(${dx} ${dy})">${art}</g>` : '')
  const stripe = outfit?.stripe ? stripeOf(frame) : null
  // The leaf sits in the middle of the white, shrunk if the body is turned and narrow
  const leaf =
    stripe && outfit.leaf
      ? `<g transform="translate(${n(stripe.centre)} ${n(stripe.top + (stripe.isProfile ? 4 : 16))}) scale(${n(Math.min(1, (stripe.width - 4) / 30))}) translate(-53.5 -20)">${outfit.leaf}</g>`
      : ''
  // His skin first, then what he wears on his body, then the weights and eyes, and the hat on top
  return (
    SHEET_LAYERS.filter((colour) => frame[colour] && colour === 'skin').map(path).join('') +
    (stripe ? `<path fill="${outfit.stripe.color}" d="${stripe.d}"/>` : '') +
    (coloursOnly ? leaf : worn(outfit?.body)) +
    SHEET_LAYERS.filter((colour) => frame[colour] && colour !== 'skin').map(path).join('') +
    (coloursOnly ? '' : worn(outfit?.head))
  )
}

function sheetFigure(sheet, speed = 1) {
  // The gym routine only takes colours (no hat, no belt); the flag routine takes the whole outfit
  const coloursOnly = sheet === GYM
  const total = n(sheet.sequence.reduce((sum, [, seconds]) => sum + seconds, 0) / speed)
  const pace = (seconds) => seconds / speed
  return sheet.frames
    .map((frame, index) => {
      // When this frame switches on and off over one pass
      const keys = []
      let at = 0
      let last = null
      for (const [which, seconds] of sheet.sequence) {
        const visible = which === index
        if (visible !== last) keys.push([at, visible])
        last = visible
        at += pace(seconds)
      }
      keys.push([total, last])
      const times = keys.map(([t]) => n(t / total)).join(';')
      const values = keys.map(([, visible]) => (visible ? 'visible' : 'hidden')).join(';')
      const show =
        `<animate attributeName="visibility" dur="${total}s" begin="0s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times}" values="${values}"/>`
      return `<g visibility="hidden" shape-rendering="crispEdges">${sheetPaths(frame, activeOutfit, coloursOnly)}${show}</g>`
    })
    .join('')
}

// The flag routine on Canada Day and Chile's Independence Day: he stands waving that country's flag (about 2 seconds a wave, repeating)
function flagWave(flagArt) {
  const C = 1.6
  const wave = (extra) => anim('rotate', C, [[0, '-10 96 33'], [C / 2, '10 96 33', 'sio'], [C, '-10 96 33', 'sio']], extra)
  return figure({
    left: { at: 'translate(0 4)' },
    right: { at: 'translate(0 -19)', over: true, anims: [wave()] },
    ownProps: true,
    heldRaw: wrap(wrap(flagArt, 'translate(94 0)', anim('scale', 0.5, [[0, '1 1'], [0.25, '.94 1.03', 'sio'], [0.5, '1 1', 'sio']])), 'translate(0 -19)', wave()),
    upper: [anim('rotate', 3.2, [[0, '-1.5 53 65'], [1.6, '1.5 53 65', 'sio'], [3.2, '-1.5 53 65', 'sio']])],
    eyes: { blinkCycle: 3.2, blinkAt: 2.6 },
  })
}

// Held items for the limit warnings share one look: nervous eyes, sweat, and a worried hold
function worried(isRun, held, urgent, heldAnims = []) {
  const C = 2.8
  const period = urgent ? 0.28 : 0.4
  const shake = anim('translate', 0.14, [[0, '0 0'], [0.035, '-1.2 0', 'sio'], [0.07, '0 0', 'sio'], [0.105, '1.2 0', 'sio'], [0.14, '0 0', 'sio']])
  const tap = (i) => (i === 3 && !isRun ? [anim('scale', 0.5, [[0, '1 1'], [0.1, '1 .5', 'p2out'], [0.25, '1 1', 'p2in'], [0.5, '1 1']])] : [])
  return figure({
    legs: isRun ? { period } : { hipAnim: (i) => tap(i) },
    upper: [...(urgent ? [shake] : []), ...(isRun ? [bob(period, 2)] : [])],
    held,
    heldAnims,
    left: { hold: true, at: HOLD_LEFT },
    right: { hold: true, at: HOLD_RIGHT },
    eyes: {
      gaze: [anim('translate', C, [[0, '0 5'], [1.0, '0 5'], [1.15, '-5 -1', 'p2io'], [1.7, '-5 -1'], [1.85, '0 5', 'p2io'], [C, '0 5']])],
      blinkCycle: C,
      blinkAt: 2.3,
    },
    props: drop(102, 4) + (urgent ? drop(-8, 10, 0.8) : ''),
  })
}

// The big hand jumps one minute mark at a time: it holds, snaps a little past the mark, and settles
function minuteHand(tick) {
  const frames = []
  for (let k = 0; k < 12; k++) {
    const a = k * 30
    frames.push([k * tick, a], [k * tick + tick * 0.7, a], [k * tick + tick * 0.88, a + 34, 'p2out'], [(k + 1) * tick, a + 30, 'p2io'])
  }
  return frames
}

// Five hours nearly used: an alarm clock whose red wedge is the part of the window already used
function clock(isRun, percent = 85) {
  const used = Math.min(1, Math.max(0, percent / 100))
  const urgent = percent >= 95
  const cx = 53.5
  const cy = 54
  const tick = urgent ? 0.18 : 0.5
  const point = (radius, turn) => `${n(cx + radius * Math.sin(turn * 2 * Math.PI))},${n(cy - radius * Math.cos(turn * 2 * Math.PI))}`
  const steps = Math.max(2, Math.ceil(used * 24))
  const arc = Array.from({ length: steps + 1 }, (_, i) => point(14, (used * i) / steps)).join(' ')
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const long = i % 3 === 0
    return wrap(rect(-0.8, -14.5, 1.6, long ? 4 : 2.2, '#3A3A37'), `translate(${cx} ${cy}) rotate(${i * 30})`)
  }).join('')
  const bell = (x, tilt) =>
    wrap(
      `<circle cx="0" cy="0" r="5.5" fill="${BELL}"/>` + rect(-1, 4, 2, 4, '#7A7870'),
      `translate(${x} ${cy - 20})`,
      ...(urgent ? [anim('rotate', 0.16, [[0, `${-tilt}`], [0.08, `${tilt}`, 'sio'], [0.16, `${-tilt}`, 'sio']])] : []),
    )
  const face =
    rect(cx - 21, cy + 17, 5, 5, '#6B4F3A') + rect(cx + 16, cy + 17, 5, 5, '#6B4F3A') +
    `<circle cx="${cx}" cy="${cy}" r="18.5" fill="#6B4F3A"/><circle cx="${cx}" cy="${cy}" r="15.8" fill="#FBF8EE"/>` +
    `<polygon points="${cx},${cy} ${arc}" fill="#DD5A43" fill-opacity=".85"/>` + ticks +
    wrap(rect(-1.6, -8, 3.2, 8, '#6B4F3A'), `translate(${cx} ${cy}) rotate(${n(used * 360)})`) +
    wrap(rect(-1.2, -14.5, 2.4, 16.5, '#191919'), `translate(${cx} ${cy})`, anim('rotate', 12 * tick, minuteHand(tick))) +
    wrap(rect(-0.6, -14, 1.2, 16, '#E03C31'), `translate(${cx} ${cy})`, anim('rotate', 2.4, [[0, '0'], [2.4, '360', 'lin']])) +
    `<circle cx="${cx}" cy="${cy}" r="2" fill="#191919"/>`
  const ring = urgent
    ? wrap(`<circle cx="${cx}" cy="${cy}" r="21" fill="none" stroke="#E03C31" stroke-width="2.4"/>`, '', anim('opacity', 0.8, [[0, '0'], [0.4, '.9', 'sio'], [0.8, '0', 'sio']]))
    : ''
  return worried(isRun, bell(cx - 12, 9) + bell(cx + 12, -9) + face + ring, urgent)
}

// A week nearly used: one box a day, filled in as the week is used up
function calendar(isRun, percent = 85) {
  const urgent = percent >= 95
  const days = (percent / 100) * 7
  const full = Math.min(7, Math.floor(days))
  const part = Math.min(1, days - full)
  const cells = Array.from({ length: 7 }, (_, i) => {
    const x = 31 + i * 7
    const base = rect(x, 46, 5.5, 14, '#E9E4D6')
    if (i < full) return rect(x, 46, 5.5, 14, DARK)
    if (i === full && part > 0) {
      const fill = wrap(rect(x, 60 - 14 * part, 5.5, 14 * part, DARK), '', anim('opacity', 1.2, [[0, '1'], [0.6, '.4', 'sio'], [1.2, '1', 'sio']]))
      return base + fill
    }
    return base
  }).join('')
  const sheet =
    rect(26, 30, 56, 44, CREAM) + rect(26, 30, 56, 10, DARK) + rect(38, 27, 3, 7, '#555') + rect(66, 27, 3, 7, '#555') + cells + rect(31, 64, 46, 2, PAPER_SHADE) + rect(31, 68, 30, 2, PAPER_SHADE)
  const flutter = urgent ? [anim('rotate', 0.4, [[0, '-2 53.5 52'], [0.2, '2 53.5 52', 'sio'], [0.4, '-2 53.5 52', 'sio']])] : []
  return worried(isRun, sheet, urgent, flutter)
}

const LOOKS = {
  // One recorded routine each, so no idle and running pair
  gym: (x) => sheetFigure(GYM, EFFORT_SPEED[x?.effort] ?? 1),
  flag: () => (activeOutfit === OUTFITS.canada ? flagWave(bigCanadianFlag()) : activeOutfit === OUTFITS.chile ? flagWave(bigChileanFlag()) : activeOutfit === OUTFITS.chinese ? flagWave(bigChineseFlag()) : activeOutfit === OUTFITS.usa ? flagWave(bigUsFlag()) : activeOutfit === OUTFITS.cinco ? flagWave(bigMexicanFlag()) : sheetFigure(FLAG)),
  clock: [(x) => clock(false, x?.percent), (x) => clock(true, x?.percent)],
  calendar: [(x) => calendar(false, x?.percent), (x) => calendar(true, x?.percent)],
  calm: [calmIdle, () => calmRun()],
  tired: [() => tired(false), () => tired(true)],
  strained: [() => strained(false), () => strained(true)],
  critical: [() => critical(false), () => critical(true)],
  think: [() => think(false), () => think(true)],
  task: [(x) => task(false, x?.tasks, x?.coffee), (x) => task(true, x?.tasks, x?.coffee)],
  edit: [() => notepad(false), () => notepad(true)],
  shell: [() => terminal(false), () => terminal(true)],
  look: [() => book(false), () => book(true)],
  done: [() => done(false), () => done(true)],
  limit: limitReached,
  asleep: [asleep, wake],
  permission,
  asking: (x) => asking(x?.questions),
  shrug,
  oops,
  glitch,
  stamp,
  pop,
  peek,
  house,
  hello,
  bye,
  folder,
  plan: modePlan,
  auto: modeAuto,
  ask: modeAsk,
  send: sendMessage,
  receive: receiveMessage,
  present,
  shrink: modelShrink,
  buff: modelBuff,
  ascend: modelAscend,
  fall: modelFall,
  firstsnow: firstSnow,
  cheer,
  facepalm,
  ship,
  rocket,
  browse,
  trophy,
  yoyo,
  juggle,
  stretch,
  phone,
  coffee,
  game,
  gum,
  music,
  readbook,
  startled,
  blush,
  nervous,
  flinch,
  camera,
  tapfoot,
  yawn,
  unbox,
  magnify,
  mail,
  risky,
  listen,
  mog,
  // One-shot routines have no idle and running pair
  bedtime,
  compact,
  wake,
}

export const VECTOR_STATES = Object.keys(LOOKS)
// The reactions to Claude Code's events: each has one version (no running one); the one-off ones play once and hold
export const REACTIONS = ['permission', 'asking', 'shrug', 'oops', 'glitch', 'stamp', 'pop', 'peek', 'house', 'hello', 'bye', 'folder', 'plan', 'auto', 'ask', 'send', 'receive', 'present', 'shrink', 'buff', 'ascend', 'fall', 'firstsnow', 'cheer', 'facepalm', 'ship', 'rocket', 'browse', 'trophy', 'yoyo', 'juggle', 'stretch', 'phone', 'coffee', 'game', 'gum', 'music', 'readbook', 'startled', 'blush', 'nervous', 'flinch', 'camera', 'tapfoot', 'yawn', 'unbox', 'magnify', 'mail', 'risky', 'listen', 'mog']

// extra.percent: how full the limit is, for the clock and the calendar
export function figureFor(state, gait, extra = {}) {
  const look = LOOKS[state] ?? LOOKS.calm
  // Gym Clawd is a recording that does not suit hats or belts, so he only takes on Canada Day's red and white
  const chosen = OUTFITS[extra.outfit] ?? null
  activeOutfit = state === 'gym' && !chosen?.stripe ? null : chosen
  activeMood = state === 'tired' || state === 'strained' || state === 'critical' || state === 'limit' ? state : null
  try {
    const drawing = typeof look === 'function' ? look(extra) : look[gait === 'run' ? 1 : 0](extra)
    return activeOutfit?.skin ? drawing.split(SKIN).join(activeOutfit.skin).split(DARK).join(activeOutfit.dark ?? DARK) : drawing
  } finally {
    activeOutfit = null
    activeMood = null
  }
}

// Everything the band draws as one see-through SVG: Clawd walking from one column to another, standing on top of a
// row of readout pills. columns: width of the band in terminal columns; fromCol/toCol: where he starts and ends;
// walkSeconds: how long the walk takes (0 for standing); dir: 1 faces right, -1 faces left; chips: the readout.
// Returns { svg, width, height } with the size in screen pixels.
// A walk starts and stops gently: a short speed-up, a steady middle, a short slow-down.
// A walk picked up part-way (rampIn false) is already moving, so it only slows down at the end.
// walkColumn says where he is part-way through, so a cut-short walk can carry on from there.
const WALK_RAMP_SECONDS = 0.4
function walkProfile(from, to, seconds, rampIn = true) {
  const ramp = Math.min(WALK_RAMP_SECONDS, seconds / 3)
  const speed = (to - from) / (seconds - (rampIn ? ramp : ramp / 2))
  return { ramp, speed }
}
export function walkColumn(from, to, seconds, elapsed, rampIn = true) {
  if (seconds <= 0 || elapsed >= seconds) return to
  if (elapsed <= 0) return from
  const { ramp, speed } = walkProfile(from, to, seconds, rampIn)
  const left = seconds - elapsed
  if (left < ramp) return to - (speed * left * left) / (2 * ramp)
  if (!rampIn) return from + speed * elapsed
  if (elapsed < ramp) return from + (speed * elapsed * elapsed) / (2 * ramp)
  return from + speed * (ramp / 2 + (elapsed - ramp))
}

// Room he needs at the right end of the row: his body and the thought bubble that reaches out beside him
const INLINE_UNITS = 170
// A little room under the pills when leaves or snow pile along the bottom
const PILE_PAD = 5

// When the readout grows, it slides in from the left and pushes him along
export const PUSH_SECONDS = 0.6
const FADE_SECONDS = 0.35
const SLIDE_MIN_PX = 40
const TURNS_AROUND = new Set(['calm', 'tired', 'strained'])
// Scenes that ice over the pills, and the one that melts them
const COLD_SCENES = new Set(['snow', 'blizzard', 'frostedglass', 'freezingrain'])
// How far past his body (left, right) a look reaches, so it is not cut off at the edges of the strip
const REACH = { think: [0, 168], task: [-50, 110], pop: [-70, 110], asking: [0, 152], hello: [0, 150], bye: [0, 150], peek: [0, 150], house: [0, 170], send: [0, 190], receive: [-120, 110], buff: [-10, 135], ascend: [-30, 140], fall: [-30, 140] }

function walkSlide(x0, x1, seconds, rampIn) {
  const { ramp, speed } = walkProfile(x0, x1, seconds, rampIn)
  const startFrames = rampIn ? [[0, `${x0} 0`], [ramp, `${n(x0 + (speed * ramp) / 2)} 0`, 'p2in']] : [[0, `${x0} 0`]]
  return anim('translate', seconds, [
    ...startFrames,
    [seconds - ramp, `${n(x1 - (speed * ramp) / 2)} 0`, 'lin'],
    [seconds, `${x1} 0`, 'p2out'],
  ], { once: true })
}

export function bandLayout({ columns, fromCol, toCol = fromCol, walkSeconds = 0, dir = 1, state = 'calm', gait = 'idle', percent, unit = UNIT, chips = [], resume = false, inline = false, slideFrom = null, outfit = null, scene = null, wind = 0, tasks = 0, coffee = false, questions = 1, helpers = 0, helperLeaving = false, hud = null, effort = null }) {
  // The desktop shows a full meter by its glow, so the text badge ('getting full') is for the terminal only
  chips = chips.filter((chip) => chip.kind !== 'badge')
  return layoutBand({ columns, fromCol, toCol, walkSeconds, dir, state, gait, percent, unit, chips, resume, inline, slideFrom, outfit, scene, wind, tasks, coffee, questions, helpers, helperLeaving, hud, effort })
}

function layoutBand({ columns, fromCol, toCol, walkSeconds, dir, state, gait, percent, unit, chips, resume, inline, slideFrom, outfit, scene, wind, tasks, coffee, questions, helpers, helperLeaving, hud, effort }) {
  const width = columns * COLUMN_PX
  const widthUnits = width / unit
  const px = (col) => n((col * COLUMN_PX) / unit)
  // Inline: he stands at the right end of the readout's row instead of above it, when the pills leave room for him
  const roomPx = n(INLINE_UNITS * unit)
  // The pills squeeze to the room left beside him (the bar shrinks, then goes, then the labels shorten); only if even that fails do they stack below
  const fitted = chips.length ? fitChips(chips, inline ? width - 8 - roomPx : width) : { chips: [], width: 0 }
  const chipsW = fitted.width
  const isInline = inline && fitted.chips.length > 0
  // Right next to the last pill (his body starts 11 units in from his origin)
  // The weights and the flag reach out to his left, so he stands far enough along to keep them clear of the pills
  const leftReach = Math.min(11, SHEETS[state]?.bounds[0] ?? 11)
  const originUnits = isInline ? n((chipsW + 8) / unit - leftReach) : null
  if (isInline) walkSeconds = 0
  // The frame-by-frame looks reach past his body (dumbbells, a flag), and they stand still while they play
  const sheet = SHEETS[state]
  if (sheet) walkSeconds = 0
  const ownReach = REACH[state] ?? (sheet ? (dir < 0 && TURNS_AROUND.has(state) ? [SPRITE_UNITS - sheet.bounds[2], SPRITE_UNITS - sheet.bounds[0]] : [sheet.bounds[0], sheet.bounds[2]]) : null)
  // Helper Clawds stand off to his right
  const hasHelpers = helpers > 0 || helperLeaving
  const reach = hasHelpers ? [Math.min(0, ownReach?.[0] ?? 0), Math.max(200, ownReach?.[1] ?? 0)] : ownReach
  const fromUnits = isInline ? originUnits : px(fromCol)
  const startUnits = reach ? n(Math.min(Math.max(fromUnits, -reach[0]), widthUnits - reach[1])) : fromUnits

  const figureSvg = figureFor(state, gait, { percent, outfit, tasks, coffee, questions, effort }) + (hasHelpers ? helpersSvg(helpers, helperLeaving) : '')
  // Only the plain looks turn around when he walks left: anything he holds or wears (paper, book, clock face, hat) would come out back to front
  const flipped = dir < 0 && TURNS_AROUND.has(state) ? `<g transform="translate(${SPRITE_UNITS} 0) scale(-1 1)">${figureSvg}</g>` : figureSvg
  // New pills came in: he is pushed along to his new place instead of jumping there.
  // slideFrom: { origin, chipsW, rowShift?, seconds? }. A redraw that lands mid-slide passes where things are right now
  // (origin, rowShift) and how long is left, so the movement carries on instead of snapping to its end.
  const pushSeconds = Math.max(0.05, slideFrom?.seconds ?? PUSH_SECONDS)
  const isPushed = isInline && slideFrom !== null && Math.abs(slideFrom.origin - startUnits) > 0.5
  const hasMeters = chips.some((chip) => chip.kind === 'meter')
  // The pills come in from the left only the first time the readout fills in, not for every pill added after that
  const rowShift = !isInline || slideFrom === null ? 0 : slideFrom.rowShift ?? (hasMeters && !slideFrom.hadMeters && chipsW - slideFrom.chipsW >= SLIDE_MIN_PX ? -(chipsW - slideFrom.chipsW) : 0)
  const placed =
    isPushed
      ? wrap(flipped, '', anim('translate', pushSeconds, [[0, `${slideFrom.origin} 0`], [pushSeconds, `${startUnits} 0`, 'p2out']], { once: true }))
      : walkSeconds > 0
      ? wrap(flipped, '', walkSlide(px(fromCol), px(toCol), walkSeconds, !resume))
      : wrap(flipped, `translate(${startUnits} 0)`)

  // His feet stand on y = 86 in drawing units; the pills start just below
  // Hats and ears reach higher than he does, so an outfit gets the taller picture
  const top = outfit ? TOP_TALL : topFor(state)
  const figureHeight = n((FLOOR + 1 - top) * unit)
  // In snow the pills ice over
  const row = chips.length ? chipsSvg(chips, isInline ? chipsW + 1 : width, { frost: Boolean(scene?.some((id) => COLD_SCENES.has(id))), melt: Boolean(scene?.includes('fire')), backed: Boolean(scene?.length) }) : ''
  const height = n(figureHeight + (chips.length && !isInline ? CHIP_HEIGHT + 1 : 0) + (chips.length ? GLOW_PAD : 0) + (scene?.some((id) => PILING_SCENES.has(id)) ? PILE_PAD : 0))
  // The pills come in from the left when many of them arrive at once (the first reading), not for a small change like the countdown
  const isSliding = Math.abs(rowShift) > 0.5
  // A different set of pills (a note appearing or going, pills coming or leaving) fades in rather than popping; numbers changing do not
  const chipsShape = chips.map((chip) => (chip.kind === 'note' ? `note:${chip.text}` : chip.kind)).join('|')
  const isFading = isInline && slideFrom !== null && !isSliding && slideFrom.chipsShape !== undefined && slideFrom.chipsShape !== chipsShape
  const rowY = isInline ? n(figureHeight - CHIP_HEIGHT) : figureHeight + 1
  // The corner tag only shows when it clears him (and whatever he holds up), so it never covers him in a narrow window
  const tag = hud ? hudSvg(hud) : null
  const leftmostPx = (startUnits + Math.min(0, reach?.[0] ?? 0)) * unit
  const hudPart = tag && leftmostPx > tag.width + 10 ? `<g transform="translate(2 2)">${tag.svg}</g>` : ''
  const sceneArea = {
    width,
    height,
    from: isInline ? chipsW + 8 : 0,
    ground: figureHeight,
    pillsEnd: isInline ? chipsW : 0,
    wind,
    // Each pill's top is somewhere things can land and pile up
    perches: (isInline ? fitted.items : []).map((item) => ({ x: item.x, w: item.w, y: rowY })),
    clockScenes: scene,
  }
  // Say that the drawing works on light and dark pages, so the frame it is shown in is see-through
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="color-scheme:light dark;background:transparent;color:CanvasText">` +
    `<defs><style>:root{color-scheme:light dark}svg{background:transparent;color:CanvasText}</style>` +
    `<clipPath id="floor"><rect x="-1000" y="-400" width="${n(widthUnits + 2000)}" height="${400 + FLOOR}"/></clipPath></defs>` +
    // The day's background effects sit behind everything; with the pills beside him they keep to the room right of the pills
    sceneSvg(scene?.filter((id) => !FRONT_SCENES.has(id)), sceneArea) +
    `<g transform="translate(0 ${n(-top * unit)}) scale(${n(unit)})" data-look="${state}">${placed}</g>` +
    // Some scenes go in front of him (frost on the window he is behind), still under the pills so they stay readable
    sceneSvg(scene?.filter((id) => FRONT_SCENES.has(id)), sceneArea) +
    // The time, day and weather tag in the top-left corner
    hudPart +
    (row ? `<g transform="translate(0 ${rowY})">${isSliding ? `<g>${row}${anim('translate', pushSeconds, [[0, `${n(rowShift)} 0`], [pushSeconds, '0 0', 'p2out']], { once: true })}</g>` : isFading ? `<g>${row}${anim('opacity', FADE_SECONDS, [[0, '0'], [FADE_SECONDS, '1', 'lin']], { once: true })}</g>` : row}</g>` : '') +
    '</svg>'
  const slide = isPushed || isSliding ? { origin0: isPushed ? slideFrom.origin : startUnits, origin1: startUnits, rowShift0: isSliding ? rowShift : 0, seconds: pushSeconds } : null
  return { svg, width, height, isInline, originUnits: startUnits, chipsW, hasMeters, chipsShape, slide }
}

export function bandSvg(options) {
  return bandLayout(options).svg
}
