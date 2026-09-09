// MyHaruto 主进程：窗口 + 生命周期。数据与 IPC 全部委托 electron/data/store.js（RF-Data-1 收口），
// 本文件不再直接接触 fs/ipcMain——数据根、读写、备份见 store.js
const { app, BrowserWindow } = require('electron')
const path = require('path')
const { initStore } = require('./data/store')

// 数据连续性锚点（RF-Data 加固 2026-09-09）：userData 恒定 %APPDATA%/MyHaruto，
// 不随 package.json name/productName 变化（打包改名/升级改名都不再影响 config.json 与数据定位）。
// 必须在 app.ready 之前执行。
app.setPath('userData', path.join(app.getPath('appData'), 'MyHaruto'))

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
  initStore()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
