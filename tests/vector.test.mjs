// Run with: node --test tests/vector.test.mjs
import assert from 'node:assert/strict'
import { chipsSvg, levelColor } from '../hooks/chips.mjs'
import { test } from 'node:test'
import { bandLayout, bandSvg, figureFor, SIZES, TOP, TOP_TALL, topFor, UNIT, VECTOR_STATES, REACTIONS } from '../hooks/vector.mjs'
import { COLOURS, FLAG, GYM } from '../hooks/sheets.mjs'

const MAX_SVG_CHARS = 131_072
const GAITS = ['idle', 'run']

function everySvg(extra = {}) {
  return VECTOR_STATES.flatMap((state) =>
    GAITS.map((gait) => ({ state, gait, svg: bandSvg({ columns: 40, fromCol: 6, state, gait, ...extra }) })),
  )
}

// Every opened tag must close, so the markup is well formed
function assertBalanced(svg, label) {
  const stack = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = match
    if (selfClosing) continue
    if (closing) assert.equal(stack.pop(), name, `${label}: closing </${name}> does not match`)
    else stack.push(name)
  }
  assert.deepEqual(stack, [], `${label}: tags left open`)
}

test('every look in both versions is well-formed, small, and has nothing that can run code', () => {
  for (const { state, gait, svg } of everySvg()) {
    const label = `${state}/${gait}`
    assert.ok(svg.length < MAX_SVG_CHARS, `${label} is ${svg.length} characters`)
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="/, label)
    assertBalanced(svg, label)
    assert.doesNotMatch(svg, /<script|<foreignObject|<image|<use|href=|\son[a-z]+=/i, `${label} has something that can run or load`)
    assert.doesNotMatch(svg, /undefined|NaN|\[object/, `${label} has a bad value`)
  }
})

test('every animation has matching times, easing curves and values', () => {
  for (const { state, gait, svg } of everySvg()) {
    for (const tag of svg.match(/<animate(?:Transform)? [^>]*>/g) ?? []) {
      const get = (name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]
      const times = get('keyTimes').split(';').map(Number)
      const values = get('values').split(';')
      const label = `${state}/${gait}: ${tag.slice(0, 80)}`
      assert.equal(times.length, values.length, `${label}: times vs values`)
      assert.equal(times[0], 0, `${label}: must start at 0`)
      assert.equal(times.at(-1), 1, `${label}: must end at 1`)
      for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1], `${label}: times go backwards`)
      // Frame switching (discrete) has no curves between values
      if (get('calcMode') === 'discrete') continue
      const splines = get('keySplines').split(';')
      assert.equal(splines.length, values.length - 1, `${label}: curves vs values`)
      for (const curve of splines) {
        const points = curve.split(' ').map(Number)
        assert.equal(points.length, 4, `${label}: bad curve ${curve}`)
        assert.ok(points.every((p) => p >= 0 && p <= 1), `${label}: curve out of range ${curve}`)
      }
    }
  }
})

test('the running version of each look moves in a different way than the idle one', () => {
  // Gym and flag are single recorded animations: idle and running show the same frames
  for (const state of VECTOR_STATES.filter((name) => !['wake', 'gym', 'flag', 'bedtime', 'compact', 'limit', ...REACTIONS].includes(name))) {
    const idle = bandSvg({ columns: 40, fromCol: 6, state, gait: 'idle' })
    const run = bandSvg({ columns: 40, fromCol: 6, state, gait: 'run' })
    assert.notEqual(idle, run, `${state} has the same drawing idle and running`)
  }
})

test('legs follow the body down when he crouches or sleeps, so his feet stay on the floor', () => {
  for (const state of ['strained', 'asleep']) {
    assert.match(bandSvg({ columns: 40, fromCol: 6, state, gait: 'idle' }), /translate\([\d.]+ 7\d(\.\d+)?\) scale\(1 0\.\d+\)/, state)
  }
})

