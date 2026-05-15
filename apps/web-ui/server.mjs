#!/usr/bin/env node
/**
 * CORTEX Web UI — localhost dashboard.
 *
 * Endpoints:
 *   GET  /                    → dashboard page
 *   GET  /api/status          → { agents, commands, mcps, rag, env }
 *   GET  /api/commands        → [{ name, aliases, description, tier }]
 *   GET  /api/agents          → [{ name, path, kind }]
 *   GET  /api/mcp             → { servers: [{name, cmd, configured}] }
 *   POST /api/ask  {prompt}   → streams AGI output via SSE
 *   WS   /ws                  → live session events (ask start/chunk/done)
 *
 * No build step, no framework — plain ESM, Express + ws, ~300 LoC.
 */
import express from 'express'
import { WebSocketServer } from 'ws'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const AGI_BIN = path.join(REPO_ROOT, 'cortex.mjs')
const PORT = Number(process.env.CORTEX_WEB_PORT || 3738)

// ─── Load .env ─────────────────────────────────────────────
;(() => {
  const p = path.join(REPO_ROOT, '.env')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
})()

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// ─── Discovery helpers ─────────────────────────────────────
function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
}

function listCommands() {
  // Scan src/commands/tier*/*.ts for name + description
  const out = []
  const tiersDir = path.join(REPO_ROOT, 'src', 'commands')
  if (!fs.existsSync(tiersDir)) return out
  for (const tier of fs.readdirSync(tiersDir)) {
    const dir = path.join(tiersDir, tier)
    if (!fs.statSync(dir).isDirectory()) continue
    if (!tier.startsWith('tier')) continue
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
      const name = src.match(/name:\s*['"]([^'"]+)['"]/)?.[1]
      const aliases = src.match(/aliases:\s*\[([^\]]+)\]/)?.[1]?.match(/'([^']+)'/g)?.map(s => s.slice(1, -1)) || []
      const desc = src.match(/description:\s*(?:\n\s*)?['"]([^'"]+)['"]/)?.[1] || ''
      if (name) out.push({ name, aliases, description: desc, tier })
    }
  }
  return out
}

function listAgents() {
  const agentsDir = path.join(REPO_ROOT, 'src', 'skills', 'agency')
  if (!fs.existsSync(agentsDir)) return []
  const out = []
  function walk(d, depth = 0) {
    if (depth > 4) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p, depth + 1)
      else if (e.name.endsWith('.md') || e.name.endsWith('.ts') || e.name.endsWith('.json')) {
        out.push({
          name: e.name.replace(/\.[^.]+$/, ''),
          path: path.relative(REPO_ROOT, p),
          kind: e.name.split('.').pop(),
        })
      }
    }
  }
  walk(agentsDir)
  return out.slice(0, 500)
}

function listMcpServers() {
  const mcp = readJSON(path.join(REPO_ROOT, '.mcp.json')) || { mcpServers: {} }
  return Object.entries(mcp.mcpServers || {}).map(([name, cfg]) => {
    const envs = Object.keys(cfg.env || {})
    const configured = envs.every(k => !!process.env[k])
    return { name, cmd: [cfg.command, ...(cfg.args || [])].join(' '), envs, configured }
  })
}

// ─── API ───────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
  const commands = listCommands()
  const agents = listAgents()
  const mcps = listMcpServers()
  res.json({
    env: {
      hfToken: !!process.env.HF_TOKEN,
      model: process.env.HF_MODEL_ID || 'zai-org/GLM-5:together',
      github: !!process.env.GITHUB_TOKEN,
      ollama: !!process.env.OLLAMA_HOST || fs.existsSync('/usr/local/bin/ollama') || fs.existsSync('/opt/homebrew/bin/ollama'),
    },
    counts: { commands: commands.length, agents: agents.length, mcps: mcps.length },
    repo: REPO_ROOT,
    pid: process.pid,
    uptime: process.uptime(),
  })
})

app.get('/api/commands', (_req, res) => res.json(listCommands()))
app.get('/api/agents', (_req, res) => res.json(listAgents()))
app.get('/api/mcp', (_req, res) => res.json({ servers: listMcpServers() }))

// History (simple file-backed log)
const HISTORY_FILE = path.join(REPO_ROOT, 'data', 'web-ui-history.jsonl')
fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true })
app.get('/api/history', (_req, res) => {
  if (!fs.existsSync(HISTORY_FILE)) return res.json([])
  const lines = fs.readFileSync(HISTORY_FILE, 'utf8').trim().split('\n').filter(Boolean)
  res.json(lines.slice(-50).reverse().map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean))
})

