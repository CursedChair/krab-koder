// Pure logic for plan limits and the events built on them.
// It never calls Claude Code, so plain node can test it.

export const FIVE_HOUR = 'five_hour'
export const WEEK = 'seven_day'

// Warn from 80% of a limit, and urgently from 95%
export const WARN_AT = 80
export const URGENT_AT = 95

// Past this the limit is nearly gone: Clawd comes back with the clock or calendar, even mid-work
export const ALERT_AT = 98

// A reset only gets the flag if you had really used the window (otherwise it is just noise)
export const CELEBRATE_AT = 50

// A reset you were away for is only worth a flag if it was recent
export const FRESH_MS = 12 * 60 * 60 * 1000

export function findLimit(rateLimits, kind) {
  const found = (rateLimits ?? []).find((limit) => limit.kind === kind)
  if (!found || typeof found.percentUsed !== 'number') return null
  const resetsAtMs = found.resetsAt ? Date.parse(found.resetsAt) : Number.NaN
  return { percentUsed: found.percentUsed, resetsAtMs: Number.isNaN(resetsAtMs) ? null : resetsAtMs }
}

export function warningLevel(percent) {
  if (typeof percent !== 'number') return 0
  if (percent >= URGENT_AT) return 2
  if (percent >= WARN_AT) return 1
  return 0
}

// Which limit to show right now: the fuller one, the five-hour limit winning a tie.
// Returns { state: 'clock' | 'calendar', percent } or null when neither is near.
export function limitWarning(five, week) {
  const fiveLevel = warningLevel(five)
  const weekLevel = warningLevel(week)
  if (fiveLevel === 0 && weekLevel === 0) return null
  if (weekLevel > 0 && (fiveLevel === 0 || week > five)) return { state: 'calendar', percent: week }
  return { state: 'clock', percent: five }
}

// Buckets the percent so the drawing is only rebuilt when it visibly changes
export function percentBucket(percent) {
  return Math.min(100, Math.round(percent / 5) * 5)
}

// Decide whether the five-hour window just reset.
// last: the last reading we saw { percentUsed, resetsAtMs, celebratedFor? } or null
// reading: a fresh reading, or null when only the clock moved
// Returns the resetsAtMs of the window that ended (to celebrate and to remember), or null.
export function resetThatEnded({ last, reading, nowMs }) {
  if (!last || last.resetsAtMs === null || last.resetsAtMs === undefined) return null
  if (last.celebratedFor === last.resetsAtMs) return null
  if (last.percentUsed < CELEBRATE_AT) return null
  if (nowMs - last.resetsAtMs > FRESH_MS) return null
  const clockPassed = nowMs >= last.resetsAtMs
  const windowMoved = reading !== null && reading.resetsAtMs !== null && reading.resetsAtMs > last.resetsAtMs
  return clockPassed || windowMoved ? last.resetsAtMs : null
}

// What to remember after a reading. The mark for the last window we celebrated always carries over.
export function rememberReading(last, reading) {
  if (reading === null) return last
  return {
    percentUsed: reading.percentUsed,
    resetsAtMs: reading.resetsAtMs,
    celebratedFor: last?.celebratedFor ?? null,
  }
}

// Which limit just reached the alert level, and for which window. Each window alerts once.
// readings: { five, week } as findLimit gives them; alerted: { five, week } of the windows already announced.
// Returns { which: 'five' | 'week', state, percent, key } or null. The fuller limit wins if both are due.
export function dueAlert(readings, alerted) {
  const due = []
  for (const [which, state] of [['five', 'clock'], ['week', 'calendar']]) {
    const reading = readings[which]
    if (!reading || reading.percentUsed < ALERT_AT) continue
    const key = reading.resetsAtMs ?? 'no-reset-time'
    if (alerted[which] !== key) due.push({ which, state, percent: reading.percentUsed, key })
  }
  return due.sort((a, b) => b.percent - a.percent)[0] ?? null
}

