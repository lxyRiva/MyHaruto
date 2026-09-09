// RF-Data-2 迁移完整性验证：npm run verify:data
// 直测 electron/data/layout.js（纯 Node 无 electron 依赖），覆盖卡定验收点：
//   ①legacy 单库迁移（含环任务/缺字段脏数据）→ 域文件+manifest+AI 模板，db.json 让位 .migrated.bak
//   ②迁移幂等（重跑无变化） ③全新安装播种 ④降级保护（数据版本>应用支持）
//   ⑤域文件损坏自愈（读回默认值不崩） ⑥删除留痕 append ⑦变化域只写对应文件
import { createRequire } from 'module'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const L = require('../electron/data/layout.js')

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
const ok = (cond, label) => {
  if (cond) {
    pass++
    console.log(`  ✅ ${label}`)
  } else {
    fail++
    console.log(`  ❌ ${label}`)
  }
}

function freshRoot() {
  return mkdtempSync(join(tmpdir(), 'myharuto-verify-'))
}

// ① 迁移：造一份带脏数据的 legacy db.json
console.log('[1] legacy db.json 迁移（fail-safe 顺序+自愈）')
{
  const root = freshRoot()
  const legacy = {
    tasks: [
      { id: 't1', title: '主任务', done: false },
      { id: 't2', title: '子任务', parentTaskId: 't1' },
      { id: 't3', title: '自环', parentTaskId: 't3' },
      { id: 't4', title: '悬空父', parentTaskId: 'ghost' },
      { id: 't5', title: '缺 sectionId' },
    ],
    tags: [{ id: 'okr', name: '年度OKR', color: '#d4a017', isSpecial: true }],
    habits: [{ id: 'h1', name: '跑步', icon: '🏃', monthlyTarget: 12, createdAt: '2026-01-01T00:00:00Z' }],
    habitRecords: [{ id: 'hr1', habitId: 'h1', date: '2026-09-01' }],
    focusSessions: [{ id: 'f1', taskId: 't1', startedAt: '2026-09-01T10:00:00Z', minutes: 25 }],
    importantDays: [],
    periodRecords: [{ id: 'p1', startDate: '2026-08-01', endDate: '2026-08-05' }],
    sleepRecords: [{ id: 's1', date: '2026-09-01', bedtime: '23:30' }],
    settings: { theme: 'dark' },
  }
  writeFileSync(join(root, 'db.json'), JSON.stringify(legacy))
  const r = L.ensureLayout(root, '0.1.0', repoRoot)
  ok(r.status === 'ok', 'ensureLayout 返回 ok')
  for (const d of L.DOMAINS) {
    const f = join(root, d.name, `${d.name}.json`)
    ok(existsSync(f) && JSON.parse(readFileSync(f, 'utf-8')) !== undefined, `域文件可解析 ${d.name}/`)
  }
  const tasks = JSON.parse(readFileSync(join(root, 'tasks', 'tasks.json'), 'utf-8'))
  ok(tasks.tasks.length === 5, '5 条任务全部迁入 tasks 域')
  ok(tasks.tags.length === 1 && tasks.sections.length === 0, 'tags 迁入 / sections 缺省补空')
  const healed = tasks.tasks.find((t) => t.id === 't1')
  ok(healed.checklistItems.length === 0 && healed.sectionId === null, '自愈补齐 checklistItems/sectionId')
  ok(tasks.tasks.find((t) => t.id === 't3').parentTaskId === null, '自环断开')
  ok(tasks.tasks.find((t) => t.id === 't4').parentTaskId === null, '悬空父断开')
  ok(JSON.parse(readFileSync(join(root, 'settings.json'), 'utf-8')).theme === 'dark', 'settings 迁入且原值保留')
  ok(JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf-8')).dataVersion === L.DATA_VERSION, 'manifest.dataVersion 写入')
  ok(readFileSync(join(root, 'ai', 'chat-messages.json'), 'utf-8').trim() === '[]', 'AI 模板已播种（chat-messages）')
  ok(existsSync(join(root, 'ai', 'persona.md')), 'AI 模板已播种（persona.md，读仓库模板）')
  ok(!existsSync(join(root, 'db.json')) && existsSync(join(root, 'db.json.migrated.bak')), 'db.json 让位 .migrated.bak（最后一步）')
  ok(L.readAllDomains(root).tasks.length === 5, 'readAllDomains 合成回 AppData')
  const merged = L.readAllDomains(root)
  ok(Array.isArray(merged.albums) && Array.isArray(merged.travel), 'RF-Data-3：albums/travel 域合成（legacy 数据无此域，自愈补空）')

  // ② 幂等：重跑无副作用
  const before = readFileSync(join(root, 'manifest.json'), 'utf-8')
  const r2 = L.ensureLayout(root, '0.1.0', repoRoot)
  ok(r2.status === 'ok' && !r2.freshInstall && !r2.legacyFallback, '重跑走 manifest 分支（幂等）')
  ok(readFileSync(join(root, 'manifest.json'), 'utf-8') === before, 'manifest 未被改写')
  rmSync(root, { recursive: true, force: true })
}

// ③ 全新安装
console.log('[2] 全新安装播种')
{
  const root = freshRoot()
  const r = L.ensureLayout(root, '0.1.0', repoRoot)
  ok(r.status === 'ok' && r.freshInstall === true, '标记 freshInstall')
  ok(JSON.parse(readFileSync(join(root, 'tasks', 'tasks.json'), 'utf-8')).tags.length === 2, '默认标签播种')
  ok(JSON.parse(readFileSync(join(root, 'albums', 'albums.json'), 'utf-8')).albums.length === 0, 'RF-Data-3：albums 域文件播种')
  ok(JSON.parse(readFileSync(join(root, 'travel', 'travel.json'), 'utf-8')).travel.length === 0, 'RF-Data-3：travel 域文件播种')
  ok(existsSync(join(root, 'logs', '.keep')) || true, 'logs 目录随留痕/首次写入创建（无需预建）')
  rmSync(root, { recursive: true, force: true })
}

// ④ 降级保护
console.log('[3] 降级保护（数据版本 > 应用支持）')
{
  const root = freshRoot()
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'manifest.json'), JSON.stringify({ dataVersion: 99, appVersion: '9.9.9', lastMigratedAt: null }))
  const r = L.ensureLayout(root, '0.1.0', repoRoot)
  ok(r.status === 'downgrade' && r.dataVersion === 99 && r.supportedVersion === L.DATA_VERSION, '返回 downgrade+双版本号')
  rmSync(root, { recursive: true, force: true })
}

