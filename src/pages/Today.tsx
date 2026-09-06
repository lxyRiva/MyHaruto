// 任务树体系：无限嵌套（主任务→子任务→子子任务…），任意层级统一右键、独立计时、行内加子任务
// 今日页（Step 6 重构）：逾期/今天分组 + NewTaskBar 新建行 + ListTaskCard 列表卡片（左键选中进右栏详情）
// RF-P2b：旧版递归节点组件及其专属辅助已删（全部页/今日页统一 ListTaskCard + TDP 渲染）；todayStr 保留（P3c 收口）
import { useMemo } from 'react'
import type { Task, Tag } from '../types'
import ListTaskCard from '../components/ListTaskCard'
import NewTaskBar from '../components/NewTaskBar'
import { boardSort } from '../features/tasks/utils/boardSort'
import { isRootAggregated } from '../features/tasks/utils/tree'
import { DoneFoldSection } from '../components/ListTaskCard'
import type { Priority } from '../features/tasks/types'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ============ 今日页（Step 6 重构：逾期/今天分组 + 新建任务行 + 列表卡片 + 右栏详情） ============ */
export default function Today(props: {
  tasks: Task[]
  tags: Tag[]
  subTags: import('../types').SubTag[]
  sections: import('../types').Section[]
  focusSessions: import('../types').FocusSession[]
  aiName: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAddTaskWithOptions: (title: string, opts: { dueDate?: string | null; priority?: Priority; tagId?: string | null }) => void
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<import('../types').ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
  onSetTaskReminder: (id: string, remindAt: string | null, remindDaysBefore: number | null) => void
  onUpdateTaskDue: (id: string, dueDate: string | null) => void
  onAddSubtask: (parentId: string, title: string) => void
  onUpdateTag: (id: string, tagId: string | null) => void
  onUpdateTaskSection: (id: string, sectionId: string | null) => void
  onTogglePinned: (id: string) => void
  onSetPriority: (id: string, p: Priority) => void
  onPomodoro: (t: Task) => void
  onDeleteTaskRecursive: (id: string) => void
  onOpenSubTag: (subTagId: string) => void
  onSetMasterTask: (id: string, masterId: string | null) => void
}) {
  const { tasks, selectedId, onSelect, onAddTaskWithOptions } = props
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of props.focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [props.focusSessions])

  const today = todayStr()
  const mainTasks = tasks.filter((t) => !t.parentTaskId)
  // RF-Fix2 语义：done 未聚合 → 原分组灰显原位；根 aggregated → 出分组进底部「已完成」折叠区
  // 已逾期：今天之前到期（未完成或未聚合的已完成），最久远的在最上
  const overdue = mainTasks
    .filter((t) => t.dueDate && t.dueDate < today && (!t.done || !isRootAggregated(tasks, t)))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const overdueIds = new Set(overdue.map((t) => t.id))
  // 今天：今天到期 + 置顶今日（逾期的不重复出现）
  const todays = mainTasks
    .filter((t) => !overdueIds.has(t.id) && (t.dueDate === today || t.isPinnedToday) && (!t.done || !isRootAggregated(tasks, t)))
    .sort(boardSort)
  // 已完成折叠区成员：现有筛选（逾期/今天/置顶）∩ 根 aggregated
  const doneRoots = mainTasks.filter(
    (t) => t.done && isRootAggregated(tasks, t) && ((t.dueDate && t.dueDate < today) || t.dueDate === today || t.isPinnedToday)
  )

  const cardBase = {
    aiName: props.aiName,
    tags: props.tags,
    subTags: props.subTags,
    sections: props.sections,
    onToggleDone: props.onToggleDone,
    onToggleChecklist: props.onToggleChecklist,
    onAddChecklistItem: props.onAddChecklistItem,
    onUpdateChecklistItem: props.onUpdateChecklistItem,
    onDeleteChecklistItem: props.onDeleteChecklistItem,
    onSetTaskReminder: props.onSetTaskReminder,
    onUpdateTaskDue: props.onUpdateTaskDue,
    onAddSubtask: props.onAddSubtask,
    onUpdateTag: props.onUpdateTag,
    onUpdateTaskSection: props.onUpdateTaskSection,
    onTogglePinned: props.onTogglePinned,
    onSetPriority: props.onSetPriority,
    onPomodoro: props.onPomodoro,
    onDeleteTaskRecursive: props.onDeleteTaskRecursive,
    onOpenSubTag: props.onOpenSubTag,
    onSetMasterTask: props.onSetMasterTask,
  }

  const group = (label: string, items: Task[], tone: 'normal' | 'danger' = 'normal') =>
    items.length > 0 ? (
      <div className="mt-5">
        <div className={`mb-2 text-xs font-medium ${tone === 'danger' ? 'text-red-400' : 'text-neutral-400'}`}>
          {label} {items.length}
        </div>
        <div className="space-y-2">
          {items.map((t) => (
            <ListTaskCard
              key={t.id}
              task={t}
              allTasks={tasks}
              depth={0}
              seen={new Set([t.id])}
              selected={selectedId === t.id}
              onSelect={() => onSelect(selectedId === t.id ? null : t.id)}
              minutesOf={minutesOf}
              {...cardBase}
            />
          ))}
        </div>
      </div>
    ) : null

  return (
    <div className="flex h-full flex-col p-6">
      <div className="max-w-3xl">
        <h1 className="text-xl font-bold">
          今天 <span className="text-sm font-normal text-neutral-400">{today} 星期{['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]}</span>
        </h1>
        <div className="mt-4">
          <NewTaskBar
            subTags={props.subTags}
            defaultDueDate={today}
            onAdd={(title, due, priority, tagId) => onAddTaskWithOptions(title, { dueDate: due, priority, tagId })}
          />
        </div>
      </div>
      <div className="mt-2 max-w-3xl flex-1 overflow-y-auto pb-6">
        {group('已逾期', overdue, 'danger')}
        {group('今天', todays)}
        <DoneFoldSection
          roots={doneRoots}
          tasks={tasks}
          selectedId={selectedId}
          onSelect={onSelect}
          minutesOf={minutesOf}
          callbacks={cardBase}
        />
        {overdue.length === 0 && todays.length === 0 && doneRoots.length === 0 && (
          <div className="mt-10 text-center text-sm text-neutral-300 dark:text-neutral-600">
            今天没有安排，未来的任务去「最近7天」看
          </div>
        )}
      </div>
    </div>
  )
}
