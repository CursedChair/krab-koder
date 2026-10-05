// The readout under Clawd as a row of small pills: how full each meter is, in colour, instead of plain text.
// Pure drawing and wording code: it never calls Claude Code, so plain node can test it.
import { moodFor } from './life.mjs'

const GREEN = '#5E8C6A'
const AMBER = '#E7B04A'
const CLAY = '#DD775B'
const RED = '#E03C31'
// From 80% a meter is getting full: orange, and it glows. From 95% it is about to run out: red, and the glow beats faster.
const ORANGE = '#F28A2E'

const LIMIT_LABELS = { five_hour: '5h', seven_day: '7d' }
const STATUS = { tired: ['filling up', AMBER], strained: ['getting full', CLAY], critical: ['almost full', RED] }

export const CHIP_HEIGHT = 16
// Room under the row so a glow is not cut off at the bottom of the picture
export const GLOW_PAD = 4
const GAP = 5
const PAD = 8
const FONT = 10.5
const CHAR = 5.9
const BAR = 30

// Green while there is plenty left, red as it runs out
export function levelColor(percent) {
  if (percent >= 95) return RED
  if (percent >= 80) return ORANGE
  if (percent >= 50) return AMBER
  return GREEN
}

// How long until a window resets, in words: "resets in 2h 14m". Nothing once the time has passed or when it is unknown.
export function resetText(resetsAt, nowMs) {
  const at = resetsAt ? Date.parse(resetsAt) : Number.NaN
  if (Number.isNaN(at) || at <= nowMs) return null
  const minutes = Math.ceil((at - nowMs) / 60_000)
  if (minutes >= 24 * 60) return `resets in ${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
  if (minutes >= 60) return `resets in ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
  return `resets in ${minutes}m`
}

// snapshot: { context, rateLimits, cost } as session.measure reports them, or null. note: text for an event.
export function chipsFor(snapshot, note = null, nowMs = Date.now()) {
  if (note) return [{ kind: 'note', text: note, color: CLAY }]
  if (!snapshot) return [{ kind: 'text', text: 'waiting for the first reply' }]
  const chips = []
  const percent = snapshot.context?.percent
  chips.push(
    typeof percent === 'number'
      ? { kind: 'meter', label: 'context', percent, text: `${Math.round(percent)}%`, color: levelColor(percent) }
      : { kind: 'text', text: 'context —' },
  )
  for (const limit of snapshot.rateLimits ?? []) {
    chips.push({
      kind: 'meter',
      label: LIMIT_LABELS[limit.kind] ?? limit.kind,
      percent: limit.percentUsed,
      text: `${Math.round(limit.percentUsed)}%`,
      color: levelColor(limit.percentUsed),
    })
  }
  if (typeof snapshot.cost?.usd === 'number') chips.push({ kind: 'text', text: `$${snapshot.cost.usd.toFixed(2)}` })
  const fiveHour = (snapshot.rateLimits ?? []).find((limit) => limit.kind === 'five_hour')
  const reset = fiveHour ? resetText(fiveHour.resetsAt, nowMs) : null
  if (reset) chips.push({ kind: 'text', text: reset })
  const status = STATUS[moodFor(percent)]
  if (status) chips.push({ kind: 'badge', text: status[0], color: status[1] })
  return chips
}

// How much each step of squeezing takes away. The values always stay; the bar shrinks, then goes, then the labels get short.
const LEVELS = [
  { bar: 30, pad: 8, short: false },
  { bar: 16, pad: 8, short: false },
  { bar: 0, pad: 8, short: false },
  { bar: 0, pad: 6, short: true },
]
const SHORT_LABELS = { context: 'ctx' }
const labelOf = (chip, level) => (level.short ? SHORT_LABELS[chip.label] ?? chip.label : chip.label)

function widthOf(chip, level = LEVELS[0]) {
  const text = chip.text.length * CHAR
  if (chip.kind === 'meter') {
    const bar = level.bar > 0 ? level.bar + 5 : 0
    return level.pad + labelOf(chip, level).length * CHAR + 5 + bar + text + level.pad
  }
  return level.pad + text + level.pad
}

const rowWidth = (chips, level) => chips.reduce((total, chip, i) => total + widthOf(chip, level) + (i > 0 ? GAP : 0), 0)

