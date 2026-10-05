// Runs the real mod against a pretend Claude Code. Run with: node --test tests/register.test.mjs
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { register } from '../hooks/register.mjs'

const HOUR = 60 * 60 * 1000
const START = new Date(2026, 9, 7, 12, 0, 0).getTime()
const realNow = Date.now
afterEach(() => {
  Date.now = realNow
})

// A pretend Claude Code: collects the mod's hooks, runs them on request, and records what it asked for
function harness({ store = {}, surface = 'desktop', columns = 64, web = null } = {}) {
  let now = START
  Date.now = () => now
  const hooks = []
  const timers = []
  const invalidations = []
  const toasts = []
  const saved = { outfit: 'off', ...store }
  const on = (event, a, b) => hooks.push({ event, matcher: b ? a : null, fn: b ?? a })
  register(on)
  const $ = {
    command: { register: async () => {} },
    session: { id: async () => 'this-session' },
    ...(web ? { http: { fetch: async (url) => web(url) } } : {}),
    clock: { every: (ms, fn) => timers.push(fn) },
    store: {
      get: async (key) => saved[key],
      set: async (key, value) => {
        saved[key] = structuredClone(value)
      },
      delete: async (key) => {
        delete saved[key]
      },
      keys: async () => Object.keys(saved),
    },
    ui: {
      invalidate: (site) => invalidations.push(site),
      toast: (text) => toasts.push(text),
      resolve: () => ({
        Box: (props) => ({ box: props }),
        Text: (props) => ({ text: props.children[0] }),
        Svg: (props) => ({ svg: props.source, alt: props.alt, isInteractive: props.isInteractive }),
        Raster: (props) => ({ raster: props }),
      }),
    },
  }
  const fire = async (event, e = {}, below = async (x) => (x.component ? undefined : x)) => {
    let result
    // A 'classic.*' hook hears every classic event, as the engine's own glob does
    const hears = (name) => name === event || (name.endsWith('.*') && event.startsWith(name.slice(0, -1)))
    for (const hook of hooks.filter((h) => hears(h.event))) {
      if (hook.matcher && !Object.entries(hook.matcher).every(([k, v]) => e[k] === v)) continue
      // With no other mods installed, nothing else draws in the band; other events just pass through
      result = await hook.fn($, e, below)
    }
    return result
  }
  const render = async () => fire('ui.render', { component: 'AbovePrompt', surface, props: { bodyColumns: columns } })
  const tick = async () => {
    for (const fn of timers) await fn()
  }
  const api = {
    saved,
    invalidations,
    toasts,
    fire,
    render,
    tick,
    advance: (ms) => {
      now += ms
    },
    now: () => now,
    start: () => fire('session.start', {}),
    async look() {
      const tree = await render()
      const svg = tree.box.children[0].svg ?? ''
      // On the desktop the readout is drawn inside the picture; its words are the text elements
      const words = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].replace(/&amp;/g, '&'))
      return { svg, line: words.join(' '), words, tree }
    },
  }
  return api
}

const measure = (five, week, extra = {}) => ({
  context: { percent: 20, window: 1_000_000 },
  rateLimits: [
    ...(five ? [{ kind: 'five_hour', percentUsed: five.percent, resetsAt: new Date(five.resetsAtMs).toISOString() }] : []),
    ...(week ? [{ kind: 'seven_day', percentUsed: week, resetsAt: new Date(START + 100 * HOUR).toISOString() }] : []),
  ],
  cost: { usd: 1.5 },
  changed: ['context'],
  ...extra,
})

// Colours that only one look uses
const GYM_BAR = '#1F4478' // the headband
const FLAG_POLE = 'fill="#FFFFFF"' // the white squares of the checkered flag
const CLOCK = '#C9C6BC'
const CALENDAR_HEADER = 'fill="#C4553D"'
const NOTEPAD = '#3A3A37'

test('he draws on the desktop as an animated SVG and on the terminal as cells', async () => {
  const desktop = harness()
  await desktop.start()
  const { svg, line } = await desktop.look()
  assert.match(svg, /^<svg /)
  assert.equal(line, 'waiting for the first reply')
  const tree = await desktop.render()
  assert.equal(tree.box.children[0].isInteractive, true)

  const terminal = harness({ surface: 'terminal' })
  await terminal.start()
  const cells = (await terminal.render()).box.children[0].raster
  assert.equal(cells.columns, 64)
  assert.equal(cells.rows, 5)
  assert.ok(cells.cells.length > 100)
})

test('a band too narrow for him draws nothing', async () => {
  const narrow = harness({ columns: 10 })
  await narrow.start()
  assert.equal(await narrow.render(), undefined)
})

test('switching up to Opus bulks him up, with a note, for one pass of the animation', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.PostModelSwitch', {
    source: 'command',
    to_model: 'claude-opus-5-5',
    from_model: 'claude-sonnet-5-5',
    prompt_cache_warm: true,
    estimated_cache_write_usd: 0.134,
  })
  const during = await h.look()
  assert.match(during.svg, /data-look="buff"/)
  assert.equal(during.line, 'switched to opus-5-5 · re-reading your chat costs about $0.13')
  h.advance(4_500)
  await h.tick()
  const after = await h.look()
  assert.doesNotMatch(after.svg, /data-look="buff"/, 'it plays once')
  assert.notEqual(after.line, during.line, 'and the note goes with it')
})

