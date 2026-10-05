// Run with: node --test tests/personal.test.mjs
// The shared defaults must stay empty: nobody's real dates or location belong in the code everyone gets.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PERSONAL } from '../hooks/personal.mjs'

test('the shared personal defaults are empty', () => {
  assert.deepEqual(PERSONAL, { days: {}, regions: [], place: null })
})
