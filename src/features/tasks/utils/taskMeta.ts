// 任务 meta 行业务规则（RF-Fix3c 新立，§10 唯一实现）：
// 卡片 meta 行的日期/优先级/归属徽章/提醒/专注分钟/检查事项进度的唯一组装点；
// 横板 ListTaskCard 与看板 TaskCard 只做布局适配，禁止各自拼装
import type { Section, SubTag, Tag, Task } from '../../../shared/types'
import type { Priority } from '../types'
import { localToday } from '../components/DateTimePickers'

const PRIO_COLOR: Record<Priority, string | null> = { high: '#ef4444', mid: '#f59e0b', low: '#3b82f6', none: null }

export interface TaskTagBadge {
  kind: 'h2' | 'h1'
  id: string
  name: string
  color: string
  emoji: string
}

export interface TaskMeta {
  /** 到期日显示文案：今天 → 「今天」（紫色样式判定同此），否则 MM/DD；无日期 null */
  dateText: string | null
  /** 优先级旗标色（none 为 null，不渲染） */
  priorityFlag: string | null
  /** 归属徽章：有 section → H2（可跳看板）；无 section 按 tagId 回退 H1 清单；两者皆无 null */
  tagBadge: TaskTagBadge | null
  /** 是否已设事项级/任务级提醒（remindAt，渲染铃铛） */
  alarmIcon: boolean
  /** 已专注分钟数 */
  minutes: number
  /** 检查事项进度 {done,total}；无检查事项 null */
  checklistProgress: { done: number; total: number } | null
}

export function buildTaskMeta(
  task: Task,
  opts: { minutesOf: (id: string) => number; tagMap: Map<string, Tag>; sections?: Section[]; subTags?: SubTag[] }
): TaskMeta {
  const today = localToday()
  const prio = (task.priority ?? 'none') as Priority

  // 归属徽章：sectionId → Section → SubTag 优先；无 section 按 tagId 回退 H1 清单（P2b 映射表语义）
  let tagBadge: TaskTagBadge | null = null
  const h2 = opts.subTags?.find((st) => st.id === opts.sections?.find((s) => s.id === task.sectionId)?.subTagId)
  if (h2) {
    tagBadge = { kind: 'h2', id: h2.id, name: h2.name, color: h2.color, emoji: h2.emoji }
  } else {
    const h1 = opts.tagMap.get(task.tagId ?? '')
    if (h1) tagBadge = { kind: 'h1', id: h1.id, name: h1.name, color: h1.color, emoji: '' }
  }

  const doneCount = task.checklistItems.filter((c) => c.done).length

  return {
    dateText: task.dueDate ? (task.dueDate === today ? '今天' : task.dueDate.slice(5).replace('-', '/')) : null,
    priorityFlag: PRIO_COLOR[prio],
    tagBadge,
    alarmIcon: !!task.remindAt,
    minutes: opts.minutesOf(task.id),
    checklistProgress: task.checklistItems.length > 0 ? { done: doneCount, total: task.checklistItems.length } : null,
  }
}

// 检查事项默认视图判断（唯一实现）：现行行为 = 始终文本视图（原 TaskCard 弹窗与 TaskDetailPanel
// 两处硬编码 'text' 的唯一化）；未来调整默认规则只改这里，两处消费方自动跟随
export function checklistDefaultMode(task: Task): 'text' | 'checklist' {
  void task
  return 'text'
}