test('each model switch picks its animation: ascend to Fable, fall from it, bulk up to Opus, shrink to Sonnet', async () => {
  const cases = [
    ['claude-opus-5-5', 'claude-fable-5-1', 'ascend'],
    ['claude-sonnet-5-5', 'claude-fable-5-1', 'ascend'],
    ['claude-fable-5-1', 'claude-opus-5-5', 'fall'],
    ['claude-fable-5-1', 'claude-sonnet-5-5', 'fall'],
    ['claude-sonnet-5-5', 'claude-opus-5-5', 'buff'],
    ['claude-opus-5-5', 'claude-sonnet-5-5', 'shrink'],
    ['claude-opus-5-5', 'claude-haiku-4-5', 'shrink'],
    ['claude-haiku-4-5', 'claude-sonnet-5-5', 'buff'],
  ]
  for (const [from_model, to_model, look] of cases) {
    const h = harness()
    await h.start()
    await h.fire('classic.PostModelSwitch', { source: 'picker', from_model, to_model })
    assert.equal(await lookName(h), look, `${from_model} to ${to_model}`)
  }
  // A model it does not know still gets the gym routine
  const h = harness()
  await h.start()
  await h.fire('classic.PostModelSwitch', { source: 'picker', from_model: 'x', to_model: 'some-other-model' })
  assert.ok((await h.look()).svg.includes(GYM_BAR))
})

test('changing the effort level sends him to the gym, lifting faster the higher it is; the first reading does not', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.Stop', { effort: { level: 'medium' } })
  assert.ok(!(await h.look()).svg.includes(GYM_BAR), 'just learning the level is not a change')
  await h.fire('classic.Stop', { effort: { level: 'low' } })
  const slow = await h.look()
  assert.ok(slow.svg.includes(GYM_BAR))
  assert.equal(slow.line, 'effort low')
  h.advance(6_000)
  await h.fire('classic.Stop', { effort: { level: 'max' } })
  const fast = await h.look()
  const period = (svg) => Number(svg.match(/attributeName="visibility" dur="([\d.]+)s"/)[1])
  assert.ok(period(fast.svg) < period(slow.svg), 'max lifts faster than low')
})

test('background tasks: the spinning spark shows while Claude waits on them, and goes away when none are left', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('turn.complete', {})
  await h.fire('classic.Stop', { background_tasks: [{ id: 'a', type: 'subagent', status: 'running', description: 'research' }] })
  h.advance(5_000)
  await h.tick()
  assert.ok((await h.look()).svg.includes('#D97757'), 'the spark is drawn while a task runs')
  h.advance(120_000)
  await h.tick()
  assert.ok((await h.look()).svg.includes('#D97757'), 'he stays awake and waiting, even after a long quiet spell')
  await h.fire('classic.Stop', { background_tasks: [] })
  await h.tick()
  assert.ok(!(await h.look()).svg.includes('#D97757'), 'the spark goes once nothing is left')
})

test('restoring the model when you resume a chat is not a switch', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.PostModelSwitch', { source: 'resume', to_model: 'claude-opus-5-5', from_model: 'x' })
  assert.ok(!(await h.look()).svg.includes(GYM_BAR))
})

test('a model switch wakes a sleeping Clawd first', async () => {
  const h = harness()
  await h.start()
  h.advance(61_000)
  await h.tick()
  assert.ok((await h.look()).svg.includes('#5B63C8'), 'sleeping: nightcap')
  await h.fire('classic.PostModelSwitch', { source: 'picker', to_model: 'claude-haiku-4-5', from_model: 'claude-opus-5-5' })
  assert.notEqual(await lookName(h), 'shrink', 'waking up comes first')
  h.advance(1_700)
  assert.equal(await lookName(h), 'shrink', 'then he shrinks')
})

test('the five-hour limit resetting waves the flag, once', async () => {
  const h = harness()
  await h.start()
  const resetsAtMs = START + HOUR
  await h.fire('session.measure', measure({ percent: 88, resetsAtMs }, 20))
  await h.tick()
  assert.ok(!(await h.look()).svg.includes(FLAG_POLE), 'no flag before the reset')

  h.advance(HOUR + 1_000)
  await h.tick()
  h.advance(2_000)
  await h.tick()
  const during = await h.look()
  assert.ok(during.svg.includes(FLAG_POLE), 'flag should wave')
  assert.equal(during.line, '5-hour limit reset: fresh start')
  assert.equal(h.saved.fiveHour.celebratedFor, resetsAtMs)

  h.advance(10_000)
  await h.tick()
  assert.ok(!(await h.look()).svg.includes(FLAG_POLE), 'flag is over')
  h.advance(60_000)
  await h.tick()
  assert.ok(!(await h.look()).svg.includes(FLAG_POLE), 'and does not come back')
})

