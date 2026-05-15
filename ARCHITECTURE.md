# CORTEX Architecture

CORTEX is an open-source, agentic AI coding assistant built on the CORTEX framework (a fork of Claude Code). It runs entirely on free models via OpenRouter, Groq, HuggingFace, and other providers.

## System Overview

```
User → CLI/UI → API Adapter → LLM Provider → Tools → Filesystem
                  ↓
            Tool Pool (7-20 tools)
                  ↓
            Agent System (162 specialists)
```

## Key Components

### 1. Entry Points

| Entry Point | File | Description |
|-------------|------|-------------|
| CLI | `src/entrypoints/cli.tsx` | Main terminal UI (Ink/React) |
| Desktop | `apps/voice-ui/main.js` | Electron floating window |
| Web Dashboard | `apps/web-ui/server.mjs` | Express + SSE dashboard on port 3738 |
| VS Code | `apps/vscode-extension/` | VS Code extension |

### 2. Command System

Commands are registered in `src/commands.ts`. Each command has:
- `index.ts` — Registration (name, description, type)
- `*.tsx` — Implementation (React component or prompt builder)

**Custom commands:** Create `.cortex/skills/<name>/SKILL.md` with YAML frontmatter.

### 3. Provider System

**Registry:** `src/utils/providerRegistry.ts` — 45+ providers with API endpoints, env vars, known models

**Connect:** `/connect` or startup picker saves profiles to `~/.cortex.json` via `src/utils/providerProfiles.ts`

**Detection:** `getActiveProviderFromEnv()` matches `OPENAI_BASE_URL` against registry URLs

**Model picker:** `/model` shows models from the active provider. OpenRouter models fetched live from API

### 4. Tool System

**Registration:** `src/tools.ts` — `getAllBaseTools()` returns all available tools

**Default mode (CORTEX_SIMPLE=1):** 7 essential tools:
- Bash, Read, Edit, Write, Glob, Grep, WebFetch

**Full mode (CORTEX_SIMPLE=0):** All 20+ tools including Agent, WebSearch, NotebookEdit, etc.

**Extra tools:** `/tools` command persists `extraTools[]` to global config

**Assembly:** `assembleToolPool()` in `src/tools.ts` combines built-in + MCP tools

### 5. Agent System

**Location:** `src/skills/agency/` — 162 markdown files

**Format:** YAML frontmatter (`name`, `description`, `color`, `emoji`, `tools`) + system prompt body

**Loading:** Auto-discovered at startup. Accessible via:
- `/agent` command — Browse categories and agents
- `Agent({subagent_type: "Agent Name", prompt: "..."})` — Tool-based invocation
- `/agents` command — Full TUI manager

### 6. API Layer

**Shim:** `src/services/api/openaiShim.ts` — OpenAI-compatible adapter (DO NOT MODIFY)

**Provider chain:** Primary → HF fallback → NVIDIA → Groq → Ollama

**Request flow:**
```
User input → System prompt + CORTEX.md + Tool schemas → API call → Response stream
```

## Data Flow

```
User types "fix this bug"
  ↓
CLI (Ink terminal) captures input
  ↓
Agent loop: observe → think → act
  ↓
API call: system prompt + tools + conversation history
  ↓
LLM responds with tool calls or text
  ↓
Tool execution: Read/Edit/Bash/etc. on filesystem
  ↓
Result fed back to agent loop
  ↓
Response streamed to user
```

## Directory Structure

```
cortex/
├── src/
│   ├── entrypoints/     # CLI bootstrap
│   ├── commands/        # Slash commands (50+)
│   ├── components/      # React/Ink UI components
│   ├── services/api/    # LLM API adapters
│   ├── tools/           # Tool implementations
│   ├── skills/agency/   # 162 specialist agents
│   └── utils/           # Utilities (model, providers, config)
├── apps/
│   ├── voice-ui/        # Electron desktop app
│   ├── web-ui/          # Web dashboard
│   └── vscode-extension/ # VS Code extension
├── bin/                 # Launch scripts
├── scripts/             # Build scripts
├── CORTEX.md            # Zero-command routing (auto-loaded)
└── .cortex/             # Project config (gitignored)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict) |
| Runtime | Node.js 20+ · Bun 1.1+ |
| Terminal UI | Ink (React for CLI) |
| Desktop | Electron |
| Web | Express + SSE |
| AI Providers | OpenRouter, Groq, HuggingFace, NVIDIA, etc. |
| Database | SQLite (`data/cortex.db`) |
| Build | Bun bundler |
