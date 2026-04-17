# CORTEX CLI

> **C**ode **O**rchestration + **R**easoning **T**erminal **E**ngine for **X**-scale development
>
> An open-source, agentic AI coding assistant that runs entirely in your terminal. Powered by **HuggingFace's GLM-5** (via Together AI) by default — no Anthropic/OpenAI subscription required.

```
   ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
  ██╔════╝██╔══██║██╔══██║╚══██╔══╝██╔═════╝╚██╗██╔╝
  ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝
  ██║     ██║   ██║██╔══██║   ██║   ██╔══╝   ██╔██╗
  ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═══════╝╚═╝  ╚═╝
```

---

## ✨ Features

- **47 custom slash commands** across 8 tiers — from smart commits to distributed tracing
- **Runs on HuggingFace** — bring your own free HF token, no vendor lock-in
- **Full IDE pair-programming** — reads, edits, runs commands, spawns sub-agents
- **Git-native** — understands your repo, commits, PRs, bisects, merges
- **Privacy-friendly** — all telemetry stubbed out, no data leaves your machine (except LLM calls)
- **Mission 09: Brain-Swarm** — default boot mode with `zai-org/GLM-5:together`

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and **Bun** 1.1+ (`brew install bun` on macOS)
- **Python** 3.9+ (for a few helper scripts)
- A **HuggingFace token** with inference permissions → [hf.co/settings/tokens](https://huggingface.co/settings/tokens)

### Install

```bash
git clone https://github.com/gokul77898/AGI.git cortex
cd cortex
bun install
bun run build
```

### Configure

Copy `.env.example` to `.env` and set:

```bash
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HF_BASE_URL=https://router.huggingface.co/v1
HF_MODEL_ID=zai-org/GLM-5:together
```

### Run

```bash
# Interactive mode
./cortex.mjs
# or, if symlinked as AGI:
AGI

# Print-once mode (non-interactive)
./cortex.mjs -p "refactor the auth module to use async/await"
```

---

## 📋 Command Reference (47 total)

### Tier 1 — Core (7)
| Command | Description |
|---------|-------------|
| `/smart-commit` `/sc` | Conventional commit with auto-detected type/scope |
| `/pr-review` | Comprehensive AI PR review |
| `/db` | Database schema + query analysis |
| `/test-gen` | Generate tests for a file/function |
| `/security-scan` | Deep security audit |
| `/perf-analyze` | Performance hotspot analysis |
| `/scan-report` | View latest scan reports |

### Tier 2 — Developer Productivity (8)
| Command | Description |
|---------|-------------|
| `/refactor` `/rf` | AI refactoring (rename, extract, convert patterns) |
| `/explain` `/ex` | Explain any code/file/function in plain English |
| `/docs` | Auto-generate JSDoc/docstrings/README sections |
| `/fix` | Paste an error → AI diagnoses + fixes it |
| `/todo` | Scan + prioritize TODO/FIXME/HACK comments |
| `/deps` | Dependency audit (outdated, vulnerable, unused) |
| `/lint-fix` | Auto-fix lint errors across the repo |
| `/type-check` `/tc` | Deep type analysis + AI-suggested fixes |

### Tier 3 — Code Intelligence (7)
| Command | Description |
|---------|-------------|
| `/architecture` `/arch` | Mermaid architecture diagrams |
| `/complexity` `/cx` | Cyclomatic complexity + hot spots |
| `/dead-code` `/dc` | Find unused exports, functions, files |
| `/api-map` | Map every endpoint + its consumers |
| `/schema-diff` | Diff two schemas + generate migration |
| `/coverage-gap` | Find untested files + auto-generate tests |
| `/bundle-analyze` | Bundle size breakdown + optimization tips |

### Tier 4 — Git & Collaboration (6)
| Command | Description |
|---------|-------------|
| `/release-notes-ai` `/changelog` | Auto-generate release notes from commits |
| `/bisect` | AI-guided git bisect |
| `/conflict-resolve` `/cr` | AI merge conflict resolution |
| `/branch-cleanup` `/bclean` | Identify + delete stale branches |
| `/commit-squash` `/squash` | Smart squash plan for a PR |
| `/review-queue` `/rq` | PRs assigned to you, prioritized |

### Tier 5 — Automation / Agentic (6)
| Command | Description |
|---------|-------------|
| `/watch` | Watch files and auto-run checks on change |
| `/auto-fix` | Continuous loop: scan → fix → test → commit |
| `/pipeline` `/ci` | Generate CI/CD YAML (GitHub Actions / GitLab / CircleCI) |
| `/dockerize` | Auto-generate Dockerfile + docker-compose |
| `/deploy` | Deploy helpers (Vercel / Netlify / Railway / Fly) |
| `/scheduler` `/cron` | Cron-like scheduled AI tasks |

### Tier 6 — Knowledge / RAG (5)
| Command | Description |
|---------|-------------|
| `/ask` `/q` | Ask a question, grounded in your codebase |
| `/ai-memory` `/amem` | Persistent project memory (writes `CORTEX.md`) |
| `/onboard` | Generate an onboarding guide for new devs |
| `/search` `/s` | Semantic code search |
| `/stackoverflow` `/so` | Diagnose error messages |

### Tier 7 — Multi-Model / Swarm (4)
| Command | Description |
|---------|-------------|
| `/swarm` | Parallel AI sub-agents for big tasks |
| `/compare` `/cmp` | Same prompt, multiple models, compare answers |
| `/debate` | Two models debate a design decision |
| `/cheap` | Route a simple query to a cheaper model |

### Tier 8 — Observability (4)
| Command | Description |
|---------|-------------|
| `/logs` | AI log analysis (errors, anomalies, patterns) |
| `/metrics` | Repo health dashboard (LOC, churn, deps) |
| `/trace` | Distributed trace analysis (OTel / Jaeger / Zipkin) |
| `/alerts` | Set up AI-driven alert rules |

---

## 🏗 Project Structure

```
cortex/
├── cortex.mjs              # Entry point
├── src/
│   ├── entrypoints/cli.tsx # CLI bootstrap
│   ├── commands/           # 47 custom commands (tier1–tier8)
│   │   ├── _tierHelper.ts  # Shared prompt-command factory
│   │   ├── tier2/          # Developer productivity (8)
│   │   ├── tier3/          # Code intelligence (7)
│   │   ├── tier4/          # Git & collab (6)
│   │   ├── tier5/          # Automation (6)
│   │   ├── tier6/          # Knowledge / RAG (5)
│   │   ├── tier7/          # Multi-model (4)
│   │   └── tier8/          # Observability (4)
│   ├── components/         # Ink / React terminal UI
│   ├── services/           # HF provider, API clients
│   ├── tools/              # Built-in tools (Edit, Read, Bash, ...)
│   └── utils/              # Browser auto-disable, shell exec, etc.
├── python/                 # Python helpers (cortex_db, cortex_security, ...)
├── scripts/                # build, start, stop, helpers
├── dist/cli.mjs            # Bundled CLI (committed? no — built via `bun run build`)
└── .mcp.json               # MCP server registry
```

---

## 🔧 Development

```bash
# Build
bun run build

# Type-check (pre-existing warnings are fine)
bun tsc --noEmit

# Run in dev mode
./cortex.mjs

# Run a non-interactive prompt
./cortex.mjs -p "explain the auth flow"
```

### Adding a new slash command

All Tier 2–8 commands share a factory in `@/src/commands/_tierHelper.ts`:

```ts
import { makeTierCommand, CODE_EDIT_TOOLS } from '../_tierHelper.js'

export default makeTierCommand({
  name: 'my-command',
  aliases: ['mc'],
  description: 'Does X',
  progressMessage: 'doing X',
  allowedTools: CODE_EDIT_TOOLS,
  buildPrompt: (args) => `## Protocol\n...your prompt here...`,
})
```

Then register it in `@/src/commands.ts` (import + add to the `COMMANDS()` array).

---

## 🛡 Privacy & Security

- **No telemetry** — 21 telemetry modules are stubbed at build time
- **No browser auto-opens** — we removed auto-launches to `localhost`, OAuth prompts, etc.
- **Secrets stay local** — `.env` is gitignored; never committed
- **No vendor lock-in** — swap `HF_MODEL_ID` to any model on the HuggingFace Router

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Use `/smart-commit` to generate a conventional commit
4. Push and open a PR on GitHub

---

## 📜 License

MIT — do whatever you want, just don't sue me.

---

## 🙏 Credits

Built on the shoulders of the open-source Claude Code CLI fork with extensive modifications:

- 40+ custom AI commands
- Full HuggingFace provider integration (GLM-5, Llama, DeepSeek, etc.)
- Mission 09: Brain-Swarm boot theme
- All telemetry and vendor auth stripped out

Powered by **HuggingFace Router** + **Together AI** + **zai-org/GLM-5**.
