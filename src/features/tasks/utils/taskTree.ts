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

// 折叠区成员判定（唯一实现，Fix1 规则 + 规则6 散件）：
//   整树判定 = 根任务 aggregated（沿 parentTaskId 上溯，历史散落在子任务上的 aggregated 无视）；
//   例外 = 规则6 散件（自身被「聚合」显式标记的 done 子任务，其主任务未完成/未聚合时单独入折叠区）
export function collapsedOf(tasks: Task[]): (t: Task) => boolean {
  return (t: Task) => {
    const root = rootOf(tasks, t.id)
    if (root?.aggregated) return true
    return t.done && t.aggregated === true
  }
}
