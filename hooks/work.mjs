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

export const isTestCommand = (command) => TEST_COMMAND.test(String(command ?? ''))

// The printed output of a finished Bash call, whatever shape it came back in
function outputOf(result) {
  const inner = result?.result
  if (typeof inner === 'string') return inner
  return [inner?.stdout, inner?.stderr].filter((part) => typeof part === 'string').join('\n')
}

// The reaction a finished Bash call earns: 'cheer' or 'facepalm' for tests, 'rocket' for a push, 'ship' for a commit, or null
export function commandReaction(command, result) {
  if (!result || 'deny' in result) return null
  const text = String(command ?? '')
  const failed = result.isError === true
  if (isTestCommand(text)) return failed || TEST_FAILED.test(outputOf(result)) ? 'facepalm' : 'cheer'
  if (failed) return null
  if (PULL_REQUEST.test(text)) return 'mail'
  if (GIT_PUSH.test(text)) return 'rocket'
  if (GIT_COMMIT.test(text)) return 'ship'
  if (INSTALL.test(text)) return 'unbox'
  return null
}

// The reaction a Bash call earns as it starts: nerves for a risky one, the magnifying glass for a code search, or null
export function startReaction(command) {
  const text = String(command ?? '')
  if (RISKY.test(text)) return 'risky'
  if (CODE_SEARCH.test(text)) return 'magnify'
  return null
}

const THANKS = /\b(?:thanks|thank\s*you|thx|ty|tysm|ily|love\s+(?:you|it|this)|you'?re\s+(?:the\s+best|awesome|amazing)|good\s+(?:job|bot|work)|nice\s+(?:job|work|one)|great\s+(?:job|work)|well\s+done|perfect)\b/i
const FRUSTRATED = /\b(?:wtf|wth|ffs|fml|ugh+|dammit|damn|bro|bruh|smh|broken|still\s+(?:not|doesn'?t|broken)|why\s+(?:is|isn'?t|won'?t|doesn'?t|did)|what\s+the)\b|[!?]{3,}/i

// The reaction a message you send earns from its words: a blush for thanks, a flinch for shouting, nerves for frustration, or null
export function messageReaction(text) {
  const words = String(text ?? '')
  const letters = words.replace(/[^A-Za-z]/g, '')
  const isShouting = letters.length >= 8 && letters.replace(/[^A-Z]/g, '').length / letters.length >= 0.7
  if (THANKS.test(words) && !isShouting) return 'blush'
  if (isShouting) return 'flinch'
  if (FRUSTRATED.test(words)) return 'nervous'
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
// Claude has been at one reply this long when he starts tapping his foot
export const LONG_TURN_MS = 120_000

// Message counts that earn a trophy
export const MILESTONES = new Set([100, 500, 1000, 2500, 5000, 10000])
// What he does now and then in a quiet spell
export const FIDGETS = ['yoyo', 'juggle', 'stretch', 'phone', 'coffee', 'game', 'gum', 'music', 'readbook']
