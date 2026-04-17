/**
 * CORTEX Voice UI — Electron main process.
 * Creates a small, always-on-top floating window and handles IPC
 * between the renderer and the AGI CLI (cortex.mjs).
 */
const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

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

// ─── IPC: renderer asks AGI a question ───────────────────────────
ipcMain.handle('agi:ask', async (_evt, prompt) => {
  if (!fs.existsSync(AGI_BIN)) {
    return { error: `AGI binary not found at ${AGI_BIN}` }
  }
  return new Promise((resolve) => {
    const child = spawn(AGI_BIN, ['-p', prompt], {
      cwd: REPO_ROOT,
      env: { ...process.env },
    })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ error: 'AGI timed out after 180s', partial: out })
    }, 180_000)

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
