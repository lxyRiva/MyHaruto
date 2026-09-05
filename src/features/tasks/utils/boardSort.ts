// 看板/列表任务排序（RF-P2a 自 BoardView.tsx 原样迁入）
import type { Task } from '../../../types'
import type { Priority } from '../types'

const PRIO_W: Record<Priority, number> = { high: 0, mid: 1, low: 2, none: 3 }

export function boardSort(a: Task, b: Task) {
  // 修正1：日期优先——都有日期且不同 → 日期升序；同日期/都无日期 → 优先级 → 新任务在前；有 vs 无 → 有日期在前
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  const pw = PRIO_W[(a.priority ?? 'none') as Priority] - PRIO_W[(b.priority ?? 'none') as Priority]
  if (pw !== 0) return pw
  if ((a.dueDate ?? '') !== (b.dueDate ?? '')) return a.dueDate ? -1 : 1
  return b.createdAt.localeCompare(a.createdAt) // 新任务在前
}

