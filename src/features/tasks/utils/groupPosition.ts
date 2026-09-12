// 组位置日期（RF-B1 收尾阶段 2·方案甲严格版：横板父任务组单点显示的位置判定唯一实现；§10 单点化）
// 规则权威=docs/REFACTOR_CARDS.md「十八D 已裁定规则备案」：
//   成员有效日期集 = 父任务 dueDate（参与）+ 未完成后代任务 dueDate（参与）；已完成后代跟随不参与
//   有未过期日期（>=today）→ 返回最早未过期日期（组位置=该日期区块）
//   全部逾期 → 返回最晚逾期日期（逾期区判定由页面层 positionDate < today 完成，接口不含区块分类）
//   无任何日期成员 → null（无日期区）
// 逾期红字沿用现有链（taskMeta.dateOverdue）禁止重写；跳日期时机=零点后首次渲染+切视图重算（消费方每次挂载重算 today）
import type { Task } from '../../../shared/types'
import { treeOf } from './taskTree'

/**
 * 组位置日期：tasks 全量、root=组根任务（父）、today=本地今日（YYYY-MM-DD）。
 * 返回 null = 组内无任何日期成员（无日期区）。
 */
export function positionDateOf(tasks: Task[], root: Task, today: string): string | null {
  // 组成员 = 父任务 + 全部后代（treeOf 全库唯一树遍历）；已完成后代日期不参与位置计算
  const members = treeOf(tasks, root.id)
  const dates: string[] = []
  for (const m of members) {
    if (m.id !== root.id && m.done) continue
    if (m.dueDate) dates.push(m.dueDate)
  }
  if (dates.length === 0) return null
  const sorted = [...dates].sort()
  const unexpired = sorted.filter((d) => d >= today)
  if (unexpired.length === 0) return sorted[sorted.length - 1] // 全逾期：取最晚逾期日期
  return unexpired[0] // 最早未过期日期
}
