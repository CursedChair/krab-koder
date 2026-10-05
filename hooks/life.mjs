// Pure behaviour code: where Clawd walks and what he looks like.
// It never calls Claude Code, so plain node can test it.

export const TICK_MS = 250
export const SLEEP_AFTER_MS = 60_000
export const WAVE_MS = 3_900
export const TOOL_MS = 3_000
export const WAKE_MS = 1_500
// One pass of each recorded animation: the gym routine is 5.7 seconds, the flag clip 4.4 (shown twice)
export const GYM_MS = 5_700
export const FLAG_MS = 8_800
export const ALERT_MS = 7_000
export const BEDTIME_MS = 2_400
// Safety stop: if the end of a compaction is never heard, he stops crumpling after this long
export const COMPACT_MAX_MS = 120_000

// How long each one-off reaction plays (they match the drawings' lengths)
export const EVENT_MS = {
  hello: 3_500,
  bye: 3_000,
  folder: 3_200,
  house: 4_500,
  stamp: 2_800,
  cheer: 2_800,
  facepalm: 3_000,
  ship: 3_200,
  rocket: 3_400,
  browse: 3_600,
  trophy: 4_000,
  yoyo: 3_600,
  juggle: 4_000,
  stretch: 3_200,
  phone: 4_500,
  coffee: 4_500,
  game: 4_500,
  gum: 4_200,
  music: 4_500,
  readbook: 5_000,
  startled: 1_800,
  blush: 2_600,
  nervous: 2_600,
  flinch: 1_800,
  camera: 2_600,
  tapfoot: 3_200,
  yawn: 3_200,
  unbox: 3_400,
  magnify: 2_800,
  mail: 3_000,
  risky: 2_800,
  listen: 3_200,
  pop: 2_600,
  oops: 2_800,
  glitch: 4_000,
  peek: 3_600,
  shrug: 2_600,
  plan: 3_200,
  auto: 2_400,
  ask: 2_800,
  send: 3_600,
  receive: 3_600,
  present: 2_800,
  shrink: 3_600,
  buff: 4_200,
  ascend: 4_400,
  fall: 3_600,
  firstsnow: 4_000,
}

export const TIRED_AT = 50
export const STRAINED_AT = 80
export const CRITICAL_AT = 95

// How long he rests between walks: 20 to 51 steps of the clock
export const REST_MIN_TICKS = 20
export const REST_SPREAD_TICKS = 32

// Ticks to wait between steps: a fuller context window means a slower walk.
const STEP_EVERY = { unknown: 1, happy: 1, tired: 2, strained: 3, critical: 1 }

// Seconds he takes to cross one column at this mood
export function secondsPerColumn(mood) {
  return (TICK_MS / 1000) * (STEP_EVERY[mood] ?? 1)
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const SHELL_TOOLS = new Set(['Bash', 'PowerShell'])

export function moodFor(percent) {
  if (typeof percent !== 'number' || Number.isNaN(percent)) return 'unknown'
  if (percent >= CRITICAL_AT) return 'critical'
  if (percent >= STRAINED_AT) return 'strained'
  if (percent >= TIRED_AT) return 'tired'
  return 'happy'
}

export function toolKind(name) {
  if (EDIT_TOOLS.has(name)) return 'edit'
  if (SHELL_TOOLS.has(name)) return 'shell'
  return 'look'
}

export function createLife() {
  return { x: 0, dir: 1, mode: 'rest', restTicks: 8, target: null, tick: 0, blinkTicks: 0 }
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value))
}

function pickTarget(life, maxX, rand) {
  const dir = life.x <= 0 ? 1 : life.x >= maxX ? -1 : life.dir
  const distance = 9 + Math.floor(rand() * 22)
  const target = clamp(life.x + dir * distance, 0, maxX)
  if (Math.abs(target - life.x) < 4) return { ...life, dir: -dir, restTicks: 4, target: null }
  return { ...life, dir, mode: 'walk', target }
}

