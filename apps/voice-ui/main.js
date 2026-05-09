/**
 * CORTEX JARVIS — Professional Architecture
 * 
 * Event Types:
 * - terminal_log: All terminal output → Activity panel
 * - assistant_message: Clean AI response → Chat panel
 * - user_message: User input → Chat panel
 * - system_event: Startup/shutdown events → Activity panel
 */
const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
let win = null
let cortexProcess = null

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER DEFINITIONS - Terminal noise that should NEVER go to chat
// ═══════════════════════════════════════════════════════════════════════════════

const TERMINAL_NOISE_PATTERNS = [
  // Box drawing / ASCII art
  '┌─', '│', '└─', '║', '╚', '╔', '═', '▀', '▄', '█',
  // CORTEX startup
  'CORTEX preflight', 'shared session', 'Session ID:', 'Share this:',
  'Local:', 'LAN:', 'QR:', 'scope:', 'rotates every', 'session ready',
  '/share stop', '/share to re-show',
  // Runtime info
  'cwd:', 'API provider:', 'OpenAI base URL:', 'Model:',
  'Version:', 'Session name:', 'venv:', 'octogent:', 'logs:',
  // URLs
  'http://127.0.0.1', 'http://10.146', 'lhr.life',
  // Octogent
  'Octogent is running', 'Project:', 'Name:', 'API:', 'UI:', 'Setup:',
  // Preflight/Menu
  'preflight', 'octogent: ✓', 'Ready - FULL SWARM', '● shared session',
  '🌐 Opening', '🌐 Opened', '✦ Mission', 'DECOUPLED ASSET',
  // CLI noise
  'Running first-time', 'Welcome to CORTEX', 'Running: bun run cortex.mjs',
  // MCP/Tools
  'MCP', 'mcp-', 'DEBUG', 'TRACE', 'localhost', '127.0.0.1',
  // npm/yarn output
  'npm WARN', 'yarn install', 'yarn.lock', 'package.json',
  // Python/venv
  'Python', 'venv', '__pycache__', 'pip install',
  // Error traces
  'Error:', 'Exception:', 'Traceback', 'at module',
  // Session
  'Share this:', 'Local:', 'QR:'
]

const IS_TERMINAL_NOISE = (line) => {
  const trimmed = line.trim()
  if (!trimmed) return false
  // Check against patterns
  for (const pattern of TERMINAL_NOISE_PATTERNS) {
    if (trimmed.includes(pattern)) return true
  }
  // Check for box drawing characters
  if (/^[▀▄▀█▄▀║╚╗╔═■◆●○▲▼◀▶▷◁]/.test(trimmed)) return true
  // Check for URLs
  if (/^https?:\/\//.test(trimmed)) return true
  return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE EXTRACTION - Extract ONLY clean AI response
// ═══════════════════════════════════════════════════════════════════════════════

function extractAssistantResponse(fullOutput) {
  const lines = fullOutput.split('\n')
  const responseLines = []
  let started = false
  let inCommand = false
  
  for (const line of lines) {
    // Skip terminal noise
    if (IS_TERMINAL_NOISE(line)) {
      inCommand = false
      continue
    }
    
    // Skip empty start
    if (!started && !line.trim()) continue
    
    // Skip command echo
    if (line.startsWith('❯') || line.startsWith('> ')) {
      inCommand = true
      continue
    }
    
    // Skip blank lines in command area
    if (inCommand && !line.trim()) continue
    
    // Start collecting response
    if (!started) started = true
    inCommand = false
    
    if (line.trim()) {
      responseLines.push(line)
    }
  }
  
  const response = responseLines.join('\n').trim()
  return response.length > 0 ? response : 'Command completed.'
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════════════════════════════════════════════

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
    { label: 'Restart CORTEX', click: () => restartCortex() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  Menu.setApplicationMenu(menu)

  win.on('closed', () => { win = null })
  console.log('JARVIS window created')
  return win
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORTEX PROCESS MANAGEMENT - Persistent, no restart loops
// ═══════════════════════════════════════════════════════════════════════════════

function restartCortex() {
  if (cortexProcess) {
    cortexProcess.kill()
    cortexProcess = null
  }
  startCortex()
}

function startCortex() {
  // Kill existing
  if (cortexProcess) {
    try { cortexProcess.kill() } catch {}
    cortexProcess = null
  }
  
  // Send system event to activity
  sendToActivity('system_event', '\n🚀 Starting CORTEX session...\n')
  
  // Start CORTEX - interactive mode (no -- flag)
  cortexProcess = spawn('bun', ['run', 'cortex.mjs'], {
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

  // Route ALL stdout/stderr → Activity panel ONLY
  cortexProcess.stdout.on('data', (data) => {
    const text = data.toString()
    sendToActivity('terminal_log', text)
  })

  cortexProcess.stderr.on('data', (data) => {
    const text = data.toString()
    sendToActivity('terminal_log', text)
  })

  // Handle close - NO auto restart
  cortexProcess.on('close', (code) => {
    sendToActivity('system_event', `\n⚠️ CORTEX session ended (code ${code}). Use menu to restart.\n`)
  })

  cortexProcess.on('error', (err) => {
    sendToActivity('system_event', `\n❌ CORTEX error: ${err.message}\n`)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT ROUTING - Proper separation
// ═══════════════════════════════════════════════════════════════════════════════

function sendToActivity(type, text) {
  if (win) win.webContents.send('activity', JSON.stringify({ type, content: text }))
}

function sendToChat(type, content) {
  if (win) win.webContents.send(type, content)
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND EXECUTION - Internal terminal, clean response to chat
// ═══════════════════════════════════════════════════════════════════════════════

function executeCommand(cmd) {
  return new Promise((resolve, reject) => {
    if (!cortexProcess || !cortexProcess.stdin) {
      reject(new Error('CORTEX not running. Use menu to restart.'))
      return
    }

    let outputBuffer = ''

    // Collect all terminal output (goes to activity only)
    const collectOutput = (data) => {
      const text = data.toString()
      outputBuffer += text
      sendToActivity('terminal_log', text)
    }

    cortexProcess.stdout.on('data', collectOutput)
    cortexProcess.stderr.on('data', collectOutput)

    // Send command
    cortexProcess.stdin.write(cmd + '\n')

    // Wait for AI response (5 seconds)
    setTimeout(() => {
      cortexProcess.stdout.removeListener('data', collectOutput)
      cortexProcess.stderr.removeListener('data', collectOutput)
      
      // Extract ONLY clean assistant response for chat
      const assistantResponse = extractAssistantResponse(outputBuffer)
      
      // Send clean response to CHAT only
      sendToChat('assistant_message', assistantResponse)
      
      resolve(outputBuffer)
    }, 5000)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('run-command', async (event, cmd) => {
  try {
    await executeCommand(cmd)
    return 'ok'
  } catch (err) {
    sendToChat('assistant_message', `Error: ${err.message}`)
    return 'error'
  }
})

ipcMain.handle('restart-cortex', () => {
  restartCortex()
  sendToActivity('system_event', 'CORTEX restarting...\n')
  return 'restarting'
})

// ═══════════════════════════════════════════════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

app.whenReady().then(() => {
  createWindow()
  
  // Start CORTEX once - persistent
  startCortex()
  
  // Pre-launch Octogent silently
  const fs = require('fs')
  const octoPath = path.join(REPO_ROOT, 'bin', 'cortex-octogent')
  const octoDist = path.join(REPO_ROOT, 'apps', 'octogent', 'dist', 'api', 'cli.js')
  if (fs.existsSync(octoPath) && fs.existsSync(octoDist)) {
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
    sendToActivity('system_event', '🚀 Octogent ready at http://127.0.0.1:8787\n')
  }

  sendToActivity('system_event', '\n📍 Access: http://127.0.0.1:8787\n')
  sendToActivity('system_event', '💬 Send messages - CORTEX responds in chat!\n')
  
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