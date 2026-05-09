/**
 * CORTEX JARVIS — Preload
 * 
 * Event Types:
 * - terminal_log: Terminal output → Activity panel
 * - system_event: System events → Activity panel
 * - assistant_message: Clean AI response → Chat panel
 * - user_message: User input → Chat panel
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jarvis', {
  // Execute command - returns clean response to chat, logs to activity
  runCommand: (cmd) => ipcRenderer.invoke('run-command', cmd),
  
  // Restart CORTEX session
  restartCortex: () => ipcRenderer.invoke('restart-cortex'),
  
  // Activity panel events - terminal logs, system events
  onActivity: (cb) => {
    const handler = (event, data) => {
      try {
        // Parse JSON structured event
        const parsed = JSON.parse(data)
        cb(parsed.type, parsed.content)
      } catch {
        // Fallback for plain text
        cb('terminal_log', data)
      }
    }
    ipcRenderer.on('activity', handler)
    return () => ipcRenderer.removeListener('activity', handler)
  },
  
  // Chat panel - ONLY clean assistant messages
  onAssistantMessage: (cb) => {
    const handler = (event, data) => cb(data)
    ipcRenderer.on('assistant_message', handler)
    return () => ipcRenderer.removeListener('assistant_message', handler)
  },
  
  // Clear chat
  onClear: (cb) => {
    const handler = () => cb()
    ipcRenderer.on('clear', handler)
    return () => ipcRenderer.removeListener('clear', handler)
  },
  
  // Clear activity
  onClearActivity: (cb) => {
    const handler = () => cb()
    ipcRenderer.on('clear-activity', handler)
    return () => ipcRenderer.removeListener('clear-activity', handler)
  }
})