// ctx: { maxX, mood, turnRunning, asleep, rand }
export function stepLife(life, ctx) {
  const tick = life.tick + 1
  const blinkTicks = life.blinkTicks > 0 ? life.blinkTicks - 1 : ctx.rand() < 0.04 ? 1 : 0
  const x = clamp(life.x, 0, Math.max(0, ctx.maxX))
  const base = { ...life, x, tick, blinkTicks }

  const isFrozen = ctx.asleep || ctx.turnRunning || ctx.mood === 'critical' || ctx.maxX <= 0
  if (isFrozen) return { ...base, mode: 'rest', target: null }

  if (base.mode === 'rest') {
    if (base.restTicks > 0) return { ...base, restTicks: base.restTicks - 1 }
    return pickTarget(base, ctx.maxX, ctx.rand)
  }

  const every = STEP_EVERY[ctx.mood] ?? 1
  if (tick % every !== 0) return base
  const nextX = x + base.dir
  const arrived = nextX === base.target || nextX <= 0 || nextX >= ctx.maxX
  if (!arrived) return { ...base, x: nextX }
  return { ...base, x: nextX, mode: 'rest', target: null, restTicks: REST_MIN_TICKS + Math.floor(ctx.rand() * REST_SPREAD_TICKS) }
}

// Which of the sixteen looks Clawd has right now. Each look has an idle and a running version.
// Gym and flag are single recorded routines: they have no running version, so he stands still for them
// The limit counts as reached from here
export const LIMIT_REACHED_AT = 100

export const SINGLE_LOOKS = new Set(['gym', 'flag', 'bedtime', 'compact', 'limit'])

export const STATES = ['calm', 'tired', 'strained', 'critical', 'think', 'edit', 'shell', 'look', 'done', 'task', 'compact', 'asleep', 'bedtime', 'gym', 'flag', 'clock', 'calendar', 'limit',
  'permission', 'asking', 'shrug', 'oops', 'glitch', 'stamp', 'pop', 'peek', 'house', 'hello', 'bye', 'folder', 'plan', 'auto', 'ask', 'send', 'receive', 'present', 'shrink', 'buff', 'ascend', 'fall', 'firstsnow',
  'cheer', 'facepalm', 'ship', 'rocket', 'browse', 'trophy', 'yoyo', 'juggle', 'stretch',
  'phone', 'coffee', 'game', 'gum', 'music', 'readbook', 'startled', 'blush', 'nervous', 'flinch', 'camera', 'tapfoot', 'yawn', 'unbox', 'magnify', 'mail', 'risky', 'listen']

// ctx: { mood, turnRunning, asleep, sleepAgeMs, tool, toolAgeMs, doneAgeMs, wakeAgeMs, gymAgeMs, flagAgeMs, alertAgeMs,
//        alertState, limit, waiting, events }
// waiting: 'permission' | 'asking' while Claude waits on your answer, else null
// events: { hello, bye, ... } how long ago each one-off reaction started (missing or negative: not playing)
// limit: { state: 'clock' | 'calendar', percent } when a plan limit is near, else null
// alertState: 'clock' | 'calendar', for the few seconds after a limit reaches the alert level
export function stateFor(ctx) {
  // Compacting the chat is the one thing that beats everything: he is busy crumpling it up
  if (ctx.compacting) return 'compact'
  // Falling asleep takes a moment: he gets into bed first, then he sleeps
  if (ctx.asleep) return ctx.sleepAgeMs < BEDTIME_MS ? 'bedtime' : 'asleep'
  if (ctx.wakeAgeMs < WAKE_MS) return 'wake'
  // A limit that has run out beats everything but sleep and compacting: he is out cold until it resets
  if (ctx.limit && ctx.limit.percent >= LIMIT_REACHED_AT) return 'limit'
  // Claude is stuck until you answer, so that shows over everything else
  if (ctx.waiting) return ctx.waiting
  // Events beat everything else; if several are playing, the newest one wins
  const playing = [
    ['flag', ctx.flagAgeMs, FLAG_MS],
    ['gym', ctx.gymAgeMs, GYM_MS],
    [ctx.alertState, ctx.alertAgeMs, ALERT_MS],
    ...Object.entries(ctx.events ?? {}).map(([name, age]) => [name, age, EVENT_MS[name] ?? 0]),
  ].filter(([state, age, window]) => state && age >= 0 && age < window)
  if (playing.length) return playing.sort((a, b) => a[1] - b[1])[0][0]
  // A nearly spent limit outranks a nearly full context: /compact can fix one but not the other
  const isLimitUrgent = Boolean(ctx.limit) && ctx.limit.percent >= 95
  if (ctx.mood === 'critical' && !isLimitUrgent) return 'critical'
  const isToolActive = Boolean(ctx.tool) && ctx.toolAgeMs < TOOL_MS
  if (ctx.turnRunning && isToolActive) return toolKind(ctx.tool)
  if (ctx.turnRunning) return 'think'
  if (ctx.doneAgeMs < WAVE_MS) return 'done'
  // Claude has handed work to background tasks and is waiting for them to come back
  if (ctx.tasks > 0) return 'task'
  if (ctx.limit) return ctx.limit.state
  if (ctx.mood === 'strained' || ctx.mood === 'tired') return ctx.mood
  return 'calm'
}

