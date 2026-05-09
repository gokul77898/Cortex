/**
 * CORTEX JARVIS — Preload
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jarvis', {
  runCommand: (cmd) => ipcRenderer.invoke('run-command', cmd),
  // activity = ALL CLI logs → terminal/activity panel
  onActivity: (cb) => {
    const h = (e, d) => cb(d)
    ipcRenderer.on('activity', h)
    return () => ipcRenderer.removeListener('activity', h)
  },
  // response = ONLY clean AI response → chat
  onResponse: (cb) => {
    const h = (e, d) => cb(d)
    ipcRenderer.on('response', h)
    return () => ipcRenderer.removeListener('response', h)
  },
  onClear: (cb) => {
    const h = () => cb()
    ipcRenderer.on('clear', h)
    return () => ipcRenderer.removeListener('clear', h)
  }
})