const OPENROUTER_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'deepseek/deepseek-v4-flash:free'

const SYSTEM_PROMPT = `You are CORTEX Daemon — a 24/7 autonomous AI agent that lives on the user's computer.
You have full access to MCP tools (filesystem, web, code execution, and more).
You answer via Telegram messages. Be concise, use natural language, no markdown.

RULES:
1. Answer directly — no fluff, no greetings, no "I'd be happy to"
2. If a task requires tools, explain briefly what you'll do, then do it
3. Keep responses under 200 words unless the task requires more
4. You can read/write files, browse the web, run commands, and more
5. If asked something you can't do, say so clearly`

export async function askAI(
  messages: Array<{ role: string; content: string }>,
  systemExtra = ''
): Promise<string> {
  const system = systemExtra ? `${SYSTEM_PROMPT}\n\n${systemExtra}` : SYSTEM_PROMPT
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'http://localhost:3738',
        'X-Title': 'CORTEX Daemon',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })
    const data = await resp.json()
    return data.choices?.[0]?.message?.content || '(no response)'
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : e}`
  }
}