test('walking draws one slide across the band, and facing left flips him', () => {
  const walking = bandSvg({ columns: 40, fromCol: 4, toCol: 20, walkSeconds: 4, dir: 1, state: 'calm', gait: 'run' })
  assert.match(walking, /type="translate" dur="4s"[^>]*fill="freeze"/)
  assert.doesNotMatch(walking, /scale\(-1 1\)/)
  const left = bandSvg({ columns: 40, fromCol: 20, toCol: 4, walkSeconds: 4, dir: -1, state: 'calm', gait: 'run' })
  assert.match(left, /scale\(-1 1\)/)
})

test('a standing Clawd has no slide, only his own animations', () => {
  const standing = bandSvg({ columns: 40, fromCol: 6, state: 'calm', gait: 'idle' })
  assert.doesNotMatch(standing, /fill="freeze"/)
  assert.match(standing, /<g transform="translate\(100\.8 0\)">/)
})

test('waking up plays once and then holds; every other look loops', () => {
  const wake = bandSvg({ columns: 40, fromCol: 6, state: 'wake', gait: 'run' })
  assert.doesNotMatch(wake, /repeatCount/)
  // The reactions are either a loop (waiting on you, glitching) or play once and hold their last frame
  for (const state of VECTOR_STATES.filter((name) => name !== 'wake' && !REACTIONS.includes(name))) {
    assert.match(bandSvg({ columns: 40, fromCol: 6, state, gait: 'idle' }), /repeatCount="indefinite"/, state)
  }
  for (const state of REACTIONS) {
    assert.match(bandSvg({ columns: 40, fromCol: 6, state, gait: 'idle' }), /repeatCount="indefinite"|fill="freeze"/, state)
  }
})

test('the drawing is as wide as the band, and exactly as tall as the figure', () => {
  const { svg, width, height } = bandLayout({ columns: 50, fromCol: 0, state: 'calm', gait: 'idle' })
  assert.equal(width, 400)
  assert.equal(height, +((86 + 1 - TOP) * UNIT).toFixed(3))
  assert.match(svg, new RegExp(`width="400" height="${height}"`))
})

// ---- the recorded animations ----

const SHEETS = { gym: GYM, flag: FLAG }

test('the recorded sheets are complete: every step points at a real frame, with sensible lengths', () => {
  for (const [name, sheet] of Object.entries(SHEETS)) {
    assert.ok(sheet.frames.length >= 9, `${name}: ${sheet.frames.length} frames`)
    for (const [which, seconds] of sheet.sequence) {
      assert.ok(Number.isInteger(which) && which >= 0 && which < sheet.frames.length, `${name}: bad frame ${which}`)
      assert.ok(seconds > 0 && seconds < 2, `${name}: odd hold ${seconds}`)
    }
    const total = sheet.sequence.reduce((sum, [, seconds]) => sum + seconds, 0)
    assert.ok(total > 4 && total < 7, `${name}: ${total}s long`)
    for (const [index, frame] of sheet.frames.entries()) {
      assert.ok(Object.keys(frame).length > 0, `${name} frame ${index} is empty`)
      for (const [colour, rects] of Object.entries(frame)) {
        assert.ok(colour in COLOURS, `${name}: unknown colour ${colour}`)
        assert.equal(rects.length % 4, 0)
        assert.ok(rects.every((v) => Number.isFinite(v)), `${name}: bad number`)
      }
    }
  }
})

test('every frame of the recorded sheets is used, and each is the same size as the rest of the drawing', () => {
  for (const [name, sheet] of Object.entries(SHEETS)) {
    const used = new Set(sheet.sequence.map(([which]) => which))
    assert.equal(used.size, sheet.frames.length, `${name}: some frames are never shown`)
    const [minX, minY, maxX, maxY] = sheet.bounds
    assert.ok(minY >= topFor(name), `${name}: top at ${minY} is above the drawing area (${topFor(name)})`)
    assert.ok(maxY <= 86.5, `${name}: goes below the floor`)
    assert.ok(maxX - minX < 200, `${name}: ${maxX - minX} units wide`)
    // His body stays in the same place as the rest of the looks: the legs end on the floor
    const floorRects = sheet.frames.flatMap((frame) => (frame.skin ?? []).filter((_, i) => i % 4 === 1))
    assert.ok(floorRects.some((y) => Math.abs(y + 0 - 86) < 12), `${name}: no skin near the floor`)
  }
})