test('a reset that happened while the session was closed still gets one flag', async () => {
  const resetsAtMs = START - HOUR
  const h = harness({ store: { fiveHour: { percentUsed: 92, resetsAtMs, celebratedFor: null } } })
  await h.start()
  await h.tick()
  h.advance(2_000)
  assert.ok((await h.look()).svg.includes(FLAG_POLE))
  assert.equal(h.saved.fiveHour.celebratedFor, resetsAtMs)
})

test('a reset that was already celebrated is not celebrated again in the next session', async () => {
  const resetsAtMs = START - HOUR
  const h = harness({ store: { fiveHour: { percentUsed: 92, resetsAtMs, celebratedFor: resetsAtMs } } })
  await h.start()
  await h.tick()
  assert.ok(!(await h.look()).svg.includes(FLAG_POLE))
})

test('a window you barely used does not get a flag', async () => {
  const h = harness()
  await h.start()
  await h.fire('session.measure', measure({ percent: 12, resetsAtMs: START + HOUR }, 5))
  h.advance(HOUR + 5_000)
  await h.tick()
  assert.ok(!(await h.look()).svg.includes(FLAG_POLE))
})

test('nearing the five-hour limit shows the clock, and the weekly limit shows the calendar', async () => {
  const five = harness()
  await five.start()
  await five.fire('session.measure', measure({ percent: 86, resetsAtMs: START + 3 * HOUR }, 20))
  five.advance(1_000)
  const clock = (await five.look()).svg
  assert.ok(clock.includes(CLOCK), 'clock glass')
  assert.ok(!clock.includes(CALENDAR_HEADER))

  const week = harness()
  await week.start()
  await week.fire('session.measure', measure({ percent: 30, resetsAtMs: START + 3 * HOUR }, 91))
  week.advance(1_000)
  const calendar = (await week.look()).svg
  assert.ok(calendar.includes(CALENDAR_HEADER), 'calendar header')
  assert.ok(!calendar.includes(CLOCK))
})

test('the warning never hides what Claude is doing', async () => {
  const h = harness()
  await h.start()
  await h.fire('session.measure', measure({ percent: 90, resetsAtMs: START + 3 * HOUR }, 20))
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'Edit' })
  const working = (await h.look()).svg
  assert.ok(working.includes(NOTEPAD), 'he is writing')
  assert.ok(!working.includes(CLOCK))
  await h.fire('turn.complete', {})
  h.advance(4_000)
  assert.ok((await h.look()).svg.includes(CLOCK), 'back to the clock once Claude is done')
})

test('the clock is only redrawn when the limit moves a visible step', async () => {
  const h = harness()
  await h.start()
  await h.fire('session.measure', measure({ percent: 86, resetsAtMs: START + 3 * HOUR }, 20))
  // The readout shows the exact numbers, so compare the figure alone: everything before the row of pills
  const figure = async () => (await h.look()).svg.split('<g font-family')[0]
  const first = await figure()
  await h.fire('session.measure', measure({ percent: 87, resetsAtMs: START + 3 * HOUR }, 20))
  assert.equal(await figure(), first, 'same clock at 86% and 87%')
  await h.fire('session.measure', measure({ percent: 93, resetsAtMs: START + 3 * HOUR }, 20))
  assert.notEqual(await figure(), first, 'different clock at 93%')
})

test('/krab off hides him and /krab on brings him back', async () => {
  const h = harness()
  await h.start()
  assert.deepEqual(await h.fire('command.run', { command: 'krab', args: 'off' }), { text: 'Krab is off' })
  assert.equal(await h.render(), undefined)
  assert.deepEqual(await h.fire('command.run', { command: 'krab', args: 'on' }), { text: 'Krab is on' })
  assert.ok(await h.render())
  assert.deepEqual(await h.fire('command.run', { command: 'krab', args: 'sideways' }), { text: 'Use /krab on, off, small, normal, big, outfit auto|off|<name>, weather auto|off|<kind>, time auto|night|sunrise|sunset|day, sky auto|aurora|meteors|bloodmoon|supermoon|harvest|ufo|comet|eclipse, settings, birthday|gf-birthday|bf-birthday|anniversary <date>, location <city>, or holidays <codes>' })
})

test('the desktop picture is only redrawn when his look changes, not on every tick', async () => {
  const h = harness()
  await h.start()
  await h.look()
  const before = h.invalidations.length
  for (let i = 0; i < 6; i++) {
    h.advance(250)
    await h.tick()
  }
  assert.ok(h.invalidations.length - before <= 2, `redrew ${h.invalidations.length - before} times in 6 quiet ticks`)
})

// ---- the 98% alert ----

test('a weekly limit at 98% brings the calendar back, even while Claude is working', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'Edit' })
  assert.ok((await h.look()).svg.includes(NOTEPAD), 'working, no warning yet')
  await h.fire('session.measure', measure({ percent: 40, resetsAtMs: START + 3 * HOUR }, 98))
  h.advance(500)
  const alert = await h.look()
  assert.ok(alert.svg.includes(CALENDAR_HEADER), 'the calendar is back')
  assert.ok(!alert.svg.includes(NOTEPAD), 'instead of the notepad')
  assert.equal(alert.line, 'weekly limit 98% used: nearly out')
  h.advance(8_000)
  await h.fire('tool.call', { tool: 'Edit' })
  const after = await h.look()
  assert.ok(after.svg.includes(NOTEPAD) && !after.svg.includes(CALENDAR_HEADER), 'back to work after the alert')
})

