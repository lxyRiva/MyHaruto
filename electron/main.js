// MyHaruto 主进程：窗口 + 本地数据（存储于 %APPDATA%/MyHaruto/data/db.json）
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const dataDir = path.join(app.getPath('userData'), 'data')
const dataFile = path.join(dataDir, 'db.json')

function defaultDb() {
  return { tasks: [], settings: { theme: 'light' } }
}

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
  } catch {
    return defaultDb()
  }
}

function saveDb(db) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('db:get', () => loadDb())
  ipcMain.handle('db:save', (_e, db) => {
    saveDb(db)
    return true
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
