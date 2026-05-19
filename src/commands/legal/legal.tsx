import * as React from 'react'
import { spawn } from 'child_process'
import { join } from 'path'
import { execSync } from 'child_process'
import { setSystemPromptInjection } from '../../context.js'
import { Box, Text } from '../../ink.js'
import { setServerProcess } from './legalModeState.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone, LocalJSXCommandContext } from '../../types/command.js'

const LEGAL_SYSTEM_PROMPT = `# LEGAL-ONLY MODE — Absolute Restriction

You are operating in **Legal-Only Mode**. You MUST adhere to these restrictions strictly:

## ALLOWED
- Answer questions about INDIAN law (statutes, regulations, case law)
- Analyze legal documents: contracts, NDAs, agreements, deeds
- Review clauses with GREEN (acceptable) / YELLOW (needs attention) / RED (problematic) flags
- Provide redline suggestions for problematic clauses
- Categorize NDAs: TIER 1 (standard) / TIER 2 (counsel review) / TIER 3 (full review)
- Check vendor agreements for risk flags
- Generate legal briefs with proper Indian citations (Supreme Court, High Court)
- Draft legal responses: DSAR under DPDPA, legal notices, discovery holds
- Research Indian case law and statutes
- Answer questions about Indian regulatory compliance
- Use MCP tools for legal research (statutes, case law, document analysis)

## FORBIDDEN (You MUST NOT)
- Write, review, or debug ANY code (JavaScript, Python, shell, etc.)
- Answer non-legal questions (technology, cooking, sports, entertainment, etc.)
- Execute or explain shell commands
- Access or modify files outside of legal document reading
- Discuss topics unrelated to Indian law or legal matters

## Available MCP Tools
- **duckduckgo** MCP → search web for Indian law topics, case law, statutes
- **fetch** MCP → fetch and read content from legal websites, court judgments
- **paradyno-pdf** MCP → read, extract text, and search legal PDF documents (contracts, judgments, acts)
- **india-stack** MCP → India-specific legal data and stack information
- **Local web server** → http://localhost:8899

Use these tools when you need current information, case law, statutes, or document analysis. Cite your sources.

## Legal Source Hierarchy (India)
1. Constitution of India
2. Central Acts: IPC, CrPC, CPC, IT Act, DPDPA, Companies Act, etc.
3. Supreme Court judgments (binding on all courts)
4. High Court judgments (binding within state)
5. Rules, Regulations, Notifications
6. State Acts
7. International treaties ratified by India

## Response Structure
Always format responses with:
- Clear headings for each section
- GREEN/YELLOW/RED tags for risk assessment
- Proper legal citations (AIR, SCC, SCR)
- Bullet points for clarity
- Summary/conclusion at the end`

async function startServer(openrouterKey: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const serverPath = join(process.cwd(), 'website', 'legal', 'server.mjs')
    const proc = spawn('node', [serverPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OPENAI_API_KEY: openrouterKey,
        OPENROUTER_KEY: openrouterKey,
        LEGAL_PORT: '8899',
      },
    })

    let resolved = false

    const onData = (data: Buffer) => {
      const msg = data.toString()
      if (!resolved && msg.includes('Legal Hub')) {
        resolved = true
        const portMatch = msg.match(/(\d+)/)
        const port = portMatch ? parseInt(portMatch[1], 10) : 8899
        setServerProcess(proc)
        resolve(port)
      }
    }

    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.on('error', (err: Error) => { if (!resolved) { resolved = true; reject(err) } })
    proc.on('exit', (code: number | null) => { if (!resolved) { resolved = true; reject(new Error(`Server exited with code ${code}`)) } })
    setTimeout(() => { if (!resolved) { resolved = true; setServerProcess(proc); resolve(8899) } }, 5000)
  })
}

function openBrowser(url: string): void {
  try {
    const p = process.platform
    if (p === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' })
    else if (p === 'linux') execSync(`xdg-open "${url}"`, { stdio: 'ignore' })
    else if (p === 'win32') execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true })
  } catch {}
}

export const call: LocalJSXCommandCall = async (onDone, context, _args) => {
  const { setAppState } = context

  // Check for OpenRouter key
  const openrouterKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_KEY || ''
  if (!openrouterKey) {
    onDone(
      `[31mNo OpenRouter API key found.[0m

To use the Legal Hub, you need an OpenRouter API key configured in CORTEX.

[1mOption 1:[22m Run [33m/connect[0m and select [33mOpenRouter[0m from the provider list to set up your API key.
[1mOption 2:[22m Set the [33mOPENAI_API_KEY[0m environment variable to your OpenRouter key (sk-or-v1-...).

After configuring the key, run [33m/legal[0m again.`,
      { display: 'system' },
    )
    return null
  }

  try {
    setSystemPromptInjection(LEGAL_SYSTEM_PROMPT)
    setAppState(prev => ({ ...prev, mainLoopModel: 'deepseek/deepseek-v4-flash:free' as any, mainLoopModelForSession: null }))

    const port = await startServer(openrouterKey)
    openBrowser(`http://localhost:${port}`)

    onDone(
      `[32m✓[0m Legal Hub opened in your browser → [34mhttp://localhost:${port}[0m
[33mModel:[0m GPT-OSS-120B (openai/gpt-oss-120b:free)
[31mRestriction:[0m Legal-Only — non-legal questions rejected
[34mWeb Research:[0m Browser auto-searches web for every query. CLI can use DuckDuckGo/fetch MCP tools.

[2mType [1m/over[22m to exit legal mode and stop the server.[0m`,
      { display: 'system' },
    )
  } catch (e) {
    onDone(`[31mFailed to start: ${e instanceof Error ? e.message : String(e)}[0m`, { display: 'system' })
  }

  return null
}
