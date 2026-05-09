/**
 * CORTEX JARVIS - Simple: spawn new process per message
 */
const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
let win = null

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  win = new BrowserWindow({
    width: 1200, height: 800,
    x: Math.floor((sw - 1200) / 2), y: Math.floor((sh - 800) / 2),
    backgroundColor: '#0d0d12', title: 'CORTEX JARVIS',
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
  })
  win.loadFile(path.join(__dirname, 'index.html'))
  
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'CORTEX JARVIS', enabled: false },
    { type: 'separator' },
    { label: 'Clear Chat', click: () => win.webContents.send('clear') },
    { label: 'Clear Activity', click: () => win.webContents.send('clear-activity') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]))
  return win
}

function isNoise(line) {
  return ['CORTEX preflight', 'shared session', 'Session ID', 'Share this', 
    'Local:', 'LAN:', 'QR:', 'cwd:', 'API provider', 'OpenAI base URL', 'Model:',
    'Version:', 'Session name:', 'venv:', 'octogent:', 'http://127.0.0.1',
    'Octogent is running', 'preflight', 'Ready - FULL', '🌐', '✦', '┌─', '│', '└─']
    .some(p => line.includes(p))
}

function extractResponse(output) {
  return output.split('\n').filter(l => !isNoise(l) && l.trim() && !l.startsWith('❯') && !l.startsWith('> '))
    .join('\n').trim() || 'Command completed.'
}

ipcMain.handle('run-command', async (event, cmd) => {
  return new Promise((resolve) => {
    let output = ''
    let responseSent = false
    
    const proc = spawn('bun', ['run', 'cortex.mjs', '--', cmd], {
      cwd: REPO_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: 'true', CORTEX_SIMPLE: '1', CORTEX_NO_OPEN: '1', OCTOGENT_NO_OPEN: '1' }
    })

    const handler = (data) => {
      const text = data.toString()
      output += text
      if (win) win.webContents.send('activity', text)
    }
    
    proc.stdout.on('data', handler)
    proc.stderr.on('data', handler)

    setTimeout(() => {
      proc.stdout.removeListener('data', handler)
      proc.stderr.removeListener('data', handler)
      proc.kill()
      
      const response = extractResponse(output)
      if (win && !responseSent) {
        responseSent = true
        win.webContents.send('assistant_message', response)
      }
      resolve(output)
    }, 8000)
  })
})

app.whenReady().then(() => {
  createWindow()
  
  const fs = require('fs')
  const op = path.join(REPO_ROOT, 'bin', 'cortex-octogent')
  const od = path.join(REPO_ROOT, 'apps', 'octogent', 'dist', 'api', 'cli.js')
  if (fs.existsSync(op) && fs.existsSync(od)) {
    spawn('node', [op], { cwd: REPO_ROOT, detached: true, stdio: 'ignore', env: {CORTEX_ALLOW_OPEN:'1',OCTOGENT_NO_OPEN:'1'} }).unref()
    if (win) win.webContents.send('activity', 'Octogent ready at http://127.0.0.1:8787\n')
  }
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })