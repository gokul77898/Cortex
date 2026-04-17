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
    return { error: `AGI binary not found at ${AGI_BIN}` }
  }
  return new Promise((resolve) => {
    const child = spawn(
      AGI_BIN,
      ['-p', '--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', prompt],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, CORTEX_NONINTERACTIVE: '1' },
      },
    )
    let out = ''
    let err = ''
    // 10 min — AGI may be doing tool loops, file reads, web fetches, etc.
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ error: 'AGI timed out after 600s', partial: stripAnsi(out).trim() })
    }, 600_000)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      out += text
      if (win) win.webContents.send('agi:chunk', text)
    })
    child.stderr.on('data', (chunk) => { err += chunk.toString() })
    child.on('close', (code) => {
      clearTimeout(timer)
      const cleaned = stripAnsi(out).trim()
      if (code === 0 || cleaned) resolve({ text: cleaned })
      else resolve({ error: err.trim() || `exit ${code}`, text: cleaned })
    })
  })
})

// ─── IPC: Fast chat (direct HF router, <2s) ──────────────────────
// Bypasses the whole CLI boot. No tools, no MCP — just a blazing fast
// chat completion for conversation / Q&A. Perfect for the UI's default mode.
function hfChat({ messages, model, stream = false, onChunk }) {
  return new Promise((resolve, reject) => {
    const token = process.env.HF_TOKEN
    if (!token) return reject(new Error('HF_TOKEN not set'))
    const base = process.env.HF_BASE_URL || 'https://router.huggingface.co/v1'
    const url = new URL(base.replace(/\/$/, '') + '/chat/completions')
    const body = JSON.stringify({
      model: model || process.env.HF_MODEL_ID || 'zai-org/GLM-5:together',
      messages,
      stream,
      max_tokens: 1024,
      temperature: 0.4,
    })
    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let buf = ''
        res.on('data', (c) => {
          const s = c.toString()
          buf += s
          if (stream && onChunk) {
            // Parse SSE frames
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const payload = line.slice(6).trim()
              if (payload === '[DONE]') continue
              try {
                const j = JSON.parse(payload)
                const delta = j.choices?.[0]?.delta?.content
                if (delta) onChunk(delta)
              } catch { /* partial frame */ }
            }
          }
        })
        res.on('end', () => {
          if (stream) return resolve({ ok: true })
          try {
            const j = JSON.parse(buf)
            if (j.error) return reject(new Error(j.error.message || JSON.stringify(j.error)))
            resolve({ text: j.choices?.[0]?.message?.content || '' })
          } catch (e) { reject(new Error('Bad JSON from HF: ' + buf.slice(0, 200))) }
        })
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

ipcMain.handle('agi:fastAsk', async (_evt, { prompt, context }) => {
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are CORTEX, a concise, helpful AGI assistant running on the user\'s Mac. ' +
          'You can see what the user is doing on their screen via a live screen-watcher. ' +
          'Be direct, practical, and brief unless asked for detail. ' +
          'If the user asks about their current task, use the screen context.',
      },
    ]
    if (context) {
      messages.push({
        role: 'system',
        content: `Current screen context (auto-captured): ${context}`,
      })
    }
    messages.push({ role: 'user', content: prompt })
    await hfChat({
      messages,
      stream: true,
      onChunk: (d) => win && win.webContents.send('agi:chunk', d),
    })
    return { text: '__streamed__' }
  } catch (e) {
    return { error: String(e.message || e) }
  }
})

// ─── IPC: screen capture + describe (Tier A — watch my desktop) ──
ipcMain.handle('screen:snapshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1024, height: 640 },
    })
    if (!sources.length) return { error: 'no screen sources' }
    // Prefer the primary display
    const src = sources[0]
    return { dataUrl: src.thumbnail.toDataURL(), name: src.name }
  } catch (e) {
    return { error: String(e.message || e) }
  }
})

ipcMain.handle('screen:describe', async (_evt, { dataUrl }) => {
  try {
    const token = process.env.HF_TOKEN
    if (!token) return { error: 'HF_TOKEN not set' }
    // Use a vision-capable model. User can override via CORTEX_VISION_MODEL.
    const model = process.env.CORTEX_VISION_MODEL || 'meta-llama/Llama-3.2-11B-Vision-Instruct'
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Describe what is on this screen in 2-3 short sentences. ' +
              'Focus on: the active app, the task the user appears to be doing, ' +
              'any visible errors or dialogs. Be concrete (app names, file names, error text).',
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ]
    const res = await hfChat({ messages, model, stream: false })
    return { text: (res.text || '').trim() }
  } catch (e) {
    return { error: String(e.message || e) }
  }
})

ipcMain.handle('window:close', () => win && win.close())
ipcMain.handle('window:minimize', () => win && win.minimize())
ipcMain.handle('window:pin', (_e, pinned) => {
  if (win) win.setAlwaysOnTop(Boolean(pinned), 'floating')
  return Boolean(pinned)
})

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '')
}

app.whenReady().then(() => {
  createWindow()

  // Global hotkey: Cmd+Shift+A to toggle window
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (!win) return createWindow()
    if (win.isVisible()) win.hide(); else win.show()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => globalShortcut.unregisterAll())
