/**
 * CORTEX JARVIS — With persistent session
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
    { label: 'Clear', click: () => win.webContents.send('clear') },
    { label: 'Restart CORTEX', click: () => restartCortex() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  Menu.setApplicationMenu(menu)

  win.on('closed', () => { win = null })
  console.log('JARVIS window created')
  return win
}

// Detect CLI noise vs AI response
function isCLINoise(line) {
  const noisePatterns = [
    '┌─', '│', '└─', '┌─', '║', '╚═',
    'CORTEX preflight',
    'shared session', 'Session ID:', 'Share this:', 'Local:', 'LAN:', 'QR:',
    'Opening host', 'Opened Cortex', 'venv:', 'octogent:', 'logs:',
    '✦', '█', '▀', '▄', '▀', '▀',
    'scope:', 'rotates every', 'session ready', '/share stop', '/share to re-show',
    'cwd:', 'API provider:', 'OpenAI base URL:', 'Model:',
    'Version:', 'Session name:', 'Error: Input must be provided',
    'http://127.0.0.1', 'http://10.146', 'lhr.life',
    'Running first-time', 'Welcome to CORTEX',
    'Octogent is running', 'Project:', 'Name:', 'API:', 'UI:',
    'preflight', 'octogent: ✓'
  ]
  return noisePatterns.some(p => line.includes(p)) || /^\s*[▀▄▀█▄▀║╚╗╔═]/.test(line)
}

// Extract clean AI response
function extractCleanResponse(fullOutput) {
  const lines = fullOutput.split('\n')
  const cleanLines = []
  let inCleanResponse = false
  
  for (const line of lines) {
    if (isCLINoise(line)) continue
    if (!inCleanResponse && line.trim().length > 0 && !line.startsWith('❯')) {
      inCleanResponse = true
    }
    if (inCleanResponse && line.trim()) {
      cleanLines.push(line)
    }
  }
  
  return cleanLines.join('\n').trim() || 'Command completed.'
}

// Start CORTEX once and keep it running
function startCortex() {
  if (cortexProcess) {
    cortexProcess.kill()
  }
  
  // Start CORTEX in interactive mode (no -- flag = interactive REPL)
  cortexProcess = spawn('bun', ['run', 'cortex.mjs'], {
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      FORCE_COLOR: 'true',
      CORTEX_SIMPLE: '1',
      CORTEX_NO_OPEN: '1',
      OCTOGENT_NO_OPEN: '1'
    }
  })

  // Send startup logs to activity
  if (win) {
    win.webContents.send('activity', '🚀 CORTEX starting...\n')
  }

  cortexProcess.stdout.on('data', (data) => {
    const text = data.toString()
    if (win) win.webContents.send('activity', text)
  })

  cortexProcess.stderr.on('data', (data) => {
    const text = data.toString()
    if (win) win.webContents.send('activity', text)
  })

  cortexProcess.on('close', (code) => {
    if (win) win.webContents.send('activity', `\n⚠️ CORTEX closed (code ${code}). Restarting...\n`)
    setTimeout(startCortex, 2000)
  })

  return cortexProcess
}

// Send command to running CORTEX
function sendCommand(cmd) {
  return new Promise((resolve) => {
    if (!cortexProcess || !cortexProcess.stdin) {
      resolve('CORTEX not running. Please restart.')
      return
    }

    let fullOutput = ''
    let responseSent = false

    const onData = (data) => {
      const text = data.toString()
      fullOutput += text
      if (win) win.webContents.send('activity', text)
    }

    cortexProcess.stdout.on('data', onData)
    cortexProcess.stderr.on('data', onData)

    // Give a small delay for initial output to clear
    setTimeout(() => {
      // Send command + newline to execute
      cortexProcess.stdin.write(cmd + '\n')

      // Wait for response (simple timeout-based approach)
      setTimeout(() => {
        cortexProcess.stdout.removeListener('data', onData)
        cortexProcess.stderr.removeListener('data', onData)
        
        const cleanResponse = extractCleanResponse(fullOutput)
        if (win) win.webContents.send('response', cleanResponse)
        resolve(fullOutput)
      }, 3000) // Wait 3 seconds for response
    }, 500)
  })
}

// Restart CORTEX
function restartCortex() {
  if (win) win.webContents.send('activity', '\n🔄 Restarting CORTEX...\n')
  startCortex()
}

// IPC handler for commands
ipcMain.handle('run-command', (event, cmd) => {
  return sendCommand(cmd)
})

// IPC for restart
ipcMain.handle('restart-cortex', () => {
  restartCortex()
  return 'CORTEX restarting...'
})

app.whenReady().then(() => {
  createWindow()
  
  // Start CORTEX once at app launch
  startCortex()
  
  // Pre-launch Octogent silently
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
        OCTOGENT_NO_OPEN: '1'
      }
    }).unref()
    if (win) win.webContents.send('activity', '🚀 Octogent started in background\n')
  }

  if (win) {
    win.webContents.send('activity', '\n📍 Access:\n')
    win.webContents.send('activity', '   Octogent: http://127.0.0.1:8787\n')
    win.webContents.send('activity', '\n💬 Send messages in chat - CORTEX will respond!\n')
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (cortexProcess) cortexProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (cortexProcess) cortexProcess.kill()
})

console.log('CORTEX JARVIS ready')