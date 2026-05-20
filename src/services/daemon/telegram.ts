import { Telegraf } from 'telegraf'
import type { Context } from 'telegraf'
import { askAI } from './ai.js'
import { remember, getConversationHistory } from './memory.js'

let bot: Telegraf | null = null
let botUsername = ''

function escapeTelegram(text: string): string {
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/`/g, '\\`')
}

export async function startBot(token: string): Promise<string> {
  if (bot) return 'Bot already running'

  bot = new Telegraf(token)

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'there'
    await ctx.reply(
      `Hey ${escapeTelegram(name)}! I'm your CORTEX Daemon — 24/7 autonomous agent.\n\n` +
      `Send me any message and I'll process it using my tools and AI.\n` +
      `Commands:\n` +
      `/help - Show this message\n` +
      `/status - Check system status\n` +
      `/memory - Recall our conversation history\n` +
      `/tools - List available MCP tools\n` +
      `/forget - Clear conversation memory for this chat`
    )
    await remember(String(ctx.chat.id), 'system', 'Bot started')
  })

  bot.help(async (ctx) => {
    await ctx.reply(
      `I'm your CORTEX Daemon. Just send me a message and I'll respond!\n\n` +
      `I can:\n` +
      `• Answer questions using AI\n` +
      `• Read and write files\n` +
      `• Browse the web\n` +
      `• Run code and commands\n` +
      `• Use any MCP tool connected to Cortex\n\n` +
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
      `Chats active: I'm here for you`
    )
  })

  bot.command('memory', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const history = await getConversationHistory(chatId)
    if (!history.length) {
      await ctx.reply('No conversation history yet.')
      return
    }
    const summary = history.slice(-5).map(m =>
      `${m.role === 'user' ? 'You' : 'Me'}: ${m.content.slice(0, 100)}`
    ).join('\n')
    await ctx.reply(`Recent memory:\n\n${escapeTelegram(summary)}`)
  })

  bot.command('tools', async (ctx) => {
    await ctx.reply(
      'Available capabilities:\n' +
      '• Filesystem (read/write/list files)\n' +
      '• Web fetch & search\n' +
      '• GitHub integration\n' +
      '• Code execution\n' +
      '• Agent memory & search\n' +
      '• And more via connected MCPs\n\n' +
      'Tell me what you want me to do!'
    )
  })

  bot.command('forget', async (ctx) => {
    const chatId = String(ctx.chat.id)
    try {
      await fetch(`${process.env.AGENTMEMORY_URL || 'http://localhost:3111'}/mem/forget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { chatId } }),
      })
    } catch {}
    await ctx.reply('Conversation memory cleared for this chat.')
  })

  bot.on('text', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const text = ctx.message.text

    await remember(chatId, 'user', text)

    ctx.sendChatAction('typing')

    const history = await getConversationHistory(chatId)
    const messages = [...history, { role: 'user' as const, content: text }]

    const response = await askAI(messages)

    await remember(chatId, 'assistant', response)

    const maxLen = 4000
    if (response.length <= maxLen) {
      try {
        await ctx.reply(escapeTelegram(response), { parse_mode: 'MarkdownV2' })
      } catch {
        await ctx.reply(response)
      }
    } else {
      for (let i = 0; i < response.length; i += maxLen) {
        const chunk = response.slice(i, i + maxLen)
        try {
          await ctx.reply(escapeTelegram(chunk), { parse_mode: 'MarkdownV2' })
        } catch {
          await ctx.reply(chunk)
        }
      }
    }
  })

  try {
    await bot.launch({ polling: true })
    botUsername = bot.botInfo?.username || 'cortex_daemon'
    return `Bot @${botUsername} started (polling mode)`
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
