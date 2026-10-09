// Run with: node --test tests/krab.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ALERT_MS, createLife, FLAG_MS, GYM_MS, SINGLE_LOOKS, moodFor, poseFor, readout, stateFor, stepLife, STATES, toolKind } from '../hooks/life.mjs'
import { cellNumbers, packCells, pixelsFor, SPRITE_COLUMNS, SPRITE_ROWS, svgFor } from '../hooks/sprite.mjs'

const calmCtx = { maxX: 60, mood: 'happy', turnRunning: false, asleep: false, rand: () => 0.5 }
const poseCtx = {
  mood: 'happy',
  turnRunning: false,
  asleep: false,
  tool: null,
  toolAgeMs: 99999,
  doneAgeMs: 99999,
  wakeAgeMs: 99999,
}
const STATE_CTX = {
  calm: {},
  tired: { mood: 'tired' },
  strained: { mood: 'strained' },
  critical: { mood: 'critical' },
  think: { turnRunning: true },
  edit: { turnRunning: true, tool: 'Edit', toolAgeMs: 10 },
  shell: { turnRunning: true, tool: 'Bash', toolAgeMs: 10 },
  look: { turnRunning: true, tool: 'Read', toolAgeMs: 10 },
  done: { doneAgeMs: 500 },
  task: { tasks: 2 },
  asleep: { asleep: true },
  bedtime: { asleep: true, sleepAgeMs: 500 },
  compact: { compacting: true },
  gym: { gymAgeMs: 500 },
  flag: { flagAgeMs: 500 },
  clock: { limit: { state: 'clock', percent: 88 } },
  calendar: { limit: { state: 'calendar', percent: 88 } },
  limit: { limit: { state: 'clock', percent: 100 } },
  permission: { waiting: 'permission', turnRunning: true },
  asking: { waiting: 'asking', turnRunning: true },
  gears: { turnRunning: true, thinkingMs: 10_000 },
  ...Object.fromEntries(['shrug', 'oops', 'glitch', 'stamp', 'pop', 'peek', 'house', 'hello', 'bye', 'folder', 'plan', 'auto', 'ask', 'send', 'receive', 'present', 'shrink', 'buff', 'ascend', 'fall', 'firstsnow', 'cheer', 'facepalm', 'ship', 'rocket', 'browse', 'trophy', 'yoyo', 'juggle', 'stretch', 'phone', 'coffee', 'game', 'gum', 'music', 'readbook', 'startled', 'blush', 'nervous', 'flinch', 'camera', 'tapfoot', 'yawn', 'unbox', 'magnify', 'mail', 'risky', 'listen', 'mog', 'readfile', 'photo', 'todo', 'browser', 'mouseride', 'spellbook', 'toolbox', 'alarm', 'binoculars', 'plugin', 'sculpt', 'inbox', 'planner', 'cabinet', 'clapper', 'netcatch', 'apptest', 'blocks', 'highlight', 'cube', 'unity', 'goodmorning', 'goodnight', 'satellite', 'armwrestle', 'redbutton', 'comb', 'dig', 'parachute', 'labcoat', 'paint', 'quill', 'water', 'sandwich', 'crossclaws', 'laugh', 'onfire', 'brb', 'paperstack', 'bricks', 'detective', 'rug', 'signpost', 'checkall', 'monday', 'weekend', 'wonder', 'thumbsup', 'comfort', 'heavybook', 'shredder', 'relabel', 'download', 'rewind', 'drench', 'medal', 'welcomeback', 'cake', 'chart', 'kanban', 'pet', 'grumpy', 'bow', 'party', 'longscroll', 'knock', 'whale', 'snake', 'ferris', 'erase', 'hatch', 'puff', 'wrench', 'multiarm', 'boxin', 'sweep'].map((name) => [name, { turnRunning: true, events: { [name]: 100 } }])),
}

function run(life, ctx, ticks) {
  let current = life
  for (let i = 0; i < ticks; i++) current = stepLife(current, ctx)
  return current
}

function poseAt(tick, patch, gait) {
  return poseFor({ ...createLife(), tick }, { ...poseCtx, ...patch, gait })
}

test('mood follows how full the context window is', () => {
  assert.equal(moodFor(10), 'happy')
  assert.equal(moodFor(50), 'tired')
  assert.equal(moodFor(80), 'strained')
  assert.equal(moodFor(95), 'critical')
  assert.equal(moodFor(undefined), 'unknown')
})

