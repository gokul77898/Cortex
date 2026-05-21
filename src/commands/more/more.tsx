import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const parts = (args || '').trim().split(/\s+/)
  const subcommand = parts[0]?.toLowerCase() || ''

  if (subcommand === 'mcp') {
    const { getEnabledMcpServers, enableMcpServer, disableMcpServer, getDisabledMcpServers } = await import('../../services/cortexConfig.js')
    const { DEFAULT_MCP_SERVERS } = await import('../../services/mcpFilter.js')
    const { readFileSync, existsSync } = await import('fs')
    const { join } = await import('path')

    const mcpConfigPaths = [
      join(process.cwd(), '.mcp.json'),
      join(process.env.HOME || '', '.cortex', '.mcp.json'),
    ]

    let mcpServers: string[] = []
    for (const p of mcpConfigPaths) {
      if (existsSync(p)) {
        try {
          const raw = JSON.parse(readFileSync(p, 'utf-8'))
          mcpServers = Object.keys(raw.mcpServers || {})
          break
        } catch {}
      }
    }

    if (mcpServers.length === 0) {
      onDone('No MCP servers configured in .mcp.json', { display: 'system' })
      return null
    }

    const enabled = getEnabledMcpServers()
    const disabled = mcpServers.filter(s => !enabled.includes(s))
    const manuallyEnabled = getDisabledMcpServers()

    const action = parts[1]?.toLowerCase()

    if (action === 'enable') {
      const serverName = parts.slice(2).join(' ')
      if (!serverName) {
        onDone('Usage: /more mcp enable <server-name>', { display: 'system' })
        return null
      }
      const match = mcpServers.find(s => s.toLowerCase().includes(serverName.toLowerCase()))
      if (!match) {
        onDone(`Server "${serverName}" not found. Available: ${mcpServers.join(', ')}`, { display: 'system' })
        return null
      }
      enableMcpServer(match)
      onDone(`Enabled MCP server: ${match}\nRun /reload to apply changes.`, { display: 'system' })
      return null
    }

    if (action === 'disable') {
      const serverName = parts.slice(2).join(' ')
      if (!serverName) {
        onDone('Usage: /more mcp disable <server-name>', { display: 'system' })
        return null
      }
      const match = manuallyEnabled.find(s => s.toLowerCase().includes(serverName.toLowerCase()))
      if (!match) {
        onDone(`Server "${serverName}" is not manually enabled. Default servers: ${DEFAULT_MCP_SERVERS.join(', ')}`, { display: 'system' })
        return null
      }
      disableMcpServer(match)
      onDone(`Disabled MCP server: ${match}\nRun /reload to apply changes.`, { display: 'system' })
      return null
    }

    const defaultList = DEFAULT_MCP_SERVERS.map(s => `  ✓ ${s}`).join('\n')
    const enabledList = manuallyEnabled.length > 0
      ? manuallyEnabled.map(s => `  ✓ ${s} (manually enabled)`).join('\n')
      : '  (none)'
    const disabledList = disabled.length > 0
      ? disabled.map(s => `  ○ ${s}`).join('\n')
      : '  (all servers enabled)'

    onDone(
      `MCP Servers:\n\n` +
      `Default (always active):\n${defaultList}\n\n` +
      `Manually enabled:\n${enabledList}\n\n` +
      `Available to enable:\n${disabledList}\n\n` +
      `Usage:\n` +
      `  /more mcp enable <name>  — add a server\n` +
      `  /more mcp disable <name> — remove a manually-enabled server`,
      { display: 'system' }
    )
    return null
  }

  if (subcommand === 'agents') {
    const { agentManager } = await import('../../services/daemon/agentManager.js')
    const { setSelectedAgentId, getSelectedAgentId } = await import('../../services/cortexConfig.js')

    if (!agentManager.isLoaded) {
      agentManager.load()
    }

    const allAgents = agentManager.getAllAgents()
    if (allAgents.length === 0) {
      onDone('No agent profiles found in ~/.cortex/agents/', { display: 'system' })
      return null
    }

    const action = parts[1]?.toLowerCase()

    if (action === 'use') {
      const name = parts.slice(2).join(' ')
      if (!name) {
        onDone('Usage: /more agents use <agent-name>', { display: 'system' })
        return null
      }
      const results = agentManager.searchAgents(name)
      if (results.length === 0) {
        onDone(`No agent found matching "${name}". Use /more agents to list available agents.`, { display: 'system' })
        return null
      }
      const match = results[0]
      setSelectedAgentId(match.id)
      onDone(`Selected agent: ${match.emoji || '🧠'} ${match.name}\n${match.description}`, { display: 'system' })
      return null
    }

    if (action === 'clear') {
      setSelectedAgentId(null)
      onDone('Agent selection cleared. Using default persona.', { display: 'system' })
      return null
    }

    const selectedId = getSelectedAgentId()
    const selected = selectedId ? agentManager.getAgentById(selectedId) : null
    const selectedLine = selected
      ? `Currently selected: ${selected.emoji || '🧠'} ${selected.name}\n`
      : 'No agent selected (using default persona)\n'

    const byCat: Record<string, string[]> = {}
    for (const a of allAgents) {
      if (!byCat[a.category]) byCat[a.category] = []
      const marker = a.id === selectedId ? ' ←' : ''
      byCat[a.category].push(`  ${a.emoji || '🤖'} ${a.name}${marker}`)
    }

    const lines: string[] = []
    for (const [cat, names] of Object.entries(byCat)) {
      lines.push(`${cat.toUpperCase()}\n${names.slice(0, 10).join('\n')}${names.length > 10 ? `  ...+${names.length - 10} more` : ''}`)
    }

    onDone(
      `Agent Profiles (${allAgents.length}):\n\n` +
      `${selectedLine}\n` +
      lines.join('\n\n') +
      `\n\nUsage:\n` +
      `  /more agents use <name>  — select an agent\n` +
      `  /more agents clear       — clear selection`,
      { display: 'system' }
    )
    return null
  }

  onDone(
    'More commands:\n' +
    '/more mcp          — list and manage MCP servers\n' +
    '/more mcp enable <name>  — enable an MCP server\n' +
    '/more mcp disable <name> — disable a manually-enabled MCP server\n\n' +
    '/more agents       — list all 162 expert agent profiles\n' +
    '/more agents use <name>  — select an agent persona\n' +
    '/more agents clear       — clear agent selection',
    { display: 'system' }
  )
  return null
}
