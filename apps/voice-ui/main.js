/**
 * CORTEX JARVIS — Proper separation: Terminal → Activity, AI Response → Chat
 */
const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron')
const { spawn, spawn: spawnNonDetached } = require('child_process')
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

// Check if line is terminal noise (should go to activity, NOT chat)
function isTerminalNoise(line) {
  const patterns = [
    '┌─', '│', '└─', '║', '╚', '╔', '═',
    'CORTEX preflight', 'shared session', 'Session ID:', 'Share this:',
    'Local:', 'LAN:', 'QR:', 'Opening host', 'Opened Cortex',
    'venv:', 'octogent:', 'logs:', 'scope:', 'rotates every',
    'session ready', '/share stop', '/share to re-show',
    'cwd:', 'API provider:', 'OpenAI base URL:', 'Model:',
    'Version:', 'Session name:', 'http://127.0.0.1', 'http://10.146',
    'lhr.life', 'Running first-time', 'Welcome to CORTEX',
    'Octogent is running', 'Project:', 'Name:', 'API:', 'UI:',
    'preflight', 'octogent: ✓', 'Ready - FULL SWARM',
    '● shared session', '🌐 Opening', '🌐 Opened',
    '✦ Mission', 'DECOUPLED ASSET'
  ]
  return patterns.some(p => line.includes(p)) || /^\s*[▀▄▀█▄▀║╚╗╔█]/.test(line)
}

// Extract ONLY the final AI response - strip all terminal noise
function extractAIResponse(fullOutput) {
  const lines = fullOutput.split('\n')
  const responseLines = []
  let foundContent = false
  
  for (const line of lines) {
    // Skip ALL terminal noise - goes to activity only
    if (isTerminalNoise(line)) continue
    
    // Skip command echo
    if (line.startsWith('❯')) continue
    
    // Skip empty lines at start
    if (!foundContent && !line.trim()) continue
    
    // Start capturing after noise ends
    if (!foundContent && line.trim()) {
      foundContent = true
    }
    
    if (foundContent && line.trim()) {
      responseLines.push(line)
    }
  }
  
  const result = responseLines.join('\n').trim()
  return result.length > 0 ? result : 'Command completed.'
}

// Start CORTEX once and keep running persistently
function startCortex() {
  // Kill existing if any
  if (cortexProcess) {
    cortexProcess.kill()
    cortexProcess = null
  }
  
  if (win) win.webContents.send('activity', '\n🚀 Starting CORTEX session...\n')
  
  // Run CORTEX WITHOUT -- flag - interactive REPL mode
  cortexProcess = spawnNonDetached('bun', ['run', 'cortex.mjs'], {
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      FORCE_COLOR: 'true',
      CORTEX_SIMPLE: '1',
      CORTEX_NO_OPEN: '1',
      CORTEX_ALLOW_OPEN: '1',
      OCTOGENT_NO_OPEN: '1'
    }
  })

  // Route: stdout/stderr → Activity panel ONLY (NOT to chat)
  cortexProcess.stdout.on('data', (data) => {
    const text = data.toString()
    if (win) win.webContents.send('activity', text)
  })

  cortexProcess.stderr.on('data', (data) => {
    const text = data.toString()
    if (win) win.webContents.send('activity', text)
  })

  // Don't auto-restart - let user decide via menu
  cortexProcess.on('close', (code) => {
    if (win) win.webContents.send('activity', `\n⚠️ CORTEX session ended (code ${code}). Use menu to restart.\n`)
  })

  cortexProcess.on('error', (err) => {
    if (win) win.webContents.send('activity', `\n❌ CORTEX error: ${err.message}\n`)
  })

  return cortexProcess
}

// Send command to running CORTEX and get AI response
function sendCommandToCortex(cmd) {
  return new Promise((resolve, reject) => {
    if (!cortexProcess || !cortexProcess.stdin) {
      reject(new Error('CORTEX not running. Use menu to restart.'))
      return
    }

    let outputBuffer = ''
    let responseDelivered = false

    // Handler for collecting output
    const handleData = (data) => {
      const text = data.toString()
      outputBuffer += text
      // Continue showing in activity
      if (win) win.webContents.send('activity', text)
    }

    cortexProcess.stdout.on('data', handleData)
    cortexProcess.stderr.on('data', handleData)

    // Send command
    cortexProcess.stdin.write(cmd + '\n')

    // Wait for response (5 seconds for AI to respond)
    setTimeout(() => {
      // Remove listeners
      cortexProcess.stdout.removeListener('data', handleData)
      cortexProcess.stderr.removeListener('data', handleData)
      
      // Extract ONLY AI response - filter out all terminal noise
      const aiResponse = extractAIResponse(outputBuffer)
      
      // Send clean response to CHAT (not activity)
      if (win && !responseDelivered) {
        responseDelivered = true
        win.webContents.send('response', aiResponse)
      }
      
      resolve(outputBuffer)
    }, 5000)
  })
}

// IPC: Execute command
ipcMain.handle('run-command', async (event, cmd) => {
  try {
    await sendCommandToCortex(cmd)
    return 'ok'
  } catch (err) {
    if (win) win.webContents.send('response', `Error: ${err.message}`)
    return 'error'
  }
})

// IPC: Restart CORTEX
ipcMain.handle('restart-cortex', () => {
  startCortex()
  return 'CORTEX restarting...'
})

// Start app
app.whenReady().then(() => {
  createWindow()
  
  // Start CORTEX once at launch (not per message)
  startCortex()
  
  // Pre-launch Octogent silently (no browser opens)
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
    if (win) win.webContents.send('activity', '🚀 Octogent ready at http://127.0.0.1:8787\n')
  }

  if (win) {
    win.webContents.send('activity', '\n📍 Access: http://127.0.0.1:8787\n')
    win.webContents.send('activity', '💬 Send messages - CORTEX responds in chat!\n')
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