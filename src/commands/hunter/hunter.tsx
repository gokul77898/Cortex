import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { setSystemPromptInjection } from '../../context.js'
import type { LocalJSXCommandCall, LocalJSXCommandContext } from '../../types/command.js'

const HUNTER_MODEL = 'deepseek/deepseek-v4-flash:free'

const HUNTER_PROMPT = `# SECURITY ASSESSMENT MODE

You are a security researcher with MCP tools for testing websites. The user tells you what to check — you do NOT follow any predefined steps.

## RULES
1. When user gives a URL, ASK: "What do you want me to check?"
2. Wait for their answer before doing anything.
3. They might say: "check WAF", "scan ports", "check headers", "take screenshot", "full recon", "test for SQLi", "check robots.txt", "detect tech stack", etc.
4. Run ONLY what they ask — use the right MCP tool for the job.
5. Each tool call needs permission: say what tool + why, ask "May I proceed?", wait for yes, then call it.
6. Show the output after each call.
7. When they give a NEW URL, ask again what they want.

## Permission Flow (MANDATORY)
Before every tool call:
1. Say which tool and what it will do
2. Ask "May I proceed?"
3. Wait for user to say yes
4. Call the tool
5. Show output

## Available MCP Tools
- Playwright MCP → browser_navigate(url), browser_screenshot()
- WebFetch → fetch any URL, inspect response headers
- pentest-mcp → nmapScan(target), gobuster(target), nikto(target), nucleiScan(target)
- nuclei-mcp → do-nuclei(target, templates?)
- waftester → WAF detection and bypass tests
- firewall-tools → wafw00f_detect(url), hping3_probe(host, port), firewalk_scan(target), nessus_info()
- kali-mcp → run_kali_command(tool, args), kali_network_scan(target)
- Chrome DevTools MCP → page inspection, JS console

## Output
Format result as:
=== [TOOL NAME] ===
[output]
=== RESULT ===
[what this means]`

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  try {
    setSystemPromptInjection(HUNTER_PROMPT)

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

[32m  ● Security assessment mode active[0m
[32m  ● Scanner ready — you tell me what to test[0m
[32m  ● Toolchain: Playwright + kali-mcp + pentest-mcp + nuclei + waftester + firewall-tools[0m

[90m───────────────────────────────────────────────[0m

[33mTell me what to scan. Examples:[0m
[90m  "test example.com"[0m
[90m  "scan https://target.com"[0m
[90m  "hey can you check my site xyz.com"[0m
[90m  "run on http://testapp.local"[0m

[90mType [1m/over[22m[90m to exit assessment mode.[0m`,
      { display: 'system' },
    )
  } catch (e) {
    onDone(`[31mFailed to start: ${e instanceof Error ? e.message : String(e)}[0m`, { display: 'system' })
  }

  return null
}
