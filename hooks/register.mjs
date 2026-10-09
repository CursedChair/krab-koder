// Krab Koder: a little crab above the prompt who walks around and shows
// your context window and plan usage by how he acts.
// It only draws and watches events: no network, no files, no processes.
import { dueAlert, FIVE_HOUR, findLimit, limitWarning, percentBucket, rememberReading, resetThatEnded, WEEK } from './limits.mjs'
import { ALERT_MS, COMPACT_MAX_MS, createLife, EVENT_MS, FLAG_MS, GYM_MS, modelNote, modelSwitchLook, moodFor, poseFor, readout, SLEEP_AFTER_MS, stateFor, stepLife, TICK_MS, WAKE_MS } from './life.mjs'
import { chipsFor, chipsText } from './chips.mjs'
import { cellNumbers, packCells, pixelsFor, SPRITE_COLUMNS, SPRITE_ROWS } from './sprite.mjs'
import { OUTFIT_IDS } from './outfits.mjs'
import { airUrl, geocodeUrl, KP_URL, parseAir, parseKp, parsePlace, parseWeather, scenesWithWeather, TRIAL, weatherOutfit, weatherUrl } from './weather.mjs'
import { PERSONAL } from './personal.mjs'
import { DAY_COMMANDS, DAY_NAMES, monthDayWords, parseCoordinates, parseMonthDay, parseRegions } from './settings.mjs'
import { attachmentReaction, AWAY_MS, BREAK_GAP_MS, BREAK_REMINDER_MS, commandReaction, DAY_MEDAL_AT, fileLook, isGiantRead, isLateNight, isMondayMorning, isWeekend, LONG_TOOL_RUN, nextCakeAt, isTestCommand, LONG_TURN_MS, MILESTONES, LONG_REPLY_CHARS, messageReaction, pickFidget, replyReaction, startReaction, toolReaction } from './work.mjs'
import { outfitFor, REGION_CODES, scenesWithLife, scenesWithSky, scenesWithTime, seasonFor, skyEvents } from './seasons.mjs'
import { SEASON_SCENES } from './scenery.mjs'
import { OUTFITS } from './outfits.mjs'
import { bandLayout, COLUMN_PX, HELPER_LEAVE_SECONDS, SIZES } from './vector.mjs'

const MIN_EXTRA_COLUMNS = 4
// He stays where he is: the same spot, a little in from the left edge, and only does his animations
const STAND_COL = 3
// A failed command plays the smoke puff at most this often, so a run of failures does not keep interrupting him
const OOPS_EVERY_MS = 15_000
// He fidgets once this far into a quiet spell (he dozes off at SLEEP_AFTER_MS)
const FIDGET_AFTER_MS = 25_000
// Searches in a row get the laptop once
const SEARCH_EVERY_MS = 10_000
// How much of Claude's reply to keep for reacting to it, and how many tools at once sprout extra arms
const REPLY_KEEP_CHARS = 4_000
const MANY_TOOLS = 3
// Pets this close together count as one petting spree; this many in a spree make him grumpy
const PET_SPREE_MS = 8_000
// The heart button's name
const PET_KEY = 'krab-pet'
const GRUMPY_AFTER = 4
// A web search gets the satellite dish (its tool look); opening a page gets the laptop
const SEARCH_TOOLS = new Set(['WebFetch'])
// Looks for the kind of file being edited come round less often, since edits come thick and fast
const FILE_LOOK_EVERY_MS = 60_000
const CODE_SEARCH_TOOLS = new Set(['Grep', 'Glob'])
// Only messages you sent yourself (typed, or from your phone) get a reaction to their words
const YOUR_MESSAGES = new Set(['composer', 'bridge'])
// Each open session leaves an "I'm here" mark in the shared store this often; marks older than STALE_MS are sessions that closed
const HEARTBEAT_MS = 30_000
const STALE_MS = 95_000
const ALIVE_PREFIX = 'alive:'
// Files under these folders change all the time on their own (git, installs), so they never count as you saving something
const NOISY_PATHS = /[\\/](\.git|node_modules|\.next|dist|build|\.cache)[\\/]/
// Which permission modes count as which reaction
// Tools that hand you a file or a page: sending a file in the desktop app, or publishing an artifact
const PRESENT_TOOLS = new Set(['SendUserFile', 'Artifact'])
const MODE_LOOK = { plan: 'plan', auto: 'auto', bypassPermissions: 'auto', dontAsk: 'auto', default: 'ask', acceptEdits: 'ask' }

// Remember the five-hour reading between sessions. Saving is best effort: the flag still plays if it fails.
async function saveFive($, reading) {
  try {
    await $.store.set('fiveHour', reading)
  } catch {
    // Nothing to tell the user: the worst case is one missed flag after a restart
  }
}

// Remember the size he was set to, for every session
async function saveSize($, size) {
  try {
    await $.store.set('size', size)
  } catch {
    // Nothing to tell the user: he just starts at the usual size next time
  }
}

// Ask Open-Meteo what the weather is where the person set with /krab location. Best effort: any failure just means no weather scene.
async function fetchWeather($, place) {
  try {
    const response = await $.http.fetch(weatherUrl(place))
    return response.ok ? parseWeather(response.text) : null
  } catch {
    return null
  }
}

// Ask NOAA how active the northern lights are (the Kp index). Best effort: any failure just means no aurora.
async function fetchKp($) {
  try {
    const response = await $.http.fetch(KP_URL)
    return response.ok ? parseKp(response.text) : null
  } catch {
    return null
  }
}

// Ask Open-Meteo how clean the air is where the person is (for wildfire smoke). Best effort: any failure just means no smoke.
async function fetchAir($, place) {
  try {
    const response = await $.http.fetch(airUrl(place))
    return response.ok ? parseAir(response.text) : null
  } catch {
    return null
  }
}

// Look a place name up (Open-Meteo geocoding). Returns { name, latitude, longitude, country } or null
async function findPlace($, name) {
  try {
    const response = await $.http.fetch(geocodeUrl(name))
    return response.ok ? parsePlace(response.text) : null
  } catch {
    return null
  }
}

// Save one of the person's settings (their days, regions, place), for every session. Returns false if it could not be saved.
async function saveSetting($, key, value) {
  try {
    await $.store.set(key, value)
    return true
  } catch {
    return false
  }
}

// Remember the weather setting, for every session
// One more message sent, counted across all sessions; returns the new count (or 0 if the count could not be kept)
// Today's message count, kept with the date so it starts over each day
async function countToday($, today) {
  try {
    const saved = await $.store.get('dayMessages')
    const count = (saved?.day === today ? Number(saved.count) || 0 : 0) + 1
    await $.store.set('dayMessages', { day: today, count })
    return count
  } catch {
    // Nothing to tell the user: a missed count only means the day's medal may come a message late
    return 0
  }
}

