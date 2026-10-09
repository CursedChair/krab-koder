// What the preview page says about each look. The numbers come straight from the mod's own code, and
// tests/notes.test.mjs checks the order below against the real rules, so this page cannot drift.
import {
  ALERT_MS, BEDTIME_MS, COMPACT_MAX_MS, CRITICAL_AT, EVENT_MS, FLAG_MS, GEARS_MS, GYM_MS, LIMIT_REACHED_AT, REST_MIN_TICKS, REST_SPREAD_TICKS, SLEEP_AFTER_MS, STRAINED_AT,
  TICK_MS, TIRED_AT, TOOL_MS, WAKE_MS, WAVE_MS,
} from '../hooks/life.mjs'
import { ALERT_AT, CELEBRATE_AT, FRESH_MS, URGENT_AT, WARN_AT } from '../hooks/limits.mjs'

const seconds = (ms) => `${+(ms / 1000).toFixed(1)} seconds`
const restFrom = seconds(REST_MIN_TICKS * TICK_MS)
const restTo = seconds((REST_MIN_TICKS + REST_SPREAD_TICKS - 1) * TICK_MS)
const hours = (ms) => `${ms / 3_600_000} hours`

// Top wins. Each line also gives a situation that makes it true, which the test uses to check the order.
export const PRIORITY = [
  { name: 'Compacting the chat', looks: ['compact'], patch: { compacting: true }, note: 'Wins over everything, including sleep, until compacting ends.' },
  { name: 'Asleep', looks: ['asleep', 'bedtime'], patch: { asleep: true }, note: `Nothing has happened for ${seconds(SLEEP_AFTER_MS)} while Claude is idle. He gets into bed first (${seconds(BEDTIME_MS)}), then sleeps. This beats everything.` },
  { name: 'Waking up', looks: ['wake'], patch: { wakeAgeMs: 100 }, note: `${seconds(WAKE_MS)} after anything wakes him.` },
  { name: 'A plan limit has run out', looks: ['limit'], patch: { limit: { state: 'clock', percent: LIMIT_REACHED_AT } }, note: `At ${LIMIT_REACHED_AT}% of your five-hour or weekly limit. He is out cold with X eyes until it resets. Only sleeping and compacting beat it.` },
  { name: 'Claude is waiting on your answer', looks: ['permission', 'asking'], patch: { waiting: 'permission' }, note: 'A permission dialog or Claude\'s questions are up. It shows until you answer, because nothing moves until you do.' },
  { name: 'An event: flag, gym, a limit alert, or a reaction', looks: ['flag', 'gym', 'clock', 'calendar', 'shrug', 'oops', 'glitch', 'stamp', 'pop', 'peek', 'house', 'hello', 'bye', 'folder', 'plan', 'auto', 'ask', 'send', 'receive', 'present', 'shrink', 'buff', 'ascend', 'fall', 'firstsnow', 'cheer', 'facepalm', 'ship', 'rocket', 'browse', 'trophy', 'yoyo', 'juggle', 'stretch', 'phone', 'coffee', 'game', 'gum', 'music', 'readbook', 'startled', 'blush', 'nervous', 'flinch', 'camera', 'tapfoot', 'yawn', 'unbox', 'magnify', 'mail', 'risky', 'listen', 'mog', 'readfile', 'photo', 'todo', 'browser', 'mouseride', 'spellbook', 'toolbox', 'alarm', 'binoculars', 'plugin', 'sculpt', 'inbox', 'planner', 'cabinet', 'clapper', 'netcatch', 'apptest', 'blocks', 'highlight', 'cube', 'unity', 'goodmorning', 'goodnight', 'satellite', 'armwrestle', 'redbutton', 'comb', 'dig', 'parachute', 'labcoat', 'paint', 'quill', 'water', 'sandwich', 'crossclaws', 'laugh', 'onfire', 'brb', 'paperstack', 'bricks', 'detective', 'rug', 'signpost', 'checkall', 'monday', 'weekend', 'chart', 'kanban', 'pet', 'grumpy', 'bow', 'party', 'longscroll', 'knock', 'whale', 'snake', 'ferris', 'erase', 'hatch', 'puff', 'wrench', 'multiarm', 'boxin', 'sweep'], patch: { gymAgeMs: 100 }, note: 'If two play at once, the newer one wins. They even interrupt Claude\'s work.' },
  { name: 'Context window nearly full', looks: ['critical'], patch: { mood: 'critical' }, note: `${CRITICAL_AT}% or more. The one exception: a plan limit at ${URGENT_AT}% or more outranks it, because you can free up context but not your week.` },
  { name: 'Claude is thinking hard', looks: ['gears'], patch: { turnRunning: true, thinkingMs: GEARS_MS + 1000 }, note: `Thinking for ${seconds(GEARS_MS)} with nothing written yet.` },
  { name: 'Claude is working', looks: ['think', 'edit', 'shell', 'look'], patch: { turnRunning: true }, note: 'Thinking, writing, running a command, or reading.' },
  { name: 'Reply ready', looks: ['done'], patch: { doneAgeMs: 100 }, note: `${seconds(WAVE_MS)} after Claude finishes.` },
  { name: 'Background tasks running', looks: ['task'], patch: { tasks: 1 }, note: 'Claude is idle but still waiting on background work, like a subagent or a long command. It also keeps him from falling asleep.' },
  { name: 'A plan limit is getting close', looks: ['clock', 'calendar'], patch: { limit: { state: 'calendar', percent: WARN_AT + 5 } }, note: `From ${WARN_AT}%. If both are close, the fuller one shows.` },
  { name: 'Context window mood', looks: ['strained', 'tired', 'calm'], patch: { mood: 'tired' }, note: 'What he looks like when nothing else is going on.' },
]

