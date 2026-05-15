# Changelog

All notable changes to CORTEX are documented here.

## [0.1.18] - 2026-05-15

### Added
- **45+ Provider Registry** — Connect to OpenRouter, Groq, HuggingFace, NVIDIA, Cerebras, Together AI, Deep Infra, Fireworks, OpenAI, Anthropic, Gemini, DeepSeek, Mistral, xAI, Ollama, LM Studio, and more via `src/utils/providerRegistry.ts`
- **`/connect` command** — Interactive provider setup wizard. Pick category → pick provider → paste API key → auto-saves profile
- **`/tools` command** — Toggle extra tools on/off. 7 default tools (Bash, Read, Edit, Write, Glob, Grep, WebFetch) + optional extras (Agent, WebSearch, NotebookEdit, TodoWrite, etc.)
- **`/sessions` command** — Browse, resume, rename, and delete past sessions from `~/.cortex/sessions/`
- **`/agent` command** — Direct chat with any of 162 specialist agents. Lists categories, shows agent descriptions, provides Agent() tool invocation
- **`/compress` command** — Manual context compression tool with `contextCompressor.ts` utility
- **`/undo` command** — File snapshot-based undo. Saves file state before edits, restores on `/undo <file>`
- **Dynamic model fetching** — `/model openrouter` now fetches live free models from OpenRouter API with 5-minute cache
- **Startup provider picker** — First-run wizard when no API key is configured. Interactive provider selection + API key entry + profile persistence
- **Persistent API keys** — Keys saved to provider profile via `addProviderProfile()` → remembered across restarts
- **Complete MIT License**

### Fixed
- **"Detected custom API key" popup** — Fixed double env var injection that was triggering Anthropic key approval dialog
- **API key prompt every restart** — Startup screen now checks `getActiveProviderProfile()` before showing picker
- **162 agents not loading** — 15 missing game engine agents (Godot, Unity, Unreal, Roblox, Blender) copied from `.agents/` to `src/skills/agency/`
- **11 doc files in agency dir** — Moved to `src/skills/agency/docs/` to avoid wasted parsing
- **Groq "128 tools" error** — Reduced tools via CORTEX_SIMPLE mode, fixed tool overflow
- **Token overflow (152K)** — Reduced tool input from ~100K to ~10K by enabling CORTEX_SIMPLE mode

### Changed
- **CORTEX_SIMPLE mode** — Enabled by default with 7 essential tools. Set `CORTEX_SIMPLE=0` in `.env` to disable
- **LSP enabled by default** — `LSPTool` no longer gated behind `ENABLE_LSP_TOOL` env var
- **Agent tool description** — 162-agent list moved from tool description to system messages (saves ~5K tokens/turn)
- **CORTEX.md trimmed** — Reduced from 7.9KB to 1.2KB (85% reduction). Removed redundant routing tables
- **Bash git instructions** — Compacted from 120 lines to ~30 lines. Kept safety rules, removed verbose steps
- **Groq models updated** — Now includes openai/gpt-oss-120b, openai/gpt-oss-20b, qwen-3-32b, llama-4-scout, whisper, orpheus
- **OpenRouter models updated** — 27 free models from OpenRouter's live list
- **`.env` cleaned** — Removed `DISABLE_CORTEX_IN_CHROME` and `CORTEX_DISABLE_CHROME` flags

### Documentation
- **README.md** — Updated badges (153→162 agents), added "Recent Changes" table
- **LICENSE** — Added MIT license file
- **ARCHITECTURE.md** — New architecture documentation
- **CONTRIBUTING.md** — New contributor guidelines
- **SECURITY.md** — New security policy

## [0.1.17] - Previous
- Initial release with CORTEX framework
- 153 specialist agents
- 38 MCP servers
- CLI + Electron + Web + VS Code interfaces
- HuggingFace router + fallback chain
