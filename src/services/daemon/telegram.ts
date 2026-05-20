import { Telegraf } from 'telegraf'
import { askAI } from './ai.js'
import type { ChatMessage } from './ai.js'
import { remember, getConversationHistory } from './memory.js'
import { mcpManager } from './mcpManager.js'

let bot: Telegraf | null = null
let botUsername = ''

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function startBot(token: string): Promise<string> {
  if (bot) return 'Bot already running'

  bot = new Telegraf(token)

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'there'
    await ctx.reply(
      `Hey ${escapeHtml(name)}! I'm your CORTEX Daemon — 24/7 autonomous agent.\n\n` +
        `I have full access to ${mcpManager.toolCount} tools across ${mcpManager.serverCount} connected servers.\n` +
        `Send me any message and I'll use my tools to get things done.\n\n` +
        `Commands:\n` +
        `/help - Show this message\n` +
        `/status - Check system + MCP status\n` +
        `/memory - Recall our conversation history\n` +
        `/tools - List all connected MCP servers and tool counts\n` +
        `/forget - Clear conversation memory for this chat`
    )
    await remember(String(ctx.chat.id), 'system', 'Bot started')
  })

  bot.help(async (ctx) => {
    await ctx.reply(
      `I'm your CORTEX Daemon with full laptop access.\n\n` +
        `Just tell me what you want and I'll use my tools:\n` +
        `• \"read my downloads folder\"\n` +
        `• \"edit file X and commit\"\n` +
        `• \"search GitHub for Y\"\n` +
        `• \"check if port 80 is open\"\n` +
        `• \"scrape website X\"\n\n` +
        `I have ${mcpManager.toolCount} tools across ${mcpManager.serverCount} servers.\n` +
        `Commands: /help /status /memory /tools /forget`
    )
  })

  bot.command('status', async (ctx) => {
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    await ctx.reply(
      `🟢 Daemon online\n` +
        `Uptime: ${hours}h ${minutes}m\n` +
        `Model: ${process.env.OPENAI_MODEL || 'deepseek/deepseek-v4-flash:free'}\n` +
        `MCP: ${mcpManager.status}`
    )
  })

  bot.command('memory', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const history = await getConversationHistory(chatId)
    if (!history.length) {
      await ctx.reply('No conversation history yet.')
      return
    }
    const summary = history
      .slice(-5)
      .map(
        (m) =>
          `${m.role === 'user' ? 'You' : 'Me'}: ${m.content.slice(0, 100)}`
      )
      .join('\n')
    await ctx.reply(`Recent memory:\n\n${escapeHtml(summary)}`)
  })

  bot.command('tools', async (ctx) => {
    const tools = mcpManager.getToolSchemas()
    if (tools.length === 0) {
      await ctx.reply('No MCP tools connected.')
      return
    }

    const byServer = new Map<string, number>()
    for (const t of tools) {
      const server = t.function.name.split('__')[0]
      byServer.set(server, (byServer.get(server) || 0) + 1)
    }

    const lines: string[] = []
    for (const [server, count] of byServer) {
      lines.push(`📦 ${server}: ${count} tools`)
    }

    await ctx.reply(`Connected MCP Tools:\n${lines.join('\n')}\n\nTotal: ${tools.length} tools across ${byServer.size} servers`)
  })

  bot.command('forget', async (ctx) => {
    const chatId = String(ctx.chat.id)
    try {
      await fetch(
        `${process.env.AGENTMEMORY_URL || 'http://localhost:3111'}/mem/forget`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: { chatId } }),
        }
      )
    } catch {}
    await ctx.reply('Conversation memory cleared for this chat.')
  })

  bot.on('text', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const text = ctx.message.text

    await remember(chatId, 'user', text)
    ctx.sendChatAction('typing')

    const history = await getConversationHistory(chatId)
    const currentMessages: ChatMessage[] = [
      ...history.map((m) => ({ role: m.role as ChatMessage['role'], content: m.content })),
      { role: 'user', content: text },
    ]

    const tools = mcpManager.getToolSchemas()
    let response = ''
    let toolIterations = 0
    const maxToolCalls = 12

    while (toolIterations < maxToolCalls) {
      const result = await askAI(currentMessages, tools)

      if (result.toolCalls && result.toolCalls.length > 0) {
        toolIterations++

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.content,
          tool_calls: result.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          })),
        }
        currentMessages.push(assistantMsg)

        for (const tc of result.toolCalls) {
          const toolResult = await mcpManager.callTool(tc.name, tc.args)
          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: toolResult,
          })
        }
      } else {
        response = result.content
        break
      }
    }

    if (!response) {
      response =
        'I completed my analysis but encountered complexity in processing. Let me know if you need a different approach.'
    }

    await remember(chatId, 'assistant', response)

    const maxLen = 4000
    if (response.length <= maxLen) {
      try {
        await ctx.reply(escapeHtml(response), {
          parse_mode: 'HTML',
        })
      } catch {
        await ctx.reply(response)
      }
    } else {
      for (let i = 0; i < response.length; i += maxLen) {
        const chunk = response.slice(i, i + maxLen)
        try {
          await ctx.reply(escapeHtml(chunk), { parse_mode: 'HTML' })
        } catch {
          await ctx.reply(chunk)
        }
      }
    }
  })

  try {
    await bot.launch({ polling: true })
    botUsername = bot.botInfo?.username || 'cortex_daemon'
    return `Bot @${botUsername} started (polling mode) — ${mcpManager.status}`
  } catch (e) {
    bot = null
    throw e
  }
}

export async function stopBot(): Promise<void> {
  if (bot) {
    bot.stop()
    bot = null
  }
}

export function isBotRunning(): boolean {
  return bot !== null
}

export function getBotUsername(): string {
  return botUsername
}