// Puter.js proxy endpoint - simplified
// Store pending requests for browser to pick up
const pendingRequests = new Map()

// Use broadcast to notify browser via SSE-like mechanism
function notifyBrowser(prompt, model) {
  const requestId = Date.now().toString()
  
  // Store pending request
  const promise = new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { 
      resolve, 
      reject, 
      timeout: setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new Error('Puter request timeout (45s)'))
      }, 45000) 
    })
  })
  
  // Broadcast to all connected sockets
  broadcast({ type: 'puter-request', prompt, model: model || 'claude-sonnet-4-6', id: requestId })
  
  return { promise, requestId }
}

app.post('/api/puter', async (req, res) => {
  try {
    const { prompt, model } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt required' })

    console.log('[Puter] Got request, prompt:', prompt.slice(0, 30), 'sockets:', sockets.size)
    
    // Broadcast request to all sockets
    const { promise, requestId } = notifyBrowser(prompt, model)
    console.log('[Puter] Waiting for response, requestId:', requestId)
    
    // Wait for response
    const result = await promise
    console.log('[Puter] Got response, text:', result.text?.slice(0, 50))
    res.json(result)
  } catch (error) {
    console.log('[Puter] Error:', error.message)
    res.status(500).json({ error: String(error.message || error) })
  }
})

// Browser calls this to submit Puter response
app.post('/api/puter-response', (req, res) => {
  const { id, text, error, type } = req.body
  console.log('[Puter] Received response from browser:', type, id, 'text length:', text?.length || 0)
  
  const pending = pendingRequests.get(id)
  if (pending) {
    const { resolve, reject, timeout } = pending
    clearTimeout(timeout)
    pendingRequests.delete(id)
    
    console.log('[Puter] Resolving promise for:', id)
    
    if (type === 'puter-response') {
      resolve({ text: text || '' })
    } else {
      reject(new Error(error || 'Unknown error'))
    }
  } else {
    console.log('[Puter] Warning: no pending request for id:', id, 'pending keys:', [...pendingRequests.keys()])
  }
  
  res.json({ ok: true })
})

// Direct OpenRouter API call for chat
app.post('/api/ask', async (req, res) => {
  const prompt = String(req.body?.prompt || '').slice(0, 4000)
  if (!prompt) return res.status(400).json({ error: 'prompt required' })
  
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  const start = Date.now()
  
  send('start', { prompt, ts: start })
  
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || ''
  const baseUrl = (process.env.CORTEX_GROQ_FALLBACK_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '')
  const model = process.env.CORTEX_GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b'
  
  if (!apiKey) {
    send('error', { text: 'No API key configured. Set GROQ_API_KEY or OPENAI_API_KEY in .env' })
    res.end()
    return
  }
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/gokulvenkatareddy/cortex',
        'X-Title': 'GOKUL-CORTEX'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are GOKUL-CORTEX, an autonomous AI assistant. Respond concisely and helpfully.' },
          { role: 'user', content: prompt }
        ],
        stream: true,
        max_tokens: 4096
      })
    })
    
    if (!response.ok) {
      const errText = await response.text()
      send('error', { text: `API Error: ${response.status} - ${errText}` })
      res.end()
      return
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''
    
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value, { stream: true })
      fullResponse += chunk
      
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              send('chunk', { text: content })
            }
          } catch {}
        }
      }
    }
    
    const ms = Date.now() - start
    send('done', { code: 0, ms, chars: fullResponse.length })
    
  } catch (err) {
    send('error', { text: `Error: ${err.message}` })
  }
  
  res.end()
})

// ─── WebSocket broadcast ───────────────────────────────────
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })
const sockets = new Set()
wss.on('connection', (ws) => {
  sockets.add(ws)
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }))
  ws.on('close', () => sockets.delete(ws))
})
function broadcast(msg) {
  const s = JSON.stringify(msg)
  console.log(`[Broadcast] sending to ${sockets.size} sockets:`, msg.type, msg.id)
  for (const ws of sockets) { 
    try { 
      ws.send(s) 
      console.log('[Broadcast] sent to one socket')
    } catch (e) { 
      console.log('[Broadcast] error:', e.message)
    } 
  }
}

server.listen(PORT, () => {
  console.log(`\n🧠  CORTEX Dashboard  →  http://localhost:${PORT}\n`)
  if (process.env.CORTEX_AUTO_OPEN !== 'false') {
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start'
      : 'xdg-open'
    spawn(opener, [`http://localhost:${PORT}`], { detached: true, stdio: 'ignore' }).unref()
  }
})
