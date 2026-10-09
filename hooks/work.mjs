// Reading what a finished command did, for his reactions: tests passing or failing, a commit, a push.
// Pure code, so plain node can test it.

// Commands that run a test suite, in the common tools
const TEST_COMMAND = /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|node\s+--test\b|pytest\b|jest\b|vitest\b|cargo\s+test\b|go\s+test\b|mocha\b|rspec\b|phpunit\b|swift\s+test\b|deno\s+test\b|make\s+test\b|playwright\s+test\b|dotnet\s+test\b|gradlew?\s+test\b|mvn\s+test\b)/
// What a failing run prints, across those tools ("0 failed" does not count)
const TEST_FAILED = /\b[1-9]\d* (?:failed|failing|failures?)\b|^FAIL\b|ℹ fail [1-9]|^not ok\b|\bFAILED\b/m
const PULL_REQUEST = /\bgh\s+pr\s+create\b/
const INSTALL = /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add|ci)\b|\bpip3?\s+install\b|\bbrew\s+install\b|\bcargo\s+(?:add|install)\b|\bgo\s+(?:get|install)\b|\bgem\s+install\b|\bcomposer\s+(?:require|install)\b|\bpoetry\s+(?:add|install)\b|\buv\s+(?:add|sync|pip\s+install)\b/
// Commands worth being nervous about: deleting things for good, rewriting history, running as the superuser
const RISKY = /\brm\s+-[a-zA-Z]*(?:rf|fr)\b|\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+-[a-zA-Z]*f|\bgit\s+push\b[^|;&\n]*(?:--force\b|--force-with-lease\b|\s-f\b)|\bsudo\b|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-[a-zA-Z]*f|\bdrop\s+(?:table|database)\b|\bmkfs\b|\bdd\s+if=/i
// Searching the code from the command line
const CODE_SEARCH = /^\s*(?:grep|rg|ag|ack|find|fd)\b|\|\s*(?:grep|rg)\b/
const GIT_COMMIT = /\bgit\b[^|;&\n]*\scommit\b/
const GIT_PUSH = /\bgit\b[^|;&\n]*\spush\b/
const FORCE_PUSH = /\bgit\s+push\b[^|;&\n]*(?:--force\b|--force-with-lease\b|\s-f\b)/
// What git prints when a merge, rebase, pull or cherry-pick hits a conflict
const MERGE_CONFLICT = /^CONFLICT \(|Automatic merge failed|could not apply [0-9a-f]{7}/m
// Sending the app out to a host: the common deploy tools, or a "deploy" script
const DEPLOY = /\b(?:vercel\s+(?:deploy|--prod)|netlify\s+deploy|fly(?:ctl)?\s+deploy|railway\s+up|wrangler\s+(?:deploy|publish|pages\s+deploy)|firebase\s+deploy|git\s+push\s+heroku|kubectl\s+(?:apply|rollout)|helm\s+(?:install|upgrade)|terraform\s+apply|(?:serverless|sls|cdk|sam|eb)\s+deploy|gcloud\s+(?:app|run|functions)\s+deploy|amplify\s+publish)\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?deploy\b/
// Friday from noon on, when a deploy is a gamble
export const isFridayAfternoon = (date) => date.getDay() === 5 && date.getHours() >= 12

export const isTestCommand = (command) => TEST_COMMAND.test(String(command ?? ''))

// The printed output of a finished Bash call, whatever shape it came back in
function outputOf(result) {
  const inner = result?.result
  if (typeof inner === 'string') return inner
  return [inner?.stdout, inner?.stderr].filter((part) => typeof part === 'string').join('\n')
}

// The reaction a finished Bash call earns: arm-wrestling for a merge conflict, 'facepalm' for failing tests, a parachute
// crate for a deploy, 'rocket' for a push, 'ship' for a commit, 'cheer' for passing tests, or null
export function commandReaction(command, result) {
  if (!result || 'deny' in result) return null
  const text = String(command ?? '')
  const failed = result.isError === true
  if (/\bgit\b/.test(text) && MERGE_CONFLICT.test(outputOf(result))) return 'armwrestle'
  const testsFailed = isTestCommand(text) && (failed || TEST_FAILED.test(outputOf(result)))
  // Failing tests matter most; otherwise a git step in the same command (tests, then commit and push) beats the cheer
  if (testsFailed) return 'facepalm'
  if (failed) return null
  if (PULL_REQUEST.test(text)) return 'mail'
  if (DEPLOY.test(text)) return 'parachute'
  if (GIT_PUSH.test(text)) return 'rocket'
  if (GIT_COMMIT.test(text)) return 'ship'
  if (isTestCommand(text)) return 'cheer'
  if (INSTALL.test(text)) return 'unbox'
  return null
}

// The reaction a Bash call earns as it starts: the red button for a force push, crossed claws for a Friday afternoon
// deploy, nerves for another risky one, the magnifying glass for a code search, or null
export function startReaction(command, now = new Date()) {
  const text = String(command ?? '')
  if (FORCE_PUSH.test(text)) return 'redbutton'
  if (DEPLOY.test(text) && isFridayAfternoon(now)) return 'crossclaws'
  if (RISKY.test(text)) return 'risky'
  if (CODE_SEARCH.test(text)) return 'magnify'
  return null
}

// Claude's built-in tools that get a look of their own as they start
const TOOL_LOOKS = { WebSearch: 'satellite', Skill: 'spellbook', ToolSearch: 'toolbox', Monitor: 'binoculars', TodoWrite: 'todo', TaskCreate: 'todo', TaskUpdate: 'todo', ScheduleWakeup: 'alarm', CronCreate: 'alarm' }
const PICTURE_FILE = /\.(?:png|jpe?g|gif|webp|bmp|heic|svg|tiff?)$/i
// Desktop-app plumbing and the terminal: these are Claude Code itself, not an app you connected
const NOT_AN_APP = /^mcp__(?:ccd_|terminal__|visualize__read_me)/
const BROWSER_APP = /^mcp__(?:Claude_Browser|claude-in-chrome|playwright|chrome-devtools)__/
// Browser calls that click, type or drag (he rides the pointer); the rest open or read pages (the browser window)
const POINTER_CALL = /__(?:form_input|click|fill|fill_form|type_text|press_key|drag|drop|hover|browser_(?:click|type|press_key|drag|drop|hover|fill_form|select_option))$/
const POINTER_ACTION = /click|type|key|drag|scroll|hover/
const KANBAN = /kanban/i
const DOCKER = /\b(?:docker|docker-compose|podman)\b/
const PYTHON = /\b(?:python3?|pip3?|pytest|uv\s+run|poetry\s+run)\b/
const RUST = /\b(?:cargo|rustc|rustup)\b/
const SECURITY_CHECK = /\b(?:(?:npm|pnpm|yarn|bun)\s+audit|pip-audit|cargo\s+audit|snyk|trivy|semgrep|bandit|gitleaks|trufflehog|osv-scanner|safety\s+check)\b/
const GIT_STASH = /\bgit\s+stash\b(?!\s+(?:list|show|pop|apply|drop|clear))/
const GIT_BRANCH_SWITCH = /\bgit\s+(?:switch\b|checkout\s+(?!--)(?:-b\s+)?[\w./-]+\s*(?:$|[;&|]))/
const BUILD = /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?build|make(?!\s+test)(?:\s+[\w-]+)?\s*(?:$|[;&|])|go\s+build|vite\s+build|next\s+build|webpack\b|gradlew?\s+(?:build|assemble)|xcodebuild\b|swift\s+build|dotnet\s+build|mvn\s+(?:package|install|compile))/
// Deleting, moving or renaming, downloading, and undoing (a forced, recursive delete is the risky look instead)
const DELETE_FILES = /(?:^|[;&|]\s*)(?:git\s+rm|rm|trash|unlink)(?![^;&|\n]*\s-[a-zA-Z]*r)\s/
const MOVE_FILES = /(?:^|[;&|]\s*)(?:git\s+)?mv\s/
const DOWNLOAD = /\b(?:curl|wget)\b/
const UNDO = /\bgit\s+(?:restore|revert|checkout\s+--\s|reset\s+(?!--hard)\S)/
const LINT = /\b(?:prettier|eslint|biome|stylelint|ruff|isort|flake8|pylint|gofmt|goimports|golangci-lint|rustfmt|rubocop|swiftlint|swiftformat|ktlint|clang-format)\b|\bcargo\s+(?:fmt|clippy)\b|\bgo\s+(?:fmt|vet)\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:lint|format|fmt)\b/
const DATABASE = /\b(?:psql|mysql|sqlite3|mongosh|redis-cli|pg_dump|pg_restore|mysqldump|drizzle-kit|alembic|flyway|liquibase)\b|\bprisma\s+(?:migrate|db|studio)\b|\bsupabase\s+(?:db|migration)\b|\brails\s+db:|\bmanage\.py\s+(?:migrate|makemigrations|dbshell)\b/
// The kind of file an edit is to: tests, styles, or docs
const TEST_FILE = /\.(?:test|spec)\.\w+$|_test\.\w+$|(?:^|\/)test_\w+\.py$|(?:^|\/)(?:tests?|__tests__|spec)\//
const STYLE_FILE = /\.(?:css|scss|sass|less|styl|pcss)$/i
const DOC_FILE = /\.(?:md|mdx|rst|adoc)$/i
export function fileLook(path) {
  const file = String(path ?? '')
  if (TEST_FILE.test(file)) return 'labcoat'
  if (STYLE_FILE.test(file)) return 'paint'
  if (DOC_FILE.test(file)) return 'quill'
  return null
}
// An edit that takes out at least this many more lines than it puts in
const BIG_DELETE_LINES = 15
const linesIn = (text) => String(text ?? '').split('\n').length
const removedLines = (input) => (Array.isArray(input?.edits) ? input.edits : [input]).reduce((sum, edit) => sum + Math.max(0, linesIn(edit?.old_string) - linesIn(edit?.new_string)), 0)
// Connected apps, by the app's name where it shows, or by what the call does when the app only has an ID for a name
// (Gmail, Google Calendar and Google Drive connected through claude.ai)
const APP_LOOKS = [
  [/^mcp__blender__/, 'sculpt'],
  [/^mcp__davinci-resolve__/, 'clapper'],
  [/^mcp__(?:firecrawl|ScraplingServer)__/i, 'netcatch'],
  [/^mcp__Claude_Code_iOS_Simulator__/, 'apptest'],
  [/^mcp__plugin_pdf-viewer/, 'highlight'],
  [/^mcp__unreal__/i, 'cube'],
  [/^mcp__[\w-]*(?:postgres|supabase|sqlite|mysql|mongo|neon|planetscale|redis|database)[\w-]*__/i, 'dig'],
  // Unity MCP servers go by unityMCP, mcp-unity, mcpforunity and the like (but not "community")
  [/^mcp__(?:[\w-]*[-_]|mcpfor)?unity[\w-]*__/i, 'unity'],
  [/^mcp__scheduled-tasks__/, 'alarm'],
  [/__show_widget$/, 'chart'],
  [/__(?:get_component|search_logo|search_picker|get_inspiration|submit_component|edit_component|list_team_components|get_theme)$/, 'blocks'],
  [/__(?:search_threads|get_thread|get_message|send_message|reply|forward|(?:create|update|get|delete)_draft|list_drafts|\w*label\w*|\w*spam|(?:un)?trash_(?:message|thread))$/, 'inbox'],
  [/__(?:list_events|search_events|(?:get|create|update|delete)_event|respond_to_event|suggest_time|list_calendars)$/, 'planner'],
  [/__(?:search_files|list_recent_files|read_file_content|download_file_content|get_file_(?:metadata|permissions)|(?:create|update|copy|share|trash)_file)$/, 'cabinet'],
]