// Squeeze the row into `width`: the gentlest step that fits; failing that the tightest step with the last pills left out.
// Each result also says where every pill sits: items [{ x, w }].
// A single long note is cut short with an ellipsis rather than dropped. Returns { chips, level, width }.
export function fitChips(chips, width) {
  const place = (list, level) => {
    let x = 0
    return list.map((chip) => {
      const w = widthOf(chip, level)
      const item = { x, w }
      x += w + GAP
      return item
    })
  }
  for (const level of LEVELS) {
    if (rowWidth(chips, level) <= width) return { chips, level, width: rowWidth(chips, level), items: place(chips, level) }
  }
  const tight = LEVELS[LEVELS.length - 1]
  let shown = chips
  while (shown.length > 1 && rowWidth(shown, tight) > width) shown = shown.slice(0, -1)
  if (shown.length === 1 && rowWidth(shown, tight) > width && shown[0].kind !== 'meter') {
    const room = Math.max(0, Math.floor((width - tight.pad * 2) / CHAR))
    if (room < 4) return { chips: [], level: tight, width: 0, items: [] }
    const text = shown[0].text.length > room ? `${shown[0].text.slice(0, room - 1)}…` : shown[0].text
    shown = [{ ...shown[0], text }]
  }
  return rowWidth(shown, tight) <= width
    ? { chips: shown, level: tight, width: rowWidth(shown, tight), items: place(shown, tight) }
    : { chips: [], level: tight, width: 0, items: [] }
}

// How wide the whole row is at its natural size, in screen pixels
export function chipsWidth(chips) {
  return rowWidth(chips, LEVELS[0])
}

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Ice on a pill: a pale blue sheen, a frosty edge, white speckles of frost, and icicles hanging from underneath
function frostFor(w) {
  const sheen = `<rect width="${w}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="#CFEAFB" fill-opacity=".16" stroke="#CFEAFB" stroke-opacity=".7" stroke-width="1"/>`
  const speckles = [[0.12, 1.5], [0.31, 13.5], [0.47, 2], [0.66, 13], [0.83, 1.5], [0.95, 8]].map(([at, y]) => `<rect x="${+(at * w).toFixed(1)}" y="${y}" width="1.5" height="1.5" fill="#F4FBFF" fill-opacity=".9"/>`).join('')
  const count = Math.max(2, Math.round(w / 26))
  const icicles = Array.from({ length: count }, (_, i) => {
    const x = +(((i + 0.5) / count) * w - 1.5 + ((i * 7) % 5) - 2).toFixed(1)
    const long = 3 + ((i * 5) % 4)
    return `<rect x="${x}" y="${CHIP_HEIGHT - 1}" width="3" height="2" fill="#DDF1FF" fill-opacity=".92"/><rect x="${x + 0.5}" y="${CHIP_HEIGHT + 1}" width="2" height="${long - 2}" fill="#DDF1FF" fill-opacity=".85"/><rect x="${x + 1}" y="${CHIP_HEIGHT + long - 1}" width="1" height="2" fill="#EAF7FF" fill-opacity=".8"/>`
  }).join('')
  return sheen + speckles + icicles
}

// A pill melting in a heat wave: a hot sheen, and gooey drips that stretch down from its bottom edge and let go
function meltFor(w, colour) {
  const sheen = `<rect width="${w}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="#FF7A1A" fill-opacity=".14" stroke="#FF9F43" stroke-opacity=".6" stroke-width="1"/>`
  const count = Math.max(2, Math.round(w / 22))
  const drips = Array.from({ length: count }, (_, i) => {
    const x = +(((i + 0.5) / count) * w - 2 + ((i * 7) % 5) - 2).toFixed(1)
    const long = 4 + ((i * 5) % 5)
    const dur = (2.2 + ((i * 3) % 4) * 0.45).toFixed(2)
    const begin = ((i * 0.37) % 2).toFixed(2)
    const fill = i % 3 === 1 ? colour : '#C9C6BC'
    // the drip stretches down, then a drop breaks off and falls
    const stretch = `<rect x="${x}" y="${CHIP_HEIGHT - 2}" width="4" height="${long}" rx="2" fill="${fill}" fill-opacity=".75"><animate attributeName="height" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="2;${long};${long + 2};2" keyTimes="0;.6;.75;1"/></rect>`
    const drop = `<rect x="${x + 0.8}" y="${CHIP_HEIGHT + long}" width="2.4" height="3" rx="1.2" fill="${fill}" fill-opacity=".8"><animateTransform attributeName="transform" type="translate" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0 0;0 0;0 14" keyTimes="0;.75;1"/><animate attributeName="opacity" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0;0;1;0" keyTimes="0;.74;.76;1"/></rect>`
    return stretch + drop
  }).join('')
  return sheen + drips
}

