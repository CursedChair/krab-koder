// Reading what a finished command did, for his reactions: tests passing or failing, a commit, a push.
// Pure code, so plain node can test it.

// Commands that run a test suite, in the common tools
const TEST_COMMAND = /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|node\s+--test\b|pytest\b|jest\b|vitest\b|cargo\s+test\b|go\s+test\b|mocha\b|rspec\b|phpunit\b|swift\s+test\b|deno\s+test\b|make\s+test\b|playwright\s+test\b|dotnet\s+test\b|gradlew?\s+test\b|mvn\s+test\b)/
// What a failing run prints, across those tools ("0 failed" does not count)
const TEST_FAILED = /\b[1-9]\d* (?:failed|failing|failures?)\b|^FAIL\b|ℹ fail [1-9]|^not ok\b|\bFAILED\b/m
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
  if (GIT_PUSH.test(text)) return 'rocket'
  if (GIT_COMMIT.test(text)) return 'ship'
  return null
}

// Message counts that earn a trophy
export const MILESTONES = new Set([100, 500, 1000, 2500, 5000, 10000])
// What he does now and then in a quiet spell
export const FIDGETS = ['yoyo', 'juggle', 'stretch']