test('exactly one frame of a recorded sheet is showing at every moment', () => {
  for (const state of ['gym', 'flag']) {
    const svg = bandSvg({ columns: 60, fromCol: 20, state, gait: 'idle' })
    const groups = [...svg.matchAll(/<g visibility="hidden"[^>]*>.*?<animate ([^>]*)\/>/g)]
    assert.equal(groups.length, SHEETS[state].frames.length, state)
    const timeline = groups.map(([, tag]) => {
      const times = tag.match(/keyTimes="([^"]*)"/)[1].split(';').map(Number)
      const values = tag.match(/values="([^"]*)"/)[1].split(';')
      return (t) => {
        let shown = 'hidden'
        for (let i = 0; i < times.length; i++) if (times[i] <= t) shown = values[i]
        return shown === 'visible'
      }
    })
    const total = SHEETS[state].sequence.reduce((sum, [, seconds]) => sum + seconds, 0)
    for (let t = 0.001; t < total; t += 0.013) {
      const showing = timeline.filter((visible) => visible(t / total)).length
      assert.equal(showing, 1, `${state}: ${showing} frames showing at ${t.toFixed(3)}s`)
    }
  }
})

test('the recorded looks fit inside the band, even next to the edges', () => {
  for (const state of ['gym', 'flag']) {
    for (const [fromCol, dir] of [[0, 1], [0, -1], [30, 1], [48, -1], [60, 1]]) {
      const svg = bandSvg({ columns: 60, fromCol, state, gait: 'idle', dir })
      const shift = Number(svg.match(/<g transform="translate\(([-\d.]+) 0\)">/)[1])
      const [minX, , maxX] = SHEETS[state].bounds
      const [left, right] = [minX, maxX]
      assert.ok(shift + left >= -0.2, `${state}: sticks out on the left (${shift + left})`)
      assert.ok(shift + right <= 60 * 8 / UNIT + 0.2, `${state}: sticks out on the right`)
    }
  }
})

test('the drawing area is tall enough for the tallest look', () => {
  assert.ok(TOP <= GYM.bounds[1] + 0.01, 'the gym fits in the usual picture')
  assert.ok(TOP_TALL <= FLAG.bounds[1] + 0.01, 'the flag gets a taller one')
  assert.equal(topFor('flag'), TOP_TALL)
  assert.equal(topFor('calm'), TOP)
})

test('the clock\'s big hand ticks around the dial, faster when time is nearly up', () => {
  const hand = (percent) => {
    const svg = bandSvg({ columns: 40, fromCol: 6, state: 'clock', gait: 'idle', percent })
    const turns = [...svg.matchAll(/<animateTransform attributeName="transform" type="rotate" dur="([\d.]+)s"[^>]*values="([^"]*)"/g)]
    return turns.map(([, dur, values]) => ({ dur: Number(dur), values: values.split(';').map(Number) }))
  }
  const calm = hand(85).find((turn) => turn.values.length > 20)
  assert.ok(calm, 'a ticking hand exists')
  assert.equal(calm.dur, 6)
  assert.equal(calm.values.at(-1), 360)
  assert.ok(new Set(calm.values).size >= 24, 'it stops at every mark')
  const urgent = hand(97).find((turn) => turn.values.length > 20)
  assert.ok(urgent.dur < calm.dur / 2, 'it races past 95%')
})

// ---- reply ready ----

test('reply ready throws two sprays of confetti, one from each hand, in turn', () => {
  const svg = bandSvg({ columns: 40, fromCol: 6, state: 'done', gait: 'idle' })
  const pieces = svg.match(/<g transform="translate\(-?[\d.]+ -?[\d.]+\)"><g><g>/g) ?? []
  assert.ok(pieces.length >= 30, `${pieces.length} pieces`)
  const fromRight = pieces.filter((p) => p.includes('translate(96 ')).length
  const fromLeft = pieces.filter((p) => p.includes('translate(11 ')).length
  assert.equal(fromRight, fromLeft, 'both hands throw the same amount')
  assert.ok(svg.length < 80_000, `${svg.length} characters`)
})

