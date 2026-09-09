// 数据布局核心（RF-Data-2）：纯 Node 逻辑、零 electron 依赖——scripts/verify-migration.mjs 直测本文件。
// 多文件域布局 + manifest 版本管理 + 启动三分支（manifest 正常 / legacy db.json 迁移 fail-safe / 全新安装）
// + 自愈（原 loadDb 逻辑整体迁入）+ AI 模板播种。electron 依赖（dialog/shell/路径解析）在 store.js 外壳。
const path = require('path')
const fs = require('fs')

const DATA_VERSION = 1

// 域定义：name = 域目录，keys = AppData 上的键（迁移时从旧单库拆出，加载时合并回）
// 总则卡定：tasks/habits/focus-sessions/important-days/period[单文件]/sleep[单文件]；
// albums/travel 两域 RF-Data-3 落位（UI=RF-Moments）；town/assets 后置域本卡不建
const DOMAINS = [
  { name: 'tasks', keys: ['tasks', 'tags', 'subTags', 'sections'] },
  { name: 'habits', keys: ['habits', 'habitRecords'] },
  { name: 'focus-sessions', keys: ['focusSessions'] },
  { name: 'important-days', keys: ['importantDays'] },
  { name: 'period', keys: ['periodRecords'] },
  { name: 'sleep', keys: ['sleepRecords'] },
  { name: 'albums', keys: ['albums'] },
  { name: 'travel', keys: ['travel'] },
]
const SETTINGS_KEYS = ['settings']
const MANIFEST_FILE = 'manifest.json'
const SETTINGS_FILE = 'settings.json'
const LEGACY_DB_FILE = 'db.json'
const CHANGES_LOG_FILE = ['logs', 'changes.jsonl']

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
    albums: [], // 书影清单（RF-Data-3；UI 待 RF-Moments）
    travel: [], // 旅游札记（同上）
    settings: {
      theme: 'light',
      harutoMetDate: new Date().toISOString().slice(0, 10),
      currentCharacterId: 'haruto',
      skinId: 'default',
      aiName: 'Haruto', // 须与 src/shared/constants.ts DEFAULT_AI_NAME 保持一致（CJS 无法 require TS）
    },
  }
}

// 原子写：先写同目录 .tmp 再 rename，避免写一半崩溃留下截断 JSON
function writeFileAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, content)
  fs.renameSync(tmp, file)
}

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return undefined
  }
}

function domainFile(root, name) {
  return path.join(root, name, `${name}.json`)
}

// ---------- 自愈（原 loadDb 内逻辑整体迁入，逐行未改语义） ----------
function selfHealDb(db) {
  // 旧版本数据兼容：补齐缺失的字段
  const defaults = defaultDb()
  for (const key of Object.keys(defaults)) {
    if (db[key] === undefined) db[key] = defaults[key]
  }
  // 四层结构自愈：旧数据补齐 H2标签/看板分组/任务新字段/角色设置
  if (!Array.isArray(db.subTags)) db.subTags = []
  if (!Array.isArray(db.sections)) db.sections = []
  // RF-Data-3 两域：存量数据（Data-2 期）无此二字段，undefined 即默认空（加字段铁律）
  if (!Array.isArray(db.albums)) db.albums = []
  if (!Array.isArray(db.travel)) db.travel = []
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
}

// ---------- manifest ----------
function readManifest(root) {
  const m = readJsonSafe(path.join(root, MANIFEST_FILE))
  return m && typeof m === 'object' ? m : null
}

function writeManifest(root, appVersion, lastMigratedAt) {
  writeFileAtomic(
    path.join(root, MANIFEST_FILE),
    JSON.stringify({ dataVersion: DATA_VERSION, appVersion, lastMigratedAt }, null, 2),
  )
}

// ---------- AI 模板播种（幂等：缺哪个补哪个；优先拷仓库模板，缺失用内置空默认） ----------
// TECH §3.4 五件：chat-messages / persona.md / memories×3 / agent/activity-log
const AI_SEED_FALLBACK = {
  'ai/chat-messages.json': '[]',
  'ai/persona.md': '# Haruto 默认人设\n\n（仓库模板 data/ai/persona.md；M5 接 AI 前占位）\n',
  'ai/memories/fragments.json': '{\n  "items": []\n}',
  'ai/memories/episodes.json': '{\n  "items": []\n}',
  'ai/memories/entity-profiles.json': '{\n  "items": []\n}',
  'ai/agent/activity-log.json': '[]',
}
function seedAiTemplates(root, appTemplateDir) {
  for (const rel of Object.keys(AI_SEED_FALLBACK)) {
    const target = path.join(root, ...rel.split('/'))
    if (fs.existsSync(target)) continue
    let content = AI_SEED_FALLBACK[rel]
    try {
      content = fs.readFileSync(path.join(appTemplateDir, ...rel.split('/')), 'utf-8')
    } catch {
      // 仓库模板缺失（异常部署）：用内置空默认兜底
    }
    writeFileAtomic(target, content)
  }
}