// The row as drawing, in screen pixels, squeezed to fit `width`
// backed: the pills sit over a picture (mountains, sky), so each gets a dark backing and light text to stay readable on any background
export function chipsSvg(chips, width, { frost = false, melt = false, backed = false } = {}) {
  const { chips: fitted, level } = fitChips(chips, width)
  let x = 0
  const shown = fitted.map((chip) => {
    const w = widthOf(chip, level)
    const item = { chip, x, w }
    x += w + GAP
    return item
  })
  const textY = CHIP_HEIGHT / 2 + FONT * 0.36
  const pad = level.pad
  const parts = shown.map(({ chip, x: left, w }) => {
    const isFull = chip.kind === 'meter' && chip.percent >= 80
    const isUrgent = chip.kind === 'meter' && chip.percent >= 95
    // A full meter glows behind its pill; the pill itself gets a thin edge in the same colour
    const glow = isFull
      ? `<rect width="${w}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="${chip.color}" filter="url(#chipglow)"><animate attributeName="opacity" dur="${isUrgent ? 1.1 : 2.4}s" repeatCount="indefinite" values="${isUrgent ? '.45;1;.45' : '.25;.65;.25'}"/></rect>`
      : ''
    const edge = isFull ? ` stroke="${chip.color}" stroke-opacity=".9" stroke-width="1"` : ''
    let inner = glow + `<rect width="${w}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="currentColor" fill-opacity=".1"${edge}/>` + (frost ? frostFor(w) : '') + (melt ? meltFor(w, chip.color ?? '#FF9F43') : '')
    if (chip.kind === 'meter') {
      const label = labelOf(chip, level)
      const barX = pad + label.length * CHAR + 5
      const fill = Math.max(2, Math.min(1, chip.percent / 100) * level.bar)
      inner += `<text x="${pad}" y="${textY}" fill="currentColor" fill-opacity=".62">${escape(label)}</text>`
      if (level.bar > 0) {
        inner +=
          `<rect x="${barX}" y="${CHIP_HEIGHT / 2 - 2.5}" width="${level.bar}" height="5" rx="2.5" fill="currentColor" fill-opacity=".16"/>` +
          `<rect x="${barX}" y="${CHIP_HEIGHT / 2 - 2.5}" width="${+fill.toFixed(1)}" height="5" rx="2.5" fill="${chip.color}"/>`
      }
      // With no bar the value itself carries the colour
      const valueX = level.bar > 0 ? barX + level.bar + 5 : barX
      inner += `<text x="${valueX}" y="${textY}" fill="${level.bar > 0 ? 'currentColor' : chip.color}" font-weight="600">${escape(chip.text)}</text>`
    } else if (chip.kind === 'text') {
      inner += `<text x="${pad}" y="${textY}" fill="currentColor" fill-opacity=".8">${escape(chip.text)}</text>`
    } else {
      inner = `<rect width="${w}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="${chip.color}" fill-opacity=".2"/>` +
        `<text x="${pad}" y="${textY}" fill="${chip.color}" font-weight="600">${escape(chip.text)}</text>`
    }
    const backing = backed ? `<rect width="${w}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="#14161B" fill-opacity=".84"/>` : ''
    const body = backed ? `<g color="#F2F1EC">${inner}</g>` : inner
    // melting: the whole pill droops and wobbles a touch, as if going soft
    const soft = melt ? `<g>${body}<animateTransform attributeName="transform" type="skewX" dur="${(2.6 + (left % 3) * 0.4).toFixed(1)}s" repeatCount="indefinite" values="0;-3;0;2;0"/></g>` : body
    return `<g transform="translate(${+left.toFixed(1)} 0)">${backing}${soft}</g>`
  })
  const defs = '<defs><filter id="chipglow" x="-25%" y="-90%" width="150%" height="280%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>'
  return `<g font-family="system-ui, -apple-system, sans-serif" font-size="${FONT}">${defs}${parts.join('')}</g>`
}

// The same readout for the terminal: pieces of text, each with a colour name for the terminal to use
export function chipsText(chips) {
  const bar = (percent) => {
    const filled = Math.max(1, Math.round((Math.min(100, percent) / 100) * 5))
    return '▰'.repeat(filled) + '▱'.repeat(5 - filled)
  }
  const colour = (hex) => ({ [GREEN]: 'green', [AMBER]: 'yellow', [CLAY]: 'yellow', [ORANGE]: 'yellow', [RED]: 'red' })[hex]
  const parts = []
  chips.forEach((chip, i) => {
    if (i > 0) parts.push({ text: '  ', dim: true })
    if (chip.kind === 'meter') {
      parts.push({ text: `${chip.label} `, dim: true }, { text: bar(chip.percent), color: colour(chip.color) }, { text: ` ${chip.text}` })
    } else if (chip.kind === 'text') {
      parts.push({ text: chip.text, dim: true })
    } else {
      parts.push({ text: chip.text, color: colour(chip.color) })
    }
  })
  return parts
}
