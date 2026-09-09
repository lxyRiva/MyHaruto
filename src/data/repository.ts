// 渲染端唯一数据入口（DEV_RULES §2：RF-Data-1 起，一切数据操作走 repository，
// 组件与 hooks 禁直接调 window.myharuto / IPC）。
// RF-Data-2：persist 内做变化域检测（只回传变更域，主进程只写对应文件）
// + 删除留痕（tasks 域消失 id 的快照 → 主进程追加 logs/changes.jsonl）
import type { AppData, DeletionRecord, LoadResult, StorageDriver } from './types'

// 与 electron/data/layout.js DOMAINS 对齐（含 settings，主进程特判写根下 settings.json）
const DOMAINS: { name: string; keys: (keyof AppData)[] }[] = [
  { name: 'tasks', keys: ['tasks', 'tags', 'subTags', 'sections'] },
  { name: 'habits', keys: ['habits', 'habitRecords'] },
  { name: 'focus-sessions', keys: ['focusSessions'] },
  { name: 'important-days', keys: ['importantDays'] },
  { name: 'period', keys: ['periodRecords'] },
  { name: 'sleep', keys: ['sleepRecords'] },
  { name: 'settings', keys: ['settings'] },
]

let lastSnapshot: AppData | null = null

function diffDomains(prev: AppData | null, next: AppData): string[] | null {
  if (!prev) return null
  const changed: string[] = []
  for (const d of DOMAINS) {
    const before = JSON.stringify(d.keys.map((k) => prev[k]))
    const after = JSON.stringify(d.keys.map((k) => next[k]))
    if (before !== after) changed.push(d.name)
  }
  return changed
}

// 误删保险：与上次快照对比，消失的任务整条快照留痕（deleteTaskTree 删的子孙自然覆盖）
function detectTaskDeletions(prev: AppData, next: AppData): DeletionRecord[] {
  const ids = new Set(next.tasks.map((t) => t.id))
  const removed = prev.tasks.filter((t) => !ids.has(t.id))
  if (!removed.length) return []
  return [{ at: new Date().toISOString(), domain: 'tasks', kind: 'delete', snapshots: removed }]
}

export const repository: StorageDriver = {
  loadAll: async (): Promise<LoadResult> => {
    const r = await window.myharuto.getDb()
    if (r.status === 'ok') lastSnapshot = r.data
    return r
  },
  persist: async (data: AppData) => {
    const prev = lastSnapshot
    const domains = diffDomains(prev, data)
    const deletions = prev ? detectTaskDeletions(prev, data) : []
    const ok = await window.myharuto.saveDb({ data, domains, deletions })
    if (ok) lastSnapshot = data
    return ok
  },
  openDataDir: () => window.myharuto.openDataDir(),
  getDataInfo: () => window.myharuto.getDataInfo(),
  changeDataDir: () => window.myharuto.changeDataDir(),
}
