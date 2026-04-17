const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cortex', {
  ask: (prompt) => ipcRenderer.invoke('agi:ask', prompt),
  onChunk: (cb) => {
    const listener = (_e, chunk) => cb(chunk)
    ipcRenderer.on('agi:chunk', listener)
    return () => ipcRenderer.removeListener('agi:chunk', listener)
  },
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowPin: (p) => ipcRenderer.invoke('window:pin', p),
})
