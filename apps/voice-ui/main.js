/**
 * CORTEX JARVIS — Simple persistent session
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
    width: 1200, height: 800,
    minWidth: 800, minHeight: 600,
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
  return win
}

function isNoise(line) {
  const p = ['CORTEX preflight', 'shared session', 'Session ID', 'Share this', 
    'Local:', 'LAN:', 'QR:', 'cwd:', 'API provider', 'OpenAI base URL', 'Model:',
    'Version:', 'Session name:', 'venv:', 'octogent:', 'http://127.0.0.1', 
    'Octogent is running', 'preflight', 'Ready - FULL', '🌐', '✦', '┌─', '│', '└─']
  return p.some(n => line.includes(n))
}

function extractResponse(output) {
  return output.split('\n').filter(l => !isNoise(l) && l.trim() && !l.startsWith('❯')).join('\n').trim() || 'Done.'
}

function startCortex() {
  if (cortexProcess) { try { cortexProcess.kill() } catch {} }  
  if (win) win.webContents.send('activity', '\n🚀 Starting CORTEX...\n')
  
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

  cortexProcess.stdout.on('data', (d) => { if (win) win.webContents.send('activity', d.toString()) })
  cortexProcess.stderr.on('data', (d) => { if (win) win.webContents.send('activity', d.toString()) })
  cortexProcess.on('close', (c) => { if (win) win.webContents.send('activity', `\nExited ${c}\n`) })
}

ipcMain.handle('run-command', async (event, cmd) => {
  if (!cortexProcess || !cortexProcess.stdin) {
    if (win) win.webContents.send('assistant_message', 'CORTEX not running')
    return 'error'
  }
  let output = ''
  const h = (d) => { output += d.toString(); if (win) win.webContents.send('activity', d.toString()) }
  cortexProcess.stdout.on('data', h)
  cortexProcess.stderr.on('data', h)
  cortexProcess.stdin.write(cmd + '\n')
  setTimeout(() => {
    cortexProcess.stdout.removeListener('data', h)
    cortexProcess.stderr.removeListener('data', h)
    if (win) win.webContents.send('assistant_message', extractResponse(output))
  }, 4000)
})

ipcMain.handle('restart-cortex', () => { startCortex(); return 'ok' })

app.whenReady().then(() => {
  createWindow()
  startCortex()
  
  const fs = require('fs')
  const op = path.join(REPO_ROOT, 'bin', 'cortex-octogent')
  const od = path.join(REPO_ROOT, 'apps', 'octogent', 'dist', 'api', 'cli.js')
  if (fs.existsSync(op) && fs.existsSync(od)) {
    spawn('node', [op], { cwd: REPO_ROOT, detached: true, stdio: 'ignore', env: {...process.env, OCTOGENT_NO_OPEN: '1'} }).unref()
    if (win) win.webContents.send('activity', 'Octogent ready\n')
  }
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (cortexProcess) cortexProcess.kill(); if (process.platform !== 'darwin') app.quit() })