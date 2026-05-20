import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface RawMcpServerConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
}

interface McpToolInfo {
  name: string
  description: string
  inputSchema: any
  serverName: string
}

interface ConnectedServer {
  client: Client
  config: RawMcpServerConfig
}

class McpManager {
  private servers = new Map<string, ConnectedServer>()
  private _tools: McpToolInfo[] = []
  private _connected = false
  private _connecting = false

  get status(): string {
    const byServer = new Map<string, number>()
    for (const t of this._tools) {
      byServer.set(t.serverName, (byServer.get(t.serverName) || 0) + 1)
    }
    const details = [...byServer.entries()]
      .map(([s, c]) => `${s}(${c})`)
      .join(', ')
    return `${this.servers.size} servers, ${this._tools.length} tools — ${details}`
  }

  get toolCount(): number {
    return this._tools.length
  }

  get serverCount(): number {
    return this.servers.size
  }

  get connected(): boolean {
    return this._connected
  }

  async connectAll(): Promise<void> {
    if (this._connecting || this._connected) return
    this._connecting = true

    try {
      const paths = [
        join(process.cwd(), '.mcp.json'),
        join(process.env.HOME || '', '.cortex', '.mcp.json'),
      ]

      let configPath = ''
      for (const p of paths) {
        if (existsSync(p)) { configPath = p; break }
      }

      if (!configPath) {
        console.error('[DAEMON MCP] No .mcp.json found')
        return
      }

      const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as {
        mcpServers: Record<string, RawMcpServerConfig>
      }
      const entries = Object.entries(raw.mcpServers || {})
      console.log(`[DAEMON MCP] ${entries.length} servers configured in ${configPath}`)

      const batchSize = 5
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        await Promise.allSettled(
          batch.map(([name, config]) => this.connectSingle(name, config))
        )
      }

      this._tools = []
      for (const [name, server] of this.servers) {
        try {
          const result: any = await server.client.request(
            { method: 'tools/list' },
            { validate: (v: any) => v }
          )
          for (const tool of result.tools || []) {
            this._tools.push({
              name: `${name}__${tool.name}`,
              description: tool.description || '',
              inputSchema: tool.inputSchema || { type: 'object', properties: {} },
              serverName: name,
            })
          }
        } catch {
          // Server doesn't support tools/list
        }
      }

      this._connected = true
      console.log(`[DAEMON MCP] ✅ Connected: ${this.status}`)
    } finally {
      this._connecting = false
    }
  }

  private expandEnv(val: string): string {
    return val.replace(/\$\{(\w+)\}/g, (_, k) => process.env[k] || '')
  }

  private resolveEnv(env?: Record<string, string>): Record<string, string> {
    if (!env) return {}
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(env)) {
      result[k] = this.expandEnv(v)
    }
    return result
  }

  private async connectSingle(
    name: string,
    config: RawMcpServerConfig
  ): Promise<void> {
    const type = config.type || 'stdio'
    let transport: any

    try {
      if (type === 'stdio') {
        transport = new StdioClientTransport({
          command: config.command || '',
          args: config.args || [],
          env: { ...(process.env as Record<string, string>), ...this.resolveEnv(config.env) },
          stderr: 'pipe',
        })
      } else if (type === 'sse' && config.url) {
        const { SSEClientTransport } = await import(
          '@modelcontextprotocol/sdk/client/sse.js'
        )
        transport = new SSEClientTransport(new URL(config.url))
      } else if (type === 'http' && config.url) {
        const { StreamableHTTPClientTransport } = await import(
          '@modelcontextprotocol/sdk/client/streamableHttp.js'
        )
        transport = new StreamableHTTPClientTransport(new URL(config.url))
      } else {
        console.log(`[MCP] ${name}: unsupported type ${type}, skipping`)
        return
      }

      const client = new Client(
        { name: 'cortex-daemon', version: '1.0.0' },
        { capabilities: {} }
      )

      // 15s connection timeout per server
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('connection timeout (15s)')), 15000)
      )
      await Promise.race([client.connect(transport), timeoutPromise])

      if (type === 'stdio' && transport.stderr) {
        transport.stderr.on('data', (d: Buffer) => {
          const s = d.toString().trim()
          if (s) console.log(`[MCP:${name}] ${s}`)
        })
      }

      this.servers.set(name, { client, config })
      console.log(`[MCP] ✅ ${name}`)
    } catch (e) {
      console.log(`[MCP] ❌ ${name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  getToolSchemas(): any[] {
    return this._tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: (t.description || '').slice(0, 2048),
        parameters: t.inputSchema || { type: 'object', properties: {} },
      },
    }))
  }

  async callTool(name: string, args: any): Promise<string> {
    const sep = name.indexOf('__')
    if (sep === -1) return `Invalid tool name: ${name} (expected server__tool)`

    const serverName = name.slice(0, sep)
    const toolName = name.slice(sep + 2)
    const server = this.servers.get(serverName)

    if (!server) return `Server not connected: ${serverName}`

    try {
      const result: any = await server.client.request(
        {
          method: 'tools/call',
          params: { name: toolName, arguments: args },
        },
        { validate: (v: any) => v }
      )

      const textParts = ((result as any).content || [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)

      if (textParts.length > 0) {
        const joined = textParts.join('\n')
        return joined.length > 50000 ? joined.slice(0, 50000) + '...[truncated]' : joined
      }

      const other = ((result as any).content || []).filter(
        (c: any) => c.type !== 'text'
      )
      return other.length > 0
        ? JSON.stringify(other).slice(0, 50000)
        : '(empty result)'
    } catch (e) {
      return `Error calling ${name}: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [, server] of this.servers) {
      try {
        await server.client.close()
      } catch {}
    }
    this.servers.clear()
    this._tools = []
    this._connected = false
  }
}

export const mcpManager = new McpManager()
