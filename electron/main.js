// MyHaruto 主进程：窗口 + 本地数据（存储于 %APPDATA%/MyHaruto/data/db.json）
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const dataDir = path.join(app.getPath('userData'), 'data')
const dataFile = path.join(dataDir, 'db.json')

function defaultDb() {
  return {
    tasks: [],
    tags: [
      { id: 'okr', name: '年度OKR', color: '#d4a017', isSpecial: true },
      { id: 'daily', name: '日常', color: '#3d7ea6', isSpecial: false },
    ],
    focusSessions: [],
    habits: [],
    habitRecords: [],
    importantDays: [],
    periodRecords: [],
    sleepRecords: [],
    settings: { theme: 'light' },
  }
}

function loadDb() {
  try {
    const db = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
    // 旧版本数据兼容：补齐缺失的字段
    const defaults = defaultDb()
    for (const key of Object.keys(defaults)) {
      if (db[key] === undefined) db[key] = defaults[key]
    }
    // 数据自愈：断开父子环 / 悬空父引用（历史测试数据可能成环导致界面白屏）
    const ids = new Set(db.tasks.map((t) => t.id))
    for (const t of db.tasks) {
      if (t.parentTaskId && (!ids.has(t.parentTaskId) || t.parentTaskId === t.id)) {
        t.parentTaskId = null
      }
    }
    // 逐个沿链走，超过任务总数仍未到顶 = 成环，断开该链
    const n = db.tasks.length
    for (const t of db.tasks) {
      let cur = t, steps = 0
      while (cur && cur.parentTaskId && steps <= n) {
        cur = db.tasks.find((x) => x.id === cur.parentTaskId)
        steps++
      }
      if (steps > n) t.parentTaskId = null
    }
    return db
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