test('97% is only the usual warning, not an alert', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'Edit' })
  await h.fire('session.measure', measure({ percent: 40, resetsAtMs: START + 3 * HOUR }, 97))
  assert.ok((await h.look()).svg.includes(NOTEPAD))
})

test('the alert plays once for a window, and again for the next one', async () => {
  const h = harness()
  await h.start()
  await h.fire('session.measure', measure({ percent: 10, resetsAtMs: START + 3 * HOUR }, 98))
  h.advance(10_000)
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'Edit' })
  await h.fire('session.measure', measure({ percent: 10, resetsAtMs: START + 3 * HOUR }, 99))
  assert.ok(!(await h.look()).svg.includes(CALENDAR_HEADER), 'not announced a second time')
  // the week rolls over and runs out again
  const week = (percent, resetsAtMs) => ({
    ...measure({ percent: 10, resetsAtMs: START + 3 * HOUR }, 0),
    rateLimits: [{ kind: 'seven_day', percentUsed: percent, resetsAt: new Date(resetsAtMs).toISOString() }],
  })
  await h.fire('session.measure', week(98, START + 200 * HOUR))
  assert.ok((await h.look()).svg.includes(CALENDAR_HEADER), 'announced for the new week')
})

test('the five-hour limit at 98% brings the clock back, with its own message', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'Bash' })
  await h.fire('session.measure', measure({ percent: 98.4, resetsAtMs: START + HOUR }, 20))
  const alert = await h.look()
  assert.ok(alert.svg.includes(CLOCK))
  assert.equal(alert.line, '5-hour limit 98% used: nearly out')
})

test('a nearly spent weekly limit shows the calendar even when the context window is nearly full', async () => {
  const h = harness()
  await h.start()
  const full = { ...measure({ percent: 20, resetsAtMs: START + 3 * HOUR }, 96), context: { percent: 97, window: 1_000_000 } }
  await h.fire('session.measure', full)
  h.advance(10_000)
  assert.ok((await h.look()).svg.includes(CALENDAR_HEADER), 'calendar, not the alarm')
  const mild = { ...measure({ percent: 20, resetsAtMs: START + 3 * HOUR }, 85), context: { percent: 97, window: 1_000_000 } }
  await h.fire('session.measure', mild)
  assert.ok(!(await h.look()).svg.includes(CALENDAR_HEADER), 'a mild warning gives way to the context alarm')
})

test('he never walks: the drawing has no slide, whatever he is doing', async () => {
  const h = harness({ surface: 'desktop' })
  await h.start()
  for (let i = 0; i < 200; i++) {
    h.advance(250)
    await h.tick()
  }
  assert.doesNotMatch((await h.look()).svg, /fill="freeze"/)
})

test('/krab outfit picks an outfit, auto follows the date, and a bad name is refused', async () => {
  const h = harness()
  await h.start()
  const plain = (await h.look()).svg
  assert.deepEqual(await h.fire('command.run', { command: 'krab', args: 'outfit halloween' }), { text: 'Krab wears the halloween outfit' })
  const dressed = (await h.look()).svg
  assert.ok(dressed.includes('#3B2A5C'), 'the witch hat is drawn')
  assert.ok(!plain.includes('#3B2A5C'))
  assert.match((await h.fire('command.run', { command: 'krab', args: 'outfit nonsense' })).text, /Use \/krab outfit auto, off, or one of/)
  await h.fire('command.run', { command: 'krab', args: 'outfit off' })
  assert.ok(!(await h.look()).svg.includes('#3B2A5C'))
})

test('auto dresses him for the date', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  const realNow = Date.now
  Date.now = () => Date.parse('2026-12-20T15:00:00')
  try {
    await h.start()
    assert.ok((await h.look()).svg.includes('#C8372D'), 'Santa hat and scarf in December')
  } finally {
    Date.now = realNow
  }
})

test('/krab weather tries out a kind of weather, and the live weather is read from Open-Meteo', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  await h.start()
  assert.match((await h.fire('command.run', { command: 'krab', args: 'weather sunny' })).text, /sunny/)
  assert.ok((await h.look()).svg.includes('#F2C94C'), 'a sun in the corner')
  assert.match((await h.fire('command.run', { command: 'krab', args: 'weather mist' })).text, /Use \/krab weather/)
  await h.fire('command.run', { command: 'krab', args: 'weather storm' })
  assert.ok((await h.look()).svg.includes('#FFF3A8'), 'lightning')
  await h.fire('command.run', { command: 'krab', args: 'weather off' })
  assert.ok(!(await h.look()).svg.includes('#FFF3A8'))
})