// ctx adds two optional overrides for previews and tests: state, gait ('idle' or 'run')
export function poseFor(life, ctx) {
  const t = life.tick
  const flip = t % 2 === 0
  const slow = Math.floor(t / 2) % 2 === 0
  const state = ctx.state ?? stateFor(ctx)
  const isRun = (ctx.gait ?? (life.mode === 'walk' ? 'run' : 'idle')) === 'run' && !SINGLE_LOOKS.has(state)
  const step = ctx.mood === 'tired' ? slow : flip

  let eyes = life.blinkTicks > 0 ? 'closed' : 'open'
  let prop = null
  let hands = isRun ? (step ? [4, 5] : [5, 4]) : slow ? [4, 4] : [5, 5]
  let legs = isRun ? (step ? [1, 2, 1, 2] : [2, 1, 2, 1]) : [2, 2, 2, 2]
  let dx = 0
  let dy = 0
  let dust = 0
  let barYOverride = null
  let throwSideOverride = 1

  if (!isRun && eyes === 'open') {
    const phase = t % 32
    if (phase >= 12 && phase < 16) eyes = 'left'
    else if (phase >= 20 && phase < 24) eyes = 'right'
  }
  if (ctx.mood === 'tired' && !isRun) hands = [5, 5]
  if (ctx.mood === 'strained') {
    legs = isRun ? (flip ? [1, 0, 1, 0] : [0, 1, 0, 1]) : [1, 1, 1, 1]
    hands = [5, 5]
    dx = t % 2
  }
  if (isRun && life.mode === 'walk' && state === 'calm') dust = -life.dir

  switch (state) {
    case 'limit':
      eyes = 'closed'
      hands = [5, 5]
      break
    case 'asleep':
      eyes = 'closed'
      prop = ['sleepwear', 'zzz']
      legs = [1, 1, 1, 1]
      dy = 1
      dx = 0
      hands = Math.floor(t / 3) % 2 === 0 ? [5, 5] : [4, 4]
      break
    case 'bedtime': {
      // Nightcap first, then he lowers himself and his eyes close, then the blanket comes up
      const progress = Math.min(1, Math.max(0, (ctx.sleepAgeMs ?? 0) / BEDTIME_MS))
      hands = Math.floor(t / 3) % 2 === 0 ? [4, 4] : [5, 5]
      if (progress > 0.4) prop = 'sleepwear'
      if (progress > 0.55) {
        dy = 1
        legs = [1, 1, 1, 1]
      }
      if (progress > 0.7) eyes = 'closed'
      break
    }
    case 'compact':
      // Squeezing the paper: hands pump together and apart, eyes screwed up
      hands = flip ? [2, 2] : [3, 3]
      eyes = flip ? 'closed' : 'open'
      dx = t % 2
      break
    case 'wake':
      prop = 'wake'
      eyes = flip ? 'closed' : 'open'
      hands = slow ? [1, 1] : [3, 3]
      legs = [2, 2, 2, 2]
      dx = 0
      break
    case 'critical':
      prop = 'alert'
      hands = flip ? [2, 2] : [3, 3]
      dx = isRun ? t % 2 : 0
      break
    case 'think':
    case 'task':
      eyes = 'up'
      prop = 'dots'
      if (!isRun) hands = [4, 4]
      break
    case 'edit':
      prop = 'pencil'
      hands = [4, flip ? 4 : 5]
      break
    case 'shell':
      prop = 'terminal'
      hands = [5, 5]
      break
    case 'gym': {
      // A press every three seconds: rest, dip, drive up, hold at the top, lower, rest
      const rise = [4, 4, 5, 3, 1, 0, 0, 0, 1, 3, 4, 4]
      const barY = rise[t % rise.length]
      prop = 'barbell'
      barYOverride = barY
      hands = [barY, barY]
      if (t % rise.length === 2) {
        dy = 1
        legs = [1, 1, 1, 1]
      }
      break
    }
    case 'flag':
      prop = 'flag'
      hands = [4, 3]
      dx = [0, 0, -1, -1, 0, 1][t % 6] ?? 0
      break
    case 'clock':
      prop = ['clock', 'sweat']
      eyes = Math.floor(t / 4) % 2 === 0 ? 'down' : 'left'
      hands = [5, 5]
      break
    case 'calendar':
      prop = ['calendar', 'sweat']
      eyes = Math.floor(t / 4) % 2 === 0 ? 'down' : 'left'
      hands = [5, 5]
      break
    case 'look':
      prop = 'book'
      eyes = Math.floor(t / 4) % 2 === 0 ? 'downLeft' : 'downRight'
      hands = [5, 5]
      break
    case 'done': {
      // Arms pump in turn, and the pieces fly from whichever hand is up
      const right = Math.floor(t / 6) % 2 === 0
      hands = right ? [4, flip ? 0 : 1] : [flip ? 0 : 1, 4]
      prop = 'confetti'
      throwSideOverride = right ? 1 : -1
      if (isRun && flip) {
        dy = -1
        legs = [1, 1, 1, 1]
      }
      break
    }
  }

  const isWeary = ctx.mood === 'tired' || ctx.mood === 'strained'
  if (!prop && isWeary && state !== 'asleep' && t % 8 < 4) prop = 'sweat'

  return { eyes, hands, legs, prop, tick: t, dx, dy, dust, barY: barYOverride, throwSide: throwSideOverride, percent: ctx.limit?.percent ?? 0 }
}