async function countMessage($) {
  try {
    const count = (Number(await $.store.get('messageCount')) || 0) + 1
    await $.store.set('messageCount', count)
    return count
  } catch {
    // Nothing to tell the user: a missed count only means a trophy may come a message late
    return 0
  }
}

async function saveWeather($, weather) {
  try {
    await $.store.set('weather', weather)
  } catch {
    // Nothing to tell the user: it starts on automatic next time
  }
}

// Remember the outfit setting, for every session
async function saveOutfit($, outfit) {
  try {
    await $.store.set('outfit', outfit)
  } catch {
    // Nothing to tell the user: he just dresses for the date next time
  }
}

export function register(on) {
  // Everything below lives only as long as this module is loaded.
  let life = createLife()
  let snapshot = null
  let isEnabled = true
  let isTurnRunning = false
  // Background work Claude started and is waiting on (subagents, background shells, monitors), as the last Stop reported it
  let runningTasks = 0
  let bandColumns = 0
  let lastActivityAt = Date.now()
  // When this stretch of work began (after a quiet gap long enough to count as a break), and when he last suggested one
  let stretchStartAt = Date.now()
  let breakSuggestedAt = 0
  let doneAt = 0
  let wakeAt = 0
  // When the reply-ready picture was drawn: its throws run from then, so it hands over to the idle look at the end of a loop
  let doneShownAt = 0
  let lastTool = null
  let lastToolAt = 0
  let surface = 'desktop'
  let drawn = { key: '', layout: null, slide: null }
  let size = 'normal'
  // 'auto' wears the outfit for today's date, 'off' none, or the name of one to wear whatever the date
  let outfitChoice = 'auto'
  // The person's own settings: their special days ('MM-DD'), which countries' holidays they get, and where they are (for the weather and the sky)
  // They start from the install's own defaults (empty unless the person put theirs in), and /krab changes win
  let days = { ...PERSONAL.days }
  let regions = [...PERSONAL.regions]
  let place = PERSONAL.place
  // The snow season (the year it began) whose first snowfall has already been celebrated
  let firstSnowSeason = null
  // 'auto' follows the live weather where you set your location, 'off' ignores it, or the name of a kind of weather to try out
  let weatherChoice = 'auto'
  // /krab sky: try a night-sky event (until the session ends): aurora, meteors or bloodmoon; 'auto' follows the date and the weather
  let skyChoice = 'auto'
  // When rain has just cleared in daylight, a rainbow shows for two hours
  let rainbowUntil = 0
  // The live aurora activity (Kp), and when we read it
  let kp = null
  let kpAt = 0
  // /krab time: try a time of day (until the session ends); 'auto' follows the clock
  let timeChoice = 'auto'
  // The last real weather we got, and when
  let weather = null
  let weatherAt = 0
  // The air quality index there (for wildfire smoke), and when we read it
  let aqi = null
  let aqiAt = 0
  let gymAt = 0
  // The effort level Claude Code last reported (low to max), which sets how fast he lifts
  let effort = null
  // A line shown in place of the readout until a time: which model he switched to, or the new effort level
  let noteText = ''
  let noteUntil = 0
  let flagAt = 0
  // The limit that just reached the alert level: when, which look, how full, and which windows were announced
  let alertAt = 0
  let alert = null
  const alerted = { five: null, week: null }
  // When the chat started being compacted, or 0 when it is not
  let compactAt = 0
  // The last five-hour reading we saw, remembered between sessions so a reset while he was away still gets a flag
  let lastFive = null
  // Claude is stuck until you answer: 'permission' (allow this?) or 'asking' (its questions), else null
  let waiting = null
  let permissionAt = 0
  let questions = 1
  // When each one-off reaction (hello, oops, stamp...) started
  let eventAt = {}
  let lastOopsAt = 0
  // The quiet spell he last fidgeted in (by when it began), and when he last opened the laptop for a search
  let fidgetFor = 0
  let lastSearchAt = 0
  let lastCodeSearchAt = 0
  // When each tool look last played, so a run of file reads shows the scroll now and then rather than every time
  const toolLookAt = {}
  // When Claude started thinking (in this model request, before any words or tools), or 0
  let thinkingSince = 0
  // What Claude has written this turn, for reacting to it at the end (only the last part is kept)
  let replyText = ''
  let replyLength = 0
  // Pets in a row: a few pets are nice, too many make him grumpy
  let petTimes = []
  // When this reply started, whether he has tapped his foot at it yet, and the night he last yawned at
  let turnStartAt = 0
  // Tool calls in this reply, and whether that has earned a drenching yet
  let toolsThisTurn = 0
  let hasDrenchedThisTurn = false
  // When the session began, and how many cakes its milestones have earned
  const sessionStartAt = Date.now()
  let cakes = 0
  let hasTappedThisTurn = false
  let yawnedFor = ''
  // The day he last did his Monday-morning drag or his weekend lounge
  let weekdayFor = ''
  // Helper agents working right now, and when the last one finished (it waves goodbye)
  let helpers = []
  let helperLeftAt = 0
  // The permission mode Claude Code last reported, and how many sessions are open (this one included)
  let mode = null
  let sessions = 1

  // The outfit: the day's holiday outfit, or, on a day with none (or just summer), the gear the weather calls for (parka, heat wave or blizzard)
  const outfitNow = () => {
    if (outfitChoice !== 'auto') return outfitChoice === 'off' ? null : outfitChoice
    const day = outfitFor(new Date(Date.now()), settingsNow())
    return day === null || day === 'summer' ? weatherOutfit(weatherNow()) ?? day : day
  }

  const settingsNow = () => ({ days, regions, south: (place?.latitude ?? 0) < 0 })

  // The weather to show: the live reading if it is recent (three hours), a trial one, or none
  const weatherNow = () => {
    if (weatherChoice === 'off') return null
    if (weatherChoice !== 'auto') return TRIAL[weatherChoice] ?? null
    const freshAqi = aqi !== null && Date.now() - aqiAt < 3 * 60 * 60 * 1000 ? aqi : null
    return weather !== null && Date.now() - weatherAt < 3 * 60 * 60 * 1000 ? { ...weather, rainbow: Date.now() < rainbowUntil, aqi: freshAqi } : null
  }

  // The background for today: a holiday outfit brings its own effects; otherwise the season's (leaves, snow, flowers, sun and clouds)
  const sceneNow = () => {
    if (outfitChoice === 'off') return null
    const id = outfitNow()
    const now = new Date(Date.now())
    const timed = scenesWithTime(scenesWithWeather(id ? OUTFITS[id].scene : SEASON_SCENES[seasonFor(now, settingsNow().south)], weatherNow()), hourNow())
    return scenesWithLife(scenesWithSky(timed, skyNow(now)), { hour: hourNow(), season: seasonFor(now, settingsNow().south) })
  }
  // What the night sky is doing: a blood moon on an eclipse night, meteors on the Perseid nights, the northern lights on a clear night in season
  const skyNow = (now) => {
    if (skyChoice !== 'auto') {
      return { bloodMoon: skyChoice === 'bloodmoon', bigMoon: skyChoice === 'supermoon' ? 'super' : skyChoice === 'harvest' ? 'harvest' : null, meteors: skyChoice === 'meteors', aurora: skyChoice === 'aurora', eclipse: skyChoice === 'eclipse', ufo: skyChoice === 'ufo', comet: skyChoice === 'comet' }
    }
    const canSeeAurora = Math.abs(place?.latitude ?? 0) >= 45
    return skyEvents(now, { hour: hourNow(), weather: weatherNow(), kp: canSeeAurora && kp !== null && Date.now() - kpAt < 6 * 60 * 60 * 1000 ? kp : null })
  }
  const TRIAL_HOURS = { night: 23, sunrise: 7, sunset: 19, day: 13 }
  const isCoffeeTime = () => { const hour = hourNow(); return hour >= 7 && hour < 12 }
  const hourNow = () => (timeChoice !== 'auto' ? TRIAL_HOURS[timeChoice] : skyChoice === 'eclipse' ? TRIAL_HOURS.day : skyChoice !== 'auto' ? TRIAL_HOURS.night : new Date(Date.now()).getHours())
  const windNow = () => (outfitChoice === 'off' ? 0 : weatherNow()?.wind ?? 0)

  // A one-off reaction starts now (or at a given time); it wakes him up
  // Something that wakes him plays once he has finished waking up, so the wake-up does not hide it
  // Two looks started in the same moment: the later call wins (it replaces the earlier one)
  const play = (name, at = Date.now()) => {
    touch()
    const awake = wakeAt + WAKE_MS
    const start = Date.now() < awake ? Math.max(at, awake) : at
    eventAt = { ...Object.fromEntries(Object.entries(eventAt).filter(([, t]) => t !== start)), [name]: start }
  }
  // One piece of Claude's reply as it streams: thinking starts his gears, words and tools stop them,
  // several tools in one go sprout extra arms, and how the reply ends picks his reaction to it. Returns the step's tool count.
  const noticeChunk = (chunk, tools) => {
    if (chunk?.kind === 'thinking') {
      if (!thinkingSince) thinkingSince = Date.now()
      return tools
    }
    if (chunk?.kind === 'text') {
      thinkingSince = 0
      replyText = (replyText + chunk.text).slice(-REPLY_KEEP_CHARS)
      replyLength += chunk.text.length
      return tools
    }
    if (chunk?.kind === 'tool') {
      thinkingSince = 0
      if (tools + 1 === MANY_TOOLS) play('multiarm')
      return tools + 1
    }
    if (chunk?.kind === 'stop') {
      thinkingSince = 0
      const reaction = chunk.stopReason === 'max_tokens' ? 'puff' : chunk.stopReason === 'end_turn' ? replyReaction(replyText, replyLength) : null
      if (reaction) play(reaction)
    }
    return tools
  }
  // Claude Code says which permission mode is on with each of its events; a change plays that mode's reaction
  const noteMode = (e) => {
    const next = e.permission_mode
    if (typeof next !== 'string' || e.agent_id || next === mode) return false
    const before = mode
    mode = next
    if (before === null || !MODE_LOOK[next] || MODE_LOOK[next] === MODE_LOOK[before]) return false
    play(MODE_LOOK[next])
    return true
  }
  // Claude Code also says the effort level with its events (only while Claude works); a change sends him to the gym,
  // lifting faster the higher the effort
  const noteEffort = (e) => {
    const level = e.effort?.level
    if (typeof level !== 'string' || e.agent_id || level === effort) return false
    const before = effort
    effort = level
    if (before === null) return false
    touch()
    gymAt = Date.now()
    noteText = `effort ${level}`
    noteUntil = gymAt + GYM_MS
    return true
  }

  const isAsleepAt = (now) => !isTurnRunning && now - lastActivityAt > SLEEP_AFTER_MS

  // Any activity counts as you or Claude being back; if he was asleep, he wakes up
  const touch = () => {
    const now = Date.now()
    if (isAsleepAt(now)) wakeAt = now
    if (now - lastActivityAt >= BREAK_GAP_MS) stretchStartAt = now
    lastActivityAt = now
  }

  const contextNow = () => {
    const now = Date.now()
    const limits = snapshot?.rateLimits
    const isAlerting = alert !== null && now - alertAt < ALERT_MS
    // While an alert plays it also decides how full the clock or calendar looks
    const limit = isAlerting
      ? { state: alert.state, percent: alert.percent }
      : limitWarning(findLimit(limits, FIVE_HOUR)?.percentUsed, findLimit(limits, WEEK)?.percentUsed)
    return {
      limit,
      alertState: alert?.state ?? null,
      alertAgeMs: now - alertAt,
      gymAgeMs: now - gymAt,
      flagAgeMs: now - flagAt,
      mood: moodFor(snapshot?.context?.percent),
      turnRunning: isTurnRunning,
      // Background work keeps him awake: he is waiting on it, not idle
      asleep: runningTasks > 0 ? false : isAsleepAt(now),
      tasks: runningTasks,
      compacting: compactAt > 0 && now - compactAt < COMPACT_MAX_MS,
      // How long he has been asleep (the clock starts when he nods off, after the quiet spell)
      sleepAgeMs: now - (lastActivityAt + SLEEP_AFTER_MS),
      tool: lastTool,
      toolAgeMs: now - lastToolAt,
      doneAgeMs: now - (doneShownAt >= doneAt ? doneShownAt : doneAt),
      wakeAgeMs: now - wakeAt,
      waiting,
      thinkingMs: thinkingSince ? now - thinkingSince : 0,
      events: Object.fromEntries(Object.entries(eventAt).map(([name, at]) => [name, now - at])),
    }
  }

  // He only walks when he is walking across; when Claude is working he stands still
  const lookNow = (ctx) => ({
    state: stateFor(ctx),
    gait: life.mode === 'walk' ? 'run' : 'idle',
  })

  // The note shown instead of the numbers while an event is playing, if one is
  const noteFor = (ctx) => {
    if (ctx.flagAgeMs < FLAG_MS) return '5-hour limit reset: fresh start'
    if (alert !== null && ctx.alertAgeMs < ALERT_MS && ctx.alertState === alert.state) {
      return `${alert.label} limit ${Math.round(alert.percent)}% used: nearly out`
    }
    if (Date.now() < noteUntil && noteText) return noteText
    return null
  }

  // The desktop drawing animates itself, so it is only rebuilt when his look, his walk or the readout changes.
  const desktopKey = (ctx) => {
    const { state, gait } = lookNow(ctx)
    const fullness = state === 'clock' || state === 'calendar' ? percentBucket(ctx.limit.percent) : ''
    const readoutKey = JSON.stringify(chipsFor(snapshot, noteFor(ctx)))
    const extras = [helpers.length, isHelperLeaving() ? 'bye' : '', state === 'asking' ? questions : '', state === 'gym' ? effort : '', hudKey()].join(',')
    return [extras, state, gait, ctx.mood, life.mode, life.dir, life.target, bandColumns, fullness, size, outfitNow(), (sceneNow() ?? []).join('+'), windNow(), readoutKey, state === 'task' ? `${ctx.tasks}${isCoffeeTime() ? 'c' : ''}` : ''].join('|')
  }

  const isHelperLeaving = () => Date.now() - helperLeftAt < HELPER_LEAVE_SECONDS * 1000
  // The corner tag: the time (or the trial time), the day, the weather and how many sessions are open
  const hudNow = () => {
    const now = new Date(Date.now())
    const isTrial = timeChoice !== 'auto' || skyChoice !== 'auto'
    return { hour: hourNow(), minute: isTrial ? 0 : now.getMinutes(), day: now.getDay(), weather: weatherNow(), sessions }
  }
  const hudKey = () => JSON.stringify(hudNow())

  // Where the pills and Clawd are right now, if the last drawing was still sliding them when this redraw came
  // (a second reading often arrives right after the first), so the slide carries on instead of snapping to its end
  const slideFrom = () => {
    const previous = drawn.layout
    if (!previous?.isInline) return null
    const slide = drawn.slide
    const elapsed = slide ? (Date.now() - slide.at) / 1000 : Infinity
    if (!slide || elapsed >= slide.seconds) return { origin: previous.originUnits, chipsW: previous.chipsW, hadMeters: previous.hasMeters, chipsShape: previous.chipsShape }
    const left = 1 - elapsed / slide.seconds
    const eased = 1 - left * left
    return {
      origin: slide.origin0 + (slide.origin1 - slide.origin0) * eased,
      chipsW: previous.chipsW,
      hadMeters: previous.hasMeters,
      chipsShape: previous.chipsShape,
      rowShift: slide.rowShift0 * (1 - eased),
      seconds: slide.seconds - elapsed,
    }
  }

  const desktopLayout = (ctx) => {
    const key = desktopKey(ctx)
    if (drawn.key === key) return drawn.layout
    const { state, gait } = lookNow(ctx)
    const layout = bandLayout({
      columns: bandColumns,
      fromCol: STAND_COL,
      dir: 1,
      state,
      gait,
      // The clock and calendar change in steps of five percent, so they are not redrawn for every point
      percent: ctx.limit ? percentBucket(ctx.limit.percent) : undefined,
      tasks: ctx.tasks,
      questions,
      helpers: helpers.length,
      helperLeaving: isHelperLeaving(),
      hud: hudNow(),
      effort,
      // From 7 am to noon he has a coffee while he waits on background work
      coffee: isCoffeeTime(),
      unit: SIZES[size],
      chips: chipsFor(snapshot, noteFor(ctx)),
      inline: true,
      outfit: outfitNow(),
      scene: sceneNow(),
      wind: windNow(),
      slideFrom: slideFrom(),
    })
    if (state === 'done' && doneShownAt < doneAt) doneShownAt = Date.now()
    drawn = { key, layout, slide: layout.slide ? { ...layout.slide, at: Date.now() } : null }
    return drawn.layout
  }

  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('fiveHour')
    if (saved && typeof saved.percentUsed === 'number') lastFive = saved
    const savedOutfit = await $.store.get('outfit')
    if (savedOutfit === 'auto' || savedOutfit === 'off' || OUTFIT_IDS.includes(savedOutfit)) outfitChoice = savedOutfit
    const savedWeather = await $.store.get('weather')
    if (savedWeather === 'auto' || savedWeather === 'off' || savedWeather in TRIAL) weatherChoice = savedWeather
    const savedDays = await $.store.get('days')
    if (savedDays && typeof savedDays === 'object') days = savedDays
    const savedRegions = await $.store.get('regions')
    if (Array.isArray(savedRegions)) regions = savedRegions.filter((code) => typeof code === 'string')
    const savedPlace = await $.store.get('place')
    if (savedPlace && Number.isFinite(savedPlace.latitude) && Number.isFinite(savedPlace.longitude)) place = savedPlace
    // Turned off on purpose (saved as nothing) stays off, even if the install has a default place
    else if (savedPlace === null) place = null
    const savedSnow = await $.store.get('firstSnowSeason')
    if (typeof savedSnow === 'number') firstSnowSeason = savedSnow
    const savedSize = await $.store.get('size')
    if (typeof savedSize === 'string' && savedSize in SIZES) size = savedSize
    // A brand-new install says hello once and points to the setup commands (not for someone who has already set things up)
    const isSetUp = place !== null || regions.length > 0 || Object.keys(days).length > 0
    if (!isSetUp && !(await $.store.get('welcomed'))) {
      $.ui.toast('Krab Koder is here! Set him up: /krab location <city> for your weather, /krab holidays <codes> for your holidays, /krab birthday <date>. See /krab settings.')
      await $.store.set('welcomed', true)
    }
    await $.command.register({
      name: 'krab',
      description: 'Krab above the prompt: /krab on, off, small, normal, big, outfit, weather, settings, birthday, location, holidays',
    })
    // The weather is looked up now and then every fifteen minutes
    const refreshWeather = async () => {
      if (weatherChoice === 'off' || place === null) return
      const activity = await fetchKp($)
      if (activity !== null) {
        kp = activity
        kpAt = Date.now()
      }
      const air = await fetchAir($, place)
      if (air !== null) {
        aqi = air
        aqiAt = Date.now()
      }
      const reading = await fetchWeather($, place)
      if (reading !== null) {
        // The first snowfall of the season (a season runs from July to June) gets its own moment, once
        const now = new Date(Date.now())
        const season = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
        if (reading.sky === 'snow' && firstSnowSeason !== season) {
          firstSnowSeason = season
          play('firstsnow')
          await saveSetting($, 'firstSnowSeason', season)
        }
        // Rain that has just cleared, with the sun out, makes a rainbow for a couple of hours
        const wasWet = weather !== null && (weather.sky === 'rain' || weather.sky === 'storm')
        if (wasWet && reading.isDay && (reading.sky === 'sunny' || reading.sky === 'cloudy')) rainbowUntil = Date.now() + 2 * 60 * 60 * 1000
        weather = reading
        weatherAt = Date.now()
        $.ui.invalidate('ui.render')
      }
    }
    refreshWeather()
    $.clock.every(15 * 60 * 1000, refreshWeather)
    // Leave an "I'm here" mark for the other sessions, and count theirs. Best effort: if the store fails he just shows no count.
    const id = await $.session.id()
    const heartbeat = async () => {
      try {
        const now = Date.now()
        await $.store.set(ALIVE_PREFIX + id, now)
        let open = 0
        for (const key of await $.store.keys()) {
          if (!key.startsWith(ALIVE_PREFIX)) continue
          const at = await $.store.get(key)
          if (typeof at === 'number' && now - at < STALE_MS) open++
          else if (typeof at !== 'number' || now - at > 24 * 60 * 60 * 1000) await $.store.delete(key)
        }
        if (open !== sessions) {
          sessions = Math.max(1, open)
          $.ui.invalidate('ui.render')
        }
      } catch {
        // Nothing to tell the user: the count just stays as it was
      }
    }
    heartbeat()
    $.clock.every(HEARTBEAT_MS, heartbeat)
    $.clock.every(TICK_MS, async () => {
      if (!isEnabled) return
      // The clock passing the end of a window is a reset, even before any new reading arrives
      const ended = resetThatEnded({ last: lastFive, reading: null, nowMs: Date.now() })
      if (ended !== null) {
        touch()
        flagAt = Date.now()
        lastFive = { ...lastFive, celebratedFor: ended }
        await saveFive($, lastFive)
      }
      // Claude has been at this reply a long while: he checks his watch and taps his foot, once a reply
      if (isTurnRunning && !waiting && !hasTappedThisTurn && Date.now() - turnStartAt > LONG_TURN_MS) {
        hasTappedThisTurn = true
        eventAt = { ...eventAt, tapfoot: Date.now() }
      }
      // A while into a quiet spell, before he dozes off, he fidgets once: a yo-yo, juggling or a stretch
      const quietMs = Date.now() - lastActivityAt
      if (!isTurnRunning && !waiting && runningTasks === 0 && quietMs > FIDGET_AFTER_MS && quietMs < SLEEP_AFTER_MS && fidgetFor !== lastActivityAt) {
        fidgetFor = lastActivityAt
        eventAt = { ...eventAt, [pickFidget(new Date(Date.now()))]: Date.now() }
      }
      const ctx = contextNow()
      life = stepLife(life, {
        maxX: 0,
        mood: ctx.mood,
        turnRunning: ctx.turnRunning,
        asleep: ctx.asleep,
        rand: Math.random,
      })
      // The terminal picture is frames, so it redraws every tick; the desktop one only when it changes
      if (surface === 'terminal' || desktopKey(ctx) !== drawn.key) $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    snapshot = { context: e.context, rateLimits: e.rateLimits, cost: e.cost }
    const reading = findLimit(e.rateLimits, FIVE_HOUR)
    const ended = resetThatEnded({ last: lastFive, reading, nowMs: Date.now() })
    if (ended !== null) {
      touch()
      flagAt = Date.now()
      lastFive = { ...lastFive, celebratedFor: ended }
    }
    if (reading !== null) {
      lastFive = rememberReading(lastFive, reading)
      await saveFive($, lastFive)
    }
    // A limit nearly gone brings the clock or calendar back, once for each window
    const due = dueAlert({ five: reading, week: findLimit(e.rateLimits, WEEK) }, alerted)
    if (due !== null) {
      touch()
      alerted[due.which] = due.key
      alert = { state: due.state, percent: due.percent, label: due.which === 'five' ? '5-hour' : 'weekly' }
      alertAt = Date.now()
    }
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // Switching models: up to Fable he ascends, down from it he falls, up to Opus he bulks up, down to Sonnet he shrinks
  // into glasses. Restoring the model when you resume a chat is not a switch.
  on('classic.PostModelSwitch', async ($, e, next) => {
    if (e.source !== 'resume') {
      const look = modelSwitchLook(e.from_model, e.to_model)
      if (look === 'gym') gymAt = Date.now()
      else play(look)
      touch()
      noteText = modelNote(e)
      noteUntil = Date.now() + (EVENT_MS[look] ?? GYM_MS)
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  // Compacting squeezes the chat down to a summary; he crumples paper until it is done
  on('classic.PreCompact', async ($, e, next) => {
    touch()
    compactAt = Date.now()
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('classic.PostCompact', async ($, e, next) => {
    compactAt = 0
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // A compacted chat restarts with source "compact": a second way to hear that it finished
  on('classic.SessionStart', async ($, e, next) => {
    if (e.source === 'compact') {
      compactAt = 0
      $.ui.invalidate('ui.render')
      return next(e)
    }
    // A new session waves hello; after /clear the goodbye plays first and the hello right after it
    const byeAt = eventAt.bye ?? 0
    play('hello', Date.now() - byeAt < EVENT_MS.bye ? byeAt + EVENT_MS.bye : Date.now())
    $.ui.invalidate('ui.render')
    // No folder watching of our own: watching a whole project can be heavy on a big one, so the reading glasses
    // only play for files Claude Code already watches
    return next(e)
  })

  // Each time Claude stops it lists the background work still in flight; an empty list means it all came back
  // (the engine wants $ used right inside each hook, so the counting is shared and the redraw is not)
  const tasksChanged = (e) => {
    const count = Array.isArray(e.background_tasks) ? e.background_tasks.length : 0
    if (count === runningTasks) return false
    // Fewer than before: some background work came back
    if (count < runningTasks) play('pop')
    runningTasks = count
    if (count > 0) touch()
    return true
  }
  on('classic.Stop', async ($, e, next) => {
    if (tasksChanged(e)) $.ui.invalidate('ui.render')
    return next(e)
  })
  // A helper agent finishing: it leaves the row of little Clawds, waving goodbye
  const helperStopped = (e) => {
    const before = helpers.length
    helpers = helpers.filter((id) => id !== e.agent_id)
    if (helpers.length < before) helperLeftAt = Date.now()
  }
  on('classic.SubagentStop', async ($, e, next) => {
    helperStopped(e)
    tasksChanged(e)
    $.ui.invalidate('ui.render')
    return next(e)
  })
  on('classic.SubagentStart', async ($, e, next) => {
    if (typeof e.agent_id === 'string' && !helpers.includes(e.agent_id)) helpers = [...helpers, e.agent_id]
    touch()
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // Every classic event says which permission mode is on: switching to plan, auto or asking mode plays its reaction
  on('classic.*', async ($, e, next) => {
    const changed = noteMode(e)
    if (noteEffort(e) || changed) $.ui.invalidate('ui.render')
    return next(e)
  })

  // A permission dialog is up: he holds up his "?" sign until you answer it
  on('classic.PermissionRequest', async ($, e, next) => {
    waiting = 'permission'
    permissionAt = Date.now()
    touch()
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // The request was turned down (by you, or by auto mode's checker): he shrugs and puts the thing back
  on('classic.PermissionDenied', async ($, e, next) => {
    waiting = null
    play('shrug')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // An MCP server asking you to fill something in counts as Claude asking you a question
  on('classic.Elicitation', async ($, e, next) => {
    waiting = 'asking'
    questions = 1
    touch()
    $.ui.invalidate('ui.render')
    return next(e)
  })
  on('classic.ElicitationResult', async ($, e, next) => {
    if (waiting === 'asking') waiting = null
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // A command or tool failed: a puff of smoke, at most every fifteen seconds (stopping it yourself does not count)
  on('classic.PostToolUseFailure', async ($, e, next) => {
    if (!e.is_interrupt && !isTestCommand(e.tool_input?.command) && Date.now() - lastOopsAt > OOPS_EVERY_MS) {
      lastOopsAt = Date.now()
      play('oops')
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })
  // Claude's reply failed (a network or server error): he glitches out
  on('classic.StopFailure', async ($, e, next) => {
    play('glitch')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // A task in the task list was ticked off: he stamps a big green check
  on('classic.TaskCompleted', async ($, e, next) => {
    play('stamp')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // A new worktree (a separate copy of the project): he builds a little house
  on('classic.WorktreeCreate', async ($, e, next) => {
    play('house')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // Claude Code pings you because it is waiting: he knocks on the inside of your screen
  on('classic.Notification', async ($, e, next) => {
    play('knock')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // You changed a setting: he tightens a bolt on himself
  on('classic.ConfigChange', async ($, e, next) => {
    play('wrench')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // A folder added to the session: he carries a box in
  on('classic.DirectoryAdded', async ($, e, next) => {
    play('boxin')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // A worktree removed: he sweeps up
  on('classic.WorktreeRemove', async ($, e, next) => {
    play('sweep')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // You pressed the heart beside him: a big hand pets him; too many pets in a row and he gets grumpy
  on('ui.press', async ($, e, next) => {
    if (e.element !== PET_KEY) return next(e)
    const now = Date.now()
    petTimes = [...petTimes.filter((at) => now - at < PET_SPREE_MS), now]
    play(petTimes.length >= GRUMPY_AFTER ? 'grumpy' : 'pet')
    $.ui.invalidate('ui.render')
    return { element: e.element }
  })
  // The session moved to another folder: he jumps into a folder and drops back from the sky
  on('classic.CwdChanged', async ($, e, next) => {
    play('folder')
    $.ui.invalidate('ui.render')
    return next(e)
  })
  // A file changed while Claude was idle, so it was you (or another app) saving it: he puts on his reading glasses
  on('classic.FileChanged', async ($, e, next) => {
    if (!isTurnRunning && e.event !== 'unlink' && !NOISY_PATHS.test(String(e.file_path))) {
      play('peek')
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })
  // The session is closing (or being cleared): he waves goodbye and walks off
  on('classic.SessionEnd', async ($, e, next) => {
    play('bye')
    $.ui.invalidate('ui.render')
    try {
      await $.store.delete(ALIVE_PREFIX + e.session_id)
    } catch {
      // Nothing to tell the user: the mark goes stale on its own
    }
    return next(e)
  })
  // Messages between sessions: he video-calls a blue Clawd on a laptop, talking when this one sent it, listening when it arrived
  on('session.send', async ($, e, next) => {
    if (!e.agentId) {
      play('send')
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })
  on('session.receive', async ($, e, next) => {
    if (!e.agentId && e.origin?.kind === 'peer') {
      play('receive')
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // How long nothing had happened before this message (read before touch() marks now as active)
    const awayMs = Date.now() - lastActivityAt
    touch()
    // Every 100th, 500th, 1,000th... message gets a trophy; otherwise what you sent, how and when can earn a reaction
    const isYours = !e.origin || YOUR_MESSAGES.has(e.origin.kind)
    const now = new Date(Date.now())
    const night = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    const dayCount = await countToday($, night)
    if (MILESTONES.has(await countMessage($))) play('trophy')
    else if (isYours && dayCount === DAY_MEDAL_AT) play('medal')
    else if (isYours) {
      const reaction = attachmentReaction(e.attachments) ?? (e.origin?.kind === 'bridge' ? 'listen' : null) ?? messageReaction(e.text) ??
        (isLateNight(now.getHours()) && yawnedFor !== night ? 'yawn' : null) ??
        // Once a day: the first message on a Monday morning, or on a weekend day
        (isMondayMorning(now) && weekdayFor !== night ? 'monday' : null) ??
        (isWeekend(now) && weekdayFor !== night ? 'weekend' : null) ??
        (awayMs >= AWAY_MS ? 'welcomeback' : null) ??
        (Date.now() - sessionStartAt >= nextCakeAt(cakes) ? 'cake' : null) ??
        (Date.now() - Math.max(stretchStartAt, breakSuggestedAt) >= BREAK_REMINDER_MS ? 'water' : null)
      if (reaction === 'yawn') yawnedFor = night
      if (reaction === 'monday' || reaction === 'weekend') weekdayFor = night
      // Each milestone's cake once: a session that waited past several gets one cake and moves on to the next milestone ahead
      if (reaction === 'cake') while (Date.now() - sessionStartAt >= nextCakeAt(cakes)) cakes += 1
      if (reaction === 'water') breakSuggestedAt = Date.now()
      if (reaction) play(reaction)
    }
    // Anything still marked as waiting on you is over once you send a prompt
    waiting = null
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    touch()
    turnStartAt = Date.now()
    hasTappedThisTurn = false
    toolsThisTurn = 0
    hasDrenchedThisTurn = false
    isTurnRunning = true
    lastTool = null
    replyText = ''
    replyLength = 0
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    isTurnRunning = false
    thinkingSince = 0
    waiting = null
    doneAt = Date.now()
    touch()
    // You stopped Claude mid-reply: he jumps
    if (e.reason === 'aborted') play('startled')
    return next(e)
  })

  // Watching Claude's reply stream past, without changing it: how long it thinks, what it writes, and how the reply ends.
  // Every piece is passed straight on; the watching is wrapped so a mistake here can never hold up the reply.
  on('turn.step', async function* ($, e, next) {
    const isMain = !e.agentId
    let toolsThisStep = 0
    const stream = next(e)[Symbol.asyncIterator]()
    while (true) {
      const step = await stream.next()
      if (step.done) return step.value
      try {
        if (isMain) toolsThisStep = noticeChunk(step.value, toolsThisStep)
      } catch {
        // Only his reactions are lost; the reply goes on
      }
      yield step.value
    }
  })

  on('tool.call', async ($, e, next) => {
    lastTool = e.tool
    lastToolAt = Date.now()
    touch()
    const startedAt = Date.now()
    // Claude's own questions for you: he holds up a "?" bubble (stacked, with a count, for several) until you answer
    const isQuestion = e.tool === 'AskUserQuestion'
    if (isQuestion) {
      waiting = 'asking'
      questions = Array.isArray(e.input?.questions) ? Math.max(1, e.input.questions.length) : 1
      $.ui.invalidate('ui.render')
    }
    // A web search or fetch: he opens a laptop and types away
    if (SEARCH_TOOLS.has(e.tool) && Date.now() - lastSearchAt > SEARCH_EVERY_MS) {
      lastSearchAt = Date.now()
      play('browse')
      $.ui.invalidate('ui.render')
    }
    // Searching the code, or a command worth being nervous about, gets its reaction as it starts
    const atStart = CODE_SEARCH_TOOLS.has(e.tool) ? 'magnify' : e.tool === 'Bash' ? startReaction(e.input?.command, new Date(Date.now())) : null
    if ((atStart && atStart !== 'magnify') || (atStart === 'magnify' && Date.now() - lastCodeSearchAt > SEARCH_EVERY_MS)) {
      if (atStart === 'magnify') lastCodeSearchAt = Date.now()
      play(atStart)
      $.ui.invalidate('ui.render')
    }
    // A file that does not exist yet: he hatches it from an egg
    let hatched = false
    if (e.tool === 'Write' && typeof e.input?.file_path === 'string' && Date.now() - (toolLookAt.hatch ?? 0) > SEARCH_EVERY_MS) {
      // If the check fails for any reason, no egg: better to miss one than to hatch a file that was already there
      const isNew = await Promise.resolve().then(() => $.fs.exists(e.input.file_path)).then((found) => found === false, () => false)
      if (isNew) {
        toolLookAt.hatch = Date.now()
        hatched = true
        play('hatch')
        $.ui.invalidate('ui.render')
      }
    }
    // Reading, the to-do list, skills, the browser, connected apps: each has a look of its own
    const toolLook = hatched ? null : toolReaction(e.tool, e.input)
    const every = toolLook && toolLook === fileLook(e.input?.file_path) ? FILE_LOOK_EVERY_MS : SEARCH_EVERY_MS
    if (toolLook && Date.now() - (toolLookAt[toolLook] ?? 0) > every) {
      toolLookAt[toolLook] = Date.now()
      play(toolLook)
      $.ui.invalidate('ui.render')
    }
    // A long run of tools in one reply: he gets drenched in sweat and cools off, once a reply (after the tool's own look, so it wins)
    toolsThisTurn += 1
    if (!hasDrenchedThisTurn && toolsThisTurn >= LONG_TOOL_RUN) {
      hasDrenchedThisTurn = true
      play('drench')
      $.ui.invalidate('ui.render')
    }
    let result
    try {
      result = await next(e)
      return result
    } finally {
      // next() includes any permission dialog, so once it is back that question has been answered
      const askedHere = waiting === 'permission' && permissionAt >= startedAt
      if (isQuestion || askedHere) waiting = null
      // A dialog you answered "no" to comes back as a refusal or an error
      if (askedHere && (result === undefined || 'deny' in result || result.isError === true)) play('shrug')
      if (isQuestion || askedHere) $.ui.invalidate('ui.render')
      // Claude handed you a file or a page (and it was not refused): he presents it
      const isPublish = e.tool !== 'Artifact' || [undefined, 'publish'].includes(e.input?.action)
      // A finished command: tests passing or failing, a commit, a push
      // A giant file came back from a read: he heaves the huge book
      const reaction = e.tool === 'Bash' ? commandReaction(e.input?.command, result) : e.tool === 'Read' && isGiantRead(result) ? 'heavybook' : null
      if (reaction) {
        play(reaction)
        $.ui.invalidate('ui.render')
      }
      if (PRESENT_TOOLS.has(e.tool) && isPublish && result && !('deny' in result) && result.isError !== true) {
        play('present')
        $.ui.invalidate('ui.render')
      }
    }
  })

  on('command.run', { command: 'krab' }, async ($, e) => {
    const choice = e.args.trim().toLowerCase()
    if (choice === 'weather' || choice.startsWith('weather ')) {
      const wanted = choice.slice('weather'.length).trim() || 'auto'
      if (wanted !== 'auto' && wanted !== 'off' && !(wanted in TRIAL)) return { text: `Use /krab weather auto, off, or try one: ${Object.keys(TRIAL).join(', ')}` }
      weatherChoice = wanted
      isEnabled = true
      await saveWeather($, wanted)
      $.ui.invalidate('ui.render')
      const where = place ? `in ${place.name}` : 'once you set /krab location <city>'
      return { text: wanted === 'auto' ? `Krab follows the weather ${where}` : wanted === 'off' ? 'Krab ignores the weather' : `Krab shows ${wanted} weather` }
    }
    // Your special days: /krab birthday Jan 15, /krab gf-birthday, bf-birthday, anniversary (or "off" to clear one)
    const [word, ...rest] = e.args.trim().split(/\s+/)
    const dayKey = DAY_COMMANDS[(word ?? '').toLowerCase()]
    if (dayKey) {
      const value = rest.join(' ').trim()
      if (!value) return { text: `${DAY_NAMES[dayKey]}: ${monthDayWords(days[dayKey])}. Set it with /krab ${word.toLowerCase()} Jan 15 (or 1/15), or clear it with off.` }
      if (value.toLowerCase() === 'off') {
        const { [dayKey]: _gone, ...left } = days
        days = left
      } else {
        const parsed = parseMonthDay(value)
        if (!parsed) return { text: `"${value}" isn't a date I can read. Try /krab ${word.toLowerCase()} Jan 15, 15 Jan or 1/15.` }
        days = { ...days, [dayKey]: parsed }
      }
      const saved = await saveSetting($, 'days', days)
      $.ui.invalidate('ui.render')
      const note = saved ? '' : ' (could not save it: it lasts until you restart)'
      return { text: days[dayKey] ? `Krab will celebrate ${DAY_NAMES[dayKey]} on ${monthDayWords(days[dayKey])}${note}` : `Cleared ${DAY_NAMES[dayKey]}${note}` }
    }
    // Where you are, for the live weather and the night sky: /krab location Toronto, /krab location 43.7, -79.4, or off
    if (choice === 'location' || choice.startsWith('location ')) {
      const value = e.args.trim().slice('location'.length).trim()
      if (!value) return { text: place ? `Krab's weather and sky follow ${place.name}. Change it with /krab location <city>, or turn it off with /krab location off.` : 'No location set, so Krab shows no live weather. Set one with /krab location <city> (only that name is sent, to Open-Meteo, to find it).' }
      if (value.toLowerCase() === 'off') {
        place = null
        weather = null
        await saveSetting($, 'place', null)
        $.ui.invalidate('ui.render')
        return { text: 'Location cleared: Krab shows no live weather' }
      }
      const found = parseCoordinates(value) ? { name: value, ...parseCoordinates(value) } : await findPlace($, value)
      if (!found) return { text: `Couldn't find "${value}". Try a nearby city, or type coordinates like /krab location 43.7, -79.4.` }
      place = found
      await saveSetting($, 'place', place)
      // Read the new place's weather right away instead of waiting for the next quarter-hour check
      const reading = await fetchWeather($, place)
      weather = reading
      weatherAt = reading ? Date.now() : 0
      $.ui.invalidate('ui.render')
      return { text: `Krab's weather and sky now follow ${place.name}` }
    }
    // Which countries' holidays you get: /krab holidays CA-ON US (worldwide days like New Year's and Halloween always show)
    if (choice === 'holidays' || choice.startsWith('holidays ')) {
      const value = choice.slice('holidays'.length).trim()
      const known = REGION_CODES.join(', ')
      if (!value) return { text: `Holidays from: ${regions.length ? regions.join(', ') : 'worldwide only'}. Set them with /krab holidays CA-ON US (codes with holidays so far: ${known}; a province or state like CA-MB adds its own days), or none.` }
      const next = value === 'none' ? { regions: [], bad: [] } : parseRegions(value)
      if (next.bad.length) return { text: `${next.bad.join(', ')} isn't a region code. Use two-letter country codes like CA, US, MX, CL, GB, AU, optionally with a province or state (CA-MB).` }
      regions = next.regions
      await saveSetting($, 'regions', regions)
      $.ui.invalidate('ui.render')
      return { text: regions.length ? `Krab celebrates holidays from ${regions.join(', ')}, plus the worldwide ones` : 'Krab celebrates only the worldwide holidays' }
    }
    // Everything you have set, in one line
    if (choice === 'settings') {
      const dayList = Object.entries(DAY_NAMES).map(([key, name]) => `${name}: ${monthDayWords(days[key])}`).join('; ')
      const missing = [
        ...(place ? [] : ['/krab location <city> for your weather and seasons']),
        ...(regions.length ? [] : ['/krab holidays CA US (your country codes) for your holidays']),
        ...(Object.values(days).some(Boolean) ? [] : ['/krab birthday Jan 15 (and gf-birthday, bf-birthday, anniversary) for your days']),
      ]
      const hint = missing.length ? ` To set up: ${missing.join('; ')}.` : ''
      return { text: `${dayList}. Location: ${place?.name ?? 'not set'}. Holidays: ${regions.length ? regions.join(', ') : 'worldwide only'}.${hint}` }
    }
    if (choice === 'time' || choice.startsWith('time ')) {
      const wanted = choice.slice('time'.length).trim() || 'auto'
      if (wanted !== 'auto' && !(wanted in TRIAL_HOURS)) return { text: `Use /krab time auto, or try one: ${Object.keys(TRIAL_HOURS).join(', ')}` }
      timeChoice = wanted
      isEnabled = true
      $.ui.invalidate('ui.render')
      return { text: wanted === 'auto' ? 'Krab follows the clock' : `Krab shows ${wanted} time (until you restart)` }
    }
    if (choice === 'sky' || choice.startsWith('sky ')) {
      const wanted = choice.slice('sky'.length).trim() || 'auto'
      if (!['auto', 'aurora', 'meteors', 'bloodmoon', 'supermoon', 'harvest', 'ufo', 'comet', 'eclipse'].includes(wanted)) return { text: 'Use /krab sky auto, or try one: aurora, meteors, bloodmoon, supermoon, harvest, ufo, comet (at night), eclipse (by day)' }
      skyChoice = wanted
      isEnabled = true
      $.ui.invalidate('ui.render')
      return { text: wanted === 'auto' ? 'Krab follows the real night sky' : `Krab shows the ${wanted} (until you restart)` }
    }
    if (choice === 'outfit' || choice.startsWith('outfit ')) {
      const wanted = choice.slice('outfit'.length).trim() || 'auto'
      if (wanted !== 'auto' && wanted !== 'off' && !OUTFIT_IDS.includes(wanted)) return { text: `Use /krab outfit auto, off, or one of: ${OUTFIT_IDS.join(', ')}` }
      outfitChoice = wanted
      isEnabled = true
      await saveOutfit($, wanted)
      $.ui.invalidate('ui.render')
      return { text: wanted === 'auto' ? 'Krab dresses for the date' : wanted === 'off' ? 'Krab goes without outfits' : `Krab wears the ${wanted} outfit` }
    }
    if (choice === 'off') isEnabled = false
    else if (choice === 'on' || choice === '') isEnabled = true
    else if (choice in SIZES) {
      size = choice
      isEnabled = true
      await saveSize($, size)
      $.ui.invalidate('ui.render')
      return { text: `Krab is ${size} size` }
    } else return { text: 'Use /krab on, off, small, normal, big, outfit auto|off|<name>, weather auto|off|<kind>, time auto|night|sunrise|sunset|day, sky auto|aurora|meteors|bloodmoon|supermoon|harvest|ufo|comet|eclipse, settings, birthday|gf-birthday|bf-birthday|anniversary <date>, location <city>, or holidays <codes>' }
    $.ui.invalidate('ui.render')
    return { text: isEnabled ? 'Krab is on' : 'Krab is off' }
  })

  // The little heart beside him: pressing it pets him
  const petButton = (Button) => Button({ key: PET_KEY, label: '♥', plain: true, dimColor: true, onPress: () => {} })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const columns = e.props.bodyColumns
    bandColumns = columns ?? 0
    if (!isEnabled || !columns || columns < SPRITE_COLUMNS + MIN_EXTRA_COLUMNS) return next(e)

    const { Box, Text, Svg, Raster, Button } = $.ui.resolve(e)
    surface = e.surface
    const ctx = contextNow()
    const others = await next(e)
    const rest = others ? [others] : []

    if (e.surface === 'terminal') {
      const note = noteFor(ctx)
      const readout = chipsText(chipsFor(snapshot, note))
      return Box({
        flexDirection: 'column',
        children: [
          Raster({
            key: 'krab',
            columns,
            rows: SPRITE_ROWS,
            cells: packCells(cellNumbers(pixelsFor(poseFor(life, ctx)), columns, STAND_COL)),
          }),
          Box({
            flexDirection: 'row',
            children: [...readout.map((part, i) => Text({ key: `readout-${i}`, children: [part.text], color: part.color, dimColor: part.dim === true })), petButton(Button)],
          }),
          ...rest,
        ],
      })
    }

    // On the desktop the readout is part of the drawing, so he stands right on top of it
    const layout = desktopLayout(ctx)
    // The heart sits on the drawing, just after the corner tag with the time and the little session Clawds.
    // A floating box is placed in whole text cells (a fraction makes the app throw the whole band out), and a column is COLUMN_PX wide
    const heartColumn = layout.hudEnd ? Math.ceil(layout.hudEnd / COLUMN_PX) + 1 : 0
    return Box({
      flexDirection: 'column',
      children: [
        Box({
          position: 'relative',
          children: [
            Svg({
              source: layout.svg,
              alt: `Krab Koder, a crab mascot. ${readout(snapshot)}`,
              isInteractive: true,
              width: layout.width,
              height: layout.height,
            }),
            Box({ position: 'absolute', top: 0, left: heartColumn, children: [petButton(Button)] }),
          ],
        }),
        ...rest,
      ],
    })
  })
}
