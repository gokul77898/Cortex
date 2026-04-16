import type { Command } from '../commands.js'
import { getAttributionTexts } from '../utils/attribution.js'
import { executeShellCommandsInPrompt } from '../utils/promptShellExecution.js'

const ALLOWED_TOOLS = [
  'Bash(git add:*)',
  'Bash(git status:*)',
  'Bash(git commit:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git branch:*)',
  'Read',
]

function getSmartCommitPrompt(): string {
  const { commit: commitAttribution } = getAttributionTexts()

  return `## Context

- Current git status: !\`git status\`
- Staged changes: !\`git diff --cached\`
- Unstaged changes: !\`git diff\`
- Current branch: !\`git branch --show-current\`
- Recent commits (for style matching): !\`git log --oneline -15\`
- Changed file stats: !\`git diff --stat HEAD\`

## Smart Commit Protocol

You are an expert git commit message generator. Analyze the changes and create a **Conventional Commit** message.

### Conventional Commit Format:
\`\`\`
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
\`\`\`

### Types:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect meaning (white-space, formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes to build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope Detection:
- Analyze which module/component/area the changes affect
- Use short, lowercase scope names (e.g., auth, api, ui, db, cli)
- If changes span multiple scopes, pick the primary one or omit scope

### Breaking Changes:
- If changes break backward compatibility, add BREAKING CHANGE footer
- Add ! after type/scope for breaking changes: \`feat(api)!: remove deprecated endpoint\`

### Instructions:

1. **Analyze all changes** (staged + unstaged)
2. **Determine the commit type** based on the nature of changes
3. **Detect the scope** from file paths and content
4. **Write a concise description** (imperative mood, no period, <72 chars)
5. **Add body** if changes are complex (explain WHY, not WHAT)
6. **Detect breaking changes** and add footer if needed
7. **Stage all relevant files** (skip .env, secrets, node_modules)
8. **Create the commit**

### Git Safety:
- NEVER update git config
- NEVER skip hooks (--no-verify) unless explicitly asked
- NEVER use git commit --amend unless explicitly asked
- Do NOT commit files containing secrets (.env, credentials, tokens, API keys)
- If no changes exist, do NOT create an empty commit
- Never use interactive git commands (-i flag)

### Commit using HEREDOC syntax:
\`\`\`
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<optional body>${commitAttribution ? `\n\n${commitAttribution}` : ''}
EOF
)"
\`\`\`

Stage relevant files and create the commit. Do not send any other text besides the tool calls.`
}

const smartCommit: Command = {
  type: 'prompt',
  name: 'smart-commit',
  aliases: ['sc'],
  description: 'Create a smart conventional commit with auto-detected type, scope, and message',
  allowedTools: ALLOWED_TOOLS,
  contentLength: 0,
  progressMessage: 'analyzing changes for smart commit',
  source: 'builtin',
  async getPromptForCommand(_args, context) {
    const promptContent = getSmartCommitPrompt()
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
      '/smart-commit',
    )
    return [{ type: 'text', text: finalContent }]
  },
}

export default smartCommit
