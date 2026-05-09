/**
 * CORTEX JARVIS — With command execution
 */
const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron')
const { spawn, exec } = require('child_process')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
let win = null

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    x: Math.floor((sw - 1000) / 2),
    y: Math.floor((sh - 700) / 2),
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
    { label: 'Clear', click: () => win.webContents.send('clear') },
    { label: 'Quit', click: () => app.quit() }
  ])
  Menu.setApplicationMenu(menu)

  win.on('closed', () => { win = null })
  console.log('JARVIS window created')
  return win
}

// Detect if line is CLI noise (preflight, QR, session info) vs AI response
function isCLINoise(line) {
  const noisePatterns = [
    '┌─', '│', '└─',     // Box drawing (preflight)
    'CORTEX preflight',
    'shared session',
    'Session ID:',
    'Share this:',
    'Local:',
    'LAN:',
    'QR:',
    'Opening host',
    'Opened Cortex',
    'venv:',
    'octogent:',
    'logs:',
    '✦', '█',           // ASCII art / boxes
    'scope:',           // Session scope
    'rotates every',    // Session info
    'session ready',
    '/share stop',
    '/share to re-show',
    'cwd:',
    'API provider:',
    'OpenAI base URL:',
    'Model:',
    'Version:',
    'Session name:',
    'Error: Input must be provided',
    'http://127.0.0.1',
    'http://10.146',
    'lhr.life',
    'Running first-time',
    'Welcome to CORTEX'
  ]
  return noisePatterns.some(p => line.includes(p)) || /^\s*[▀▄▀█▄▀]/.test(line)
}

// Extract clean AI response from CORTEX output
function extractCleanResponse(fullOutput) {
  const lines = fullOutput.split('\n')
  const cleanLines = []
  let inCleanResponse = false
  
  for (const line of lines) {
    // Skip CLI noise
    if (isCLINoise(line)) continue
    
    // Start capturing after CLI noise ends
    if (!inCleanResponse && line.trim().length > 0 && !line.startsWith('❯')) {
      inCleanResponse = true
    }
    
    if (inCleanResponse && line.trim()) {
      cleanLines.push(line)
    }
  }
  
  return cleanLines.join('\n').trim() || 'Command completed.'
}

ipcMain.handle('run-command', (event, cmd) => {
  return new Promise((resolve) => {
    let fullOutput = ''
    
    const cortex = spawn('bun', ['run', 'cortex.mjs', '--', cmd], {
      cwd: REPO_ROOT,
      env: { 
        ...process.env, 
        FORCE_COLOR: 'true', 
        CORTEX_SIMPLE: '1',
        CORTEX_NO_OPEN: '1',   // Prevent browser opens
        OCTOGENT_NO_OPEN: '1'  // Prevent Octogent browser open
      }
    })

    // Send ALL raw CLI output to activity/terminal (NOT to chat)
    cortex.stdout.on('data', (data) => {
      const text = data.toString()
      fullOutput += text
      if (win) win.webContents.send('activity', text)  // All logs → activity
    })

    cortex.stderr.on('data', (data) => {
      const text = data.toString()
      fullOutput += text
      if (win) win.webContents.send('activity', text)  // All logs → activity
    })

    cortex.on('close', (code) => {
      // Extract clean response for chat
      const cleanResponse = extractCleanResponse(fullOutput)
      if (win) win.webContents.send('response', cleanResponse)  // Only clean response → chat
      resolve(fullOutput)
    })
  })
})

app.whenReady().then(() => {
  createWindow()
  
  // Pre-launch Octogent silently (no browser open)
  const octoPath = path.join(REPO_ROOT, 'bin', 'cortex-octogent')
  const octoDist = path.join(REPO_ROOT, 'apps', 'octogent', 'dist', 'api', 'cli.js')
  if (require('fs').existsSync(octoPath) && require('fs').existsSync(octoDist)) {
    spawn('node', [octoPath], {
      cwd: REPO_ROOT,
      detached: true,
      stdio: 'ignore',
      env: { 
        ...process.env, 
        CORTEX_ALLOW_OPEN: '1',
        OCTOGENT_NO_OPEN: '1'  // Prevent browser opens
      }
    }).unref()
    if (win) win.webContents.send('activity', '🚀 Octogent starting in background...\n')
  }
  
  // Show access info in activity
  if (win) {
    win.webContents.send('activity', '📍 Access URLs:\n')
    win.webContents.send('activity', '   Octogent: http://127.0.0.1:8787\n')
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

console.log('CORTEX JARVIS ready')