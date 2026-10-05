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