// ---------- 迁移（fail-safe 核心）----------
// 顺序保证可恢复：域文件写完 → manifest 写入 → 最后才把 legacy db.json 改名让位。
// 任一步崩溃：manifest 不存在 → 下次启动重试整套迁移（域文件用原子写重写，幂等）
function migrateLegacy(root, appVersion) {
  const legacyPath = path.join(root, LEGACY_DB_FILE)
  const legacy = readJsonSafe(legacyPath)
  if (legacy === undefined) throw new Error('legacy db.json unreadable')
  const db = selfHealDb(legacy)
  writeDomains(root, db, null) // 全量写（含 settings.json）；迁移是一次性铺开，无需变化域检测
  seedAiTemplates(root, null)
  writeManifest(root, appVersion, new Date().toISOString())
  const retired = legacyPath + '.migrated.bak'
  if (fs.existsSync(retired)) fs.unlinkSync(retired)
  fs.renameSync(legacyPath, retired)
  return true
}

function allDomainNames() {
  return DOMAINS.map((d) => d.name)
}

// ---------- 加载：各域文件合成 AppData（缺失/损坏域用默认值，随后统一自愈） ----------
function readAllDomains(root) {
  const db = defaultDb()
  for (const d of DOMAINS) {
    const data = readJsonSafe(domainFile(root, d.name))
    if (data && typeof data === 'object') {
      for (const k of d.keys) if (data[k] !== undefined) db[k] = data[k]
    }
  }
  const settings = readJsonSafe(path.join(root, SETTINGS_FILE))
  if (settings && typeof settings === 'object') db.settings = settings
  return selfHealDb(db)
}

// ---------- 写入：只写指定域（domains=null 全量）；原子写逐文件 ----------
function writeDomains(root, db, domains) {
  const names = domains === null ? allDomainNames() : domains
  for (const name of names) {
    const def = DOMAINS.find((d) => d.name === name)
    if (!def) continue
    const slice = {}
    for (const k of def.keys) slice[k] = db[k]
    writeFileAtomic(domainFile(root, name), JSON.stringify(slice, null, 2))
  }
  if (domains === null || names.includes('settings')) {
    writeFileAtomic(path.join(root, SETTINGS_FILE), JSON.stringify(db.settings, null, 2))
  }
}

// ---------- 删除留痕：logs/changes.jsonl 追加行，失败不阻断保存 ----------
function appendDeletionLog(root, deletions) {
  if (!deletions || !deletions.length) return
  try {
    const file = path.join(root, ...CHANGES_LOG_FILE)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const lines = deletions.map((d) => JSON.stringify(d)).join('\n') + '\n'
    fs.appendFileSync(file, lines)
  } catch {
    // 留痕失败不阻断数据保存
  }
}

// ---------- 启动三分支（统一幂等）----------
// 返回：{status:'ok'} | {status:'downgrade', dataVersion, supportedVersion}
// 分支：manifest 在→正常；manifest 无+legacy db 在→迁移（失败静默回退 legacy 模式）；
//       都无→全新安装（播种默认域+AI 模板+manifest）
function ensureLayout(root, appVersion, appTemplateDir) {
  fs.mkdirSync(root, { recursive: true })
  const manifest = readManifest(root)
  if (manifest) {
    if (manifest.dataVersion > DATA_VERSION) {
      return { status: 'downgrade', dataVersion: manifest.dataVersion, supportedVersion: DATA_VERSION }
    }
    seedAiTemplates(root, appTemplateDir) // 幂等补缺（升级新增模板文件时生效）
    return { status: 'ok' }
  }
  const legacyPath = path.join(root, LEGACY_DB_FILE)
  if (fs.existsSync(legacyPath)) {
    try {
      migrateLegacy(root, appVersion)
      return { status: 'ok' }
    } catch {
      // 迁移失败：静默回退 legacy 单文件模式（db.json 未动，下次启动重试）
      return { status: 'ok', legacyFallback: true }
    }
  }
  // 全新安装
  writeDomains(root, defaultDb(), null)
  seedAiTemplates(root, appTemplateDir)
  writeManifest(root, appVersion, null)
  return { status: 'ok', freshInstall: true }
}

module.exports = {
  DATA_VERSION,
  DOMAINS,
  MANIFEST_FILE,
  SETTINGS_FILE,
  LEGACY_DB_FILE,
  CHANGES_LOG_FILE,
  defaultDb,
  selfHealDb,
  writeFileAtomic,
  readJsonSafe,
  readManifest,
  writeManifest,
  seedAiTemplates,
  migrateLegacy,
  readAllDomains,
  writeDomains,
  appendDeletionLog,
  ensureLayout,
}