test('the confetti of one burst never takes off before its throw, and each piece fades out before the loop restarts', () => {
  const svg = bandSvg({ columns: 40, fromCol: 6, state: 'done', gait: 'idle' })
  for (const [, times, values] of svg.matchAll(/attributeName="opacity" dur="2s"[^>]*keyTimes="([^"]*)"[^>]*values="([^"]*)"/g)) {
    const keys = times.split(';').map(Number)
    const opacity = values.split(';').map(Number)
    assert.equal(opacity[0], 0, 'invisible at the start')
    assert.equal(opacity.at(-1), 0, 'invisible at the end')
    assert.ok(keys.at(-1) === 1)
  }
})

test('running reply ready also throws from both hands, in the air', () => {
  const svg = bandSvg({ columns: 40, fromCol: 6, state: 'done', gait: 'run' })
  assert.ok(svg.includes('translate(96 -10)') && svg.includes('translate(11 -10)'))
})

test('gym and flag are one drawing whatever the gait', () => {
  for (const state of ['gym', 'flag']) {
    assert.equal(
      bandSvg({ columns: 40, fromCol: 6, state, gait: 'idle' }),
      bandSvg({ columns: 40, fromCol: 6, state, gait: 'run' }),
      state,
    )
  }
})

// ---- see-through, size, and the pills ----

test('the picture is see-through on light and dark pages', () => {
  const svg = bandSvg({ columns: 40, fromCol: 6, state: 'calm', gait: 'idle' })
  assert.match(svg, /<svg [^>]*style="color-scheme:light dark;background:transparent/)
  assert.match(svg, /<style>:root\{color-scheme:light dark\}/)
  assert.doesNotMatch(svg, /background:\s*(white|#fff)/i)
})

test('three sizes, each with whole half-pixels per grid cell, and a smaller size is a smaller picture', () => {
  for (const [name, unit] of Object.entries(SIZES)) {
    const halfPixels = unit * 5.25 * 2
    assert.ok(Math.abs(halfPixels - Math.round(halfPixels)) < 1e-9, `${name}: ${halfPixels}`)
  }
  const at = (size) => bandLayout({ columns: 40, fromCol: 6, state: 'calm', unit: SIZES[size] }).height
  assert.ok(at('small') < at('normal') && at('normal') < at('big'))
})

test('the pills sit directly under his feet, inside the same picture', () => {
  const chips = [{ kind: 'meter', label: 'context', percent: 87, text: '87%', color: '#DD775B' }]
  const without = bandLayout({ columns: 40, fromCol: 6, state: 'calm' })
  const withPills = bandLayout({ columns: 40, fromCol: 6, state: 'calm', chips })
  assert.equal(+(withPills.height - without.height).toFixed(3), 21)
  assert.ok(withPills.svg.includes('>87%</text>'))
  assert.ok(withPills.svg.includes('>context</text>'))
})

test('while a tall look plays the picture is taller, then it goes back', () => {
  const tall = bandLayout({ columns: 40, fromCol: 6, state: 'flag' }).height
  const usual = bandLayout({ columns: 40, fromCol: 6, state: 'calm' }).height
  assert.ok(tall > usual)
  assert.equal(bandLayout({ columns: 40, fromCol: 6, state: 'gym' }).height, usual)
  assert.equal(bandLayout({ columns: 40, fromCol: 6, state: 'done' }).height, usual)
})

test('nothing reaches above the picture', () => {
  // Every figure's highest drawn point is inside the picture's top edge
  for (const state of VECTOR_STATES) {
    const top = topFor(state)
    const svg = bandSvg({ columns: 40, fromCol: 6, state, gait: 'idle', percent: 90 })
    for (const [, y] of svg.matchAll(/<rect x="[-\d.]+" y="(-[\d.]+)" width="[\d.]+" height="[\d.]+"/g)) {
      if (y === '-400') continue // the invisible floor clip, not a shape
      assert.ok(Number(y) >= top - 1, `${state}: a shape starts at y ${y}, above ${top}`)
    }
  }
})

test('inline: he stands at the right end of the pills and the display is shorter', () => {
  const chips = [{ kind: 'text', text: 'context 20%' }, { kind: 'text', text: '$48.30' }]
  const stacked = bandLayout({ columns: 80, fromCol: 3, state: 'calm', chips })
  const inline = bandLayout({ columns: 80, fromCol: 3, state: 'calm', chips, inline: true })
  assert.ok(inline.height < stacked.height, `${inline.height} should be shorter than ${stacked.height}`)
  // The pills sit on his floor line, at the bottom of the picture
  assert.match(inline.svg, new RegExp(`<g transform="translate\\(0 ${inline.height - 20}\\)">`))
  // Too narrow for both side by side: back to the pills below him
  const narrow = bandLayout({ columns: 12, fromCol: 3, state: 'calm', chips, inline: true })
  assert.equal(narrow.height, bandLayout({ columns: 12, fromCol: 3, state: 'calm', chips }).height)
})

test('when the readout grows, the pills slide in from the left and push him along', () => {
  const few = [{ kind: 'text', text: 'waiting for the first reply' }]
  const many = [{ kind: 'meter', label: 'context', percent: 20, text: '20%', color: '#5E8C6A' }, { kind: 'meter', label: '5h', percent: 47, text: '47%', color: '#5E8C6A' }, { kind: 'text', text: '$48.30' }]
  const before = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: few, inline: true })
  const after = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: many, inline: true, slideFrom: { origin: before.originUnits, chipsW: before.chipsW } })
  assert.ok(after.originUnits > before.originUnits, 'he ends further right')
  assert.match(after.svg, new RegExp(`values="${before.originUnits} 0;${after.originUnits} 0"`))
  assert.match(after.svg, /values="-[\d.]+ 0;0 0"/)
  // A small change (the countdown ticking) slides nothing
  const tick = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: [...few, { kind: 'text', text: 'x' }], inline: true, slideFrom: { origin: before.originUnits, chipsW: before.chipsW } })
  assert.doesNotMatch(tick.svg, /values="-[\d.]+ 0;0 0"/)
  // Pills added after that only push him along: they do not slide in a second time
  const later = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: [...many, { kind: 'text', text: 'resets in 2h 14m' }], inline: true, slideFrom: { origin: after.originUnits, chipsW: after.chipsW, hadMeters: true } })
  assert.doesNotMatch(later.svg, /values="-[\d.]+ 0;0 0"/)
  assert.ok(later.originUnits > after.originUnits)
})