test('stepLife never mutates the life it is given', () => {
  const life = createLife()
  const frozen = JSON.stringify(life)
  stepLife(life, calmCtx)
  assert.equal(JSON.stringify(life), frozen)
})

test('Clawd walks and stays inside the band', () => {
  let life = createLife()
  let moved = false
  for (let i = 0; i < 2000; i++) {
    life = stepLife(life, calmCtx)
    if (life.x > 0) moved = true
    assert.ok(life.x >= 0 && life.x <= calmCtx.maxX, `x out of range: ${life.x}`)
  }
  assert.ok(moved, 'he never left the start')
})

test('Clawd stays where he is while Claude works, sleeps, or the context is critical', () => {
  for (const patch of [{ turnRunning: true }, { asleep: true }, { mood: 'critical' }]) {
    const life = run({ ...createLife(), x: 7, mode: 'walk', target: 30 }, { ...calmCtx, ...patch }, 40)
    assert.equal(life.x, 7, `moved with ${JSON.stringify(patch)}`)
  }
})

test('a band too narrow for Clawd pulls him back to the left edge and keeps him there', () => {
  const life = run({ ...createLife(), x: 7, mode: 'walk', target: 30 }, { ...calmCtx, maxX: 0 }, 40)
  assert.equal(life.x, 0)
})

test('a fuller context walks slower', () => {
  const start = { ...createLife(), mode: 'walk', target: 55, restTicks: 0 }
  const happy = run(start, calmCtx, 12).x
  const strained = run(start, { ...calmCtx, mood: 'strained' }, 12).x
  assert.ok(strained < happy, `${strained} should be less than ${happy}`)
})

test('background tasks: he waits on them when Claude is idle, and a working Claude, a reply wave or a full context still win', () => {
  assert.equal(stateFor({ ...poseCtx, tasks: 1 }), 'task')
  assert.equal(stateFor({ ...poseCtx, tasks: 1, turnRunning: true }), 'think')
  assert.equal(stateFor({ ...poseCtx, tasks: 1, doneAgeMs: 500 }), 'done')
  assert.equal(stateFor({ ...poseCtx, tasks: 1, mood: 'critical' }), 'critical')
  assert.equal(stateFor({ ...poseCtx, tasks: 0 }), 'calm')
})

test('stateFor picks the look that matches what is happening', () => {
  for (const [state, patch] of Object.entries(STATE_CTX)) {
    assert.equal(stateFor({ ...poseCtx, ...patch }), state, state)
  }
  assert.equal(stateFor({ ...poseCtx, wakeAgeMs: 300 }), 'wake')
  assert.equal(STATES.length, 146)
  assert.deepEqual([...STATES].sort(), Object.keys(STATE_CTX).sort())
})

test('critical context beats every other look, and sleep beats critical', () => {
  assert.equal(stateFor({ ...poseCtx, mood: 'critical', turnRunning: true, tool: 'Edit', toolAgeMs: 1 }), 'critical')
  assert.equal(stateFor({ ...poseCtx, mood: 'critical', asleep: true }), 'asleep')
})

test('events beat everything except sleep and waking, and the newer event wins', () => {
  const busy = { turnRunning: true, tool: 'Edit', toolAgeMs: 1, mood: 'critical' }
  assert.equal(stateFor({ ...poseCtx, ...busy, gymAgeMs: 100 }), 'gym')
  assert.equal(stateFor({ ...poseCtx, ...busy, flagAgeMs: 100 }), 'flag')
  assert.equal(stateFor({ ...poseCtx, gymAgeMs: 900, flagAgeMs: 100 }), 'flag')
  assert.equal(stateFor({ ...poseCtx, gymAgeMs: 100, flagAgeMs: 900 }), 'gym')
  assert.equal(stateFor({ ...poseCtx, gymAgeMs: 100, asleep: true }), 'asleep')
  assert.equal(stateFor({ ...poseCtx, gymAgeMs: 100, wakeAgeMs: 100 }), 'wake')
})

test('an event ends after its time and Clawd goes back to normal', () => {
  assert.equal(stateFor({ ...poseCtx, gymAgeMs: GYM_MS + 1 }), 'calm')
  assert.equal(stateFor({ ...poseCtx, flagAgeMs: FLAG_MS + 1 }), 'calm')
})

