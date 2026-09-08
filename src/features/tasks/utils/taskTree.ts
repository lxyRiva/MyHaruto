// 任务树业务规则（RF-Fix2 自 BoardColumn 提取；RF-Fix3c 升级为全链唯一实现，§10 视图一致性铁律）
// 横板链与看板链的折叠/聚合/树遍历一律调用本文件，禁止视图组件内复制逻辑
import type { Task } from '../../../shared/types'

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

// 根任务的 aggregated 标志（Fix1 聚合语义）
export function isRootAggregated(tasks: Task[], t: Task): boolean {
  return rootOf(tasks, t.id)?.aggregated === true
}

// 以 id 节点为根的树 = 节点自身 + 全部子孙（防环；树遍历全库唯一实现，taskDelete.collectTreeIds 复用）
export function treeOf(tasks: Task[], id: string): Task[] {
  const self = tasks.find((t) => t.id === id)
  if (!self) return []
  const out: Task[] = []
  const seen = new Set<string>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const t of tasks) {
      if (t.parentTaskId && seen.has(t.parentTaskId) && !seen.has(t.id)) {
        seen.add(t.id)
        out.push(t)
        grew = true
      }
    }
  }
  return [self, ...out]
}

// 树内全部任务均已完成（规则2/3 的达成判定；tasks 可传变更后的中间态数组）
export function isTreeComplete(tasks: Task[], rootId: string): boolean {
  return treeOf(tasks, rootId).every((t) => t.done)
}

// 折叠区成员判定（唯一实现，Fix3 树语义 + v1.14 Bug1/2 收敛裁定）：
//   唯一依据 = 根任务 aggregated（沿 parentTaskId 上溯取根，防环）。
//   原「规则6 散件」分支（子任务自身 aggregated=true 独立折叠）已按 v1.14 裁定删除：
//   Fix1 时代级联写入的子任务 aggregated 残留在历史数据中（不清洗），散件分支会吃旧数据
//   造成「看板勾子任务独自聚合/取消子勾不整树退回」两副面孔；现渲染层一律无视子任务自身 aggregated。
export function collapsedOf(tasks: Task[]): (t: Task) => boolean {
  return (t: Task) => rootOf(tasks, t.id)?.aggregated === true
}
