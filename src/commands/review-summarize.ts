import { GIT_READ_TOOLS, makeTierCommand, READ_ONLY_TOOLS, SHELL_TOOLS } from './_tierHelper.js'

export default makeTierCommand({
  name: 'review-summarize',
  aliases: ['rs', 'pr-summary', 'review-summary'],
  description: 'Produce a structured AI summary of a PR diff (files, risks, test coverage, suggested reviewers)',
  progressMessage: 'fetching PR diff',
  allowedTools: [
    ...READ_ONLY_TOOLS,
    ...GIT_READ_TOOLS,
    ...SHELL_TOOLS,
    'Bash(gh pr view:*)',
    'Bash(gh pr diff:*)',
    'Bash(gh pr list:*)',
    'Bash(gh api:*)',
  ],
  buildPrompt: (args) => `## PR Diff Summarization Protocol

**Target:** ${args || '(no arg: summarize the current branch vs its merge base; or pass a PR number like "123")'}

You produce a structured, **evidence-backed** summary of a PR. Every claim must map to specific files/lines in the diff.

### 1. Obtain the diff

**If arg looks like a PR number / URL:**
- \`gh pr view <ref> --json number,title,author,baseRefName,headRefName,body,additions,deletions,changedFiles\`
- \`gh pr diff <ref>\` → full unified diff

**Otherwise (local branch):**
- \`git fetch origin --quiet\`
- \`base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD origin/master 2>/dev/null || echo HEAD~10)\`
- \`git diff --stat $base..HEAD\`
- \`git diff $base..HEAD\`
- \`git log --oneline $base..HEAD\`

### 2. Classify each file

For every changed file, assign:
- **category**: \`feat\` | \`fix\` | \`refactor\` | \`test\` | \`docs\` | \`chore\` | \`perf\` | \`style\`
- **blast radius**: \`local\` (< 50 LOC, 1 file) / \`module\` (1 dir) / \`cross-cutting\` (many dirs / public API)
- **risk**: \`low\` / \`medium\` / \`high\` — high if: auth, payments, db migrations, env handling, deletions > additions, removal of tests, changes to CI

### 3. Produce the structured summary

Emit markdown exactly in this shape:

\`\`\`markdown
# PR Summary: <title>

**Author:** <author> · **Base:** <base>..<head> · **Size:** +<add> -<del> across <n> files

## What changed
- <one sentence per logical change, grouped by category, each citing 1-3 files>

## Why it matters
- <2-4 bullets on user / codebase impact, only if evidence exists in diff or PR body>

## Risks & red flags
- <specific risks tied to concrete lines; say "none detected" if truly none>

## Test coverage
- **Added:** <list of *.test.* / *_test.* / *.spec.* files with +/- lines>
- **Modified:** <same>
- **Missing:** <files with logic changes but no matching test; skip if none>

## Suggested reviewers
- <domain expert based on CODEOWNERS if present, else top 3 contributors of touched paths from \`git log --format='%an' <paths>\`>

## Merge checklist
- [ ] Tests pass (\`<detected test command>\`)
- [ ] Types/lint clean
- [ ] Migrations reviewed (if any)
- [ ] Breaking changes documented (if any)
\`\`\`

### 4. Rules
- **Never invent file names or behaviours.** Every bullet must be grounded in the diff.
- Use inline \`code\` for filenames and function names.
- If the diff is empty, say so and stop.
- If PR body contains a checklist, fold it into the Merge checklist.
- Keep the summary under 400 words.

Proceed.`,
})