test('a redraw in the middle of a slide carries on with the time that is left', () => {
  const few = [{ kind: 'text', text: 'waiting for the first reply' }]
  const many = [{ kind: 'text', text: 'context 20%' }, { kind: 'text', text: '5h 47%' }, { kind: 'text', text: '7d 48%' }, { kind: 'text', text: '$48.30' }]
  const before = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: few, inline: true })
  const resumed = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: many, inline: true, slideFrom: { origin: 150, chipsW: before.chipsW, rowShift: -40, seconds: 0.3 } })
  assert.match(resumed.svg, /dur="0\.3s"[^>]*values="150 0;/)
  assert.match(resumed.svg, /dur="0\.3s"[^>]*values="-40 0;0 0"/)
  assert.equal(resumed.slide.seconds, 0.3)
})

test('a different set of pills fades in, and a number changing does not', () => {
  const meters = [{ kind: 'meter', label: 'context', percent: 20, text: '20%', color: '#5E8C6A' }]
  const note = [{ kind: 'note', text: 'switched to opus-5-5', color: '#DD775B' }]
  const first = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: note, inline: true })
  const back = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: meters, inline: true, slideFrom: { origin: first.originUnits, chipsW: first.chipsW, hadMeters: true, chipsShape: first.chipsShape } })
  assert.match(back.svg, /attributeName="opacity" dur="0\.35s"/)
  const again = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: [{ ...meters[0], percent: 25, text: '25%' }], inline: true, slideFrom: { origin: back.originUnits, chipsW: back.chipsW, hadMeters: true, chipsShape: back.chipsShape } })
  assert.doesNotMatch(again.svg, /dur="0\.35s"/)
})