// How big each model family is, smallest first; a model id names its family (claude-opus-5-5, claude-fable-5-1)
const MODEL_TIERS = [['haiku', 0], ['sonnet', 1], ['opus', 2], ['fable', 3]]
export function modelTier(id) {
  const name = String(id ?? '').toLowerCase()
  return MODEL_TIERS.find(([family]) => name.includes(family))?.[1] ?? null
}

// Which animation a model switch plays: rising to Fable, falling from it, bulking up to Opus (or any step up),
// or shrinking into glasses for a step down. A model it does not recognise gets the gym routine.
export function modelSwitchLook(from, to) {
  const before = modelTier(from)
  const after = modelTier(to)
  if (after === null) return 'gym'
  if (after === 3) return 'ascend'
  if (before === 3) return 'fall'
  if (after === 2 || (before !== null && before < after)) return 'buff'
  return 'shrink'
}

// The line shown while Gym Clawd lifts: which model, and what the switch costs when the cache was warm
export function modelNote(e) {
  const short = (id) => String(id ?? '').replace(/^claude-/, '')
  const base = `switched to ${short(e.to_model)}`
  if (e.prompt_cache_warm && typeof e.estimated_cache_write_usd === 'number' && e.estimated_cache_write_usd >= 0.01) {
    return `${base} · re-reading your chat costs about $${e.estimated_cache_write_usd.toFixed(2)}`
  }
  return base
}

const LIMIT_LABELS = { five_hour: '5h', seven_day: '7d' }
const MOOD_TEXT = { tired: 'filling up', strained: 'getting full', critical: 'almost full' }

// snapshot: { context?, rateLimits?, cost? } as session.measure reports them
export function readout(snapshot) {
  if (!snapshot) return 'waiting for the first reply'
  const parts = []
  const percent = snapshot.context?.percent
  parts.push(typeof percent === 'number' ? `context ${Math.round(percent)}%` : 'context —')
  for (const limit of snapshot.rateLimits ?? []) {
    parts.push(`${LIMIT_LABELS[limit.kind] ?? limit.kind} ${Math.round(limit.percentUsed)}%`)
  }
  if (typeof snapshot.cost?.usd === 'number') parts.push(`$${snapshot.cost.usd.toFixed(2)}`)
  const mood = MOOD_TEXT[moodFor(percent)]
  if (mood) parts.push(mood)
  return parts.join(' · ')
}
