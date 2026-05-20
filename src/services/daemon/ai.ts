const OPENROUTER_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'deepseek/deepseek-v4-flash:free'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{
    id: string
    type: string
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

interface AIResult {
  content: string
  toolCalls?: Array<{ id: string; name: string; args: any }>
}

const SYSTEM_PROMPT = `You are CORTEX Daemon — a 24/7 autonomous AI agent running on the user's computer.
You have full access to connected MCP tools that can read/write files, browse the web, run commands, use GitHub, and more.
Answer through Telegram. Be concise, direct, and helpful.

CAPABILITIES:
- Read, write, list, edit, search files on the user's computer
- Browse the web and scrape content
- Use GitHub (repos, issues, PRs, code search)
- Search the web via DuckDuckGo
- Control browser via Puppeteer (screenshots, clicks, navigation)
- Execute SQL queries on local databases
- Read PDFs, convert documents
- Search YouTube transcripts
- Use Wikipedia, Hacker News, Reddit
- Get current time and date
- Do sequential reasoning for complex problems

RULES:
1. When you need to use a tool, call it directly. Don't ask for permission.
2. If a tool call fails, try an alternative approach or explain clearly.
3. Keep responses under 300 words unless the task needs more detail.
4. Never refuse a task without first trying available tools.
5. Format responses cleanly for Telegram - use *bold* for emphasis, \`code\` for inline code, - for lists.
6. For file paths, use *absolute paths* since the filesystem server is configured with allowed directories.
7. If you can't do something even with tools, say so and suggest alternatives.`

export async function askAI(
  messages: ChatMessage[],
  tools: any[] = [],
  systemExtra = '',
  agentPrompt = ''
): Promise<AIResult> {
  let finalSystem = SYSTEM_PROMPT
  if (agentPrompt) {
    finalSystem = `${agentPrompt}\n\n---\n\n${SYSTEM_PROMPT}`
  }
  if (systemExtra) {
    finalSystem = `${finalSystem}\n\n${systemExtra}`
  }
  const system: ChatMessage = {
    role: 'system',
    content: finalSystem,
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const body: any = {
        model: MODEL,
        messages: [system, ...messages],
        temperature: 0.3,
        max_tokens: 8192,
      }

      if (tools.length > 0) {
        body.tools = tools
        body.tool_choice = 'auto'
      }

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'http://localhost:3738',
          'X-Title': 'CORTEX Daemon',
        },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        if (attempt < 2) continue
        return { content: `API error ${resp.status}: ${errText.slice(0, 200)}` }
      }

      const data: any = await resp.json()
      const message = data.choices?.[0]?.message

      if (!message) {
        if (attempt < 2) continue
        return { content: '(no response from model)' }
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          content: message.content || '',
          toolCalls: message.tool_calls.map((tc: any) => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || '{}'),
          })),
        }
      }

      return { content: message.content || '(empty response)' }
    } catch (e) {
      if (attempt < 2) continue
      return { content: `Error: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  return { content: '(failed after retries)' }
}