test('a limit warning shows when Claude is idle, but never hides what Claude is doing', () => {
  const limit = { state: 'clock', percent: 90 }
  assert.equal(stateFor({ ...poseCtx, limit }), 'clock')
  assert.equal(stateFor({ ...poseCtx, limit, turnRunning: true, tool: 'Edit', toolAgeMs: 1 }), 'edit')
  assert.equal(stateFor({ ...poseCtx, limit, turnRunning: true }), 'think')
  assert.equal(stateFor({ ...poseCtx, limit, mood: 'critical' }), 'critical')
  assert.equal(stateFor({ ...poseCtx, limit, mood: 'strained' }), 'clock')
})

test('gym: the bar rises overhead, holds at the top, and comes back down', () => {
  const bars = Array.from({ length: 12 }, (_, tick) => poseAt(tick, { gymAgeMs: 1 }, 'idle').barY)
  assert.equal(Math.min(...bars), 0)
  assert.equal(Math.max(...bars), 5)
  assert.ok(bars.filter((y) => y === 0).length >= 3, 'should hold at the top')
  const pixels = pixelsFor(poseAt(6, { gymAgeMs: 1 }, 'idle'))
  assert.equal(pixels[0][5], 0x4a4a47)
})

test('clock and calendar show how full the limit is', () => {
  const redInClock = (percent) =>
    pixelsFor(poseAt(1, { limit: { state: 'clock', percent } }, 'idle')).flat().filter((c) => c === 0xc4553d).length
  assert.ok(redInClock(97) > redInClock(82), 'more of the clock face is red at 97% than at 82%')
  const days = (percent) =>
    pixelsFor(poseAt(1, { limit: { state: 'calendar', percent } }, 'idle'))[7].filter((c) => c === 0xc4553d).length
  assert.ok(days(97) > days(82), 'more days filled at 97% than 82%')
})

test('a stale tool falls back to thinking', () => {
  assert.equal(stateFor({ ...poseCtx, turnRunning: true, tool: 'Edit', toolAgeMs: 9000 }), 'think')
})

test('tools sort into edit, shell or look', () => {
  assert.equal(toolKind('Write'), 'edit')
  assert.equal(toolKind('Bash'), 'shell')
  assert.equal(toolKind('Grep'), 'look')
})

test('every look has an idle version with all four legs planted and a running version that moves', () => {
  for (const [state, patch] of Object.entries(STATE_CTX)) {
    const idleLegs = [0, 1, 2, 3].map((tick) => poseAt(tick, patch, 'idle').legs.join())
    // Gym is the one idle look where the legs move: they bend into each dip before the press
    if (state !== 'gym') assert.equal(new Set(idleLegs).size, 1, `${state} idle legs should hold still: ${idleLegs}`)
    // Asleep has no running legs; its running version is waking up, which stretches instead
    if (SINGLE_LOOKS.has(state)) continue
    const runPatch = state === 'asleep' ? { wakeAgeMs: 300 } : patch
    const runFrames = [0, 1, 2, 3].map((tick) => JSON.stringify(poseAt(tick, runPatch, 'run')))
    assert.ok(new Set(runFrames).size > 1, `${state} running version never changes`)
    if (state !== 'asleep') {
      const runLegs = [0, 1, 2, 3].map((tick) => poseAt(tick, runPatch, 'run').legs.join())
      assert.ok(new Set(runLegs).size > 1, `${state} running legs should move: ${runLegs}`)
    }
  }
})

test('every look has something that moves even when idle, except none that stay frozen', () => {
  for (const [state, patch] of Object.entries(STATE_CTX)) {
    const frames = Array.from({ length: 16 }, (_, tick) => JSON.stringify(poseAt(tick, patch, 'idle')))
    assert.ok(new Set(frames).size > 1, `${state} idle never changes`)
  }
})

test('every look draws inside the grid in both versions', () => {
  for (const patch of [...Object.values(STATE_CTX), { wakeAgeMs: 300 }]) {
    for (const gait of ['idle', 'run']) {
      for (let tick = 0; tick < 40; tick++) {
        const pixels = pixelsFor(poseAt(tick, patch, gait))
        assert.equal(pixels.length, SPRITE_ROWS * 2)
        assert.ok(pixels.every((row) => row.length === SPRITE_COLUMNS))
        assert.ok(pixels.flat().some((color) => color !== null))
      }
    }
  }
})