// ---- Weekly pace: are you on track to run out of the weekly limit before it resets? ----
const DAY_MS = 86_400_000
export const WEEK_MS = 7 * DAY_MS
// An even pace is 100% over 7 days (about 14.3% a day). He only warns once you are this many points ahead of it,
// so one busy hour early in the week is not nagged about.
export const PACE_MARGIN = 5
// A run-out this many days or more before the reset makes the warning urgent
const URGENT_DAYS_EARLY = 1

// week: the weekly reading as findLimit gives it. Returns null when the reset time is unknown, otherwise
// { used, fairShare (how much an even pace would have used by now), perDay (what is left per remaining day),
//   runsOutMs (when it runs out at this week's average rate, or null), resetsAtMs, isOver, isUrgent }
export function weekPace(week, nowMs) {
  if (!week || week.resetsAtMs === null || week.resetsAtMs === undefined) return null
  const startMs = week.resetsAtMs - WEEK_MS
  const elapsed = Math.min(Math.max(nowMs - startMs, 0), WEEK_MS)
  const left = WEEK_MS - elapsed
  if (left <= 0) return null
  const fairShare = (elapsed / WEEK_MS) * 100
  const perDay = Math.max(0, 100 - week.percentUsed) / (left / DAY_MS)
  const runsOutMs = elapsed > 0 && week.percentUsed > 0 ? startMs + (100 / week.percentUsed) * elapsed : null
  const isOver = week.percentUsed >= fairShare + PACE_MARGIN && runsOutMs !== null && runsOutMs < week.resetsAtMs
  const isUrgent = isOver && week.resetsAtMs - runsOutMs >= URGENT_DAYS_EARLY * DAY_MS
  return { used: week.percentUsed, fairShare, perDay, runsOutMs, resetsAtMs: week.resetsAtMs, isOver, isUrgent }
}

// A moment in words, like "Thu 3 PM" ("today 3 PM" when it is today)
export function whenText(ms, nowMs) {
  const d = new Date(ms)
  const hour = d.getHours()
  const time = `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
  if (new Date(nowMs).toDateString() === d.toDateString()) return `today ${time}`
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`
}

// The warning for a pace that is over: when it runs out, when it resets, and how much a day makes it last
export function paceMessage(pace, nowMs) {
  return `Weekly limit: ${Math.round(pace.used)}% used, but an even pace would be ${Math.round(pace.fairShare)}% by now. ` +
    `At this rate it runs out ${whenText(pace.runsOutMs, nowMs)}, before it resets ${whenText(pace.resetsAtMs, nowMs)}. ` +
    `To make it last, keep to about ${Math.floor(pace.perDay)}% a day.`
}

// ---- Your own daily limit: the slice of the weekly limit you allow yourself each day ----
// The default: an even share of the week, 100% over 7 days (about 14.3%)
export const DEFAULT_DAILY_LIMIT = 100 / 7
// Past the daily limit he gets scared, and again each time you go another quarter of the limit further
const SCARE_STEP = 0.25

// dayStart: { day, percent, window, scaredStep } remembered from earlier today, or null. today: the date in words.
// Today starts at the first weekly reading of the day (or when the week resets). Returns the record to keep and today's use.
export function todayUsage(dayStart, week, today) {
  if (!week) return { dayStart, used: null }
  const window = week.resetsAtMs ?? null
  const isFresh = !dayStart || dayStart.day !== today || dayStart.window !== window || week.percentUsed < dayStart.percent
  const start = isFresh ? { day: today, percent: week.percentUsed, window, scaredStep: -1 } : dayStart
  return { dayStart: start, used: Math.max(0, week.percentUsed - start.percent) }
}

// How far past the daily limit today's use is, in quarter-limit steps: -1 under it, 0 just past it, 1 a quarter further...
export function scareStep(used, limit) {
  if (typeof used !== 'number' || !(limit > 0) || used < limit) return -1
  return Math.floor((used - limit) / (limit * SCARE_STEP))
}