test('a meter that is getting full glows orange, and one about to run out glows red and beats faster', () => {
  const meter = (percent) => ({ kind: 'meter', label: '5h', percent, text: `${percent}%`, color: levelColor(percent) })
  const calm = chipsSvg([meter(40)], 200)
  const full = chipsSvg([meter(85)], 200)
  const urgent = chipsSvg([meter(97)], 200)
  assert.doesNotMatch(calm, /filter="url\(#chipglow\)"/)
  assert.match(full, /filter="url\(#chipglow\)"/)
  assert.match(full, /dur="2.4s"/)
  assert.match(urgent, /dur="1.1s"/)
  assert.ok(full.includes(levelColor(85)) && urgent.includes(levelColor(97)))
  assert.notEqual(levelColor(85), levelColor(97))
  // On the desktop the glow replaces the "getting full" word
  const layout = bandLayout({ columns: 60, fromCol: 3, state: 'calm', chips: [meter(85), { kind: 'badge', text: 'getting full', color: '#DD775B' }] })
  assert.ok(!layout.svg.includes('getting full'))
})

test('Gym Clawd takes no hats or belts; every other look still wears them', () => {
  const witch = (state) => figureFor(state, 'idle', { outfit: 'witch' }).includes('#3B2A5C')
  assert.equal(witch('gym'), false)
  assert.equal(witch('calm'), true)
  assert.equal(witch('flag'), true)
  const sash = (state) => figureFor(state, 'idle', { outfit: 'riel' }).includes('#C8372D')
  assert.equal(sash('gym'), false)
  assert.equal(sash('calm'), true)
  // The one thing it takes is Canada Day's red and white, cut from his own body shape in every frame
  const canadaGym = figureFor('gym', 'idle', { outfit: 'canada' })
  assert.ok(canadaGym.includes('#D6252B') && canadaGym.includes('fill="#F7F5F0"'))
  assert.ok(!canadaGym.includes('#6B4F3A'), 'no flag pole or other props')
  assert.equal(figureFor('gym', 'idle', { outfit: 'riel' }), figureFor('gym', 'idle'))
})

test('hats react to his mood: droop when tired, tremble when strained, jump when the alert goes off', () => {
  const hat = (state) => figureFor(state, 'idle', { outfit: 'witch' })
  assert.match(hat('tired'), /type="rotate" dur="4s"/)
  assert.match(hat('strained'), /type="translate" dur="0.3s"/)
  assert.match(hat('critical'), /type="translate" dur="0.8s"/)
  assert.doesNotMatch(hat('calm'), /dur="0.8s"/)
  assert.ok(hat('critical').includes('#3B2A5C') && hat('tired').includes('#3B2A5C'))
})

test('the alert mark rises above a hat so it is not hidden', () => {
  const bare = figureFor('critical', 'idle')
  const hatted = figureFor('critical', 'idle', { outfit: 'witch' })
  assert.match(bare, /translate\(56 -10\)/)
  assert.match(hatted, /translate\(20 -52\)/)
  assert.match(figureFor('critical', 'idle', { outfit: 'christmas' }), /translate\(56 -52\)/)
})

test('on Canada Day the flag routine is him waving a Canadian flag, on other days the recording', () => {
  const canada = figureFor('flag', 'idle', { outfit: 'canada' })
  const plain = figureFor('flag', 'idle')
  assert.notEqual(canada, plain)
  assert.ok(canada.includes('#D6252B') && canada.includes('#6B4F3A'))
  assert.match(canada, /type="rotate" dur="1.6s"/)
  assert.equal(figureFor('flag', 'idle', { outfit: 'witch' }).includes('#6B4F3A'), false)
})

test('background scenes sit behind him, keep right of the pills, and nothing is stuck to him', async () => {
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  const { SEASON_SCENES, SCENE_IDS } = await import('../hooks/scenery.mjs')
  // Every outfit's effects are scenes, and only things he holds stay on him
  for (const outfit of Object.values(OUTFITS)) {
    assert.ok(outfit.scene.length > 0 && outfit.scene.every((id) => SCENE_IDS.includes(id)))
    assert.ok(!/bat|snow/.test(outfit.props))
  }
  for (const scene of Object.values(SEASON_SCENES)) assert.ok(scene.every((id) => SCENE_IDS.includes(id)))
  const meters = [{ kind: 'meter', label: 'context', percent: 20, text: '20%', color: '#5E8C6A' }]
  const layout = bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: meters, inline: true, scene: ['snow'] })
  // The scene is drawn before him
  assert.ok(layout.svg.indexOf('pointer-events="none"') < layout.svg.indexOf('<g transform="translate(0 '))
  assert.equal(bandLayout({ columns: 90, fromCol: 3, state: 'calm', chips: meters, inline: true }).svg.includes('pointer-events="none"'), false)
  // Flowers grow from the ground, summer has a sun and clouds, leaves and snow fall
  for (const id of SCENE_IDS) {
    const svg = bandLayout({ columns: 90, fromCol: 3, state: 'calm', scene: [id] }).svg
    assert.match(svg, /<animate/, `${id} moves`)
  }
})