test('asleep: eyes shut, body lowered with legs tucked, Zs rising', () => {
  const sleeping = poseAt(5, STATE_CTX.asleep, 'idle')
  assert.equal(sleeping.eyes, 'closed')
  assert.equal(sleeping.dy, 1)
  assert.deepEqual(sleeping.legs, [1, 1, 1, 1])
  assert.deepEqual(sleeping.prop, ['sleepwear', 'zzz'])
  const painted = (tick) => pixelsFor(poseAt(tick, STATE_CTX.asleep, 'idle')).flat().filter((c) => c === 0xb8c4ff).length
  assert.equal(painted(0), 0)
  assert.ok(painted(1) < painted(3) && painted(3) < painted(5))
})

test('waking up: eyes open and shut, arms stretch up, sparkle', () => {
  const frames = [0, 1, 2, 3].map((tick) => poseAt(tick, { wakeAgeMs: 300 }, 'run'))
  assert.ok(frames.every((pose) => pose.prop === 'wake'))
  assert.ok(new Set(frames.map((pose) => pose.eyes)).size > 1)
  assert.ok(frames.some((pose) => pose.hands[0] === 1))
})

test('done: waves while idle, hops while running', () => {
  const idle = [0, 1].map((tick) => poseAt(tick, STATE_CTX.done, 'idle'))
  assert.ok(idle.every((pose) => pose.dy === 0))
  const hopping = [0, 1].map((tick) => poseAt(tick, STATE_CTX.done, 'run'))
  assert.ok(hopping.some((pose) => pose.dy === -1))
})

test('a strained Clawd crouches and trembles', () => {
  const pose = poseAt(1, STATE_CTX.strained, 'idle')
  assert.deepEqual(pose.legs, [1, 1, 1, 1])
  assert.equal(pose.dx, 1)
})

test('calm Clawd kicks up dust only while walking', () => {
  const walking = poseFor({ ...createLife(), mode: 'walk', tick: 2, dir: 1 }, poseCtx)
  assert.equal(walking.dust, -1)
  assert.equal(poseFor({ ...createLife(), tick: 2 }, poseCtx).dust, 0)
})

test('readout shows context, limits and cost, and says so when empty', () => {
  assert.equal(readout(null), 'waiting for the first reply')
  const text = readout({
    context: { percent: 63.4 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 41 },
      { kind: 'seven_day', percentUsed: 12.5 },
    ],
    cost: { usd: 1.234 },
  })
  assert.equal(text, 'context 63% · 5h 41% · 7d 13% · $1.23 · filling up')
  assert.equal(readout({ context: {}, rateLimits: [] }), 'context —')
})

test('terminal cells have three numbers per cell and pack to the right size', () => {
  const pixels = pixelsFor(poseAt(0, {}, 'idle'))
  const numbers = cellNumbers(pixels, 40, 5)
  assert.equal(numbers.length, 40 * SPRITE_ROWS * 3)
  for (const number of numbers) assert.ok(Number.isInteger(number) && number >= 0)
  assert.equal(Buffer.from(packCells(numbers), 'base64').length, numbers.length * 4)
})

test('every drawn character is one printable cell wide', () => {
  const numbers = cellNumbers(pixelsFor(poseAt(3, STATE_CTX.critical, 'run')), 30, 2)
  for (let i = 0; i < numbers.length; i += 3) assert.ok([0x20, 0x2580, 0x2584, 0x2588].includes(numbers[i]))
})

test('the desktop SVG draws the same pixels', () => {
  const pixels = pixelsFor(poseAt(0, {}, 'idle'))
  const svg = svgFor(pixels, 40, 5)
  assert.match(svg, /^<svg [^>]*viewBox="0 0 320 60"/)
  const painted = pixels.flat().filter((color) => color !== null).length
  assert.equal(svg.match(/<rect /g).length, painted)
})

test('reply ready in the terminal throws confetti from whichever hand is up', () => {
  const colours = new Set([0xdd775b, 0xe7b04a, 0x5e8c6a, 0xf3efe6, 0xc4553d, 0x6ec6ff])
  const confetti = (tick) => {
    const pixels = pixelsFor(poseAt(tick, STATE_CTX.done, 'idle'))
    return pixels.flatMap((row, y) => row.map((c, x) => [x, y, c])).filter(([x, y, c]) => colours.has(c) && (y < 2 || x < 2 || x > 9) && !(y >= 2 && x >= 2 && x <= 9))
  }
  assert.ok(confetti(7).length >= 3, 'pieces in the air')
  assert.notDeepEqual(confetti(7), confetti(9), 'they move')
  const rightHand = poseAt(1, STATE_CTX.done, 'idle')
  const leftHand = poseAt(8, STATE_CTX.done, 'idle')
  assert.equal(rightHand.throwSide, 1)
  assert.equal(leftHand.throwSide, -1)
})

