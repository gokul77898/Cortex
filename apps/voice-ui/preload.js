/**
 * CORTEX JARVIS — Preload
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jarvis', {
  runCommand: (cmd) => ipcRenderer.invoke('run-command', cmd),
  restartCortex: () => ipcRenderer.invoke('restart-cortex'),
  
  // Activity - all terminal output
  onActivity: (cb) => {
    const h = (e, d) => cb(d)
    ipcRenderer.on('activity', h)
    return () => ipcRenderer.removeListener('activity', h)
  },
  
  // Chat - clean AI response only
  onAssistantMessage: (cb) => {
    const h = (e, d) => cb(d)
    ipcRenderer.on('assistant_message', h)
    return () => ipcRenderer.removeListener('assistant_message', h)
  },
  
  onClear: (cb) => {
    const h = () => cb()
    ipcRenderer.on('clear', h)
    return () => ipcRenderer.removeListener('clear', h)
  },
  
  onClearActivity: (cb) => {
    const h = () => cb()
    ipcRenderer.on('clear-activity', h)
    return () => ipcRenderer.removeListener('clear-activity', h)
  }
})