test('the season changes on the right days', async () => {
  const { seasonFor } = await import('../hooks/seasons.mjs')
  const on = (iso) => seasonFor(new Date(`${iso}T12:00:00`))
  assert.equal(on('2026-03-19'), 'winter')
  assert.equal(on('2026-03-20'), 'spring')
  assert.equal(on('2026-06-20'), 'spring')
  assert.equal(on('2026-06-21'), 'summer')
  assert.equal(on('2026-09-22'), 'summer')
  assert.equal(on('2026-09-23'), 'fall')
  assert.equal(on('2026-11-30'), 'fall')
  assert.equal(on('2026-12-01'), 'winter')
  assert.equal(on('2026-01-15'), 'winter')
})

test("Valentine's Day gives him beating heart eyes, in every look, and only that day", () => {
  for (const state of ['calm', 'think', 'tired', 'critical', 'edit', 'done']) {
    const valentine = figureFor(state, 'idle', { outfit: 'valentines' })
    assert.ok(valentine.includes('values="1 1;1.14 1.14;1 1"'), `${state}: the hearts beat`)
    assert.ok(!valentine.includes('fill="#191919"'), `${state}: no dark square eyes left`)
  }
  assert.ok(figureFor('calm', 'idle').includes('fill="#191919"'))
  assert.ok(!figureFor('calm', 'idle', { outfit: 'witch' }).includes('1.14 1.14'))
})

test('graduation: the gown and cap come with him in every look except the gym and the mog close-up, the gown stays off his hands and below his eyes', async () => {
  const { VECTOR_STATES } = await import('../hooks/vector.mjs')
  // In the mog close-up his whole body is his face, so the clothes come off (the cap stays)
  for (const state of VECTOR_STATES.filter((name) => name !== 'gym' && name !== 'mog')) {
    const drawing = figureFor(state, 'idle', { outfit: 'graduation' })
    assert.ok(drawing.includes('#1D212B'), `${state}: the gown is drawn`)
  }
  assert.equal(figureFor('gym', 'idle', { outfit: 'graduation' }), figureFor('gym', 'idle'))
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  assert.equal(OUTFITS.graduation.sleeve, undefined, 'no sleeves over his hands')
  const gownTop = Math.min(...[...OUTFITS.graduation.body.matchAll(/y="([\d.]+)"/g)].map((m) => Number(m[1])))
  assert.ok(gownTop >= 30, `the gown starts at y ${gownTop}, below his eyes (which end at y 22)`)
})

test('Chile: the hat sits on his head (its brim reaches y 0), not above it', async () => {
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  const brim = OUTFITS.chile.head.match(/<rect x="0" y="(-?[\d.]+)" width="107" height="(\d+)"/)
  assert.ok(Number(brim[1]) + Number(brim[2]) > 0, 'the brim overlaps the top of his head')
})

test("Chile's Independence Day: the flag routine waves the Chilean flag, and the day's background is the cordillera with red, blue and white fireworks", async () => {
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  assert.deepEqual(OUTFITS.chile.scene, ['cordillera', 'fireworks-chile'])
  const wave = figureFor('flag', 'idle', { outfit: 'chile' })
  assert.notEqual(wave, figureFor('flag', 'idle'))
  assert.ok(wave.includes('#0039A6') && wave.includes('#D52B1E'))
  assert.match(wave, /type="rotate" dur="1.6s"/)
  const scene = bandLayout({ columns: 90, fromCol: 3, state: 'calm', scene: OUTFITS.chile.scene }).svg
  assert.ok(scene.includes('#5A6682') && scene.includes('#EEF2F8'), 'the layered snow-capped ridges')
  assert.ok(!scene.includes('#38BFD0'), 'no lake any more')
  assert.ok(scene.includes('#2F6FE0'), 'blue fireworks')
})

