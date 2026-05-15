# Contributing to CORTEX

Thanks for your interest! CORTEX is an open-source AI coding assistant. All contributions welcome — code, docs, bug reports, feature requests, new agents, new commands, new MCP servers.

## Quick Start

```bash
git clone https://github.com/gokul77898/Cortex.git
cd Cortex
bun install
bun run build
./cortex.mjs
```

## Development

### Build
```bash
bun run build       # Build CLI bundle → dist/cli.mjs
bun run dev         # Build + run
```

### Type Check
```bash
bun run typecheck   # Check for TypeScript errors
```

### Test
```bash
bun test            # Run tests
bun test:coverage   # With coverage report
```

## Adding a New Command

1. Create `src/commands/<name>/index.ts`:
```typescript
import type { Command } from '../../commands.js'
export default {
  type: 'local-jsx',
  name: '<name>',
  description: 'What it does',
  load: () => import('./<name>.js'),
} satisfies Command
```

2. Create `src/commands/<name>/<name>.tsx` with a `call` export:
```typescript
export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  return <YourComponent onDone={onDone} />
}
```

3. Register in `src/commands.ts`: import + add to `COMMANDS` array.

## Adding a New Agent

Drop a `.md` file into `src/skills/agency/`:

```markdown
---
name: Agent Name
description: What this agent does
color: "#ff6600"
emoji: 🤖
vibe: Short personality hook
---

# Agent Name

## Identity & Memory
You are...

## Core Mission
Your primary responsibilities...

## Critical Rules
- Rule 1
- Rule 2
```

It's auto-discovered at startup — no registration needed.

## Adding a New Provider

Add an entry to `src/utils/providerRegistry.ts`:

```typescript
{
  id: 'my-provider',
  name: 'My Provider',
  description: 'What it offers',
  category: 'free' | 'paid' | 'local' | 'enterprise',
  baseUrl: 'https://api.myprovider.com/v1',
  defaultModel: 'my-model',
  requiresApiKey: true,
  apiKeyHint: 'Get key at https://myprovider.com/keys',
  knownModels: ['model-1', 'model-2'],
  isOpenAICompatible: true,
}
```

## Code Style

- **No comments in code** unless absolutely necessary
- **Strict TypeScript** — type everything explicitly
- **Follow existing patterns** — look at neighboring files
- **ESM only** — use `.js` extensions in imports (compiled from `.ts`)
- **Run `bun run build` before committing**

## Pull Request Process

1. Fork the repo
2. `git checkout -b feat/my-feature`
3. Make changes, run `bun run build`
4. Use `/smart-commit` for conventional commit message
5. Push + open a PR

## Reporting Issues

Use GitHub Issues with these templates:
- **Bug report** — What happened, what you expected, steps to reproduce
- **Feature request** — What you want, why it's useful

## Need Help?

Run `/help` in the CLI or join the community.
