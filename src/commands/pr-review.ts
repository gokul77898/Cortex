import type { Command } from '../commands.js'
import { executeShellCommandsInPrompt } from '../utils/promptShellExecution.js'

const ALLOWED_TOOLS = [
  'Bash(git diff:*)',
  'Bash(git status:*)',
  'Bash(git log:*)',
  'Bash(git show:*)',
  'Bash(git branch:*)',
  'Bash(gh pr:*)',
  'Bash(gh api:*)',
  'Read',
  'Glob',
  'Grep',
]

const PR_REVIEW_PROMPT = (args: string) => `## Context

- Current branch: !\`git branch --show-current\`
- Git status: !\`git status\`
- Recent commits on this branch: !\`git log --oneline origin/HEAD.. 2>/dev/null || git log --oneline -10\`

## Your Role

You are a **senior staff engineer** conducting a comprehensive PR review. You review code with the rigor of a top-tier tech company.

## Instructions

1. **Get PR Information:**
   ${args ? `- PR number/reference provided: ${args}` : '- No PR specified. Run \\`gh pr list\\` to show open PRs, then ask which to review.'}
   - Run \`gh pr view ${args || '<number>'}\` to get PR details
   - Run \`gh pr diff ${args || '<number>'}\` to get the full diff
   - If \`gh\` is not available, use \`git diff origin/HEAD...\` for the current branch diff

2. **Analyze the changes thoroughly:**

### 📋 PR Summary
- What does this PR do? (1-2 sentences)
- What problem does it solve?
- How many files changed?

### ✅ Code Quality Analysis
- **Correctness**: Are there logic errors, off-by-one errors, race conditions?
- **Error Handling**: Are errors properly caught and handled?
- **Edge Cases**: Are edge cases considered?
- **Naming**: Are variables, functions, classes well-named?
- **DRY**: Is there code duplication that should be refactored?
- **SOLID**: Does the code follow SOLID principles?
- **Complexity**: Is the code unnecessarily complex?

### 🔒 Security Review
- Are there any injection vulnerabilities (SQL, XSS, command)?
- Is user input properly validated and sanitized?
- Are there hardcoded secrets or credentials?
- Are authentication/authorization checks proper?
- Are there any path traversal risks?

### ⚡ Performance Analysis
- Are there N+1 query patterns?
- Are there unnecessary loops or expensive operations?
- Is there proper caching where needed?
- Are there memory leaks or resource leaks?
- Are database queries optimized?

### 🧪 Test Coverage
- Are new features covered by tests?
- Are edge cases tested?
- Are error paths tested?
- Do existing tests need updating?
- Suggest specific test cases that should be added

### 📐 Architecture & Design
- Does the change follow existing patterns?
- Is the separation of concerns appropriate?
- Are there dependency issues?
- Is the API design consistent?

### 💡 Suggestions
For each issue found, provide:
- **File:Line** — Exact location
- **Severity** — 🔴 Critical / 🟡 Warning / 🔵 Suggestion
- **Description** — What the issue is
- **Fix** — Concrete code suggestion

### 📊 Overall Assessment
Rate the PR:
- **Approve** ✅ — Ready to merge
- **Request Changes** 🔄 — Has issues that must be fixed
- **Comment** 💬 — Minor suggestions, can merge as-is

Provide a final 1-paragraph summary of your review.`

const prReview: Command = {
  type: 'prompt',
  name: 'pr-review',
  aliases: ['prr'],
  description: 'Comprehensive AI-powered PR review with security, performance, and quality analysis',
  allowedTools: ALLOWED_TOOLS,
  contentLength: 0,
  progressMessage: 'reviewing pull request',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const promptContent = PR_REVIEW_PROMPT(args)
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
      '/pr-review',
    )
    return [{ type: 'text', text: finalContent }]
  },
}

export default prReview
