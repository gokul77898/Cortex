import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { DEFAULT_MCP_SERVERS } from './mcpFilter.js'

const CONFIG_PATH = join(process.env.HOME || '', '.cortex', 'cortex-config.json')

interface CortexConfig {
  enabledMcpServers: string[]
  selectedAgentId: string | null
}

let _config: CortexConfig | null = null

function loadConfig(): CortexConfig {
  if (_config) return _config

  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
      _config = {
        enabledMcpServers: raw.enabledMcpServers || [],
        selectedAgentId: raw.selectedAgentId || null,
      }
    }
  } catch {
    // ignore
  }

  _config = {
    enabledMcpServers: [],
    selectedAgentId: null,
  }
  return _config
}

function saveConfig(): void {
  if (!_config) return
  try {
    mkdirSync(dirname(CONFIG_PATH), { recursive: true })
    writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, 2))
  } catch {
    // ignore
  }
}

export function getEnabledMcpServers(): string[] {
  const config = loadConfig()
  return [...new Set([...DEFAULT_MCP_SERVERS, ...config.enabledMcpServers])]
}

export function enableMcpServer(serverName: string): void {
  const config = loadConfig()
  if (!config.enabledMcpServers.includes(serverName)) {
    config.enabledMcpServers.push(serverName)
    saveConfig()
  }
}

export function disableMcpServer(serverName: string): void {
  const config = loadConfig()
  if (DEFAULT_MCP_SERVERS.includes(serverName)) return
  config.enabledMcpServers = config.enabledMcpServers.filter(s => s !== serverName)
  saveConfig()
}

export function getDisabledMcpServers(): string[] {
  const config = loadConfig()
  return config.enabledMcpServers.filter(s => !DEFAULT_MCP_SERVERS.includes(s))
}

export function getSelectedAgentId(): string | null {
  return loadConfig().selectedAgentId
}

export function setSelectedAgentId(agentId: string | null): void {
  const config = loadConfig()
  config.selectedAgentId = agentId
  saveConfig()
}

export function getAllAvailableMcpServers(): string[] {
  return [...new Set([...DEFAULT_MCP_SERVERS, ...loadConfig().enabledMcpServers])]
}

export function resetConfig(): void {
  _config = {
    enabledMcpServers: [],
    selectedAgentId: null,
  }
  saveConfig()
}
