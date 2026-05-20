import { Telegraf } from 'telegraf'
import { askAI } from './ai.js'
import type { ChatMessage } from './ai.js'
import { remember, getConversationHistory } from './memory.js'
import { mcpManager } from './mcpManager.js'
import { agentManager } from './agentManager.js'

let bot: Telegraf | null = null
let botUsername = ''

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatAgentInfo(agent: { emoji: string; name: string } | null): string {
  if (!agent) return ''
  return `${agent.emoji || '🧠'} Agent: ${agent.name}`
}

export async function startBot(token: string): Promise<string> {
  if (bot) return 'Bot already running'

  if (!agentManager.isLoaded) {
    agentManager.load()
  }

  bot = new Telegraf(token)

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'there'
    const agentLine = formatAgentInfo(agentManager.currentAgent)
    await ctx.reply(
      `Hey ${escapeHtml(name)}! I'm your CORTEX Daemon — 24/7 autonomous agent.\n\n` +
        `I have full access to ${mcpManager.toolCount} tools across ${mcpManager.serverCount} connected servers.\n` +
        `${agentLine ? agentLine + '\n' : ''}` +
        `I auto-detect the right expert persona and tools for each task.\n\n` +
        `Commands:\n` +
        `/help - Show this message\n` +
        `/status - Check system + MCP status\n` +
        `/memory - Recall our conversation history\n` +
        `/tools - List all connected MCP servers and tool counts\n` +
        `/agent - Show current agent and list categories\n` +
        `/agent list - List available expert agents\n` +
        `/agent use <name> - Lock to a specific agent persona\n` +
        `/agent auto - Re-enable auto-detection\n` +
        `/forget - Clear conversation memory for this chat`
    )
    await remember(String(ctx.chat.id), 'system', 'Bot started')
  })

  bot.help(async (ctx) => {
    const agentLine = formatAgentInfo(agentManager.currentAgent)
    await ctx.reply(
      `I'm your CORTEX Daemon with full laptop access.\n\n` +
        `Just tell me what you want and I'll use my tools:\n` +
        `• "read my downloads folder"\n` +
        `• "edit file X and commit"\n` +
        `• "search GitHub for Y"\n` +
        `• "check if port 80 is open"\n` +
        `• "scrape website X"\n\n` +
        `${agentLine ? agentLine + '\n\n' : ''}` +
        `I have ${mcpManager.toolCount} tools across ${mcpManager.serverCount} servers.\n` +
        `Commands: /help /status /memory /tools /agent /forget`
    )
  })

  bot.command('status', async (ctx) => {
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const agent = agentManager.currentAgent
    const agentLine = agent ? `\nAgent: ${agent.emoji} ${agent.name}${agentManager.isLocked ? ' (locked)' : ''}` : ''
    await ctx.reply(
      `🟢 Daemon online\n` +
        `Uptime: ${hours}h ${minutes}m\n` +
        `Model: ${process.env.OPENAI_MODEL || 'deepseek/deepseek-v4-flash:free'}\n` +
        `MCP: ${mcpManager.status}` +
        `${agentLine}`
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

  bot.command('agent', async (ctx) => {
    const args = ctx.message.text.split(/\s+/).slice(1)
    const sub = args[0]?.toLowerCase()

    if (sub === 'list') {
      const filter = args.slice(1).join(' ').toLowerCase()
      let agents = agentManager.getAllAgents()
      if (filter) {
        agents = agents.filter(a =>
          a.name.toLowerCase().includes(filter) ||
          a.category.includes(filter) ||
          a.id.includes(filter)
        )
      }
      if (agents.length === 0) {
        await ctx.reply('No agents found.')
        return
      }
      const byCat: Record<string, string[]> = {}
      for (const a of agents) {
        if (!byCat[a.category]) byCat[a.category] = []
        byCat[a.category].push(`${a.emoji || '🤖'} ${escapeHtml(a.name)}`)
      }
      const lines: string[] = []
      for (const [cat, names] of Object.entries(byCat)) {
        lines.push(`<b>${cat}</b>\n${names.slice(0, 10).join('\n')}${names.length > 10 ? `\n  ...+${names.length - 10} more` : ''}`)
      }
      const total = agents.length
      const msg = `<b>Available Agents (${total}):</b>\n\n${lines.join('\n\n')}\n\nUse /agent use &lt;name&gt; to lock to one.`
      await ctx.reply(msg, { parse_mode: 'HTML' })
      return
    }

    if (sub === 'use') {
      const name = args.slice(1).join(' ')
      if (!name) {
        await ctx.reply('Usage: /agent use &lt;agent name or id&gt;')
        return
      }
      const results = agentManager.searchAgents(name)
      if (results.length === 0) {
        await ctx.reply(`No agent found matching "${escapeHtml(name)}". Try /agent list to see available agents.`)
        return
      }
      const match = results[0]
      agentManager.setLockedAgent(match.id)
      await ctx.reply(`Locked to agent: ${match.emoji || '🧠'} <b>${escapeHtml(match.name)}</b>\n${escapeHtml(match.description)}`, { parse_mode: 'HTML' })
      return
    }

    if (sub === 'auto') {
      agentManager.unlock()
      await ctx.reply('Auto-detection enabled. The agent persona will be chosen based on your question.')
      return
    }

    if (sub === 'status' || !sub) {
      const current = agentManager.currentAgent
      if (!current) {
        await ctx.reply('No agent selected. Auto-detection will pick one based on your question.')
        return
      }
      const lockStatus = agentManager.isLocked ? ' (locked)' : ' (auto-detected)'
      await ctx.reply(
        `<b>Current Agent:</b> ${current.emoji || '🧠'} ${escapeHtml(current.name)}${lockStatus}\n` +
        `<b>Category:</b> ${current.category}\n` +
        `<b>Description:</b> ${escapeHtml(current.description)}`,
        { parse_mode: 'HTML' }
      )
      return
    }

    await ctx.reply(
      'Agent commands:\n' +
      '/agent - Show current agent\n' +
      '/agent list - List all agent personas\n' +
      '/agent list &lt;category&gt; - Filter by category\n' +
      '/agent use &lt;name&gt; - Lock to a specific agent\n' +
      '/agent auto - Re-enable auto-detection'
    )
  })

  bot.on('text', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const text = ctx.message.text

    if (text.startsWith('/')) return

    await remember(chatId, 'user', text)
    ctx.sendChatAction('typing')

    const history = await getConversationHistory(chatId)

    let detectedAgent = agentManager.currentAgent

    if (!detectedAgent && agentManager.isLoaded) {
      detectedAgent = agentManager.getRelevantAgent(text)
      if (detectedAgent) {
        console.log(`[DAEMON] Auto-detected agent: ${detectedAgent.emoji} ${detectedAgent.name}`)
      }
    }

    const currentMessages: ChatMessage[] = [
      ...history.map((m) => ({ role: m.role as ChatMessage['role'], content: m.content })),
      { role: 'user', content: text },
    ]

    let agentIdentityNote = ''
    if (detectedAgent && detectedAgent.emoji) {
      agentIdentityNote = `\n\n(Responding as ${detectedAgent.emoji} ${detectedAgent.name})`
    }

    const tools = mcpManager.getRelevantToolSchemas(text)
    let response = ''
    let toolIterations = 0
    const maxToolCalls = 12

    while (toolIterations < maxToolCalls) {
      const updatedTools = toolIterations === 0
        ? tools
        : mcpManager.getToolSchemas()
      const agentPrompt = detectedAgent ? detectedAgent.systemPrompt : ''
      const result = await askAI(currentMessages, updatedTools, '', agentPrompt)

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

    const finalResponse = response + agentIdentityNote
    await remember(chatId, 'assistant', finalResponse)

    const maxLen = 4000
    if (finalResponse.length <= maxLen) {
      try {
        await ctx.reply(escapeHtml(finalResponse), {
          parse_mode: 'HTML',
        })
      } catch {
        await ctx.reply(finalResponse)
      }
    } else {
      for (let i = 0; i < finalResponse.length; i += maxLen) {
        const chunk = finalResponse.slice(i, i + maxLen)
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
    const agentCount = agentManager.count
    return `Bot @${botUsername} started (polling mode) — ${mcpManager.status} — ${agentCount} agent profiles loaded`
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
