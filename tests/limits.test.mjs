// Run with: node --test tests/limits.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CELEBRATE_AT,
  findLimit,
  FIVE_HOUR,
  FRESH_MS,
  limitWarning,
  percentBucket,
  rememberReading,
  resetThatEnded,
  warningLevel,
  WEEK,
} from '../hooks/limits.mjs'

const HOUR = 60 * 60 * 1000
const NOW = Date.parse('2026-10-03T12:00:00Z')

test('findLimit reads a window by name and turns the reset time into milliseconds', () => {
  const limits = [
    { kind: FIVE_HOUR, percentUsed: 41, resetsAt: '2026-10-03T15:00:00Z' },
    { kind: WEEK, percentUsed: 12.5 },
  ]
  assert.deepEqual(findLimit(limits, FIVE_HOUR), { percentUsed: 41, resetsAtMs: Date.parse('2026-10-03T15:00:00Z') })
  assert.deepEqual(findLimit(limits, WEEK), { percentUsed: 12.5, resetsAtMs: null })
  assert.equal(findLimit([], FIVE_HOUR), null)
  assert.equal(findLimit(undefined, FIVE_HOUR), null)
})

test('warning levels start at 80 and turn urgent at 95', () => {
  assert.deepEqual([0, 79.9, 80, 94.9, 95, 120].map(warningLevel), [0, 0, 1, 1, 2, 2])
  assert.equal(warningLevel(undefined), 0)
})

test('the fuller limit is shown, and the five-hour limit wins a tie', () => {
  assert.equal(limitWarning(50, 50), null)
  assert.deepEqual(limitWarning(85, 40), { state: 'clock', percent: 85 })
  assert.deepEqual(limitWarning(30, 90), { state: 'calendar', percent: 90 })
  assert.deepEqual(limitWarning(85, 92), { state: 'calendar', percent: 92 })
  assert.deepEqual(limitWarning(92, 92), { state: 'clock', percent: 92 })
  assert.deepEqual(limitWarning(undefined, 81), { state: 'calendar', percent: 81 })
})

test('the drawing is only rebuilt when the limit moves by a visible step', () => {
  assert.equal(percentBucket(81), 80)
  assert.equal(percentBucket(82.4), 80)
  assert.equal(percentBucket(82.6), 85)
  assert.equal(percentBucket(103), 100)
})

test('a reset is celebrated when the clock passes the end of a window you really used', () => {
  const last = { percentUsed: 88, resetsAtMs: NOW - 1000 }
  assert.equal(resetThatEnded({ last, reading: null, nowMs: NOW }), NOW - 1000)
})

test('no celebration before the window ends', () => {
  const last = { percentUsed: 88, resetsAtMs: NOW + HOUR }
  assert.equal(resetThatEnded({ last, reading: null, nowMs: NOW }), null)
})

test('a new window showing up in a reading also counts, even a little early', () => {
  const last = { percentUsed: 70, resetsAtMs: NOW + 60_000 }
  const reading = { percentUsed: 2, resetsAtMs: NOW + 5 * HOUR }
  assert.equal(resetThatEnded({ last, reading, nowMs: NOW }), NOW + 60_000)
})

test('each reset is celebrated once', () => {
  const ended = NOW - 1000
  const last = { percentUsed: 88, resetsAtMs: ended, celebratedFor: ended }
  assert.equal(resetThatEnded({ last, reading: null, nowMs: NOW }), null)
})

test('a quiet window is not worth a flag', () => {
  const last = { percentUsed: CELEBRATE_AT - 1, resetsAtMs: NOW - 1000 }
  assert.equal(resetThatEnded({ last, reading: null, nowMs: NOW }), null)
  assert.equal(resetThatEnded({ last: { ...last, percentUsed: CELEBRATE_AT }, reading: null, nowMs: NOW }), NOW - 1000)
})

test('an old reset you were away for is not celebrated', () => {
  const last = { percentUsed: 95, resetsAtMs: NOW - FRESH_MS - 1000 }
  assert.equal(resetThatEnded({ last, reading: null, nowMs: NOW }), null)
})

test('no memory, or no reset time, means nothing to celebrate', () => {
  assert.equal(resetThatEnded({ last: null, reading: null, nowMs: NOW }), null)
  assert.equal(resetThatEnded({ last: { percentUsed: 90, resetsAtMs: null }, reading: null, nowMs: NOW }), null)
})

test('remembering a reading keeps the mark of the last window that was celebrated', () => {
  const last = { percentUsed: 90, resetsAtMs: 111, celebratedFor: 111 }
  const next = rememberReading(last, { percentUsed: 3, resetsAtMs: 999 })
  assert.deepEqual(next, { percentUsed: 3, resetsAtMs: 999, celebratedFor: 111 })
  assert.equal(rememberReading(last, null), last)
  assert.deepEqual(rememberReading(null, { percentUsed: 5, resetsAtMs: 7 }), { percentUsed: 5, resetsAtMs: 7, celebratedFor: null })
})

test('the full path: use the window, let it end, celebrate once, then start a new window', () => {
  let last = rememberReading(null, { percentUsed: 91, resetsAtMs: NOW + HOUR })
  assert.equal(resetThatEnded({ last, reading: null, nowMs: NOW }), null)
  const later = NOW + HOUR + 1000
  const ended = resetThatEnded({ last, reading: null, nowMs: later })
  assert.equal(ended, NOW + HOUR)
  last = { ...last, celebratedFor: ended }
  assert.equal(resetThatEnded({ last, reading: null, nowMs: later + 60_000 }), null)
  const reading = { percentUsed: 4, resetsAtMs: later + 5 * HOUR }
  assert.equal(resetThatEnded({ last, reading, nowMs: later + 60_000 }), null)
  last = rememberReading(last, reading)
  assert.equal(last.celebratedFor, ended)
})

// ---- the 98% alert ----

import { ALERT_AT, dueAlert } from '../hooks/limits.mjs'

const reading = (percentUsed, resetsAtMs = 1000) => ({ percentUsed, resetsAtMs })

test('a limit at 98% is due an alert, one at 97% is not', () => {
  assert.equal(ALERT_AT, 98)
  assert.equal(dueAlert({ five: reading(97), week: reading(97.9) }, {}), null)
  assert.deepEqual(dueAlert({ five: null, week: reading(98) }, {}), { which: 'week', state: 'calendar', percent: 98, key: 1000 })
  assert.deepEqual(dueAlert({ five: reading(99.5), week: null }, {}), { which: 'five', state: 'clock', percent: 99.5, key: 1000 })
})

test('each window is announced once, and a new window is announced again', () => {
  assert.equal(dueAlert({ five: null, week: reading(99) }, { week: 1000 }), null)
  assert.equal(dueAlert({ five: null, week: reading(99, 2000) }, { week: 1000 }).key, 2000)
})

test('if both limits are due, the fuller one is announced first', () => {
  assert.equal(dueAlert({ five: reading(98.5), week: reading(99.2) }, {}).which, 'week')
  assert.equal(dueAlert({ five: reading(99.9), week: reading(98.1) }, {}).which, 'five')
  // once one is announced the other is still due
  assert.equal(dueAlert({ five: reading(99.9), week: reading(98.1) }, { five: 1000 }).which, 'week')
})

test('a limit with no reset time is still announced, once', () => {
  const noTime = { percentUsed: 99, resetsAtMs: null }
  const first = dueAlert({ five: null, week: noTime }, {})
  assert.equal(first.key, 'no-reset-time')
  assert.equal(dueAlert({ five: null, week: noTime }, { week: first.key }), null)
})
