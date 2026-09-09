// 数据仓库主进程端（RF-Data-1/2）：electron 外壳——数据根解析（config.json { dataDir }）、
// 首次选位弹窗、更改位置（复制→校验→改 config→重启生效，失败回滚）、IPC 注册、启动滚动备份。
// 布局/迁移/自愈/域读写全在 electron/data/layout.js（纯 Node，verify:data 直测）
const { app, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const layout = require('./layout')

// ---------- config.json：自定义数据位置的唯一事实源 ----------
function configFile() {
  return path.join(app.getPath('userData'), 'config.json')
}

function readConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(configFile(), 'utf-8'))
    return cfg && typeof cfg === 'object' ? cfg : {}
  } catch {
    return {}
  }
}

function writeConfig(cfg) {
  layout.writeFileAtomic(configFile(), JSON.stringify(cfg, null, 2))
}

// 数据根：config.dataDir 优先；缺省 userData/data（与 RF-Data-1 前旧路径一致，老用户无感）
function dataRoot() {
  const cfg = readConfig()
  if (cfg.dataDir && typeof cfg.dataDir === 'string' && cfg.dataDir.trim()) return cfg.dataDir.trim()
  return path.join(app.getPath('userData'), 'data')
}

// ---------- 数据源模式：multi = 多文件域布局；legacy = 迁移失败回退旧单文件 ----------
let dataMode = 'multi'

function loadDb() {
  if (dataMode === 'legacy') {
    // 迁移失败静默回退：照旧读写根下 db.json（下次启动重试迁移）
    return layout.selfHealDb(layout.readJsonSafe(path.join(dataRoot(), layout.LEGACY_DB_FILE)) || layout.defaultDb())
  }
  return layout.readAllDomains(dataRoot())
}

function saveDb(db, domains, deletions) {
  if (dataMode === 'legacy') {
    layout.writeFileAtomic(path.join(dataRoot(), layout.LEGACY_DB_FILE), JSON.stringify(db, null, 2))
    return
  }
  layout.writeDomains(dataRoot(), db, domains === undefined ? null : domains)
  if (deletions && deletions.length) layout.appendDeletionLog(dataRoot(), deletions)
}

// ---------- 启动滚动备份：全库快照单文件，滚动保留最新 7 份 ----------
function startupBackup() {
  try {
    const root = dataRoot()
    let snapshot
    if (dataMode === 'legacy') {
      snapshot = { when: new Date().toISOString(), legacyDb: layout.readJsonSafe(path.join(root, layout.LEGACY_DB_FILE)) }
    } else {
      snapshot = {
        when: new Date().toISOString(),
        manifest: layout.readManifest(root),
        ...layout.readAllDomains(root),
      }
    }
    const dir = path.join(root, 'backups')
    fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    layout.writeFileAtomic(path.join(dir, `snapshot-${stamp}.json`), JSON.stringify(snapshot, null, 2))
    const keep = fs.readdirSync(dir).filter((f) => /^snapshot-.*\.json$/.test(f)).sort()
    while (keep.length > 7) fs.unlinkSync(path.join(dir, keep.shift()))
  } catch {
    // 备份失败不阻断启动（数据文件本身无损）
  }
}

// ---------- 首次选位（全新安装且未定位置时弹一次；取消=默认位置） ----------
function needsFirstRunChoice(root) {
  const cfg = readConfig()
  if (cfg.dataDir) return false
  return !fs.existsSync(path.join(root, 'manifest.json')) && !fs.existsSync(path.join(root, layout.LEGACY_DB_FILE))
}

async function firstRunChooseDir(defaultRoot) {
  const r = await dialog.showOpenDialog({
    title: '选择 MyHaruto 数据保存位置',
    message: '选择存放 MyHaruto 数据的文件夹（将在其下创建 MyHaruto 子目录）；取消则使用系统默认位置。',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (r.canceled || !r.filePaths[0]) return defaultRoot
  const chosen = path.join(r.filePaths[0], 'MyHaruto')
  writeConfig({ ...readConfig(), dataDir: chosen })
  return chosen
}

// ---------- 更改位置：复制→校验→改 config（重启生效）；失败清理副本、config 不动 ----------
function verifyRootIntegrity(root) {
  if (!layout.readManifest(root)) return false
  if (layout.readJsonSafe(path.join(root, layout.SETTINGS_FILE)) === undefined) return false
  for (const d of layout.DOMAINS) {
    if (layout.readJsonSafe(path.join(root, d.name, `${d.name}.json`)) === undefined) return false
  }
  return true
}

async function changeDataDir() {
  const current = dataRoot()
  const r = await dialog.showOpenDialog({
    title: '更改数据位置',
    message: '选择新位置（将把全部数据复制到其下 MyHaruto 子目录，校验通过后重启生效；失败自动回滚）。',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true }
  const target = path.join(r.filePaths[0], 'MyHaruto')
  if (fs.existsSync(path.join(target, 'manifest.json'))) {
    return { ok: false, error: '目标位置已存在 MyHaruto 数据，为防覆盖已取消' }
  }
  try {
    fs.cpSync(current, target, {
      recursive: true,
      filter: (src) => !src.endsWith('.tmp'),
    })
    if (!verifyRootIntegrity(target)) throw new Error('copy verification failed')
    writeConfig({ ...readConfig(), dataDir: target })
    return { ok: true, dataDir: target, requiresRestart: true }
  } catch {
    try {
      fs.rmSync(target, { recursive: true, force: true })
    } catch {
      // 清理失败不掩盖回滚结果：config 未写，原位置数据未动
    }
    return { ok: false, error: '复制或校验失败，已回滚：数据位置未变更，原数据原地未动' }
  }
}

// ---------- IPC 注册 + 启动序列；main.js 只调这一个入口 ----------
function initStore() {
  ipcMain.handle('db:get', async () => {
    // P0 修复（RF-Data-2 验证实锤）：必须接收选位结果——选了新位置时 ensureLayout/
    // startupBackup/loadDb 全链都要用新 root；取消时 firstRunChooseDir 原样返回传入 root
    let root = dataRoot()
    if (needsFirstRunChoice(root)) root = await firstRunChooseDir(root)
    const ensured = layout.ensureLayout(root, app.getVersion(), app.getAppPath())
    if (ensured.status === 'downgrade') return ensured
    dataMode = ensured.legacyFallback ? 'legacy' : 'multi'
    startupBackup()
    return { status: 'ok', data: loadDb() }
  })
  ipcMain.handle('db:save', (_e, payload) => {
    saveDb(payload.data, payload.domains, payload.deletions)
    return true
  })
  ipcMain.handle('data:open-dir', () => shell.openPath(dataRoot()))
  ipcMain.handle('data:info', () => {
    const cfg = readConfig()
    return { dataDir: dataRoot(), isDefault: !cfg.dataDir }
  })
  ipcMain.handle('data:change-dir', () => changeDataDir())
}

module.exports = { initStore, dataRoot, loadDb, saveDb, startupBackup, changeDataDir }