test('a limit alert plays above everything but sleep, and then ends', () => {
  const busy = { turnRunning: true, tool: 'Edit', toolAgeMs: 1 }
  const alert = { alertState: 'calendar', alertAgeMs: 500, limit: { state: 'calendar', percent: 98 } }
  assert.equal(stateFor({ ...poseCtx, ...busy, ...alert }), 'calendar')
  assert.equal(stateFor({ ...poseCtx, ...busy, ...alert, mood: 'critical' }), 'calendar')
  assert.equal(stateFor({ ...poseCtx, ...alert, asleep: true }), 'asleep')
  assert.equal(stateFor({ ...poseCtx, ...busy, ...alert, alertAgeMs: ALERT_MS + 1, limit: null }), 'edit')
})

test('the newest event wins when several play at once', () => {
  const both = { gymAgeMs: 900, alertState: 'clock', alertAgeMs: 100 }
  assert.equal(stateFor({ ...poseCtx, ...both }), 'clock')
  assert.equal(stateFor({ ...poseCtx, ...both, alertAgeMs: 2000 }), 'gym')
})

test('a nearly spent limit outranks a nearly full context, but a mild warning does not', () => {
  assert.equal(stateFor({ ...poseCtx, mood: 'critical', limit: { state: 'calendar', percent: 96 } }), 'calendar')
  assert.equal(stateFor({ ...poseCtx, mood: 'critical', limit: { state: 'calendar', percent: 85 } }), 'critical')
})

test('gym and flag have no running version: he stands still for them, even while Claude works', () => {
  assert.deepEqual([...SINGLE_LOOKS].sort(), ['bedtime', 'compact', 'flag', 'gym', 'limit'])
  for (const state of SINGLE_LOOKS) {
    for (let tick = 0; tick < 24; tick++) {
      const calm = poseAt(tick, STATE_CTX[state], 'idle')
      assert.deepEqual(poseAt(tick, STATE_CTX[state], 'run'), calm, `${state}: running differs at tick ${tick}`)
      const busy = poseFor({ ...createLife(), tick, mode: 'walk' }, { ...poseCtx, ...STATE_CTX[state], turnRunning: true })
      assert.deepEqual(busy.legs, calm.legs, `${state}: legs move while Claude works`)
    }
  }
})

test('a finished command earns its reaction: tests passing or failing, a push, a commit', async () => {
  const { commandReaction, isTestCommand } = await import('../hooks/work.mjs')
  const ok = (stdout) => ({ result: { stdout, stderr: '' } })
  assert.equal(commandReaction('npm test', ok('Tests: 12 passed, 0 failed')), 'cheer')
  assert.equal(commandReaction('node --test tests/*.mjs | tail -3', ok('ℹ pass 40\nℹ fail 2')), 'facepalm', 'a pipe hides the exit code, so the output decides')
  assert.equal(commandReaction('pytest -q', { isError: true, result: 'FAILED tests/test_x.py' }), 'facepalm')
  assert.equal(commandReaction('cargo test', ok('test result: ok. 9 passed; 0 failed')), 'cheer')
  assert.equal(commandReaction('git add -A && git commit -m "fix: x" && git push', ok('')), 'rocket')
  assert.equal(commandReaction('git commit -m "feat: y"', ok('')), 'ship')
  assert.equal(commandReaction('git commit -m "nothing"', { isError: true, result: 'nothing to commit' }), null, 'a commit that did not happen')
  assert.equal(commandReaction('git status', ok('')), null)
  assert.equal(commandReaction('npm test', { deny: 'no' }), null)
  assert.ok(!isTestCommand('ls latest'))
})

