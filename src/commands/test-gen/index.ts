import type { Command } from '../../commands.js'
import { executeShellCommandsInPrompt } from '../../utils/promptShellExecution.js'

const ALLOWED_TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
]

const TEST_PROMPT = (args: string) => {
  const subcommand = args.split(' ')[0] || 'help'
  const rest = args.split(' ').slice(1).join(' ')

  const prompts: Record<string, string> = {
    generate: `## Test Generation Engine

You are an expert test engineer who writes thorough, maintainable tests.

### Project Analysis:
- Test framework: !\`cat package.json 2>/dev/null | grep -E "(jest|vitest|mocha|bun|ava|tap|playwright|cypress)" || echo "Check package.json"\`
- Existing test files: !\`find . -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" 2>/dev/null | head -15\`
- Test config: !\`ls jest.config* vitest.config* .mocharc* playwright.config* cypress.config* 2>/dev/null || echo "No config found"\`
- Source structure: !\`find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | head -20\`

### Instructions:
${rest ? `Generate tests for: **${rest}**` : 'Analyze the project and generate tests for uncovered files.'}

1. **Detect the testing framework** from config and dependencies
2. **Read the source file(s)** to understand the code
3. **Generate comprehensive tests** including:

#### Unit Tests:
- Test each exported function/class/component
- Test happy path with valid inputs
- Test edge cases (empty, null, undefined, boundary values)
- Test error paths (invalid input, exceptions, timeouts)
- Test return types and shapes

#### Integration Tests (if applicable):
- Test function interactions
- Test API endpoints end-to-end
- Test database operations with test fixtures
- Test middleware chains

#### Test Quality Rules:
- Use descriptive test names: \`it('should return 404 when user not found')\`
- Follow AAA pattern: Arrange, Act, Assert
- One assertion concept per test
- Use proper mocking (jest.mock/vi.mock) for external dependencies
- Add beforeEach/afterEach for setup/teardown
- Use factories or fixtures for test data, not hardcoded values
- Test both sync and async paths
- Include TypeScript types in test files

4. **Create the test file** next to the source file (e.g., \`foo.ts\` → \`foo.test.ts\`)
5. **Verify the test runs** with the project's test runner

### Output Format:
- Create the test file with all tests
- Show a summary of what was tested
- List any dependencies that need mocking`,

    run: `## Test Runner & Analyzer

### Project Context:
- Test config: !\`ls jest.config* vitest.config* .mocharc* bun.lockb 2>/dev/null\`
- Test scripts: !\`cat package.json 2>/dev/null | grep -A5 '"test"' || echo "No test script"\`

### Instructions:
1. Detect the test runner (jest, vitest, bun test, mocha, etc.)
2. Run the tests: ${rest ? `Only run tests matching: **${rest}**` : 'Run the full test suite'}
3. Analyze the output:
   - Total tests: passed / failed / skipped
   - Failed test details with root cause analysis
   - Performance: slow tests (>1s) flagged
   - Coverage summary if available

4. For each **failed test**, provide:
   - **Test name** and file location
   - **Expected vs Actual** output
   - **Root cause** analysis
   - **Suggested fix** (code change)

5. Provide a test health summary:
   - 🟢 Pass rate
   - 🔴 Failures with fixes
   - 🟡 Slow tests to optimize
   - 📊 Coverage gaps`,

    fix: `## Test Fixer

### Instructions:
1. Run the test suite to find failures:
   !\`npm test 2>&1 | tail -50 || bun test 2>&1 | tail -50\`

2. For each failing test:
   a. Read the test file and the source file it tests
   b. Determine if the failure is in:
      - The **test** (outdated assertion, wrong mock, stale snapshot)
      - The **source code** (actual bug)
   c. Fix the appropriate file

3. **Test fixes take priority** — if the source code changed and tests didn't update:
   - Update test assertions to match new behavior
   - Update mocks to match new interfaces
   - Update snapshots if UI changed intentionally

4. **Source fixes** — if the test correctly catches a bug:
   - Fix the bug in the source code
   - Verify the fix doesn't break other tests

5. Re-run tests to confirm all pass

${rest ? `Focus on fixing: **${rest}**` : 'Fix all failing tests'}

### Rules:
- Never delete a test to make the suite pass
- Never weaken assertions (e.g., changing toBe to toBeTruthy)
- If unsure whether test or source is wrong, explain both possibilities`,

    coverage: `## Test Coverage Analyzer

### Instructions:
1. Run coverage analysis:
   - Try: \`npx jest --coverage\` or \`npx vitest --coverage\` or \`bun test --coverage\`

2. Analyze uncovered code:
   - Files with <80% coverage → flag as 🔴
   - Files with 80-90% coverage → flag as 🟡
   - Files with >90% coverage → flag as 🟢

3. For each uncovered area, identify:
   - What code paths are missed
   - What test cases would cover them
   - Priority based on code criticality

4. Generate a coverage improvement plan:
   - Quick wins (easy tests that cover many lines)
   - Critical paths (business logic without tests)
   - Edge cases (error handlers, validators)

5. Create test files to improve coverage for the worst offenders

${rest ? `Focus on: **${rest}**` : 'Analyze overall coverage and improve worst files'}`,

    help: `## Test Commands

Available test subcommands:

- \`/test generate <file or description>\` — Generate comprehensive tests for a file or feature
- \`/test run [pattern]\` — Run tests, analyze results, explain failures
- \`/test fix [pattern]\` — Automatically fix failing tests
- \`/test coverage [file]\` — Analyze test coverage and generate missing tests

Examples:
  /test generate src/utils/auth.ts
  /test generate all API endpoints
  /test run
  /test run user.test.ts
  /test fix
  /test coverage src/services/

Supported frameworks: Jest, Vitest, Bun Test, Mocha, Playwright, Cypress

Please specify a subcommand.`,
  }

  return prompts[subcommand] || prompts['help']!
}

const testGen: Command = {
  type: 'prompt',
  name: 'test',
  aliases: ['tests', 'test-gen'],
  description: 'Testing tools: generate tests, run & analyze, fix failures, coverage analysis',
  allowedTools: ALLOWED_TOOLS,
  contentLength: 0,
  progressMessage: 'working on tests',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const promptContent = TEST_PROMPT(args)
    const finalContent = await executeShellCommandsInPrompt(
      promptContent,
      {
        ...context,
        getAppState() {
          const appState = context.getAppState()
          return {
            ...appState,
            toolPermissionContext: {
              ...appState.toolPermissionContext,
              alwaysAllowRules: {
                ...appState.toolPermissionContext.alwaysAllowRules,
                command: ALLOWED_TOOLS,
              },
            },
          }
        },
      },
      '/test',
    )
    return [{ type: 'text', text: finalContent }]
  },
}

export default testGen
