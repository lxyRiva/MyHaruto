// 任务排序业务规则（RF-P2a 自 BoardView.tsx 原样迁入；RF-Fix3c 升级更名 taskSort，横板/看板唯一排序实现）
import type { Task } from '../../../shared/types'
import type { Priority } from '../types'

const PRIO_W: Record<Priority, number> = { high: 0, mid: 1, low: 2, none: 3 }

export function taskSort(a: Task, b: Task) {
  // 修正1：日期优先——都有日期且不同 → 日期升序；同日期/都无日期 → 优先级 → 新任务在前；有 vs 无 → 有日期在前
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  const pw = PRIO_W[(a.priority ?? 'none') as Priority] - PRIO_W[(b.priority ?? 'none') as Priority]
  if (pw !== 0) return pw
  if ((a.dueDate ?? '') !== (b.dueDate ?? '')) return a.dueDate ? -1 : 1
  // RF-Fix3：同日期同优先级内，done 未聚合任务排在待办之后（聚合任务已由调用方过滤出折叠区，不参与排序）
  if (a.done !== b.done) return a.done ? 1 : -1
  return b.createdAt.localeCompare(a.createdAt) // 新任务在前
}