test('mogging: the words that set it off', async () => {
  const { messageReaction } = await import('../hooks/work.mjs')
  assert.equal(messageReaction('bro is mogging'), 'mog')
  assert.equal(messageReaction('time to looksmax'), 'mog')
  assert.equal(messageReaction('smog warning today'), null, 'only the word on its own')
  assert.equal(messageReaction('Good morning!'), 'goodmorning')
  assert.equal(messageReaction('gm'), 'goodmorning')
  assert.equal(messageReaction('gmail is down'), null, 'gm only as its own word')
  assert.equal(messageReaction('gn'), 'goodnight')
  assert.equal(messageReaction('ok good night, thanks'), 'goodnight')
  assert.equal(messageReaction('night mode is off'), null, 'not the night-mode setting')
  assert.equal(messageReaction('ship it tonight'), null)
})

test('each tool and connected app picks its own look', async () => {
  const { toolReaction } = await import('../hooks/work.mjs')
  assert.equal(toolReaction('Read', { file_path: '/src/app.mjs' }), 'readfile')
  assert.equal(toolReaction('Read', { file_path: '/tmp/Screen Shot.PNG' }), 'photo')
  assert.equal(toolReaction('TodoWrite', {}), 'todo')
  assert.equal(toolReaction('Skill', {}), 'spellbook')
  assert.equal(toolReaction('ToolSearch', {}), 'toolbox')
  assert.equal(toolReaction('ScheduleWakeup', {}), 'alarm')
  assert.equal(toolReaction('Monitor', {}), 'binoculars')
  assert.equal(toolReaction('mcp__Claude_Browser__navigate', {}), 'browser')
  assert.equal(toolReaction('mcp__claude-in-chrome__computer', { action: 'screenshot' }), 'browser', 'looking at a page: the browser window')
  assert.equal(toolReaction('mcp__Claude_Browser__computer', { action: 'left_click' }), 'mouseride', 'clicking: he rides the pointer')
  assert.equal(toolReaction('mcp__playwright__browser_type', {}), 'mouseride')
  assert.equal(toolReaction('mcp__Claude_Browser__browser_batch', { actions: [{ name: 'navigate', input: { url: 'x.com' } }, { name: 'computer', input: { action: 'type' } }] }), 'mouseride')
  assert.equal(toolReaction('mcp__Claude_Browser__browser_batch', { actions: [{ name: 'navigate', input: { url: 'x.com' } }, { name: 'get_page_text', input: {} }] }), 'browser')
  assert.equal(toolReaction('mcp__Claude_Browser__navigate', { url: 'https://kanban.example' }), 'kanban')
  assert.equal(toolReaction('Bash', { command: 'python3 tools/kanban.py add Backlog "x"' }), 'kanban')
  assert.equal(toolReaction('Bash', { command: 'ls' }), null)
  assert.equal(toolReaction('mcp__blender__execute_blender_code', {}), 'sculpt')
  assert.equal(toolReaction('mcp__davinci-resolve__add_marker', {}), 'clapper')
  assert.equal(toolReaction('mcp__firecrawl__firecrawl_scrape', {}), 'netcatch')
  assert.equal(toolReaction('mcp__Claude_Code_iOS_Simulator__control', {}), 'apptest')
  assert.equal(toolReaction('mcp__plugin_pdf-viewer_pdf__display_pdf', {}), 'highlight')
  assert.equal(toolReaction('mcp__visualize__show_widget', {}), 'chart')
  assert.equal(toolReaction('mcp__21st__get_component', {}), 'blocks')
  assert.equal(toolReaction('mcp__0bb1fc4d-2dcf__search_threads', {}), 'inbox')
  assert.equal(toolReaction('mcp__e1e1626f-2bb4__list_events', {}), 'planner')
  assert.equal(toolReaction('mcp__3975020f-61c8__read_file_content', {}), 'cabinet')
  assert.equal(toolReaction('mcp__slack__post_message', {}), 'plugin', 'an app without a look of its own gets the plug')
  assert.equal(toolReaction('mcp__ccd_session__mark_chapter', {}), null, 'the desktop app itself is not a connected app')
  assert.equal(toolReaction('Edit', {}), null)
  assert.equal(toolReaction(undefined, undefined), null)
})

test('thinking a long time turns his gears', () => {
  const working = { mood: 'happy', turnRunning: true, asleep: false, tool: null, toolAgeMs: 99999, doneAgeMs: 99999, wakeAgeMs: 99999, gymAgeMs: 99999, flagAgeMs: 99999, alertAgeMs: 99999, alertState: null, limit: null }
  assert.equal(stateFor({ ...working, thinkingMs: 2_000 }), 'think')
  assert.equal(stateFor({ ...working, thinkingMs: 10_000 }), 'gears')
  assert.equal(stateFor({ ...working, thinkingMs: 60_000 }), 'gears', 'the gears keep turning however long it thinks')
  assert.equal(stateFor({ ...working, turnRunning: false, thinkingMs: 30_000 }), 'calm', 'only while Claude is working')
})

