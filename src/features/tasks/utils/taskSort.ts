// 任务排序业务规则（RF-P2a 自 BoardView.tsx 原样迁入；RF-Fix3c 升级更名 taskSort，横板/看板唯一排序实现；
// RF-P2 维度链改版：优先级 > 日期时间 > 创建时间，done 沉底保留、位次落 createdAt 前——DEV_RULES §10 排序维度链）
import type { Task } from '../../../shared/types'
import type { Priority } from '../types'

const PRIO_W: Record<Priority, number> = { high: 0, mid: 1, low: 2, none: 3 }

export function taskSort(a: Task, b: Task) {
  // 首维=优先级：高优先级+无日期 排在 低优先级+今天到期 之前
  const pw = PRIO_W[(a.priority ?? 'none') as Priority] - PRIO_W[(b.priority ?? 'none') as Priority]
  if (pw !== 0) return pw
  // 次维=日期时间：都有日期且不同 → 日期升序；有 vs 无 → 有日期在前
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if ((a.dueDate ?? '') !== (b.dueDate ?? '')) return a.dueDate ? -1 : 1
  // RF-Fix3：同优先级同日期内，done 未聚合任务排在待办之后（聚合任务已由调用方过滤出折叠区，不参与排序）
  if (a.done !== b.done) return a.done ? 1 : -1
  return b.createdAt.localeCompare(a.createdAt) // 末维=创建时间，新任务在前
}

// RF-P3 置顶该组（项目维度/组首唯一实现）：isPinnedGroup 任务在其分组/集合内排第一位；
// 稳定分区（ES2019+ sort 稳定），组内其余次序仍按调用方已排好的 taskSort/原序；
// 只在项目维度视图（看板列/未分组/全部清单分组）使用，今日/最近7天时间维度视图禁用（与 isPinnedToday 不混用）
export function pinnedGroupFirst(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (b.isPinnedGroup ? 1 : 0) - (a.isPinnedGroup ? 1 : 0))
}

