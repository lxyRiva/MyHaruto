// 任务删除业务规则（RF-Fix3c 新立，§10 唯一实现）：删除范围 = 目标 + 全部子孙
// 树遍历复用 taskTree.treeOf（遍历全库唯一实现点在 taskTree）
import type { Task } from '../../../shared/types'
import { treeOf } from './taskTree'

// 目标 + 全部子孙的 id 集合（防环）。deleteTaskTree / 关联候选排除 / updateTaskSection 级联均消费此函数
export function collectTreeIds(tasks: Task[], id: string): Set<string> {
  return new Set(treeOf(tasks, id).map((t) => t.id))
}