test('commands, big deletes and Claude\'s replies pick their looks', async () => {
  const { toolReaction, replyReaction } = await import('../hooks/work.mjs')
  assert.equal(toolReaction('Bash', { command: 'docker compose up -d' }), 'whale')
  assert.equal(toolReaction('Bash', { command: 'python3 scripts/report.py' }), 'snake')
  assert.equal(toolReaction('Bash', { command: 'python3 manage.py migrate' }), 'dig', 'a database step beats the snake')
  assert.equal(toolReaction('Bash', { command: 'psql -c "select 1"' }), 'dig')
  assert.equal(toolReaction('mcp__supabase__execute_sql', {}), 'dig')
  assert.equal(toolReaction('Bash', { command: 'npx prettier --write .' }), 'comb')
  assert.equal(toolReaction('Bash', { command: 'cargo clippy' }), 'comb', 'a lint step beats the crab')
  assert.equal(toolReaction('WebSearch', { query: 'x' }), 'satellite')
  assert.equal(toolReaction('Edit', { file_path: '/app/cart.test.mjs', old_string: 'a', new_string: 'b' }), 'labcoat')
  assert.equal(toolReaction('Edit', { file_path: '/tests/cart.mjs', old_string: 'a', new_string: 'b' }), 'labcoat')
  assert.equal(toolReaction('Write', { file_path: '/app/site.css' }), 'paint')
  assert.equal(toolReaction('Edit', { file_path: '/README.md', old_string: 'a', new_string: 'b' }), 'quill')
  assert.equal(toolReaction('Edit', { file_path: '/app/cart.mjs', old_string: 'a', new_string: 'b' }), null, 'ordinary code has no look')
  assert.equal(toolReaction('Bash', { command: 'cargo build --release' }), 'ferris')
  assert.equal(toolReaction('Edit', { old_string: 'x\n'.repeat(30), new_string: 'y' }), 'erase')
  assert.equal(toolReaction('Edit', { old_string: 'a\nb', new_string: 'c' }), null, 'a small edit is not a big delete')
  assert.equal(replyReaction('Sorry, that was my mistake.'), 'bow')
  assert.equal(replyReaction('All done! The tests pass.'), 'party')
  assert.equal(replyReaction('x', 9_000), 'longscroll')
  assert.equal(replyReaction('Here is the plan.'), null)
})

test('a command that runs the tests and then commits or pushes shows the git step, unless the tests fail', async () => {
  const { commandReaction } = await import('../hooks/work.mjs')
  const ok = { ref: 1, result: { stdout: 'ℹ pass 12\nℹ fail 0', stderr: '' }, text: '' }
  const broken = { ref: 1, result: { stdout: 'ℹ pass 11\nℹ fail 1', stderr: '' }, text: '' }
  assert.equal(commandReaction('node --test tests/ && git add -A && git commit -m x && git push', ok), 'rocket')
  assert.equal(commandReaction('npm test && git commit -m x', ok), 'ship')
  assert.equal(commandReaction('node --test tests/ && git commit -m x', broken), 'facepalm', 'broken tests still win')
  assert.equal(commandReaction('npm test', ok), 'cheer')
})

test('git trouble, deploys and Friday afternoons pick their looks', async () => {
  const { commandReaction, startReaction, pickFidget } = await import('../hooks/work.mjs')
  const out = (stdout, isError = false) => ({ ref: 1, isError, result: { stdout, stderr: '' }, text: '' })
  assert.equal(commandReaction('git merge main', out('CONFLICT (content): Merge conflict in a.js\nAutomatic merge failed', true)), 'armwrestle')
  assert.equal(commandReaction('git pull', out('Already up to date.')), null)
  assert.equal(commandReaction('vercel deploy --prod', out('ok')), 'parachute')
  assert.equal(commandReaction('npm run deploy', out('ok')), 'parachute')
  assert.equal(commandReaction('vercel deploy --prod', out('error', true)), null, 'a failed deploy lands nothing')
  const friday = new Date(2026, 9, 9, 15)
  const monday = new Date(2026, 9, 5, 15)
  assert.equal(startReaction('git push --force origin main', monday), 'redbutton')
  assert.equal(startReaction('git push origin main', monday), null)
  assert.equal(startReaction('vercel deploy --prod', friday), 'crossclaws')
  assert.equal(startReaction('vercel deploy --prod', new Date(2026, 9, 9, 9)), null, 'Friday morning is fine')
  assert.equal(startReaction('vercel deploy --prod', monday), null)
  assert.equal(pickFidget(new Date(2026, 9, 8, 12, 15)), 'sandwich')
  assert.equal(pickFidget(new Date(2026, 9, 8, 16, 0), () => 0), 'yoyo')
})