test('after dark the strip gets a moon and twinkling stars, and the daytime sun steps aside', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  await h.start()
  await h.fire('command.run', { command: 'krab', args: 'weather sunny' })
  assert.ok((await h.look()).svg.includes('#F2C94C'), 'a sun by day')
  h.advance(10 * HOUR)
  const night = (await h.look()).svg
  assert.ok(night.includes('#F5F0D6'), 'a moon at night')
  assert.ok(!night.includes('#F2C94C'), 'no daytime sun at night')
})

test('/krab time tries out night, sunrise and sunset, and day puts the ordinary sky back', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  await h.start()
  await h.fire('command.run', { command: 'krab', args: 'time night' })
  assert.ok((await h.look()).svg.includes('#F5F0D6'), 'a moon')
  await h.fire('command.run', { command: 'krab', args: 'time sunset' })
  assert.ok((await h.look()).svg.includes('#E8553A'), 'a setting sun')
  await h.fire('command.run', { command: 'krab', args: 'time sunrise' })
  assert.ok((await h.look()).svg.includes('#F9B04A'), 'a rising sun')
  await h.fire('command.run', { command: 'krab', args: 'time day' })
  assert.ok(!(await h.look()).svg.includes('#F9B04A'))
  assert.match((await h.fire('command.run', { command: 'krab', args: 'time dusk' })).text, /Use \/krab time/)
})

test('/krab sky tries the northern lights, meteors and a blood moon at night, and a live weather rainbow follows rain clearing', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  await h.start()
  await h.fire('command.run', { command: 'krab', args: 'sky aurora' })
  assert.ok((await h.look()).svg.includes('#4ADE80'), 'green aurora')
  await h.fire('command.run', { command: 'krab', args: 'sky bloodmoon' })
  assert.ok((await h.look()).svg.includes('#C8392B'), 'a red moon')
  await h.fire('command.run', { command: 'krab', args: 'sky meteors' })
  assert.ok((await h.look()).svg.includes('keyTimes="0;.16;1"'), 'shooting stars')
  assert.match((await h.fire('command.run', { command: 'krab', args: 'sky dragon' })).text, /Use \/krab sky/)
  await h.fire('command.run', { command: 'krab', args: 'sky ufo' })
  assert.ok((await h.look()).svg.includes('#A8ADB8'), 'a flying saucer')
  await h.fire('command.run', { command: 'krab', args: 'sky comet' })
  assert.ok((await h.look()).svg.includes('#CFE8FF'), "a comet's tail")
  await h.fire('command.run', { command: 'krab', args: 'sky auto' })
  await h.fire('command.run', { command: 'krab', args: 'weather rainbow' })
  assert.ok((await h.look()).svg.includes('#8A5CC8'), 'a rainbow')
})

test('the northern lights show only when NOAA says there is real aurora activity, the sky is clear and it is night', async () => {
  const noaa = (kp) => JSON.stringify([{ time_tag: 'x', Kp: kp }])
  const weather = (code) => JSON.stringify({ current: { weather_code: code, wind_speed_10m: 5, wind_gusts_10m: 8, is_day: 0 } })
  const web = (kp, code) => (url) => (url.includes('swpc.noaa.gov') ? { ok: true, text: noaa(kp) } : { ok: true, text: weather(code) })
  const aurora = async (kp, code) => {
    const h = harness({ store: { outfit: 'auto', place: { name: 'Somewhere north', latitude: 55, longitude: -100 } }, web: web(kp, code) })
    await h.start()
    await h.fire('command.run', { command: 'krab', args: 'time night' })
    await h.tick()
    return (await h.look()).svg.includes('#4ADE80')
  }
  assert.equal(await aurora(6, 0), true, 'a strong storm, clear sky')
  assert.equal(await aurora(3, 0), false, 'ordinary activity is not enough')
  assert.equal(await aurora(1, 0), false, 'a quiet night has no aurora')
  assert.equal(await aurora(7, 3), false, 'a strong storm but clouds')
  // Too far south to see the lights, even in a storm on a clear night
  const south = harness({ store: { outfit: 'auto', place: { name: 'Somewhere south', latitude: 30, longitude: -90 } }, web: web(8, 0) })
  await south.start()
  await south.fire('command.run', { command: 'krab', args: 'time night' })
  await south.tick()
  assert.equal((await south.look()).svg.includes('#4ADE80'), false, 'too far from the poles')
  // Trying the weather and the time alone shows no aurora; /krab sky aurora is the way to see one
  const quiet = harness({ store: { outfit: 'auto' } })
  await quiet.start()
  await quiet.fire('command.run', { command: 'krab', args: 'weather sunny' })
  await quiet.fire('command.run', { command: 'krab', args: 'time night' })
  assert.equal((await quiet.look()).svg.includes('#4ADE80'), false)
})

