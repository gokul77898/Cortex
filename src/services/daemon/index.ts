import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { startBot, stopBot, isBotRunning, getBotUsername } from './telegram.js'
import { startTunnel, stopTunnel, isTunnelRunning } from './tunnel.js'
import { mcpManager } from './mcpManager.js'
import { agentManager } from './agentManager.js'

const DAEMON_TOKEN_PATH = process.env.HOME + '/.cortex/daemon.json'
let daemonState: 'stopped' | 'starting' | 'running' | 'error' = 'stopped'
let startTime = 0

interface DaemonConfig {
  telegramToken?: string
  autoStart?: boolean
}

function getConfig(): DaemonConfig {
  try {
    return JSON.parse(readFileSync(DAEMON_TOKEN_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveConfig(config: DaemonConfig) {
  try {
    mkdirSync(dirname(DAEMON_TOKEN_PATH), { recursive: true })
  } catch {}
  writeFileSync(DAEMON_TOKEN_PATH, JSON.stringify(config, null, 2))
}

export async function startDaemon(token?: string): Promise<string> {
  if (daemonState === 'running') return 'Daemon already running'

  const config = getConfig()
  const botToken = token || config.telegramToken
  if (!botToken) return 'No Telegram bot token. Provide one or set it first.'

  daemonState = 'starting'
  startTime = Date.now()
  saveConfig({ ...config, telegramToken: botToken })

  const results: string[] = []

  try {
    const result = await startBot(botToken)
    results.push(result)
    daemonState = 'running'
  } catch (e) {
    daemonState = 'error'
    return `Failed: ${e instanceof Error ? e.message : String(e)}`
  }

  // Connect MCP servers in background (non-blocking)
  mcpManager.connectAll().then(() => {
    console.log(`[DAEMON] MCP ready: ${mcpManager.status}`)
  }).catch((e) => {
    console.error(`[DAEMON] MCP connection error: ${e}`)
  })
  results.push('MCP connecting in background...')

  return results.join('\n')
}

export async function stopDaemon(): Promise<string> {
  await stopBot()
  stopTunnel()
  await mcpManager.disconnectAll().catch(() => {})
  daemonState = 'stopped'
  return 'Daemon stopped'
}

export function getDaemonStatus() {
  const current = agentManager.currentAgent
  return {
    state: daemonState,
    uptime:
      daemonState === 'running' ? Math.floor((Date.now() - startTime) / 1000) : 0,
    botRunning: isBotRunning(),
    tunnelRunning: isTunnelRunning(),
    botUsername: getBotUsername(),
    mcp: mcpManager.status,
    agent: current ? `${current.emoji} ${current.name}` : null,
    agentLocked: agentManager.isLocked,
  }
}

export async function setToken(token: string): Promise<string> {
  const config = getConfig()
  saveConfig({ ...config, telegramToken: token })
  return 'Token saved. Run /daemon start to start the bot.'
}

export { startTunnel, stopTunnel }
