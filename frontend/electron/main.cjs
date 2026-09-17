const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const net = require('node:net')
const fs = require('node:fs')
const path = require('node:path')

const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:8443'
const RETRIES = 30
const RETRY_MS = 1000

function waitForServer(url, tries = 0) {
  const { hostname, port } = new URL(url)
  return new Promise(resolve => {
    const sock = net.connect(port, hostname, () => {
      sock.destroy()
      resolve(true)
    })
    sock.on('error', () => {
      sock.destroy()
      if (tries < RETRIES) setTimeout(() => resolve(waitForServer(url, tries + 1)), RETRY_MS)
      else resolve(false)
    })
  })
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    dialog.showErrorBox('Load failed', `${DEV_URL}\n${code}: ${desc}`)
  })
  const up = await waitForServer(DEV_URL)
  if (!up) {
    dialog.showErrorBox('Dev server unreachable', `Could not reach ${DEV_URL} after ${RETRIES}s.`)
    app.quit()
    return
  }
  win.loadURL(DEV_URL)
}

// IPC: native file open dialog
ipcMain.handle('dialog:open', async (_event, opts) => {
  const result = await dialog.showOpenDialog(opts || {})
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  return { filePath, fileName: path.basename(filePath) }
})

// IPC: read file as ArrayBuffer
ipcMain.handle('fs:read', async (_event, filePath) => {
  const buf = fs.readFileSync(filePath)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})