test('the weather calls for gear: a parka in extreme cold, a heat wave look, a scarf in a blizzard; holidays still win', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  await h.start()
  await h.fire('command.run', { command: 'krab', args: 'weather cold' })
  assert.ok((await h.look()).svg.includes('#2F5FA8'), 'the parka')
  await h.fire('command.run', { command: 'krab', args: 'weather heat' })
  assert.ok((await h.look()).svg.includes('#E23A4E'), 'the swim shorts')
  await h.fire('command.run', { command: 'krab', args: 'weather blizzard' })
  assert.ok((await h.look()).svg.includes('#5A6475'), 'the blizzard coat')
  await h.fire('command.run', { command: 'krab', args: 'weather fog' })
  const fogSvg = (await h.look()).svg
  assert.ok(fogSvg.includes('#C3C9D4') && !fogSvg.includes('#2F5FA8'), 'fog is a haze, not a costume')
  // Christmas gear is not swapped for a parka
  const h2 = harness({ store: { outfit: 'auto' } })
  await h2.start()
  h2.advance(1000 * 60 * 60 * 24 * 62)
  await h2.fire('command.run', { command: 'krab', args: 'weather cold' })
  assert.ok(!(await h2.look()).svg.includes('#2F5FA8'), 'a holiday outfit wins over the weather')
})

test('/krab sky tries a supermoon, the Harvest Moon and a solar eclipse', async () => {
  const h = harness({ store: { outfit: 'auto' } })
  await h.start()
  await h.fire('command.run', { command: 'krab', args: 'sky harvest' })
  assert.ok((await h.look()).svg.includes('#F2A33A'), 'an orange Harvest Moon')
  await h.fire('command.run', { command: 'krab', args: 'sky supermoon' })
  assert.ok((await h.look()).svg.includes('#FFFBE8'), 'a big bright supermoon')
  await h.fire('command.run', { command: 'krab', args: 'sky eclipse' })
  const eclipse = (await h.look()).svg
  assert.ok(eclipse.includes('#0B0B12') && eclipse.includes('clip-path="url(#suncover'), 'the moon slides over the sun')
  await h.fire('command.run', { command: 'krab', args: 'sky bloodmoon' })
  const blood = (await h.look()).svg
  assert.ok(blood.includes('#F5F0D6') && blood.includes('clip-path="url(#moonshadow'), "the earth's shadow slides over a full moon")
})

// ---- reactions to Claude Code's events ----

const lookName = async (h) => (await h.look()).svg.match(/data-look="(\w+)"/)?.[1]

test('a permission dialog holds up the "?" sign until it is answered, and a no gets a shrug', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('classic.PermissionRequest', { tool_name: 'Bash', tool_input: {} })
  assert.equal(await lookName(h), 'permission')
  h.advance(30_000)
  assert.equal(await lookName(h), 'permission', 'it waits as long as you do')
  await h.fire('classic.PermissionDenied', { tool_name: 'Bash', reason: 'no' })
  assert.equal(await lookName(h), 'shrug')
  // Answering "no" in the dialog itself: the tool call comes back refused
  h.advance(3_000)
  let refuse
  const refused = new Promise((resolve) => (refuse = resolve))
  const call = h.fire('tool.call', { tool: 'Bash', input: {} }, () => refused)
  await h.fire('classic.PermissionRequest', { tool_name: 'Bash', tool_input: {} })
  assert.equal(await lookName(h), 'permission')
  refuse({ deny: 'The user said no' })
  await call
  assert.equal(await lookName(h), 'shrug')
  h.advance(3_000)
  assert.equal(await lookName(h), 'think', 'the shrug plays once')
})

test("Claude's questions show a bubble with how many there are, until they are answered", async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  const questions = [{ question: 'a' }, { question: 'b' }, { question: 'c' }]
  // The tool call is still waiting on you while the bubble shows
  let answer
  const answered = new Promise((resolve) => (answer = resolve))
  const call = h.fire('tool.call', { tool: 'AskUserQuestion', input: { questions } }, () => answered)
  const seen = await h.look()
  assert.match(seen.svg, /data-look="asking"/)
  assert.ok(seen.svg.includes('#D97757'), 'the count badge')
  answer({ result: { answers: {} } })
  await call
  assert.notEqual(await lookName(h), 'asking', 'answered: back to Claude working')
})

test('helper agents show up as little Clawds while they work, and one waves goodbye when it finishes', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.SubagentStart', { agent_id: 'a1', agent_type: 'Explore' })
  await h.fire('classic.SubagentStart', { agent_id: 'a2', agent_type: 'Explore' })
  const hats = (svg) => (svg.match(/fill="#E7B04A"/g) ?? []).length
  const two = hats((await h.look()).svg)
  await h.fire('classic.SubagentStop', { agent_id: 'a1', agent_type: 'Explore' })
  assert.equal(hats((await h.look()).svg), two, 'one still working, one leaving')
  h.advance(2_000)
  await h.tick()
  assert.equal(hats((await h.look()).svg), two / 2, 'the one that left is gone')
})

test('switching permission mode plays that mode once; the first reading does not', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.UserPromptSubmit', { permission_mode: 'default' })
  assert.notEqual(await lookName(h), 'ask', 'just learning the mode is not a switch')
  await h.fire('classic.UserPromptSubmit', { permission_mode: 'plan' })
  assert.equal(await lookName(h), 'plan')
  h.advance(4_000)
  await h.fire('classic.UserPromptSubmit', { permission_mode: 'auto' })
  assert.equal(await lookName(h), 'auto')
  h.advance(4_000)
  await h.fire('classic.UserPromptSubmit', { permission_mode: 'acceptEdits' })
  assert.equal(await lookName(h), 'ask')
})

