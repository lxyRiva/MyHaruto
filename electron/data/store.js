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
function defaultRoot() {
  return path.join(app.getPath('userData'), 'data')
}

// RF-Data 加固（2026-09-09）：三态解析——config 损坏（damaged）或自定义目录丢失（root-missing）
// 时**不再静默回退默认根**（默认根可能残留旧数据副本，静默切换=用户看到「数据回到过去」），
// 而是向渲染端返回错误态阻断加载（App 渲染提示页，数据零风险）
function resolveRoot() {
  const file = configFile()
  if (!fs.existsSync(file)) return { status: 'default', root: defaultRoot() }
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return { status: 'damaged', root: defaultRoot(), file }
  }
  if (cfg && typeof cfg.dataDir === 'string' && cfg.dataDir.trim()) {
    const root = cfg.dataDir.trim()
    return { status: fs.existsSync(root) ? 'custom' : 'root-missing', root, file }
  }
  return { status: 'default', root: defaultRoot() }
}

// 兼容封装：只取根路径（open-dir/backup 等非加载路径使用；加载路径必须走 resolveRoot）
function dataRoot() {
  return resolveRoot().root
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
    // config.json 快照（RF-Data 加固）：config 损坏时阻断页可指引从此恢复，避免数据位置失联
    const cfgFile = configFile()
    if (fs.existsSync(cfgFile)) {
      layout.writeFileAtomic(path.join(dir, 'config-last.json'), fs.readFileSync(cfgFile, 'utf-8'))
    }
    const keep = fs.readdirSync(dir).filter((f) => /^snapshot-.*\.json$/.test(f)).sort()
    while (keep.length > 7) fs.unlinkSync(path.join(dir, keep.shift()))
  } catch {
    // 备份失败不阻断启动（数据文件本身无损）
  }
}

// ---------- 首次选位（全新安装且未定位置时弹一次；取消=默认位置） ----------
// RF-Data 加固（2026-09-09）：config.json 不存在 → 一律弹选位（取消=默认位置）。
// 旧判定「默认根无数据才弹」在默认根残留旧副本的环境下会静默加载残留（数据穿越）；
// 新语义下弹窗是知情选择：用户选回自定义位置即恢复连续性，取消则明确接受默认位置。
function needsFirstRunChoice() {
  return !fs.existsSync(configFile())
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
  // RF-Data 加固（2026-09-09）：目标不得位于当前数据目录/应用目录内部（防递归自复制），
  // 当前数据目录也不得位于目标内部（把正在用的数据目录搬进新目录）
  const insideOf = (child, parent) => {
    const rel = path.relative(parent, child)
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
  }
  const appDir = app.getAppPath()
  if (insideOf(target, current) || insideOf(current, target)) {
    return { ok: false, error: '新位置不能与当前数据目录互相嵌套，请选择独立的目录' }
  }
  if (insideOf(target, appDir)) {
    return { ok: false, error: '新位置不能位于应用程序目录内部（会成为仓库/安装包的一部分）' }
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
    // RF-Data 加固：config 损坏 / 自定义数据目录丢失 → 阻断加载返回错误态（绝不静默换根读残留）
    const resolved = resolveRoot()
    if (resolved.status === 'damaged') {
      return {
        status: 'config-error',
        file: resolved.file,
        message: `数据位置配置文件损坏（${resolved.file}）。为防加载到旧数据副本，应用未加载数据。恢复方式：用数据目录 backups/config-last.json 覆盖该文件，或删除该文件后重新选择位置。`,
      }
    }
    if (resolved.status === 'root-missing') {
      return {
        status: 'root-missing',
        root: resolved.root,
        message: `自定义数据目录不存在（${resolved.root}）。可能被移动、删除或所在磁盘未挂载。数据未做任何修改；请恢复该目录，或修复配置文件后重新选择位置。`,
      }
    }
    let root = resolved.root
    if (needsFirstRunChoice()) root = await firstRunChooseDir(root)
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
