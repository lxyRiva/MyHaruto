// 数据仓库主进程端（RF-Data-1 自 main.js 整体迁入）：
// 数据根解析（%APPDATA%/MyHaruto/config.json { dataDir }，缺省 userData/data——自定义位置奠基）
// + 单库读写（原子写 .tmp→rename）+ 启动滚动备份 7 份 + IPC 注册
// RF-Data-2 扩展：多文件布局/迁移/版本管理/自定义位置
const { app, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

function readConfig() {
  try {
    const file = path.join(app.getPath('userData'), 'config.json')
    const cfg = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return cfg && typeof cfg === 'object' ? cfg : {}
  } catch {
    return {}
  }
}

// 数据根：config.json 指定 dataDir 优先，缺省 userData/data（与 RF-Data-1 前的旧路径一致，老用户无感）
function dataRoot() {
  const cfg = readConfig()
  if (cfg.dataDir && typeof cfg.dataDir === 'string' && cfg.dataDir.trim()) return cfg.dataDir.trim()
  return path.join(app.getPath('userData'), 'data')
}

function dbFile() {
  return path.join(dataRoot(), 'db.json')
}

function defaultDb() {
  return {
    tasks: [],
    tags: [
      { id: 'okr', name: '年度OKR', color: '#d4a017', isSpecial: true },
      { id: 'daily', name: '日常', color: '#3d7ea6', isSpecial: false },
    ],
    subTags: [],
    sections: [],
    focusSessions: [],
    habits: [],
    habitRecords: [],
    importantDays: [],
    periodRecords: [],
    sleepRecords: [],
    settings: {
      theme: 'light',
      harutoMetDate: new Date().toISOString().slice(0, 10),
      currentCharacterId: 'haruto',
      skinId: 'default',
      aiName: 'Haruto', // 须与 src/shared/constants.ts DEFAULT_AI_NAME 保持一致（CJS 无法 require TS）
    },
  }
}

function loadDb() {
  try {
    const db = JSON.parse(fs.readFileSync(dbFile(), 'utf-8'))
    // 旧版本数据兼容：补齐缺失的字段
    const defaults = defaultDb()
    for (const key of Object.keys(defaults)) {
      if (db[key] === undefined) db[key] = defaults[key]
    }
    // 四层结构自愈：旧数据补齐 H2标签/看板分组/任务新字段/角色设置
    if (!Array.isArray(db.subTags)) db.subTags = []
    if (!Array.isArray(db.sections)) db.sections = []
    if (!db.settings || typeof db.settings !== 'object') db.settings = defaults.settings
    if (!db.settings.harutoMetDate) db.settings.harutoMetDate = new Date().toISOString().slice(0, 10)
    if (!db.settings.currentCharacterId) db.settings.currentCharacterId = 'haruto'
    if (!db.settings.skinId) db.settings.skinId = 'default'
    if (!db.settings.aiName) db.settings.aiName = 'Haruto' // 同上：须与 constants.DEFAULT_AI_NAME 一致
    for (const t of db.tasks) {
      if (!Array.isArray(t.checklistItems)) t.checklistItems = []
      if (!Array.isArray(t.taskComments)) t.taskComments = []
      if (t.sectionId === undefined) t.sectionId = null
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

// 原子写：先写同目录 .tmp 再 rename，避免写一半崩溃留下截断 JSON
function writeFileAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, content)
  fs.renameSync(tmp, file)
}

function saveDb(db) {
  writeFileAtomic(dbFile(), JSON.stringify(db, null, 2))
}

// 启动备份：把当前 db.json 快照拷进 backups/，按时间戳命名，滚动保留最新 7 份
function startupBackup() {
  const src = dbFile()
  if (!fs.existsSync(src)) return
  try {
    const dir = path.join(dataRoot(), 'backups')
    fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    fs.copyFileSync(src, path.join(dir, `db-${stamp}.json`))
    const keep = fs.readdirSync(dir).filter((f) => /^db-.*\.json$/.test(f)).sort()
    while (keep.length > 7) fs.unlinkSync(path.join(dir, keep.shift()))
  } catch {
    // 备份失败不阻断启动（数据文件本身无损）
  }
}

// IPC 注册 + 启动备份；main.js 只调这一个入口（窗口逻辑留 main.js）
function initStore() {
  ipcMain.handle('db:get', () => loadDb())
  ipcMain.handle('db:save', (_e, db) => {
    saveDb(db)
    return true
  })
  ipcMain.handle('data:open-dir', () => shell.openPath(dataRoot()))
  startupBackup()
}

module.exports = { initStore, dataRoot, defaultDb, loadDb, saveDb, writeFileAtomic, startupBackup }
