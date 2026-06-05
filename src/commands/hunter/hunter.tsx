import * as React from 'react'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall, LocalJSXCommandContext } from '../../types/command.js'
import { agentManager } from '../../services/daemon/agentManager.js'

const HUNTER_MODEL = 'qwen/qwen3-coder-480b-a35b-instruct'

function buildAgentReferenceList(): string {
  if (!agentManager.isLoaded) agentManager.load()
  const agents = agentManager.getAllAgents()
  return agents.map(a =>
    `  ${a.emoji || '•'} ${a.name} — ${a.description}`
  ).join('\n')
}

const BASE_HUNTER_PROMPT = `# HUNTER MODE — DYNAMIC AGENT SYSTEM

You are in **Hunter Mode** — a dynamic agent system with automatic expert selection.

## How It Works
1. The user tells you what they want to do
2. You automatically identify which expert agent profile best matches the task
3. You adopt that expert's persona, knowledge, and approach
4. You solve the task using the available MCP tools

Available MCP tools:
- agent-browser → browser automation (open, click, fill, screenshot, snapshot)
- filesystem → file read/write/edit operations
- duckduckgo → web search
- github → git/GitHub operations
- fetch → HTTP requests

## Expert Agent Profiles (162 available)
{AGENT_LIST}

## Rules
- Auto-select the best agent for each task from the list above
- Adopt that agent's expertise and approach
- Use MCP tools as needed
- Always explain what agent you're acting as and why you chose it
- Switch agents dynamically as the task changes`

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  try {
    const agentList = buildAgentReferenceList()
    process.env.HUNTER_MODE = '1'
    process.env.HUNTER_PROMPT = BASE_HUNTER_PROMPT.replace('{AGENT_LIST}', agentList)

    context.setAppState(prev => ({
      ...prev,
      mainLoopModel: HUNTER_MODEL,
      mainLoopModelForSession: null,
    }))
    process.env.OPENAI_MODEL = HUNTER_MODEL

    onDone(
      `[36m┌─────────────────────────────────────────────┐
[36m│[90m ███████╗███████╗ ██████╗██╗   ██╗[36m │
[36m│[90m ██╔════╝██╔════╝██╔════╝╚██╗ ██╔╝[36m │
[36m│[90m ███████╗█████╗  ██║      ╚████╔╝ [36m │
[36m│[90m ╚════██║██╔══╝  ██║       ╚██╔╝  [36m │
[36m│[90m ███████║███████╗╚██████╗   ██║   [36m │
[36m│[90m ╚══════╝╚══════╝ ╚═════╝   ╚═╝   [36m │
[36m└─────────────────────────────────────────────┘[0m

[32m  ● Hunter mode active[0m
[32m  ● ${agentManager.getAllAgents().length} expert agents loaded[0m
[32m  ● Auto-selects best agent for each task[0m
[32m  ● Model: ${HUNTER_MODEL}[0m

[90m───────────────────────────────────────────────[0m

[33mTell me what you want to do. Examples:[0m
[90m  "find XSS on my site"[0m
[90m  "build a REST API in Go"[0m
[90m  "debug this Python error"[0m
[90m  "analyze this crypto token"[0m

[90mType [1m/over[22m[90m to exit hunter mode.[0m`,
      { display: 'system' },
    )
  } catch (e) {
    onDone(`[31mFailed to start: ${e instanceof Error ? e.message : String(e)}[0m`, { display: 'system' })
  }

  return null
}