// The kanban board when the page is the board, riding the pointer for clicks and typing, the browser window for opening and reading
function browserLook(name, input) {
  // A batch of browser steps counts as each of its steps
  const steps = Array.isArray(input?.actions) ? input.actions.map((step) => [`__${step?.name ?? ''}`, step?.input]) : [[name, input]]
  if (steps.some(([, args]) => KANBAN.test(String(args?.url ?? '')))) return 'kanban'
  const isClick = ([call, args]) => POINTER_CALL.test(call) || (/computer$/.test(call) && POINTER_ACTION.test(String(args?.action ?? '')))
  return steps.some(isClick) ? 'mouseride' : 'browser'
}


// The look a tool call earns as it starts, or null
export function toolReaction(tool, input) {
  const name = String(tool ?? '')
  if (name === 'Bash') {
    const command = String(input?.command ?? '')
    if (KANBAN.test(command)) return 'kanban'
    if (UNDO.test(command)) return 'rewind'
    if (DOWNLOAD.test(command)) return 'download'
    if (DELETE_FILES.test(command)) return 'shredder'
    if (MOVE_FILES.test(command)) return 'relabel'
    if (LINT.test(command)) return 'comb'
    if (DATABASE.test(command)) return 'dig'
    if (DOCKER.test(command)) return 'whale'
    if (RUST.test(command)) return 'ferris'
    if (PYTHON.test(command)) return 'snake'
    if (SECURITY_CHECK.test(command)) return 'detective'
    if (GIT_STASH.test(command)) return 'rug'
    if (GIT_BRANCH_SWITCH.test(command)) return 'signpost'
    if (BUILD.test(command)) return 'bricks'
    return null
  }
  if ((name === 'Edit' || name === 'MultiEdit') && removedLines(input) >= BIG_DELETE_LINES) return 'erase'
  if (name === 'Edit' || name === 'MultiEdit' || name === 'Write') return fileLook(input?.file_path)
  if (name === 'Read') return PICTURE_FILE.test(String(input?.file_path ?? '')) ? 'photo' : 'readfile'
  // The to-do list with every item ticked off gets the big stamp
  if (name === 'TodoWrite' && Array.isArray(input?.todos) && input.todos.length > 0 && input.todos.every((item) => item?.status === 'completed')) return 'checkall'
  if (TOOL_LOOKS[name]) return TOOL_LOOKS[name]
  if (!name.startsWith('mcp__') || NOT_AN_APP.test(name)) return null
  if (BROWSER_APP.test(name)) return browserLook(name, input)
  return APP_LOOKS.find(([pattern]) => pattern.test(name))?.[1] ?? 'plugin'
}

