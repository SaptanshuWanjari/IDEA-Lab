const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (opts) => ipcRenderer.invoke('dialog:open', opts),
  readFile: (filePath) => ipcRenderer.invoke('fs:read', filePath),
})
