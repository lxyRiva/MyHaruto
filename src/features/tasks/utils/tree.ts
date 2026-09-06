// 任务树工具（RF-Fix2 自 BoardColumn 提取，看板与横板视图共用）
import type { Task } from '../../../types'

// 沿 parentTaskId 上溯取根任务（防环）
export function rootOf(tasks: Task[], tid: string): Task | undefined {
  let cur: Task | undefined = tasks.find((t) => t.id === tid)
  const seen = new Set<string>([tid])
  while (cur !== undefined && cur.parentTaskId && !seen.has(cur.parentTaskId)) {
    seen.add(cur.parentTaskId)
    const next: Task | undefined = tasks.find((t) => t.id === cur!.parentTaskId)
    cur = next
  }
  return cur
}

// 根任务的 aggregated 标志（Fix1 聚合语义：折叠区成员判定唯一依据）
export function isRootAggregated(tasks: Task[], t: Task): boolean {
  return rootOf(tasks, t.id)?.aggregated === true
}