const THANKS = /\b(?:thanks|thank\s*you|thx|ty|tysm|ily|love\s+(?:you|it|this)|you'?re\s+(?:the\s+best|awesome|amazing)|good\s+(?:job|bot|work)|nice\s+(?:job|work|one)|great\s+(?:job|work)|well\s+done|perfect)\b/i
const FRUSTRATED = /\b(?:wtf|wth|ffs|fml|ugh+|dammit|damn|bro|bruh|smh|broken|still\s+(?:not|doesn'?t|broken)|why\s+(?:is|isn'?t|won'?t|doesn'?t|did)|what\s+the)\b|[!?]{3,}/i

// A greeting anywhere in the message, or a short one ("gm", "morning", "gn", "night") to start it
const GOOD_MORNING = /\bgood\s*morning\b|^\W*(?:gm|g'?morning|mornin'?g?)\b/i
const GOOD_NIGHT = /\bgood\s*night\b|\bnighty?[\s-]*night\b|^\W*(?:gn|g'?night|nite|night)\b(?!\s*(?:mode|theme|time|shift|light|sky|vision))/i

// A quick okay: the whole message is "k", "ok", "y", "yes", "sure", "go" or a 👍
const QUICK_OK = /^\s*(?:k+|kk|ok(?:ay)?|okie|y|ya|yes|yep|yup|sure|go|go ahead|do it|sounds good|👍)\s*[.!]*\s*$/iu
// You own up to a slip
const YOUR_SLIP = /\b(?:oops|whoops|my bad|my mistake|my fault)\b/i
// Wondering how or why something works (a frustrated "why is this broken" is the nerves instead)
const WONDER = /^\W*(?:why|how (?:does|do|did|come|would|can|is))\b/i
const LAUGH = /\b(?:lo+l(?:o*l)*|lmf?ao+|rofl|ha(?:ha)+h?|he(?:he)+)\b|😂|🤣/i
const BRB = /\b(?:brb|bbl|be right back|back in (?:a )?(?:bit|sec|min(?:ute)?|few))\b/i
const FIRE = /🔥/u
const PARTY = /🎉|🥳/u
const HEART = /❤|♥|😍|🥰|💕|💖/u
// A message this long is a pasted wall of text
export const LONG_PASTE_CHARS = 3_000

const MOG = /\b(?:mog|mogs|mogg?ing|mogged|looksmax\w*|mewing|sigma)\b/i

// The reaction a message you send earns from its words: a paper stack for a wall of text, mogging for mogging, a wave for good
// morning or good night, a sign for brb, a laugh for lol, flames, confetti or a heart for those emoji, a blush for thanks, a flinch for shouting, nerves for frustration, or null
export function messageReaction(text) {
  const words = String(text ?? '')
  const letters = words.replace(/[^A-Za-z]/g, '')
  const isShouting = letters.length >= 8 && letters.replace(/[^A-Z]/g, '').length / letters.length >= 0.7
  if (words.length >= LONG_PASTE_CHARS) return 'paperstack'
  if (QUICK_OK.test(words)) return 'thumbsup'
  if (MOG.test(words)) return 'mog'
  if (GOOD_MORNING.test(words)) return 'goodmorning'
  if (GOOD_NIGHT.test(words)) return 'goodnight'
  if (BRB.test(words)) return 'brb'
  if (LAUGH.test(words)) return 'laugh'
  if (FIRE.test(words)) return 'onfire'
  if (PARTY.test(words)) return 'party'
  if (HEART.test(words)) return 'blush'
  if (YOUR_SLIP.test(words)) return 'comfort'
  if (THANKS.test(words) && !isShouting) return 'blush'
  if (isShouting) return 'flinch'
  if (FRUSTRATED.test(words)) return 'nervous'
  if (WONDER.test(words)) return 'wonder'
  return null
}

// What an attached item earns: the giant ear for audio, the camera for a picture or a document
export function attachmentReaction(attachments) {
  const kinds = (attachments ?? []).map((a) => a?.type)
  if (kinds.includes('audio')) return 'listen'
  if (kinds.length > 0) return 'camera'
  return null
}

// Late at night: from 1 to 5 in the morning
export const isLateNight = (hour) => hour >= 1 && hour < 5
// A Read that brought back a giant file: this many lines in the file, or this much text
export const GIANT_FILE_LINES = 1_500
const GIANT_FILE_CHARS = 60_000
export function isGiantRead(result) {
  if (!result || 'deny' in result || result.isError) return false
  const file = result.result?.file ?? result.result
  const lines = Number(file?.totalLines ?? file?.numLines ?? 0)
  return lines >= GIANT_FILE_LINES || outputOf(result).length >= GIANT_FILE_CHARS || String(file?.content ?? '').length >= GIANT_FILE_CHARS
}
// This many tool calls in one reply earns a drenching
export const LONG_TOOL_RUN = 25
// Messages in a day that earn a medal
export const DAY_MEDAL_AT = 100
// A gap this long since anything happened counts as being away; and the session ages that earn a cake: an hour, then every two
export const AWAY_MS = 60 * 60 * 1000
export const nextCakeAt = (cakes) => (1 + cakes * 2) * 60 * 60 * 1000

// Monday from 5 in the morning to noon, and the weekend
export const isMondayMorning = (date) => date.getDay() === 1 && date.getHours() >= 5 && date.getHours() < 12
export const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6
// Claude has been at one reply this long when he starts tapping his foot
export const LONG_TURN_MS = 120_000

// Message counts that earn a trophy
export const MILESTONES = new Set([100, 500, 1000, 2500, 5000, 10000])
// What he does now and then in a quiet spell
export const FIDGETS = ['yoyo', 'juggle', 'stretch', 'phone', 'coffee', 'game', 'gum', 'music', 'readbook', 'mog']
// Around lunch (11:30 to 1:30) the quiet-spell fidget is a sandwich; otherwise any of the fidgets
export const isLunchtime = (date) => { const minutes = date.getHours() * 60 + date.getMinutes(); return minutes >= 690 && minutes < 810 }
export const pickFidget = (date, rand = Math.random) => (isLunchtime(date) ? 'sandwich' : FIDGETS[Math.floor(rand() * FIDGETS.length)])
// Two hours of steady work earns a reminder to take a break; a gap this long counts as having had one
export const BREAK_REMINDER_MS = 2 * 60 * 60 * 1000
export const BREAK_GAP_MS = 15 * 60 * 1000

// What Claude's finished reply earns (text: its last part; length: all of it): a bow for an apology, party poppers for "all done", a long scroll for a very long answer, or null
const APOLOGY = /\b(?:sorry|apologi[sz]e|my (?:bad|mistake)|i was wrong)\b/i
const CELEBRATION = /\b(?:all (?:done|set)|it works|that worked|shipped|we did it)\b|🎉/i
export const LONG_REPLY_CHARS = 6_000
export function replyReaction(text, length = String(text ?? '').length) {
  const reply = String(text ?? '')
  if (APOLOGY.test(reply)) return 'bow'
  if (CELEBRATION.test(reply)) return 'party'
  if (length >= LONG_REPLY_CHARS) return 'longscroll'
  return null
}
