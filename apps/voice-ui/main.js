/**
 * CORTEX JARVIS — Simplified persistent session
 */
const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
let win = null
let cortexProcess = null

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    x: Math.floor((sw - 1200) / 2),
    y: Math.floor((sh - 800) / 2),
    backgroundColor: '#0d0d12',
    title: 'CORTEX JARVIS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile(path.join(__dirname, 'index.html'))

  const menu = Menu.buildFromTemplate([
    { label: 'CORTEX JARVIS', enabled: false },
    { type: 'separator' },
    { label: 'Clear Chat', click: () => win.webContents.send('clear') },
    { label: 'Clear Activity', click: () => win.webContents.send('clear-activity') },
    { type: 'separator' },
    { label: 'Restart CORTEX', click: () => startCortex() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  Menu.setApplicationMenu(menu)

  win.on('closed', () => { win = null })
  console.log('JARVIS window created')
  return win
}

function isTerminalNoise(line) {
  const patterns = [
    '┌─', '│', '└─', '║', '╚', '╔', '═', '▀', '▄', '█',
    'CORTEX preflight', 'shared session', 'Session ID:', 'Share this:',
    'Local:', 'LAN:', 'QR:', 'scope:', 'rotates every', 'session ready',
    '/share stop', '/share to re-show', 'cwd:', 'API provider:',
    'OpenAI base URL:', 'Model:', 'Version:', 'Session name:',
    'venv:', 'octogent:', 'logs:', 'http://127.0.0.1', 'http://10.146',
    'lhr.life', 'Octogent is running', 'Project:', 'Name:', 'API:', 'UI:',
    'preflight', 'Ready - FULL SWARM', '● shared session', '🌐',
    '✦ Mission', 'Running first-time', 'Welcome to CORTEX'
  ]
  return patterns.some(p => line.includes(p)) || /^[▀▄▀█▄▀║╚╗╔═■◆●]/.test(line)
}

function extractAIResponse(fullOutput) {
  const lines = fullOutput.split('\n')
  const clean = []
  let started = false
  for (const line of lines) {
    if (isTerminalNoise(line)) continue
    if (!started && !line.trim()) continue
    if (line.startsWith('❯') || line.startsWith('> ')) continue
    started = true
    if (line.trim()) clean.push(line)
  }
  return clean.join('\n').trim() || 'Done.'
}

function startCortex() {
  if (cortexProcess) {
    try { cortexProcess.kill() } catch {}
  }
  
  if (win) win.webContents.send('activity', '\n🚀 Starting CORTEX...\n')
  
  // Use shell: true to keep process alive
  cortexProcess = spawn('bash', ['-c', 'cd ' + REPO_ROOT + ' && bun run cortex.mjs'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      FORCE_COLOR: 'true',
      CORTEX_SIMPLE: '1',
      CORTEX_NO_OPEN: '1',
      OCTOGENT_NO_OPEN: '1'
    }
  })

  cortexProcess.stdout.on('data', (data) => {
    if (win) win.webContents.send('activity', data.toString())
  })

  cortexProcess.stderr.on('data', (data) => {
    if (win) win.webContents.send('activity', data.toString())
  })

  cortexProcess.on('close', (code) => {
    if (win) win.webContents.send('activity', `\nCORTEX exited (${code})\n`)
  })

  cortexProcess.on('error', (err) => {
    if (win) win.webContents.send('activity', `\nError: ${err.message}\n`)
  })
}

ipcMain.handle('run-command', async (event, cmd) => {
  if (!cortexProcess || !cortexProcess.stdin) {
    if (win) win.webContents.send('assistant_message', 'CORTEX not running. Use menu to restart.')
    return 'error'
  }

  let output = ''
  
  const onData = (data) => {
    const text = data.toString()
    output += text
    if (win) win.webContents.send('activity', text)
  }
  
  cortexProcess.stdout.on('data', onData)
  cortexProcess.stderr.on('data', onData)

  cortexProcess.stdin.write(cmd + '\n')

  setTimeout(() => {
    cortexProcess.stdout.removeListener('data', onData)
    cortexProcess.stderr.removeListener('data', onData)
    const response = extractAIResponse(output)
    if (win) win.webContents.send('assistant_message', response)
  }, 4000)
})

ipcMain.handle('restart-cortex', () => {
  startCortex()
  return 'restarting'
})

app.whenReady().then(() => {
  createWindow()
  startCortex()
  
  // Pre-launch Octogent
  const fs = require('fs')
  const op = path.join(REPO_ROOT, 'bin', 'cortex-octogent')
  const od = path.join(REPO_ROOT, 'apps', 'octogent', 'dist', 'api', 'cli.js')
  if (fs.existsSync(op) && fs.existsSync(od)) {
    spawn('node', [op], {
      cwd: REPO_ROOT,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, CORTEX_ALLOW_OPEN: '1', OCTOGENT_NO_OPEN: '1' }
    }).unref()
    if (win) win.webContents.send('activity', '🚀 Octogent ready\n')
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (cortexProcess) cortexProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

console.log('CORTEX JARVIS ready')