test('laughing, emoji, brb, walls of text, builds, security checks, stashes, branches and the week pick their looks', async () => {
  const { messageReaction, toolReaction, isMondayMorning, isWeekend } = await import('../hooks/work.mjs')
  assert.equal(messageReaction('lmao'), 'laugh')
  assert.equal(messageReaction('hahaha nice'), 'laugh')
  assert.equal(messageReaction('I want a lollipop'), null, 'only the word on its own')
  assert.equal(messageReaction('this is 🔥'), 'onfire')
  assert.equal(messageReaction('🎉'), 'party')
  assert.equal(messageReaction('love it ❤️'), 'blush')
  assert.equal(messageReaction('brb'), 'brb')
  assert.equal(messageReaction('x'.repeat(3_000)), 'paperstack')
  assert.equal(toolReaction('Bash', { command: 'npm audit' }), 'detective')
  assert.equal(toolReaction('Bash', { command: 'git stash' }), 'rug')
  assert.equal(toolReaction('Bash', { command: 'git stash pop' }), null)
  assert.equal(toolReaction('Bash', { command: 'git switch dev' }), 'signpost')
  assert.equal(toolReaction('Bash', { command: 'git checkout -- app.js' }), 'rewind', 'restoring a file is an undo, not a branch')
  assert.equal(toolReaction('Bash', { command: 'npm run build' }), 'bricks')
  assert.equal(toolReaction('Bash', { command: 'make test' }), null)
  assert.equal(toolReaction('Bash', { command: 'cargo build' }), 'ferris', 'the crab buddy keeps Rust')
  assert.equal(toolReaction('TodoWrite', { todos: [{ status: 'completed' }, { status: 'completed' }] }), 'checkall')
  assert.equal(toolReaction('TodoWrite', { todos: [{ status: 'completed' }, { status: 'pending' }] }), 'todo')
  assert.equal(isMondayMorning(new Date(2026, 9, 5, 9)), true)
  assert.equal(isMondayMorning(new Date(2026, 9, 5, 14)), false)
  assert.equal(isWeekend(new Date(2026, 9, 10, 9)), true)
  assert.equal(isWeekend(new Date(2026, 9, 9, 9)), false)
})

test('wondering, quick okays, slips, giant files, deletes, moves, downloads and undos pick their looks', async () => {
  const { messageReaction, toolReaction, isGiantRead, nextCakeAt } = await import('../hooks/work.mjs')
  assert.equal(messageReaction('ok'), 'thumbsup')
  assert.equal(messageReaction('👍'), 'thumbsup')
  assert.equal(messageReaction('ok but make it blue'), null, 'only when the okay is the whole message')
  assert.equal(messageReaction('oops wrong file'), 'comfort')
  assert.equal(messageReaction('how does the cache work?'), 'wonder')
  assert.equal(messageReaction('why is this still broken'), 'nervous', 'frustration wins')
  assert.equal(toolReaction('Bash', { command: 'rm old.txt' }), 'shredder')
  assert.equal(toolReaction('Bash', { command: 'rm -rf build' }), null, 'a forced recursive delete is the risky look')
  assert.equal(toolReaction('Bash', { command: 'git mv a.js b.js' }), 'relabel')
  assert.equal(toolReaction('Bash', { command: 'curl -sLO https://example.com/x.zip' }), 'download')
  assert.equal(toolReaction('Bash', { command: 'git restore app.js' }), 'rewind')
  assert.equal(toolReaction('Bash', { command: 'git reset --hard' }), null)
  assert.equal(isGiantRead({ result: { file: { totalLines: 3_000 } } }), true)
  assert.equal(isGiantRead({ result: { file: { totalLines: 40 } } }), false)
  assert.equal(nextCakeAt(0), 60 * 60 * 1000)
  assert.equal(nextCakeAt(1), 3 * 60 * 60 * 1000)
})