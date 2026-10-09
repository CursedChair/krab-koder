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
const TALL_LOOKS = new Set(['flag', 'think', 'task', 'permission', 'asking', 'pop', 'hello', 'bye', 'folder', 'auto', 'send', 'receive', 'glitch', 'buff', 'ascend', 'fall', 'firstsnow', 'cheer', 'rocket', 'trophy', 'startled', 'unbox', 'mail', 'music', 'blush', 'listen', 'mog', 'pet', 'grumpy', 'gears', 'party', 'longscroll', 'whale', 'knock', 'browser', 'mouseride', 'spellbook', 'toolbox', 'inbox', 'planner', 'cabinet', 'netcatch', 'cube', 'goodmorning', 'goodnight', 'satellite', 'comb', 'parachute', 'water', 'crossclaws', 'laugh', 'brb', 'paperstack', 'monday', 'wonder', 'drench', 'medal', 'welcomeback'])
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

// Whether a costume's headgear reaches down into his face (below the hat line, where his eyes and mouth would be)
const FACE_AREA = { x: 14, y: 8, w: 79, h: 37 }
function coversFace(head) {
  for (const m of String(head ?? '').matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    const [x, y, w, h] = m.slice(1).map(Number)
    if (x < FACE_AREA.x + FACE_AREA.w && x + w > FACE_AREA.x && y < FACE_AREA.y + FACE_AREA.h && y + h > FACE_AREA.y) return true
  }
  return false
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
  // o.bareBody leaves off the outfit's clothes, and any headgear that reaches into his face (a mask, face paint, goggles,
  // a moustache); a plain hat stays. For close-ups where his whole body is his face.
  // o.face is drawn on his face under the hat, so a costume's mask or face paint covers it
  const core = (o.behind ?? '') + rect(11, 0, 85, 65, SKIN) + (o.worn ?? '') + (o.bareBody ? '' : outfit?.body ?? '') + eyes(o.eyes) + (o.face ?? '') + (o.worn || (o.bareBody && coversFace(outfit?.head)) ? '' : wrap(hatReacts((activeMood === 'limit' && outfit?.limitHead !== undefined ? outfit.limitHead : outfit?.head) ?? ''), '', ...(o.headAnims ?? [])))
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
  G: ['XXX', 'X..', 'X.X', 'X.X', 'XXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'],
  N: ['X..X', 'XX.X', 'X.XX', 'X..X', 'X..X'],
  S: ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  '<': ['..X', '.X.', 'X..', '.X.', '..X'],
  '>': ['X..', '.X.', '..X', '.X.', 'X..'],
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
  const PX = 58
  const PY = 18
  // The back of the phone faces you (the screen faces him): a case, the camera, and his thumb flicking at the top edge
  const device = rect(PX, PY, 20, 34, '#2B2D33') + rect(PX + 1.5, PY + 1.5, 17, 31, '#3F8CE8') + rect(PX + 3, PY + 3, 6, 6, '#2B2D33') + rect(PX + 4, PY + 4, 4, 4, '#6F7C8C') + rect(PX + 7.5, PY + 16, 5, 5, '#2E6FC0')
  const thumb = wrap(rect(PX + 10, PY - 3, 6, 5, SKIN, `stroke="${DARK}" stroke-width="1"`), '', anim('translate', 0.9, [[0, '0 3'], [0.35, '0 -1', 'p2out'], [0.9, '0 3', 'p2io']]))
  const glow = rect(11, 20, 85, 16, SCREEN_LIGHT, 'fill-opacity=".14"') + rect(11, 10, 85, 10, SCREEN_LIGHT, 'fill-opacity=".07"')
  const laugh = anim('translate', D, [[0, '0 0'], [2.6, '0 0'], [2.75, '0 -2.5', 'p2out'], [2.9, '0 0', 'p2in'], [3.05, '0 -2.5', 'p2out'], [3.2, '0 0', 'p2in'], [D, '0 0']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: between(glow + device + thumb, D, 0.3, D - 0.45),
    // his hand in front of the phone's lower half, gripping it
    right: { hold: true, over: true, anims: [holdAt(D, -26, 28)] },
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
  // a wooden handle angling down from the lens to his hand
  const handle = [0, 1, 2, 3, 4, 5].map((k) => rect(88 + k * 3, 25 + k * 4, 5, 6, '#6B4F3A') + rect(88 + k * 3, 25 + k * 4, 1.6, 6, '#8B6A4E')).join('')
  const glass = handle + disc(80, 16, 14, INK) + disc(80, 16, 11, '#BFE3FF') + rect(73, 9, 15, 15, EYE) + rect(75, 11, 4, 4, '#FFFFFF') + rect(72, 6, 5, 3, '#FFFFFF', 'fill-opacity=".7"')
  const scan = anim('translate', D, [[0, '0 0'], [0.4, '-8 0', 'p2io'], [1.1, '-36 2', 'sio'], [1.8, '-8 0', 'sio'], [2.4, '-30 2', 'sio'], [D, '0 0', 'p2io']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: between(wrap(glass, '', scan), D, 0.2, D - 0.25),
    right: { hold: true, over: true, at: 'translate(6 22)', anims: [scan] },
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
  // Sculpted cheekbones: a light highlight along the top of each, over the shadow beneath
  const HIGHLIGHT = '#F2A88E'
  const cheeks = [0, 1, 2, 3].map((k) => rect(13 + k * 4, 25.5 + k * 3, 5.5, 2.4, HIGHLIGHT) + rect(88.5 - k * 4, 25.5 + k * 3, 5.5, 2.4, HIGHLIGHT)).join('') +
    [0, 1, 2].map((k) => shade(17 + k * 4, 35 + k * 3, 5, 3, '.3') + shade(85 - k * 4, 35 + k * 3, 5, 3, '.3')).join('')
  // The nose: a shadow down one side of the bridge and a highlight down the other
  const nose = shade(55.5, 15, 2.2, 15, '.55') + rect(51.5, 16, 2, 13, HIGHLIGHT, 'fill-opacity=".7"')
  const brows = rect(16, 6, 7, 3, INK) + rect(22, 7.2, 7, 3, INK) + rect(28, 8.6, 7, 3, INK) +          // furrowed, sloping down toward the middle
    rect(72, 2.6, 6, 3, INK) + rect(77, 1, 7, 3, INK) + rect(83, 2.2, 6, 3, INK)                         // arched up
  const jaw = Array.from({ length: 7 }, (_, k) => rect(12 + k * 4.2, 45 + k * 3, 5.5, 3, DARK) + rect(89.5 - k * 4.2, 45 + k * 3, 5.5, 3, DARK)).join('') +
    rect(40, 62, 27, 6, SKIN) + rect(40, 66.5, 27, 1.8, DARK) + rect(46, 64, 15, 1.5, DARK, 'fill-opacity=".35"')
  const glint = wrap(pixels(STAR, -5, -5, 2, '#FFFFFF'), 'translate(66 63)', anim('scale', D, [[0, '0 0'], [2.7, '0 0'], [2.85, '1.3 1.3', 'p2out'], [3.2, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const show = (inner) => between(inner, D, 0.35, D - 0.35)
  const closer = anim('scale', D, [[0, '1 1'], [0.2, '1 1'], [1.4, '1.15 1.15', 'sio'], [D - 0.5, '1.15 1.15'], [D, '1 1', 'p2io']], ONCE)
  return wrap(wrap(figure({
    ownProps: true,
    // His whole body is his face here (jaw and stubble at the bottom), so the outfit's clothes come off; the hat stays
    bareBody: true,
    face: show(lids + brows + jaw + face + cheeks + nose),
    heldRaw: glint,
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

// ---- What Claude is using: a look for each kind of tool ----

// Frames that bob between two spots every `step` seconds from `from` to `to`, resting at `rest` before and after
function pats(D, from, to, step, a, b, rest = '0 0') {
  const frames = [[0, rest], [from, a, 'p2out']]
  for (let t = from + step, i = 1; t < to; t += step, i++) frames.push([n(t), i % 2 ? b : a, 'sio'])
  return [...frames, [D, rest, 'p2io']]
}

// Reading a file: reading glasses on, a paper scroll held open in both hands, its lines scrolling up as he reads
function readfile() {
  const D = EVENT_SECONDS.readfile
  const glasses = wrap(readingGlasses(), '', anim('translate', D, [[0, '0 -34'], [0.4, '0 0', 'p2out'], [D - 0.4, '0 0'], [D, '0 -34', 'p2in']], ONCE),
    anim('opacity', D, [[0, '0'], [0.05, '1', 'lin'], [D - 0.05, '1'], [D, '0', 'lin']], ONCE))
  // Every line looks the same, so moving them all up one line and starting again reads as an endless scroll
  const P = 0.7
  const lines = [0, 1, 2, 3, 4].map((i) => {
    const fade = i === 0 ? [anim('opacity', P, [[0, '1'], [P, '0', 'lin']])] : i === 4 ? [anim('opacity', P, [[0, '0'], [P, '1', 'lin']])] : []
    return wrap(rect(36, 35 + i * 6, 20, 2.5, PAPER_SHADE) + rect(58, 35 + i * 6, 13, 2.5, PAPER_SHADE), '', ...fade)
  }).join('')
  const ROLL = '#E2D7BC'
  const scroll = rect(32, 30, 44, 31, CREAM) + wrap(lines, '', anim('translate', P, [[0, '0 0'], [P, '0 -6', 'lin']])) +
    rect(29, 26, 50, 5, ROLL) + rect(29, 30, 50, 1.5, PAPER_SHADE) + rect(29, 60, 50, 5, ROLL) + rect(29, 60, 50, 1.5, PAPER_SHADE)
  return figure({
    ownProps: true,
    heldRaw: between(scroll, D, 0.35, D - 0.35) + glasses,
    left: { hold: true, over: true, anims: [holdAt(D, 14, 16, 0.35, D - 0.35)] },
    right: { hold: true, over: true, anims: [holdAt(D, -14, 16, 0.35, D - 0.35)] },
    eyes: { gaze: [anim('translate', P, [[0, '-4 5'], [P * 0.85, '4 5', 'lin'], [P, '-4 5', 'p2io']])] },
  })
}

// Looking at a picture: he holds up a framed photo beside him and squints at it, leaning in, then his eyes go wide
function photo() {
  const D = EVENT_SECONDS.photo
  const frame = rect(0, 0, 36, 30, WOOD) + rect(3, 3, 30, 24, '#9FD8FF') + rect(10, 15, 14, 5, '#5E8C6A') + rect(3, 19, 30, 8, '#5E8C6A') +
    disc(26, 9, 3, '#E7B04A') + rect(3, 3, 30, 1.5, '#FFFFFF', 'fill-opacity=".5"')
  const up = anim('translate', D, [[0, '0 30'], [0.35, '0 0', 'back'], [D - 0.3, '0 0'], [D, '0 30', 'p2in']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: between(wrap(frame, 'translate(98 6)', up), D, 0.05, D - 0.1),
    right: { hold: true, over: true, anims: [holdAt(D, 18, 12, 0.35, D - 0.3)] },
    upper: [anim('rotate', D, [[0, '0 53 86'], [0.6, '0 53 86'], [1.0, '4 53 86', 'p2io'], [2.2, '4 53 86'], [2.5, '0 53 86', 'p2io'], [D, '0 53 86']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '5 -1', 'p2io'], [D - 0.3, '5 -1'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.6, '1 1'], [0.9, '1 .4', 'p2io'], [2.1, '1 .4'], [2.25, '1.3 1.3', 'p2out'], [D - 0.3, '1.3 1.3'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// Updating the to-do list: a clipboard in one hand, and a pencil ticking the boxes off one by one
function todo() {
  const D = EVENT_SECONDS.todo
  const rows = [0, 1, 2].map((i) => rect(36, 37 + i * 8, 6, 6, INK) + rect(37.5, 38.5 + i * 8, 3, 3, CREAM) + rect(45, 39 + i * 8, 22, 2.5, PAPER_SHADE)).join('')
  const board = rect(30, 28, 46, 40, WOOD) + rect(33, 32, 40, 34, CREAM) + rect(46, 26, 14, 6, STEEL) + rect(49, 24, 8, 3, STEEL) + rows
  const TICKS = [0.9, 1.5, 2.1]
  const ticks = TICKS.map((t, i) => wrap(pixels(PIXEL.check, -6, -4.5, 1.2, '#5E8C6A'), `translate(39.5 ${39 + i * 8})`,
    anim('scale', D, [[0, '0 0'], [t, '0 0'], [t + 0.12, '1.4 1.4', 'p2out'], [t + 0.22, '1 1', 'p2io'], [D, '1 1']], ONCE))).join('')
  const pencil = rect(68, 37, 20, 3.5, '#E7B04A') + rect(65, 37.5, 3, 2.5, CREAM) + rect(63.5, 38.2, 1.5, 1.2, INK) + rect(86, 37, 3, 3.5, '#E5584B')
  const strokes = TICKS.flatMap((t, i) => [[t - 0.2, `-21 ${8 * i - 2}`, 'p2io'], [t, `-24 ${8 * i + 2}`, 'p2in'], [t + 0.15, `-19 ${8 * i - 3}`, 'p2out']])
  return figure({
    ownProps: true,
    heldRaw: between(board + ticks, D, 0.3, D - 0.3),
    left: { hold: true, over: true, anims: [holdAt(D, 14, 30, 0.3, D - 0.3)] },
    right: { hold: true, over: true, carry: between(pencil, D, 0.3, D - 0.3), anims: [anim('translate', D, [[0, '0 0'], [0.5, '-17 -4', 'p2out'], ...strokes, [D - 0.4, '-17 14'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '-4 5', 'p2io'], [D - 0.4, '-4 5'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Using the browser, take one: a little browser window floats beside him; he steadies it while a pointer clicks around and pages change
function browser() {
  const D = EVENT_SECONDS.browser
  const [X, Y, W, H] = [112, -2, 54, 44]
  const frame = rect(X - 1.5, Y - 1.5, W + 3, H + 3, INK) + rect(X, Y, W, 7, '#D3D7DC') + rect(X, Y + 7, W, H - 7, '#FFFFFF') +
    rect(X + 3, Y + 2.5, 2.5, 2.5, '#E5584B') + rect(X + 7, Y + 2.5, 2.5, 2.5, '#E7B04A') + rect(X + 11, Y + 2.5, 2.5, 2.5, '#5E8C6A') + rect(X + 16, Y + 1.8, W - 19, 3.5, '#FFFFFF')
  const text = (x, y, widths) => widths.map((w, i) => rect(x, y + i * 4, w, 2, PAPER_SHADE)).join('')
  const pages = [
    rect(X + 4, Y + 11, W - 8, 9, '#6EA8FF') + text(X + 4, Y + 24, [40, 34, 44, 28]) + rect(X + 4, Y + 38, 14, 3, SPARK),
    rect(X + 4, Y + 11, 22, 18, '#5E8C6A') + text(X + 29, Y + 12, [20, 16, 21, 12]) + text(X + 4, Y + 32, [44, 38]),
    [0, 1, 2, 3].map((i) => rect(X + 4 + (i % 2) * 24, Y + 11 + Math.floor(i / 2) * 15, 22, 12, ['#E7B04A', '#8FC7F2', '#F28A8A', '#B58CFF'][i])).join(''),
  ]
  const shown = between(pages[0], D, 0.3, 1.15) + between(pages[1], D, 1.2, 2.25) + between(pages[2], D, 2.3, D - 0.3)
  const ARROW = ['X....', 'XX...', 'XXX..', 'XXXX.', 'XXXXX', 'XX...', '..X..']
  const cursor = wrap(pixels(ARROW, -0.5, -0.5, 2.2, INK) + pixels(['X...', 'XX..', 'XXX.', 'X...'], 1.7, 2.5, 1.4, '#FFFFFF'), '',
    anim('translate', D, [[0, `${X + 30} ${Y + 30}`], [0.5, `${X + 30} ${Y + 30}`], [1.0, `${X + 10} ${Y + 39}`, 'p2io'], [1.4, `${X + 10} ${Y + 39}`], [1.9, `${X + 38} ${Y + 16}`, 'p2io'], [2.2, `${X + 38} ${Y + 16}`], [2.7, `${X + 18} ${Y + 18}`, 'p2io'], [D, `${X + 18} ${Y + 18}`]], ONCE))
  const click = (x, y, t) => wrap(disc(0, 0, 4, SPARK, 'fill-opacity=".55"'), `translate(${x} ${y})`,
    anim('scale', D, [[0, '0 0'], [t, '0 0'], [t + 0.3, '2 2', 'p2out'], [D, '2 2']], ONCE), anim('opacity', D, [[0, '1'], [t + 0.3, '1'], [t + 0.35, '0', 'lin'], [D, '0']], ONCE))
  const pop = anim('scale', D, [[0, '0 0'], [0.3, '1 1', 'back'], [D - 0.3, '1 1'], [D, '0 0', 'p2in']], ONCE)
  const win = wrap(wrap(frame + shown + click(X + 10, Y + 39, 1.1) + click(X + 38, Y + 16, 2.25) + cursor, `translate(${-(X + W / 2)} ${-(Y + H / 2)})`), `translate(${X + W / 2} ${Y + H / 2})`, pop)
  return figure({
    ownProps: true,
    heldRaw: win,
    right: { hold: true, over: true, anims: [holdAt(D, 16, -2, 0.3, D - 0.3)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '5 0', 'p2io'], [1.0, '4 3', 'sio'], [1.9, '6 -2', 'sio'], [2.7, '5 -1', 'sio'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Using the browser, take two: he rides a giant mouse pointer like a flying surfboard, swooping about,
// one hand waving, and its tip clicks as he goes
// The pointer, tip at the top left: O for its black edge, W for its white inside
const POINTER = ['O..........', 'OO.........', 'OWO........', 'OWWO.......', 'OWWWO......', 'OWWWWO.....', 'OWWWWWO....', 'OWWWWWWO...', 'OWWWWWWWO..',
  'OWWWWWWWWO.', 'OWWWWWOOOOO', 'OWWOWWO....', 'OWO.OWWO...', 'OO..OWWO...', 'O....OWWO..', '.....OWWO..', '......OO...']
function mouseride() {
  const D = EVENT_SECONDS.mouseride
  const CLICKS = [1.1, 2.3]
  const CELL = 5
  const only = (ch) => POINTER.map((row) => row.replace(new RegExp(`[^${ch}]`, 'g'), '.').replace(new RegExp(ch, 'g'), 'X'))
  // Each colour drawn twice, a hair apart, so no seams show between the squares as it tilts
  const pointer = [0, 0.6].map((d) => pixels(only('O'), d, d, CELL, INK)).join('') + [0, 0.6].map((d) => pixels(only('W'), d, d, CELL, '#FFFFFF')).join('')
  // Laid on its side under him, its tip forward (to the right), and pressed a little at each click
  const press = anim('scale', D, [[0, '1 1'], ...CLICKS.flatMap((t) => [[t, '1 1'], [t + 0.06, '.92 .92', 'p2out'], [t + 0.2, '1 1', 'p2io']]), [D, '1 1']], ONCE)
  const board = wrap(wrap(pointer, 'rotate(90)'), 'translate(114 34)', press)
  const ripples = CLICKS.map((t) => wrap(`<rect x="-6" y="-6" width="12" height="12" fill="none" stroke="${SPARK}" stroke-width="2"/>`, 'translate(116 34)',
    anim('scale', D, [[0, '0 0'], [t, '0 0'], [t + 0.35, '2.4 2.4', 'p2out'], [D, '2.4 2.4']], ONCE),
    anim('opacity', D, [[0, '1'], [t + 0.3, '1'], [t + 0.36, '0', 'lin'], [D, '0']], ONCE))).join('')
  const streaks = [0, 1, 2].map((i) => wrap(rect(0, 0, 14 + i * 4, 2, CREAM, 'fill-opacity=".7"'), '',
    anim('translate', 0.5, [[0, `${-4 - i * 6} ${50 + i * 9}`], [0.5, `${-34 - i * 6} ${50 + i * 9}`, 'lin']], { begin: i * 0.17 }),
    anim('opacity', 0.5, [[0, '1'], [0.5, '0', 'lin']], { begin: i * 0.17 }))).join('')
  const yeehaw = anim('translate', 0.5, [[0, '-4 -24'], [0.25, '-2 -32', 'sio'], [0.5, '-4 -24', 'sio']])
  const rider = wrap(figure({
    ownProps: true,
    left: { hold: true, anims: [yeehaw] },
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], ...CLICKS.flatMap((t) => [[t - 0.1, '6 10', 'p2io'], [t, '6 14', 'p2in'], [t + 0.2, '6 10', 'p2out']]), [D, '6 10']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '4 0'], [D, '4 0']], ONCE)], scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1.2 1.2', 'p2out'], [D, '1.2 1.2']], ONCE)] },
  }), 'translate(0 -30)')
  // Swooping about: up and over, a dip, and back, tilting into the turns
  const swoop = anim('translate', D, [[0, '-10 0'], [0.9, '10 -16', 'sio'], [1.8, '-6 -4', 'sio'], [2.7, '12 -14', 'sio'], [D, '-10 0', 'sio']], ONCE)
  const tilt = anim('rotate', D, [[0, '0 60 70'], [0.9, '-6 60 70', 'sio'], [1.8, '4 60 70', 'sio'], [2.7, '-5 60 70', 'sio'], [D, '0 60 70', 'sio']], ONCE)
  const shadow = wrap(rect(-40, 0, 80, 3, '#000000', 'fill-opacity=".2"'), 'translate(64 85)',
    anim('scale', D, [[0, '1 1'], [0.9, '.7 1', 'sio'], [1.8, '.9 1', 'sio'], [2.7, '.7 1', 'sio'], [D, '1 1', 'sio']], ONCE))
  return shadow + wrap(streaks + rider + board + ripples, '', swoop, tilt)
}

// Using a skill: he flips open a spellbook and magic pours out of its pages, sparkles swirling up past his face
function spellbook() {
  const D = EVENT_SECONDS.spellbook
  const COVER = '#5B3A8C'
  const DEEP = '#3F2766'
  const runes = (x) => [0, 1, 2, 3].map((i) => rect(x, 43 + i * 4.5, i % 2 ? 16 : 20, 2, '#C9B8E8')).join('')
  const book = rect(24, 40, 60, 25, COVER) + rect(26, 38, 27, 24, CREAM) + rect(55, 38, 27, 24, CREAM) + rect(53, 37, 2, 27, DEEP) + rect(24, 62, 60, 3, DEEP) + runes(29) + runes(59)
  const open = wrap(wrap(book, 'translate(-54 -50)'), 'translate(54 50)', anim('scale', D, [[0, '.08 1'], [0.25, '.08 1'], [0.6, '1 1', 'back'], [D, '1 1']], ONCE))
  const COLORS = ['#B58CFF', '#E7B04A', '#8FE3FF', '#FF9FE0']
  const P = 1.4
  const sparks = Array.from({ length: 10 }, (_, i) => {
    const sway = (i % 2 ? 1 : -1) * (8 + (i % 4) * 5)
    const begin = (i * P) / 10
    return wrap(pixels(STAR, -3, -3, 1.2 + (i % 3) * 0.4, COLORS[i % 4]), '',
      anim('translate', P, [[0, `${54 + (i % 5) * 3 - 6} 44`], [P / 2, `${54 + sway} 0`, 'sio'], [P, `${54 - sway / 2} -44`, 'sio']], { begin }),
      anim('opacity', P, [[0, '0'], [0.15, '1', 'lin'], [P * 0.75, '1'], [P, '0', 'lin']], { begin }))
  }).join('')
  const beam = wrap(rect(32, -20, 44, 60, '#B58CFF', 'fill-opacity=".16"') + rect(42, -30, 24, 70, '#E9DDFF', 'fill-opacity=".14"'), '',
    anim('opacity', 0.8, [[0, '.6'], [0.4, '1', 'sio'], [0.8, '.6', 'sio']]))
  const faceGlow = rect(11, 0, 85, 36, '#B58CFF', 'fill-opacity=".1"')
  return figure({
    ownProps: true,
    heldRaw: between(faceGlow + beam, D, 0.6, D - 0.3) + between(open, D, 0.1, D - 0.2) + between(sparks, D, 0.6, D - 0.3),
    left: { hold: true, over: true, anims: [holdAt(D, 20, 20, 0.25, D - 0.2)] },
    right: { hold: true, over: true, anims: [holdAt(D, -20, 20, 0.25, D - 0.2)] },
    upper: [anim('translate', D, [[0, '0 0'], [0.6, '0 0'], [0.75, '0 2', 'p2out'], [D - 0.3, '0 2'], [D, '0 0', 'p2io']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [0.7, '0 5'], [1.1, '0 -5', 'p2out'], [1.8, '-3 -5', 'sio'], [2.5, '3 -5', 'sio'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.65, '1 1'], [0.8, '1.35 1.35', 'p2out'], [D - 0.3, '1.35 1.35'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// Loading tools: he digs through a red toolbox, flinging a hammer and a screwdriver over his shoulders, then holds up a wrench
function toolbox() {
  const D = EVENT_SECONDS.toolbox
  const RED = '#C8423A'
  const box = rect(12, 44, 6, 22, '#A8342D') + rect(18, 64, 72, 22, RED) + rect(18, 64, 72, 3, '#E5584B') + rect(18, 82, 72, 4, '#8E2B25') + rect(46, 70, 16, 4, STEEL)
  const wrench = rect(-2, -8, 4, 16, STEEL) + rect(-5, -12, 10, 5, STEEL) + rect(-1.5, -12, 3, 3, '#6F737A')
  const hammer = rect(-1.5, -6, 3, 16, WOOD) + rect(-7, -10, 14, 5, '#6F737A')
  const driver = rect(-2, -10, 4, 8, RED) + rect(-0.8, -2, 1.6, 12, STEEL)
  const fling = (shape, t, dx) => wrap(wrap(wrap(shape, 'scale(2)'), '', anim('rotate', D, [[0, '0'], [t, '0'], [t + 0.8, `${dx > 0 ? 540 : -540}`, 'lin'], [D, `${dx > 0 ? 540 : -540}`]], ONCE)), '',
    anim('translate', D, [[0, '54 70'], [t, '54 70'], [t + 0.35, `${54 + dx} 10`, 'p2out'], [t + 0.8, `${54 + dx * 1.6} 80`, 'p2in'], [D, `${54 + dx * 1.6} 80`]], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.03, '1', 'lin'], [t + 0.7, '1'], [t + 0.8, '0', 'lin'], [D, '0']], ONCE))
  const found = between(rect(93, -12, 7, 36, STEEL) + rect(87, -24, 19, 13, STEEL) + rect(93, -24, 7, 6, '#6F737A') + rect(93, -12, 2, 36, '#C9CDD2'), D, D - 1.0, D - 0.2)
  return figure({
    ownProps: true,
    upper: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2out'], [D - 1.1, '0 6'], [D - 0.9, '0 0', 'p2io'], [D, '0 0']], ONCE)],
    left: { hold: true, anims: [anim('translate', D, pats(D, 0.3, D - 1.1, 0.22, '18 24', '20 32'), ONCE)] },
    right: { hold: true, carry: found, anims: [anim('translate', D, [...pats(D, 0.41, D - 1.1, 0.22, '-18 24', '-20 32').slice(0, -1), [D - 0.9, '4 -26', 'p2out'], [D - 0.2, '4 -26'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2io'], [D - 1.1, '0 6'], [D - 0.9, '3 -4', 'p2io'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [D - 1.0, '1 1'], [D - 0.85, '1 .3', 'p2io'], [D - 0.2, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
    props: box + fling(hammer, 0.7, -40) + fling(driver, 1.4, 44) + fling(wrench, 2.0, -30),
  })
}

// Setting a timer: he holds up a twin-bell alarm clock, winds its key and spins the hands round, then it rings and shakes in his hands
function alarm() {
  const D = EVENT_SECONDS.alarm
  const RED = '#C8423A'
  const RING = 2.0
  const minute = wrap(rect(-0.75, -8.5, 1.5, 9, INK), '', anim('rotate', D, [[0, '0'], [0.5, '0'], [1.7, '720', 'sio'], [D, '720']], ONCE))
  const key = wrap(rect(13, -1.5, 3, 3, STEEL) + rect(16, -5, 3, 10, STEEL), '',
    anim('scale', 0.3, [[0, '1 1'], [0.15, '1 .3', 'sio'], [0.3, '1 1', 'sio']]))
  const face = disc(-9, -12, 5, RED) + disc(9, -12, 5, RED) + rect(-1, -18, 2, 5, INK) + rect(-3, -19, 6, 2, INK) + disc(0, 0, 13, RED) + disc(0, 0, 10, CREAM) +
    [0, 1, 2, 3].map((i) => rect(i % 2 ? (i === 1 ? 7 : -9) : -0.75, i % 2 ? -0.75 : (i === 0 ? -9 : 7), i % 2 ? 2 : 1.5, i % 2 ? 1.5 : 2, INK)).join('') +
    rect(-0.75, -5.5, 1.5, 6, INK) + minute + rect(-10, 11, 3, 5, INK) + rect(7, 11, 3, 5, INK) + key
  const shake = [[0, '0'], [RING, '0']]
  for (let t = RING + 0.06, i = 0; t < D - 0.3; t += 0.06, i++) shake.push([n(t), i % 2 ? '-9' : '9', 'lin'])
  shake.push([D - 0.25, '0', 'lin'], [D, '0'])
  const rings = between([-1, 1].map((s) => rect(s * 20 - 1, -20, 2, 6, INK) + rect(s * 24 - 1, -14, 2, 5, INK) + rect(s * 18 - 1, -26, 2, 4, INK)).join(''), D, RING, D - 0.3)
  const clock = wrap(face + rings, 'translate(54 42)', anim('rotate', D, shake, ONCE))
  return figure({
    ownProps: true,
    heldRaw: between(clock, D, 0.2, D - 0.2),
    left: { hold: true, over: true, anims: [holdAt(D, 26, 22, 0.2, D - 0.2)] },
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.3, '-14 14', 'p2out'], [1.7, '-14 14'], [RING, '-26 22', 'p2io'], [D - 0.2, '-26 22'], [D, '0 0', 'p2io']], ONCE)] },
    upper: [anim('translate', D, [[0, '0 0'], [RING, '0 0'], [RING + 0.1, '0 -6', 'p2out'], [RING + 0.3, '0 0', 'p2in'], [D, '0 0']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [D - 0.3, '0 5'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [RING, '1 1'], [RING + 0.08, '1.35 1.35', 'p2out'], [D - 0.3, '1.35 1.35'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// Watching something run: binoculars up to his eyes, scanning slowly left and right, the lenses catching the light
function binoculars() {
  const D = EVENT_SECONDS.binoculars
  // Big barrels right over his eyes, as wide as fits inside his body, the lenses catching the light
  const barrel = (cx) => rect(cx - 13, -1, 26, 32, INK) + rect(cx - 11, 1, 22, 28, '#45454A') + rect(cx - 13, 24, 26, 3, '#1F1F22') + disc(cx, 13, 10, '#1F1F22') + disc(cx, 13, 8, '#2A5C7A') +
    wrap(rect(cx - 5, 7, 4, 4, '#BFE3FF'), '', anim('translate', 1.6, [[0, '0 0'], [0.8, '6 5', 'sio'], [1.6, '0 0', 'sio']]))
  const pair = barrel(26.5) + barrel(80.5) + rect(39.5, 7, 28, 8, INK) + rect(49, 2, 9, 18, '#45454A') + rect(50.5, 3, 6, 4, '#8A8F98')
  const up = anim('translate', D, [[0, '0 40'], [0.35, '0 0', 'p2out'], [D - 0.3, '0 0'], [D, '0 40', 'p2in']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: between(wrap(pair, '', up), D, 0.05, D - 0.05),
    left: { hold: true, anims: [holdAt(D, 8, -14, 0.35, D - 0.3)] },
    right: { hold: true, anims: [holdAt(D, -8, -14, 0.35, D - 0.3)] },
    upper: [anim('rotate', D, [[0, '0 53 86'], [0.5, '0 53 86'], [1.2, '-5 53 86', 'sio'], [2.1, '5 53 86', 'sio'], [2.7, '0 53 86', 'sio'], [D, '0 53 86']], ONCE)],
  })
}

// Using a connected app: he pushes a plug into a wall socket; it sparks, connects, and a green light comes on
function plugin() {
  const D = EVENT_SECONDS.plugin
  const IN = 1.2
  const wall = rect(132, 10, 8, 66, '#D3D7DC') + rect(132, 10, 2, 66, '#B8BDC4') + rect(127, 26, 5, 16, CREAM) + rect(127, 30, 2, 2.5, INK) + rect(127, 36, 2, 2.5, INK) +
    rect(134, 46, 4, 4, '#3A3A37') + between(rect(134, 46, 4, 4, '#5EE07A') + rect(132, 44, 8, 8, '#5EE07A', 'fill-opacity=".3"'), D, IN + 0.2, D - 0.1)
  const plug = rect(105, 27, 12, 14, '#3A3A37') + rect(105, 27, 12, 2, '#5A5A55') + rect(117, 30, 5, 2.5, STEEL) + rect(117, 36, 5, 2.5, STEEL) + rect(98, 41, 4, 45, '#3A3A37')
  const spark = wrap(pixels(STAR, -3, -3, 1.6, '#E7B04A') + pixels(STAR, 4, -9, 1, '#FFFFFF'), 'translate(126 34)',
    anim('scale', D, [[0, '0 0'], [IN, '0 0'], [IN + 0.1, '1.5 1.5', 'p2out'], [IN + 0.35, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const pulses = [0, 1, 2].map((i) => wrap(rect(98.5, 0, 3, 3, '#5EE07A'), '', anim('translate', 0.9, [[0, '0 84'], [0.9, '0 44', 'lin']], { begin: i * 0.3 }))).join('')
  return figure({
    ownProps: true,
    left: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [IN + 0.2, '0 0'], [IN + 0.4, '-2 -18', 'p2out'], [D - 0.3, '-2 -18'], [D, '0 0', 'p2io']], ONCE)] },
    right: { hold: true, over: true, carry: plug, anims: [anim('translate', D, [[0, '0 0'], [0.5, '0 0'], [IN - 0.15, '0 0'], [IN, '5 0', 'p2in'], [D - 0.3, '5 0'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '5 1', 'p2io'], [D - 0.3, '5 1'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [IN, '1 1'], [IN + 0.1, '1.3 1.3', 'p2out'], [IN + 0.5, '1 .3', 'p2io'], [D - 0.2, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
    props: wall + spark + between(pulses, D, IN + 0.2, D - 0.3),
  })
}

// Blender: he molds a lump of grey clay on a stand, patting and shaping it as bits fly off, until it is a little statue of himself
function sculpt() {
  const D = EVENT_SECONDS.sculpt
  const CLAY = '#B9B2A6'
  const CLAY_DARK = '#8D867B'
  const CLAY_LIGHT = '#D6D0C5'
  const lump = rect(40, 56, 28, 14, CLAY) + rect(44, 51, 20, 5, CLAY) + rect(44, 51, 8, 3, CLAY_LIGHT) + rect(40, 66, 28, 4, CLAY_DARK)
  const rough = rect(38, 46, 32, 24, CLAY) + rect(35, 54, 4, 8, CLAY) + rect(69, 54, 4, 8, CLAY) + rect(38, 46, 32, 3, CLAY_LIGHT) + rect(38, 66, 32, 4, CLAY_DARK) + rect(46, 58, 6, 3, CLAY_DARK)
  const statue = rect(38, 42, 32, 22, CLAY) + rect(38, 42, 32, 3, CLAY_LIGHT) + rect(33, 50, 5, 7, CLAY) + rect(70, 50, 5, 7, CLAY) +
    rect(43, 47, 4, 5, CLAY_DARK) + rect(61, 47, 4, 5, CLAY_DARK) + rect(66, 45, 3, 17, CLAY_DARK, 'fill-opacity=".5"') + [41, 48, 57, 64].map((x) => rect(x, 64, 3, 6, CLAY)).join('')
  const SHAPED = 1.4
  const DONE = 2.8
  const clay = between(lump, D, 0, SHAPED) + between(rough, D, SHAPED, DONE) + between(statue, D, DONE, D - 0.1)
  const bits = [[0.6, -1], [1.0, 1], [1.7, -1], [2.2, 1], [2.5, -1]].map(([t, side], i) => wrap(rect(-2, -2, 4, 4, CLAY), '',
    anim('translate', D, [[0, '54 52'], [t, '54 52'], [t + 0.25, `${54 + side * (22 + i * 4)} 34`, 'p2out'], [t + 0.6, `${54 + side * (30 + i * 4)} 84`, 'p2in'], [D, `${54 + side * (30 + i * 4)} 84`]], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.02, '1', 'lin'], [t + 0.55, '1'], [t + 0.6, '0', 'lin'], [D, '0']], ONCE))).join('')
  const shine = [[30, 38, 0], [78, 40, 0.15], [54, 30, 0.3]].map(([x, y, d]) => wrap(pixels(STAR, -3, -3, 1.3, '#E7B04A'), `translate(${x} ${y})`,
    anim('scale', D, [[0, '0 0'], [DONE + d, '0 0'], [DONE + d + 0.15, '1.3 1.3', 'p2out'], [DONE + d + 0.5, '0 0', 'p2in'], [D, '0 0']], ONCE))).join('')
  const stand = rect(28, 70, 52, 4, '#6B4F3A') + rect(40, 74, 28, 12, WOOD) + rect(40, 74, 28, 2, '#6B4F3A')
  return figure({
    ownProps: true,
    heldRaw: clay + bits,
    left: { hold: true, over: true, anims: [anim('translate', D, pats(D, 0.3, DONE - 0.1, 0.2, '12 20', '16 26'), ONCE)] },
    right: { hold: true, over: true, anims: [anim('translate', D, pats(D, 0.4, DONE - 0.1, 0.2, '-12 26', '-16 20'), ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2io'], [DONE, '0 6'], [DONE + 0.2, '0 2', 'p2io'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [DONE + 0.1, '1 1'], [DONE + 0.25, '1 .3', 'p2io'], [D - 0.2, '1 .3'], [D, '1 1', 'p2io']], ONCE)],
    },
    props: stand + shine,
  })
}

// ---- Connected apps: one look each ----

// A raw SVG shape, for the few drawings that are not made of squares
const poly = (points, fill) => `<polygon points="${points}" fill="${fill}"/>`

// An envelope 30 by 20, its top-left corner at 0 0
function envelope() {
  return rect(-1, -1, 32, 22, '#C9C3B2') + rect(0, 0, 30, 20, CREAM) + rect(0, 0, 30, 1.5, '#E5584B') +
    [0, 1, 2, 3, 4].map((i) => rect(i * 3, 1.5 + i * 2, 3, 2, PAPER_SHADE) + rect(27 - i * 3, 1.5 + i * 2, 3, 2, PAPER_SHADE)).join('')
}

// Email: envelopes drop into his arms one after another, and he pulls the letter out of the top one to read it
function inbox() {
  const D = EVENT_SECONDS.inbox
  const fall = (y, t) => wrap(envelope(), '', anim('translate', D, [[0, '39 -80'], [t, '39 -80'], [t + 0.3, `39 ${y}`, 'p2in'], [t + 0.38, `39 ${y - 3}`, 'p2out'], [t + 0.46, `39 ${y}`, 'p2in'], [D - 0.3, `39 ${y}`], [D, `39 ${y + 60}`, 'p2in']], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.02, '1', 'lin'], [D - 0.1, '1'], [D, '0', 'lin']], ONCE))
  const letter = wrap(rect(0, 0, 24, 22, CREAM) + rect(0, 0, 24, 22, 'none', `stroke="${PAPER_SHADE}" stroke-width="1"`) + [5, 9, 13, 17].map((y, i) => rect(3, y, i === 3 ? 10 : 18, 2, PAPER_SHADE)).join(''), '',
    anim('translate', D, [[0, '42 32'], [1.6, '42 32'], [2.0, '42 8', 'p2out'], [D - 0.3, '42 8'], [D, '42 32', 'p2in']], ONCE),
    anim('opacity', D, [[0, '0'], [1.6, '0'], [1.62, '1', 'lin'], [D - 0.3, '1'], [D - 0.28, '0', 'lin'], [D, '0']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: fall(48, 0.2) + fall(42, 0.6) + letter + fall(36, 1.0),
    left: { hold: true, over: true, anims: [holdAt(D, 20, 22, 0.2, D - 0.3)] },
    right: { hold: true, over: true, anims: [holdAt(D, -20, 22, 0.2, D - 0.3)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 -6'], [0.3, '0 -6'], [1.2, '0 5', 'p2io'], [2.0, '0 -1', 'p2io'], [2.5, '-3 -1', 'sio'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Calendar: he holds up a wall calendar, tears two pages off, then circles a date in red marker
function planner() {
  const D = EVENT_SECONDS.planner
  const sheet = (marked) => rect(30, 24, 48, 42, CREAM) + rect(30, 24, 48, 9, '#E5584B') +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => rect(34 + (i % 4) * 11, 37 + Math.floor(i / 4) * 9, 8, 6, i === 6 && marked ? '#F2C4BC' : PAPER_SHADE)).join('')
  const tear = (t) => wrap(sheet(false), '', anim('translate', D, [[0, '0 0'], [t, '0 0'], [t + 0.5, '40 -70', 'p2in'], [D, '40 -70']], ONCE),
    anim('opacity', D, [[0, '1'], [t + 0.4, '1'], [t + 0.5, '0', 'lin'], [D, '0']], ONCE))
  const ring = wrap(`<rect x="-8" y="-6" width="16" height="12" fill="none" stroke="#E5584B" stroke-width="2.2"/>`, 'translate(60 49)',
    anim('scale', D, [[0, '0 0'], [1.8, '0 0'], [2.3, '1 1', 'p2out'], [D, '1 1']], ONCE))
  const rings = rect(37, 20, 3, 7, STEEL) + rect(68, 20, 3, 7, STEEL)
  const marker = rect(76, 37, 12, 4, '#E5584B') + rect(73, 37.5, 3, 3, '#A8342D')
  const circle = [[1.8, '-12 12'], [1.93, '-20 7'], [2.06, '-28 12'], [2.18, '-20 17'], [2.3, '-12 12']].map(([t, at], i) => [t, at, i ? 'sio' : 'p2io'])
  return figure({
    ownProps: true,
    heldRaw: between(sheet(true) + tear(1.1) + tear(0.5) + ring + rings, D, 0.2, D - 0.2),
    left: { hold: true, over: true, anims: [holdAt(D, 16, 14, 0.2, D - 0.2)] },
    right: { hold: true, over: true, carry: between(marker, D, 1.5, D - 0.2), anims: [anim('translate', D, [[0, '0 0'], [0.4, '-34 -6', 'p2out'], [0.55, '-14 -40', 'p2out'], [0.8, '-20 -6', 'p2io'], [1.0, '-34 -6', 'p2io'], [1.15, '-14 -40', 'p2out'], [1.5, '0 0', 'p2io'], ...circle, [D - 0.2, '-12 12'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 4', 'p2io'], [D - 0.3, '0 4'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// File storage: folders fly in over his shoulder and drop into a cardboard box at his feet, which he pats shut
function cabinet() {
  const D = EVENT_SECONDS.cabinet
  const BOX = '#C9965A'
  const box = rect(22, 62, 64, 24, BOX) + rect(22, 62, 64, 3, '#B07F48') + rect(14, 56, 12, 8, '#B07F48') + rect(82, 56, 12, 8, '#B07F48') + rect(46, 70, 16, 6, CREAM)
  const folder = (fill) => rect(0, 0, 9, 3, fill) + rect(0, 2, 22, 15, fill) + rect(0, 2, 22, 2, '#FFFFFF', 'fill-opacity=".35"')
  const fly = (t, fill) => wrap(folder(fill), '', anim('translate', D, [[0, '150 -40'], [t, '150 -40'], [t + 0.35, '80 -30', 'p2out'], [t + 0.7, '43 62', 'p2in'], [D, '43 62']], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.02, '1', 'lin'], [t + 0.66, '1'], [t + 0.7, '0', 'lin'], [D, '0']], ONCE))
  const T = [0.3, 0.8, 1.3, 1.8]
  return figure({
    ownProps: true,
    left: { hold: true, anims: [holdAt(D, 16, 24, 0.3, D - 0.3)] },
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [0.3, '-14 24', 'p2out'], [2.4, '-14 24'], [2.55, '-18 32', 'p2in'], [2.7, '-14 24', 'p2out'], [2.85, '-18 32', 'p2in'], [D - 0.3, '-14 24'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], ...T.flatMap((t) => [[t + 0.1, '5 -5', 'p2io'], [t + 0.5, '0 5', 'p2io']]), [D, '0 0', 'p2io']], ONCE)] },
    props: T.map((t, i) => fly(t, ['#E7C46A', '#8FC7F2', '#F28A8A', '#B5E3A0'][i])).join('') + box,
  })
}

// Video editing: a clapperboard snaps shut twice, "take one, take two", with a film reel spinning beside him
function clapper() {
  const D = EVENT_SECONDS.clapper
  const CLAPS = [0.9, 2.0]
  const stripes = (y) => [0, 1, 2, 3, 4].map((i) => rect(30 + i * 8, y, 4, 6, '#FFFFFF')).join('')
  const board = rect(30, 34, 40, 26, INK) + rect(33, 39, 34, 1.5, '#FFFFFF') + rect(33, 46, 34, 1.5, '#FFFFFF') + rect(33, 53, 34, 1.5, '#FFFFFF') + rect(30, 34, 40, 6, INK) + stripes(34)
  const angle = [[0, '0 30 33'], [0.3, '-32 30 33', 'p2out']]
  for (const t of CLAPS) angle.push([t - 0.12, '-32 30 33'], [t, '0 30 33', 'p2in'], [t + 0.35, '-32 30 33', 'p2out'])
  angle.push([D - 0.3, '-32 30 33'], [D, '0 30 33', 'p2io'])
  const stick = wrap(rect(30, 27, 40, 6, INK) + stripes(27), '', anim('rotate', D, angle, ONCE))
  const bang = CLAPS.map((t) => between(rect(74, 24, 6, 2, CREAM) + rect(73, 30, 7, 2, CREAM) + rect(72, 18, 2, 5, CREAM), D, t, t + 0.25)).join('')
  const reel = wrap(disc(0, 0, 12, '#3A3A37') + [[-5, -5], [5, -5], [-5, 5], [5, 5]].map(([x, y]) => disc(x, y, 3, '#8A8F98')).join('') + disc(0, 0, 2, '#8A8F98'), 'translate(124 72)',
    anim('rotate', 1.2, [[0, '0'], [1.2, '360', 'lin']]))
  return figure({
    ownProps: true,
    heldRaw: between(board + stick + bang, D, 0.15, D - 0.15),
    left: { hold: true, over: true, anims: [holdAt(D, 22, 18, 0.15, D - 0.15)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], ...CLAPS.flatMap((t) => [[t - 0.05, '1 1'], [t + 0.02, '1 .3', 'p2io'], [t + 0.25, '1 1', 'p2io']]), [D, '1 1']], ONCE)] },
    props: reel,
  })
}

// Scraping the web: he swings a butterfly net and catches little web pages fluttering past, one, two, three
function netcatch() {
  const D = EVENT_SECONDS.netcatch
  const CATCH = [0.8, 1.6, 2.4]
  const page = rect(-5, -6, 10, 12, CREAM) + rect(-5, -6, 10, 3, '#6EA8FF') + rect(-3, -1, 6, 1.5, PAPER_SHADE) + rect(-3, 2, 4, 1.5, PAPER_SHADE)
  const MESH = '#E8F1F7'
  const bag = [0, 1, 2, 3, 4].map((k) => rect(110 + k * 2.6, 2 + k * 5, 28 - k * 5.2, 5, MESH, 'fill-opacity=".45"') + rect(110 + k * 2.6, 2 + k * 5, 1, 5, '#9AA0A6') + rect(137 - k * 2.6, 2 + k * 5, 1, 5, '#9AA0A6')).join('')
  const hoop = bag + `<circle cx="124" cy="-6" r="15" fill="${MESH}" fill-opacity=".25" stroke="${WOOD}" stroke-width="2.6"/>` +
    [-8, 0, 8].map((d) => rect(124 + d, -18, 0.8, 24, '#C9CDD2') + rect(112, -6 + d, 24, 0.8, '#C9CDD2')).join('')
  const pole = [0, 1, 2, 3, 4, 5, 6].map((k) => rect(100 + k * 2.6, 28 - k * 3.6, 3.5, 5, WOOD)).join('')
  const caught = CATCH.map((t, i) => between(wrap(page, `translate(${118 + i * 6} ${10 + (i % 2) * 5})`), D, t + 0.05, D - 0.1)).join('')
  const swing = [[0, '0 96 32'], [0.3, '-25 96 32', 'p2out']]
  for (const t of CATCH) swing.push([t - 0.25, '-25 96 32', 'sio'], [t, '12 96 32', 'p2in'], [t + 0.25, '-15 96 32', 'p2out'])
  swing.push([D - 0.2, '0 96 32', 'p2io'], [D, '0 96 32'])
  const flutter = (t, i) => wrap(wrap(page, '', anim('rotate', 0.4, [[0, '-15'], [0.2, '15', 'sio'], [0.4, '-15', 'sio']])), '',
    anim('translate', D, [[0, '190 -30'], [t - 0.6, `190 ${-30 + i * 10}`], [t, '126 -6', 'sio'], [D, '126 -6']], ONCE),
    anim('opacity', D, [[0, '0'], [t - 0.6, '0'], [t - 0.55, '1', 'lin'], [t, '1'], [t + 0.05, '0', 'lin'], [D, '0']], ONCE))
  return figure({
    ownProps: true,
    right: { hold: true, carry: between(pole + hoop + caught, D, 0.05, D - 0.1), anims: [anim('rotate', D, swing, ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '5 -4', 'p2io'], [D - 0.3, '5 -4'], [D, '0 0', 'p2io']], ONCE)] },
    props: CATCH.map(flutter).join(''),
  })
}

// Testing an iPhone app: he holds a phone up toward you, taps two icons, and an app opens full screen
function apptest() {
  const D = EVENT_SECONDS.apptest
  const OPEN = 2.0
  const COLORS = ['#E5584B', '#E7B04A', '#5E8C6A', '#6EA8FF', '#B58CFF', '#F28A8A', '#8FE3FF', SPARK, '#B5E3A0']
  const icons = COLORS.map((c, i) => rect(44 + (i % 3) * 7.5, 22 + Math.floor(i / 3) * 8, 5, 5, c)).join('')
  const app = wrap(rect(42, 17, 24, 41, '#6EA8FF') + rect(45, 22, 18, 5, '#FFFFFF') + rect(45, 31, 18, 10, '#DCEBFF') + rect(45, 44, 12, 3, '#FFFFFF'), '',
    anim('opacity', D, [[0, '0'], [OPEN, '0'], [OPEN + 0.15, '1', 'lin'], [D, '1']], ONCE))
  const phone = rect(39, 13, 30, 48, INK) + rect(42, 17, 24, 41, '#1F2A44') + rect(50, 14.5, 8, 1.5, '#45454A') + icons + app + rect(50, 58.5, 8, 1, '#8A8F98')
  const tap = (x, y, t) => [[t - 0.2, `${x} ${y - 4}`, 'p2io'], [t, `${x} ${y}`, 'p2in'], [t + 0.15, `${x} ${y - 4}`, 'p2out']]
  return figure({
    ownProps: true,
    heldRaw: between(phone, D, 0.2, D - 0.2),
    left: { hold: true, over: true, anims: [holdAt(D, 30, 22, 0.2, D - 0.2)] },
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.4, '-30 -6', 'p2out'], ...tap(-38, -2, 0.9), ...tap(-30, 6, 1.5), ...tap(-38, 14, OPEN), [OPEN + 0.4, '-6 10', 'p2io'], [D - 0.2, '-6 10'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '-4 3', 'p2io'], [1.5, '-2 4', 'sio'], [OPEN, '-4 5', 'sio'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [OPEN, '1 1'], [OPEN + 0.1, '1.3 1.3', 'p2out'], [D - 0.2, '1.3 1.3'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// UI components: he stacks three building blocks, each one a piece of a page (a button, a picture, a menu), into a tower
function blocks() {
  const D = EVENT_SECONDS.blocks
  const BLOCKS = [
    ['#E5584B', 72, rect(48, 76, 12, 5, '#FFFFFF', 'fill-opacity=".8"')],
    ['#6EA8FF', 58, rect(46, 61, 8, 8, '#FFFFFF', 'fill-opacity=".8"') + rect(56, 62, 8, 2, '#FFFFFF', 'fill-opacity=".8"') + rect(56, 66, 6, 2, '#FFFFFF', 'fill-opacity=".8"')],
    ['#E7B04A', 44, [0, 1, 2].map((i) => rect(46, 47 + i * 3, 16, 1.6, '#FFFFFF', 'fill-opacity=".8"')).join('')],
  ]
  const placed = BLOCKS.map(([fill, y, face], i) => {
    const t = 0.25 + i * 0.85
    return wrap(rect(40, y, 28, 14, fill) + rect(40, y, 28, 2, '#FFFFFF', 'fill-opacity=".3"') + rect(40, y + 12, 28, 2, '#000000', 'fill-opacity=".15"') + face, '',
      anim('translate', D, [[0, '0 -40'], [t, '0 -40'], [t + 0.5, '0 0', 'p2in'], [t + 0.58, '0 -2', 'p2out'], [t + 0.65, '0 0', 'p2in'], [D, '0 0']], ONCE),
      anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.05, '1', 'lin'], [D, '1']], ONCE))
  }).join('')
  const hands = (dx) => [[0, '0 0'], ...BLOCKS.flatMap(([, y], i) => {
    const t = 0.25 + i * 0.85
    return [[t, `${dx} ${y - 40 - 14}`, 'p2io'], [t + 0.5, `${dx} ${y - 14}`, 'p2in'], [t + 0.75, `${dx} ${y - 30}`, 'p2out']]
  }), [D - 0.2, `${dx} 10`, 'p2io'], [D, '0 0', 'p2io']]
  const shine = wrap(pixels(STAR, -3, -3, 1.5, '#E7B04A'), 'translate(54 38)', anim('scale', D, [[0, '0 0'], [2.6, '0 0'], [2.8, '1.4 1.4', 'p2out'], [3.2, '0 0', 'p2in'], [D, '0 0']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: placed + shine,
    left: { hold: true, over: true, anims: [anim('translate', D, hands(18), ONCE)] },
    right: { hold: true, over: true, anims: [anim('translate', D, hands(-17), ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2io'], [D - 0.3, '0 6'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// PDFs: he holds up a document and runs a yellow highlighter across its lines, one by one
function highlight() {
  const D = EVENT_SECONDS.highlight
  const LINES = [[36, 0.6], [44, 1.3], [52, 2.0]]
  const doc = rect(31, 25, 46, 42, '#C9C3B2') + rect(32, 26, 44, 40, CREAM) + rect(32, 26, 44, 5, '#E5584B') +
    LINES.map(([y]) => rect(36, y, 34, 2.5, PAPER_SHADE)).join('') + rect(36, 60, 22, 2.5, PAPER_SHADE)
  const marks = LINES.map(([y, t]) => `<rect x="35" y="${y - 1.5}" width="0" height="5.5" fill="#F7E04A" fill-opacity=".65">${anim('width', D, [[0, '0'], [t, '0'], [t + 0.45, '36', 'lin'], [D, '36']], ONCE)}</rect>`).join('')
  const pen = rect(74, 37, 13, 5, '#F7E04A') + rect(86, 37, 3, 5, '#3A3A37') + rect(71, 38, 3, 3, '#D9B92E')
  const sweeps = LINES.flatMap(([y, t]) => [[t - 0.12, `-36 ${y - 37.5}`, 'p2io'], [t + 0.45, `-1 ${y - 37.5}`, 'lin'], [t + 0.55, `-1 ${y - 32}`, 'p2out']])
  return figure({
    ownProps: true,
    heldRaw: between(doc + marks, D, 0.2, D - 0.2),
    left: { hold: true, over: true, anims: [holdAt(D, 14, 18, 0.2, D - 0.2)] },
    right: { hold: true, over: true, carry: between(pen, D, 0.2, D - 0.2), anims: [anim('translate', D, [[0, '0 0'], [0.4, '-20 -4', 'p2out'], ...sweeps, [D - 0.2, '-10 10'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], ...LINES.flatMap(([, t]) => [[t, '-4 5', 'p2io'], [t + 0.45, '4 5', 'lin']]), [D, '0 0', 'p2io']], ONCE)] },
  })
}

// A game engine: he holds a glowing 3D cube up over his head, turning it as a grid shimmers on the floor
function cube() {
  const D = EVENT_SECONDS.cube
  // Held up above his hat, if he wears one (but no higher than the top of the band)
  const lift = Math.max(-36, Math.min(0, Math.round(hatTop() + 18)))
  const shape = poly('0,-14 16,-6 0,2 -16,-6', '#8FC7F2') + poly('-16,-6 0,2 0,20 -16,12', '#5E8FC7') + poly('16,-6 0,2 0,20 16,12', '#3D6A9E')
  const turn = anim('scale', 2, [[0, '1 1'], [0.5, '.2 1', 'sio'], [1, '-1 1', 'sio'], [1.5, '.2 1', 'sio'], [2, '1 1', 'sio']])
  const glow = disc(0, 3, 22, '#8FC7F2', 'fill-opacity=".18"')
  const lifted = wrap(glow + wrap(shape, '', turn), `translate(54 ${-22 + lift})`, anim('translate', D, [[0, '0 40'], [0.4, '0 0', 'back'], [D - 0.3, '0 0'], [D, '0 40', 'p2in']], ONCE),
    anim('translate', 1, [[0, '0 0'], [0.5, '0 -3', 'sio'], [1, '0 0', 'sio']]))
  const grid = [0, 1, 2, 3, 4].map((i) => rect(4 + i * 25, 84, 1.5, 3, '#8FC7F2', 'fill-opacity=".7"')).join('') + rect(0, 85, 108, 1.2, '#8FC7F2', 'fill-opacity=".7"')
  return figure({
    ownProps: true,
    heldRaw: between(lifted, D, 0.05, D - 0.05),
    left: { hold: true, anims: [holdAt(D, 18, -34 + lift, 0.4, D - 0.3)] },
    right: { hold: true, anims: [holdAt(D, -18, -34 + lift, 0.4, D - 0.3)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '0 -6', 'p2io'], [D - 0.3, '0 -6'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1.25 1.25', 'p2out'], [D - 0.3, '1.25 1.25'], [D, '1 1', 'p2io']], ONCE)],
    },
    props: wrap(grid, '', anim('opacity', 0.9, [[0, '.4'], [0.45, '1', 'sio'], [0.9, '.4', 'sio']])),
  })
}

// Good morning: the sun comes up over the floor beside him, he blinks awake with a little hop and waves "GM!"
function goodmorning() {
  const D = EVENT_SECONDS.goodmorning
  const SUN = '#F6C445'
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => wrap(rect(-2.5, -26, 5, 7, SUN), `rotate(${deg})`)).join('')
  const sun = wrap(wrap(rays, '', anim('rotate', 6, [[0, '0'], [6, '360']])) + disc(0, 0, 16, SUN) + disc(-4, -4, 7, '#FCE08A'), 'translate(140 54)',
    anim('translate', D, [[0, '0 60'], [1.1, '0 0', 'p2out'], [D, '0 -4', 'sio']], ONCE))
  const glow = disc(140, 62, 34, SUN, 'fill-opacity=".1"')
  const risen = `<g clip-path="url(#floor)">${wrap(glow, '', anim('opacity', D, [[0, '0'], [0.5, '0'], [1.1, '1', 'lin'], [D, '1']], ONCE)) + sun}</g>`
  const bubble = wrap(speech('GM!'), '', anim('scale', D, [[0, '0 0'], [1.1, '0 0'], [1.35, '1 1', 'back'], [D, '1 1']], ONCE))
  const wave = anim('rotate', 0.5, [[0, '-22 96 44'], [0.25, '22 96 44', 'sio'], [0.5, '-22 96 44', 'sio']])
  return figure({
    ownProps: true,
    upper: [anim('translate', D, [[0, '0 3'], [1.0, '0 3'], [1.2, '0 -6', 'p2out'], [1.4, '0 0', 'p2in'], [D, '0 0']], ONCE)],
    right: { anims: [anim('translate', D, [[0, '0 0'], [1.0, '0 0'], [1.25, '8 -40', 'p2out'], [D, '8 -40']], ONCE), wave] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.6, '3 0', 'p2io'], [1.1, '3 0'], [1.3, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 .15'], [0.5, '1 .15'], [0.7, '1 .5', 'p2io'], [0.85, '1 .15', 'p2io'], [1.05, '1.15 1.15', 'p2out'], [1.4, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
    props: risen + bubble,
  })
}

// Good night: a crescent moon and stars come out beside him, he waves a sleepy "GN", and nods off with Zzz rising
function goodnight() {
  const D = EVENT_SECONDS.goodnight
  const MOON = '#F2E7B6'
  // A disc with a smaller disc's worth bitten out of its upper right, row by row
  const crescent = Array.from({ length: 26 }, (_, i) => {
    const y = i + 0.5 - 13
    const half = Math.sqrt(Math.max(0, 169 - y * y))
    const by = y + 5
    const bite = Math.sqrt(Math.max(0, 121 - by * by))
    const [from, to] = [146 - half, 146 + half]
    const end = bite > 0 ? Math.min(to, 153 - bite) : to
    return end > from ? rect(n(from), n(5 + i), n(end - from), 1, MOON) : ''
  }).join('')
  const stars = [[128, 0, 0.4], [164, 4, 0.8], [132, 38, 1.2]].map(([x, y, t]) =>
    wrap(pixels(STAR, x, y, 1.6, MOON), '', anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.2, '1', 'lin'], [t + 0.6, '.4', 'sio'], [t + 1.0, '1', 'sio'], [D, '1']], ONCE))).join('')
  const sky = wrap(crescent, '', anim('translate', D, [[0, '0 -12'], [0.6, '0 0', 'p2out'], [D, '0 0']], ONCE), anim('opacity', D, [[0, '0'], [0.5, '1', 'lin'], [D, '1']], ONCE)) + stars
  const zs = [[100, 0, 0.7, 2.2], [110, -22, 1.0, 2.7]].map(([x, y, s, t]) =>
    wrap(wrap(zGlyph(s, Z_COLOR), '', anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.2, '1', 'lin'], [D, '1']], ONCE)), `translate(${x} ${y})`,
      anim('translate', D, [[0, '0 0'], [t, '0 0'], [D, '3 -6', 'sout']], ONCE))).join('')
  const bubble = wrap(speech('GN'), '', anim('scale', D, [[0, '0 0'], [0.3, '0 0'], [0.55, '1 1', 'back'], [1.9, '1 1'], [2.1, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const wave = anim('rotate', 0.9, [[0, '-14 96 44'], [0.45, '14 96 44', 'sio'], [0.9, '-14 96 44', 'sio']])
  return figure({
    ownProps: true,
    // he sinks a little and his head nods as he drifts off
    upper: [anim('translate', D, [[0, '0 0'], [2.0, '0 0'], [2.6, '0 4', 'sio'], [D, '0 4']], ONCE), anim('rotate', D, [[0, '0 53 65'], [2.2, '0 53 65'], [2.8, '-4 53 65', 'sio'], [D, '-3 53 65', 'sio']], ONCE)],
    right: { anims: [anim('translate', D, [[0, '0 0'], [0.25, '8 -40', 'p2out'], [1.9, '8 -40'], [2.3, '0 0', 'p2io'], [D, '0 0']], ONCE), wave] },
    eyes: { blink: false, scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1 .45', 'p2io'], [1.4, '1 .45'], [1.55, '1 .1', 'p2io'], [1.75, '1 .45', 'p2io'], [2.2, '1 .45'], [2.6, '1 .08', 'p2io'], [D, '1 .08']], ONCE)] },
    props: sky + bubble + zs,
  })
}

// Unity, the game engine: he drags a grey cube with the red, green and blue move arrows, presses Play,
// and the cube drops and bounces on the floor
function unity() {
  const D = EVENT_SECONDS.unity
  const CX = 136
  const CY = 18
  const cubeShape = poly('0,-17 19,-8.5 0,0 -19,-8.5', '#E4E4E4') + poly('-19,-8.5 0,0 0,22 -19,13.5', '#B4B4B4') + poly('19,-8.5 0,0 0,22 19,13.5', '#8C8C8C')
  const gizmo = rect(0, -1.5, 26, 3, '#E5484D') + poly('26,-6 34,0 26,6', '#E5484D') + rect(-1.5, -30, 3, 30, '#4CC16A') + poly('-6,-30 0,-38 6,-30', '#4CC16A') + rect(-4.5, -4.5, 9, 9, '#3D7BF0', 'fill-opacity=".85"')
  // dragged up and over with the arrows, then Play: it falls to the floor, bounces twice and settles
  const drag = [[0, '0 0'], [0.5, '0 0'], [0.9, '-6 -8', 'p2io'], [1.3, '4 -12', 'p2io'], [1.7, '0 -10', 'p2io'], [2.0, '0 -10'],
    [2.35, '0 46', 'p2in'], [2.5, '0 34', 'p2out'], [2.62, '0 46', 'p2in'], [2.7, '0 42', 'p2out'], [2.78, '0 46', 'p2in'], [D, '0 46']]
  const squash = anim('scale', D, [[0, '1 1'], [2.34, '1 1'], [2.37, '1.15 .8', 'p2out'], [2.48, '1 1', 'p2io'], [D, '1 1']], ONCE)
  const shadow = wrap(rect(-17, 0, 34, 3, '#000000', 'fill-opacity=".22"'), `translate(${CX} ${FLOOR - 2})`, anim('opacity', D, [[0, '.4'], [2.0, '.4'], [2.35, '1', 'p2in'], [D, '1']], ONCE))
  const cube = wrap(wrap(wrap(cubeShape, '', squash), '') + between(gizmo, D, 0.15, 2.0), `translate(${CX} ${CY})`, anim('translate', D, drag, ONCE))
  const appear = anim('scale', D, [[0, '0 0'], [0.05, '0 0'], [0.35, '1 1', 'back'], [D, '1 1']], ONCE)
  // The Play button, pressed (it turns blue) just before the cube drops
  const button = (fill) => rect(-12, -9, 24, 18, fill) + poly('-4,-5.5 5.5,0 -4,5.5', '#FFFFFF')
  const play = wrap(button('#3C3C3C'), `translate(${CX} -34)`, appear)
  const lit = wrap(button('#3D7BF0'), `translate(${CX} -34)`, anim('opacity', D, [[0, '0'], [1.95, '0'], [2.0, '1', 'lin'], [D, '1']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: shadow + wrap(cube, '', appear) + play + lit,
    // his hand grabs the arrows and drags, then reaches up and taps Play
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.45, '14 -6', 'p2out'], [0.9, '8 -14', 'p2io'], [1.3, '18 -18', 'p2io'], [1.7, '14 -16', 'p2io'], [1.95, '30 -54', 'p2out'], [2.1, '30 -52'], [2.4, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    upper: [anim('translate', D, [[0, '0 0'], [2.8, '0 0'], [2.95, '0 -4', 'p2out'], [3.1, '0 0', 'p2in'], [D, '0 0']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '4 -2', 'p2io'], [1.8, '4 -4'], [2.0, '4 -6', 'p2io'], [2.4, '5 4', 'p2in'], [D, '5 4']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [2.8, '1 1'], [2.9, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  })
}

// ---- More of Claude's work: web searches, git trouble, tidying, databases, deploys, the kind of file, and your breaks ----

// The top half of a disc, sitting on baseY, out of one-unit rows
const dome = (cx, baseY, R, fill) =>
  Array.from({ length: R }, (_, i) => {
    const y = R - i - 0.5
    const half = Math.sqrt(R * R - y * y)
    return rect(n(cx - half), baseY - R + i, n(half * 2), 1, fill)
  }).join('')
// A rect whose width changes over time (bites out of a sandwich): steps are [seconds, width]
const shrinking = (x, y, w, h, fill, D, steps) => rect(x, y, w, h, fill).replace('/>', `>${anim('width', D, [[0, `${w}`], ...steps.map(([t, value]) => [t, `${value}`])], ONCE)}</rect>`)

// Searching the web: a satellite dish beside him swivels across the sky, beaming out signal arcs, while he cranks it round
function satellite() {
  const D = EVENT_SECONDS.satellite
  const GREY = '#C9CDD2'
  const ARC = ['.XXXXX.', 'X.....X']
  const stand = rect(135, 44, 7, 42, '#7E848B') + poly('124,86 152,86 146,78 130,78', STEEL) + rect(124, 58, 11, 3, '#7E848B') + rect(121, 55, 5, 9, WOOD)
  // The dish faces up (its feed arm along -y), and the waves travel out along the arm
  const waves = [0, 0.45, 0.9].map((begin) => wrap(
    wrap(pixels(ARC, -7, -1, 2, GREEN), '', anim('scale', 1.35, [[0, '.6 .6'], [1.35, '1.7 1.7', 'sout']], { begin }), anim('opacity', 1.35, [[0, '0'], [0.15, '1', 'lin'], [1.35, '0', 'lin']], { begin })),
    '', anim('translate', 1.35, [[0, '0 -16'], [1.35, '0 -42', 'sout']], { begin }))).join('')
  const dish = poly('-18,-3 18,-3 14,4 6,8 -6,8 -14,4', GREY) + rect(-18, -4, 36, 2, '#7E848B') + rect(-1.2, -17, 2.4, 14, '#7E848B') + rect(-3, -21, 6, 5, '#E5484D')
  const swivel = anim('rotate', D, [[0, '-30'], [0.5, '-30'], [1.3, '28', 'sio'], [2.1, '-40', 'sio'], [2.8, '12', 'sio'], [D, '-20', 'sio']], ONCE)
  const head = wrap(wrap(dish + between(waves, D, 0.4, D - 0.25), '', swivel), 'translate(138 44) scale(1.45)')
  const crank = anim('translate', 0.6, [[0, '0 0'], [0.15, '2 -3', 'sio'], [0.3, '0 -5', 'sio'], [0.45, '-2 -3', 'sio'], [0.6, '0 0', 'sio']])
  return figure({
    ownProps: true,
    heldRaw: stand + head,
    right: { hold: true, over: true, anims: [holdAt(D, 18, 16, 0.4, D - 0.3), crank] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.5, '4 -5', 'p2io'], [1.3, '6 -6', 'sio'], [2.1, '2 -6', 'sio'], [2.8, '5 -6', 'sio'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// A merge conflict: he tries to push two magnets together, north to north, and they keep springing apart,
// under the <<< and >>> of the clash
function armwrestle() {
  const D = EVENT_SECONDS.armwrestle
  const RED = '#E5484D'
  const BLUE = '#3D7BF0'
  const pole = (letter, x) => word(letter, x, 28, 2, '#FFFFFF')
  // Each magnet rides in its hand, north pole (red) facing the other one
  const leftMagnet = rect(13, 24, 17, 18, BLUE) + rect(30, 24, 17, 18, RED) + rect(13, 24, 34, 2.5, '#FFFFFF', 'fill-opacity=".25"') + pole('S', 18.5) + pole('N', 34.5)
  const rightMagnet = rect(60, 24, 17, 18, RED) + rect(77, 24, 17, 18, BLUE) + rect(60, 24, 34, 2.5, '#FFFFFF', 'fill-opacity=".25"') + pole('N', 64.5) + pole('S', 82.5)
  // Three shoves: in close, a shaky hold, then they spring apart
  const PUSHES = [0.5, 1.5, 2.5]
  const shove = (dx) => anim('translate', D, [[0, '0 0'], ...PUSHES.flatMap((t) => [[t, '0 0'], [t + 0.35, `${dx} 0`, 'p2in'], [t + 0.6, `${dx} 0`], [t + 0.75, `${-dx / 2} 0`, 'p2out']]), [D - 0.3, `${-dx / 2} 0`], [D, '0 0', 'p2io']], ONCE)
  const shake = anim('translate', 0.12, [[0, '0 0'], [0.03, '0 -.8'], [0.06, '0 0'], [0.09, '0 .8'], [0.12, '0 0']])
  // Push-back marks flash in the gap each time they get close
  const REPEL = ['X.', '.X', '.X', 'X.']
  const marks = PUSHES.map((t) => between(pixels(REPEL, 49, 18, 2, '#FFE9A8') + pixels(REPEL.map((row) => [...row].reverse().join('')), 56, 18, 2, '#FFE9A8') + pixels(REPEL, 49, 40, 2, '#FFE9A8') + pixels(REPEL.map((row) => [...row].reverse().join('')), 56, 40, 2, '#FFE9A8'), D, t + 0.35, t + 0.75)).join('')
  const lift = Math.round(Math.min(-14, hatTop() - 14))
  const clash = between(word('<<<', 6, lift, 2.6, BLUE) + word('>>>', 78, lift, 2.6, RED), D, 0.4, D - 0.3)
  return figure({
    ownProps: true,
    left: { hold: true, carry: leftMagnet, anims: [shove(6), shake] },
    right: { hold: true, carry: rightMagnet, anims: [shove(-6), shake] },
    eyes: { lid: 0.4, gaze: [anim('translate', D, [[0, '0 0'], [0.4, '0 4', 'p2io'], [D - 0.3, '0 4'], [D, '0 0', 'p2io']], ONCE)] },
    props: marks + clash + drop(100, -2) + drop(-8, 6, 0.8),
  })
}

// A force push: a big red button on a stand; he hovers over it, sweating and shaking, then slams it
function redbutton() {
  const D = EVENT_SECONDS.redbutton
  const RED = '#E5484D'
  const PRESS = 2.3
  const stand = rect(118, 58, 30, 28, '#4A4D52') + rect(116, 54, 34, 5, '#5E6268') + [0, 1, 2, 3].map((i) => rect(120 + i * 7, 66, 4, 4, '#E7B04A')).join('')
  const button = wrap(wrap(dome(0, 0, 11, RED) + rect(-6, -9, 5, 2, '#FF8A8E'), '', anim('scale', D, [[0, '1 1'], [PRESS, '1 1'], [PRESS + 0.06, '1.1 .45', 'p2in'], [PRESS + 0.5, '1.1 .45'], [PRESS + 0.7, '1 1', 'p2out'], [D, '1 1']], ONCE)), 'translate(133 54)')
  const burst = between([0, 45, 90, 135, 180].map((deg) => wrap(rect(-1.5, -24, 3, 7, '#F2C14E'), `translate(133 50) rotate(${deg - 90})`)).join(''), D, PRESS + 0.05, PRESS + 0.45)
  const shake = anim('translate', 0.12, [[0, '0 0'], [0.03, '-1 0'], [0.06, '0 0'], [0.09, '1 0'], [0.12, '0 0']])
  return figure({
    ownProps: true,
    heldRaw: stand + button + burst,
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.5, '38 -22', 'p2out'], [PRESS - 0.15, '38 -26', 'sio'], [PRESS, '38 2', 'p2in'], [PRESS + 0.6, '38 2'], [D - 0.1, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    upper: [shake],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '5 4', 'p2io'], [D - 0.3, '5 4'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1.3 1.3', 'p2out'], [PRESS, '1.3 1.3'], [PRESS + 0.05, '1 .15', 'p2io'], [PRESS + 0.6, '1 .15'], [PRESS + 0.8, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
    props: drop(100, 0) + drop(-8, 8, 0.7) + drop(102, 4, 1.4),
  })
}

// Formatting or linting: he combs the top of his head neat, the messy tufts lying flat as the comb passes, and it sparkles.
// With a hat on, he combs the hat.
function comb() {
  const D = EVENT_SECONDS.comb
  const lift = Math.round(Math.min(0, hatTop()))
  const COMB = '#3D7BF0'
  // In the hand's own place, so it rides along: the spine and the teeth to the left of his grip
  const combShape = rect(50, 25, 37, 5, COMB) + Array.from({ length: 9 }, (_, k) => rect(51 + k * 4, 30, 2, 6, COMB)).join('')
  const sweep = anim('translate', D, [[0, '0 0'], [0.35, `0 ${lift - 36}`, 'p2out'], [1.2, `-56 ${lift - 36}`, 'sio'], [1.9, `0 ${lift - 36}`, 'sio'], [2.6, `-56 ${lift - 36}`, 'sio'], [D - 0.3, `0 ${lift - 36}`, 'sio'], [D, '0 0', 'p2io']], ONCE)
  const tufts = lift < 0 ? '' : [[78, 18, 0.45], [62, -14, 0.75], [46, 20, 1.0], [30, -18, 1.25]].map(([x, deg, t]) =>
    wrap(rect(-2, -12, 4, 12.5, DARK), `translate(${x} 0.5) rotate(${deg})`, anim('scale', D, [[0, '1 1'], [t, '1 1'], [t + 0.15, '1 .15', 'p2out'], [D, '1 .15']], ONCE))).join('')
  const sparkle = between(pixels(STAR, 82, lift - 16, 2.2, '#FFE9A8') + pixels(STAR, 20, lift - 10, 1.6, '#FFE9A8'), D, 2.9, D - 0.1)
  return figure({
    ownProps: true,
    behind: tufts,
    right: { hold: true, carry: combShape, anims: [sweep] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '0 -4', 'p2io'], [2.8, '0 -4'], [3.0, '0 0', 'p2io'], [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [2.9, '1 1'], [3.0, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
    props: sparkle,
  })
}

// A database command: he digs into a stack of database disks with a shovel, and bits of data fly out over his shoulder
function dig() {
  const D = EVENT_SECONDS.dig
  const DB = '#5B8DEF'
  const DB_TOP = '#8DB3FA'
  const DB_EDGE = '#3E6CC4'
  const disk = (y) => rect(127, y - 2, 30, 2, DB_TOP) + rect(125, y, 34, 2, DB_TOP) + rect(125, y + 2, 34, 10, DB) + rect(127, y + 12, 30, 2, DB_EDGE) + rect(150, y + 5, 3, 3, GREEN)
  const stack = disk(72) + disk(58) + disk(44)
  const shovel = wrap(rect(0, -1.5, 42, 3, WOOD) + poly('40,-6 51,-5 54,0 51,5 40,6', STEEL), 'translate(96 32) rotate(14)')
  const DIGS = [0.7, 1.6, 2.5]
  const scoop = DIGS.flatMap((t) => [[t - 0.25, '-6 -12', 'p2io'], [t, '0 2', 'p2in'], [t + 0.25, '-6 -12', 'p2out']])
  const bits = DIGS.flatMap((t, i) => [[96, -24, DB_TOP], [116, -32, GREEN]].map(([x, y, fill], k) =>
    wrap(rect(-2, -2, 4, 4, fill), '', anim('translate', D, [[0, '146 46'], [t + 0.25, '146 46'], [t + 0.75, `${x - k * 8 + i * 4} ${y}`, 'p2out'], [D, `${x - k * 8 + i * 4} ${y}`]], ONCE),
      anim('opacity', D, [[0, '0'], [t + 0.25, '0'], [t + 0.3, '1', 'lin'], [t + 0.75, '1'], [t + 0.95, '0', 'lin'], [D, '0']], ONCE)))).join('')
  return figure({
    ownProps: true,
    heldRaw: stack + bits,
    right: { hold: true, over: true, carry: shovel, anims: [anim('translate', D, [[0, '0 0'], [0.3, '-6 -12', 'p2out'], ...scoop, [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '5 5', 'p2io'], [D - 0.3, '5 5'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// A deploy that went out: a crate floats down under a parachute and lands on a server rack, whose lights go green
function parachute() {
  const D = EVENT_SECONDS.parachute
  const LAND = 2.3
  const rack = rect(118, 46, 34, 40, '#3A3D42') + [0, 1, 2].map((i) => rect(121, 50 + i * 11, 28, 8, '#2A2C30') + rect(124, 53 + i * 11, 10, 2, '#5E6268')).join('')
  const leds = [0, 1, 2].map((i) => wrap(rect(143, 52 + i * 11, 3, 3, GREEN), '', anim('opacity', D, [[0, '.15'], [LAND + 0.1 + i * 0.1, '.15'], [LAND + 0.15 + i * 0.1, '1', 'lin'], [LAND + 0.5 + i * 0.1, '.35'], [LAND + 0.8 + i * 0.1, '1'], [D, '1']], ONCE))).join('')
  // Drawn with the crate's bottom middle at 0 0
  const crate = rect(-9, -14, 18, 14, '#C8935A') + rect(-9, -14, 18, 2, '#A8743F') + rect(-9, -2, 18, 2, '#A8743F') + rect(-1, -14, 2, 14, '#A8743F')
  const strings = poly('-16,-34 -14.6,-34 -8,-14 -9,-14', INK) + poly('16,-34 14.6,-34 8,-14 9,-14', INK) + rect(-0.6, -34, 1.2, 20, INK)
  const canopy = dome(0, -34, 17, '#E5584B') + rect(-6, -46, 4, 12, '#FFFFFF') + rect(3, -46, 4, 12, '#FFFFFF') + rect(-17, -36, 34, 2, '#C4433A')
  const chute = wrap(strings + canopy, '', anim('scale', D, [[0, '1 1'], [LAND, '1 1'], [LAND + 0.35, '1.2 0', 'p2in'], [D, '1.2 0']], ONCE))
  const falling = wrap(wrap(chute + crate, '', anim('rotate', D, [[0, '8 0 -34'], [0.7, '-8 0 -34', 'sio'], [1.4, '7 0 -34', 'sio'], [2.0, '-4 0 -34', 'sio'], [LAND, '0 0 -34', 'sio'], [D, '0 0 -34']], ONCE)), '',
    anim('translate', D, [[0, '135 -40'], [LAND, '135 46', 'lin'], [LAND + 0.12, '135 43', 'p2out'], [LAND + 0.24, '135 46', 'p2in'], [D, '135 46']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: rack + leds + falling,
    upper: [anim('translate', D, [[0, '0 0'], [LAND + 0.3, '0 0'], [LAND + 0.5, '0 -6', 'p2out'], [LAND + 0.7, '0 0', 'p2in'], [D, '0 0']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '4 -7'], [LAND, '5 5', 'sio'], [D, '5 5']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [LAND + 0.3, '1 1'], [LAND + 0.4, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  })
}

// Writing tests: a white lab coat over whatever he wears, a bubbling test tube held up to his eye, and a green tick when it checks out
function labcoat() {
  const D = EVENT_SECONDS.labcoat
  const COAT = '#F4F4F2'
  const FOLD = '#DADAD4'
  // A white coat over whatever he wears: wider than him, hanging a little past his body, open down the middle,
  // with small collar points, buttons, and a pocket with a pen
  const coat = rect(9, 25, 41, 44, COAT) + rect(57, 25, 41, 44, COAT) + rect(49, 25, 1, 44, FOLD) + rect(57, 25, 1, 44, FOLD) +
    poly('38,25 50,25 50,34', FOLD) + poly('69,25 57,25 57,34', FOLD) + rect(45, 40, 2.5, 2.5, '#9AA0A6') + rect(45, 50, 2.5, 2.5, '#9AA0A6') +
    rect(72, 44, 14, 11, FOLD) + rect(75, 40, 2, 6, '#3D7BF0')
  const sleeve = (x) => rect(x, 21, 10, 23, COAT) + rect(x, 21, 10, 2, FOLD)
  const bubbles = [0, 0.35, 0.7].map((begin) => wrap(rect(95.5, 0, 2.5, 2.5, '#BFF5C9'), '', anim('translate', 1.05, [[0, '0 0'], [1.05, '1 -12', 'sout']], { begin }), anim('opacity', 1.05, [[0, '1'], [1.05, '0', 'lin']], { begin }))).join('')
  const tube = rect(91.5, 0, 10, 2, '#E8E8E8') + rect(93, 2, 7, 22, '#DDF3FF') + rect(93, 12, 7, 12, '#5EE07A') + rect(94, 24, 5, 1.5, '#5EE07A') + bubbles
  const swirl = anim('rotate', 0.8, [[0, '-10 96 24'], [0.4, '10 96 24', 'sio'], [0.8, '-10 96 24', 'sio']])
  const tick = wrap(pixels(PIXEL.check, 0, 0, 2.2, GREEN), 'translate(100 -22)', anim('scale', D, [[0, '0 0'], [2.5, '0 0'], [2.8, '1 1', 'back'], [D, '1 1']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: coat,
    left: { hold: true, carry: sleeve(12) },
    right: { hold: true, carry: sleeve(85) + wrap(tube, '', swirl), anims: [holdAt(D, 8, -16, 0.4, D - 0.3)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '5 -4', 'p2io'], [D - 0.3, '5 -4'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.5, '1.2 1.2', 'p2out'], [2.6, '1.2 1.2'], [2.75, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
    props: tick,
  })
}

// Editing styles: palette in one hand, brush in the other, he paints three coloured stripes on a canvas on an easel
function paint() {
  const D = EVENT_SECONDS.paint
  const STROKES = [[22, '#6EA8FF', 0.6], [30, '#F2C14E', 1.4], [38, '#E5584B', 2.2]]
  const easel = poly('127,28 130,28 121,86 118,86', WOOD) + poly('145,28 148,28 157,86 154,86', WOOD) + rect(114, 16, 44, 34, '#C9B79C') + rect(116, 18, 40, 30, '#FFFFFF') + rect(112, 48, 48, 3, WOOD)
  const stripes = STROKES.map(([y, fill, t]) => wrap(rect(0, 0, 32, 5, fill), `translate(120 ${y})`, anim('scale', D, [[0, '0 1'], [t, '0 1'], [t + 0.5, '1 1', 'p2out'], [D, '1 1']], ONCE))).join('')
  // The brush tip takes each stripe's colour as he gets to it
  const tips = STROKES.map(([, fill, t], i) => between(rect(95, -3, 6, 7, fill), D, i ? t - 0.3 : 0, i < 2 ? STROKES[i + 1][2] - 0.3 : D - 0.1)).join('')
  const brush = rect(95.5, 7, 5, 20, '#B07A4F') + rect(95, 3, 6, 4, STEEL) + tips
  // Hand moves so the brush tip (97.5, -1) runs along each stripe
  const path = STROKES.flatMap(([y, , t]) => [[t - 0.25, `22 ${y + 3}`, 'p2io'], [t + 0.5, `52 ${y + 3}`, 'p2out']])
  const palette = poly('-8,28 8,20 24,23 27,33 18,42 0,41 -9,35', '#E9D5A8') + rect(1, 25, 4, 4, '#6EA8FF') + rect(9, 23, 4, 4, '#F2C14E') + rect(17, 27, 4, 4, '#E5584B') + rect(5, 33, 4, 4, GREEN)
  return figure({
    ownProps: true,
    heldRaw: easel + stripes,
    left: { hold: true, carry: palette, anims: [holdAt(D, 0, 8)] },
    right: { hold: true, over: true, carry: brush, anims: [anim('translate', D, [[0, '0 0'], ...path, [D - 0.1, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], ...STROKES.map(([y, , t], i) => [t, `6 ${i * 2 - 1}`, 'p2io']), [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Editing docs: a big feather quill writes line after line on a sheet of paper on a stand
function quill() {
  const D = EVENT_SECONDS.quill
  const LINES = [[20, 26, 0.45], [27, 26, 1.2], [34, 26, 1.95], [41, 16, 2.7]]
  const sheet = rect(132, 57, 4, 29, WOOD) + rect(124, 83, 20, 3, WOOD) + rect(108, 12, 36, 42, CREAM) + rect(106, 9, 40, 5, PAPER_SHADE) + rect(106, 52, 40, 5, PAPER_SHADE)
  const ink = LINES.map(([y, w, t]) => wrap(rect(0, 0, w, 2, INK), `translate(113 ${y})`, anim('scale', D, [[0, '0 1'], [t, '0 1'], [t + 0.5, '1 1'], [D, '1 1']], ONCE))).join('')
  // The nib sticks out to the left of his grip, the feather rising up and to the right
  const feather = poly('84,32 89,25 109,-7 114,-5 93,30', '#F3EFE6') + poly('89,25 109,-7 110.5,-6 90.5,26', '#C9C2B0') + poly('81,37 84,31 88,33', INK)
  const wiggle = anim('rotate', 0.3, [[0, '-3 82 36'], [0.15, '3 82 36', 'sio'], [0.3, '-3 82 36', 'sio']])
  // The nib (81, 37) runs along each line
  const path = LINES.flatMap(([y, w, t]) => [[t - 0.2, `${113 - 81} ${y + 1 - 37}`, 'p2io'], [t + 0.5, `${113 + w - 81} ${y + 1 - 37}`]])
  return figure({
    ownProps: true,
    heldRaw: sheet + ink,
    right: { hold: true, over: true, carry: wrap(feather, '', wiggle), anims: [anim('translate', D, [[0, '0 0'], ...path, [D - 0.1, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], ...LINES.map(([, , t], i) => [t, `6 ${i - 1}`, 'p2io']), [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Two hours on without a break: he drinks from a water bottle, then has a big stretch and suggests a break
function water() {
  const D = EVENT_SECONDS.water
  const STRETCH = 2.1
  const bottle = rect(2, -4, 8, 4, '#2E6FC0') + rect(0, 0, 12, 22, '#CDEBFF') + rect(0, 9, 12, 6, '#FFFFFF') + rect(0, 15, 12, 7, '#5AA9E6')
  // Where the bottle is (its top left corner) over time; the left hand holds it from the left, as with the coffee mug
  const path = [[0, 18, 23], [0.45, 30, 30, 'p2io'], [0.75, 38, 14, 'p2io'], [1.55, 38, 14], [1.8, 30, 30, 'p2io'], [STRETCH - 0.05, 18, 23, 'p2io']]
  const bottleAt = anim('translate', D, [...path.map(([t, x, y, e]) => [t, `${x} ${y}`, e]), [D, '18 23']], ONCE)
  const tilt = anim('rotate', D, [[0, '0 6 6'], [0.75, '0 6 6'], [0.95, '-40 6 6', 'p2io'], [1.55, '-40 6 6'], [1.75, '0 6 6', 'p2io'], [D, '0 6 6']], ONCE)
  const reach = (dx) => [[STRETCH, '0 0'], [STRETCH + 0.45, `${dx} -38`, 'p2out'], [D - 0.6, `${dx} -40`], [D, '0 0', 'p2io']]
  const bubble = wrap(speech('BREAK', 2.6), '', anim('scale', D, [[0, '0 0'], [STRETCH + 0.3, '0 0'], [STRETCH + 0.55, '1 1', 'back'], [D, '1 1']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: between(wrap(wrap(bottle, '', tilt), '', bottleAt), D, 0, STRETCH - 0.1),
    left: { hold: true, over: true, anims: [anim('translate', D, [...path.map(([t, x, y, e]) => [t, `${x - 18} ${y - 23}`, e]), ...reach(-3)], ONCE)] },
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], ...reach(3)], ONCE)] },
    upper: [anim('translate', D, [[0, '0 0'], [STRETCH, '0 0'], [STRETCH + 0.45, '0 -4', 'p2out'], [D - 0.6, '0 -5'], [D, '0 0', 'p2io']], ONCE)],
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.8, '1 1'], [0.95, '1 .15', 'p2io'], [1.6, '1 .15'], [1.75, '1 1', 'p2io'], [STRETCH + 0.2, '1 1'], [STRETCH + 0.4, '1 .15', 'p2io'], [D - 0.5, '1 .15'], [D, '1 1', 'p2io']], ONCE)] },
    props: bubble,
  })
}

// Lunchtime in a quiet spell: he eats a sandwich in three big bites, crumbs falling, and looks very pleased
function sandwich() {
  const D = EVENT_SECONDS.sandwich
  const BITES = [1.0, 1.9, 2.8]
  const BITE = 9
  const bites = (w) => BITES.flatMap((t, i) => [[t, w - i * BITE], [t + 0.05, w - (i + 1) * BITE]])
  const layer = (y, h, fill, w = 36, x = 38) => shrinking(x, y, w, h, fill, D, [...bites(w), [D, w - 3 * BITE]])
  const food = layer(25, 6, '#E3B26B', 34, 39) + layer(31, 3, '#7CC47F', 39, 36) + layer(34, 3, '#E5584B') + layer(37, 3, '#F2C14E') + layer(40, 6, '#D9A35A')
  // Each bite: the sandwich jerks up to his face and back
  const chomp = anim('translate', D, [[0, '0 6'], [0.5, '0 0', 'p2out'], ...BITES.flatMap((t) => [[t - 0.12, '0 0'], [t, '0 -4', 'p2out'], [t + 0.15, '0 0', 'p2in']]), [D - 0.3, '0 0'], [D, '0 6', 'p2io']], ONCE)
  const crumbs = BITES.flatMap((t, i) => [[0, 0], [4, 0.1]].map(([dx, delay]) =>
    wrap(rect(0, 0, 3, 3, '#E3B26B'), `translate(${70 - i * BITE + dx} 42)`, anim('translate', D, [[0, '0 0'], [t + delay, '0 0'], [t + delay + 0.6, `${dx - 2} 44`, 'p2in'], [D, `${dx - 2} 44`]], ONCE),
      anim('opacity', D, [[0, '0'], [t + delay, '0'], [t + delay + 0.05, '1', 'lin'], [t + delay + 0.6, '1'], [t + delay + 0.7, '0', 'lin'], [D, '0']], ONCE)))).join('')
  return figure({
    ownProps: true,
    heldRaw: between(wrap(food, '', chomp), D, 0.05, D - 0.1) + crumbs,
    left: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [0.5, '22 0', 'p2out'], ...BITES.flatMap((t) => [[t - 0.12, '22 0'], [t, '22 -4', 'p2out'], [t + 0.15, '22 0', 'p2in']]), [D - 0.3, '22 0'], [D, '0 0', 'p2io']], ONCE)] },
    upper: [anim('translate', D, [[0, '0 0'], ...BITES.flatMap((t) => [[t, '0 0'], [t + 0.12, '0 1.5', 'p2out'], [t + 0.3, '0 0', 'p2in']]), [D, '0 0']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '0 4', 'p2io'], [D - 0.3, '0 4'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], ...BITES.flatMap((t) => [[t, '1 1'], [t + 0.08, '1 .2', 'p2io'], [t + 0.4, '1 .2'], [t + 0.5, '1 1', 'p2io']]), [3.5, '1 1'], [3.6, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  })
}

// Deploying on a Friday afternoon: he holds up crossed claws, eyes darting, sweating, under a FRI page
function crossclaws() {
  const D = EVENT_SECONDS.crossclaws
  // A hand with two fingers crossed over each other above the palm
  const crossed = (side) => {
    const x = side === 'left' ? 0 : 85
    const finger = (deg) => wrap(rect(-3, -14, 6, 17, SKIN, `stroke="${DARK}" stroke-width="1.4"`), `translate(${x + 11} 33) rotate(${deg})`)
    return finger(side === 'left' ? 22 : -22) + finger(side === 'left' ? -22 : 22) + rect(x + 2, 30, 18, 14, SKIN, `stroke="${DARK}" stroke-width="1.6"`) + (activeOutfit?.sleeve?.(side) ?? '')
  }
  const tremble = anim('translate', 0.14, [[0, '0 0'], [0.035, '-1 .5'], [0.07, '0 0'], [0.105, '1 -.5'], [0.14, '0 0']])
  const top = Math.round(Math.min(-34, hatTop() - 30))
  const page = rect(40, top, 28, 24, '#FFFFFF') + rect(40, top, 28, 6, '#E5484D') + word('FRI', 44.5, top + 9.5, 2.4, INK)
  return figure({
    ownProps: true,
    left: { shape: crossed('left'), anims: [holdAt(D, -2, -16), tremble] },
    right: { shape: crossed('right'), anims: [holdAt(D, 2, -16), tremble] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '-4 0', 'p2io'], [0.8, '4 0', 'p2io'], [1.2, '-4 0', 'p2io'], [1.6, '4 -2', 'p2io'], [2.0, '-4 0', 'p2io'], [2.4, '4 0', 'p2io'], [D, '0 0', 'p2io']], ONCE)] },
    props: between(page, D, 0.2, D - 0.2) + drop(100, 0) + drop(-8, 6, 0.9),
  })
}

// ---- Your messages, more of Claude's work, and the week: laughing, fire, brb, a pasted wall of text, building,
// security checks, stashing, branches, a finished to-do list, Monday mornings and weekends ----

// Frames that wiggle between two values every `step` seconds from `from` to `to`, resting at `rest` either side
const wiggle = (D, from, to, step, a, b, rest) => {
  const frames = [[0, rest], [from, rest]]
  for (let t = from + step, i = 0; t < to; t += step, i++) frames.push([n(t), i % 2 ? b : a, 'sio'])
  return [...frames, [to + 0.15, rest, 'sio'], [D, rest]]
}

// "lol" or "haha": he laughs so hard he tips over onto his side, kicking his legs, then rocks back up
function laugh() {
  const D = EVENT_SECONDS.laugh
  const tip = anim('rotate', D, [[0, '0 96 86'], [0.8, '0 96 86'], [1.1, '90 96 86', 'p2in'], [1.2, '82 96 86', 'p2out'], [1.3, '90 96 86', 'p2in'], [2.8, '90 96 86'], [3.2, '0 96 86', 'p2io'], [D, '0 96 86']], ONCE)
  const shake = anim('translate', 0.16, [[0, '0 0'], [0.08, '0 -2', 'sio'], [0.16, '0 0', 'sio']])
  const has = [[30, -20, 0.2], [70, -30, 0.55], [150, -10, 1.4], [170, 20, 1.9], [140, 30, 2.4]].map(([x, y, t]) =>
    wrap(word('HA', 0, 0, 3, '#FFE9A8'), `translate(${x} ${y})`, anim('translate', D, [[0, '0 0'], [t, '0 0'], [t + 0.7, '0 -10', 'sout'], [D, '0 -10']], ONCE), anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.05, '1', 'lin'], [t + 0.5, '1'], [t + 0.7, '0', 'lin'], [D, '0']], ONCE))).join('')
  const body = figure({
    ownProps: true,
    legs: { perLeg: (i) => [anim('rotate', D, wiggle(D, 1.3, 2.7, 0.15, `${i % 2 ? -16 : 16}`, `${i % 2 ? 16 : -16}`, '0'), ONCE)] },
    upper: [shake],
    eyes: { blink: false, scaleAnims: [anim('scale', D, [[0, '1 1'], [0.2, '1 .15', 'p2io'], [D - 0.3, '1 .15'], [D, '1 1', 'p2io']], ONCE)] },
    props: drop(0, 6, 0.4) + drop(100, 6, 0.6),
  })
  return wrap(body, '', tip) + has
}

// 🔥 in your message: his feet catch fire and he hops about, then the flames go out in a puff of smoke
function onfire() {
  const D = EVENT_SECONDS.onfire
  const OUT = D - 0.7
  const flame = (x, begin) => wrap(wrap(poly('-9,0 -7,-14 -2,-8 0,-24 3,-10 7,-16 9,0', '#F28C28') + poly('-5,0 -2,-10 1,-6 5,0', '#FFD34D'), '',
    anim('scale', 0.24, [[0, '1 1'], [0.12, '1.15 .8', 'sio'], [0.24, '1 1', 'sio']], { begin })), `translate(${x} 86)`)
  const flames = between([16.5, 37.5, 69.5, 90.5].map((x, i) => flame(x, i * 0.06)).join(''), D, 0.15, OUT)
  const smoke = [16.5, 37.5, 69.5, 90.5].map((x, i) => wrap(rect(-4, -4, 8, 7, '#A8A49A'), `translate(${x} 80)`,
    anim('translate', D, [[0, '0 0'], [OUT, '0 0'], [D, `${i % 2 ? 3 : -3} -18`, 'p2out']], ONCE), anim('opacity', D, [[0, '0'], [OUT, '0'], [OUT + 0.05, '.8', 'lin'], [D, '0', 'lin']], ONCE))).join('')
  const hops = [[0, '0 0']]
  for (let t = 0.3; t + 0.32 < OUT; t += 0.32) hops.push([n(t), '0 0'], [n(t + 0.14), '0 -12', 'p2out'], [n(t + 0.28), '0 0', 'p2in'])
  const hop = anim('translate', D, [...hops, [D, '0 0']], ONCE)
  return wrap(figure({
    ownProps: true,
    left: { anims: [anim('translate', D, [[0, '0 0'], [0.3, '-2 -18', 'p2out'], [OUT, '-2 -18'], [D, '0 0', 'p2io']], ONCE)] },
    right: { anims: [anim('translate', D, [[0, '0 0'], [0.3, '2 -18', 'p2out'], [OUT, '2 -18'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.2, '1.35 1.35', 'p2out'], [OUT, '1.35 1.35'], [OUT + 0.2, '1 .4', 'p2io'], [D, '1 .4']], ONCE)] },
    props: flames + drop(100, 0, 0.3),
  }), '', hop) + smoke
}

// "brb": he flips up a little BRB sign on a stick and waves it
function brb() {
  const D = EVENT_SECONDS.brb
  // Drawn in his hand's own place: a stick up from his grip and the card on top, flipping round to face you
  const card = rect(-24, -14, 48, 28, '#E5484D') + rect(-22, -12, 44, 24, '#FFFFFF') + word('BRB', -16.5, -7.5, 3, INK)
  const flip = wrap(card, 'translate(96 -14)', anim('scale', D, [[0, '0 1'], [0.35, '0 1'], [0.65, '1 1', 'back'], [D, '1 1']], ONCE))
  const sign = rect(94.5, 0, 3, 26, WOOD) + flip
  const waggle = anim('rotate', D, [[0, '0 96 30'], [0.7, '0 96 30'], [1.1, '-8 96 30', 'sio'], [1.5, '6 96 30', 'sio'], [1.9, '-5 96 30', 'sio'], [2.3, '0 96 30', 'sio'], [D, '0 96 30']], ONCE)
  return figure({
    ownProps: true,
    right: { hold: true, carry: wrap(sign, '', waggle), anims: [holdAt(D, 14, -8)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.7, '1 1'], [0.85, '1 .35', 'p2io'], [D - 0.3, '1 .35'], [D, '1 1', 'p2io']], ONCE)] },
  })
}

// A very long message: a tall stack of paper drops into his arms and he wobbles under it, peeking round its sides
function paperstack() {
  const D = EVENT_SECONDS.paperstack
  const LAND = 0.55
  const sheets = Array.from({ length: 10 }, (_, i) => {
    const x = 35 + (i % 3 === 1 ? 2 : i % 3 === 2 ? -1.5 : 0)
    return rect(x, 38 - i * 7, 38, 6, CREAM) + rect(x, 43 - i * 7, 38, 1, PAPER_SHADE) + rect(x + 4, 40 - i * 7, 20, 1, '#C9C2B0')
  }).join('')
  const fall = anim('translate', D, [[0, '0 -150'], [LAND, '0 0', 'p2in'], [LAND + 0.1, '0 4', 'p2out'], [LAND + 0.22, '0 0', 'p2io'], [D - 0.35, '0 0'], [D, '0 -150', 'p2in']], ONCE)
  const sway = anim('rotate', D, [[0, '0 53 86'], [LAND + 0.2, '0 53 86'], [1.0, '-5 53 86', 'sio'], [1.6, '5 53 86', 'sio'], [2.2, '-4 53 86', 'sio'], [2.8, '4 53 86', 'sio'], [D - 0.35, '0 53 86', 'sio'], [D, '0 53 86']], ONCE)
  return wrap(figure({
    ownProps: true,
    heldRaw: wrap(sheets, '', fall),
    left: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [LAND, '0 0'], [LAND + 0.1, '14 6', 'p2out'], [D - 0.35, '14 6'], [D, '0 0', 'p2io']], ONCE)] },
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [LAND, '0 0'], [LAND + 0.1, '-14 6', 'p2out'], [D - 0.35, '-14 6'], [D, '0 0', 'p2io']], ONCE)] },
    upper: [anim('translate', D, [[0, '0 0'], [LAND, '0 0'], [LAND + 0.1, '0 6', 'p2out'], [LAND + 0.3, '0 3', 'p2io'], [D - 0.35, '0 3'], [D, '0 0', 'p2io']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 -6'], [LAND, '0 0', 'p2in'], [1.2, '-3 0', 'sio'], [2.0, '3 0', 'sio'], [D, '0 0', 'sio']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [LAND, '1 1'], [LAND + 0.1, '1.3 1.3', 'p2out'], [D, '1.3 1.3']], ONCE)],
    },
    props: drop(100, 2, 1.0) + drop(-8, 8, 1.6),
  }), '', sway)
}

// Building the app: he hammers bricks one by one into a little wall beside him
function bricks() {
  const D = EVENT_SECONDS.bricks
  const BRICK = '#B5523B'
  // [x, y, width] of each brick, bottom row first, half bricks at the ends of the middle row
  const WALL = [[112, 77, 16], [129, 77, 16], [146, 77, 16], [112, 68, 8], [121, 68, 16], [138, 68, 16], [155, 68, 7], [112, 59, 16], [129, 59, 16], [146, 59, 16]]
  const T0 = 0.45
  const STEP = 0.29
  const at = (i) => n(T0 + i * STEP)
  const wall = WALL.map(([x, y, w], i) => wrap(rect(x, y, w, 8, BRICK) + rect(x, y, w, 1.6, '#D07560'), '',
    anim('translate', D, [[0, '0 -14'], [at(i) - 0.08, '0 -14'], [at(i), '0 0', 'p2in'], [D, '0 0']], ONCE),
    anim('opacity', D, [[0, '0'], [at(i) - 0.08, '0'], [at(i) - 0.06, '1', 'lin'], [D, '1']], ONCE))).join('')
  // A hammer held sideways: the handle runs right from his grip to a head that strikes down
  const hammer = rect(100, 29, 21, 4, WOOD) + rect(116, 21, 10, 17, STEEL) + rect(116, 21, 10, 2.5, '#C4CAD0')
  const strike = anim('rotate', D, [[0, '-30 100 31'], ...WALL.flatMap((_, i) => [[at(i) - 0.12, '-30 100 31', 'p2out'], [at(i), '6 100 31', 'p2in']]), [D, '-30 100 31', 'p2out']], ONCE)
  // His hand moves so the hammer head (121, 38) comes down on each brick's top
  const reach = anim('translate', D, [[0, '0 0'], ...WALL.flatMap(([x, y, w], i) => [[at(i) - 0.15, `${n(x + w / 2 - 121)} ${y - 38}`, 'p2io'], [at(i) + 0.1, `${n(x + w / 2 - 121)} ${y - 38}`]]), [D, '0 0', 'p2io']], ONCE)
  const dust = WALL.map(([x, y, w], i) => wrap(rect(-2, -2, 4, 3, '#C9B79C'), `translate(${x + w / 2} ${y})`,
    anim('translate', D, [[0, '0 0'], [at(i), '0 0'], [at(i) + 0.3, `${i % 2 ? 6 : -6} -6`, 'p2out'], [D, `${i % 2 ? 6 : -6} -6`]], ONCE),
    anim('opacity', D, [[0, '0'], [at(i), '0'], [at(i) + 0.02, '.9', 'lin'], [at(i) + 0.3, '0', 'lin'], [D, '0']], ONCE))).join('')
  return figure({
    ownProps: true,
    heldRaw: wall + dust,
    right: { hold: true, over: true, carry: wrap(hammer, '', strike), anims: [reach] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '6 4', 'p2io'], [D - 0.3, '6 4'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// A security check: in a deerstalker hat he sweeps a flashlight beam around and finds a bug hiding on the floor
function detective() {
  const D = EVENT_SECONDS.detective
  const FOUND = 2.3
  const HAT = '#8B6A4E'
  const CHECK = '#6B4F3A'
  const hat = rect(28, -16, 52, 16, HAT) + rect(20, -4, 68, 5, HAT) + [0, 1, 2, 3, 4, 5].map((i) => rect(31 + i * 8, -13 + (i % 2) * 5, 4, 4, CHECK)).join('') +
    rect(50, -20, 8, 4, CHECK) + rect(26, 0, 7, 9, HAT) + rect(75, 0, 7, 9, HAT)
  const light = '#FFE9A8'
  const torch = rect(96, 26, 17, 8, '#3A3D42') + rect(113, 24.5, 3, 11, light) + `<polygon points="116,25 172,4 172,62 116,35" fill="${light}" fill-opacity=".5"/>`
  const scan = anim('rotate', D, [[0, '-18 100 30'], [0.5, '-18 100 30'], [1.1, '8 100 30', 'sio'], [1.7, '-14 100 30', 'sio'], [FOUND, '27 100 30', 'sio'], [D, '27 100 30']], ONCE)
  const bug = rect(-6, -4, 12, 7, '#5E8C6A') + rect(-1, -4, 2, 7, '#3E6B4A') + rect(5, -3, 3, 4, '#2F2F2A') + rect(-8, 1, 2, 1, INK) + rect(-8, -3, 2, 1, INK) + rect(6, 2, 2, 1, INK)
  const caught = wrap(bug, 'translate(150 82)', anim('opacity', D, [[0, '.25'], [FOUND, '.25'], [FOUND + 0.1, '1', 'lin'], [D, '1']], ONCE)) +
    between(pixels(PIXEL['!'], 149, 58, 3, '#E5484D'), D, FOUND + 0.15, D - 0.1)
  return figure({
    ownProps: true,
    worn: hat,
    heldRaw: caught,
    right: { hold: true, carry: wrap(torch, '', scan), anims: [holdAt(D, 2, -2)] },
    eyes: {
      lid: 0.55,
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '5 -3', 'p2io'], [1.1, '6 2', 'sio'], [1.7, '5 -2', 'sio'], [FOUND, '6 5', 'sio'], [D, '6 5']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [FOUND, '1 1'], [FOUND + 0.12, '1.3 1.9', 'p2out'], [D, '1.3 1.9']], ONCE)],
    },
  })
}

// git stash: he sweeps a few bits under a rug, the rug bulging more each time, then looks away all innocent
function rug() {
  const D = EVENT_SECONDS.rug
  const RUG = '#B5523B'
  const SWEEPS = [0.5, 1.3, 2.1]
  const mat = rect(110, 83, 50, 3, RUG) + rect(110, 84, 50, 1, '#E7B04A') + [0, 1, 2].map((i) => rect(107, 83 + i, 3, 0.6, '#E7C46A') + rect(160, 83 + i, 3, 0.6, '#E7C46A')).join('')
  const bulge = wrap(dome(0, 0, 10, RUG) + rect(-6, -6, 12, 1, '#E7B04A'), 'translate(135 83)', anim('scale', D, [[0, '1 0'], ...SWEEPS.flatMap((t, i) => [[t + 0.4, `1 ${n(i / 3)}`], [t + 0.55, `1 ${n((i + 1) / 3)}`, 'back']]), [D, '1 1']], ONCE))
  const STUFF = ['#F3EFE6', '#6EA8FF', '#E7B04A']
  const bits = SWEEPS.map((t, i) => wrap(rect(-4, -5, 8, 5, STUFF[i]) + rect(-4, -5, 8, 1, '#00000022'), '',
    anim('translate', D, [[0, `${96 - i * 6} 86`], [t, `${96 - i * 6} 86`], [t + 0.45, '128 86', 'p2in'], [D, '128 86']], ONCE),
    anim('opacity', D, [[0, '1'], [t + 0.4, '1'], [t + 0.5, '0', 'lin'], [D, '0']], ONCE))).join('')
  const broom = rect(86, 20, 4, 60, WOOD) + rect(74, 78, 28, 8, '#E7C46A') + [0, 1, 2, 3, 4].map((i) => rect(76 + i * 5, 84, 2, 3, '#C9A13A')).join('')
  const swish = anim('rotate', D, [[0, '0 88 22'], ...SWEEPS.flatMap((t) => [[t - 0.1, '-16 88 22', 'sio'], [t + 0.4, '16 88 22', 'sio']]), [2.8, '0 88 22', 'sio'], [D, '0 88 22']], ONCE)
  const whistle = between(wrap(pixels(NOTE, 0, 0, 2.2, '#AFC0FF'), 'translate(8 -18)', anim('translate', 0.8, [[0, '0 0'], [0.4, '2 -4', 'sio'], [0.8, '0 0', 'sio']])), D, 2.9, D - 0.1)
  return figure({
    ownProps: true,
    heldRaw: mat + bulge + bits + between(wrap(broom, '', swish), D, 0.15, 2.85),
    left: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.25, '78 4', 'p2out'], [2.85, '78 4'], [3.1, '0 0', 'p2io'], [D, '0 0']], ONCE), swish] },
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.25, '-6 20', 'p2out'], [2.85, '-6 20'], [3.1, '0 0', 'p2io'], [D, '0 0']], ONCE), swish] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '4 6', 'p2io'], [2.85, '4 6'], [3.1, '-5 -6', 'p2io'], [D, '-5 -6']], ONCE)] },
    props: whistle,
  })
}

// Switching git branches: he hops over to a signpost, looks from one arm to the other, scratches his head and picks one
function signpost() {
  const D = EVENT_SECONDS.signpost
  const PICK = 2.5
  const post = rect(139, 8, 5, 78, WOOD) + rect(135, 83, 13, 3, WOOD)
  const upper = poly('128,12 160,12 168,19 160,26 128,26', '#5E8C6A') + word('MAIN', 133, 15.5, 1.4, '#FFFFFF')
  const lower = poly('122,34 156,34 156,47 122,47 114,40.5', '#3D7BF0') + word('DEV', 128, 37.5, 1.6, '#FFFFFF')
  const glow = wrap(poly('122,34 156,34 156,47 122,47 114,40.5', '#FFFFFF'), '', anim('opacity', D, [[0, '0'], [PICK, '0'], [PICK + 0.1, '.45', 'lin'], [PICK + 0.3, '0', 'lin'], [PICK + 0.4, '.45', 'lin'], [PICK + 0.6, '0', 'lin'], [D, '0']], ONCE))
  const walk = anim('translate', D, [[0, '-32 0'], [0.22, '-24 -4', 'p2out'], [0.44, '-16 0', 'p2in'], [0.66, '-8 -4', 'p2out'], [0.88, '0 0', 'p2in'], [D, '0 0']], ONCE)
  return post + upper + lower + glow + wrap(figure({
    ownProps: true,
    left: { anims: [anim('translate', D, [[0, '0 0'], [1.2, '0 0'], [1.45, '22 -26', 'p2out'], [1.6, '24 -28', 'sio'], [1.75, '22 -26', 'sio'], [1.9, '24 -28', 'sio'], [2.2, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [PICK - 0.2, '0 0'], [PICK, '10 -2', 'p2out'], [D - 0.3, '10 -2'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [1.0, '5 -6', 'p2io'], [1.6, '5 -6'], [1.9, '3 2', 'p2io'], [PICK, '5 2', 'p2io'], [D, '5 2']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [PICK, '1 1'], [PICK + 0.15, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  }), '', walk)
}

// Every to-do item ticked: he slams a rubber stamp down on his clipboard and a big green tick fills it
function checkall() {
  const D = EVENT_SECONDS.checkall
  const SLAM = 1.4
  const rows = [0, 1, 2].map((i) => rect(36, 37 + i * 8, 6, 6, INK) + rect(37.5, 38.5 + i * 8, 3, 3, CREAM) + pixels(PIXEL.check, 33.5, 34.5 + i * 8, 1.2, '#5E8C6A') + rect(45, 39 + i * 8, 22, 2.5, PAPER_SHADE)).join('')
  const board = rect(30, 28, 46, 40, WOOD) + rect(33, 32, 40, 34, CREAM) + rect(46, 26, 14, 6, STEEL) + rect(49, 24, 8, 3, STEEL) + rows
  const tick = wrap(pixels(PIXEL.check, -16, -9.6, 3.2, GREEN), 'translate(53 49)', anim('scale', D, [[0, '0 0'], [SLAM, '0 0'], [SLAM + 0.12, '1.25 1.25', 'p2out'], [SLAM + 0.3, '1 1', 'p2io'], [D, '1 1']], ONCE))
  const stars = [[22, 22], [80, 20], [84, 54]].map(([x, y], i) => between(pixels(STAR, x, y, 1.8, '#FFE9A8'), D, SLAM + 0.1 + i * 0.1, D - 0.2)).join('')
  // The stamp in his hand's own place: a knob, a handle and a red rubber base under his grip
  const stamp = rect(92, 8, 12, 5, '#7A4A2A') + rect(94, 13, 8, 9, '#5E3A22') + rect(90, 40, 16, 6, '#E5484D') + rect(91, 44, 14, 2, '#B83A3E')
  return figure({
    ownProps: true,
    heldRaw: between(board + tick, D, 0.2, D - 0.2) + stars,
    left: { hold: true, over: true, anims: [holdAt(D, 14, 30, 0.2, D - 0.2)] },
    right: { hold: true, over: true, carry: stamp, anims: [anim('translate', D, [[0, '0 0'], [0.5, '-45 -14', 'p2out'], [SLAM - 0.15, '-45 -18', 'sio'], [SLAM, '-45 3', 'p2in'], [SLAM + 0.3, '-45 3'], [SLAM + 0.55, '-45 -16', 'p2out'], [D - 0.3, '-45 -16'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '0 6', 'p2io'], [D - 0.3, '0 6'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [SLAM + 0.3, '1 1'], [SLAM + 0.45, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  })
}

// Monday morning: he drags himself in from the left, droopy-eyed, a coffee in each hand, under a MON page, and sighs
function monday() {
  const D = EVENT_SECONDS.monday
  const ARRIVE = 2.4
  const steps = [[0, '-70 0']]
  for (let i = 1; i <= 6; i++) steps.push([n((ARRIVE * i) / 6 - 0.2), `${n(-70 + (70 * i) / 6 - 6)} -2`, 'sio'], [n((ARRIVE * i) / 6), `${n(-70 + (70 * i) / 6)} 0`, 'sio'])
  const drag = anim('translate', D, [...steps, [D, '0 0']], ONCE)
  const top = Math.round(Math.min(-34, hatTop() - 30))
  const page = rect(40, top, 28, 24, '#FFFFFF') + rect(40, top, 28, 6, '#5B63C8') + word('MON', 41.5, top + 9.5, 2, INK)
  const sigh = between(rect(98, 32, 8, 5, '#E8E4DA', 'fill-opacity=".8"') + rect(104, 29, 6, 4, '#E8E4DA', 'fill-opacity=".6"'), D, ARRIVE + 0.5, D - 0.2)
  return wrap(figure({
    ownProps: true,
    upperAt: 'translate(0 4)',
    left: { at: 'translate(0 6)', carry: coffeeMug() },
    right: { at: 'translate(0 6)', carry: wrap(coffeeMug(), 'translate(107 0) scale(-1 1)') },
    eyes: { lid: 0.3, blinkCycle: 2.2, blinkAt: 1.4 },
    props: between(page, D, 0.3, D - 0.2) + sigh,
  }), '', drag)
}

// Coding on the weekend: he lounges in a striped beach chair in sunglasses, typing on a laptop on his lap, a cold drink beside him
function weekend() {
  const D = EVENT_SECONDS.weekend
  const STRIPES = ['#3D7BF0', '#FFFFFF']
  const back = Array.from({ length: 10 }, (_, i) => rect(2 + i * 10.4, -16, 10.4, 76, STRIPES[i % 2])).join('') + rect(0, -18, 107, 3, WOOD)
  // The seat sits just under his body, so he rests on it; its frame runs down to the floor
  const seat = Array.from({ length: 10 }, (_, i) => rect(2 + i * 10.4, 77, 10.4, 5, STRIPES[i % 2])).join('') + rect(0, 76, 107, 2, WOOD) +
    poly('4,82 8,82 22,86 18,86', WOOD) + poly('103,82 99,82 85,86 89,86', WOOD)
  const shades = rect(17, 10, 19, 11, '#1F1E1D') + rect(71, 10, 19, 11, '#1F1E1D') + rect(36, 12, 35, 2.5, '#1F1E1D') + rect(20, 12, 5, 2, '#FFFFFF', 'fill-opacity=".55"') + rect(74, 12, 5, 2, '#FFFFFF', 'fill-opacity=".55"')
  const laptop = rect(30, 23, 47, 27, '#C9CDD2') + rect(30, 23, 47, 2, '#E4E6E9') + rect(49.5, 32, 8, 8, SPARK) + rect(26, 50, 55, 5, '#9AA0A6')
  const drink = rect(116, 66, 10, 20, '#BFE3FF', 'fill-opacity=".85"') + rect(116, 72, 10, 14, '#F2C14E') + rect(122, 58, 2, 10, '#E5484D') + rect(113, 64, 6, 6, '#7CC47F')
  const type = (begin) => anim('translate', 0.3, [[0, '0 0'], [0.15, '0 -3', 'sio'], [0.3, '0 0', 'sio']], { begin })
  return figure({
    ownProps: true,
    legs: { k: 0.5, hipDy: 13 },
    upperAt: 'translate(0 13)',
    behind: back,
    face: shades,
    heldRaw: laptop,
    // Typing on the keyboard, behind the screen (its back faces you), so the laptop hides his hands
    left: { hold: true, anims: [holdAt(D, 22, 10, 0.3, D - 0.3), type(0)] },
    right: { hold: true, anims: [holdAt(D, -22, 10, 0.3, D - 0.3), type(0.15)] },
    upper: [anim('translate', D, [[0, '0 0'], [D / 2, '0 1.5', 'sio'], [D, '0 0', 'sio']], ONCE)],
    props: seat + drink,
  })
}

// ---- More of you and of Claude: wondering, quick okays, slip-ups, giant files, deleting, renaming, downloads,
// undoing, long tool runs, a busy day, coming back, and the session's birthday ----

// "why" or "how does": he scratches his head under a question mark, which turns into a lightbulb
function wonder() {
  const D = EVENT_SECONDS.wonder
  const IDEA = 1.8
  const lift = Math.round(Math.min(0, hatTop()))
  const question = wrap(pixels(PIXEL['?'], 0, 0, 3, '#FFFFFF'), `translate(66 ${lift - 36})`, anim('opacity', D, [[0, '0'], [0.3, '0'], [0.4, '1', 'lin'], [IDEA, '1'], [IDEA + 0.05, '0', 'lin'], [D, '0']], ONCE))
  const rays = [-60, -30, 0, 30, 60].map((deg) => wrap(rect(-1, -17, 2, 4, '#FFE066'), `rotate(${deg})`)).join('')
  const bulb = rays + disc(0, 0, 9, '#FFE066') + rect(-4, -5, 3, 3, '#FFFFFF', 'fill-opacity=".8"') + rect(-5, 8, 10, 3, '#9AA0A6') + rect(-4, 11, 8, 2.5, '#7E848B')
  const idea = wrap(bulb, `translate(73 ${lift - 26})`, anim('scale', D, [[0, '0 0'], [IDEA, '0 0'], [IDEA + 0.25, '1.2 1.2', 'p2out'], [IDEA + 0.4, '1 1', 'p2io'], [D, '1 1']], ONCE))
  return figure({
    ownProps: true,
    right: { anims: [anim('translate', D, [[0, '0 0'], [0.35, `-20 ${lift - 28}`, 'p2out'], [IDEA - 0.1, `-20 ${lift - 28}`], [IDEA + 0.2, `2 ${lift - 26}`, 'p2out'], [D - 0.3, `2 ${lift - 26}`], [D, '0 0', 'p2io']], ONCE),
      anim('translate', D, wiggle(D, 0.4, IDEA - 0.15, 0.1, '-3 1', '1 -1', '0 0'), ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '2 -5', 'p2io'], [D - 0.3, '3 -6'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .45', 'p2io'], [IDEA, '1 .45'], [IDEA + 0.15, '1.3 1.3', 'p2out'], [D, '1.3 1.3']], ONCE)],
    },
    props: question + idea,
  })
}

// A quick "ok", "k" or "y": a small thumbs-up and a nod
function thumbsup() {
  const D = EVENT_SECONDS.thumbsup
  const EDGE = `stroke="${DARK}" stroke-width="1.6"`
  const thumb = rect(87, 10, 8, 18, SKIN, EDGE) + rect(85, 26, 22, 18, SKIN, EDGE) + rect(87, 31, 18, 1.4, DARK) + rect(87, 36, 18, 1.4, DARK) + (activeOutfit?.sleeve?.('right') ?? '')
  return figure({
    ownProps: true,
    right: { shape: thumb, anims: [holdAt(D, 10, -10, 0.2, D - 0.3)] },
    upper: [anim('translate', D, [[0, '0 0'], [0.3, '0 0'], [0.45, '0 3', 'sio'], [0.6, '0 0', 'sio'], [D, '0 0']], ONCE)],
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.25, '1 .35', 'p2io'], [D - 0.3, '1 .35'], [D, '1 1', 'p2io']], ONCE)] },
    props: between(pixels(STAR, 104, -6, 1.6, '#FFE9A8'), D, 0.3, D - 0.3),
  })
}

// "oops" or "my bad" from you: he gives a slow, understanding nod, twice, eyes soft
function comfort() {
  const D = EVENT_SECONDS.comfort
  const NODS = [0.5, 1.3]
  const nod = anim('translate', D, [[0, '0 0'], ...NODS.flatMap((t) => [[t, '0 0'], [t + 0.25, '0 5', 'sio'], [t + 0.55, '0 0', 'sio']]), [D, '0 0']], ONCE)
  return figure({
    ownProps: true,
    upper: [nod],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], ...NODS.flatMap((t) => [[t, '0 0'], [t + 0.25, '0 3', 'sio'], [t + 0.55, '0 0', 'sio']]), [D, '0 0']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .4', 'p2io'], [D - 0.3, '1 .4'], [D, '1 1', 'p2io']], ONCE)],
    },
  })
}

// Reading a giant file: he heaves a huge book off the floor, shaking, holds it up for a moment, and drops it with a thud
function heavybook() {
  const D = EVENT_SECONDS.heavybook
  const DROP = 3.0
  const book = rect(-30, -30, 60, 30, '#B5523B') + rect(-26, -27, 54, 25, CREAM) + [0, 1, 2, 3, 4].map((i) => rect(-26, -23 + i * 5, 54, 0.8, PAPER_SHADE)).join('') + rect(-30, -30, 7, 30, '#8E3B2A') + rect(-30, -2, 60, 2, '#8E3B2A')
  const LIFT = [[0, 0], [0.6, 0], [1.1, -5, 'p2out'], [1.4, -2, 'p2in'], [2.0, -28, 'p2out'], [DROP - 0.15, -26], [DROP, 0, 'p2in'], [DROP + 0.1, -3, 'p2out'], [DROP + 0.2, 0, 'p2in'], [D, 0]]
  const lifted = (dx, dy) => anim('translate', D, LIFT.map(([t, y, e]) => [t, `${dx} ${dy + y}`, e]), ONCE)
  const shake = anim('translate', D, wiggle(D, 0.6, DROP - 0.2, 0.08, '-1 0', '1 0', '0 0'), ONCE)
  const dust = [-1, 1].map((side) => wrap(rect(-6, -5, 12, 8, '#A8A49A'), `translate(${53 + side * 34} 82)`,
    anim('translate', D, [[0, '0 0'], [DROP, '0 0'], [DROP + 0.5, `${side * 14} -6`, 'p2out'], [D, `${side * 14} -6`]], ONCE),
    anim('opacity', D, [[0, '0'], [DROP, '0'], [DROP + 0.05, '.8', 'lin'], [DROP + 0.5, '0', 'lin'], [D, '0']], ONCE))).join('')
  return figure({
    ownProps: true,
    heldRaw: wrap(wrap(book, 'translate(53 86)', lifted(0, 0)), '', shake),
    left: { hold: true, over: true, anims: [lifted(8, 40), shake] },
    right: { hold: true, over: true, anims: [lifted(-8, 40), shake] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.6, '1 1'], [0.8, '1 .2', 'p2io'], [DROP, '1 .2'], [DROP + 0.1, '1.3 1.3', 'p2out'], [D, '1.3 1.3']], ONCE)] },
    props: dust + drop(100, 2, 0.9) + drop(-8, 6, 1.7),
  })
}

// Deleting files: he feeds three sheets of paper into a little shredder, and the strips pile up in its bin
function shredder() {
  const D = EVENT_SECONDS.shredder
  const FEEDS = [0.5, 1.4, 2.3]
  const sheet = rect(-9, -12, 18, 24, CREAM) + [0, 1, 2, 3].map((i) => rect(-6, -8 + i * 5, i === 3 ? 7 : 12, 1.4, '#C9C2B0')).join('')
  const sheets = FEEDS.map((t) => wrap(sheet, '', anim('translate', D, [[0, '132 30'], [t + 0.1, '132 30'], [t + 0.3, '132 40', 'p2out'], [t + 0.8, '132 66', 'lin'], [D, '132 66']], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.05, '1', 'lin'], [t + 0.8, '1'], [t + 0.82, '0', 'lin'], [D, '0']], ONCE))).join('')
  const body = rect(112, 54, 40, 32, '#4A4D52') + rect(110, 50, 44, 6, '#3A3D42') + rect(116, 52, 32, 2, '#111114') + rect(116, 62, 32, 20, '#232428') + rect(146, 57, 3, 3, '#E5484D')
  const strips = FEEDS.flatMap((t, f) => [0, 1, 2, 3, 4].map((i) => wrap(rect(118 + i * 6 + f, 82 - 4 - f * 4 - (i % 2) * 2, 2, 4 + (i % 3), CREAM), '',
    anim('opacity', D, [[0, '0'], [t + 0.6, '0'], [t + 0.65, '1', 'lin'], [D, '1']], ONCE)))).join('')
  const hand = FEEDS.flatMap((t) => [[t, '35 -16', 'p2io'], [t + 0.3, '35 -6', 'p2out'], [t + 0.5, '35 -8']])
  return figure({
    ownProps: true,
    heldRaw: sheets + body + strips,
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], ...hand, [D - 0.3, '35 -8'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '6 4', 'p2io'], [D - 0.3, '6 4'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// Renaming or moving files: he peels the old label off a box and slaps a new yellow one on
function relabel() {
  const D = EVENT_SECONDS.relabel
  const PEEL = 0.9
  const SLAP = 2.0
  const box = rect(112, 46, 40, 40, '#C8935A') + rect(112, 46, 40, 4, '#A8743F') + rect(130, 46, 4, 40, '#B07F48', 'fill-opacity=".5"')
  const lines = (fill) => [0, 1, 2].map((i) => rect(4, 3 + i * 4, i === 2 ? 9 : 16, 1.6, fill)).join('')
  const old = wrap(wrap(rect(0, 0, 24, 14, '#FFFFFF') + lines('#9AA0A6'), '', anim('rotate', D, [[0, '0 0 0'], [PEEL - 0.3, '0 0 0'], [PEEL, '-35 0 0', 'p2out'], [D, '-35 0 0']], ONCE)), 'translate(120 58)',
    anim('translate', D, [[0, '0 0'], [PEEL, '0 0'], [PEEL + 0.6, '-10 40', 'p2in'], [D, '-10 40']], ONCE), anim('opacity', D, [[0, '1'], [PEEL + 0.4, '1'], [PEEL + 0.6, '0', 'lin'], [D, '0']], ONCE))
  const fresh = wrap(wrap(rect(-12, -7, 24, 14, '#F2C14E') + wrap(lines(INK), 'translate(-12 -7)'), '', anim('scale', D, [[0, '1.4 1.4'], [SLAP - 0.05, '1.4 1.4'], [SLAP, '1 1', 'p2in'], [SLAP + 0.08, '1.06 1.06', 'p2out'], [SLAP + 0.16, '1 1', 'p2in'], [D, '1 1']], ONCE)), 'translate(132 65)',
    anim('opacity', D, [[0, '0'], [SLAP - 0.05, '0'], [SLAP, '1', 'lin'], [D, '1']], ONCE))
  return figure({
    ownProps: true,
    heldRaw: box + old + fresh,
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [PEEL - 0.4, '30 34', 'p2out'], [PEEL, '26 30', 'p2out'], [PEEL + 0.4, '14 36', 'p2io'], [SLAP - 0.25, '36 26', 'p2io'], [SLAP, '36 32', 'p2in'], [SLAP + 0.3, '36 32'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '6 5', 'p2io'], [D - 0.3, '6 5'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [SLAP + 0.2, '1 1'], [SLAP + 0.35, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  })
}

// A download: a blue package with a down arrow floats down on a little parachute and he catches it
function download() {
  const D = EVENT_SECONDS.download
  const CATCH = 1.7
  const box = rect(-12, -18, 24, 18, '#5E8BFF') + rect(-12, -18, 24, 3, '#8DB3FA') + rect(-2, -14, 4, 7, '#FFFFFF') + poly('-6,-8 6,-8 0,-3', '#FFFFFF')
  const chute = wrap(poly('-13,-32 -12,-32 -7,-18 -8,-18', INK) + poly('13,-32 12,-32 7,-18 8,-18', INK) + dome(0, -32, 14, '#FFFFFF') + rect(-4, -42, 8, 10, '#5E8BFF'), '',
    anim('scale', D, [[0, '1 1'], [CATCH, '1 1'], [CATCH + 0.3, '1.3 0', 'p2in'], [D, '1.3 0']], ONCE))
  const fall = anim('translate', D, [[0, '53 -60'], [CATCH, '53 34', 'p2out'], [CATCH + 0.1, '53 38', 'p2out'], [CATCH + 0.2, '53 34', 'p2in'], [D, '53 34']], ONCE)
  const sway = anim('rotate', D, [[0, '8 0 -32'], [0.6, '-8 0 -32', 'sio'], [1.2, '6 0 -32', 'sio'], [CATCH, '0 0 -32', 'sio'], [D, '0 0 -32']], ONCE)
  const reach = (dx) => anim('translate', D, [[0, '0 0'], [CATCH - 0.4, `${dx} -6`, 'p2out'], [CATCH, `${dx} -6`], [CATCH + 0.1, `${dx} -2`, 'p2out'], [CATCH + 0.2, `${dx} -6`, 'p2in'], [D - 0.3, `${dx} -6`], [D, '0 0', 'p2io']], ONCE)
  return figure({
    ownProps: true,
    heldRaw: wrap(wrap(chute + box, '', sway), '', fall),
    left: { hold: true, over: true, anims: [reach(22)] },
    right: { hold: true, over: true, anims: [reach(-22)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 -7'], [CATCH, '0 3', 'sio'], [D, '0 3']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [CATCH + 0.2, '1 1'], [CATCH + 0.35, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
  })
}

// Undoing changes: he holds up a cassette tape and its reels spin backwards, under a rewind sign
function rewind() {
  const D = EVENT_SECONDS.rewind
  const reel = (x) => wrap(disc(0, 0, 5, '#FFFFFF') + rect(-0.8, -5, 1.6, 10, '#2F2F2A') + rect(-5, -0.8, 10, 1.6, '#2F2F2A') + disc(0, 0, 1.5, '#2F2F2A'), `translate(${x} 5)`, anim('rotate', 0.35, [[0, '0'], [0.35, '-360']]))
  const tape = rect(-25, -16, 50, 32, '#2F2F2A') + rect(-21, -13, 42, 9, '#F2C14E') + rect(-17, -10, 20, 1.6, INK) + rect(-16, -1, 32, 12, '#5E6268') + rect(-9, 8, 18, 2, '#6B4F3A') + reel(-9) + reel(9) + rect(-25, 13, 50, 3, '#1F1E1D')
  const cassette = wrap(tape, 'translate(53 46)', anim('scale', D, [[0, '0 0'], [0.2, '0 0'], [0.5, '1 1', 'back'], [D - 0.3, '1 1'], [D, '0 0', 'p2in']], ONCE))
  const lift = Math.round(Math.min(-14, hatTop() - 14))
  const sign = between(poly(`44,${lift} 54,${lift - 6} 54,${lift + 6}`, '#FFFFFF') + poly(`54,${lift} 64,${lift - 6} 64,${lift + 6}`, '#FFFFFF'), D, 0.5, D - 0.3)
  const blink = anim('opacity', 0.5, [[0, '1'], [0.25, '.35'], [0.5, '1']])
  return figure({
    ownProps: true,
    heldRaw: cassette,
    left: { hold: true, over: true, anims: [holdAt(D, 20, 6, 0.4, D - 0.3)] },
    right: { hold: true, over: true, anims: [holdAt(D, -20, 6, 0.4, D - 0.3)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.5, '0 5', 'p2io'], [D - 0.3, '0 5'], [D, '0 0', 'p2io']], ONCE)] },
    props: wrap(sign, '', blink),
  })
}

// A long run of tools without a break: he wipes his brow, then tips a water bottle over his head with relief
function drench() {
  const D = EVENT_SECONDS.drench
  const POUR = 1.8
  const lift = Math.round(Math.min(0, hatTop()))
  const wipe = [[0, '0 0'], [0.3, `-60 ${-12}`, 'p2out'], [0.7, `-10 ${-14}`, 'sio'], [1.1, `-60 ${-12}`, 'sio'], [1.4, '0 0', 'p2io']]
  const bottle = rect(2, -4, 8, 4, '#2E6FC0') + rect(0, 0, 12, 22, '#CDEBFF') + rect(0, 9, 12, 5, '#FFFFFF') + rect(0, 14, 12, 8, '#5AA9E6')
  // Held upside-down-ish above his head: the bottle in his hand's own place, tipped so its mouth points down at him
  const tipped = wrap(bottle, 'translate(100 20) rotate(150)')
  const stream = [0, 1, 2, 3, 4, 5].map((i) => wrap(rect(-1.5, 0, 3, 5, SWEAT), '',
    anim('translate', 0.5, [[0, `${70 - (i % 3) * 8} ${lift - 22}`], [0.5, `${66 - (i % 3) * 8 + (i % 2 ? 10 : -10)} ${lift + 14}`, 'p2in']], { begin: i * 0.09 }),
    anim('opacity', 0.5, [[0, '1'], [0.4, '1'], [0.5, '0', 'lin']], { begin: i * 0.09 }))).join('')
  const splash = [0, 1, 2, 3].map((i) => wrap(rect(-1.5, -1.5, 3, 3, SWEAT), `translate(${[14, 30, 78, 94][i]} ${lift + 2})`, anim('translate', 0.5, [[0, '0 0'], [0.5, `${i < 2 ? -6 : 6} 10`, 'p2out']], { begin: i * 0.12 }))).join('')
  return figure({
    ownProps: true,
    right: { hold: true, carry: between(tipped, D, POUR - 0.2, D - 0.3), anims: [anim('translate', D, [...wipe, [POUR - 0.2, `-14 ${lift - 44}`, 'p2out'], [D - 0.3, `-14 ${lift - 44}`], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 .45'], [POUR, '1 .45'], [POUR + 0.15, '1 .12', 'p2io'], [D - 0.3, '1 .12'], [D, '1 1', 'p2io']], ONCE)] },
    upper: [anim('translate', D, [[0, '0 0'], [POUR + 0.2, '0 0'], [POUR + 0.4, '0 2', 'sio'], [D, '0 0', 'sio']], ONCE)],
    props: drop(100, 4, 0.2) + drop(-6, 6, 0.6) + between(stream + splash, D, POUR, D - 0.4),
  })
}

// The 100th message of the day: a gold medal with "100" on it drops onto a ribbon round his neck and he swells with pride
function medal() {
  const D = EVENT_SECONDS.medal
  const LAND = 0.8
  const ribbon = poly('38,-2 48,-2 56,26 50,28', '#E5484D') + poly('69,-2 59,-2 51,26 57,28', '#3D7BF0')
  const coin = disc(53.5, 34, 11, '#E7B04A') + disc(53.5, 34, 8.5, '#F2C14E') + digitsSvg('100', 46.5, 31.5, 1.6, '#8A5A1E')
  const hang = wrap(ribbon + coin, '', anim('translate', D, [[0, '0 -80'], [LAND, '0 0', 'p2in'], [LAND + 0.1, '0 -4', 'p2out'], [LAND + 0.2, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const swing = wrap(hang, '', anim('rotate', D, [[0, '0 53 0'], [LAND + 0.2, '0 53 0'], [LAND + 0.5, '5 53 0', 'sio'], [LAND + 0.8, '-3 53 0', 'sio'], [LAND + 1.1, '0 53 0', 'sio'], [D, '0 53 0']], ONCE))
  const stars = [[18, -10], [90, -6], [100, 26]].map(([x, y], i) => between(pixels(STAR, x, y, 1.8, '#FFE9A8'), D, LAND + 0.2 + i * 0.15, D - 0.2)).join('')
  return figure({
    ownProps: true,
    heldRaw: swing,
    upper: [anim('scale', D, [[0, '1 1'], [LAND + 0.3, '1 1'], [LAND + 0.6, '1.04 1.04', 'p2out'], [D - 0.3, '1.04 1.04'], [D, '1 1', 'p2io']], ONCE)],
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [LAND + 0.2, '1 1'], [LAND + 0.35, '1 .35', 'p2io'], [D, '1 .35']], ONCE)] },
    props: stars,
  })
}

// Back after an hour away: he springs up twice, waving both arms, with a "YAY!"
function welcomeback() {
  const D = EVENT_SECONDS.welcomeback
  const hops = anim('translate', D, [[0, '0 0'], [0.15, '0 4', 'p2out'], [0.4, '0 -16', 'sout'], [0.65, '0 0', 'p2in'], [0.75, '0 3', 'p2out'], [1.0, '0 -14', 'sout'], [1.25, '0 0', 'p2in'], [D, '0 0']], ONCE)
  // Each hand swings from its own wrist
  const wave = (begin, x) => anim('rotate', 0.4, [[0, `-20 ${x} 44`], [0.2, `20 ${x} 44`, 'sio'], [0.4, `-20 ${x} 44`, 'sio']], { begin })
  const bubble = wrap(speech('YAY!'), '', anim('scale', D, [[0, '0 0'], [0.3, '0 0'], [0.55, '1 1', 'back'], [D, '1 1']], ONCE))
  const stars = [[-6, 8], [104, 30], [0, 40]].map(([x, y], i) => between(pixels(STAR, x, y, 1.8, '#FFE9A8'), D, 0.4 + i * 0.2, D - 0.2)).join('')
  return wrap(figure({
    ownProps: true,
    left: { at: 'translate(-6 -40)', anims: [wave(0, 11)] },
    right: { at: 'translate(6 -40)', anims: [wave(0.2, 96)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.2, '1.3 1.3', 'p2out'], [1.3, '1.3 1.3'], [1.45, '1 .35', 'p2io'], [D, '1 .35']], ONCE)] },
    props: bubble + stars,
  }), '', hops)
}

// A session milestone (an hour in, and every couple of hours after): a little cake with a candle, which he blows out
function cake() {
  const D = EVENT_SECONDS.cake
  const BLOW = 2.3
  const plate = rect(106, 84, 46, 2, '#C9CDD2')
  const sponge = rect(112, 70, 34, 14, '#F3EFE6') + rect(112, 76, 34, 2, '#E3B26B') + rect(110, 66, 38, 6, '#F27BAA') + [0, 1, 2, 3].map((i) => rect(113 + i * 9, 72, 4, 3 + (i % 2) * 2, '#F27BAA')).join('') +
    [0, 1, 2].map((i) => rect(116 + i * 11, 67, 2, 2, ['#6EA8FF', '#F2C14E', '#7CC47F'][i])).join('')
  const candle = rect(127, 52, 4, 14, '#6EA8FF') + rect(127, 55, 4, 2, '#FFFFFF') + rect(127, 60, 4, 2, '#FFFFFF') + rect(128.4, 49, 1.2, 3, INK)
  const flame = wrap(wrap(poly('-3,0 0,-9 3,0', '#F28C28') + poly('-1.5,0 0,-5 1.5,0', '#FFD34D'), '', anim('scale', 0.2, [[0, '1 1'], [0.1, '.85 1.15', 'sio'], [0.2, '1 1', 'sio']])), 'translate(129 49)',
    anim('opacity', D, [[0, '1'], [BLOW, '1'], [BLOW + 0.08, '0', 'lin'], [D, '0']], ONCE))
  const smoke = wrap(rect(-1.5, -4, 3, 5, '#A8A49A') + rect(0, -9, 3, 4, '#A8A49A'), 'translate(129 47)',
    anim('translate', D, [[0, '0 0'], [BLOW, '0 0'], [D, '3 -14', 'p2out']], ONCE), anim('opacity', D, [[0, '0'], [BLOW, '0'], [BLOW + 0.05, '.8', 'lin'], [D, '0', 'lin']], ONCE))
  const puff = between([0, 1, 2].map((i) => rect(100 + i * 6, 26 + i * 4, 5, 2, '#E8E4DA', 'fill-opacity=".8"')).join(''), D, BLOW - 0.3, BLOW + 0.1)
  return figure({
    ownProps: true,
    heldRaw: plate + sponge + candle + flame + smoke,
    upper: [anim('translate', D, [[0, '0 0'], [BLOW - 0.6, '0 0'], [BLOW - 0.3, '-3 -2', 'p2out'], [BLOW, '4 2', 'p2in'], [BLOW + 0.3, '0 0', 'p2io'], [D, '0 0']], ONCE)],
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.4, '6 6', 'p2io'], [D - 0.3, '6 6'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1.25 1.25'], [BLOW + 0.3, '1.25 1.25'], [BLOW + 0.45, '1 .35', 'p2io'], [D, '1 .35']], ONCE)],
    },
    props: puff,
  })
}

// Drawing a chart: bars rise one by one on a whiteboard beside him while he points them out with a stick
function chart() {
  const D = EVENT_SECONDS.chart
  const BARS = [[112, 14, 0.5, '#6EA8FF'], [124, 24, 1.0, '#5E8C6A'], [136, 18, 1.5, '#E7B04A'], [148, 32, 2.0, SPARK]]
  const board = rect(103, -1, 58, 50, INK) + rect(105, 1, 54, 46, '#FFFFFF') + rect(108, 44, 48, 1.5, '#8A8F98') + rect(108, 6, 1.5, 39, '#8A8F98') +
    rect(112, 49, 3, 37, WOOD) + rect(149, 49, 3, 37, WOOD)
  const bars = BARS.map(([x, h, t, fill]) => wrap(wrap(rect(x, 44 - h, 8, h, fill), `translate(0 -44)`), 'translate(0 44)',
    anim('scale', D, [[0, '1 0'], [t, '1 0'], [t + 0.35, '1 1', 'back'], [D, '1 1']], ONCE))).join('')
  const stick = rect(104, 30.5, 28, 2, WOOD) + rect(131, 30, 3, 3, '#E5584B')
  const points = BARS.flatMap(([x, h, t]) => [[t, `${x + 4 - 133} ${44 - h - 32}`, 'p2io'], [t + 0.4, `${x + 4 - 133} ${44 - h - 32}`]])
  return figure({
    ownProps: true,
    heldRaw: board + bars,
    right: { hold: true, over: true, carry: stick, anims: [anim('translate', D, [[0, '0 0'], [0.3, '-8 0', 'p2out'], ...points, [D - 0.3, '-8 0', 'p2io'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], ...BARS.map(([, , t], i) => [t, `${4 + i * 0.6} ${-1 - i}`, 'p2io']), [D, '0 0', 'p2io']], ONCE)] },
  })
}

// A kanban board: a board stands beside him; he slaps a new card onto "to do", then drags a card from "doing" over to "done"
function kanban() {
  const D = EVENT_SECONDS.kanban
  const COLUMNS = [[108, '#E5584B'], [126, '#E7B04A'], [144, '#5E8C6A']]
  const card = (top) => rect(0, 0, 14, 8, CREAM) + rect(0, 0, 14, 2, top) + rect(2, 4, 9, 1.5, PAPER_SHADE)
  const board = rect(104, -2, 62, 52, '#6B4F3A') + rect(106, 0, 58, 48, '#E9E4D6') +
    COLUMNS.map(([x, top]) => rect(x, 2, 16, 3, top) + rect(x + 16.5, 6, 1, 40, PAPER_SHADE)).join('') +
    wrap(card('#E5584B'), 'translate(109 8)') + wrap(card('#E5584B'), 'translate(109 18)') + wrap(card('#5E8C6A'), 'translate(145 8)')
  // Where his hand goes to hold a card whose top-left corner is at (x, y)
  // The board is drawn small and shown 1.5 times bigger from its top-left corner, so these work in the small drawing's terms
  const BIG = 'translate(104 -2) scale(1.5) translate(-104 2)'
  const grip = (x, y) => `${n(104 + 1.5 * (x + 7 - 104) + 6 - 96)} ${n(-2 + 1.5 * (y + 6) + 12 - 32)}`
  const SLAP = 0.9
  const GRAB = 1.6
  const DROP = 2.3
  const fresh = wrap(card('#E5584B'), '', anim('translate', D, [[0, '85 20'], [0.3, '85 20'], [SLAP, '109 28', 'p2io'], [D, '109 28']], ONCE),
    anim('opacity', D, [[0, '0'], [0.3, '0'], [0.35, '1', 'lin'], [D, '1']], ONCE))
  const moved = wrap(card('#E7B04A'), '', anim('translate', D, [[0, '127 8'], [GRAB, '127 8'], [GRAB + 0.15, '127 4', 'p2out'], [DROP, '145 18', 'p2io'], [D, '145 18']], ONCE))
  const tick = wrap(pixels(PIXEL.check, -6, -3.6, 1.2, '#5E8C6A'), 'translate(152 22)',
    anim('scale', D, [[0, '0 0'], [DROP + 0.05, '0 0'], [DROP + 0.2, '1.4 1.4', 'p2out'], [DROP + 0.3, '1 1', 'p2io'], [D, '1 1']], ONCE))
  const slapLines = between(rect(105, 25, 2, 5, CREAM) + rect(105, 33, 2, 5, CREAM), D, SLAP, SLAP + 0.2)
  return figure({
    ownProps: true,
    heldRaw: wrap(board + fresh + moved + tick + slapLines, BIG),
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.3, grip(85, 20), 'p2out'], [SLAP, grip(109, 28), 'p2io'], [1.25, '10 2', 'p2out'],
      [GRAB, grip(127, 8), 'p2io'], [GRAB + 0.15, grip(127, 4), 'p2out'], [DROP, grip(145, 18), 'p2io'], [DROP + 0.35, '10 2', 'p2out'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '5 0', 'p2io'], [GRAB, '6 -3', 'sio'], [DROP, '6 -1', 'sio'], [D, '0 0', 'p2io']], ONCE)] },
  })
}

// ---- New senses: being petted, deep thinking, Claude's reply, and more ----

// Drawn once with an outline and once without, so overlapping pieces make one clean silhouette
const outlined = (rects, fill, edge = INK) => rects.map(([x, y, w, h]) => rect(x, y, w, h, edge, `stroke="${edge}" stroke-width="2.4"`)).join('') + rects.map(([x, y, w, h]) => rect(x, y, w, h, fill)).join('')

// How high his hat reaches (0 with no hat), read from the hat's own drawing, so a hand patting him lands on top of it
function hatTop() {
  const head = activeOutfit?.head
  if (!head) return 0
  const tops = [...head.matchAll(/\by="(-?[\d.]+)"/g)].map((m) => Number(m[1]))
  return tops.length ? Math.min(0, ...tops) : 0
}

// A giant white glove (like a cartoon Master Hand) seen from the side: it comes down, lies flat on his head
// (palm down, fingers stretched along the top) and pats him `pats` times, rubbing a little each time, then floats back up
function bigHand(D, pats) {
  const rest = Math.round(Math.min(-2, hatTop() - 2))
  const GLOVE = '#F6F6F3'
  const SHADE = '#D4D4CF'
  const EDGE = '#9A9A94'
  // 0 0 is the bottom middle of the palm, where it rests on his head; the fingers point left, the wrist rises to the right,
  // and the thumb is on the far side, out of sight
  const parts = [
    `<rect x="-56" y="-17" width="46" height="10" rx="5"/>`,
    `<rect x="-60" y="-11" width="50" height="11" rx="5.5"/>`,
    `<rect x="-24" y="-20" width="52" height="20" rx="8"/>`,
    wrap(`<rect x="0" y="-12" width="30" height="20" rx="6"/>`, 'translate(22 -12) rotate(-35)'),
    wrap(`<rect x="22" y="-15" width="12" height="26" rx="4"/>`, 'translate(22 -12) rotate(-35)'),
  ]
  const layer = (attrs) => `<g ${attrs}>${parts.join('')}</g>`
  const shape = layer(`fill="${EDGE}" stroke="${EDGE}" stroke-width="5"`) + layer(`fill="${GLOVE}"`) +
    rect(-54, -15, 40, 2, '#FFFFFF') + rect(-58, -3, 46, 2.5, SHADE) + rect(-22, -18, 46, 3, '#FFFFFF') + rect(-22, -4, 48, 3, SHADE) +
    [-4, 6, 16].map((x) => rect(x, -16, 2.5, 6, SHADE)).join('')
  const frames = [[0, '96 -110'], [0.5, `62 ${rest}`, 'p2out']]
  for (let i = 0; i < pats; i++) frames.push([n(0.75 + i * 0.4), `${i % 2 ? 58 : 66} ${rest - 9}`, 'sio'], [n(1.0 + i * 0.4), `62 ${rest}`, 'p2in'])
  frames.push([D - 0.45, `62 ${rest}`], [D, '100 -120', 'p2in'])
  return wrap(shape, '', anim('translate', D, frames, ONCE))
}

// His head squashes a little under each pat
function pressed(D, pats) {
  const frames = [[0, '0 0'], [0.45, '0 0']]
  for (let i = 0; i < pats; i++) frames.push([n(0.5 + i * 0.4), '0 3', 'p2in'], [n(0.8 + i * 0.4), '0 0', 'sio'])
  return anim('translate', D, [...frames, [D, '0 0']], ONCE)
}

// You pet him: a big hand comes down and pats his head; he closes his eyes happily and hearts float up
function pet() {
  const D = EVENT_SECONDS.pet
  const hearts = [[-4, 0.7], [104, 1.1], [-8, 1.6], [108, 2.0]].map(([x, t]) => wrap(pixels(HEART, -8.4, -6, 2.4, '#E5584B'), '',
    anim('translate', D, [[0, `${x} 20`], [t, `${x} 20`], [t + 1.2, `${x + (x < 50 ? -4 : 4)} -20`, 'sio'], [D, `${x} -20`]], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.1, '1', 'lin'], [t + 0.9, '1'], [t + 1.2, '0', 'lin'], [D, '0']], ONCE))).join('')
  const cheeks = between(rect(15, 25, 14, 4, '#F28A8A', 'fill-opacity=".75"') + rect(78, 25, 14, 4, '#F28A8A', 'fill-opacity=".75"'), D, 0.6, D - 0.2)
  return figure({
    ownProps: true,
    upper: [pressed(D, 4)],
    heldRaw: cheeks,
    left: { hold: true, anims: [holdAt(D, 20, 8, 0.6, D - 0.3)] },
    right: { hold: true, anims: [holdAt(D, -20, 8, 0.6, D - 0.3)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.5, '1 1'], [0.6, '1 .25', 'p2io'], [D - 0.3, '1 .25'], [D, '1 1', 'p2io']], ONCE)] },
    props: hearts + bigHand(D, 4),
  })
}

// Petted over and over: he scowls, steam puffs off his head, and he shakes the hand off
function grumpy() {
  const D = EVENT_SECONDS.grumpy
  const brows = between(wrap(rect(19, 5, 15, 4, INK), '', anim('rotate', D, [[0, '18 26 7'], [D, '18 26 7']], ONCE)) +
    wrap(rect(73, 5, 15, 4, INK), '', anim('rotate', D, [[0, '-18 80 7'], [D, '-18 80 7']], ONCE)), D, 0.5, D - 0.1)
  const steam = [[6, 0.7], [96, 1.0], [10, 1.5], [92, 1.8]].map(([x, t]) => wrap(rect(-4, -3, 8, 6, '#D9D3C3') + rect(-2, -6, 6, 4, '#D9D3C3'), '',
    anim('translate', D, [[0, `${x} 0`], [t, `${x} 0`], [t + 0.8, `${x} -26`, 'p2out'], [D, `${x} -26`]], ONCE),
    anim('opacity', D, [[0, '0'], [t, '0'], [t + 0.1, '1', 'lin'], [t + 0.6, '1'], [t + 0.8, '0', 'lin'], [D, '0']], ONCE))).join('')
  const shake = [[0, '0 0'], [1.6, '0 0']]
  for (let t = 1.66, i = 0; t < 2.3; t += 0.06, i++) shake.push([n(t), `${i % 2 ? -3 : 3} 0`, 'lin'])
  shake.push([2.4, '0 0', 'lin'], [D, '0 0'])
  return figure({
    ownProps: true,
    upper: [pressed(D, 2), anim('translate', D, shake, ONCE)],
    heldRaw: brows + between(rect(11, 0, 85, 36, '#E5584B', 'fill-opacity=".15"'), D, 0.6, D - 0.2),
    left: { hold: true, anims: [holdAt(D, 6, -4, 0.5, D - 0.3)] },
    right: { hold: true, anims: [holdAt(D, -6, -4, 0.5, D - 0.3)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.5, '1 .5', 'p2io'], [D - 0.2, '1 .5'], [D, '1 1', 'p2io']], ONCE)] },
    props: steam + bigHand(D, 2),
  })
}

// A gear 0 0 at the middle, R its radius, with eight teeth
const gear = (R, fill) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => wrap(rect(-2.5, -R - 3, 5, 5, fill), `rotate(${i * 45})`)).join('') + disc(0, 0, R, fill) + disc(0, 0, Math.round(R / 3), INK)

// Thinking hard: two gears turn over his head and his head glows, his eyes turned up toward them
function gears() {
  const T = 2
  // Over his head, or beside his hat if he wears one (above a tall hat they would run off the top of the band)
  const [gx, gy] = hatTop() < -10 ? [40, 2] : [0, 0]
  const spin = (deg) => anim('rotate', T, [[0, '0'], [T, `${deg}`, 'lin']])
  const glow = wrap(rect(11, 0, 85, 20, '#F7E04A', 'fill-opacity=".22"'), '', anim('opacity', 1, [[0, '.4'], [0.5, '1', 'sio'], [1, '.4', 'sio']]))
  return figure({
    ownProps: true,
    heldRaw: glow,
    upper: [bob(2, 1)],
    eyes: { gaze: [anim('translate', T, [[0, '0 -4'], [T, '0 -4']])] },
    props: wrap(wrap(gear(9, '#9AA0A6'), '', spin(360)), `translate(${42 + gx} ${-20 + gy})`) + wrap(wrap(gear(7, '#C9CDD2'), '', spin(-480)), `translate(${63 + gx} ${-28 + gy})`),
  })
}



// Claude apologizes: he bows low, eyes shut, hands together, with a bead of sweat
function bow() {
  const D = EVENT_SECONDS.bow
  const dip = anim('translate', D, [[0, '0 0'], [0.4, '0 14', 'p2out'], [1.8, '0 14'], [2.2, '0 0', 'p2io'], [D, '0 0']], ONCE)
  return figure({
    ownProps: true,
    upper: [dip],
    legs: { perLeg: () => [anim('scale', D, [[0, '1 1'], [0.4, '1 .4', 'p2out'], [1.8, '1 .4'], [2.2, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
    left: { hold: true, anims: [holdAt(D, 24, 14, 0.4, 2.0)] },
    right: { hold: true, anims: [holdAt(D, -24, 14, 0.4, 2.0)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .2', 'p2io'], [2.0, '1 .2'], [2.3, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
    props: drop(96, 2, 0.6),
  })
}

// Claude says it is all done: he holds up two party poppers, they pop, and streamers and confetti fly out
function party() {
  const D = EVENT_SECONDS.party
  const POP = 0.55
  // A striped cone, its tip in his hand and its mouth up and outward
  const cone = (side) => wrap(poly('0,10 -7,-12 7,-12', '#E7B04A') + poly('-2.6,-4 -4.7,-8 4.7,-8 2.6,-4', '#E5584B') + poly('-5.8,-12 -6.5,-14 6.5,-14 5.8,-12', '#FFFFFF') +
    [0, 1, 2].map((i) => wrap(rect(-1, -2, 2, 7, ['#5E8C6A', '#6EA8FF', '#B58CFF'][i]), '', anim('translate', D, [[0, '0 -10'], [POP, '0 -10'], [POP + 0.35, `${(i - 1) * 9} -34`, 'p2out'], [D, `${(i - 1) * 12} -30`, 'sio']], ONCE),
      anim('rotate', 0.5, [[0, '-20'], [0.25, '20', 'sio'], [0.5, '-20', 'sio']]),
      anim('opacity', D, [[0, '0'], [POP, '0'], [POP + 0.02, '1', 'lin'], [POP + 0.7, '1'], [POP + 1.0, '0', 'lin'], [D, '0']], ONCE))).join(''), `rotate(${side * 25})`)
  const kick = anim('rotate', D, [[0, '0'], [POP - 0.05, '0'], [POP + 0.05, '-12', 'p2out'], [POP + 0.3, '0', 'p2io'], [D, '0']], ONCE)
  return figure({
    ownProps: true,
    upper: [anim('translate', D, [[0, '0 0'], [0.3, '0 -8', 'p2out'], [0.6, '0 0', 'p2in'], [D, '0 0']], ONCE)],
    left: { hold: true, carry: wrap(wrap(cone(-1), '', kick), 'translate(11 21)'), anims: [holdAt(D, -4, -26, 0.3, D - 0.3)] },
    right: { hold: true, carry: wrap(wrap(cone(1), '', kick), 'translate(96 21)'), anims: [holdAt(D, 4, -26, 0.3, D - 0.3)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1 .3', 'p2io'], [D - 0.3, '1 .3'], [D, '1 1', 'p2io']], ONCE)] },
    props: between(burst({ x: 2, y: -26, begin: POP, cycle: D, side: -1, count: 18, seed: 3 }) + burst({ x: 104, y: -26, begin: POP, cycle: D, side: 1, count: 18, seed: 5 }), D, POP, D - 0.1),
  })
}


// A very long reply: he holds up a scroll that unrolls all the way down to the floor and keeps rolling away
function longscroll() {
  const D = EVENT_SECONDS.longscroll
  const DOWN = 1.6
  // Held up above his hat, if he wears one (but no higher than the top of the band)
  const lift = Math.max(-36, Math.min(0, Math.round(hatTop() + 14)))
  const paper = `<rect x="36" y="-14" width="36" height="0" fill="${CREAM}">${anim('height', D, [[0, '0'], [0.3, '0'], [DOWN, '100', 'p2in'], [D, '100']], ONCE)}</rect>`
  const lines = Array.from({ length: 13 }, (_, i) => between(rect(40, -8 + i * 7, i % 3 === 2 ? 18 : 28, 2, PAPER_SHADE), D, 0.3 + (DOWN - 0.3) * Math.pow((i + 1) / 13, 0.6), D - 0.1)).join('')
  // The rest of the paper, still rolled up: a cylinder across the bottom of the sheet, its curl turning as it unwinds.
  // At the floor it keeps unwinding toward you, so it comes closer and grows
  const curl = wrap(rect(-17, -1, 34, 1.6, PAPER_SHADE), '', anim('translate', 0.35, [[0, '0 -3'], [0.35, '0 3', 'lin']]))
  const roll = wrap(rect(-20, -5, 40, 10, '#EFE6CF') + rect(-20, -5, 40, 2, '#FFFFFF') + rect(-20, 3, 40, 2, '#D9CFB5') + curl + rect(-22, -5, 3, 10, '#D9CFB5') + rect(19, -5, 3, 10, '#D9CFB5'), '',
    anim('translate', D, [[0, '54 -14'], [0.3, '54 -14'], [DOWN, '54 82', 'p2in'], [D, '54 90', 'p2out']], ONCE),
    anim('scale', D, [[0, '1 1'], [DOWN, '1 1'], [D, '1.5 1.5', 'p2out']], ONCE))
  const raised = (inner) => (lift ? wrap(inner, `translate(0 ${lift})`) : inner)
  return figure({
    ownProps: true,
    heldRaw: raised(paper + lines + roll + rect(32, -18, 44, 5, '#E2D7BC')),
    left: { hold: true, anims: [holdAt(D, 22, -34 + lift, 0.3, D - 0.2)] },
    right: { hold: true, anims: [holdAt(D, -22, -34 + lift, 0.3, D - 0.2)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 -4', 'p2io'], [DOWN, '0 6', 'sio'], [D, '5 6', 'sio']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [DOWN, '1 1'], [DOWN + 0.1, '1.3 1.3', 'p2out'], [D, '1.3 1.3']], ONCE)],
    },
    props: drop(4, -4, DOWN),
  })
}

// Claude Code is waiting on you: he comes right up to the glass and knocks on the inside of your screen
function knock() {
  const D = EVENT_SECONDS.knock
  const KNOCKS = [0.6, 0.85, 1.1, 1.8, 2.05]
  // His fist in front of his face, rapping toward you: each knock jolts it forward and impact lines flash round it
  const fist = anim('translate', D, [[0, '0 0'], [0.4, '-34 -10', 'p2out'], ...KNOCKS.flatMap((t) => [[t - 0.1, '-34 -12', 'sio'], [t, '-36 -6', 'p2in'], [t + 0.1, '-34 -10', 'p2out']]), [D - 0.3, '-34 -10'], [D, '0 0', 'p2io']], ONCE)
  const lines = KNOCKS.map((t) => between(rect(44, 6, 2, 6, CREAM) + rect(76, 6, 2, 6, CREAM) + rect(48, 0, 5, 2, CREAM) + rect(68, 0, 5, 2, CREAM) + rect(40, 18, 5, 2, CREAM) + rect(77, 18, 5, 2, CREAM), D, t, t + 0.12)).join('')
  // Two glints of the glass between you
  const glass = between(rect(84, -14, 6, 36, '#FFFFFF', 'fill-opacity=".14"') + rect(94, -14, 3, 36, '#FFFFFF', 'fill-opacity=".14"'), D, 0.3, D - 0.2)
  const closer = anim('scale', D, [[0, '1 1'], [0.4, '1.15 1.15', 'p2out'], [D - 0.3, '1.15 1.15'], [D, '1 1', 'p2io']], ONCE)
  const fig = figure({
    ownProps: true,
    right: { hold: true, over: true, anims: [fist] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [D, '0 0']], ONCE)], scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1.15 1.15', 'p2out'], [D, '1.15 1.15']], ONCE)] },
    props: lines + glass,
  })
  return wrap(wrap(fig, `translate(-53.5 -${FLOOR})`), `translate(53.5 ${FLOOR})`, closer)
}

// Docker: he rides a blue whale carrying a stack of shipping containers, its spout splashing
function whale() {
  const D = EVENT_SECONDS.whale
  const BLUE = '#2D7FC1'
  const tail = wrap(rect(-24, 44, 22, 8, BLUE) + rect(-30, 34, 10, 12, BLUE) + rect(-30, 50, 10, 10, BLUE), '', anim('rotate', 0.8, [[0, '-8 -4 56'], [0.4, '8 -4 56', 'sio'], [0.8, '-8 -4 56', 'sio']]))
  const body = rect(20, 46, 70, 6, BLUE) + rect(0, 52, 112, 24, BLUE) + rect(8, 76, 96, 6, '#BFE3FF') + rect(100, 58, 4, 4, '#FFFFFF') + rect(101, 59, 2, 2, INK) + rect(92, 68, 16, 2, '#1F5A8A')
  const boxes = [[0, 40, '#E5584B'], [0, 28, '#E7B04A'], [-10, 40, '#5E8C6A']].map(([x, y, c]) => rect(x, y, 16, 12, c) + rect(x + 2, y + 2, 1.5, 8, '#FFFFFF', 'fill-opacity=".4"') + rect(x + 6, y + 2, 1.5, 8, '#FFFFFF', 'fill-opacity=".4"') + rect(x + 10, y + 2, 1.5, 8, '#FFFFFF', 'fill-opacity=".4"')).join('')
  const spout = [0, 1, 2, 3].map((i) => wrap(rect(-2, -2, 4, 4, '#8FC7F2'), '', anim('translate', 0.9, [[0, '96 46'], [0.45, `${90 + i * 4} ${26 - (i % 2) * 6}`, 'p2out'], [0.9, `${86 + i * 6} 44`, 'p2in']], { begin: i * 0.2 }))).join('')
  const rider = wrap(figure({
    ownProps: true,
    left: { hold: true, anims: [anim('translate', 0.5, [[0, '-4 -24'], [0.25, '-2 -32', 'sio'], [0.5, '-4 -24', 'sio']])] },
    right: { hold: true, anims: [anim('translate', D, [[0, '4 8'], [D, '4 8']], ONCE)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1.2 1.2', 'p2out'], [D, '1.2 1.2']], ONCE)] },
  }), 'translate(10 -26)')
  const waves = [0, 1, 2, 3, 4].map((i) => rect(-20 + i * 32, 84, 18, 3, '#8FC7F2')).join('')
  const swim = anim('translate', 1.2, [[0, '0 0'], [0.6, '0 -4', 'sio'], [1.2, '0 0', 'sio']])
  return wrap(waves, '', anim('translate', 1, [[0, '0 0'], [1, '-32 0', 'lin']])) + wrap(rider + boxes + tail + body + spout, '', swim)
}

// The two snakes of the Python logo, blue and yellow, in pixels: B blue, Y yellow, W an eye
const PYTHON_LOGO = (() => {
  const blue = [[0, 5, 10], [1, 4, 11], [2, 4, 11], [3, 4, 11], [4, 7, 11], [5, 1, 10], [6, 0, 10], [7, 0, 10], [8, 0, 4], [9, 0, 4], [10, 1, 4]]
  const grid = Array.from({ length: 16 }, () => Array(16).fill('.'))
  for (const [y, from, to] of blue) for (let x = from; x <= to; x++) {
    grid[y][x] = 'B'
    grid[15 - y][15 - x] = 'Y'
  }
  grid[2][6] = 'W'
  grid[13][9] = 'W'
  return grid.map((row) => row.join(''))
})()

// Python: the two snakes of the Python logo slide in from above and below, lock together beside him and sway, and he waves
function snake() {
  const D = EVENT_SECONDS.snake
  const CELL = 4
  const only = (ch) => PYTHON_LOGO.map((row) => row.replace(new RegExp(`[^${ch}]`, 'g'), '.').replace(new RegExp(ch, 'g'), 'X'))
  // Each snake slides in from its own side (from: where it starts), so they lock together in the middle
  const half = (ch, fill, from) => wrap(pixels(only(ch), 0, 0, CELL, fill) + pixels(only(ch), 0.5, 0.5, CELL, fill), '',
    anim('translate', D, [[0, from], [0.25, from], [0.9, '0 0', 'back'], [D - 0.35, '0 0'], [D, from, 'p2in']], ONCE),
    anim('opacity', D, [[0, '0'], [0.25, '0'], [0.4, '1', 'lin'], [D - 0.15, '1'], [D, '0', 'lin']], ONCE))
  const eyesIn = anim('opacity', D, [[0, '0'], [0.9, '0'], [0.95, '1', 'lin'], [D - 0.35, '1'], [D - 0.3, '0', 'lin'], [D, '0']], ONCE)
  const placed = (inner) => wrap(inner, 'translate(110 18)', anim('rotate', 1.4, [[0, '-5 32 32'], [0.7, '5 32 32', 'sio'], [1.4, '-5 32 32', 'sio']]))
  return figure({
    ownProps: true,
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [0.9, '0 0'], [1.1, '4 -24', 'p2out'], [1.3, '8 -26', 'sio'], [1.5, '4 -24', 'sio'], [1.7, '8 -26', 'sio'], [2.0, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    eyes: {
      gaze: [anim('translate', D, [[0, '0 0'], [0.5, '5 -1', 'p2io'], [D - 0.3, '5 -1'], [D, '0 0', 'p2io']], ONCE)],
      scaleAnims: [anim('scale', D, [[0, '1 1'], [0.9, '1.3 1.3', 'p2out'], [1.2, '1 1', 'p2io'], [D, '1 1']], ONCE)],
    },
    props: placed(half('B', '#3776AB', '0 -70') + half('Y', '#FFD43B', '0 70') + wrap(pixels(only('W'), 0, 0, CELL, '#FFFFFF'), '', eyesIn)),
  })
}


// Rust: a tiny orange crab buddy scuttles in, waves its claws at him, and he waves back
function ferris() {
  const D = EVENT_SECONDS.ferris
  const ORANGE = '#F74C00'
  const claw = (x, side) => wrap(rect(x, -4, 6, 6, ORANGE) + rect(x + (side < 0 ? -2 : 4), -8, 4, 5, ORANGE), '',
    anim('rotate', 0.4, [[0, `0 ${x + 3} 2`], [0.2, `${side * 25} ${x + 3} 2`, 'sio'], [0.4, `0 ${x + 3} 2`, 'sio']]))
  const buddy = [-10, -4, 4, 10].map((x) => rect(x, 6, 2, 6, '#C43D00')).join('') + rect(-13, -2, 26, 10, ORANGE) + rect(-11, -4, 22, 3, ORANGE) +
    rect(-6, -10, 2, 6, ORANGE) + rect(4, -10, 2, 6, ORANGE) + rect(-7, -13, 4, 4, '#FFFFFF') + rect(-6, -12, 2, 2, INK) + rect(3, -13, 4, 4, '#FFFFFF') + rect(4, -12, 2, 2, INK) +
    claw(-20, -1) + claw(14, 1)
  const walk = anim('translate', D, [[0, '170 74'], [1.1, '122 74', 'lin'], [D - 0.5, '122 74'], [D, '170 74', 'p2in']], ONCE)
  const scuttle = anim('translate', 0.2, [[0, '0 0'], [0.1, '0 -2', 'sio'], [0.2, '0 0', 'sio']])
  return figure({
    ownProps: true,
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [1.0, '0 0'], [1.2, '4 -24', 'p2out'], [1.4, '8 -26', 'sio'], [1.6, '4 -24', 'sio'], [1.8, '8 -26', 'sio'], [2.1, '0 0', 'p2io'], [D, '0 0']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.4, '5 4', 'p2io'], [D - 0.3, '5 4'], [D, '0 0', 'p2io']], ONCE)], scaleAnims: [anim('scale', D, [[0, '1 1'], [1.1, '1 1'], [1.25, '1 .3', 'p2io'], [2.2, '1 .3'], [2.4, '1 1', 'p2io'], [D, '1 1']], ONCE)] },
    props: wrap(wrap(buddy, '', scuttle), '', walk),
  })
}

// A big delete: he scrubs a page of code with a giant pink eraser, line by line, crumbs flying
function erase() {
  const D = EVENT_SECONDS.erase
  const LINES = [[34, 0.5, '#6EA8FF'], [41, 1.0, '#B58CFF'], [48, 1.5, '#5E8C6A'], [55, 2.0, '#E7B04A']]
  const page = rect(31, 25, 46, 42, '#C9C3B2') + rect(32, 26, 44, 40, CREAM) +
    LINES.map(([y, t, c]) => `<rect x="36" y="${y}" width="34" height="3" fill="${c}">${anim('width', D, [[0, '34'], [t, '34'], [t + 0.45, '0', 'lin'], [D, '0']], ONCE)}</rect>`).join('')
  const eraser = rect(66, 33, 16, 9, '#F28AA8') + rect(66, 39, 16, 3, '#6EA8FF') + rect(66, 33, 16, 2, '#F7B3C8')
  const scrub = LINES.flatMap(([y, t]) => [[t, `${-30 + 34} ${y - 37}`, 'p2io'], [t + 0.12, `${-30 + 26} ${y - 37}`, 'sio'], [t + 0.24, `${-30 + 14} ${y - 37}`, 'sio'], [t + 0.36, `${-30 + 4} ${y - 37}`, 'sio'], [t + 0.45, `${-30} ${y - 37}`, 'sio']])
  const crumbs = LINES.map(([y, t], i) => [0, 1].map((k) => wrap(rect(-1.5, -1.5, 3, 3, '#F28AA8'), '',
    anim('translate', D, [[0, `40 ${y}`], [t + 0.2 * k, `40 ${y}`], [t + 0.2 * k + 0.5, `${12 - i * 4 - k * 6} ${y + 30}`, 'p2in'], [D, `${12 - i * 4 - k * 6} ${y + 30}`]], ONCE),
    anim('opacity', D, [[0, '0'], [t + 0.2 * k, '0'], [t + 0.2 * k + 0.02, '1', 'lin'], [t + 0.2 * k + 0.45, '1'], [t + 0.2 * k + 0.5, '0', 'lin'], [D, '0']], ONCE))).join('')).join('')
  return figure({
    ownProps: true,
    heldRaw: between(page, D, 0.2, D - 0.2) + crumbs,
    left: { hold: true, over: true, anims: [holdAt(D, 14, 20, 0.2, D - 0.2)] },
    right: { hold: true, over: true, carry: between(eraser, D, 0.2, D - 0.2), anims: [anim('translate', D, [[0, '0 0'], [0.35, '4 -3', 'p2out'], ...scrub, [D - 0.2, '-10 10', 'p2io'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [D - 0.3, '0 5'], [D, '0 0', 'p2io']], ONCE)], scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1 .5', 'p2io'], [D - 0.3, '1 .5'], [D, '1 1', 'p2io']], ONCE)] },
  })
}

// A brand-new file: he holds an egg that wobbles, cracks, and a new page pops out of it with a sparkle
function hatch() {
  const D = EVENT_SECONDS.hatch
  const CRACK = 1.5
  // The egg in rows, narrower at the top; the top rows are the shell's cap
  const rows = Array.from({ length: 30 }, (_, i) => {
    const y = i - 15
    const half = Math.sqrt(Math.max(0, 1 - (y / 15) ** 2)) * (y < 0 ? 10 : 12)
    return [y, rect(n(54 - half), 44 + y, n(half * 2), 1.2, i % 9 === 3 ? '#E9DFC8' : '#F6EFDD')]
  })
  const cap = rows.filter(([y]) => y < -4).map(([, r]) => r).join('') + rect(48, 32, 3, 3, '#D9C9A0') + rect(58, 36, 2, 2, '#D9C9A0')
  const base = rows.filter(([y]) => y >= -4).map(([, r]) => r).join('') + rect(50, 50, 3, 3, '#D9C9A0') + rect(58, 46, 3, 3, '#D9C9A0')
  const crack = between([0, 1, 2, 3, 4, 5].map((i) => rect(44 + i * 3.4, 39 + (i % 2) * 2, 3.4, 1.4, '#8A7A5A')).join(''), D, CRACK - 0.5, CRACK)
  const capOff = wrap(cap, '', anim('translate', D, [[0, '0 0'], [CRACK, '0 0'], [CRACK + 0.5, '18 -34', 'p2out'], [D, '30 40', 'p2in']], ONCE),
    anim('rotate', D, [[0, '0 54 36'], [CRACK, '0 54 36'], [CRACK + 0.8, '200 54 36', 'lin'], [D, '200 54 36']], ONCE), anim('opacity', D, [[0, '1'], [CRACK + 1, '1'], [CRACK + 1.2, '0', 'lin'], [D, '0']], ONCE))
  const file = wrap(rect(-8, -10, 16, 20, '#FFFFFF') + rect(4, -10, 4, 4, PAPER_SHADE) + rect(-5, -4, 10, 1.6, '#6EA8FF') + rect(-5, 0, 8, 1.6, PAPER_SHADE) + rect(-5, 4, 10, 1.6, PAPER_SHADE), 'translate(54 40)',
    anim('translate', D, [[0, '0 6'], [CRACK + 0.1, '0 6'], [CRACK + 0.5, '0 -20', 'back'], [D, '0 -20']], ONCE),
    anim('scale', D, [[0, '0 0'], [CRACK + 0.1, '0 0'], [CRACK + 0.4, '1.2 1.2', 'p2out'], [CRACK + 0.55, '1 1', 'p2io'], [D, '1 1']], ONCE))
  const shine = wrap(pixels(STAR, -3, -3, 1.4, '#E7B04A'), 'translate(70 12)', anim('scale', D, [[0, '0 0'], [CRACK + 0.5, '0 0'], [CRACK + 0.7, '1.4 1.4', 'p2out'], [CRACK + 1.1, '0 0', 'p2in'], [D, '0 0']], ONCE))
  const wobble = [[0, '0 54 58'], [0.3, '0 54 58']]
  for (let t = 0.45, i = 0; t < CRACK; t += 0.15, i++) wobble.push([n(t), `${i % 2 ? -10 : 10} 54 58`, 'sio'])
  wobble.push([CRACK + 0.1, '0 54 58', 'sio'], [D, '0 54 58'])
  return figure({
    ownProps: true,
    heldRaw: between(file, D, CRACK, D - 0.1) + between(wrap(base + crack + capOff, '', anim('rotate', D, wobble, ONCE)), D, 0.1, D - 0.1) + shine,
    left: { hold: true, over: true, anims: [holdAt(D, 24, 22, 0.1, D - 0.1)] },
    right: { hold: true, over: true, anims: [holdAt(D, -24, 22, 0.1, D - 0.1)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 5', 'p2io'], [CRACK, '0 5'], [CRACK + 0.4, '0 -2', 'p2io'], [D, '0 0', 'p2io']], ONCE)], scaleAnims: [anim('scale', D, [[0, '1 1'], [CRACK, '1 1'], [CRACK + 0.1, '1.3 1.3', 'p2out'], [D - 0.2, '1.3 1.3'], [D, '1 1', 'p2io']], ONCE)] },
  })
}

// Claude's reply was cut off for being too long: he is out of breath, hunched over, puffing
function puff() {
  const D = EVENT_SECONDS.puff
  const heave = anim('translate', 0.6, [[0, '0 6'], [0.3, '0 3', 'sio'], [0.6, '0 6', 'sio']])
  const breath = [0, 1, 2, 3].map((i) => wrap(rect(-4, -3, 8, 6, CREAM) + rect(-2, -5, 5, 3, CREAM), '',
    anim('translate', 0.9, [[0, `${i % 2 ? 98 : 8} 30`], [0.9, `${i % 2 ? 112 : -6} 18`, 'p2out']], { begin: i * 0.45 }),
    anim('opacity', 0.9, [[0, '.9'], [0.9, '0', 'lin']], { begin: i * 0.45 }))).join('')
  return figure({
    ownProps: true,
    upper: [heave],
    left: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [0.3, '6 26', 'p2out'], [D - 0.3, '6 26'], [D, '0 0', 'p2io']], ONCE)] },
    right: { hold: true, anims: [anim('translate', D, [[0, '0 0'], [0.3, '-6 26', 'p2out'], [D - 0.3, '-6 26'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { scaleAnims: [anim('scale', D, [[0, '1 1'], [0.3, '1 .4', 'p2io'], [D - 0.3, '1 .4'], [D, '1 1', 'p2io']], ONCE)] },
    props: between(breath, D, 0.2, D - 0.2) + drop(2, 0, 0.3) + drop(98, 4, 1.1),
  })
}

// You changed a setting: he tightens a bolt in his own side with a wrench, a spark or two flying
function wrench() {
  const D = EVENT_SECONDS.wrench
  const turn = [[0, '0 92 34'], [0.4, '0 92 34']]
  for (let t = 0.6, i = 0; t < D - 0.5; t += 0.35, i++) turn.push([n(t), i % 2 ? '0 92 34' : '-35 92 34', i % 2 ? 'p2io' : 'p2in'])
  turn.push([D, '0 92 34', 'p2io'])
  const tool = rect(92, 32, 22, 5, STEEL) + rect(88, 29, 8, 11, STEEL) + rect(90, 32, 3, 5, '#6F737A') + rect(92, 32, 22, 1.5, '#C9CDD2')
  const sparks = [0.9, 1.6, 2.3].map((t) => wrap(pixels(STAR, -3, -3, 1.2, '#E7B04A'), 'translate(86 26)', anim('scale', D, [[0, '0 0'], [t, '0 0'], [t + 0.08, '1.3 1.3', 'p2out'], [t + 0.25, '0 0', 'p2in'], [D, '0 0']], ONCE))).join('')
  return figure({
    ownProps: true,
    heldRaw: rect(87, 30, 9, 9, '#8A8F98') + rect(89.5, 32.5, 4, 4, '#6F737A') + between(wrap(tool, '', anim('rotate', D, turn, ONCE)), D, 0.3, D - 0.3) + sparks,
    right: { hold: true, over: true, anims: [anim('rotate', D, turn, ONCE), anim('translate', D, [[0, '0 0'], [0.3, '22 0', 'p2out'], [D - 0.3, '22 0'], [D, '0 0', 'p2io']], ONCE)] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '5 4', 'p2io'], [D - 0.3, '5 4'], [D, '0 0', 'p2io']], ONCE)], scaleAnims: [anim('scale', D, [[0, '1 1'], [0.4, '1 .5', 'p2io'], [D - 0.3, '1 .5'], [D, '1 1', 'p2io']], ONCE)] },
  })
}

// Several tools at once: four extra hands, just like his own, pop out around him, each busy with a big tool
function multiarm() {
  const D = EVENT_SECONDS.multiarm
  const big = (inner) => wrap(inner, 'scale(2)')
  const TOOLS = [
    big(rect(-4, -10, 8, 10, '#FFFFFF') + rect(-2, -7, 5, 1.4, PAPER_SHADE) + rect(-2, -4, 4, 1.4, PAPER_SHADE)),
    big(disc(0, -6, 5, INK) + disc(0, -6, 3.5, '#BFE3FF') + rect(3, -2, 2.5, 6, '#6B4F3A')),
    big(rect(-6, -10, 12, 9, '#1F1F22') + rect(-4, -8, 4, 1.4, '#5EE07A') + rect(-4, -5, 6, 1.4, '#5EE07A')),
    big(rect(-1.5, -10, 3, 10, STEEL) + rect(-4.5, -13, 9, 5, STEEL) + rect(-1.5, -13, 3, 2.5, '#6F737A')),
  ]
  // Two more hands on each side, one above and one below his own
  const SPOTS = [[-24, -10], [-26, 50], [109, -10], [111, 50]]
  // The costume's sleeve (a monster's hand, a boxing glove) goes on the extra hands too, moved from where his own hands are
  const sleeve = (side) => (activeOutfit?.sleeve ? wrap(activeOutfit.sleeve(side), side === 'left' ? 'translate(0 -21)' : 'translate(-85 -21)') : '')
  const hands = SPOTS.map(([x, y], i) => wrap(wrap(TOOLS[i], 'translate(11 0)') + rect(0, 0, 22, 23, SKIN, `stroke="${DARK}" stroke-width="1.6"`) + sleeve(i < 2 ? 'left' : 'right'), `translate(${x} ${y})`,
    anim('translate', 0.5, [[0, '0 0'], [0.25, `${i < 2 ? -2 : 2} ${i % 2 ? 4 : -4}`, 'sio'], [0.5, '0 0', 'sio']], { begin: i * 0.12 }))).join('')
  const pop = (i) => anim('opacity', D, [[0, '0'], [0.2 + i * 0.12, '0'], [0.25 + i * 0.12, '1', 'lin'], [D - 0.25, '1'], [D - 0.2, '0', 'lin'], [D, '0']], ONCE)
  return figure({
    ownProps: true,
    left: { hold: true, anims: [anim('translate', 0.5, [[0, '0 0'], [0.25, '0 -4', 'sio'], [0.5, '0 0', 'sio']])] },
    right: { hold: true, anims: [anim('translate', 0.5, [[0, '0 -4'], [0.25, '0 0', 'sio'], [0.5, '0 -4', 'sio']])] },
    eyes: { gaze: [anim('translate', 1, [[0, '-4 0'], [0.5, '4 0', 'sio'], [1, '-4 0', 'sio']])] },
    props: wrap(hands, '', pop(0)),
  })
}


// A folder added to the session: he carries a box in and sets it down, then dusts his hands
function boxin() {
  const D = EVENT_SECONDS.boxin
  const SET = 1.4
  const box = rect(30, 34, 48, 30, '#C9965A') + rect(30, 34, 48, 4, '#B07F48') + rect(48, 44, 12, 9, '#E7C46A') + rect(48, 42, 5, 3, '#E7C46A')
  const carried = wrap(box, '', anim('translate', D, [[0, '0 0'], [SET - 0.3, '0 0'], [SET, '0 22', 'p2in'], [D, '0 22']], ONCE))
  const walkIn = anim('translate', D, [[0, '-90 0'], [SET - 0.4, '0 0', 'p2out'], [D, '0 0']], ONCE)
  const dust = [0, 1, 2].map((i) => between(wrap(rect(-3, -3, 6, 6, '#D9D3C3'), '', anim('translate', 0.5, [[0, `${44 + i * 10} 26`], [0.5, `${40 + i * 14} 14`, 'p2out']])), D, SET + 0.5 + i * 0.15, SET + 1.0 + i * 0.15)).join('')
  const hands = (dx) => anim('translate', D, [[0, `${dx} 18`], [SET - 0.3, `${dx} 18`], [SET, `${dx} 36`, 'p2in'], [SET + 0.3, '0 0', 'p2out'], [SET + 0.5, `${dx / 2} 6`, 'sio'], [SET + 0.7, '0 0', 'sio'], [SET + 0.9, `${dx / 2} 6`, 'sio'], [D, '0 0', 'sio']], ONCE)
  return wrap(figure({
    ownProps: true,
    legs: { period: 0.35 },
    heldRaw: carried + dust,
    left: { hold: true, over: true, anims: [hands(22)] },
    right: { hold: true, over: true, anims: [hands(-22)] },
    eyes: { gaze: [anim('translate', D, [[0, '4 0'], [SET, '0 5', 'p2io'], [D, '0 0', 'p2io']], ONCE)] },
  }), '', walkIn)
}

// A worktree removed: he sweeps with a broom, dust and bits swept away to the side
function sweep() {
  const D = EVENT_SECONDS.sweep
  const broom = rect(64, 20, 4, 60, WOOD) + rect(52, 78, 28, 8, '#E7C46A') + [0, 1, 2, 3, 4].map((i) => rect(54 + i * 5, 84, 2, 3, '#C9A13A')).join('')
  const swish = anim('rotate', 0.6, [[0, '-14 66 22'], [0.3, '14 66 22', 'sio'], [0.6, '-14 66 22', 'sio']])
  const bits = [0, 1, 2, 3, 4].map((i) => wrap(rect(-2, -2, i % 2 ? 4 : 3, 3, i % 2 ? '#8A8F98' : '#B07F48'), '',
    anim('translate', 0.9, [[0, `${50 + i * 4} 84`], [0.9, `${120 + i * 10} ${78 - (i % 3) * 4}`, 'p2out']], { begin: i * 0.18 }),
    anim('opacity', 0.9, [[0, '1'], [0.7, '1'], [0.9, '0', 'lin']], { begin: i * 0.18 }))).join('')
  return figure({
    ownProps: true,
    heldRaw: between(wrap(broom, '', swish), D, 0.2, D - 0.2),
    left: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.25, '58 4', 'p2out'], [D - 0.25, '58 4'], [D, '0 0', 'p2io']], ONCE), swish] },
    right: { hold: true, over: true, anims: [anim('translate', D, [[0, '0 0'], [0.25, '-26 20', 'p2out'], [D - 0.25, '-26 20'], [D, '0 0', 'p2io']], ONCE), swish] },
    eyes: { gaze: [anim('translate', D, [[0, '0 0'], [0.3, '0 6', 'p2io'], [D - 0.3, '0 6'], [D, '0 0', 'p2io']], ONCE)] },
    props: between(bits, D, 0.3, D - 0.2),
  })
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
  readfile,
  photo,
  todo,
  browser,
  mouseride,
  spellbook,
  toolbox,
  alarm,
  binoculars,
  plugin,
  sculpt,
  inbox,
  planner,
  cabinet,
  clapper,
  netcatch,
  apptest,
  blocks,
  highlight,
  cube,
  unity,
  goodmorning,
  goodnight,
  satellite,
  armwrestle,
  redbutton,
  comb,
  dig,
  parachute,
  labcoat,
  paint,
  quill,
  water,
  sandwich,
  crossclaws,
  laugh,
  onfire,
  brb,
  paperstack,
  bricks,
  detective,
  rug,
  signpost,
  checkall,
  monday,
  weekend,
  wonder,
  thumbsup,
  comfort,
  heavybook,
  shredder,
  relabel,
  download,
  rewind,
  drench,
  medal,
  welcomeback,
  cake,
  chart,
  kanban,
  pet,
  grumpy,
  bow,
  party,
  longscroll,
  knock,
  whale,
  snake,
  ferris,
  erase,
  hatch,
  puff,
  wrench,
  multiarm,
  boxin,
  sweep,
  gears,
  // One-shot routines have no idle and running pair
  bedtime,
  compact,
  wake,
}

export const VECTOR_STATES = Object.keys(LOOKS)
// The reactions to Claude Code's events: each has one version (no running one); the one-off ones play once and hold
export const REACTIONS = ['permission', 'asking', 'shrug', 'oops', 'glitch', 'stamp', 'pop', 'peek', 'house', 'hello', 'bye', 'folder', 'plan', 'auto', 'ask', 'send', 'receive', 'present', 'shrink', 'buff', 'ascend', 'fall', 'firstsnow', 'cheer', 'facepalm', 'ship', 'rocket', 'browse', 'trophy', 'yoyo', 'juggle', 'stretch', 'phone', 'coffee', 'game', 'gum', 'music', 'readbook', 'startled', 'blush', 'nervous', 'flinch', 'camera', 'tapfoot', 'yawn', 'unbox', 'magnify', 'mail', 'risky', 'listen', 'mog', 'readfile', 'photo', 'todo', 'browser', 'mouseride', 'spellbook', 'toolbox', 'alarm', 'binoculars', 'plugin', 'sculpt', 'inbox', 'planner', 'cabinet', 'clapper', 'netcatch', 'apptest', 'blocks', 'highlight', 'cube', 'unity', 'goodmorning', 'goodnight', 'satellite', 'armwrestle', 'redbutton', 'comb', 'dig', 'parachute', 'labcoat', 'paint', 'quill', 'water', 'sandwich', 'crossclaws', 'laugh', 'onfire', 'brb', 'paperstack', 'bricks', 'detective', 'rug', 'signpost', 'checkall', 'monday', 'weekend', 'wonder', 'thumbsup', 'comfort', 'heavybook', 'shredder', 'relabel', 'download', 'rewind', 'drench', 'medal', 'welcomeback', 'cake', 'chart', 'kanban', 'pet', 'grumpy', 'bow', 'party', 'longscroll', 'knock', 'whale', 'snake', 'ferris', 'erase', 'hatch', 'puff', 'wrench', 'multiarm', 'boxin', 'sweep', 'gears']

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
  // hudEnd: where the corner tag ends (0 when it is not shown), so something can sit right after it
  return { svg, width, height, isInline, originUnits: startUnits, chipsW, hasMeters, chipsShape, slide, hudEnd: hudPart ? n(2 + tag.width) : 0 }
}

export function bandSvg(options) {
  return bandLayout(options).svg
}