test('a failed command puffs smoke, but not again for fifteen seconds', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('classic.PostToolUseFailure', { tool_name: 'Bash', error: 'exit 1' })
  assert.equal(await lookName(h), 'oops')
  h.advance(3_000)
  await h.fire('classic.PostToolUseFailure', { tool_name: 'Bash', error: 'exit 1' })
  assert.equal(await lookName(h), 'think')
  h.advance(13_000)
  await h.fire('classic.PostToolUseFailure', { tool_name: 'Bash', error: 'exit 1' })
  assert.equal(await lookName(h), 'oops')
})

test('a file saved while Claude is idle gets the reading glasses; Claude\'s own edits and .git do not', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.FileChanged', { file_path: '/p/.git/index', event: 'change' })
  assert.notEqual(await lookName(h), 'peek')
  await h.fire('turn.start', {})
  await h.fire('classic.FileChanged', { file_path: '/p/a.js', event: 'change' })
  assert.equal(await lookName(h), 'think')
  await h.fire('turn.complete', {})
  h.advance(5_000)
  await h.fire('classic.FileChanged', { file_path: '/p/a.js', event: 'change' })
  assert.equal(await lookName(h), 'peek')
})

test('other open sessions are counted from their marks in the shared store', async () => {
  const h = harness({ store: { 'alive:other': START - 10_000, 'alive:old': START - 30 * 60 * 1000 } })
  await h.start()
  // This session, plus the one that checked in ten seconds ago; the old mark is a closed session
  assert.equal(h.saved['alive:this-session'], START)
  assert.match((await h.look()).svg, /#DD775B/)
  const tag = (await h.look()).svg.match(/<g transform="translate\(2 2\)">(.*?)<\/g><g transform="translate\(0 /)?.[1] ?? ''
  assert.ok(tag.includes('#DD775B'), 'the little Clawd for the session count is in the corner tag')
})

test('messages between sessions: one sent flies off as a paper airplane, one received swoops in', async () => {
  const h = harness()
  await h.start()
  await h.fire('session.send', { to: 'other', text: 'hi', origin: { kind: 'model' } })
  assert.equal(await lookName(h), 'send')
  h.advance(4_000)
  await h.fire('session.receive', { text: 'hi back', origin: { kind: 'peer' } })
  assert.equal(await lookName(h), 'receive')
})

test('a new session waves hello; after /clear, goodbye plays first and hello right after', async () => {
  const h = harness()
  await h.start()
  await h.fire('classic.SessionStart', { source: 'startup' })
  assert.equal(await lookName(h), 'hello')
  h.advance(5_000)
  await h.fire('classic.SessionEnd', { reason: 'clear', session_id: 'this-session' })
  await h.fire('classic.SessionStart', { source: 'clear' })
  assert.equal(await lookName(h), 'bye')
  h.advance(3_100)
  assert.equal(await lookName(h), 'hello')
})

test('the corner tag shows the day and time', async () => {
  const h = harness()
  await h.start()
  // Saturday at noon: the tag is drawn in the top-left corner
  assert.match((await h.look()).svg, /<g transform="translate\(2 2\)"><rect x="0" y="0" width="[\d.]+" height="[\d.]+" rx="3" fill="#1F1E1D"/)
})

test('a file sent to you or a page published gets presented, but not a refused one', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'SendUserFile', input: { files: ['report.html'] } }, async () => ({ result: {} }))
  assert.equal(await lookName(h), 'present')
  h.advance(3_000)
  await h.fire('tool.call', { tool: 'SendUserFile', input: { files: ['x'] } }, async () => ({ deny: 'no' }))
  assert.notEqual(await lookName(h), 'present')
  await h.fire('tool.call', { tool: 'Artifact', input: { action: 'list' } }, async () => ({ result: {} }))
  assert.notEqual(await lookName(h), 'present', 'listing artifacts is not handing one over')
})

