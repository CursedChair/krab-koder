// Run with: node --test tests/notes.test.mjs
// The preview page explains when each look plays. These tests make the page match the real rules.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STATES, stateFor } from '../hooks/life.mjs'
import { NOTES, PRIORITY } from '../preview/notes.mjs'

const calm = { mood: 'happy', turnRunning: false, asleep: false, tool: null, toolAgeMs: 99999, doneAgeMs: 99999, wakeAgeMs: 99999, gymAgeMs: 99999, flagAgeMs: 99999, alertAgeMs: 99999, alertState: null, limit: null }

test('every look has a note saying what starts it, how long it lasts, and what takes over', () => {
  for (const state of STATES) {
    for (const part of ['starts', 'lasts', 'then']) {
      assert.ok(NOTES[state]?.[part]?.length > 20, `${state}.${part}`)
    }
  }
  assert.deepEqual(Object.keys(NOTES).sort(), [...STATES].sort())
})

test('the numbers in the notes are the real ones', () => {
  assert.match(NOTES.gym.lasts, /5\.7 seconds/)
  assert.match(NOTES.flag.lasts, /8\.8 seconds/)
  assert.match(NOTES.asleep.starts, /60 seconds/)
  assert.match(NOTES.done.lasts, /3.9 seconds/)
  assert.match(NOTES.clock.starts, /80%/)
  assert.match(NOTES.calendar.starts, /98%/)
  assert.match(NOTES.calm.lasts, /5 seconds to 12\.8 seconds/)
})

test('each line of the "who wins" list wins over every line below it', () => {
  assert.equal(PRIORITY.length, 12)
  for (let i = 0; i < PRIORITY.length; i++) {
    assert.ok(PRIORITY[i].looks.includes(stateFor({ ...calm, ...PRIORITY[i].patch })), `${PRIORITY[i].name} on its own`)
    for (let j = i + 1; j < PRIORITY.length; j++) {
      const both = stateFor({ ...calm, ...PRIORITY[j].patch, ...PRIORITY[i].patch })
      assert.ok(PRIORITY[i].looks.includes(both), `"${PRIORITY[i].name}" should beat "${PRIORITY[j].name}", but ${both} showed`)
    }
  }
})

test('the one exception is real: a plan limit at 95% or more outranks a nearly full context', () => {
  assert.equal(stateFor({ ...calm, mood: 'critical', limit: { state: 'calendar', percent: 96 } }), 'calendar')
  assert.equal(stateFor({ ...calm, mood: 'critical', limit: { state: 'calendar', percent: 90 } }), 'critical')
})

test('every look appears in the priority list', () => {
  const listed = new Set(PRIORITY.flatMap((line) => line.looks))
  for (const state of STATES) assert.ok(listed.has(state) || state === 'wake', `${state} is missing from the list`)
})