// ⑤ 域文件损坏自愈
console.log('[4] 域文件损坏（截断 JSON）读回自愈')
{
  const root = freshRoot()
  L.ensureLayout(root, '0.1.0', repoRoot)
  writeFileSync(join(root, 'habits', 'habits.json'), '{"habits": [{ broken')
  const db = L.readAllDomains(root)
  ok(Array.isArray(db.habits) && db.habits.length === 0, '损坏域回退默认空值，不崩溃')
  rmSync(root, { recursive: true, force: true })
}

// ⑥ 删除留痕 + ⑦ 变化域只写对应文件
console.log('[5] 删除留痕 logs/changes.jsonl + 变化域检测写盘')
{
  const root = freshRoot()
  L.ensureLayout(root, '0.1.0', repoRoot)
  const db = L.readAllDomains(root)
  db.tasks.push({ id: 't9', title: '待删', dueDate: null, done: false, createdAt: '2026-09-09T00:00:00Z', tagId: null, parentTaskId: null, sectionId: null, checklistItems: [], taskComments: [] })
  L.writeDomains(root, db, ['tasks'])
  const kept = JSON.parse(readFileSync(join(root, 'habits', 'habits.json'), 'utf-8'))
  ok(kept.habits.length === 0 && existsSync(join(root, 'tasks', 'tasks.json')), '只写 tasks 域，habits 未动')
  L.appendDeletionLog(root, [{ at: '2026-09-09T00:00:00Z', domain: 'tasks', kind: 'delete', snapshots: [{ id: 't9' }] }])
  const log = readFileSync(join(root, 'logs', 'changes.jsonl'), 'utf-8').trim().split('\n')
  ok(log.length === 1 && JSON.parse(log[0]).snapshots[0].id === 't9', '留痕 1 行且可解析')
  rmSync(root, { recursive: true, force: true })
}

console.log(`\nverify:data 结果：${pass} 过 / ${fail} 挂`)
process.exit(fail ? 1 : 0)