test('the flag routine waves each country\'s own flag: Chinese, American and Mexican, not the checkered recording', () => {
  const plain = figureFor('flag', 'idle')
  const colours = { chinese: '#DE2910', usa: '#1F3A82', cinco: '#1E8A4C', chile: '#0039A6', canada: '#D6252B' }
  for (const [id, colour] of Object.entries(colours)) {
    const drawing = figureFor('flag', 'idle', { outfit: id })
    assert.notEqual(drawing, plain, `${id}: not the recording`)
    assert.ok(drawing.includes(colour), `${id}: its own colours`)
  }
})

test("the New Year outfits show the year that is starting, read from the clock", async () => {
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  const { digitsSvg } = await import('../hooks/pixelfont.mjs')
  const realNow = Date.now
  try {
    Date.now = () => new Date(2030, 11, 31, 22, 0).getTime()
    assert.ok(OUTFITS.newyear.head.includes(digitsSvg('31', 45.5, -13, 1.6, '#14213D')), 'Dec 31 2030: the hat says 31')
    Date.now = () => new Date(2031, 0, 1, 9, 0).getTime()
    assert.ok(OUTFITS.newyearsday.body.includes(digitsSvg('2031', 35.5, 50, 1.5, '#14213D')), 'Jan 1 2031: the sash says 2031')
    Date.now = () => new Date(2043, 0, 1, 9, 0).getTime()
    assert.ok(OUTFITS.newyearsday.body.includes(digitsSvg('2043', 35.5, 50, 1.5, '#14213D')), 'Jan 1 2043: the sash says 2043')
  } finally {
    Date.now = realNow
  }
})

test('limit reached: X eyes for every outfit (hearts and sunglasses give way), the hat knocked askew, and dizzy stars', async () => {
  const { OUTFIT_IDS } = await import('../hooks/outfits.mjs')
  const plain = figureFor('limit', 'idle')
  assert.ok(plain.includes('data-eyes="x"'), 'X eyes with no outfit')
  assert.notEqual(plain, figureFor('calm', 'idle'))
  for (const id of OUTFIT_IDS.filter((name) => name !== 'halloween')) {
    const drawing = figureFor('limit', 'idle', { outfit: id })
    assert.ok(drawing.includes('data-eyes="x"'), `${id}: X eyes`)
    assert.ok(!drawing.includes('1.14 1.14'), `${id}: no beating hearts for eyes`)
  }
  // Sunglasses would hide the X, so those outfits push them up onto his forehead
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  for (const id of ['summer', 'gta6']) assert.ok(OUTFITS[id].limitHead && OUTFITS[id].limitHead !== OUTFITS[id].head, `${id} has a limit-reached look`)
  // A hat is tilted
  assert.ok(figureFor('limit', 'idle', { outfit: 'christmas' }).includes('rotate(14 54 0)'))
})

test('background task: in the morning he holds a coffee and sips it, the rest of the day he just waits', () => {
  const morning = figureFor('task', 'idle', { tasks: 1, coffee: true })
  const later = figureFor('task', 'idle', { tasks: 1 })
  assert.ok(morning.includes('#5A3A22'), 'the coffee is drawn')
  assert.ok(!later.includes('#5A3A22'), 'no coffee outside the morning')
  assert.ok(morning.includes('#D97757') && later.includes('#D97757'), 'the spark shows either way')
})

test('mogging: the clothes and any mask come off so his whole mogging face shows; a plain hat stays', async () => {
  const bare = figureFor('mog', 'idle')
  assert.ok(!figureFor('mog', 'idle', { outfit: 'graduation' }).includes('#1D212B'), 'no gown')
  assert.ok(figureFor('mog', 'idle', { outfit: 'witch' }).length > bare.length, 'the witch hat stays')
  const { OUTFITS } = await import('../hooks/outfits.mjs')
  for (const masked of ['friday13', 'skeleton', 'mummy', 'dayofdead']) {
    assert.ok(!figureFor('mog', 'idle', { outfit: masked }).includes(OUTFITS[masked].head), `${masked}: the mask is off`)
  }
})
