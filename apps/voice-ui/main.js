/**
 * CORTEX Voice UI — Electron main process.
 * Creates a small, always-on-top floating window and handles IPC
 * between the renderer and the AGI CLI (cortex.mjs).
 */
const { app, BrowserWindow, ipcMain, screen, globalShortcut, desktopCapturer } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const https = require('node:https')
const http = require('node:http')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const AGI_BIN = path.join(REPO_ROOT, 'cortex.mjs')

// Load .env so HF_TOKEN etc. are available when we spawn cortex.mjs
function loadDotenv() {
  const envPath = path.join(REPO_ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadDotenv()

let win = null

// ─── Structured logger (streamed to renderer + stderr) ──────────
// Each call becomes a bubble in the UI log panel AND a line in the
// terminal where you launched `./bin/AGI-ui`, so you always see what
// the app is doing — exactly like watching the CLI.
function log(level, stage, msg, extra) {
  const ts = new Date().toISOString().slice(11, 23)
  const line = `[${ts}] ${level.toUpperCase().padEnd(5)} ${stage.padEnd(14)} ${msg}`
  // Main-process console → terminal (handle EPIPE during shutdown)
  try {
    process.stderr.write(line + (extra ? '  ' + JSON.stringify(extra) : '') + '\n')
  } catch (e) {
    // Ignore EPIPE during shutdown
  }
  // Renderer → UI log panel
  if (win && !win.isDestroyed()) {
    win.webContents.send('log:event', { ts, level, stage, msg, extra })
  }
}


function createWindow() {
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize
  win = new BrowserWindow({
    width: 420,
    height: 560,
    x: sw - 440,
    y: 20,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: true,
    skipTaskbar: false,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  win.loadFile('index.html')
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true)
}

// ─── IPC: full AGI CLI (slow but has tools/MCP/full brain) ───────
// Runs with --dangerously-skip-permissions so NO yes/no prompts ever block.
ipcMain.handle('agi:ask', async (_evt, prompt) => {
  if (!fs.existsSync(AGI_BIN)) {
    log('error', 'agi.spawn', `binary missing at ${AGI_BIN}`)
    return { error: `AGI binary not found at ${AGI_BIN}` }
  }
  const argv = ['-p', '--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', prompt]
  log('info', 'agi.spawn', `cortex.mjs ${argv.slice(0, 4).join(' ')}  <prompt ${prompt.length} chars>`)
  const t0 = Date.now()
  return new Promise((resolve) => {
    const child = spawn(AGI_BIN, argv, {
      cwd: REPO_ROOT,
      env: { ...process.env },
    })
    log('info', 'agi.pid', `pid=${child.pid}`)
    let out = ''
    let err = ''
    let stderrLines = 0
    // 10 min — AGI may be doing tool loops, file reads, web fetches, etc.
    const timer = setTimeout(() => {
      log('warn', 'agi.timeout', '600s exceeded, killing child')
      child.kill('SIGTERM')
      resolve({ error: 'AGI timed out after 600s', partial: stripAnsi(out).trim() })
    }, 600_000)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      out += text
      if (win) win.webContents.send('agi:chunk', text)
    })
    child.stderr.on('data', (chunk) => {
      const s = chunk.toString()
      err += s
      // Surface the first ~20 stderr lines so users see progress
      if (stderrLines < 20) {
        for (const ln of s.split('\n').filter(Boolean)) {
          if (stderrLines++ >= 20) break
          log('debug', 'agi.stderr', stripAnsi(ln).slice(0, 200))
        }
      }
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const cleaned = stripAnsi(out).trim()
      const ms = Date.now() - t0
      log('info', 'agi.done', `exit=${code} ${ms}ms out=${cleaned.length}ch`)
      if (code === 0 || cleaned) resolve({ text: cleaned })
      else resolve({ error: err.trim() || `exit ${code}`, text: cleaned })
    })
  })
})

// ─── IPC: Fast chat with OpenRouter free models ──────────────────────
async function openrouterChat(opts) {
  const { messages, onChunk, stage = 'or.chat' } = opts
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY not set')
  
  // Auto-select model based on prompt
  const lastMsg = messages[messages.length - 1]?.content || ''
  const hasImage = typeof lastMsg === 'string' && lastMsg.includes('data:image')
  let model = 'minimax/minimax-m2.5:free'
  
  // Vision models for screen seeing
  if (hasImage || lastMsg.toLowerCase().includes('screen') || lastMsg.toLowerCase().includes('screenshot')) {
    // Gemma is often rate-limited, use Nemotron instead
    model = 'nvidia/nemotron-nano-12b-v2-vl:free'
    log('info', stage, 'Auto-selected vision model (Nemotron)')
  }
  
  const body = JSON.stringify({
    model,
    messages,
    stream: false,
    max_tokens: 4096,
  })
  
  const t0 = Date.now()
  log('info', stage, `OpenRouter model=${model}`)
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://cortex.dev',
      'X-Title': 'CORTEX',
    },
    body,
  })
  
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter HTTP ${response.status}: ${err.slice(0, 100)}`)
  }
  
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  log('info', stage, `done ${Date.now() - t0}ms chars=${text.length}`)
  return { text }
}

ipcMain.handle('agi:fastAsk', async (_evt, { prompt, context }) => {
  log('info', 'fast.ask', `prompt="${prompt.slice(0, 60)}"${context ? ' +screen-ctx' : ''}`)
  const sys = 'You are CORTEX, a concise, helpful AI assistant. Be direct and brief.'
  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: context ? `${context}\n\n${prompt}` : prompt },
  ]

  try {
    const res = await openrouterChat({ messages, stage: 'fast.ask' })
    if (res.text && win && !win.isDestroyed()) {
      win.webContents.send('agi:chunk', res.text)
      return { text: '__streamed__' }
    }
    throw new Error('empty response')
  } catch (e) {
    log('error', 'fast.ask', `OpenRouter failed: ${e.message}`)
    return { error: e.message }
  }
})

// ─── IPC: screen capture + describe (Tier A — watch my desktop) ──
ipcMain.handle('screen:snapshot', async () => {
  const t0 = Date.now()
  try {
    log('info', 'screen.snap', 'capturing...')
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    if (!sources.length) throw new Error('No screen sources found')
    const source = sources[0]
    log('info', 'screen.snap', `source: ${source.name} ${source.thumbnail_size}`)
    const dataUrl = source.thumbnail.toDataURL()
    log('info', 'screen.snap', `captured "Entire screen" ${Math.round(dataUrl.length / 1024)}KB in ${Date.now() - t0}ms`)
    return { dataUrl }
  } catch (e) {
    log('error', 'screen.snap', String(e.message || e))
    return { error: String(e.message || e) }
  }
})

ipcMain.handle('screen:snap', async () => {
  try {
    log('info', 'screen.snap', 'capturing...')
    const t0 = Date.now()
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
    if (!sources.length) throw new Error('No screen sources found')
    const source = sources[0]
    if (!source.thumbnail) throw new Error('No thumbnail in source')
    const thumbnail = source.thumbnail
    // Downscale to max 512px for vision API (avoids 413 errors)
    const resized = thumbnail.resize({ width: 512, height: 512 })
    const dataUrl = resized.toDataURL('image/jpeg', 0.7)
    if (!dataUrl || dataUrl.length < 100) throw new Error('Empty screenshot')
    log('info', 'screen.snap', `captured "Entire screen" ${Math.round(dataUrl.length / 1024)}KB in ${Date.now() - t0}ms`)
    return { dataUrl }
  } catch (e) {
    log('error', 'screen.snap', String(e.message || e))
    return { error: String(e.message || e) }
  }
})

ipcMain.handle('screen:describe', async (_evt, { dataUrl }) => {
  try {
    const t0 = Date.now()
    // Extract base64 (strip "data:image/...;base64," prefix)
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
    
    // Use OpenRouter free vision model (default: gemma-4-26b-a4b-it:free)
    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (!openrouterKey) {
      return { error: 'OPENROUTER_API_KEY not set in .env' }
    }
    
    const visionModel = process.env.CORTEX_VISION_MODEL || 'google/gemma-4-26b-a4b-it:free'
    
    log('info', 'screen.vision', `OpenRouter vision model=${visionModel}`)
    
    // Build multimodal message for vision model
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://cortex.dev',
        'X-Title': 'CORTEX',
      },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
              { type: 'text', text: 'Describe what is on this screen in 2-3 short sentences. Focus on: the active app, what the user is doing, any visible errors. Be concrete (app names, file names, error text).' }
            ]
          }
        ],
        max_tokens: 512,
      }),
    })
    
    const firstByte = Date.now() - t0
    log('info', 'screen.vision', `first-byte ${firstByte}ms`)
    
    if (!response.ok) {
      const err = await response.text().catch(() => '')
      log('error', 'screen.vision', `HTTP ${response.status} ${err.slice(0, 200)}`)
      return { error: `OpenRouter HTTP ${response.status}: ${err.slice(0, 100)}` }
    }
    
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    log('info', 'screen.vision', `done ${Date.now() - t0}ms chars=${text.length}`)
    return { text }
  } catch (e) {
    log('error', 'screen.vision', String(e.message || e))
    return { error: `Vision failed: ${e.message}` }
  }
})

ipcMain.handle('window:close', () => win && win.close())
ipcMain.handle('window:minimize', () => win && win.minimize())
ipcMain.handle('window:pin', (_e, pinned) => {
  if (win) win.setAlwaysOnTop(Boolean(pinned), 'floating')
  return Boolean(pinned)
})
ipcMain.handle('window:maximize', () => {
  if (!win) return false
  if (win.isMaximized()) { win.unmaximize(); return false }
  win.maximize(); return true
})
ipcMain.handle('window:fullscreen', () => {
  if (!win) return false
  const next = !win.isFullScreen()
  win.setFullScreen(next)
  return next
})

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '')
}

app.whenReady().then(() => {
  createWindow()
  log('info', 'app.ready', `electron=${process.versions.electron} node=${process.versions.node} repo=${REPO_ROOT}`)
  log('info', 'app.env', `OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY ? 'set' : 'MISSING'}`)

  // Global hotkey: Cmd+Shift+A to toggle window from anywhere
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (!win) return createWindow()
    if (win.isVisible()) win.hide(); else win.show()
  })

  // Global hotkey: Cmd+E to show/focus the window
  globalShortcut.register('CommandOrControl+E', () => {
    if (!win) return createWindow()
    if (!win.isVisible()) win.show()
    win.focus()
  })

  // Global hotkey: Cmd+Shift+F to toggle fullscreen
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (win) win.setFullScreen(!win.isFullScreen())
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