test('settings: your days, your location and your regions are set with /krab, saved, and used', async () => {
  const places = (url) => (url.includes('geocoding-api') ? { ok: true, text: JSON.stringify({ results: [{ name: 'Toronto', admin1: 'Ontario', country_code: 'CA', latitude: 43.70011, longitude: -79.4163 }] }) } : { ok: false, text: '' })
  const h = harness({ store: { outfit: 'auto' }, web: places })
  await h.start()
  const say = async (args) => (await h.fire('command.run', { command: 'krab', args })).text
  assert.match(await say('birthday Jan 15'), /Jan 15/)
  assert.equal(h.saved.days.birthday, '01-15')
  assert.match(await say('gf-birthday 10/7'), /Oct 7/)
  assert.match(await say('bf-birthday 20 january'), /Jan 20/)
  assert.match(await say('anniversary 13th of never'), /isn't a date/)
  assert.match(await say('anniversary Feb 30'), /isn't a date/, 'not a real day')
  await say('bf-birthday off')
  assert.equal(h.saved.days.bfBirthday, undefined)
  assert.match(await say('location Toronto'), /Toronto, Ontario, CA/)
  assert.equal(h.saved.place.latitude, 43.7)
  assert.match(await say('location 51.5, -0.12'), /51.5, -0.12/)
  assert.match(await say('holidays ca-on us'), /CA-ON, US/)
  assert.deepEqual(h.saved.regions, ['CA-ON', 'US'])
  assert.match(await say('holidays canada!'), /isn't a region code/)
  assert.match(await say('settings'), /your birthday: Jan 15.*Holidays: CA-ON, US/)
  // The birthday set above brings out the cake on that day, and not the day before
  h.advance(new Date(2027, 0, 14, 12).getTime() - h.now())
  await h.tick()
  assert.ok(!(await h.look()).svg.includes('#C93D6E'), 'no cake the day before')
  h.advance(24 * 60 * 60 * 1000)
  await h.tick()
  assert.ok((await h.look()).svg.includes('#C93D6E'), 'the birthday cake')
})

test('the first snowfall of the season plays once, and not again until next season', async () => {
  const snowing = (url) => (url.includes('swpc') ? { ok: true, text: JSON.stringify([{ time_tag: 'x', Kp: 1 }]) } : { ok: true, text: JSON.stringify({ current: { weather_code: 73, wind_speed_10m: 5, wind_gusts_10m: 8, is_day: 1, apparent_temperature: -3 } }) })
  const h = harness({ store: { place: { name: 'Somewhere', latitude: 50, longitude: -100 } }, web: snowing })
  await h.start()
  await h.tick()
  assert.equal(await lookName(h), 'firstsnow')
  assert.equal(typeof h.saved.firstSnowSeason, 'number')
  const again = harness({ store: { place: { name: 'Somewhere', latitude: 50, longitude: -100 }, firstSnowSeason: h.saved.firstSnowSeason }, web: snowing })
  await again.start()
  await again.tick()
  assert.notEqual(await lookName(again), 'firstsnow', 'already celebrated this season')
})

test('the work itself: tests passing and failing, a commit, a push and a web search each get their reaction', async () => {
  const h = harness()
  await h.start()
  await h.fire('turn.start', {})
  await h.fire('tool.call', { tool: 'Bash', input: { command: 'npm test' } }, () => ({ result: { stdout: '12 passing', stderr: '' } }))
  assert.equal(await lookName(h), 'cheer')
  h.advance(5_000)
  await h.fire('tool.call', { tool: 'Bash', input: { command: 'npm test' } }, () => ({ isError: true, result: '2 failing' }))
  assert.equal(await lookName(h), 'facepalm')
  // the failure hook does not also puff smoke over the facepalm
  await h.fire('classic.PostToolUseFailure', { tool_name: 'Bash', tool_input: { command: 'npm test' } })
  assert.equal(await lookName(h), 'facepalm')
  h.advance(5_000)
  await h.fire('tool.call', { tool: 'Bash', input: { command: 'git commit -m "x"' } }, () => ({ result: { stdout: '', stderr: '' } }))
  assert.equal(await lookName(h), 'ship')
  h.advance(5_000)
  await h.fire('tool.call', { tool: 'Bash', input: { command: 'git push' } }, () => ({ result: { stdout: '', stderr: '' } }))
  assert.equal(await lookName(h), 'rocket')
  h.advance(5_000)
  await h.fire('tool.call', { tool: 'WebSearch', input: { query: 'x' } }, () => ({ result: {} }))
  assert.equal(await lookName(h), 'browse')
})

test('the 100th message gets a trophy', async () => {
  const h = harness({ store: { messageCount: 98 } })
  await h.start()
  await h.fire('prompt.submit', { text: 'hi' })
  assert.notEqual(await lookName(h), 'trophy')
  h.advance(5_000)
  await h.fire('prompt.submit', { text: 'hi' })
  assert.equal(await lookName(h), 'trophy')
})

test('in a quiet spell he fidgets once before dozing off', async () => {
  const h = harness()
  await h.start()
  await h.fire('prompt.submit', { text: 'hi' })
  h.advance(10_000)
  await h.tick()
  assert.equal(await lookName(h), 'calm')
  h.advance(20_000)
  await h.tick()
  assert.ok(['yoyo', 'juggle', 'stretch'].includes(await lookName(h)), 'a fidget')
  h.advance(6_000)
  await h.tick()
  assert.equal(await lookName(h), 'calm', 'only once per quiet spell')
})

test('a brand-new install says hello once and points to the setup commands; settings say how to fill in what is missing', async () => {
  const h = harness()
  await h.start()
  assert.equal(h.toasts.length, 1)
  assert.match(h.toasts[0], /\/krab location/)
  assert.match(h.toasts[0], /\/krab holidays/)
  const again = harness({ store: { welcomed: true } })
  await again.start()
  assert.equal(again.toasts.length, 0, 'only the first time ever')
  const set = harness({ store: { regions: ['CA'] } })
  await set.start()
  assert.equal(set.toasts.length, 0, 'not for someone already set up')
  const text = (await h.fire('command.run', { command: 'krab', args: 'settings' })).text
  assert.match(text, /\/krab location <city>/)
  assert.match(text, /\/krab birthday/)
})