// For each look: what starts it, how long it lasts, and what takes over from it.
export const NOTES = {
  calm: {
    starts: `Context window under ${TIRED_AT}% and nothing else going on.`,
    lasts: `As long as that stays true. He wanders back and forth and rests ${restFrom} to ${restTo} between walks. Idle is standing, running is walking.`,
    then: `Tired at ${TIRED_AT}%, or any event, or Claude starting work.`,
  },
  tired: {
    starts: `Context window ${TIRED_AT}% to ${STRAINED_AT - 1}%.`,
    lasts: 'While the context stays in that range. He walks at half speed and sweats.',
    then: `Strained at ${STRAINED_AT}%. Back to calm below ${TIRED_AT}% (after /clear or /compact).`,
  },
  strained: {
    starts: `Context window ${STRAINED_AT}% to ${CRITICAL_AT - 1}%.`,
    lasts: 'While the context stays in that range. He crouches, trembles, and walks at a third of the speed.',
    then: `Critical at ${CRITICAL_AT}%. Back to tired below ${STRAINED_AT}%.`,
  },
  critical: {
    starts: `Context window ${CRITICAL_AT}% or more.`,
    lasts: 'Until the context drops below that. He stops walking and waves both arms with a red alert. He shows even while Claude is working.',
    then: `A plan limit at ${URGENT_AT}%+ takes over when Claude is idle. Events, waking and sleep always win.`,
  },
  think: {
    starts: `Claude is working and has not used a tool in the last ${seconds(TOOL_MS)}.`,
    lasts: 'Until Claude uses a tool or finishes. He stands still while Claude works.',
    then: 'Writing, command or reading as soon as Claude uses a tool; reply ready when it finishes.',
  },
  edit: {
    starts: 'Claude edits or writes a file (Edit, Write, MultiEdit, NotebookEdit).',
    lasts: `${seconds(TOOL_MS)} after the last such call, so it stays on while edits keep coming.`,
    then: 'Thinking if nothing new happens; another tool look if Claude switches; reply ready when it finishes.',
  },
  shell: {
    starts: 'Claude runs a command (Bash, PowerShell).',
    lasts: `${seconds(TOOL_MS)} after the last command, so it stays on while commands keep coming.`,
    then: 'Thinking if nothing new happens; another tool look if Claude switches; reply ready when it finishes.',
  },
  look: {
    starts: 'Claude uses any other tool: reading files, searching, or fetching a page.',
    lasts: `${seconds(TOOL_MS)} after the last such call.`,
    then: 'Thinking if nothing new happens; another tool look if Claude switches; reply ready when it finishes.',
  },
  done: {
    starts: 'Claude finishes a reply.',
    lasts: `${seconds(WAVE_MS)}: two throws of confetti, one from each hand. Running (only if he was walking) means jumping and throwing with both.`,
    then: 'Back to whatever applies: a limit warning, his context mood, or calm. A new prompt cuts it short.',
  },
  asleep: {
    starts: `${seconds(SLEEP_AFTER_MS)} with no prompt, no tool and no reply while Claude is idle.`,
    lasts: 'Until anything at all happens: a prompt, a tool, a model switch, a limit reset.',
    then: `He wakes up (the running picture, ${seconds(WAKE_MS)}), then shows whatever applies.`,
  },
  compact: {
    starts: 'Claude Code starts compacting the chat (you ran /compact, or it ran by itself because the context was nearly full).',
    lasts: `Until compacting finishes, or ${seconds(COMPACT_MAX_MS)} at most. Each 3 seconds: a sheet of paper appears, he squeezes it into a ball, tosses it away. No running version: he stays put.`,
    then: 'Whatever applies next. After a compaction the context is much emptier, so he usually looks calmer.',
  },
  bedtime: {
    starts: `${seconds(SLEEP_AFTER_MS)} with nothing happening while Claude is idle. It plays once, right before he sleeps.`,
    lasts: `${seconds(BEDTIME_MS)}. He stands as he is, a nightcap drops onto his head, he settles down, the blanket slides up over him and his eyes droop shut. No running version: it is one routine.`,
    then: 'The sleeping picture, which picks up exactly where this ends. Anything that happens wakes him first.',
  },
  gym: {
    starts: 'The effort level changes (low, medium, high, xhigh, max). Claude Code reports it with Claude\'s next step, so it plays then. A switch to a model he does not recognise also plays it.',
    lasts: `${seconds(GYM_MS)}, his weightlifting routine. The higher the effort, the faster he lifts. The line under him says the new level. No running version: it is one recorded routine.`,
    then: 'Back to whatever applies. A sleeping Clawd wakes first, then works out.',
  },
  flag: {
    starts: `Your 5-hour window ends after you used at least ${CELEBRATE_AT}% of it. If you were away, only if it ended in the last ${hours(FRESH_MS)}.`,
    lasts: `${seconds(FLAG_MS)}, the waving clip twice. Once per window. No running version: it is one recorded routine.`,
    then: 'Back to whatever applies. A sleeping Clawd wakes first, then waves the flag.',
  },
  clock: {
    starts: `Your 5-hour limit reaches ${WARN_AT}%. At ${ALERT_AT}% it comes back as an alert, even mid-work, once per window.`,
    lasts: `While it stays at ${WARN_AT}% or more and Claude is idle. At ${URGENT_AT}% the bells ring, the ring flashes and the big hand speeds up. The alert lasts ${seconds(ALERT_MS)}. Red wedge = how much is used.`,
    then: 'Claude\'s work replaces it while Claude is busy. The flag takes over when the window resets.',
  },
  task: {
    starts: 'Claude finishes its turn while background work it started is still running: a subagent, a background command or a monitor.',
    lasts: "Until Claude stops again with nothing left in flight. Claude's coral spark spins beside him with a count of the tasks, he glances up at it and taps a foot, and he does not fall asleep while it runs. From 7 am to noon he drinks a cup of coffee while he waits.",
    then: 'Usually Claude starts working again when a task comes back, and once everything is done he goes back to whatever applies.',
  },
  limit: {
    starts: `Your five-hour or weekly limit reaches ${LIMIT_REACHED_AT}%: you have run out.`,
    lasts: 'As long as the limit stays used up. He slumps and sways with X for eyes, his arms hang limp and dizzy stars circle over his head. Any hat or outfit gets knocked askew.',
    then: 'Back to normal once the limit resets and usage falls. Sleep and compacting still win over it.',
  },
  calendar: {
    starts: `Your weekly limit reaches ${WARN_AT}%. At ${ALERT_AT}% it comes back as an alert, even mid-work, once per week.`,
    lasts: `While it stays at ${WARN_AT}% or more and Claude is idle. At ${URGENT_AT}% the page flutters and he shakes. The alert lasts ${seconds(ALERT_MS)}. Filled days = how much is used.`,
    then: 'Claude\'s work replaces it while Claude is busy. It goes away once the week resets and usage falls below the warning level.',
  },
  permission: {
    starts: 'Claude Code shows a permission dialog: Claude wants to run something and needs your OK.',
    lasts: 'Until you answer the dialog. He holds a "?" sign up high, swaying it, taps a foot and keeps checking his wristwatch.',
    then: 'A shrug if you said no; otherwise back to Claude working.',
  },
  asking: {
    starts: 'Claude asks you questions (its multiple-choice question box), or a connected tool asks you to fill something in.',
    lasts: 'Until you answer. A "?" speech bubble floats over his head while he points at it; several questions stack up as several bubbles with a count badge.',
    then: 'Back to Claude working once you answer.',
  },
  shrug: {
    starts: 'You turn down a permission request, or auto mode\'s safety check blocks a step.',
    lasts: `${seconds(EVENT_MS.shrug)}, once. A big red rubber stamp slams an X onto his face; he winces, then shakes it off.`,
    then: 'Back to Claude working or whatever applies.',
  },
  oops: {
    starts: 'A command or tool Claude ran fails. At most once every 15 seconds, and never when you stopped it yourself.',
    lasts: `${seconds(EVENT_MS.oops)}, once. A puff of smoke rises off his head and he droops, then he dusts himself off.`,
    then: 'Back to Claude working, which usually means trying again.',
  },
  glitch: {
    starts: 'Claude\'s reply fails: a network hiccup, an overloaded server, or an API error.',
    lasts: `${seconds(EVENT_MS.glitch)}. He glitches like a bad video signal (slices jumping sideways, colour ghosts, flicker) with dizzy rolling eyes.`,
    then: 'Back to whatever applies. Try sending your message again.',
  },
  stamp: {
    starts: 'A task in Claude\'s task list is marked done.',
    lasts: `${seconds(EVENT_MS.stamp)}, once. He holds up a sheet and draws a big green check on it with a pencil, stroke by stroke.`,
    then: 'Back to Claude working.',
  },
  pop: {
    starts: 'A background task Claude was waiting on finishes.',
    lasts: `${seconds(EVENT_MS.pop)}, once. The spinning spark bursts like a firework and he hops with a thumbs up.`,
    then: 'The spark again if more tasks are still running, otherwise whatever applies.',
  },
  peek: {
    starts: 'A file in your project changes while Claude is idle, so it was you (or another app) saving it. Changes inside .git, node_modules and build folders do not count.',
    lasts: `${seconds(EVENT_MS.peek)}, once. A page pops up beside him; he looks over, puts on reading glasses and leans in.`,
    then: 'Back to whatever applies.',
  },
  house: {
    starts: 'Claude creates a worktree: a separate copy of your project to work in.',
    lasts: `${seconds(EVENT_MS.house)}, once. He hammers away while a little house goes up beside him, piece by piece.`,
    then: 'Back to Claude working.',
  },
  hello: {
    starts: 'A session starts, resumes or is cleared with /clear.',
    lasts: `${seconds(EVENT_MS.hello)}, once. He hops and waves with a "HI!" bubble.`,
    then: 'Whatever applies next, usually calm.',
  },
  bye: {
    starts: 'A session ends or is cleared. After /clear the hello plays right after it.',
    lasts: `${seconds(EVENT_MS.bye)}, once. He waves with a "BYE" bubble, then walks off to the right.`,
    then: 'Hello, if the session was only cleared.',
  },
  folder: {
    starts: 'The session moves to another folder.',
    lasts: `${seconds(EVENT_MS.folder)}, once. A folder opens under him, he jumps in, it snaps shut and vanishes, and he drops back down from the sky.`,
    then: 'Back to whatever applies.',
  },
  plan: {
    starts: 'You switch to plan mode. Claude Code only tells him with its next event, so it shows when you next send a message.',
    lasts: `${seconds(EVENT_MS.plan)}, once. He unrolls a blue blueprint and studies it.`,
    then: 'Back to whatever applies.',
  },
  auto: {
    starts: 'You switch to auto mode (or another mode that runs without asking). It shows with Claude Code\'s next event.',
    lasts: `${seconds(EVENT_MS.auto)}, once. A robot antenna pops up on his head, his eyes flash and he does a beep-boop bounce.`,
    then: 'Back to whatever applies.',
  },
  ask: {
    starts: 'You switch back to a mode that asks before acting (the default, or accept-edits). It shows with Claude Code\'s next event.',
    lasts: `${seconds(EVENT_MS.ask)}, once. He holds up a clipboard and ticks down a checklist.`,
    then: 'Back to whatever applies.',
  },
  shrink: {
    starts: 'You switch down to a smaller model (Opus to Sonnet, or to Haiku). From Fable he falls instead.',
    lasts: `${seconds(EVENT_MS.shrink)}, once. He shrinks with a squish, puts on glasses and pushes them up his nose. The line under him says which model and what the switch costs.`,
    then: 'Back to his usual size and whatever applies.',
  },
  buff: {
    starts: 'You switch up to Opus (or any step up that is not Fable).',
    lasts: `${seconds(EVENT_MS.buff)}, once. He pumps himself up bigger, muscle lines show, and he flexes his bicep. The line under him says which model and what the switch costs.`,
    then: 'Back to his usual size and whatever applies.',
  },
  ascend: {
    starts: 'You switch up to Fable.',
    lasts: `${seconds(EVENT_MS.ascend)}, once. A beam of light falls on him, he glows white, his eyes light up, wings unfold, a halo appears and he rises up.`,
    then: 'Back down to whatever applies.',
  },
  fall: {
    starts: 'You switch down from Fable to Opus, Sonnet or Haiku.',
    lasts: `${seconds(EVENT_MS.fall)}, once. Hovering in the light, his glow flickers out, the wings fold away, the halo drops and he falls with a thump.`,
    then: 'Whatever applies next.',
  },
  firstsnow: {
    starts: 'The live weather shows snow for the first time this season (a season runs July to June). It needs /krab location set.',
    lasts: `${seconds(EVENT_MS.firstsnow)}, once a season. He looks up and holds his hands out, a big snowflake drifts down onto his head, and he gives a happy shiver.`,
    then: 'Back to whatever applies, with the snow falling behind him.',
  },
  cheer: {
    starts: 'A test run Claude started passes (npm test, node --test, pytest, jest, vitest, cargo test, go test and the like).',
    lasts: `${seconds(EVENT_MS.cheer)}, once. He pumps both fists in the air and hops, and confetti bursts above him.`,
    then: 'Back to Claude working.',
  },
  facepalm: {
    starts: 'A test run Claude started fails (it ends in an error, or prints failures). It takes the place of the puff of smoke.',
    lasts: `${seconds(EVENT_MS.facepalm)}, once. He slaps a hand over his face, sags, shakes his head, and a bead of sweat runs down.`,
    then: 'Back to Claude working.',
  },
  ship: {
    starts: 'Claude makes a git commit, and it goes through.',
    lasts: `${seconds(EVENT_MS.ship)}, once. He holds a cardboard box, folds its flaps shut, tapes it, and a green check seal stamps onto it.`,
    then: 'Back to Claude working.',
  },
  rocket: {
    starts: 'Claude pushes to git (git push), and it goes through.',
    lasts: `${seconds(EVENT_MS.rocket)}, once. A little rocket stands on a launch pad beside him; he points, the engine lights, and it blasts off out of sight.`,
    then: 'Back to Claude working.',
  },
  browse: {
    starts: 'Claude opens a web page to read it (once for a run of them, at most every 10 seconds). A web search gets the satellite dish.',
    lasts: `${seconds(EVENT_MS.browse)}, once. He opens a laptop with its screen facing him and types away, the screen's blue glow lighting up his face.`,
    then: 'Back to Claude reading.',
  },
  trophy: {
    starts: 'You send your 100th message, then the 500th, 1,000th, 2,500th, 5,000th and 10,000th (counted across all your sessions).',
    lasts: `${seconds(EVENT_MS.trophy)}, once. He lifts a gold trophy over his head, with sparkles and confetti.`,
    then: 'Back to Claude working on your message.',
  },
  yoyo: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (a yo-yo, juggling or a stretch, picked at random).',
    lasts: `${seconds(EVENT_MS.yoyo)}, once per quiet spell. He plays with a yo-yo, down and back up three times, his eyes following it.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  juggle: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (a yo-yo, juggling or a stretch, picked at random).',
    lasts: `${seconds(EVENT_MS.juggle)}, once per quiet spell. He juggles three coloured balls in an arc over his head for a few rounds, then fumbles: they drop out of his hands and bounce on the floor.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  stretch: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (a yo-yo, juggling or a stretch, picked at random).',
    lasts: `${seconds(EVENT_MS.stretch)}, once per quiet spell. He reaches his arms high, stands up tall with his eyes shut, then relaxes.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  phone: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (one of ten little things, picked at random).',
    lasts: `${seconds(EVENT_MS.phone)}, once. He scrolls his phone (its screen toward him), thumb flicking, its glow on his face, and laughs at something.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  coffee: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (one of ten little things, picked at random).',
    lasts: `${seconds(EVENT_MS.coffee)}, once. He brings up a steaming mug, sips with his eyes shut, and lets out a happy sigh.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  game: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (one of ten little things, picked at random).',
    lasts: `${seconds(EVENT_MS.game)}, once. He hunches over a handheld game, mashing buttons, and a star pops up when he wins.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  gum: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (one of ten little things, picked at random).',
    lasts: `${seconds(EVENT_MS.gum)}, once. He blows a pink bubble that grows until it pops all over his face, then wipes it off.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  music: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (one of ten little things, picked at random).',
    lasts: `${seconds(EVENT_MS.music)}, once. Headphones on, eyes shut, he bops to the beat with notes floating up.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  readbook: {
    starts: 'Now and then in a quiet spell: 25 seconds after the last thing happened, before he dozes off (one of ten little things, picked at random).',
    lasts: `${seconds(EVENT_MS.readbook)}, once. He puts on his reading glasses, holds up a book (the cover toward you), reads, and turns a page.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  startled: {
    starts: 'You stop Claude mid-reply (Esc).',
    lasts: `${seconds(EVENT_MS.startled)}, once. He jumps, startled, hands up, with a "!" over his head.`,
    then: 'Back to whatever applies, usually calm.',
  },
  blush: {
    starts: 'You thank Claude or say something nice (thanks, good job, perfect, love it).',
    lasts: `${seconds(EVENT_MS.blush)}, once. He blushes, a heart floats up, and he sways shyly.`,
    then: 'Back to Claude working on your message.',
  },
  nervous: {
    starts: 'You sound frustrated (wtf, ugh, bro, still broken, why is..., !!!).',
    lasts: `${seconds(EVENT_MS.nervous)}, once. He sweats, his eyes dart about, and he fidgets with his hands.`,
    then: 'Back to Claude working on your message.',
  },
  flinch: {
    starts: 'You write a message mostly in CAPITALS.',
    lasts: `${seconds(EVENT_MS.flinch)}, once. He flinches, squashed down with his eyes squeezed shut, shock lines around his head.`,
    then: 'Back to Claude working on your message.',
  },
  camera: {
    starts: 'You paste a picture or attach a file.',
    lasts: `${seconds(EVENT_MS.camera)}, once. He holds up a camera, the flash goes off, and a photo slides out.`,
    then: 'Back to Claude working on your message.',
  },
  tapfoot: {
    starts: 'Claude has been working on one reply for over 2 minutes (once a reply).',
    lasts: `${seconds(EVENT_MS.tapfoot)}, once. He checks his watch and taps his foot.`,
    then: 'Back to Claude working.',
  },
  yawn: {
    starts: 'You send a message between 1 and 5 in the morning (once a night).',
    lasts: `${seconds(EVENT_MS.yawn)}, once. A huge yawn behind his hand, eyes shut, and a little tear.`,
    then: 'Back to Claude working on your message.',
  },
  unbox: {
    starts: 'Claude installs packages (npm install, pip install, brew install, cargo add and the like).',
    lasts: `${seconds(EVENT_MS.unbox)}, once. A delivery box drops from the sky, he opens the flaps, and the packages pop out.`,
    then: 'Back to Claude working.',
  },
  magnify: {
    starts: 'Claude searches the code (its search tools, or grep, rg or find), at most every 10 seconds.',
    lasts: `${seconds(EVENT_MS.magnify)}, once. He peers through a big magnifying glass, his eye huge behind the lens.`,
    then: 'Back to Claude working.',
  },
  mail: {
    starts: 'Claude opens a pull request (gh pr create).',
    lasts: `${seconds(EVENT_MS.mail)}, once. He folds an envelope shut, a seal stamps it, and it flies off.`,
    then: 'Back to Claude working.',
  },
  risky: {
    starts: 'Claude starts a risky command (rm -rf, a force push, sudo, git reset --hard).',
    lasts: `${seconds(EVENT_MS.risky)}, once. He hides behind his hands, peeking through, sweating.`,
    then: 'Back to Claude working.',
  },
  listen: {
    starts: 'You send a message from your phone (Remote Control), or attach an audio clip.',
    lasts: `${seconds(EVENT_MS.listen)}, once. A comically huge ear grows out of his head and he cups a hand to it to listen in.`,
    then: 'Back to Claude working on your message.',
  },
  mog: {
    starts: 'Now and then in a quiet spell (one of the idle fidgets), or when your message says mog, mogging, looksmax, mewing or sigma.',
    lasts: `${seconds(EVENT_MS.mog)}, once. He leans in slow, eyes heavy-lidded, one brow furrowed and one arched, a sharp jawline and chin, sizing you up, and a glint flashes off his jaw.`,
    then: 'Back to whatever applies, usually calm.',
  },
  readfile: {
    starts: 'Claude reads a file (at most once every 10 seconds).',
    lasts: `${seconds(EVENT_MS.readfile)}, once. Reading glasses on, a paper scroll held open in both hands, its lines scrolling up as he reads.`,
    then: 'Back to Claude working.',
  },
  photo: {
    starts: 'Claude opens a picture or screenshot.',
    lasts: `${seconds(EVENT_MS.photo)}, once. He holds up a framed photo beside him, leans in and squints at it, then his eyes go wide.`,
    then: 'Back to Claude working.',
  },
  todo: {
    starts: 'Claude updates its to-do list.',
    lasts: `${seconds(EVENT_MS.todo)}, once. A clipboard in one hand; a pencil ticks three boxes off one by one.`,
    then: 'Back to Claude working.',
  },
  browser: {
    starts: 'Claude opens or reads a web page in a browser.',
    lasts: `${seconds(EVENT_MS.browser)}, once. A little browser window floats beside him; he steadies it while a pointer clicks around and the pages change.`,
    then: 'Back to Claude working.',
  },
  mouseride: {
    starts: 'Claude clicks, types or drags on a web page.',
    lasts: `${seconds(EVENT_MS.mouseride)}, once. He rides a giant mouse pointer like a flying surfboard, swooping about with one hand waving, its tip clicking as he goes.`,
    then: 'Back to Claude working.',
  },
  spellbook: {
    starts: 'Claude uses a skill (a packaged set of instructions).',
    lasts: `${seconds(EVENT_MS.spellbook)}, once. He flips open a spellbook and magic pours out, sparkles swirling up past his face.`,
    then: 'Back to Claude working.',
  },
  toolbox: {
    starts: 'Claude loads more tools.',
    lasts: `${seconds(EVENT_MS.toolbox)}, once. He digs through a red toolbox, flinging a hammer and a screwdriver out, then holds up a wrench.`,
    then: 'Back to Claude working.',
  },
  alarm: {
    starts: 'Claude sets a timer, a wake-up or a scheduled task.',
    lasts: `${seconds(EVENT_MS.alarm)}, once. He winds a twin-bell alarm clock and spins its hands round, then it rings and shakes in his hands.`,
    then: 'Back to Claude working.',
  },
  binoculars: {
    starts: 'Claude starts watching something run in the background.',
    lasts: `${seconds(EVENT_MS.binoculars)}, once. Binoculars up to his eyes, scanning slowly left and right.`,
    then: 'Back to Claude working.',
  },
  plugin: {
    starts: 'Claude uses a connected app that has no look of its own.',
    lasts: `${seconds(EVENT_MS.plugin)}, once. He pushes a plug into a wall socket; it sparks, connects, and a green light comes on.`,
    then: 'Back to Claude working.',
  },
  sculpt: {
    starts: 'Claude uses Blender, the 3D app.',
    lasts: `${seconds(EVENT_MS.sculpt)}, once. He molds a lump of grey clay on a stand, bits flying off, until it is a little statue of himself.`,
    then: 'Back to Claude working.',
  },
  inbox: {
    starts: 'Claude reads or writes your email.',
    lasts: `${seconds(EVENT_MS.inbox)}, once. Envelopes drop into his arms one after another, and he pulls the letter out of the top one to read.`,
    then: 'Back to Claude working.',
  },
  planner: {
    starts: 'Claude checks or changes your calendar.',
    lasts: `${seconds(EVENT_MS.planner)}, once. He holds up a wall calendar, tears two pages off, then circles a date in red marker.`,
    then: 'Back to Claude working.',
  },
  cabinet: {
    starts: 'Claude looks through or saves your cloud files.',
    lasts: `${seconds(EVENT_MS.cabinet)}, once. Folders fly in over his shoulder and drop into a cardboard box, which he pats.`,
    then: 'Back to Claude working.',
  },
  clapper: {
    starts: 'Claude uses DaVinci Resolve.',
    lasts: `${seconds(EVENT_MS.clapper)}, once. A clapperboard snaps shut twice, with a film reel spinning beside him.`,
    then: 'Back to Claude working.',
  },
  netcatch: {
    starts: 'Claude scrapes a web page (Firecrawl or Scrapling).',
    lasts: `${seconds(EVENT_MS.netcatch)}, once. He swings a butterfly net and catches three little web pages fluttering past.`,
    then: 'Back to Claude working.',
  },
  apptest: {
    starts: 'Claude drives the iPhone simulator.',
    lasts: `${seconds(EVENT_MS.apptest)}, once. He holds a phone up toward you, taps two icons, and an app opens full screen.`,
    then: 'Back to Claude working.',
  },
  blocks: {
    starts: 'Claude looks up UI components (21st).',
    lasts: `${seconds(EVENT_MS.blocks)}, once. He stacks three blocks, each a piece of a page (a button, a picture, a menu), into a tower.`,
    then: 'Back to Claude working.',
  },
  highlight: {
    starts: 'Claude opens or marks up a PDF.',
    lasts: `${seconds(EVENT_MS.highlight)}, once. He holds up a document and runs a yellow highlighter across its lines.`,
    then: 'Back to Claude working.',
  },
  unity: {
    starts: 'Claude uses Unity, the game engine.',
    lasts: `${seconds(EVENT_MS.unity)}, once. He drags a grey cube by its red, green and blue move arrows, presses Play, and the cube drops and bounces on the floor.`,
    then: 'Back to Claude working.',
  },
  goodmorning: {
    starts: 'Your message says good morning (or starts with gm or morning).',
    lasts: `${seconds(EVENT_MS.goodmorning)}, once. The sun comes up beside him, he blinks awake with a little hop and waves, saying "GM!"`,
    then: 'Back to Claude working on your message.',
  },
  goodnight: {
    starts: 'Your message says good night (or starts with gn or night).',
    lasts: `${seconds(EVENT_MS.goodnight)}, once. A crescent moon and stars come out, he waves a sleepy "GN", then nods off as Zs float up.`,
    then: 'Back to Claude working on your message.',
  },
  satellite: {
    starts: 'Claude searches the web.',
    lasts: `${seconds(EVENT_MS.satellite)}, once. A satellite dish beside him swivels across the sky beaming out signal arcs while he cranks it round.`,
    then: 'Back to Claude working.',
  },
  armwrestle: {
    starts: 'A git merge, rebase, pull or cherry-pick hits a conflict.',
    lasts: `${seconds(EVENT_MS.armwrestle)}, once. He tries to push two magnets together, north pole to north pole; three times they get close, shake, and spring apart, under a blue <<< and a red >>>, sweat flying.`,
    then: 'Back to Claude working.',
  },
  redbutton: {
    starts: 'Claude force-pushes with git.',
    lasts: `${seconds(EVENT_MS.redbutton)}, once. He hovers over a big red button, sweating and shaking, then slams it.`,
    then: 'Back to Claude working.',
  },
  comb: {
    starts: 'Claude runs a formatter or linter (Prettier, ESLint, Ruff, cargo fmt and the like).',
    lasts: `${seconds(EVENT_MS.comb)}, once. He combs the top of his head neat, the messy tufts lying flat as the comb passes, and it sparkles. With a hat on, he combs the hat.`,
    then: 'Back to Claude working.',
  },
  dig: {
    starts: 'Claude runs a database command or uses a database app (psql, Prisma, Supabase, migrations).',
    lasts: `${seconds(EVENT_MS.dig)}, once. He digs into a stack of database disks with a shovel, and bits of data fly out.`,
    then: 'Back to Claude working.',
  },
  parachute: {
    starts: 'A deploy finishes without an error (Vercel, Netlify, Fly, Firebase, a deploy script and the like).',
    lasts: `${seconds(EVENT_MS.parachute)}, once. A crate floats down under a parachute and lands on a server rack, whose lights blink green, and he hops.`,
    then: 'Back to Claude working.',
  },
  labcoat: {
    starts: 'Claude edits a test file (at most once a minute).',
    lasts: `${seconds(EVENT_MS.labcoat)}, once. He wears a white lab coat (with sleeves, a pocket and a pen) and holds a bubbling test tube up beside him; a green tick pops up.`,
    then: 'Back to Claude working.',
  },
  paint: {
    starts: 'Claude edits a stylesheet (at most once a minute).',
    lasts: `${seconds(EVENT_MS.paint)}, once. Palette in one hand and brush in the other, he paints three coloured stripes on a canvas on an easel.`,
    then: 'Back to Claude working.',
  },
  quill: {
    starts: 'Claude edits a Markdown or other docs file (at most once a minute).',
    lasts: `${seconds(EVENT_MS.quill)}, once. A big feather quill writes line after line on a sheet of paper on a stand.`,
    then: 'Back to Claude working.',
  },
  water: {
    starts: 'You send a message after two hours of steady work (no gap of 15 minutes or more); then again every two hours.',
    lasts: `${seconds(EVENT_MS.water)}, once. He sips from a water bottle, then has a big stretch with a "BREAK" bubble.`,
    then: 'Back to Claude working on your message.',
  },
  sandwich: {
    starts: 'Around lunch (11:30 to 1:30), it is the fidget in a quiet spell, 25 seconds after the last thing happened.',
    lasts: `${seconds(EVENT_MS.sandwich)}, once per quiet spell. He eats a sandwich in three big bites, crumbs falling, and looks very pleased.`,
    then: 'Back to calm, and then to sleep if it stays quiet.',
  },
  crossclaws: {
    starts: 'Claude starts a deploy on a Friday afternoon.',
    lasts: `${seconds(EVENT_MS.crossclaws)}, once. He holds up crossed claws, eyes darting and sweating, under a FRI calendar page.`,
    then: 'Back to Claude working.',
  },
  laugh: {
    starts: 'Your message laughs: lol, lmao, haha, rofl, or 😂 / 🤣.',
    lasts: `${seconds(EVENT_MS.laugh)}, once. He laughs so hard he tips over onto his side, legs kicking, with HAs popping up, then rocks back upright.`,
    then: 'Back to Claude working on your message.',
  },
  onfire: {
    starts: 'Your message has a 🔥 in it.',
    lasts: `${seconds(EVENT_MS.onfire)}, once. His feet catch fire and he hops about with his arms up, until the flames go out in a puff of smoke.`,
    then: 'Back to Claude working on your message.',
  },
  brb: {
    starts: 'Your message says brb, bbl or be right back.',
    lasts: `${seconds(EVENT_MS.brb)}, once. He flips up a little BRB sign on a stick and waggles it.`,
    then: 'Back to Claude working on your message.',
  },
  paperstack: {
    starts: 'You send a very long message (3,000 characters or more, like a pasted wall of text).',
    lasts: `${seconds(EVENT_MS.paperstack)}, once. A tall stack of paper drops into his arms and he wobbles under it, peeking round its sides.`,
    then: 'Back to Claude working on your message.',
  },
  bricks: {
    starts: 'Claude builds the app (npm run build, make, go build, Gradle, Xcode and the like).',
    lasts: `${seconds(EVENT_MS.bricks)}, once. He hammers bricks one by one into a little wall beside him, dust puffing on each hit.`,
    then: 'Back to Claude working.',
  },
  detective: {
    starts: 'Claude runs a security check (npm audit, pip-audit, Snyk, Semgrep, Gitleaks and the like).',
    lasts: `${seconds(EVENT_MS.detective)}, once. In a deerstalker hat he sweeps a flashlight beam around and finds a bug hiding on the floor.`,
    then: 'Back to Claude working.',
  },
  rug: {
    starts: 'Claude stashes changes with git stash.',
    lasts: `${seconds(EVENT_MS.rug)}, once. He sweeps three bits under a rug, the rug bulging more each time, then looks away whistling.`,
    then: 'Back to Claude working.',
  },
  signpost: {
    starts: 'Claude switches git branches (git switch, or git checkout of a branch).',
    lasts: `${seconds(EVENT_MS.signpost)}, once. He hops over to a MAIN / DEV signpost, looks from one arm to the other, scratches his head and picks one.`,
    then: 'Back to Claude working.',
  },
  checkall: {
    starts: 'Claude updates the to-do list and every item is ticked off.',
    lasts: `${seconds(EVENT_MS.checkall)}, once. He slams a rubber stamp down on his clipboard and a big green tick fills it.`,
    then: 'Back to Claude working.',
  },
  monday: {
    starts: 'Your first message on a Monday morning (5 to noon).',
    lasts: `${seconds(EVENT_MS.monday)}, once. He drags himself in from the left, droopy-eyed, a coffee in each hand, under a MON page, and sighs.`,
    then: 'Back to Claude working on your message.',
  },
  weekend: {
    starts: 'Your first message on a Saturday or Sunday.',
    lasts: `${seconds(EVENT_MS.weekend)}, once. He lounges in a striped beach chair in sunglasses, typing on a laptop on his lap, a cold drink beside him.`,
    then: 'Back to Claude working on your message.',
  },
  cube: {
    starts: 'Claude uses Unreal, the game engine.',
    lasts: `${seconds(EVENT_MS.cube)}, once. He holds a glowing 3D cube over his head, turning it, as a grid shimmers on the floor.`,
    then: 'Back to Claude working.',
  },
  chart: {
    starts: 'Claude draws a chart or diagram for you.',
    lasts: `${seconds(EVENT_MS.chart)}, once. Bars rise one by one on a whiteboard beside him while he points them out with a stick.`,
    then: 'Back to Claude working.',
  },
  kanban: {
    starts: 'Claude works on your kanban board (its script or its web page).',
    lasts: `${seconds(EVENT_MS.kanban)}, once. A board stands beside him; he slaps a new card onto to-do, then drags a card from doing over to done.`,
    then: 'Back to Claude working.',
  },
  pet: {
    starts: 'You press the little heart beside him (up to three times in a row).',
    lasts: `${seconds(EVENT_MS.pet)}, once. A big hand comes down from above and pats his head; he closes his eyes happily, blushes, and hearts float up.`,
    then: 'Back to whatever applies.',
  },
  grumpy: {
    starts: 'You press the heart a fourth time within eight seconds of the last pets.',
    lasts: `${seconds(EVENT_MS.grumpy)}, once. He scowls, steam puffs off his head, and he shakes the hand off.`,
    then: 'Back to whatever applies.',
  },
  bow: {
    starts: 'Claude apologizes at the end of its reply ("sorry", "my mistake").',
    lasts: `${seconds(EVENT_MS.bow)}, once. He bows low, eyes shut, hands together, with a bead of sweat.`,
    then: 'Back to whatever applies.',
  },
  party: {
    starts: 'Claude ends its reply with "all done", "it works" and the like.',
    lasts: `${seconds(EVENT_MS.party)}, once. He pops two party poppers over his head and confetti flies.`,
    then: 'Back to whatever applies.',
  },
  longscroll: {
    starts: 'Claude writes a very long reply (6,000 characters or more).',
    lasts: `${seconds(EVENT_MS.longscroll)}, once. He holds up a scroll that unrolls all the way to the floor and keeps rolling away.`,
    then: 'Back to whatever applies.',
  },
  knock: {
    starts: 'Claude Code pings you because it is waiting on you.',
    lasts: `${seconds(EVENT_MS.knock)}, once. He comes right up to the glass and knocks on the inside of your screen.`,
    then: 'Back to whatever applies.',
  },
  whale: {
    starts: 'Claude runs a Docker command.',
    lasts: `${seconds(EVENT_MS.whale)}, once. He rides a blue whale carrying shipping containers, its spout splashing.`,
    then: 'Back to whatever applies.',
  },
  snake: {
    starts: 'Claude runs Python (python, pip, pytest, uv run).',
    lasts: `${seconds(EVENT_MS.snake)}, once. A green snake rises beside him, sways and flicks its tongue, and he waves hello.`,
    then: 'Back to whatever applies.',
  },
  ferris: {
    starts: 'Claude runs Rust (cargo, rustc).',
    lasts: `${seconds(EVENT_MS.ferris)}, once. A tiny orange crab buddy scuttles in and waves its claws; he waves back.`,
    then: 'Back to whatever applies.',
  },
  erase: {
    starts: 'Claude makes an edit that takes out 15 or more lines.',
    lasts: `${seconds(EVENT_MS.erase)}, once. He scrubs a page of code with a giant pink eraser, line by line, crumbs flying.`,
    then: 'Back to whatever applies.',
  },
  hatch: {
    starts: 'Claude writes a file that did not exist before.',
    lasts: `${seconds(EVENT_MS.hatch)}, once. He holds an egg that wobbles and cracks, and a new page pops out with a sparkle.`,
    then: 'Back to whatever applies.',
  },
  puff: {
    starts: "Claude's reply is cut off for being too long.",
    lasts: `${seconds(EVENT_MS.puff)}, once. He is out of breath, hunched over, puffing.`,
    then: 'Back to whatever applies.',
  },
  wrench: {
    starts: 'You change a Claude Code setting.',
    lasts: `${seconds(EVENT_MS.wrench)}, once. He tightens a bolt in his own side with a wrench, a spark or two flying.`,
    then: 'Back to whatever applies.',
  },
  multiarm: {
    starts: 'Claude starts three or more tools in one go.',
    lasts: `${seconds(EVENT_MS.multiarm)}, once. Extra arms sprout all around him, each busy with something different.`,
    then: 'Back to whatever applies.',
  },
  boxin: {
    starts: 'A folder is added to the session (/add-dir).',
    lasts: `${seconds(EVENT_MS.boxin)}, once. He carries a box in, sets it down, and dusts off his hands.`,
    then: 'Back to whatever applies.',
  },
  sweep: {
    starts: 'A worktree is removed.',
    lasts: `${seconds(EVENT_MS.sweep)}, once. He sweeps with a broom, dust and bits swept away.`,
    then: 'Back to whatever applies.',
  },
  gears: {
    starts: `Claude has been thinking for ${seconds(GEARS_MS)} without writing or doing anything yet.`,
    lasts: 'Until Claude starts writing or using a tool. Two gears turn over his head and his head glows.',
    then: 'Back to Claude working, once it starts writing or using a tool.',
  },
  present: {
    starts: 'Claude sends you a file (like a report or a picture) or publishes a page for you.',
    lasts: `${seconds(EVENT_MS.present)}, once. He pulls out a document tied with a coral bow and holds it out to you, with a sparkle.`,
    then: 'Back to Claude working.',
  },
  send: {
    starts: 'This session sends a message to another Claude session.',
    lasts: `${seconds(EVENT_MS.send)}, once. He opens a laptop and video-calls another Clawd (a blue one); sound waves come from him as he talks.`,
    then: 'Back to Claude working.',
  },
  receive: {
    starts: 'Another Claude session sends this one a message.',
    lasts: `${seconds(EVENT_MS.receive)}, once. He opens a laptop and the blue Clawd on the screen waves and talks while he listens.`,
    then: 'Back to whatever applies; Claude usually starts reading it.',
  },
}
