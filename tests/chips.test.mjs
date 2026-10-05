// Run with: node --test tests/chips.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CHIP_HEIGHT, chipsFor, chipsSvg, chipsText, levelColor } from '../hooks/chips.mjs'

const snapshot = {
  context: { percent: 87.2 },
  rateLimits: [{ kind: 'five_hour', percentUsed: 45 }, { kind: 'seven_day', percentUsed: 47.4 }],
  cost: { usd: 42.256 },
}

test('the colour goes from green to red as a meter fills', () => {
  const colours = [10, 49, 50, 79, 80, 94, 95, 100].map(levelColor)
  assert.equal(new Set(colours).size, 4)
  assert.equal(colours[0], colours[1])
  assert.notEqual(colours[1], colours[2])
  assert.notEqual(colours[3], colours[4])
  assert.notEqual(colours[5], colours[6])
})

test('the pills are context, the two limits, cost and a status word', () => {
  const chips = chipsFor(snapshot)
  assert.deepEqual(chips.map((c) => c.text), ['87%', '45%', '47%', '$42.26', 'getting full'])
  assert.deepEqual(chips.filter((c) => c.kind === 'meter').map((c) => c.label), ['context', '5h', '7d'])
})

test('a plain chat with nothing to show yet, or without plan limits, still reads sensibly', () => {
  assert.deepEqual(chipsFor(null).map((c) => c.text), ['waiting for the first reply'])
  assert.deepEqual(chipsFor({ context: {}, rateLimits: [] }).map((c) => c.text), ['context —'])
  assert.deepEqual(chipsFor({ context: { percent: 20 }, rateLimits: [] }).map((c) => c.text), ['20%'])
})

test('a note replaces the numbers while an event plays', () => {
  const chips = chipsFor(snapshot, 'switched to opus-5-5')
  assert.deepEqual(chips.map((c) => c.text), ['switched to opus-5-5'])
})

test('the drawing: one pill each, a coloured bar for meters, and words that are safe to embed', () => {
  const svg = chipsSvg(chipsFor(snapshot), 456)
  assert.equal((svg.match(/<g transform="translate/g) ?? []).length, 5)
  assert.ok(svg.includes(levelColor(87.2)))
  const hostile = chipsSvg([{ kind: 'note', text: '<script>alert(1)</script> & more', color: '#fff' }], 456)
  assert.doesNotMatch(hostile, /<script/)
  assert.ok(hostile.includes('&lt;script&gt;'))
})

test('pills that do not fit are left out, last first, and never overflow', () => {
  const full = chipsSvg(chipsFor(snapshot), 456)
  const narrow = chipsSvg(chipsFor(snapshot), 200)
  assert.ok((narrow.match(/<g transform="translate/g) ?? []).length < (full.match(/<g transform="translate/g) ?? []).length)
  for (const [, x] of narrow.matchAll(/<g transform="translate\(([\d.]+) 0\)"/g)) assert.ok(Number(x) < 200)
  assert.equal(CHIP_HEIGHT, 16)
})

test('the terminal gets coloured text with a small bar for each meter', () => {
  const parts = chipsText(chipsFor(snapshot))
  assert.equal(parts.map((p) => p.text).join(''), 'context ▰▰▰▰▱ 87%  5h ▰▰▱▱▱ 45%  7d ▰▰▱▱▱ 47%  $42.26  getting full')
  assert.ok(parts.some((p) => p.color === 'green'))
  assert.ok(parts.some((p) => p.color === 'yellow'))
})

test('a pill says how long until the 5-hour limit resets', () => {
  const now = Date.parse('2026-10-03T12:00:00Z')
  const at = (ms) => new Date(now + ms).toISOString()
  const last = (resetsAt) => chipsFor({ context: { percent: 10 }, rateLimits: [{ kind: 'five_hour', percentUsed: 47, resetsAt }] }, null, now).at(-1).text
  assert.equal(last(at(2 * 3600e3 + 14 * 60e3)), 'resets in 2h 14m')
  assert.equal(last(at(38 * 60e3)), 'resets in 38m')
  assert.equal(last(at(3600e3 + 5 * 60e3)), 'resets in 1h 05m')
  assert.notEqual(last(at(-1000)), 'resets in 0m')
  assert.equal(chipsFor({ context: { percent: 10 }, rateLimits: [{ kind: 'five_hour', percentUsed: 47 }] }, null, now).length, 2)
})

test('a narrow row squeezes: the bar shrinks, then goes, then labels shorten, and every value stays', async () => {
  const { fitChips } = await import('../hooks/chips.mjs')
  const chips = chipsFor(snapshot)
  const widths = [456, 410, 340, 296].map((w) => fitChips(chips, w))
  for (const fit of widths) assert.equal(fit.chips.length, chips.length, 'no pill is lost while squeezing')
  const bars = widths.map((fit) => fit.level.bar)
  assert.deepEqual(bars, [30, 16, 0, 0])
  assert.ok(widths[3].width <= 296)
  const svg = chipsSvg(chips, 296)
  for (const value of ['87%', '45%', '47%']) assert.ok(svg.includes(value), `${value} is still shown`)
  assert.ok(svg.includes('ctx'), 'the long label is shortened')
  // So narrow that pills must go: the last ones leave first and the values of the first stay
  const tiny = fitChips(chips, 150)
  assert.ok(tiny.chips.length < chips.length && tiny.chips[0].label === 'context')
})

test('over a picture the pills get a dark backing and light text, so they stay readable', () => {
  const plain = chipsSvg(chipsFor(snapshot), 456)
  const backed = chipsSvg(chipsFor(snapshot), 456, { backed: true })
  assert.ok(!plain.includes('#14161B'))
  assert.equal((backed.match(/fill="#14161B"/g) ?? []).length, 5)
  assert.ok(backed.includes('color="#F2F1EC"'))
})
